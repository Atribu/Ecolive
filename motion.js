/* Progressive enhancement: content is visible unless this module opts it in. */
let disposeMotion = null;

export function initMotion() {
  if (disposeMotion) return disposeMotion;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const compact = window.matchMedia("(max-width: 760px)");
  const supportsIndividualTransforms =
    typeof CSS !== "undefined" &&
    CSS.supports("translate", "0 1px") &&
    CSS.supports("scale", "1.01");
  const interactive =
    "a, button, input, select, textarea, summary, [tabindex], [contenteditable], [role='button'], [role='link']";
  const excluded =
    ".hero, .page-hero, nav, dialog, details, [hidden], [aria-live], [role='status']";
  const candidates = [
    ...document.querySelectorAll(
      "main h1, main h2, main h3, main p, main .micro, main li, main .chapter-number, main .timeline-mark, main figcaption, main .place-label, main .image-caption, main .map-caption, main .project-status strong, main .project-status div > span, main .resource-ring > span, main .resource-ring > em, .site-footer h2, .site-footer p, .site-footer .micro, .site-footer .footer-stage",
    ),
  ].filter(
    (element) =>
      element.textContent.trim() &&
      !element.closest(excluded) &&
      !element.matches(interactive) &&
      !element.querySelector(interactive),
  );
  // A card's text can enter independently; its link or button stays visible and usable.
  // Keep the smallest meaningful text units, not whole lists or interactive wrappers.
  const revealElements = candidates.filter(
    (element) =>
      !candidates.some((other) => other !== element && element.contains(other)),
  );
  const pending = new Set();
  const heroes = supportsIndividualTransforms
    ? [
        ...document.querySelectorAll(
          ".hero:not([data-scroll-hero]) .hero-media img, .hero-photo img",
        ),
      ]
    : [];
  const parallax = supportsIndividualTransforms
    ? [
        ...document.querySelectorAll(
          ".deep-image > img, .section-image > img, .focus-image > img, .together-photo > img, .place-card > img, .cycle-image > img, .page-photo:not(.hero-photo) > img",
        ),
      ].map((image) => ({
        image,
        frame: image.parentElement,
      }))
    : [];
  const waves = [...document.querySelectorAll("[data-motion-wave]")].map(
    (element) => ({
      element,
      frame: element,
    }),
  );
  let raf = 0;
  let pageHidden = document.hidden;
  let disposed = false;
  const cleanupListeners = [];
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const listen = (target, type, handler, options) => {
    target.addEventListener(type, handler, options);
    cleanupListeners.push(() =>
      target.removeEventListener(type, handler, options),
    );
  };
  const listenMedia = (query, handler) => {
    if (query.addEventListener) listen(query, "change", handler);
    else {
      query.addListener(handler);
      cleanupListeners.push(() => query.removeListener(handler));
    }
  };

  function reveal(element, immediate = false, order = 0) {
    if (!pending.delete(element)) return;
    if (immediate) element.classList.add("motion-immediate");
    element.style.setProperty(
      "--motion-delay",
      `${immediate ? 0 : 250 + Math.min(order, 3) * 150}ms`,
    );
    element.classList.remove("motion-waiting");
  }

  function showContext(target) {
    if (!(target instanceof Element)) return;
    if (target === document.body || target === document.documentElement) return;
    const section = target.closest("section, article, footer") || target;
    for (const element of [...pending]) {
      if (section.contains(element) || element.contains(target))
        reveal(element, true);
    }
  }

  function showHash() {
    if (!location.hash) return;
    let id;
    try {
      id = decodeURIComponent(location.hash.slice(1));
    } catch {
      return;
    }
    const target =
      document.getElementById(id) || document.getElementsByName(id)[0];
    if (target) showContext(target);
  }

  function neutralize() {
    for (const element of [...pending]) reveal(element, true);
    for (const { image } of parallax) {
      image.style.setProperty("--motion-parallax-y", "0px");
      image.style.setProperty("--motion-parallax-scale", "1");
    }
    for (const { element } of waves) {
      element.style.setProperty("--wave-shift", "0px");
      element.style.setProperty("--wave-scale", "1");
    }
  }

  function startHeroes() {
    if (reduced.matches) return;
    for (const image of heroes) image.classList.add("motion-hero-zoom");
  }

  function update() {
    raf = 0;
    if (disposed || pageHidden || reduced.matches) return;
    const viewport =
      window.innerHeight || document.documentElement.clientHeight;
    const amplitude = compact.matches ? 4 : 12;
    // Collect geometry before any style writes, including image overscan sizing.
    const visibleText = [...pending]
      .map((element) => ({ element, rect: element.getBoundingClientRect() }))
      .filter(
        ({ rect }) =>
          rect.width > 0 && rect.height > 0 && rect.top < viewport * 0.86,
      );
    const imagePositions = parallax.map((item) => ({
      ...item,
      rect: item.frame.getBoundingClientRect(),
    }));
    const wavePositions = waves.map((item) => ({
      ...item,
      rect: item.frame.getBoundingClientRect(),
    }));
    const progress = (rect) =>
      clamp(
        (viewport - 2 * rect.top - rect.height) / (viewport + rect.height),
        -1,
        1,
      );

    visibleText.forEach(({ element, rect }, index) =>
      reveal(element, rect.bottom <= 0, index),
    );
    for (const { image, rect } of imagePositions) {
      if (rect.height <= 0 || rect.bottom < -30 || rect.top > viewport + 30)
        continue;
      image.style.setProperty(
        "--motion-parallax-y",
        `${(-progress(rect) * amplitude).toFixed(3)}px`,
      );
      // The extra pixel covers rounding, without changing the image's layout or object-position.
      image.style.setProperty(
        "--motion-parallax-scale",
        (1 + (2 * (amplitude + 1)) / rect.height).toFixed(6),
      );
    }
    for (const { element, rect } of wavePositions) {
      if (rect.height <= 0 || rect.bottom < -30 || rect.top > viewport + 30)
        continue;
      const position = progress(rect);
      element.style.setProperty(
        "--wave-shift",
        `${(position * (compact.matches ? 1.5 : 3)).toFixed(3)}px`,
      );
      element.style.setProperty(
        "--wave-scale",
        (1 + position * 0.06).toFixed(5),
      );
    }
    // No self-scheduling: another frame needs a new scroll, resize, or lifecycle event.
  }

  function schedule() {
    if (!raf && !disposed && !pageHidden && !reduced.matches)
      raf = requestAnimationFrame(update);
  }

  function cancelFrame() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  function setVisibility(hidden) {
    pageHidden = hidden;
    for (const image of heroes)
      image.classList.toggle("motion-hero-paused", hidden);
    if (hidden) cancelFrame();
    else {
      // A restored history position or focused anchor must never await an entrance animation.
      const viewport =
        window.innerHeight || document.documentElement.clientHeight;
      const restored = [...pending].filter(
        (element) => element.getBoundingClientRect().top < viewport,
      );
      restored.forEach((element) => reveal(element, true));
      showHash();
      schedule();
    }
  }

  function preferenceChanged() {
    cancelFrame();
    if (reduced.matches) {
      for (const image of heroes) {
        if (image.classList.contains("motion-hero-zoom"))
          image.classList.add("motion-hero-still");
      }
      neutralize();
    } else {
      // Content already read is never hidden again when the preference changes.
      startHeroes();
      schedule();
    }
  }

  // Only below-the-fold, noninteractive text opts in. Initial viewport content stays untouched.
  if (!reduced.matches) {
    const viewport =
      window.innerHeight || document.documentElement.clientHeight;
    const waiting = revealElements.filter((element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && rect.top >= viewport;
    });
    waiting.forEach((element) => {
      pending.add(element);
      element.classList.add("motion-reveal", "motion-waiting");
    });
  }
  parallax.forEach(({ image }) => image.classList.add("motion-parallax"));
  for (const image of heroes) {
    listen(image, "animationend", (event) => {
      if (event.animationName === "ecolive-motion-hero")
        image.classList.add("motion-hero-still");
    });
  }
  startHeroes();
  showHash();
  showContext(document.activeElement);
  if (reduced.matches) neutralize();
  else if (!pageHidden) update();

  listen(window, "scroll", schedule, { passive: true });
  listen(window, "resize", schedule, { passive: true });
  listen(window, "hashchange", () => {
    showHash();
    schedule();
  });
  listen(document, "focusin", (event) => showContext(event.target), true);
  listen(document, "visibilitychange", () => setVisibility(document.hidden));
  listen(window, "pagehide", () => setVisibility(true));
  listen(window, "pageshow", () => setVisibility(document.hidden));
  // Lazy image loads and accordion changes can shift later sections without a scroll.
  listen(document, "load", schedule, true);
  listen(document, "toggle", schedule, true);
  listenMedia(reduced, preferenceChanged);
  listenMedia(compact, schedule);
  const resizeObserver =
    typeof ResizeObserver !== "undefined" ? new ResizeObserver(schedule) : null;
  if (resizeObserver) {
    for (const { frame } of parallax) resizeObserver.observe(frame);
    for (const { frame } of waves) resizeObserver.observe(frame);
  }
  if (pageHidden) setVisibility(true);

  disposeMotion = () => {
    disposed = true;
    cancelFrame();
    neutralize();
    resizeObserver?.disconnect();
    cleanupListeners.forEach((remove) => remove());
    revealElements.forEach((element) => {
      element.classList.remove(
        "motion-reveal",
        "motion-waiting",
        "motion-immediate",
      );
      element.style.removeProperty("--motion-delay");
    });
    heroes.forEach((image) =>
      image.classList.remove(
        "motion-hero-zoom",
        "motion-hero-still",
        "motion-hero-paused",
      ),
    );
    parallax.forEach(({ image }) => {
      image.classList.remove("motion-parallax");
      image.style.removeProperty("--motion-parallax-y");
      image.style.removeProperty("--motion-parallax-scale");
    });
    waves.forEach(({ element }) => {
      element.style.removeProperty("--wave-shift");
      element.style.removeProperty("--wave-scale");
    });
    disposeMotion = null;
  };
  return disposeMotion;
}
