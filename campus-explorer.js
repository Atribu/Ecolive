const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function initCampusExplorer() {
  document.querySelectorAll("[data-campus-explorer]").forEach((section) => {
    if (section.dataset.campusReady) return;
    const source = section.querySelector("[data-campus-items]");
    if (!source) return;
    const { items, overview } = JSON.parse(source.textContent);
    const plane = section.querySelector("[data-campus-plane]");
    const photo = section.querySelector("[data-campus-photo]");
    const copy = section.querySelector("[data-campus-copy]");
    const title = section.querySelector("[data-campus-title]");
    const description = section.querySelector("[data-campus-description]");
    const eyebrow = section.querySelector("[data-campus-eyebrow]");
    const link = section.querySelector("[data-campus-link]");
    const photoLabel = section.querySelector("[data-campus-photo-label]");
    const mapLabel = section.querySelector("[data-campus-map-label]");
    const count = section.querySelector("[data-campus-count]");
    const status = section.querySelector("[data-campus-status]");
    const buttons = [...section.querySelectorAll("[data-campus-choice]")];
    const reset = section.querySelector("[data-campus-reset]");
    if (!plane || !photo || !copy || !reset) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const compact = window.matchMedia("(max-width: 600px)");
    const canAnimate = () => !reduced.matches && document.documentElement.dataset.motion !== "paused";
    const animations = new Set();
    const loaded = new Map();
    let selected = -1;
    let requested = -1;
    let request = 0;

    function cancelAnimations() {
      animations.forEach((animation) => animation.cancel());
      animations.clear();
    }

    function animate(node, keyframes, options) {
      if (!canAnimate() || !node.animate) return;
      const animation = node.animate(keyframes, options);
      animations.add(animation);
      animation.finished.catch(() => {}).finally(() => animations.delete(animation));
    }

    function moveCamera(index, instant = false) {
      const scale = index >= 0 && canAnimate() ? (compact.matches ? 1.35 : 1.65) : 1;
      const maximumShift = ((scale - 1) / 2) * 100;
      const x = index < 0 ? 0 : clamp((50 - items[index].x) * scale, -maximumShift, maximumShift);
      const y = index < 0 ? 0 : clamp((50 - items[index].y) * scale, -maximumShift, maximumShift);
      if (instant) plane.style.transition = "none";
      plane.style.setProperty("--campus-scale", scale);
      plane.style.setProperty("--campus-pan-x", `${x}%`);
      plane.style.setProperty("--campus-pan-y", `${y}%`);
      if (instant) {
        // Commit the neutral camera before restoring future user-triggered transitions.
        plane.getBoundingClientRect();
        plane.style.removeProperty("transition");
      }
    }

    function loadPhoto(item) {
      const key = item.image.src;
      if (!loaded.has(key)) {
        const promise = new Promise((resolve, reject) => {
          const image = new Image();
          image.decoding = "async";
          image.onload = () => (image.decode ? image.decode().catch(() => {}) : Promise.resolve()).then(resolve);
          image.onerror = () => reject(new Error("Campus photo could not be loaded"));
          image.sizes = item.image.sizes;
          image.srcset = item.image.srcset;
          image.src = item.image.src;
        });
        loaded.set(key, promise);
        promise.catch(() => loaded.delete(key));
      }
      return loaded.get(key);
    }

    function commit(index, announce) {
      const item = index < 0 ? overview : items[index];
      selected = index;
      section.dataset.campusSelected = index < 0 ? "overview" : item.id;
      section.removeAttribute("aria-busy");
      buttons.forEach((button) => button.setAttribute("aria-pressed", String(Number(button.dataset.campusChoice) === index)));
      photo.sizes = item.image.sizes;
      photo.srcset = item.image.srcset;
      photo.src = item.image.src;
      photo.alt = item.image.alt;
      photo.width = item.image.width;
      photo.height = item.image.height;
      title.textContent = item.title;
      eyebrow.textContent = item.eyebrow;
      description.textContent = item.description;
      link.href = item.href;
      link.firstElementChild.textContent = item.link;
      photoLabel.textContent = item.label;
      mapLabel.textContent = index < 0 ? "Bir alan seçerek yakından keşfedin" : item.label;
      count.textContent = index < 0 ? "ECOLIVE" : `${String(index + 1).padStart(2, "0")} / ${String(items.length).padStart(2, "0")}`;
      reset.setAttribute("aria-pressed", String(index < 0));
      moveCamera(index, !announce);
      cancelAnimations();
      if (announce) {
        animate(photo, [{ opacity: 0.35, transform: "scale(1.035)" }, { opacity: 1, transform: "scale(1)" }], { duration: 650, easing: "cubic-bezier(.2,.7,.2,1)" });
        animate(copy, [{ opacity: 0, transform: "translateY(12px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 500, easing: "cubic-bezier(.2,.7,.2,1)" });
        status.textContent = index < 0 ? "Kampüsün tamamı gösteriliyor." : `${item.label} seçildi. ${item.title}`;
      }
    }

    async function select(index, announce = true) {
      if (index < -1 || index >= items.length || (selected === index && requested === index)) return;
      requested = index;
      const token = ++request;
      const item = index < 0 ? overview : items[index];
      section.setAttribute("aria-busy", "true");
      try {
        await loadPhoto(item);
        if (token !== request) return;
        commit(index, announce);
      } catch {
        if (token !== request) return;
        requested = selected;
        section.removeAttribute("aria-busy");
        status.textContent = "Görsel şu anda yüklenemedi. Alanı yeniden seçebilirsiniz.";
      }
    }

    buttons.forEach((button) => {
      const index = Number(button.dataset.campusChoice);
      button.disabled = false;
      button.addEventListener("click", () => select(index));
      button.addEventListener("keydown", (event) => {
        let next;
        if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % items.length;
        if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (index + items.length - 1) % items.length;
        if (event.key === "Home") next = 0;
        if (event.key === "End") next = items.length - 1;
        if (next === undefined) return;
        event.preventDefault();
        select(next);
        const collection = button.classList.contains("campus-explorer-pin") ? ".campus-explorer-pin" : ".campus-explorer-option";
        section.querySelector(`${collection}[data-campus-choice="${next}"]`)?.focus({ preventScroll: true });
      });
    });
    reset.disabled = false;
    reset.addEventListener("click", () => select(-1));
    const syncMotion = () => {
      cancelAnimations();
      moveCamera(selected, true);
    };
    document.addEventListener("ecolive:motionchange", syncMotion);
    reduced.addEventListener("change", syncMotion);
    compact.addEventListener("change", syncMotion);
    section.dataset.campusReady = "true";
    commit(-1, false);
  });
}
