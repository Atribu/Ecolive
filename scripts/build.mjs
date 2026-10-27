import "./generate-pages.mjs";
import { pageDetails } from "../page-content.js";
import { build, transform } from "esbuild";
import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { basename, dirname, extname, join, posix } from "node:path";
import { brotliCompress, constants, gzip } from "node:zlib";
import { promisify } from "node:util";

const compressBrotli = promisify(brotliCompress);
const compressGzip = promisify(gzip);
const output = "dist";
const bundleDirectory = "assets/build";
const pages = [
  "index.html",
  ...Object.values(pageDetails).map((page) => `${page.slug}/index.html`),
  "proje-hakkinda/index.html",
  "iletisim/index.html",
];
const fingerprint = (contents) =>
  createHash("sha256").update(contents).digest("hex").slice(0, 12);
const manifest = { scripts: {}, chunks: [], modulePreloads: [], styles: {}, fonts: {} };

await rm(output, { recursive: true, force: true });
await mkdir(join(output, bundleDirectory), { recursive: true });
await cp("assets", join(output, "assets"), { recursive: true });

async function emitHashed(name, extension, contents) {
  const path = `${bundleDirectory}/${name}.${fingerprint(contents)}${extension}`;
  await writeFile(join(output, path), contents);
  return `/${path}`;
}

// Keep the shared entry small; below-fold experiences load when approached.
const javascript = await build({
  entryPoints: ["app.js"],
  bundle: true,
  minify: true,
  format: "esm",
  splitting: true,
  outdir: join(output, bundleDirectory),
  entryNames: "[name].[hash]",
  chunkNames: "[name].[hash]",
  metafile: true,
  target: ["es2020"],
  legalComments: "none",
  write: false,
});
for (const file of javascript.outputFiles) {
  const path = `${bundleDirectory}/${basename(file.path)}`;
  await writeFile(join(output, path), file.contents);
  const metadata = javascript.metafile.outputs[join(output, path)];
  if (metadata?.entryPoint === "app.js") manifest.scripts["/app.js"] = `/${path}`;
  else manifest.chunks.push(`/${path}`);
}
if (!manifest.scripts["/app.js"]) throw new Error("Missing app entry bundle");
const eagerModules = new Set([`${output}${manifest.scripts["/app.js"]}`]);
for (const path of eagerModules) {
  for (const dependency of javascript.metafile.outputs[path]?.imports || []) {
    if (dependency.kind === "import-statement" && !dependency.external) eagerModules.add(dependency.path);
  }
}
manifest.modulePreloads = [...eagerModules].slice(1).map(path => `/${path.slice(output.length + 1)}`);

