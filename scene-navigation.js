import { sceneImages } from "./scene-images.js";

const normalizePath = (path) => path.replace(/\/index\.html$/, "/").replace(/\/+$/, "") || "/";

const sceneCopy = {
  "/": ["YAŞAMIN İÇİNE", "Doğaya yakın.", "Hayatın içinde."],
  "/proje-hakkinda": ["PROJEYE GENEL BAKIŞ", "Bütüncül", "bir yaşam yaklaşımı."],
  "/yasam-ve-mimari": ["MEKÂN VE YAŞAM", "Kişisel alan.", "Paylaşılan yaşam."],
  "/saglik-ve-iyi-yasam": ["İYİ YAŞAM", "İnsana özen.", "Günlük yaşama destek."],
  "/egitim-ve-kusaklar": ["MERAK VE DENEYİM", "Birbirinden öğrenmek.", "Birlikte büyümek."],
  "/tarim-ve-uretim": ["TARIM VE ÜRETİM", "Toprağa emek.", "Yaşama katkı."],
  "/doga-ve-peyzaj": ["DOĞAYLA BÜTÜNLEŞEN PEYZAJ", "Bahçeler arasında", "bir yaşam."],
  "/enerji-ve-kaynaklar": ["KAYNAKLARA BÜTÜNCÜL BAKIŞ", "Enerji, su ve toprak.", "Ortak bir döngü."],
  "/iletisim": ["İLETİŞİM", "ECOLIVE’ı", "yakından tanıyın."],
};

