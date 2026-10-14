import "./generate-pages.mjs";
import { pageDetails } from "../page-content.js";
import { cp, mkdir, rm } from "node:fs/promises";
await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });
for (const file of [
  "index.html",
  "styles.css",
  "pages.css",
  "interior.css",
  "waves.css",
  "motion.css",
  "interactions.css",
  "waves.js",
  "motion.js",
  "app.js",
  "content.js",
  "page-content.js",
  "project-content.js",
  ...Object.values(pageDetails).map((page) => page.slug),
  "proje-hakkinda",
  "iletisim",
  "assets",
]) {
  await cp(file, `dist/${file}`, { recursive: true });
}
console.log("ECOLIVE production files ready in dist/");
