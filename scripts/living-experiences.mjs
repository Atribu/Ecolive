import { focusAreas } from "../content.js";
import { lifeExperiences } from "../living-experiences-life.js";
import { natureExperiences } from "../living-experiences-nature.js";
import { projectExperiences } from "../living-experiences-project.js";
import { responsiveImage } from "./responsive-html.mjs";
import { readFile } from "node:fs/promises";

const extraAssets = JSON.parse(await readFile(new URL("../extra-assets.json", import.meta.url), "utf8")).assets;
export const experiences = [...lifeExperiences, ...natureExperiences, ...projectExperiences];
const esc = (value) => String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const icons = {
  home: '<path d="m4 15 12-10 12 10M7 13v15h18V13M13 28v-9h6v9"/>',
  people: '<circle cx="12" cy="10" r="4"/><path d="M4 28v-5a8 8 0 0 1 16 0v5M22 7a4 4 0 0 1 0 8m2 5a6 6 0 0 1 4 6v2"/>',
  leaf: '<path d="M7 25C-1 12 11 4 27 4c0 15-7 28-20 21ZM5 28 23 9M12 21V11m0 10h10"/>',
  sun: '<circle cx="16" cy="16" r="5"/><path d="M16 3v3m0 20v3M3 16h3m20 0h3M7 7l2 2m14 14 2 2M7 25l2-2M23 9l2-2"/>',
  water: '<path d="M16 3C12 9 7 14 7 20a9 9 0 0 0 18 0C25 14 20 9 16 3ZM12 20a4 4 0 0 0 4 4"/>',
  seed: '<path d="M16 28V16M16 19C6 19 5 10 5 6c8 0 11 5 11 13ZM16 14C16 7 21 4 28 4c0 8-5 12-12 12M5 28h22"/>',
  book: '<path d="M16 8C12 5 7 4 3 5v21c4-1 9 0 13 3m0-21c4-3 9-4 13-3v21c-4-1-9 0-13 3V8ZM7 10l5 2M7 15l5 2m8-5 5-2m-5 7 5-2"/>',
  care: '<path d="M16 27 5 17C-3 8 9-1 16 9 23-1 35 8 27 17L16 27ZM11 16h10m-5-5v10"/>',
  walk: '<circle cx="19" cy="5" r="3"/><path d="m9 17 6-6 6 2 6 6M16 11l-3 10-7 8m7-8 7 3 1 6M4 29h24"/>',
  chat: '<path d="M28 15a12 11 0 0 1-17 10l-8 4 3-8a12 11 0 1 1 22-6Z"/><circle cx="10" cy="15" r=".7"/><circle cx="16" cy="15" r=".7"/><circle cx="22" cy="15" r=".7"/>',
  renew: '<path d="M25 12a10 10 0 0 0-17-3L4 13m0-7v7h7M7 20a10 10 0 0 0 17 3l4-4m0 7v-7h-7"/>',
  garden: '<path d="M3 28h26M8 28V15m16 13V15M8 19C-1 19 2 8 8 4c6 4 9 15 0 15Zm16 0c-9 0-6-11 0-15 6 4 9 15 0 15ZM13 28v-6h6v6"/>',
};
const colors = ["#dfc78e", "#a0c8c1", "#bccba2", "#c9ad8b", "#e3e1c8", "#b7c8a5"];
const positions = {
  3: [[50, 13], [80, 70], [20, 70]],
  4: [[50, 12], [82, 45], [50, 82], [18, 45]],
  5: [[50, 12], [81, 41], [70, 81], [30, 81], [19, 41]],
  6: [[50, 10], [82, 29], [82, 69], [50, 86], [18, 69], [18, 29]],
};
const sizes = "(max-width: 760px) 90vw, (max-width: 1100px) 43vw, 580px";

export function experienceItems(config) {
  return config.items.map((item, index) => {
    const [kind, key] = item.image.split(":");
    const source = kind === "area" ? focusAreas.find((area) => area.id === key) : extraAssets.find((asset) => asset.filename.endsWith(`/${key}.webp`));
    if (!source) throw new Error(`Missing experience image: ${item.image}`);
    const image = { ...responsiveImage(source.image || source.filename, sizes), alt: source.alt || source.alt_tr, position: source.suggested_object_position || "50% 50%" };
    if (!image.width || !image.height) throw new Error(`Missing responsive dimensions: ${item.image}`);
    if (!icons[item.icon]) throw new Error(`Missing experience icon: ${item.icon}`);
    return { ...item, image, color: item.color || colors[index % colors.length] };
  });
}

