import { readFile } from "node:fs/promises";

const images = JSON.parse(
  await readFile(new URL("../responsive-images.json", import.meta.url), "utf8"),
);
const normalized = (src) => `/${src.replace(/^\/+/, "")}`;
const attr = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];
const setAttr = (tag, name, value) => {
  const pattern = new RegExp(`\\s${name}="[^"]*"`);
  return pattern.test(tag)
    ? tag.replace(pattern, ` ${name}="${value}"`)
    : tag.replace(/\s*\/?>$/, ` ${name}="${value}">`);
};

export function responsiveImage(src, sizes = "100vw") {
  const original = normalized(src);
  const item = images[original];
  if (!item) return { src: original, sizes };
  const fallback =
    item.variants.find((v) => v.width >= 960) || item.variants.at(-1);
  return {
    src: fallback.src,
    srcset: item.variants.map((v) => `${v.src} ${v.width}w`).join(", "),
    sizes,
    width: item.width,
    height: item.height,
  };
}

// Update authored images and generated pages through the same manifest.
export function enhanceResponsiveImages(html) {
  const preloads = new Map();
  html = html.replace(/<img\b[^>]*>/g, (tag) => {
    const original = normalized(
      attr(tag, "data-original-src") || attr(tag, "src") || "",
    );
    const item = images[original];
    if (!item) return tag;
    const logo = original === "/assets/logo-source.png";
    const poster = original === "/assets/video/home-poster.webp";
    const sizes = logo
      ? "(max-width: 760px) 124px, 156px"
      : poster
        ? "(min-aspect-ratio: 16/9) 100vw, 178svh"
        : attr(tag, "sizes") || "100vw";
    const responsive = responsiveImage(original, sizes);
    for (const [name, value] of Object.entries(responsive)) {
      if ((name === "width" || name === "height") && attr(tag, name)) continue;
      tag = setAttr(tag, name, value);
    }
    tag = setAttr(tag, "data-original-src", original);
    tag = setAttr(tag, "decoding", "async");
    preloads.set(original, responsive);
    if (poster && item.mobilePoster && !attr(tag, "data-poster-picture")) {
      tag = setAttr(tag, "data-poster-picture", "true");
      return `<picture><source data-poster-source="true" media="(max-width: 760px) and (max-aspect-ratio: 9/16)" srcset="${item.mobilePoster.src}" width="${item.mobilePoster.width}" height="${item.mobilePoster.height}">${tag}</picture>`;
    }
    return tag;
  });
  // Responsive preloads must select the same candidate as the rendered image.
  html = html.replace(/<link\b[^>]*\brel="preload"[^>]*>/g, (tag) => {
    if (attr(tag, "as") !== "image") return tag;
    const original = normalized(
      attr(tag, "data-original-href") || attr(tag, "href") || "",
    );
    const responsive = preloads.get(original);
    if (!responsive) return tag;
    const item = images[original];
    tag = setAttr(tag, "href", responsive.src);
    tag = setAttr(tag, "imagesrcset", responsive.srcset);
    tag = setAttr(tag, "imagesizes", responsive.sizes);
    tag = setAttr(tag, "data-original-href", original);
    if (item.mobilePoster) {
      tag = setAttr(
        tag,
        "media",
        "not all and (max-width: 760px) and (max-aspect-ratio: 9/16)",
      );
      if (attr(tag, "data-poster-preload")) return tag;
      tag = setAttr(tag, "data-poster-preload", "true");
      return `<link data-poster-mobile-preload="true" rel="preload" as="image" href="${item.mobilePoster.src}" media="(max-width: 760px) and (max-aspect-ratio: 9/16)" fetchpriority="high">${tag}`;
    }
    return tag;
  });
  const mobile = images["/assets/video/home-poster.webp"].mobilePoster;
  html = html.replace(
    /<source\b[^>]*\bmedia="\(max-width: 760px\) and \(max-aspect-ratio: 9\/16\)"[^>]*>/g,
    (tag) => setAttr(tag, "srcset", mobile.src),
  );
  html = html.replace(
    /<link\b[^>]*\bmedia="\(max-width: 760px\) and \(max-aspect-ratio: 9\/16\)"[^>]*>/g,
    (tag) => setAttr(tag, "href", mobile.src),
  );
  const favicon = images["/assets/logo-source.png"].favicon;
  if (favicon)
    html = html.replace(/<link\b[^>]*\brel="icon"[^>]*>/g, (tag) =>
      setAttr(tag, "href", favicon.src),
    );
  return html;
}

export const fontPreloads = [
  "serif-regular-latin",
  "serif-regular-latin-ext",
  "serif-latin",
  "serif-latin-ext",
  "sans-latin",
  "sans-latin-ext",
]
  .map(
    (font) =>
      `<link rel="preload" href="/assets/fonts/${font}.woff2" as="font" type="font/woff2" crossorigin>`,
  )
  .join("");
