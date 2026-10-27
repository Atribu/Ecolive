import { readFile } from "node:fs/promises";
import { focusAreas } from "../content.js";
import { journeyChapters } from "../journey-content.js";
import { lifeJourneys } from "../journey-content-life.js";
import { natureJourneys } from "../journey-content-nature.js";
import { contactJourney } from "../journey-content-contact.js";
import { responsiveImage } from "./responsive-html.mjs";

const extraAssets = JSON.parse(await readFile(new URL("../extra-assets.json", import.meta.url), "utf8")).assets;
const sizes = "100vw";
const esc = (value) => String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const number = (value) => String(value).padStart(2, "0");

const mainJourney = {
  id: "yasamin-izinde",
  eyebrow: "ECOLIVE’DA YAŞAMIN İZİNDE",
  title: "Birlikte yaşamanın",
  emphasis: "izinde.",
  intro: "Birbirine açılan mekânlar, birbirini tamamlayan yaşamlar. Kampüs fikrini dört farklı bağ üzerinden keşfedin.",
  chapters: journeyChapters,
};

// Only the selected page's story is emitted into HTML; copy stays out of the JS bundle.
export const journeys = [
  { ...mainJourney, slug: "" },
  { ...mainJourney, slug: "proje-hakkinda" },
  ...lifeJourneys,
  ...natureJourneys,
  contactJourney,
];
export const journeyForPage = (slug = "") => journeys.find((journey) => journey.slug === slug);

function resolveChapter(chapter) {
  const [kind, key] = chapter.image.split(":");
  const source = kind === "area"
    ? focusAreas.find((area) => area.id === key)
    : extraAssets.find((asset) => asset.filename.endsWith(`/${key}.webp`));
  if (!source) throw new Error(`Missing immersive journey image: ${chapter.image}`);
  const image = {
    ...responsiveImage(source.image || source.filename, sizes),
    alt: source.alt || source.alt_tr,
    position: source.suggested_object_position || "50% 50%",
  };
  if (!image.srcset || !image.width || !image.height) {
    throw new Error(`Missing responsive immersive journey image: ${chapter.image}`);
  }
  return { ...chapter, image };
}

export function renderImmersiveJourney(slug = "") {
  const journey = journeyForPage(slug);
  if (!journey) throw new Error(`Missing immersive journey for page: ${slug}`);
  const items = journey.chapters.map(resolveChapter);
  const first = items[0];
  const headingId = `${journey.id}-heading`;
  const detailId = `${journey.id}-detail`;
  return `<section class="immersive-journey" id="${esc(journey.id)}" data-journey data-journey-index="0" style="--journey-progress:0" aria-labelledby="${esc(headingId)}">
    <header class="journey-header">
      <div><span class="micro">${esc(journey.eyebrow)}</span><h2 id="${esc(headingId)}">${esc(journey.title)} <em>${esc(journey.emphasis)}</em></h2></div>
      <p>${esc(journey.intro)}</p>
    </header>
    <div class="journey-track" data-journey-track>
      <div class="journey-stage" data-journey-stage>
        <figure class="journey-scene" data-journey-scene>
          <img class="journey-image is-current" data-journey-image="0" src="${esc(first.image.src)}" srcset="${esc(first.image.srcset)}" sizes="${sizes}" width="${first.image.width}" height="${first.image.height}" alt="${esc(first.image.alt)}" loading="lazy" decoding="async" style="object-position:${esc(first.image.position)}"/>
          <img class="journey-image" data-journey-image="1" alt="" aria-hidden="true" decoding="async"/>
          <figcaption aria-live="off"><span>ECOLIVE</span><span data-journey-label>${esc(first.label)}</span></figcaption>
          <span class="journey-frame" aria-hidden="true"></span>
        </figure>
        <div class="journey-panel" id="${esc(detailId)}" role="region" aria-label="Seçilen keşif bölümü">
          <div class="journey-panel-top"><span class="journey-count" data-journey-count>01 / ${number(items.length)}</span><span class="journey-scroll-hint">Kaydırarak keşfedin <span aria-hidden="true">↓</span></span></div>
          <div class="journey-copy" data-journey-copy aria-live="off" aria-atomic="true"><span class="micro" data-journey-eyebrow>${esc(first.eyebrow)}</span><h3 data-journey-title>${esc(first.title)}</h3><p data-journey-text>${esc(first.text)}</p></div>
          <a class="journey-link" data-journey-link href="${esc(first.href)}"><span>${esc(first.link)}</span><span aria-hidden="true">↗</span></a>
          <div class="journey-choices" role="group" aria-label="Keşif bölümlerini seçin">${items.map((item, index) => `<button class="journey-choice${index === 0 ? " is-active" : ""}" type="button" data-journey-choice="${index}" aria-pressed="${index === 0}" aria-controls="${esc(detailId)}" disabled><span class="journey-choice-number" aria-hidden="true">${number(index + 1)}</span><span>${esc(item.label)}</span><span class="journey-choice-mark" aria-hidden="true">↗</span></button>`).join("")}</div>
          <div class="journey-navigation"><span>HİKÂYEYİ KEŞFETMEYE DEVAM EDİN</span><div><button type="button" data-journey-prev aria-label="Önceki keşif bölümü" aria-controls="${esc(detailId)}" disabled>←</button><button type="button" data-journey-next aria-label="Sonraki keşif bölümü" aria-controls="${esc(detailId)}" disabled>→</button></div></div>
        </div>
        <div class="journey-progress" data-journey-progress role="progressbar" aria-label="Keşif ilerlemesi" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span></span></div>
      </div>
    </div>
    <span class="journey-status" data-journey-status role="status" aria-atomic="true"></span>
    <noscript><ol class="journey-fallback">${items.slice(1).map((item) => `<li><span class="micro">${esc(item.label)}</span><h3>${esc(item.title)}</h3><p>${esc(item.text)}</p><a href="${esc(item.href)}">${esc(item.link)} ↗</a></li>`).join("")}</ol></noscript>
    <script type="application/json" data-journey-items>${JSON.stringify(items).replaceAll("<", "\\u003c")}</script>
  </section>`;
}
