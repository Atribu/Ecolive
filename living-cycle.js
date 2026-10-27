import { focusAreas } from "./focus-data.js";

const area = (id) => focusAreas.find((item) => item.id === id);
const waterImage = {
  src: "/assets/responsive/lakeside-landscape-960.de28cf29.webp",
  srcset: "/assets/responsive/lakeside-landscape-640.451ac295.webp 640w, /assets/responsive/lakeside-landscape-960.de28cf29.webp 960w, /assets/responsive/lakeside-landscape-1440.b0a2a311.webp 1440w",
  width: 2000,
  height: 1493,
  alt: "Gölet, seralar ve narenciye bahçesini birlikte gösteren ECOLIVE konsept görselleştirmesi",
};
const harvestImage = {
  src: "/assets/responsive/harvest-640.fc51d8db.webp",
  srcset: "/assets/responsive/harvest-640.fc51d8db.webp 640w, /assets/responsive/harvest-960.651f2af5.webp 960w, /assets/responsive/harvest-1000.38cb256d.webp 1000w",
  width: 1000,
  height: 562,
  alt: "Serada yetişen ürünler ve toprağa dayalı üretim",
};

const resources = [
  {
    id: "gunes", label: "Güneş", eyebrow: "GÜNEŞTEN YAŞAMA", title: "Güneş enerjisinden elektrik ve ısı.",
    text: "Fotovoltaik paneller ve güneş ısısı sistemleri, konutların, ortak alanların ve seraların enerji ihtiyaçlarını desteklemek üzere projelendirildi. Enerji altyapısı, mimari ve tarımsal üretimle birlikte ele alınıyor.",
    relationship: "Güneş → enerji → yaşam ve üretim", link: "Enerji yaklaşımını keşfedin", href: "/enerji-ve-kaynaklar/", image: area("dongu"),
    x: 50, y: 12, color: "#dfc78e",
    icon: '<circle cx="16" cy="16" r="5"/><path d="M16 3v3m0 20v3M3 16h3m20 0h3M7 7l2 2m14 14 2 2M7 25l2-2M23 9l2-2"/>',
  },
  {
    id: "su", label: "Su", eyebrow: "SUYUN İZİNDE", title: "Suyun toplanması ve yeniden kullanımı.",
    text: "Yağmur suyu toplama ve uygun geri kullanım süreçleri, bahçelerin ve üretim alanlarının su ihtiyaçları gözetilerek planlandı. Su yönetimi, peyzaj ve altyapı kararlarının ortak bir parçası.",
    relationship: "Yağmur → toplama → bahçeler", link: "Doğa ve peyzajı keşfedin", href: "/doga-ve-peyzaj/", image: waterImage,
    x: 81, y: 41, color: "#a0c8c1",
    icon: '<path d="M16 3C12 9 7 14 7 20a9 9 0 0 0 18 0C25 14 20 9 16 3Z"/><path d="M12 20a4 4 0 0 0 4 4"/>',
  },
  {
    id: "toprak", label: "Toprak", eyebrow: "TOPRAĞIN BEREKETİ", title: "Mevsimsel üretim, ortak deneyim.",
    text: "Narenciye bahçeleri ve seralar, tarımsal üretimin yanı sıra uygulamalı öğrenme ortamları olarak tasarlandı. Toprağı tanıma ve mevsimleri izleme deneyimi, farklı kuşakların ortak çalışmalarını destekliyor.",
    relationship: "Toprak → üretim → paylaşım", link: "Tarım ve üretimi keşfedin", href: "/tarim-ve-uretim/", image: area("uretim"),
    x: 70, y: 81, color: "#bccba2",
    icon: '<path d="M16 28V16M16 19C6 19 5 10 5 6c8 0 11 5 11 13ZM16 14C16 7 21 4 28 4c0 8-5 12-12 12M5 28h22"/>',
  },
  {
    id: "yeniden", label: "Yeniden", eyebrow: "TOPRAĞA GERİ DÖNÜŞ", title: "Organik artıkların toprağa dönüşü.",
    text: "Mutfak ve tarımsal üretim kaynaklı uygun organik artıkların kompost yoluyla değerlendirilmesi öngörülüyor. Bu yaklaşım, organik maddelerin toprağa geri kazandırılmasını ve üretim döngüsünde yeniden kullanılmasını amaçlıyor.",
    relationship: "Organik kaynaklar → kompost → toprak", link: "Kaynak döngüsünü inceleyin", href: "/enerji-ve-kaynaklar/#bolum-3", image: harvestImage,
    x: 30, y: 81, color: "#c9ad8b",
    icon: '<path d="M25 12a10 10 0 0 0-17-3L4 13m0-7v7h7M7 20a10 10 0 0 0 17 3l4-4m0 7v-7h-7"/>',
  },
  {
    id: "yasam", label: "Yaşam", eyebrow: "HER ŞEYİN MERKEZİNDE", title: "Günlük yaşam için bütüncül tasarım.",
    text: "Bahçeye açılan konutlar ve yaya yollarıyla ulaşılan ortak alanlar, yerleşkenin günlük yaşamını şekillendiriyor. Enerji, su, üretim ve peyzaj kararları; konforlu ve kaynak kullanımına özen gösteren bir çevre hedefiyle birlikte değerlendirildi.",
    relationship: "Kaynaklar → mekânlar → birlikte yaşam", link: "Yaşam ve mimariyi keşfedin", href: "/yasam-ve-mimari/", image: area("yasam"),
    x: 19, y: 41, color: "#e3e1c8",
    icon: '<path d="m4 15 12-10 12 10M7 13v15h18V13M13 28v-9h6v9"/>',
  },
];

