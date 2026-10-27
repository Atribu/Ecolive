import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { dirname, extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { sceneImages } from "../scene-images.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const origin = "https://ecolive.test";
const routes = ["/", "/proje-hakkinda/", "/yasam-ve-mimari/", "/saglik-ve-iyi-yasam/", "/egitim-ve-kusaklar/", "/tarim-ve-uretim/", "/doga-ve-peyzaj/", "/enerji-ve-kaynaklar/", "/iletisim/"];
const decode = (value = "") => value.replace(/&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt|nbsp);/gi, (_, entity) => {
  if (entity[0] === "#") return String.fromCodePoint(Number.parseInt(entity.slice(entity[1]?.toLowerCase() === "x" ? 2 : 1), entity[1]?.toLowerCase() === "x" ? 16 : 10));
  return { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " " }[entity.toLowerCase()];
});
const attributes = (tag) => Object.fromEntries([...tag.matchAll(/\s([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)].map(([, key, double, single, plain]) => [key.toLowerCase(), decode(double ?? single ?? plain ?? "")]));
const tags = (html, tag) => [...html.matchAll(new RegExp(`<${tag}\\b(?:[^>"']|"[^"]*"|'[^']*')*>`, "gi"))].map(match => ({ raw: match[0], attrs: attributes(match[0]), index: match.index }));
const ids = (html) => [...html.matchAll(/<[a-z][\w:-]*\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi)].map(match => attributes(match[0]).id).filter(Boolean);
const srcsetUrls = (value = "") => value.split(",").map(candidate => candidate.trim().split(/\s+/)[0]).filter(Boolean);
const normalizedPath = (path) => path.replace(/\/index\.html$/, "/").replace(/\/+$/, "") || "/";
const pages = new Map(await Promise.all(routes.map(async route => [route, await readFile(join(dist, route, "index.html"), "utf8")])));
const pageIds = new Map([...pages].map(([route, html]) => [normalizedPath(route), new Set(ids(html))]));
const assetChecks = new Map();

async function existingLocalFile(url, message) {
  assert.equal(url.origin, origin, `${message}: local origin`);
  const path = resolve(dist, `.${decodeURIComponent(url.pathname)}`);
  assert.ok(path.startsWith(`${dist}${sep}`), `${message}: path remains inside the built site`);
  if (!assetChecks.has(path)) assetChecks.set(path, stat(path));
  assert.ok((await assetChecks.get(path)).isFile(), `${message}: ${url.pathname} exists`);
}

async function verifyImage(image, message) {
  assert.ok(typeof image.alt === "string" && image.alt.trim(), `${message}: descriptive alternative text`);
  assert.ok(Number(image.width) > 0 && Number(image.height) > 0, `${message}: intrinsic dimensions`);
  const sources = new Set([image.src, ...srcsetUrls(image.srcset)]);
  assert.ok(image.src && sources.size > 1, `${message}: responsive image candidates`);
  for (const source of sources) await existingLocalFile(new URL(source, origin), message);
}

function galleryFor(html, route) {
  const sections = [...html.matchAll(/<section\b[^>]*\bdata-spatial-gallery(?:\s|>)[\s\S]*?<\/section>/g)];
  assert.equal(sections.length, 1, `${route}: one gallery`);
  const section = sections[0][0];
  const data = section.match(/<script\b[^>]*\bdata-spatial-items(?:\s|>)([\s\S]*?)<\/script>/)?.[1];
  assert.ok(data, `${route}: gallery content is present`);
  return { section, items: JSON.parse(data) };
}

function openingImage(html, route) {
  const marker = tags(html, "div").find(tag => "data-scene-destination" in tag.attrs);
  assert.ok(marker, `${route}: opening visual is available for navigation`);
  const image = tags(html.slice(marker.index), "img")[0]?.attrs;
  assert.ok(image, `${route}: opening visual includes a fallback image`);
  return image;
}

test("all nine pages have one main heading, unique IDs and valid accessible associations", () => {
  assert.equal(pages.size, 9);
  for (const [route, html] of pages) {
    const headings = tags(html, "h1");
    assert.equal(headings.length, 1, `${route}: exactly one main heading`);
    const names = ids(html);
    assert.equal(new Set(names).size, names.length, `${route}: duplicate IDs: ${names.filter((name, index) => names.indexOf(name) !== index).join(", ")}`);
    const knownIds = new Set(names);
    for (const match of html.matchAll(/<[a-z][\w:-]*\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi)) {
      const attrs = attributes(match[0]);
      for (const association of ["aria-controls", "aria-labelledby", "aria-describedby"]) {
        for (const target of (attrs[association] || "").split(/\s+/).filter(Boolean)) assert.ok(knownIds.has(target), `${route}: ${association} points to ${target}`);
      }
    }
  }
});

test("every local page link and fragment reaches an existing destination", async () => {
  for (const [route, html] of pages) {
    for (const { attrs } of tags(html, "a")) {
      if (!attrs.href) continue;
      const destination = new URL(attrs.href, `${origin}${route}`);
      if (destination.origin !== origin || !["http:", "https:"].includes(destination.protocol)) continue;
      const targetRoute = normalizedPath(destination.pathname);
      const targetIds = pageIds.get(targetRoute);
      if (targetIds) {
        if (destination.hash) assert.ok(targetIds.has(decodeURIComponent(destination.hash.slice(1))), `${route}: ${attrs.href} has an existing anchor`);
      } else {
        assert.ok(extname(destination.pathname), `${route}: unknown page route ${attrs.href}`);
        await existingLocalFile(destination, `${route}: ${attrs.href}`);
        // A static image/PDF may have a browser-specific fragment; it is not an HTML anchor.
      }
    }
  }
});

test("the home opening and eight topic openings contain accessible responsive imagery and a working discovery link", async () => {
  let sceneCount = 0;
  for (const [route, html] of pages) {
    const openings = tags(html, "section").filter(tag => "data-scene-hero" in tag.attrs || "data-scroll-hero" in tag.attrs);
    assert.equal(openings.length, 1, `${route}: one opening scene`);
    if ("data-scene-hero" in openings[0].attrs) sceneCount += 1;
    const image = openingImage(html, route);
    await verifyImage(image, `${route}: opening`);
    const opening = html.slice(openings[0].index, html.indexOf("</section>", openings[0].index));
    const discoveryLinks = tags(opening, "a").filter(tag => /(?:^|\s)(?:scene-explore|scroll-cue)(?:\s|$)/.test(tag.attrs.class || ""));
    assert.equal(discoveryLinks.length, 1, `${route}: an actionable opening link`);
    assert.ok(discoveryLinks[0].attrs.href?.startsWith("#"), `${route}: opening link reaches page content`);
  }
  assert.equal(sceneCount, 8, "eight topic-specific openings plus the video opening");
});

test("all nine galleries offer four valid images and correctly connected modal controls", async () => {
  for (const [route, html] of pages) {
    const { section, items } = galleryFor(html, route);
    assert.equal(items.length, 4, `${route}: four gallery views`);
    assert.equal(new Set(items.map(item => item.image.src)).size, 4, `${route}: distinct gallery images`);
    const links = tags(section, "a").filter(tag => "data-spatial-open" in tag.attrs);
    assert.equal(links.length, 4, `${route}: all gallery views can open`);
    const dialogs = tags(section, "dialog");
    assert.equal(dialogs.length, 1, `${route}: a native image dialog`);
    const dialogId = dialogs[0].attrs.id;
    for (const [index, item] of items.entries()) {
      assert.ok(item.title?.trim() && item.text?.trim(), `${route}: gallery view ${index + 1} has descriptive content`);
      await verifyImage(item.image, `${route}: gallery view ${index + 1}`);
      assert.equal(links[index].attrs["aria-controls"], dialogId, `${route}: gallery link reaches its dialog`);
      assert.equal(links[index].attrs["aria-haspopup"], "dialog", `${route}: dialog behavior is announced`);
      assert.ok(links[index].attrs["aria-label"]?.trim(), `${route}: image link has a name`);
    }
    assert.ok(tags(section, "button").some(tag => "data-spatial-close" in tag.attrs && tag.attrs["aria-label"]), `${route}: named dialog close control`);
  }
});

test("navigation previews match the actual opening image on every destination page", async () => {
  const previews = new Map(sceneImages.map(image => [normalizedPath(new URL(image.href, origin).pathname), image]));
  assert.equal(previews.size, 9, "one preview for every page");
  for (const [route, html] of pages) {
    const preview = previews.get(normalizedPath(route));
    assert.ok(preview, `${route}: a navigation preview exists`);
    const opening = openingImage(html, route);
    assert.equal(preview.src, opening.src, `${route}: menu and destination share their opening image`);
    assert.deepEqual(new Set(srcsetUrls(preview.srcset)), new Set(srcsetUrls(opening.srcset)), `${route}: menu and opening reference the same responsive image family`);
    await verifyImage(preview, `${route}: navigation preview`);
  }
});
