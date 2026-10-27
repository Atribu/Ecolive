import { readFile } from "node:fs/promises";
import { focusAreas } from "../content.js";
import { dayMoments } from "../day-rhythm-content.js";
import { responsiveImage } from "./responsive-html.mjs";

const extraAssets = JSON.parse(await readFile(new URL("../extra-assets.json", import.meta.url), "utf8")).assets;
const sizes = "(max-width: 760px) 90vw, (max-width: 1100px) 48vw, 760px";
const esc = (value) => String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

function resolveMoment(moment) {
  const [kind, key] = moment.image.split(":");
  const source = kind === "area"
    ? focusAreas.find((area) => area.id === key)
    : extraAssets.find((asset) => asset.filename.endsWith(`/${key}.webp`));
  if (!source) throw new Error(`Missing day rhythm image: ${moment.image}`);
  const image = {
    ...responsiveImage(source.image || source.filename, sizes),
    alt: source.alt || source.alt_tr,
    position: source.suggested_object_position || "50% 50%",
  };
  if (!image.srcset || !image.width || !image.height) {
    throw new Error(`Missing responsive day rhythm image: ${moment.image}`);
  }
  return { ...moment, image };
}

export function renderDayRhythm() {
  const items = dayMoments.map(resolveMoment);
  const first = items[0];
  return `<section class="day-rhythm" id="gunun-ritmi" data-day-rhythm data-day="${esc(first.theme)}" style="--day-sun-x:${first.sun.x}%;--day-sun-y:${first.sun.y}%" aria-labelledby="day-rhythm-heading">
    <header class="day-rhythm__header">
      <div><span class="micro">GÜNÜN RİTMİ</span><h2 id="day-rhythm-heading">Bir günün içinde, <em>birçok yaşam.</em></h2></div>
      <p>Kendi gününüzü hayal edin. Bir zamanı seçin; bahçelerden ortak alanlara uzanan farklı yaşam anlarını keşfedin.</p>
    </header>
    <div class="day-rhythm__body">
      <figure class="day-rhythm__scene" data-day-scene>
        <img class="day-rhythm__image is-current" data-day-image="0" src="${esc(first.image.src)}" srcset="${esc(first.image.srcset)}" sizes="${sizes}" width="${first.image.width}" height="${first.image.height}" alt="${esc(first.image.alt)}" loading="lazy" decoding="async" style="object-position:${esc(first.image.position)}"/>
        <img class="day-rhythm__image" data-day-image="1" alt="" aria-hidden="true" decoding="async"/>
        <figcaption><span>YAŞAMIN FARKLI ANLARI</span><span class="day-rhythm__index" data-day-count>01 / ${String(items.length).padStart(2, "0")}</span></figcaption>
      </figure>
      <div class="day-rhythm__detail" data-day-detail id="gunun-ritmi-detail" role="region" aria-label="Seçilen yaşam anı">
    <div class="day-rhythm__controls">
      <div class="day-rhythm__choices" role="group" aria-label="Günün zamanını seçin">${items.map((item, index) => `<button class="day-rhythm__choice${index === 0 ? " is-active" : ""}" type="button" data-day-choice="${index}" aria-pressed="${index === 0}" aria-controls="gunun-ritmi-detail" disabled><span class="day-rhythm__choice-number" aria-hidden="true">${String(index + 1).padStart(2, "0")}</span><span class="day-rhythm__choice-label">${esc(item.label)}</span></button>`).join("")}</div>
      <label class="day-rhythm__range-label" for="day-rhythm-range">Günün içinde gezinin</label><input id="day-rhythm-range" class="day-rhythm__range" type="range" data-day-range min="0" max="${items.length - 1}" step="1" value="0" aria-label="Günün zamanını seçin" aria-valuetext="${esc(first.label)}" aria-controls="gunun-ritmi-detail" disabled/>
      <div class="day-rhythm__navigator" aria-label="Yaşam anları arasında gezinme"><button type="button" data-day-prev aria-label="Önceki yaşam anı" aria-controls="gunun-ritmi-detail" disabled>←</button><span>Günün ritmini siz belirleyin</span><button type="button" data-day-next aria-label="Sonraki yaşam anı" aria-controls="gunun-ritmi-detail" disabled>→</button></div>
    </div>
        <div class="day-rhythm__sky" aria-hidden="true">
          <svg class="day-rhythm__arc" viewBox="0 0 400 200" preserveAspectRatio="none" fill="none"><path d="M28 167C72 53 129 4 196 20S321 61 371 167"/><path class="day-rhythm__contour" d="M4 180C76 154 91 177 145 158S256 151 303 168 357 161 396 146"/><path class="day-rhythm__contour" d="M4 194C81 173 103 195 152 177S266 170 314 188 361 182 396 166"/></svg>
          <span class="day-rhythm__sun"></span>
        </div>
        <span class="day-rhythm__time" data-day-label>${esc(first.label)}</span>
        <div class="day-rhythm__copy" aria-live="polite" aria-atomic="true"><span class="micro day-rhythm__eyebrow" data-day-eyebrow>${esc(first.eyebrow)}</span>
        <h3 data-day-title>${esc(first.title)}</h3>
        <p data-day-text>${esc(first.text)}</p>
        <span class="day-rhythm__relationship" data-day-relationship>${esc(first.relationship)}</span></div>
        <a class="day-rhythm__link" data-day-link href="${esc(first.href)}"><span>${esc(first.link)}</span><span aria-hidden="true">↗</span></a>
      </div>
    </div>
    <span class="day-rhythm__status" data-day-status role="status" aria-atomic="true"></span>
    <noscript><ul class="day-rhythm__fallback">${items.slice(1).map((item) => `<li><span class="micro">${esc(item.label)}</span><h3>${esc(item.title)}</h3><p>${esc(item.text)}</p><a href="${esc(item.href)}">${esc(item.link)} ↗</a></li>`).join("")}</ul></noscript>
    <script type="application/json" data-day-items>${JSON.stringify(items).replaceAll("<", "\\u003c")}</script>
  </section>`;
}