const paths = [
  "M300 62 C388 53 484 112 486 213",
  "M486 213 C521 305 500 403 420 421",
  "M420 421 C341 477 250 467 180 421",
  "M180 421 C96 410 68 307 114 213",
  "M114 213 C103 120 205 56 300 62",
];

let disposeCycle;

function renderCycle(host, compact) {
  const prefix = compact ? "resource-cycle" : "living-cycle";
  host.classList.add("living-cycle");
  if (compact) host.classList.add("living-cycle--compact");
  host.dataset.running = "false";
  host.setAttribute("aria-labelledby", `${prefix}-heading`);
  const first = resources[0];
  host.innerHTML = `
    <header class="living-cycle__heading">
      <div><span class="micro">ECOLIVE’IN YAŞAYAN SİSTEMİ</span>
      <h2 id="${prefix}-heading">Yaşamı tamamlayan <em>kaynak döngüsü.</em></h2></div>
      <p>Güneş, su, toprak ve organik kaynakların yerleşkedeki işlevlerini keşfedin.</p>
    </header>
    <div class="living-cycle__body">
      <div class="living-cycle__map">
        <div class="living-cycle__constellation" role="group" aria-label="Kaynak döngüsünü keşfedin">
          <svg class="living-cycle__lines" viewBox="0 0 600 520" fill="none" aria-hidden="true">
            <path class="living-cycle__contour" d="M280 25C426 0 541 109 548 259S425 506 277 489 34 392 51 234 141 49 280 25Z"/>
            <path class="living-cycle__contour" d="M285 104C379 85 439 154 439 263S366 398 284 400 155 349 160 249 210 118 285 104Z"/>
            ${paths.map((path, index) => `<path class="living-cycle__route" data-route="${index}" d="${path}"/><path class="living-cycle__current" data-current="${index}" d="${path}"/>`).join("")}
            ${paths.map((_, index) => `<g class="living-cycle__flow" data-flow="${index}"><circle r="8" opacity=".12"/><circle r="2.5"/></g>`).join("")}
          </svg>
          <div class="living-cycle__center" aria-hidden="true"><span class="living-cycle__seed"></span><span>Tek bir doğa.<br><em>Birlikte yaşam.</em></span><small>ECOLIVE</small></div>
          ${resources.map((resource, index) => `<button type="button" class="living-cycle__node" data-resource="${index}" aria-pressed="${index === 0}" aria-controls="${prefix}-detail" aria-label="${resource.label} bağlantısını keşfedin" style="--node-x:${resource.x}%;--node-y:${resource.y}%;--node-color:${resource.color}"><span class="living-cycle__node-icon"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${resource.icon}</svg></span><span class="living-cycle__node-label">${resource.label}</span></button>`).join("")}
        </div>
        <div class="living-cycle__map-note"><span aria-hidden="true">↗</span><span>Enerji, su ve üretim.<br>Bütüncül bir kaynak yaklaşımı.</span></div>
      </div>
      <div class="living-cycle__detail" id="${prefix}-detail" role="region" aria-label="Seçilen kaynağın ayrıntıları">
        <figure class="living-cycle__image"><img src="${first.image.src}" srcset="${first.image.srcset}" sizes="(max-width: 760px) 90vw, (max-width: 1100px) 43vw, 580px" width="${first.image.width}" height="${first.image.height}" alt="${first.image.alt}" loading="lazy" decoding="async"/><figcaption><span>DOĞANIN RİTMİNDE</span><span class="living-cycle__index">01 / 05</span></figcaption></figure>
        <div class="living-cycle__copy" aria-live="polite" aria-atomic="true">
          <span class="micro living-cycle__eyebrow">${first.eyebrow}</span>
          <h3>${first.title}</h3>
          <p>${first.text}</p>
          <span class="living-cycle__relationship">${first.relationship}</span>
        </div>
        <a class="living-cycle__link" href="${first.href}"><span>${first.link}</span><span aria-hidden="true">↗</span></a>
      </div>
    </div>`;

  return { host, prefix };
}

