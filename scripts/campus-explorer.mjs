import { focusAreas } from "../content.js";
import { pageDetails } from "../page-content.js";
import { responsiveImage } from "./responsive-html.mjs";

const esc = (value) => String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const number = (value) => String(value).padStart(2, "0");
const photoSizes = "(max-width: 600px) 100vw, (max-width: 1000px) 48vw, 33vw";

// The coordinates are verified against the Turkish plan (1451 × 1084),
// including its margins; they match the existing full-screen plan.
const regions = [
  {
    id: "uretim", label: "Seralar ve üretim", title: "Üretimin merkezinde toprak.",
    x: 16.2, y: 43.5, eyebrow: "ORGANİK SERALAR VE BİTKİ BAHÇELERİ",
    description: "Seralar ve bitki bahçeleri, tarımsal üretimle uygulamalı öğrenmeyi aynı çevrede buluşturuyor. Mevsimsel üretim ve bahçecilik, yerleşkenin beslenme ve ortak etkinlik yaklaşımını tamamlıyor.",
    link: "Üretim yaklaşımını keşfedin", area: "uretim",
  },
  {
    id: "yasam", label: "Yaşam alanları", title: "Bahçeye açılan yaşam alanları.",
    x: 82.5, y: 27.3, eyebrow: "AZ KATLI BUNGALOV KONUTLAR",
    description: "Bahçeye açılan konutlar, kişisel mahremiyet ile ortak alanlara erişimi birlikte gözetiyor. Az katlı yerleşim; açık havada geçirilen zamanı, yaya ulaşımını ve komşuluk ilişkilerini destekleyecek biçimde tasarlandı.",
    link: "Yaşam alanlarını keşfedin", area: "yasam",
  },
  {
    id: "saglik", label: "İyi yaşam merkezi", title: "Günlük yaşamı destekleyen mekânlar.",
    x: 30.5, y: 65.2, eyebrow: "SAĞLIK AKADEMİSİ VE İYİ YAŞAM MERKEZİ",
    description: "Sağlık, bakım ve rehabilitasyon alanları; hareket, dinlenme ve sosyal mekânlarla birlikte planlandı. Tasarımın odağında, farklı destek ihtiyaçlarına uygun bir çevre ve bireyin günlük yaşama katılımı yer alıyor.",
    link: "İyi yaşam yaklaşımını keşfedin", area: "saglik",
  },
  {
    id: "agora", label: "Merkezî agora", title: "Ortak yaşamın buluşma noktası.",
    x: 45.3, y: 68.1, eyebrow: "MERKEZÎ AGORA VE ORTAK YAŞAM ALANI",
    description: "Merkezî agora, yerleşkenin sosyal buluşma noktası. Ortak salonlar ve çevresindeki bahçeler; sohbet, dinlenme ve kuşaklar arası etkinlikler için birbirini tamamlayan mekânlar oluşturuyor.",
    link: "Birlikte yaşamı keşfedin", area: "egitim",
    image: "/assets/extra/shared-lounge.webp",
    alt: "Bahçeye açılan ortak yaşam salonunda sohbet eden kişilerin proje görselleştirmesi",
  },
  {
    id: "doga", label: "Bahçeler ve yollar", title: "Yerleşkeyi birleştiren yeşil yollar.",
    x: 77.8, y: 54.6, eyebrow: "YAYA YOLLARI VE KAMPÜS İÇİ ULAŞIM",
    description: "Bahçe yolları; konutları, üretim alanlarını ve sosyal mekânları birbirine bağlıyor. Gölgeli dinlenme noktalarıyla desteklenen yaya ağı, açık havada hareket etmeyi ve yerleşke içinde rahat dolaşımı önceliklendiriyor.",
    link: "Peyzajı keşfedin", area: "doga",
  },
];

function resolveRegion(region) {
  const area = focusAreas.find((item) => item.id === region.area);
  if (!area) throw new Error(`Unknown campus focus area: ${region.area}`);
  const image = region.image
    ? { ...responsiveImage(region.image, photoSizes), alt: region.alt }
    : { ...responsiveImage(area.image, photoSizes), alt: area.alt };
  if (!image.srcset) throw new Error(`Missing responsive campus photo: ${region.id}`);
  return { ...region, image, href: `/${pageDetails[area.id].slug}/` };
}

