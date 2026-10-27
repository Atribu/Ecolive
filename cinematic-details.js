/* One-time editorial accents. Photos retain their original size and crop. */
let disposeCinematicDetails = null;

const FRAME_SELECTOR = [
  ".deep-feature > .deep-image",
  ".contact-guide > .deep-image",
  ".section-image",
  ".together-photo",
  ".landscape-story > .page-photo",
  ".care-story > .page-photo",
].join(", ");

function makeSignature() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "cinematic-signature");
  svg.setAttribute("viewBox", "0 0 260 32");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M8 22C61 10 143 8 252 14");
  path.setAttribute("pathLength", "1");
  path.setAttribute("fill", "none");
  svg.append(path);
  return svg;
}

export function initCinematicDetails() {
  if (disposeCinematicDetails) return disposeCinematicDetails;
  const root = document.documentElement;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const canClip = typeof CSS !== "undefined" && CSS.supports("clip-path", "inset(0 round 1px)");
  const records = [];
  const pending = new Set();
  const playing = new Set();
  const removals = [];
  let disposed = false;
  let hidden = document.hidden;
  const allowed = () => !disposed && !hidden && !reduced.matches && root.dataset.motion !== "paused";
  const listen = (target, name, handler, options) => {
    target.addEventListener(name, handler, options);
    removals.push(() => target.removeEventListener(name, handler, options));
  };
  const viewport = () => window.innerHeight || root.clientHeight;

  if (canClip) {
    document.querySelectorAll(FRAME_SELECTOR).forEach((element) => {
      // Explicit static frame hooks also guard against future interactive reuse.
      if (element.closest(".hero, .page-hero, [data-day-rhythm], [data-living-cycle], [data-living-campus], [data-immersive-journey]")) return;
      if (!element.querySelector("img") || element.querySelector("a, button, input, [tabindex]")) return;
      element.classList.add("cinematic-frame");
      records.push({ element, kind: "frame", decoration: null });
    });
  }
  document.querySelectorAll(".page-quote > p").forEach((element) => {
    const decoration = makeSignature();
    element.append(decoration);
    element.classList.add("cinematic-quotation");
    records.push({ element, kind: "quotation", decoration });
  });

  function finish(record) {
    pending.delete(record);
    playing.delete(record);
    record.element.classList.remove("cinematic-waiting", "cinematic-entering");
    observer?.unobserve(record.element);
  }

  function reveal(record, immediate = false) {
    if (immediate) {
      finish(record);
      return;
    }
    if (!pending.delete(record)) return;
    observer?.unobserve(record.element);
    record.element.classList.remove("cinematic-waiting");
    if (!allowed()) return;
    playing.add(record);
    record.element.classList.add("cinematic-entering");
  }

  function revealContext(target) {
    if (!(target instanceof Element) || target === document.body || target === root) return;
    const section = target.closest("section, article") || target;
    records.forEach((record) => {
      if (section.contains(record.element) || record.element.contains(target)) reveal(record, true);
    });
  }

  function revealHash() {
    if (!location.hash) return;
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    const target = document.getElementById(id) || document.getElementsByName(id)[0];
    if (target) revealContext(target);
  }

  function restoreVisible() {
    const height = viewport();
    [...pending, ...playing].forEach((record) => {
      if (record.element.getBoundingClientRect().top < height) reveal(record, true);
    });
    revealHash();
  }

  function syncPreference() {
    root.classList.toggle("cinematic-hidden", hidden);
    if (reduced.matches || root.dataset.motion === "paused") {
      // Once a view is exposed, restarting motion never conceals it again.
      [...pending, ...playing].forEach((record) => reveal(record, true));
    } else if (!hidden) restoreVisible();
  }

  const observer = typeof IntersectionObserver === "function" ? new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting || hidden) return;
      const record = records.find((item) => item.element === entry.target);
      if (record) reveal(record, entry.boundingClientRect.bottom <= 0);
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0 }) : null;

  // No observer means no masking. Initial viewport images are always fully visible.
  if (observer && allowed()) {
    const height = viewport();
    records.forEach((record) => {
      const rect = record.element.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0 || rect.top < height) return;
      pending.add(record);
      record.element.classList.add("cinematic-waiting");
      observer.observe(record.element);
    });
  }
  revealHash();

  listen(document, "animationend", (event) => {
    if (!["cinematic-frame-open", "cinematic-signature-draw"].includes(event.animationName)) return;
    const record = records.find((item) => item.element === event.target || item.decoration?.contains(event.target));
    if (record) finish(record);
  });
  listen(document, "focusin", (event) => revealContext(event.target));
  listen(window, "hashchange", revealHash);
  // Resolve same-page links before smooth scrolling starts, including an unchanged hash.
  listen(document, "click", (event) => {
    const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
    if (!anchor) return;
    let url;
    try { url = new URL(anchor.href, location.href); } catch { return; }
    if (url.origin !== location.origin || url.pathname !== location.pathname || url.search !== location.search || !url.hash) return;
    let id;
    try { id = decodeURIComponent(url.hash.slice(1)); } catch { return; }
    const target = document.getElementById(id) || document.getElementsByName(id)[0];
    if (target) revealContext(target);
  });
  listen(document, "ecolive:motionchange", syncPreference);
  listen(document, "visibilitychange", () => { hidden = document.hidden; syncPreference(); });
  listen(window, "pagehide", () => { hidden = true; syncPreference(); });
  listen(window, "pageshow", () => { hidden = document.hidden; syncPreference(); });
  listen(window, "beforeprint", () => [...pending, ...playing].forEach((record) => reveal(record, true)));
  if (reduced.addEventListener) listen(reduced, "change", syncPreference);
  else {
    reduced.addListener(syncPreference);
    removals.push(() => reduced.removeListener(syncPreference));
  }
  root.classList.toggle("cinematic-hidden", hidden);

  disposeCinematicDetails = () => {
    if (disposed) return;
    disposed = true;
    observer?.disconnect();
    removals.forEach((remove) => remove());
    records.forEach(({ element, decoration }) => {
      element.classList.remove("cinematic-frame", "cinematic-quotation", "cinematic-waiting", "cinematic-entering");
      decoration?.remove();
    });
    root.classList.remove("cinematic-hidden");
    pending.clear();
    playing.clear();
    disposeCinematicDetails = null;
  };
  return disposeCinematicDetails;
}
