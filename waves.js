// Match each curve to the incoming surface. Long cinematic/gallery sections
// mask only a shallow background edge in CSS, leaving their moving media unmasked.
let wavesInitialized = false;

export function initWaves() {
  if (
    wavesInitialized ||
    !CSS.supports("mask-image", "linear-gradient(black, black)")
  )
    return;
  wavesInitialized = true;
  const compact = window.matchMedia("(max-width: 760px)");
  const boundaries = [];
  const add = (outgoing, incoming, mobile = false) => {
    if (outgoing && incoming) boundaries.push({ outgoing, incoming, mobile });
  };
  const blocks = [
    ...document.querySelectorAll(
      "main > section, main > nav, main > aside, body > .site-footer",
    ),
  ];
  blocks.slice(1).forEach((block, i) => add(blocks[i], block));

  // These are full-width visual chapters even on desktop.
  document.querySelectorAll(".places, .related").forEach((section) => {
    add(section.firstElementChild, section.lastElementChild);
  });
  add(
    document.querySelector(".focus-options"),
    document.querySelector(".focus-description"),
    "desktop",
  );

  // Follow the mobile visual order, including the two display:contents panels.
  const mobileFlows = [
    [".focus-options", ".focus-image", ".focus-description"],
    [".together-copy", ".together-photo"],
    [".cycle-copy", ".cycle-image"],
    [".project-copy", ".campus-map"],
    [".hero-split .page-hero-copy", ".hero-split .hero-photo"],
    [".resource-diagram", ".resource-story .chapter-list"],
    [".project-plan > div", ".project-plan > button"],
    [".contact-main", ".contact-topics"],
  ];
  mobileFlows.forEach((selectors) => {
    const flow = selectors.map((selector) => document.querySelector(selector));
    flow.slice(1).forEach((block, i) => add(flow[i], block, true));
  });
  document
    .querySelectorAll(
      ".landscape-story, .care-story, .deep-feature, .contact-guide",
    )
    .forEach((section) => {
      add(section.firstElementChild, section.lastElementChild, true);
    });
  document.querySelectorAll(".related-grid").forEach((grid) => {
    [...grid.children]
      .slice(1)
      .forEach((card, i) => add(grid.children[i], card, true));
  });

  const surfaceColor = (element) => {
    let current = element;
    while (current) {
      const color = getComputedStyle(current).backgroundColor;
      if (color !== "transparent" && color !== "rgba(0, 0, 0, 0)") return color;
      current = current.parentElement;
    }
    return "#f6f4ee";
  };
  boundaries.forEach(({ incoming, mobile }, i) => {
    incoming.dataset.motionWave = "";
    incoming.dataset.waveScope = mobile ? "mobile" : "all";
    const curve =
      i % 2
        ? "M0 48 C270 14 435 17 690 43 S1190 68 1440 34 L1440 80 L0 80 Z"
        : "M0 35 C280 67 460 69 745 37 S1190 13 1440 43 L1440 80 L0 80 Z";
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 80" preserveAspectRatio="none"><path fill="black" d="${curve}"/></svg>`;
    incoming.style.setProperty(
      "--wave-mask",
      `url("data:image/svg+xml,${encodeURIComponent(svg)}")`,
    );
  });
  const refresh = () => {
    boundaries.forEach(({ outgoing, incoming }) => {
      incoming.classList.remove("motion-wave-active");
      outgoing.classList.remove("motion-wave-outgoing");
    });
    // Read the unmasked surfaces again when responsive panels change colour.
    const colors = boundaries.map(({ incoming }) => surfaceColor(incoming));
    boundaries.forEach(({ outgoing, incoming, mobile }, index) => {
      if (mobile === true && !compact.matches) return;
      if (mobile === "desktop" && compact.matches) return;
      incoming.style.setProperty("--wave-background", colors[index]);
      incoming.classList.add("motion-wave-active");
      outgoing.classList.add("motion-wave-outgoing");
    });
  };
  refresh();
  if (compact.addEventListener) compact.addEventListener("change", refresh);
  else compact.addListener(refresh);
}
