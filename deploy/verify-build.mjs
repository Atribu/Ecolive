import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { request } from "node:http";
import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { brotliDecompressSync, gunzipSync } from "node:zlib";

const manifest = JSON.parse(await readFile("dist/build-manifest.json", "utf8"));
const server = spawn(process.execPath, ["scripts/serve.mjs"], {
  env: {
    ...process.env,
    PORT: "0",
    NODE_ENV: "production",
    SERVE_ROOT: "dist",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let checks = 0;
const check = (condition, message) => {
  assert.ok(condition, message);
  checks += 1;
};

try {
  const port = await new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Preview server did not start")),
      5000,
    );
    server.once("error", reject);
    server.once("exit", (code) => reject(new Error(`Preview exited: ${code}`)));
    server.stdout.on("data", (chunk) => {
      const match = /127\.0\.0\.1:(\d+)/.exec(String(chunk));
      if (match) {
        clearTimeout(timeout);
        resolve(Number(match[1]));
      }
    });
  });
  const get = (path, headers = {}, method = "GET") =>
    new Promise((resolve, reject) => {
      const req = request(
        { hostname: "127.0.0.1", port, path, method, headers },
        (res) => {
          const chunks = [];
          res.on("data", (chunk) => chunks.push(chunk));
          res.on("end", () =>
            resolve({
              status: res.statusCode,
              headers: res.headers,
              body: Buffer.concat(chunks),
            }),
          );
          res.on("error", reject);
        },
      );
      req.on("error", reject);
      req.end();
    });

  for (const [page, css] of Object.entries(manifest.styles)) {
    const route = page.replace(/index\.html$/, "");
    const response = await get(route);
    check(response.status === 200, `${route} is available`);
    const html = response.body.toString();
    check(
      (html.match(/rel="stylesheet"/g) || []).length === 1 &&
        html.includes(css),
      `${route} has one correct stylesheet`,
    );
    check(
      html.includes(manifest.scripts["/app.js"]),
      `${route} uses the bundled script`,
    );
    const resources = [
      ...html.matchAll(
        /(?:src|href|poster|data-src|data-mobile-src)=["'](\/assets\/[^"']+)["']/g,
      ),
    ];
    for (const [, resource] of resources) {
      check(
        (await stat(join("dist", resource.split(/[?#]/)[0]))).isFile(),
        `${resource} exists`,
      );
    }
    for (const [, srcset] of html.matchAll(/srcset=["']([^"']+)["']/g)) {
      for (const candidate of srcset.split(",")) {
        const resource = candidate.trim().split(/\s+/)[0];
        if (resource.startsWith("/"))
          check(
            (await stat(join("dist", resource))).isFile(),
            `${resource} exists`,
          );
      }
    }
  }
  for (const css of new Set(Object.values(manifest.styles))) {
    const content = await readFile(join("dist", css), "utf8");
    for (const [, reference] of content.matchAll(
      /url\(["']?(\/[^\s"')]+)["']?\)/g,
    )) {
      check(
        (await stat(join("dist", reference))).isFile(),
        `CSS resource ${reference} exists`,
      );
    }
  }

  const plain = await get("/");
  check(plain.headers["cache-control"] === "no-cache", "HTML revalidates");
  for (const [encoding, decode] of [
    ["br", brotliDecompressSync],
    ["gzip", gunzipSync],
  ]) {
    const response = await get("/", { "Accept-Encoding": encoding });
    check(
      response.headers["content-encoding"] === encoding,
      `${encoding} is negotiated`,
    );
    check(
      response.headers.vary === "Accept-Encoding",
      "Compression varies by encoding",
    );
    check(
      +response.headers["content-length"] === response.body.length,
      "Compressed length is exact",
    );
    check(
      decode(response.body).equals(plain.body),
      `${encoding} decodes to original HTML`,
    );
    const head = await get("/", { "Accept-Encoding": encoding }, "HEAD");
    check(
      head.body.length === 0 &&
        head.headers["content-length"] === response.headers["content-length"],
      "HEAD has encoded length without body",
    );
  }
  check(
    !(await get("/", { "Accept-Encoding": "br;q=0,gzip;q=0" })).headers[
      "content-encoding"
    ],
    "Disabled encodings remain uncompressed",
  );
  check(
    (await get("/", { "Accept-Encoding": "br;q=0.5,gzip;q=1" })).headers[
      "content-encoding"
    ] === "gzip",
    "Encoding quality order is honored",
  );

  const css = Object.values(manifest.styles)[0];
  const cssResponse = await get(css);
  check(
    cssResponse.headers["cache-control"].includes("immutable"),
    "Hashed CSS is immutable",
  );
  check(
    (await get(css, { "If-None-Match": cssResponse.headers.etag })).status ===
      304,
    "ETag revalidation works",
  );
  const rangedCss = await get(css, {
    Range: "bytes=0-9",
    "Accept-Encoding": "br",
  });
  check(
    rangedCss.status === 206 &&
      !rangedCss.headers["content-encoding"] &&
      rangedCss.body.equals(cssResponse.body.subarray(0, 10)),
    "Range responses use original bytes",
  );
  check(
    (await get(css, { Range: "items=0-1" })).status === 200,
    "Unknown ranges are ignored",
  );
  check(
    (await get(css, { Range: "bytes=0-9", "If-Range": '"unknown"' })).status ===
      200,
    "Unmatched If-Range falls back to complete response",
  );

  const font = await get(Object.values(manifest.fonts)[0], {
    "Accept-Encoding": "br",
  });
  check(
    font.headers["content-type"] === "font/woff2" &&
      font.headers["cache-control"].includes("immutable") &&
      !font.headers["content-encoding"],
    "Hashed WOFF2 fonts cache without re-encoding",
  );
  const responsive = (await readdir("dist/assets/responsive")).find((file) =>
    /\.[a-f0-9]{8,12}\.webp$/.test(file),
  );
  if (responsive)
    check(
      (await get(`/assets/responsive/${responsive}`)).headers[
        "cache-control"
      ].includes("immutable"),
      "Responsive images are immutable",
    );

  const videoPath = "/assets/video/home-scroll.mp4";
  const video = await readFile(join("dist", videoPath));
  const videoHead = await get(
    videoPath,
    { Range: "bytes=0-31", "Accept-Encoding": "br" },
    "HEAD",
  );
  check(
    videoHead.status === 200 &&
      +videoHead.headers["content-length"] === video.length &&
      videoHead.body.length === 0,
    "Video HEAD ignores Range and returns full size",
  );
  check(
    videoHead.headers["content-type"] === "video/mp4" &&
      !videoHead.headers["content-encoding"],
    "MP4 stays uncompressed with correct MIME",
  );
  check(
    videoHead.headers["cache-control"] ===
      "public, max-age=604800, must-revalidate",
    "Unversioned video revalidates after 7 days",
  );
  for (const [range, expected, contentRange] of [
    ["bytes=0-31", video.subarray(0, 32), `bytes 0-31/${video.length}`],
    [
      "bytes=-32",
      video.subarray(-32),
      `bytes ${video.length - 32}-${video.length - 1}/${video.length}`,
    ],
    [
      `bytes=${video.length - 32}-`,
      video.subarray(-32),
      `bytes ${video.length - 32}-${video.length - 1}/${video.length}`,
    ],
  ]) {
    const response = await get(videoPath, {
      Range: range,
      "Accept-Encoding": "gzip, br",
    });
    check(
      response.status === 206 &&
        response.body.equals(expected) &&
        response.headers["content-range"] === contentRange &&
        +response.headers["content-length"] === 32 &&
        !response.headers["content-encoding"],
      `Video range ${range} is correct`,
    );
  }
  for (const range of [
    `bytes=${video.length}-`,
    "bytes=4-2",
    "bytes=-0",
    "bytes=0-1,4-5",
  ]) {
    const response = await get(videoPath, { Range: range });
    check(
      response.status === 416 &&
        response.headers["content-range"] === `bytes */${video.length}`,
      `Invalid range ${range} returns 416`,
    );
  }
  check(
    (await get("/proje-hakkinda")).status === 301,
    "Directory routes redirect to trailing slash",
  );
  check(
    (await get("/../.git/config")).status === 403,
    "Hidden repository files are denied",
  );
  check(
    (await get("/..%2fpackage.json")).status === 403,
    "Encoded parent traversal is denied",
  );
  check(
    (await get("/", {}, "POST")).status === 405,
    "Unsupported methods are rejected",
  );
  console.log(
    `ECOLIVE production verification passed: ${checks} checks, 9 routes, compression, caching and video ranges.`,
  );
} finally {
  server.kill();
}