export function renderCampusExplorer({ id = "kampus-kesfi" } = {}) {
  const items = regions.map(resolveRegion);
  const overview = {
    label: "Kampüsün bütünü", eyebrow: "BÜTÜNCÜL YERLEŞİM YAKLAŞIMI",
    title: "Günlük yaşamı tamamlayan bir yerleşke.",
    description: "Konutlar, üretim bahçeleri, iyi yaşam merkezi ve sosyal alanlar ortak bir yerleşim planında buluşuyor. ECOLIVE’da her işlev, günlük yaşamın farklı bir ihtiyacını karşılayacak biçimde konumlandırıldı.",
    link: "Projeyi yakından tanıyın", href: "/proje-hakkinda/",
    image: { ...responsiveImage("/assets/hero.webp", photoSizes), alt: "Bahçeler ve ortak yaşam alanlarıyla bütünleşen ECOLIVE kampüsünün proje görselleştirmesi" },
  };
  const plan = responsiveImage("/assets/campus-plan-tr.png", "(max-width: 1000px) 100vw, 65vw");
  const img = (item) => `src="${esc(item.src)}" srcset="${esc(item.srcset)}" sizes="${esc(item.sizes)}" width="${item.width}" height="${item.height}" alt="${esc(item.alt)}" loading="lazy" decoding="async"`;
  const detailId = `${id}-detail`;
  return `<section class="campus-explorer" id="${esc(id)}" data-campus-explorer aria-labelledby="${esc(id)}-title">
    <header class="campus-explorer-heading">
      <div><span class="micro">YERLEŞKENİN İÇİNDE</span><h2 id="${esc(id)}-title">Yerleşkeyi<br><em>yakından keşfedin.</em></h2></div>
      <p>Konutların, ortak alanların ve üretim bahçelerinin yerleşim içindeki konumlarını inceleyin. Plan üzerindeki işaretlerden her alanın ayrıntılarına ulaşabilirsiniz.</p>
    </header>
    <div class="campus-explorer-body">
      <div class="campus-explorer-map-column">
        <div class="campus-explorer-map-top"><span>ECOLIVE <i aria-hidden="true">/</i> YERLEŞİM PLANI</span><button class="campus-explorer-reset" type="button" data-campus-reset disabled>Bütünü gör <span aria-hidden="true">↙</span></button></div>
        <div class="campus-explorer-viewport" data-campus-viewport>
          <div class="campus-explorer-plane" data-campus-plane>
            <img class="campus-explorer-plan" ${img({ ...plan, alt: "Seralar, narenciye bahçeleri, bungalovlar, sağlık merkezi, merkezî agora ve yaya yollarının Türkçe açıklamalarla gösterildiği ECOLIVE yerleşim planı" })}>
            ${items.map((item, index) => `<button class="campus-explorer-pin" type="button" data-campus-choice="${index}" style="--campus-x:${item.x}%;--campus-y:${item.y}%" aria-label="${number(index + 1)} · ${esc(item.label)}" aria-controls="${esc(detailId)}" aria-pressed="false" disabled><span>${number(index + 1)}</span></button>`).join("")}
          </div>
          <div class="campus-explorer-map-corners" aria-hidden="true"></div>
        </div>
        <div class="campus-explorer-map-bottom"><span data-campus-map-label>Bir alan seçerek yakından keşfedin</span><button type="button" id="map-open" class="campus-explorer-expand">Planı büyük inceleyin ↗</button></div>
        <div class="campus-explorer-options" role="group" aria-label="Kampüsün alanlarını keşfedin">${items.map((item, index) => `<button class="campus-explorer-option" type="button" data-campus-choice="${index}" aria-pressed="false" aria-controls="${esc(detailId)}" disabled><span class="campus-explorer-option-number">${number(index + 1)}</span><span>${esc(item.label)}</span><span class="campus-explorer-option-arrow" aria-hidden="true">↗</span></button>`).join("")}</div>
      </div>
      <section class="campus-explorer-detail" id="${esc(detailId)}" aria-labelledby="${esc(id)}-detail-title" aria-live="off">
        <figure class="campus-explorer-photo-frame"><img class="campus-explorer-photo" data-campus-photo ${img(overview.image)}><figcaption><span data-campus-photo-label>Kampüsün bütünü</span><span data-campus-count aria-hidden="true">ECOLIVE</span></figcaption></figure>
        <div class="campus-explorer-copy" data-campus-copy><span class="micro" data-campus-eyebrow>${esc(overview.eyebrow)}</span><h3 id="${esc(id)}-detail-title" data-campus-title>${esc(overview.title)}</h3><p data-campus-description>${esc(overview.description)}</p><a class="campus-explorer-link" data-campus-link href="${overview.href}"><span>${esc(overview.link)}</span><span aria-hidden="true">↗</span></a></div>
      </section>
    </div>
    <span class="campus-explorer-status" data-campus-status role="status" aria-atomic="true"></span>
    <noscript><div class="campus-explorer-fallback">${items.map((item) => `<a href="${esc(item.href)}">${esc(item.label)} ↗</a>`).join("")}</div></noscript>
    <script type="application/json" data-campus-items>${JSON.stringify({ items, overview }).replaceAll("<", "\\u003c")}</script>
  </section>`;
}
