import http from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";

const root = resolve(process.env.SERVE_ROOT || process.cwd());
const production = process.env.NODE_ENV === "production";
const port = Number(process.env.PORT || 4173);
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".json": "application/json; charset=utf-8",
  ".pdf": "application/pdf",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

function byteRange(value, size) {
  // This server serves one range at a time; reject malformed byte ranges.
  const match = /^bytes=(\d*)-(\d*)$/i.exec(value.trim());
  if (!match || (!match[1] && !match[2]) || size === 0) return null;

  const length = BigInt(size);
  if (!match[1]) {
    const suffix = BigInt(match[2]);
    if (suffix === 0n) return null;
    return {
      start: Number(suffix >= length ? 0n : length - suffix),
      end: size - 1,
    };
  }

  const start = BigInt(match[1]);
  const end = match[2] ? BigInt(match[2]) : length - 1n;
  if (start >= length || end < start) return null;
  return {
    start: Number(start),
    end: Number(end >= length ? length - 1n : end),
  };
}

function compressionPreference(value = "") {
  const accepted = new Map(
    value
      .toLowerCase()
      .split(",")
      .map((item) => {
        const [name, ...parameters] = item.trim().split(";");
        const quality = parameters.find((parameter) =>
          parameter.trim().startsWith("q="),
        );
        return [name, quality ? Number(quality.trim().slice(2)) : 1];
      }),
  );
  return ["br", "gzip"]
    .map((name, index) => ({
      name,
      quality: accepted.get(name) ?? accepted.get("*") ?? 0,
      index,
    }))
    .filter(({ quality }) => quality > 0 && quality <= 1)
    .sort((a, b) => b.quality - a.quality || a.index - b.index);
}

function cacheControl(file) {
  if (!production) return "no-cache";
  if (
    /\.(?:[a-f0-9]{8,12}|[A-Z0-9]{8})\.(?:css|js|woff2?|ttf|otf|webp|png|jpe?g|svg)$/.test(file)
  ) {
    return "public, max-age=31536000, immutable";
  }
  if (/\.(?:css|js|woff2?|ttf|otf|webp|png|jpe?g|svg|mp4|webm)$/.test(file)) {
    return "public, max-age=604800, must-revalidate";
  }
  return "no-cache";
}

function sendText(req, res, status, message, headers = {}) {
  res.writeHead(status, {
    "Content-Type": "text/plain; charset=utf-8",
    "Content-Length": Buffer.byteLength(message),
    "X-Content-Type-Options": "nosniff",
    ...headers,
  });
  res.end(req.method === "HEAD" ? undefined : message);
}

http
  .createServer(async (req, res) => {
    try {
      if (req.method !== "GET" && req.method !== "HEAD") {
        sendText(req, res, 405, "Method not allowed.", { Allow: "GET, HEAD" });
        return;
      }
      const path = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
      let file = resolve(root, `.${path === "/" ? "/index.html" : path}`);
      if (
        !file.startsWith(root + sep) ||
        path.split("/").some((segment) => segment.startsWith("."))
      ) {
        sendText(req, res, 403, "Forbidden");
        return;
      }
      let info = await stat(file);
      if (info.isDirectory()) {
        if (!path.endsWith("/")) {
          res.writeHead(301, { Location: `${path}/` });
          res.end();
          return;
        }
        file = resolve(file, "index.html");
        info = await stat(file);
      }
      if (!info.isFile()) throw new Error("not a file");

      const sourceFile = file;
      const contentType =
        types[extname(sourceFile).toLowerCase()] || "application/octet-stream";
      const compressible = /\.(?:html|css|js|json|svg|txt)$/.test(sourceFile);
      let contentEncoding;
      // Range offsets always refer to original bytes. Never compress media or
      // range responses; precompressed text is selected only in production.
      if (production && compressible && !req.headers.range) {
        for (const { name } of compressionPreference(
          req.headers["accept-encoding"],
        )) {
          const compressedFile = `${sourceFile}.${name === "gzip" ? "gz" : "br"}`;
          try {
            const compressedInfo = await stat(compressedFile);
            if (compressedInfo.isFile()) {
              file = compressedFile;
              info = compressedInfo;
              contentEncoding = name;
              break;
            }
          } catch {
            /* A missing sidecar falls back to the original file. */
          }
        }
      }
      const etag = `W/"${info.size.toString(16)}-${Math.floor(info.mtimeMs).toString(16)}-${contentEncoding || "identity"}"`;
      const headers = {
        "Content-Type": contentType,
        "Content-Length": info.size,
        "Accept-Ranges": "bytes",
        "Cache-Control": cacheControl(sourceFile),
        "X-Content-Type-Options": "nosniff",
        ETag: etag,
        "Last-Modified": info.mtime.toUTCString(),
        ...(production && compressible ? { Vary: "Accept-Encoding" } : {}),
        ...(contentEncoding ? { "Content-Encoding": contentEncoding } : {}),
      };
      if (
        req.headers["if-none-match"]
          ?.split(/\s*,\s*/)
          .some((candidate) => candidate === etag || candidate === "*")
      ) {
        delete headers["Content-Length"];
        res.writeHead(304, headers);
        res.end();
        return;
      }
      let status = 200;
      let range;
      // Unknown range units must be ignored. A supplied If-Range cannot match
      // without a validator, so send the complete current representation.
      if (
        req.method === "GET" &&
        req.headers.range &&
        !req.headers["if-range"] &&
        /^bytes(?:\s*=|$)/i.test(req.headers.range)
      ) {
        range = byteRange(req.headers.range, info.size);
        if (!range) {
          sendText(req, res, 416, "Requested range not satisfiable.", {
            "Accept-Ranges": "bytes",
            "Content-Range": `bytes */${info.size}`,
          });
          return;
        }
        status = 206;
        headers["Content-Range"] =
          `bytes ${range.start}-${range.end}/${info.size}`;
        headers["Content-Length"] = range.end - range.start + 1;
      }

      if (req.method === "HEAD" || info.size === 0) {
        res.writeHead(status, headers);
        res.end();
        return;
      }

      const stream = createReadStream(file, range);
      res.once("close", () => stream.destroy());
      stream.once("error", (error) => {
        if (res.headersSent) res.destroy(error);
        else if (!res.destroyed) sendText(req, res, 404, "Sayfa bulunamadı.");
      });
      stream.once("open", () => {
        if (res.destroyed) {
          stream.destroy();
          return;
        }
        res.writeHead(status, headers);
        stream.pipe(res);
      });
    } catch {
      if (!res.headersSent && !res.destroyed) {
        sendText(req, res, 404, "Sayfa bulunamadı.");
      } else if (!res.destroyed) res.destroy();
    }
  })
  .listen(port, "127.0.0.1", function () {
    console.log(`ECOLIVE · Local: http://127.0.0.1:${this.address().port}`);
  });