/** Enhance the existing native dialog. The app keeps its existing open/focus handlers. */
export function initSceneNavigation() {
  const dialog = document.querySelector("#navigation");
  if (!dialog || dialog.dataset.sceneNavigation === "ready") return null;
  const pane = dialog.querySelector(".menu-image");
  const initialImage = pane?.querySelector("img");
  const links = [...dialog.querySelectorAll(".main-nav a")];
  if (!pane || !initialImage || !links.length) return null;

  dialog.dataset.sceneNavigation = "ready";
  dialog.classList.add("scene-navigation");
  const root = document.documentElement;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const paused = () => reduced.matches || root.dataset.motion === "paused";
  const original = {
    src: initialImage.getAttribute("src"),
    srcset: initialImage.getAttribute("srcset") || "",
    alt: initialImage.alt,
    width: initialImage.width || 2200,
    height: initialImage.height || 1584,
  };
  const imagesByPath = new Map(sceneImages.map((area) => [normalizePath(new URL(area.href, location.href).pathname), area]));
  // Generated scene images match each page opening. Existing markup remains a fallback.
  if (!imagesByPath.has("/")) imagesByPath.set("/", original);
  if (!imagesByPath.has("/proje-hakkinda")) imagesByPath.set("/proje-hakkinda", original);
  if (!imagesByPath.has("/iletisim")) imagesByPath.set("/iletisim", {
    src: "/assets/responsive/shared-lounge-960.c86cbc1d.webp",
    srcset: "/assets/responsive/shared-lounge-640.bc60912e.webp 640w, /assets/responsive/shared-lounge-960.c86cbc1d.webp 960w, /assets/responsive/shared-lounge-1440.c9bfc57e.webp 1440w",
    alt: "Bahçeye açılan ortak sosyal salonun proje görselleştirmesi",
    width: 2000,
    height: 1493,
  });

  const secondImage = initialImage.cloneNode(false);
  secondImage.removeAttribute("src");
  secondImage.removeAttribute("srcset");
  secondImage.removeAttribute("data-original-src");
  pane.insertBefore(secondImage, initialImage.nextSibling);
  const slots = [initialImage, secondImage];
  slots.forEach((image, index) => {
    image.classList.add("scene-navigation-image");
    image.dataset.active = String(index === 0);
    image.setAttribute("aria-hidden", "true");
    image.alt = "";
    image.decoding = "async";
    image.loading = "lazy";
    image.sizes = "(max-width: 760px) 100vw, 50vw";
  });
  pane.setAttribute("aria-hidden", "true");
  const caption = pane.querySelector("div") || pane.appendChild(document.createElement("div"));
  caption.className = "scene-navigation-caption";
  const eyebrow = document.createElement("span");
  eyebrow.className = "micro";
  const title = document.createElement("p");
  const titleLine = document.createElement("span");
  const titleEmphasis = document.createElement("em");
  title.append(titleLine, titleEmphasis);
  const sceneIndex = document.createElement("span");
  sceneIndex.className = "scene-navigation-count";
  caption.replaceChildren(eyebrow, title, sceneIndex);
  const imageTopline = document.createElement("span");
  imageTopline.className = "scene-navigation-topline";
  imageTopline.textContent = "ECOLIVE — BİR YAŞAM YERLEŞKESİ";
  pane.append(imageTopline);
  const nav = dialog.querySelector(".main-nav");
  const navHeading = document.createElement("span");
  navHeading.className = "scene-navigation-heading micro";
  navHeading.textContent = "YAŞAMIN İÇİNE";
  nav.before(navHeading);

  let activeSlot = 0;
  let sequence = 0;
  let selectedPath = "/";
  let displayedPath = "";
  let closeTimer;
  let openFrame;
  const imageLoads = new Map();
  const currentPath = normalizePath(location.pathname);
  const currentLink = links.find((link) => normalizePath(new URL(link.href).pathname) === currentPath) || links[0];

  function showCaption(path, index) {
    const copy = sceneCopy[path] || sceneCopy["/"];
    eyebrow.textContent = copy[0];
    titleLine.textContent = copy[1];
    titleEmphasis.textContent = copy[2];
    sceneIndex.textContent = `${String(index + 1).padStart(2, "0")} / ${String(links.length).padStart(2, "0")}`;
  }

  function preload(area) {
    if (imageLoads.has(area.src)) return imageLoads.get(area.src);
    const promise = new Promise((resolve) => {
      const image = new Image();
      image.decoding = "async";
      image.sizes = "(max-width: 760px) 100vw, 50vw";
      image.onload = () => {
        if (typeof image.decode === "function") image.decode().catch(() => {}).then(() => resolve(true));
        else resolve(true);
      };
      image.onerror = () => resolve(false);
      if (area.srcset) image.srcset = area.srcset;
      image.src = area.src;
    });
    imageLoads.set(area.src, promise);
    return promise;
  }

  async function choose(link, immediate = false) {
    const path = normalizePath(new URL(link.href).pathname);
    const area = imagesByPath.get(path) || original;
    const request = ++sequence;
    selectedPath = path;
    links.forEach((item) => item.classList.toggle("is-previewed", item === link));
    if (!await preload(area) || request !== sequence || !dialog.open) return;
    const nextSlot = slots[activeSlot].getAttribute("src") === area.src ? activeSlot : 1 - activeSlot;
    const next = slots[nextSlot];
    next.loading = "eager";
    next.srcset = area.srcset || "";
    next.src = area.src;
    next.width = area.width;
    next.height = area.height;
    if (immediate || paused()) dialog.classList.add("scene-navigation-instant");
    slots.forEach((image, index) => { image.dataset.active = String(index === nextSlot); });
    activeSlot = nextSlot;
    displayedPath = path;
    showCaption(path, links.indexOf(link));
    if (immediate) requestAnimationFrame(() => dialog.classList.remove("scene-navigation-instant"));
  }

  function resetTransition() {
    root.classList.remove("scene-navigating");
    slots.forEach((image) => { image.style.viewTransitionName = ""; });
  }

  links.forEach((link, index) => {
    link.style.setProperty("--scene-link-order", index);
    link.addEventListener("pointerenter", (event) => {
      if (event.pointerType !== "touch") choose(link);
    });
    link.addEventListener("focus", () => choose(link));
    link.addEventListener("click", (event) => {
      const url = new URL(link.href);
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || url.origin !== location.origin || normalizePath(url.pathname) === currentPath || paused()) return;
      // Browser-native page transitions keep navigation immediate; unsupported browsers navigate normally.
      if (selectedPath === displayedPath && displayedPath === normalizePath(url.pathname) && matchMedia("(min-width: 761px)").matches) {
        root.classList.add("scene-navigating");
        slots[activeSlot].style.viewTransitionName = "ecolive-destination";
      }
    }, true);
  });

  function syncMotion() {
    dialog.classList.toggle("scene-navigation-instant", paused());
    if (paused()) {
      clearTimeout(closeTimer);
      if (dialog.dataset.sceneState === "closing") dialog.close();
    }
  }

  function syncOpen() {
    cancelAnimationFrame(openFrame);
    if (dialog.open) {
      clearTimeout(closeTimer);
      resetTransition();
      document.body.classList.add("scene-menu-open");
      dialog.dataset.sceneState = "opening";
      choose(currentLink, true);
      openFrame = requestAnimationFrame(() => {
        openFrame = requestAnimationFrame(() => { dialog.dataset.sceneState = "open"; });
      });
    } else {
      ++sequence;
      document.body.classList.remove("scene-menu-open");
      dialog.dataset.sceneState = "closed";
      if (!root.classList.contains("scene-navigating")) resetTransition();
    }
  }

  function close() {
    if (!dialog.open || dialog.dataset.sceneState === "closing") return;
    ++sequence;
    cancelAnimationFrame(openFrame);
    if (paused()) { dialog.close(); return; }
    dialog.dataset.sceneState = "closing";
    document.body.classList.remove("scene-menu-open");
    closeTimer = setTimeout(() => { if (dialog.open) dialog.close(); }, 420);
  }

  dialog.addEventListener("cancel", (event) => { event.preventDefault(); close(); });
  dialog.addEventListener("close", () => {
    clearTimeout(closeTimer);
    document.body.classList.remove("scene-menu-open");
  });
  new MutationObserver(syncOpen).observe(dialog, { attributes: true, attributeFilter: ["open"] });
  document.addEventListener("ecolive:motionchange", syncMotion);
  reduced.addEventListener("change", syncMotion);
  window.addEventListener("pageshow", (event) => {
    resetTransition();
    if (event.persisted && dialog.open) dialog.close();
  });
  showCaption(currentPath, links.indexOf(currentLink));
  syncMotion();
  if (dialog.open) syncOpen();
  return { close };
}