async function stylesheetSource(url) {
  const file = url.replace(/^\//, "").split(/[?#]/)[0];
  const css = await readFile(file, "utf8");
  const matches = [...css.matchAll(/url\(\s*(["']?)([^\s"')]+)\1\s*\)/g)];
  let rewritten = css;
  for (const match of matches) {
    const reference = match[2];
    if (/^(?:data:|https?:|\/\/|#)/i.test(reference)) continue;
    const localUrl = reference.startsWith("/")
      ? reference
      : `/${posix.normalize(posix.join(posix.dirname(file), reference))}`;
    let targetUrl = localUrl;
    if (/\.(?:woff2?|ttf|otf)(?:[?#]|$)/i.test(localUrl)) {
      const fontPath = localUrl.slice(1).split(/[?#]/)[0];
      if (!manifest.fonts[localUrl]) {
        const extension = extname(fontPath);
        manifest.fonts[localUrl] = await emitHashed(
          basename(fontPath, extension),
          extension,
          await readFile(fontPath),
        );
      }
      targetUrl = manifest.fonts[localUrl];
    }
    rewritten = rewritten.replaceAll(match[0], `url("${targetUrl}")`);
  }
  return rewritten;
}

const stylesheetBundles = new Map();
for (const page of pages) {
  let html = await readFile(page, "utf8");
  const allLinks = [...html.matchAll(/<link\b[^>]*>/gi)].filter((match) =>
    /\brel\s*=\s*["']stylesheet["']/i.test(match[0]),
  );
  // Exclude whole optional features, never selectors inside a stylesheet.
  const featureStyles = {
    "/day-rhythm.css": /data-day-rhythm/,
    "/campus-explorer.css": /data-campus-explorer/,
    "/living-campus.css": /id="map-dialog"/,
    "/living-cycle.css": /data-living-experience|resource-diagram|cycle-section/,
  };
  const links = allLinks.filter(match => {
    const url = /\bhref\s*=\s*["']([^"']+)["']/i.exec(match[0])?.[1];
    if (!featureStyles[url] || featureStyles[url].test(html)) return true;
    html = html.replace(match[0], "");
    return false;
  });
  const urls = links.map((match) => {
    const url = /\bhref\s*=\s*["']([^"']+)["']/i.exec(match[0])?.[1];
    if (!url?.startsWith("/") || url.startsWith("//")) {
      throw new Error(`Stylesheet must use a local absolute URL: ${match[0]}`);
    }
    return url;
  });
  const key = urls.join("\n");
  if (!stylesheetBundles.has(key)) {
    const sources = [];
    for (const url of urls) sources.push(await stylesheetSource(url));
    const minified = await transform(sources.join("\n"), {
      loader: "css",
      minify: true,
      target: ["chrome100", "safari15", "firefox100"],
      legalComments: "none",
    });
    stylesheetBundles.set(key, await emitHashed("site", ".css", minified.code));
  }
  const stylesheet = stylesheetBundles.get(key);
  manifest.styles[`/${page}`] = stylesheet;
  for (const [index, link] of links.entries()) {
    html = html.replace(
      link[0],
      index === 0 ? `<link rel="stylesheet" href="${stylesheet}" />` : "",
    );
  }
  html = html.replace(
    /(<script\b[^>]*\bsrc=["'])\/app\.js(["'])/g,
    `$1${manifest.scripts["/app.js"]}$2`,
  );
  html = html.replace("</head>", `${manifest.modulePreloads.map(url => `<link rel="modulepreload" href="${url}">`).join("")}</head>`);
  for (const [source, target] of Object.entries(manifest.fonts)) {
    html = html.replaceAll(`"${source}"`, `"${target}"`);
    html = html.replaceAll(`'${source}'`, `'${target}'`);
  }
  await mkdir(dirname(join(output, page)), { recursive: true });
  await writeFile(join(output, page), html);
}

await writeFile(
  join(output, "build-manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);
await cp("deploy/apache.htaccess", join(output, ".htaccess"));
let staticHeaders = await readFile("deploy/static-headers", "utf8");
for (const page of pages) {
  const route =
    page === "index.html" ? "/" : `/${page.replace(/index\.html$/, "")}`;
  staticHeaders += `\n${route}\n  Cache-Control: no-cache\n/${page}\n  Cache-Control: no-cache\n`;
}
async function unversionedHeaders(directory, url = "/assets") {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!["build", "responsive"].includes(entry.name)) {
        await unversionedHeaders(
          join(directory, entry.name),
          `${url}/${entry.name}`,
        );
      }
    } else if (
      /\.(?:css|js|woff2?|ttf|otf|webp|png|jpe?g|svg|mp4|webm)$/.test(
        entry.name,
      )
    ) {
      staticHeaders += `\n${url}/${entry.name}\n  Cache-Control: public, max-age=604800, must-revalidate\n`;
    }
  }
}
await unversionedHeaders(join(output, "assets"));
await writeFile(join(output, "_headers"), staticHeaders);

async function compressDirectory(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) {
      await compressDirectory(file);
    } else if (/\.(?:html|css|js|json|svg|txt)$/.test(entry.name)) {
      const contents = await readFile(file);
      if (contents.length < 256) continue;
      const [br, gz] = await Promise.all([
        compressBrotli(contents, {
          params: { [constants.BROTLI_PARAM_QUALITY]: 9 },
        }),
        compressGzip(contents, { level: 9 }),
      ]);
      if (br.length < contents.length) await writeFile(`${file}.br`, br);
      if (gz.length < contents.length) await writeFile(`${file}.gz`, gz);
    }
  }
}
await compressDirectory(output);
console.log(
  `ECOLIVE production: ${pages.length} pages, ${stylesheetBundles.size} CSS bundles, 1 JS entry + ${manifest.chunks.length} chunks → dist/`,
);
