import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";

const root = resolve(process.cwd());
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
};
http
  .createServer(async (req, res) => {
    try {
      const path = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
      let file = resolve(root, `.${path === "/" ? "/index.html" : path}`);
      if (
        !file.startsWith(root + sep) ||
        path.split("/").some((segment) => segment.startsWith("."))
      ) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
      }
      const info = await stat(file);
      if (info.isDirectory()) {
        if (!path.endsWith("/")) {
          res.writeHead(301, { Location: `${path}/` });
          res.end();
          return;
        }
        file = resolve(file, "index.html");
      } else if (!info.isFile()) throw new Error("not a file");
      const data = await readFile(file);
      res.writeHead(200, {
        "Content-Type": types[extname(file)] || "application/octet-stream",
        "Cache-Control": "no-cache",
        "X-Content-Type-Options": "nosniff",
      });
      res.end(req.method === "HEAD" ? undefined : data);
    } catch {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Sayfa bulunamadı.");
    }
  })
  .listen(port, "127.0.0.1", () =>
    console.log(`ECOLIVE · Local: http://127.0.0.1:${port}`),
  );