function connectCycle({ host, items = resources }) {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const buttons = [...host.querySelectorAll("[data-resource]")];
  const routes = [...host.querySelectorAll("[data-route]")];
  const currents = [...host.querySelectorAll("[data-current]")];
  const flows = [...host.querySelectorAll("[data-flow]")];
  const lengths = routes.map((path) => path.getTotalLength());
  const image = host.querySelector(".living-cycle__image img");
  const constellation = host.querySelector(".living-cycle__constellation");
  const copy = host.querySelector(".living-cycle__copy");
  const detailLink = host.querySelector(".living-cycle__link");
  const selection = host.querySelector(".living-cycle__selection");
  const listeners = [];
  let visible = false;
  let running = false;
  let frame = 0;
  let lastFrame = 0;
  let elapsed = 0;
  let selected = -1;
  let entryAnimation;
  let disposed = false;
  const listen = (target, name, callback) => {
    target.addEventListener(name, callback);
    listeners.push(() => target.removeEventListener(name, callback));
  };

  const allowed = () => !reduced.matches && document.documentElement.dataset.motion !== "paused" && !document.hidden;

  function draw() {
    flows.forEach((flow, index) => {
      const point = routes[index].getPointAtLength(((elapsed / 9200 + index * .19) % 1) * lengths[index]);
      flow.setAttribute("transform", `translate(${point.x.toFixed(2)} ${point.y.toFixed(2)})`);
    });
  }

  function tick(time) {
    if (!running || disposed) return;
    if (!lastFrame) lastFrame = time;
    const delta = time - lastFrame;
    if (delta >= 32) {
      elapsed += Math.min(delta, 80);
      lastFrame = time;
      draw();
    }
    frame = requestAnimationFrame(tick);
  }

  function syncMotion() {
    const nextRunning = visible && allowed() && !disposed;
    host.dataset.running = String(nextRunning);
    if (!nextRunning) entryAnimation?.finish();
    if (nextRunning === running) return;
    running = nextRunning;
    if (running) {
      lastFrame = 0;
      frame = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  }

  function choose(index, initial = false) {
    if (index === selected) return;
    selected = index;
    const resource = items[index];
    host.style.setProperty("--cycle-accent", resource.color);
    buttons.forEach((button, buttonIndex) => button.setAttribute("aria-pressed", String(buttonIndex === index)));
    const connected = (routeIndex) => {
      const route = routes[routeIndex];
      const from = Number(route.dataset.from ?? routeIndex);
      const to = Number(route.dataset.to ?? (routeIndex + 1) % items.length);
      return from === index || to === index;
    };
    currents.forEach((path, pathIndex) => path.dataset.active = String(connected(pathIndex)));
    flows.forEach((flow, flowIndex) => flow.dataset.active = String(connected(flowIndex)));
    if (selection) selection.textContent = `${String(index + 1).padStart(2, "0")} — ${resource.label}`;
    copy.querySelector(".living-cycle__eyebrow").textContent = resource.eyebrow;
    copy.querySelector("h3").textContent = resource.title;
    copy.querySelector("p").textContent = resource.text;
    copy.querySelector(".living-cycle__relationship").textContent = resource.relationship;
    host.querySelector(".living-cycle__index").textContent = `${String(index + 1).padStart(2, "0")} / ${String(items.length).padStart(2, "0")}`;
    image.srcset = resource.image.srcset;
    image.src = resource.image.src;
    image.alt = resource.image.alt;
    image.width = resource.image.width;
    image.height = resource.image.height;
    image.style.objectPosition = resource.image.position || "50% 50%";
    detailLink.href = resource.href;
    detailLink.firstElementChild.textContent = resource.link;
    entryAnimation?.cancel();
    if (!initial && running && copy.animate) {
      entryAnimation = copy.animate([{ opacity: .25, transform: "translateY(9px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 450, easing: "cubic-bezier(.2,.7,.25,1)" });
    }
  }

  buttons.forEach((button, index) => {
    button.disabled = false;
    listen(button, "click", () => choose(index));
    listen(button, "keydown", (event) => {
      let next;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % buttons.length;
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (index + buttons.length - 1) % buttons.length;
      if (event.key === "Home") next = 0;
      if (event.key === "End") next = buttons.length - 1;
      if (next === undefined) return;
      event.preventDefault();
      buttons[next].focus({ preventScroll: true });
      choose(next);
    });
  });

  const previous = host.querySelector("[data-cycle-prev]");
  const next = host.querySelector("[data-cycle-next]");
  if (previous) {
    previous.disabled = false;
    listen(previous, "click", () => choose((selected + items.length - 1) % items.length));
  }
  if (next) {
    next.disabled = false;
    listen(next, "click", () => choose((selected + 1) % items.length));
  }

  const observer = typeof IntersectionObserver === "function" ? new IntersectionObserver((entries) => {
    visible = entries.some((entry) => entry.isIntersecting);
    syncMotion();
  }, { threshold: 0 }) : null;
  if (observer) observer.observe(constellation);
  else visible = true;
  listen(document, "visibilitychange", syncMotion);
  listen(document, "ecolive:motionchange", syncMotion);
  listen(window, "pagehide", () => { visible = false; syncMotion(); });
  listen(window, "pageshow", () => {
    const rect = constellation.getBoundingClientRect();
    visible = rect.bottom > 0 && rect.top < window.innerHeight;
    syncMotion();
  });
  if (reduced.addEventListener) listen(reduced, "change", syncMotion);
  else {
    reduced.addListener(syncMotion);
    listeners.push(() => reduced.removeListener(syncMotion));
  }
  choose(0, true);
  draw();
  syncMotion();

  return () => {
    disposed = true;
    syncMotion();
    observer?.disconnect();
    listeners.forEach((remove) => remove());
    entryAnimation?.cancel();
  };
}

/** Hydrate page-specific chapters, the energy diagram and the home cycle. */
export function initLivingCycle() {
  if (disposeCycle) return disposeCycle;
  const instances = [...document.querySelectorAll("[data-living-experience]")].map((host) => ({
    host,
    items: JSON.parse(host.querySelector("[data-living-items]").textContent),
  }));
  const energyDiagram = document.querySelector(".resource-diagram");
  if (energyDiagram) instances.push(renderCycle(energyDiagram, true));
  const homeCycle = document.querySelector("main > .cycle-section");
  if (homeCycle && !document.getElementById("yasayan-dongu")) {
    const section = document.createElement("section");
    section.id = "yasayan-dongu";
    homeCycle.after(section);
    instances.push(renderCycle(section, false));
  }
  const cleanups = instances.map(connectCycle);
  disposeCycle = () => cleanups.forEach((cleanup) => cleanup());
  return disposeCycle;
}
