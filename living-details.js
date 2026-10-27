/* Decorative reading traces. Existing content, link targets and image frames stay intact. */
let disposeDetails = null;

const svgNS = "http://www.w3.org/2000/svg";

function makeRing() {
  const ornament = document.createElement("span");
  ornament.className = "living-details-ring";
  ornament.setAttribute("aria-hidden", "true");
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", "0 0 40 40");
  svg.setAttribute("focusable", "false");
  ["track", "progress"].forEach((kind) => {
    const circle = document.createElementNS(svgNS, "circle");
    circle.setAttribute("class", `living-details-ring-${kind}`);
    circle.setAttribute("cx", "20");
    circle.setAttribute("cy", "20");
    circle.setAttribute("r", "17");
    circle.setAttribute("fill", "none");
    circle.setAttribute("pathLength", "100");
    svg.append(circle);
  });
  ornament.append(svg);
  return ornament;
}

export function initLivingDetails() {
  if (disposeDetails) return disposeDetails;
  const root = document.documentElement;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const containers = [...document.querySelectorAll(".deep-essentials-list, .project-timeline > ol")];
  const groups = containers.map((container) => {
    const timeline = container.matches(".project-timeline > ol");
    const rows = [...container.querySelectorAll(timeline ? ":scope > li" : ":scope > article")]
      .map((element) => {
        const number = element.querySelector(timeline ? ".timeline-mark" : ".chapter-number");
        if (!number) return null;
        const ring = makeRing();
        number.append(ring);
        number.classList.add("living-details-number");
        element.classList.add("living-details-row");
        return { element, number, ring, progress: 0 };
      }).filter(Boolean);
    container.classList.add("living-details-list");
    return { container, rows, visible: false, selected: -1 };
  }).filter((group) => group.rows.length);
  const cleanupListeners = [];
  let frame = 0;
  let disposed = false;
  let pageHidden = document.hidden;
  const allowed = () => !disposed && !pageHidden && !reduced.matches && root.dataset.motion !== "paused";
  const listen = (target, name, handler, options) => {
    target.addEventListener(name, handler, options);
    cleanupListeners.push(() => target.removeEventListener(name, handler, options));
  };

  function update() {
    frame = 0;
    if (!allowed()) return;
    const viewport = window.innerHeight || root.clientHeight;
    const readingLine = viewport * .46;
    // Read the visible groups together, then write only changed progress steps.
    const readings = groups.filter((group) => group.visible).map((group) => {
      const positions = group.rows.map((row) => row.element.getBoundingClientRect());
      let selected = positions.findIndex((rect) => rect.bottom > readingLine);
      if (selected < 0) selected = positions.length - 1;
      const progress = positions.map((rect, index) => {
        if (index < selected) return 1;
        if (index > selected) return 0;
        const amount = Math.max(0, Math.min(1, (readingLine - rect.top) / Math.max(1, rect.height)));
        // Eighth-turn steps keep scrolling work discrete without an idle animation loop.
        return Math.max(.125, Math.round(amount * 8) / 8);
      });
      return { group, selected, progress };
    });
    readings.forEach(({ group, selected, progress }) => {
      if (group.selected !== selected) {
        group.rows.forEach((row, index) => row.element.classList.toggle("living-details-current", index === selected));
        group.selected = selected;
      }
      group.rows.forEach((row, index) => {
        if (row.progress === progress[index]) return;
        row.progress = progress[index];
        row.ring.style.setProperty("--living-details-offset", String(100 - progress[index] * 100));
      });
    });
  }

  function schedule() {
    if (!frame && allowed() && groups.some((group) => group.visible)) frame = requestAnimationFrame(update);
  }

  function cancelFrame() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  }

  function syncPreference() {
    root.classList.toggle("living-details-still", !allowed());
    if (!allowed()) cancelFrame();
    else schedule();
  }

  const observer = typeof IntersectionObserver === "function" ? new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const group = groups.find((item) => item.container === entry.target);
      if (group) group.visible = entry.isIntersecting;
    });
    if (groups.some((group) => group.visible)) schedule();
    else cancelFrame();
  }, { threshold: 0 }) : null;
  if (observer) groups.forEach((group) => observer.observe(group.container));
  else groups.forEach((group) => { group.visible = true; });

  listen(window, "scroll", schedule, { passive: true });
  listen(window, "resize", schedule, { passive: true });
  listen(document, "load", schedule, true);
  listen(document, "toggle", schedule, true);
  listen(document, "ecolive:motionchange", syncPreference);
  listen(document, "visibilitychange", () => {
    pageHidden = document.hidden;
    syncPreference();
  });
  listen(window, "pagehide", () => { pageHidden = true; syncPreference(); });
  listen(window, "pageshow", () => { pageHidden = document.hidden; syncPreference(); });
  if (reduced.addEventListener) listen(reduced, "change", syncPreference);
  else {
    reduced.addListener(syncPreference);
    cleanupListeners.push(() => reduced.removeListener(syncPreference));
  }
  syncPreference();

  disposeDetails = () => {
    if (disposed) return;
    disposed = true;
    cancelFrame();
    observer?.disconnect();
    cleanupListeners.forEach((remove) => remove());
    groups.forEach(({ container, rows }) => {
      container.classList.remove("living-details-list");
      rows.forEach(({ element, number, ring }) => {
        element.classList.remove("living-details-row", "living-details-current");
        number.classList.remove("living-details-number");
        ring.remove();
      });
    });
    root.classList.remove("living-details-still");
    disposeDetails = null;
  };
  return disposeDetails;
}
