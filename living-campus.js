import { focusAreas } from "./focus-data.js";

// Coordinates follow the labelled Turkish plan (1451 × 1084), including its margins.
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
    image: {
      src: "/assets/responsive/shared-lounge-640.bc60912e.webp",
      srcset: "/assets/responsive/shared-lounge-640.bc60912e.webp 640w, /assets/responsive/shared-lounge-960.c86cbc1d.webp 960w",
      alt: "Bahçeye açılan ortak yaşam salonunda sohbet eden kişilerin proje görselleştirmesi",
    },
  },
  {
    id: "doga", label: "Bahçeler ve yollar", title: "Yerleşkeyi birleştiren yeşil yollar.",
    x: 77.8, y: 54.6, eyebrow: "YAYA YOLLARI VE KAMPÜS İÇİ ULAŞIM",
    description: "Bahçe yolları; konutları, üretim alanlarını ve sosyal mekânları birbirine bağlıyor. Gölgeli dinlenme noktalarıyla desteklenen yaya ağı, açık havada hareket etmeyi ve yerleşke içinde rahat dolaşımı önceliklendiriyor.",
    link: "Peyzajı keşfedin", area: "doga",
  },
];

function element(tag, className, text) {
  const node = document.createElement(tag);
  node.className = className;
  if (text) node.textContent = text;
  return node;
}

export function initLivingCampus() {
  const dialog = document.querySelector("#map-dialog");
  const plan = dialog?.querySelector(":scope > img");
  if (!dialog || !plan || dialog.dataset.livingCampus) return;
  dialog.dataset.livingCampus = "true";
  dialog.classList.add("living-campus");

  const title = dialog.querySelector("#map-title");
  const eyebrow = element("span", "living-campus-eyebrow", "BİRBİRİNE BAĞLI BİR YAŞAM");
  title?.before(eyebrow);
  const introduction = element("p", "living-campus-intro", "Plan üzerinden bir alan seçerek konumunu, işlevini ve tasarım yaklaşımını inceleyin.");
  title?.after(introduction);

  const layout = element("div", "living-campus-layout");
  const mapColumn = element("div", "living-campus-map-column");
  const frame = element("div", "living-campus-plan");
  const controls = element("div", "living-campus-regions");
  controls.setAttribute("role", "group");
  controls.setAttribute("aria-label", "Kampüs alanları");
  const detail = element("section", "living-campus-detail");
  detail.id = "campus-region-detail";
  detail.setAttribute("aria-labelledby", "campus-region-title");
  const photo = element("img", "living-campus-photo");
  photo.loading = "lazy";
  photo.decoding = "async";
  photo.width = 640;
  photo.height = 480;
  photo.sizes = "(max-width: 760px) 90vw, 360px";
  const copy = element("div", "living-campus-copy");
  const label = element("span", "living-campus-label");
  const heading = element("h3", "living-campus-title");
  heading.id = "campus-region-title";
  const description = element("p", "living-campus-description");
  const link = element("a", "living-campus-link");
  const count = element("span", "living-campus-count");
  count.setAttribute("aria-hidden", "true");
  const status = element("span", "living-campus-status");
  status.setAttribute("role", "status");
  status.setAttribute("aria-atomic", "true");

  plan.before(layout);
  frame.append(plan);
  mapColumn.append(frame, controls);
  copy.append(label, heading, description, link, count);
  detail.append(photo, copy);
  layout.append(mapColumn, detail, status);
  const caption = dialog.querySelector(":scope > p:not(.living-campus-intro)");
  caption?.classList.add("living-campus-caption");

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const motionAllowed = () => !reducedMotion.matches && document.documentElement.dataset.motion !== "paused";
  const markers = [];
  const options = [];
  let selected = -1;
  let entrance;

  function select(index, announce = true) {
    if (selected === index) return;
    const region = regions[index];
    const area = focusAreas.find((item) => item.id === region.area);
    if (!area) return;
    selected = index;
    markers.forEach((marker, i) => marker.setAttribute("aria-pressed", String(i === index)));
    options.forEach((option, i) => option.setAttribute("aria-pressed", String(i === index)));
    const imagery = region.image || area;
    photo.src = imagery.src;
    photo.srcset = imagery.srcset;
    photo.alt = imagery.alt;
    label.textContent = region.eyebrow;
    heading.textContent = region.title;
    description.textContent = region.description;
    link.href = area.href;
    link.textContent = `${region.link} ↗`;
    count.textContent = `${String(index + 1).padStart(2, "0")} / ${String(regions.length).padStart(2, "0")}`;
    if (announce) status.textContent = `${region.label} seçildi. ${region.title}`;
    entrance?.cancel();
    if (announce && motionAllowed()) {
      entrance = copy.animate?.(
        [{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "translateY(0)" }],
        { duration: 360, easing: "cubic-bezier(.2,.8,.2,1)" },
      );
    }
  }

  function bindKeyboard(button, index, collection) {
    button.addEventListener("keydown", (event) => {
      let next;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % regions.length;
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (index + regions.length - 1) % regions.length;
      if (event.key === "Home") next = 0;
      if (event.key === "End") next = regions.length - 1;
      if (next === undefined) return;
      event.preventDefault();
      select(next);
      collection[next].focus({ preventScroll: true });
      if (collection === options) collection[next].scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
    });
  }

  regions.forEach((region, index) => {
    const number = String(index + 1).padStart(2, "0");
    const marker = element("button", "living-campus-marker");
    marker.type = "button";
    marker.style.setProperty("--campus-x", `${region.x}%`);
    marker.style.setProperty("--campus-y", `${region.y}%`);
    marker.setAttribute("aria-label", `${number} · ${region.label}`);
    marker.setAttribute("aria-controls", detail.id);
    marker.setAttribute("aria-pressed", "false");
    marker.title = region.label;
    marker.append(element("span", "living-campus-marker-number", number));
    marker.addEventListener("click", () => select(index));
    frame.append(marker);
    markers.push(marker);

    const option = element("button", "living-campus-region");
    option.type = "button";
    option.setAttribute("aria-controls", detail.id);
    option.setAttribute("aria-pressed", "false");
    option.append(element("span", "living-campus-region-number", number), element("span", "living-campus-region-name", region.label));
    option.addEventListener("click", () => select(index));
    controls.append(option);
    options.push(option);
    bindKeyboard(marker, index, markers);
    bindKeyboard(option, index, options);
  });

  select(0, false);
  const stopMotion = () => { if (!motionAllowed()) entrance?.cancel(); };
  document.addEventListener("ecolive:motionchange", stopMotion);
  reducedMotion.addEventListener("change", stopMotion);
  dialog.addEventListener("close", () => entrance?.cancel());

  const opener = document.querySelector("#map-open");
  if (opener) {
    opener.setAttribute("aria-label", "Etkileşimli kampüs planını açın ve alanları keşfedin");
    const openerCaption = opener.querySelector("span");
    if (openerCaption) openerCaption.textContent = "Kampüsün alanlarını keşfedin ↗";
  }
}