export function renderExperience(slug) {
  const config = experiences.find((experience) => experience.slug === slug);
  if (!config) return "";
  const items = experienceItems(config);
  const first = items[0];
  const points = positions[items.length];
  if (!points) throw new Error(`Unsupported experience size: ${slug}`);
  const journey = config.layout === "journey";
  const edges = points.slice(0, journey ? -1 : undefined).map((point, index) => {
    const nextIndex = (index + 1) % points.length;
    const next = points[nextIndex];
    const a = [point[0] * 6, point[1] * 5.2];
    const b = [next[0] * 6, next[1] * 5.2];
    const middle = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const control = [middle[0] + (middle[0] - 300) * .42, middle[1] + (middle[1] - 260) * .42];
    return { d: `M${a.join(" ")} Q${control.join(" ")} ${b.join(" ")}`, from: index, to: nextIndex };
  });
  const prefix = config.id;
  return `<section class="living-cycle living-cycle--experience living-cycle--${esc(config.theme)}${journey ? " living-cycle--journey" : ""}" id="${esc(prefix)}" data-living-experience data-running="false" data-node-count="${items.length}" aria-labelledby="${esc(prefix)}-heading" style="--cycle-accent:${esc(first.color)}">
    <header class="living-cycle__heading"><div><span class="micro">${esc(config.eyebrow)}</span><h2 id="${esc(prefix)}-heading">${esc(config.title[0])} <em>${esc(config.title[1])}</em></h2></div><p>${esc(config.intro)}</p></header>
    <div class="living-cycle__body"><div class="living-cycle__map">
      <div class="living-cycle__constellation" role="group" aria-label="${esc(config.eyebrow)}">
        <svg class="living-cycle__lines" viewBox="0 0 600 520" fill="none" aria-hidden="true"><path class="living-cycle__contour" d="M280 25C426 0 541 109 548 259S425 506 277 489 34 392 51 234 141 49 280 25Z"/><path class="living-cycle__contour" d="M285 104C379 85 439 154 439 263S366 398 284 400 155 349 160 249 210 118 285 104Z"/>
        ${edges.map((edge, index) => `<path class="living-cycle__route" data-route="${index}" data-from="${edge.from}" data-to="${edge.to}" d="${edge.d}"/><path class="living-cycle__current" data-current="${index}" d="${edge.d}"/>`).join("")}
        ${edges.map((_, index) => `<g class="living-cycle__flow" data-flow="${index}"><circle r="8" opacity=".12"/><circle r="2.5"/></g>`).join("")}</svg>
        <div class="living-cycle__center" aria-hidden="true"><span class="living-cycle__seed"></span><span>${esc(config.center[0])}<br><em>${esc(config.center[1])}</em></span><small>${journey ? "ADIM ADIM KEŞFEDİN" : "ECOLIVE"}</small></div>
        ${items.map((item, index) => `<button type="button" class="living-cycle__node" data-resource="${index}" aria-pressed="${index === 0}" aria-controls="${esc(prefix)}-detail" aria-label="${esc(item.label)} bağlantısını keşfedin" style="--node-x:${points[index][0]}%;--node-y:${points[index][1]}%;--node-color:${esc(item.color)}" disabled><span class="living-cycle__node-icon"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[item.icon]}</svg></span><span class="living-cycle__node-label">${journey ? `<small>${index + 1}.</small> ` : ""}${esc(item.label)}</span></button>`).join("")}
      </div>
      <div class="living-cycle__map-note"><span aria-hidden="true">↗</span><span>${config.note.map(esc).join("<br>")}</span></div>
      <div class="living-cycle__navigator" aria-label="Keşif adımları"><button type="button" data-cycle-prev aria-label="Önceki seçeneği keşfedin" disabled>←</button><span class="living-cycle__selection">01 — ${esc(first.label)}</span><button type="button" data-cycle-next aria-label="Sonraki seçeneği keşfedin" disabled>→</button></div>
      <a class="living-cycle__detail-jump" href="#${esc(prefix)}-detail">Seçimin ayrıntılarını görün <span aria-hidden="true">↓</span></a>
    </div><div class="living-cycle__detail" id="${esc(prefix)}-detail" role="region" aria-label="Seçimin ayrıntıları">
      <figure class="living-cycle__image"><img src="${esc(first.image.src)}" srcset="${esc(first.image.srcset)}" sizes="${sizes}" width="${first.image.width}" height="${first.image.height}" alt="${esc(first.image.alt)}" loading="lazy" decoding="async" style="object-position:${esc(first.image.position)}"/><figcaption><span>${esc(config.caption)}</span><span class="living-cycle__index">01 / ${String(items.length).padStart(2, "0")}</span></figcaption></figure>
      <div class="living-cycle__copy" aria-live="polite" aria-atomic="true"><span class="micro living-cycle__eyebrow">${esc(first.eyebrow)}</span><h3>${esc(first.title)}</h3><p>${esc(first.text)}</p><span class="living-cycle__relationship">${esc(first.relationship)}</span></div><a class="living-cycle__link" href="${esc(first.href)}"><span>${esc(first.link)}</span><span aria-hidden="true">↗</span></a>
    </div></div>
    <noscript><ul class="living-cycle__fallback">${items.slice(1).map((item) => `<li><h3>${esc(item.title)}</h3><p>${esc(item.text)}</p><a href="${esc(item.href)}">${esc(item.link)} ↗</a></li>`).join("")}</ul></noscript>
    <script type="application/json" data-living-items>${JSON.stringify(items).replaceAll("<", "\\u003c")}</script>
  </section>`;
}
