let disposeDayRhythm = null;

function connectDayRhythm(host) {
  const data = host.querySelector("[data-day-items]");
  const items = data ? JSON.parse(data.textContent) : [];
  const buttons = [...host.querySelectorAll("[data-day-choice]")];
  const photos = [...host.querySelectorAll("[data-day-image]")];
  const scene = host.querySelector("[data-day-scene]");
  const detail = host.querySelector("[data-day-detail]");
  const copy = host.querySelector(".day-rhythm__copy") || detail;
  const range = host.querySelector("[data-day-range]");
  const previous = host.querySelector("[data-day-prev]");
  const next = host.querySelector("[data-day-next]");
  const status = host.querySelector("[data-day-status]");
  const link = host.querySelector("[data-day-link]");
  const fields = ["eyebrow", "title", "text", "relationship", "count", "label"]
    .reduce((result, key) => ({ ...result, [key]: host.querySelector(`[data-day-${key}]`) }), {});
  if (!items.length || !buttons.length || photos.length !== 2 || !scene) return () => {};

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const listeners = [];
  let selected = Math.max(0, buttons.findIndex((button) => button.getAttribute("aria-pressed") === "true"));
  let displayed = selected;
  let activePhoto = Math.max(0, photos.findIndex((photo) => photo.classList.contains("is-current")));
  let visible = false;
  let disposed = false;
  let request = 0;
  let pending = null;
  let copyAnimation = null;

  const listen = (target, name, callback) => {
    if (!target) return;
    target.addEventListener(name, callback);
    listeners.push(() => target.removeEventListener(name, callback));
  };
  const motionAllowed = () => !disposed && visible && !document.hidden && !reduced.matches && document.documentElement.dataset.motion !== "paused";
  const setStatus = (message = "") => {
    if (status) status.textContent = message;
  };
  const setBusy = (busy) => scene.setAttribute("aria-busy", String(busy));

  function syncMotion() {
    const running = motionAllowed();
    host.classList.toggle("day-visible", running);
    if (!running) copyAnimation?.finish();
  }

  function cancelPending() {
    request += 1;
    if (!pending) return;
    pending.onload = null;
    pending.onerror = null;
    pending.removeAttribute("srcset");
    pending.removeAttribute("src");
    pending = null;
  }

  function assignImage(image, source) {
    image.sizes = source.sizes || "100vw";
    image.srcset = source.srcset || "";
    image.src = source.src;
    image.alt = source.alt || "";
    image.width = source.width;
    image.height = source.height;
    image.style.objectPosition = source.position || "50% 50%";
  }

  function settlePhotoTransitions() {
    for (const photo of photos) {
      for (const animation of photo.getAnimations?.() || []) {
        const end = animation.effect?.getComputedTiming?.().endTime;
        if (animation.transitionProperty === "opacity" && Number.isFinite(end)) {
          animation.finish();
        }
      }
    }
  }

  function loadPhoto(index) {
    cancelPending();
    setStatus();
    if (index === displayed) {
      setBusy(false);
      return;
    }

    const token = request;
    const image = new Image();
    const source = items[index].image;
    pending = image;
    setBusy(true);
    image.decoding = "async";
    const isCurrentRequest = () => !disposed && token === request && selected === index;
    const fail = () => {
      if (!isCurrentRequest()) return;
      image.onload = null;
      image.onerror = null;
      pending = null;
      setBusy(false);
      setStatus("Bu anın görseli yüklenemedi. Önceki görsel gösteriliyor.");
    };

    image.onload = async () => {
      image.onload = null;
      try {
        if (image.decode) await image.decode();
        if (!isCurrentRequest()) return;

        // Decode the hidden, mounted image too. The visible photo remains untouched
        // until the browser can paint its replacement, including on a cold cache.
        const slot = 1 - activePhoto;
        const target = photos[slot];
        // A quick next choice may reuse a slot that is still fading out. Settle
        // both sides of that crossfade before changing either image's source.
        settlePhotoTransitions();
        assignImage(target, source);
        if (target.decode) await target.decode();
        if (!isCurrentRequest()) return;

        photos[activePhoto].classList.remove("is-current");
        photos[activePhoto].setAttribute("aria-hidden", "true");
        target.classList.add("is-current");
        target.removeAttribute("aria-hidden");
        activePhoto = slot;
        displayed = index;
        image.onerror = null;
        pending = null;
        setBusy(false);
        setStatus();
      } catch {
        fail();
      }
    };
    image.onerror = fail;
    assignImage(image, source);
  }

  function updateSelection(index, initial = false) {
    if (!Number.isInteger(index) || index < 0 || index >= items.length || disposed) return;
    // A failed selection remains retryable; an already loading one is not restarted.
    if (!initial && selected === index && (pending || displayed === index)) return;
    selected = index;
    const item = items[index];
    buttons.forEach((button, buttonIndex) => {
      button.setAttribute("aria-pressed", String(buttonIndex === index));
      button.classList.toggle("is-active", buttonIndex === index);
    });
    if (range) {
      range.value = String(index);
      range.setAttribute("aria-valuetext", item.label);
    }
    host.dataset.day = item.theme;
    host.style.setProperty("--day-sun-x", `${item.sun.x}%`);
    host.style.setProperty("--day-sun-y", `${item.sun.y}%`);
    for (const key of ["eyebrow", "title", "text", "relationship"]) {
      if (fields[key]) fields[key].textContent = item[key];
    }
    if (fields.count) fields.count.textContent = `${String(index + 1).padStart(2, "0")} / ${String(items.length).padStart(2, "0")}`;
    if (fields.label) fields.label.textContent = item.label;
    if (link) {
      link.href = item.href;
      if (link.firstElementChild) link.firstElementChild.textContent = item.link;
    }
    copyAnimation?.cancel();
    if (!initial && motionAllowed() && copy?.animate) {
      copyAnimation = copy.animate(
        [{ opacity: .35, transform: "translateY(8px)" }, { opacity: 1, transform: "translateY(0)" }],
        { duration: 450, easing: "cubic-bezier(.2,.7,.25,1)" },
      );
    }
    if (!initial) loadPhoto(index);
  }

  buttons.forEach((button, index) => {
    button.disabled = false;
    listen(button, "click", () => updateSelection(index));
    listen(button, "keydown", (event) => {
      let target;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") target = (index + 1) % items.length;
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") target = (index + items.length - 1) % items.length;
      if (event.key === "Home") target = 0;
      if (event.key === "End") target = items.length - 1;
      if (target === undefined) return;
      event.preventDefault();
      buttons[target].focus({ preventScroll: true });
      updateSelection(target);
    });
  });
  for (const control of [range, previous, next]) {
    if (control) control.disabled = false;
  }
  listen(range, "input", () => updateSelection(Number(range.value)));
  listen(previous, "click", () => updateSelection((selected + items.length - 1) % items.length));
  listen(next, "click", () => updateSelection((selected + 1) % items.length));
  listen(document, "visibilitychange", syncMotion);
  listen(document, "ecolive:motionchange", syncMotion);
  listen(window, "pagehide", () => { visible = false; syncMotion(); });
  listen(window, "pageshow", () => {
    const rect = host.getBoundingClientRect();
    visible = rect.bottom > 0 && rect.top < window.innerHeight;
    syncMotion();
  });
  if (reduced.addEventListener) listen(reduced, "change", syncMotion);
  else {
    reduced.addListener(syncMotion);
    listeners.push(() => reduced.removeListener(syncMotion));
  }
  const observer = typeof IntersectionObserver === "function" ? new IntersectionObserver((entries) => {
    visible = entries.some((entry) => entry.isIntersecting);
    syncMotion();
  }, { threshold: 0 }) : null;
  if (observer) observer.observe(host);
  else visible = true;
  photos.forEach((photo, index) => {
    if (index !== activePhoto) photo.setAttribute("aria-hidden", "true");
  });
  setBusy(false);
  updateSelection(selected, true);
  syncMotion();

  return () => {
    disposed = true;
    cancelPending();
    copyAnimation?.cancel();
    observer?.disconnect();
    listeners.forEach((remove) => remove());
    host.classList.remove("day-visible");
    setBusy(false);
  };
}

/** Add deliberate, user-controlled changes of light and everyday campus scenes. */
export function initDayRhythm() {
  if (disposeDayRhythm) return disposeDayRhythm;
  const cleanups = [...document.querySelectorAll("[data-day-rhythm]")].map(connectDayRhythm);
  disposeDayRhythm = () => {
    cleanups.forEach((cleanup) => cleanup());
    disposeDayRhythm = null;
  };
  return disposeDayRhythm;
}
