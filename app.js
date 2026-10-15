import { focusAreas } from "./focus-data.js";
import { initWaves } from "./waves.js";
import { initMotion } from "./motion.js";
import { initHeroScroll } from "./hero-scroll.js";

const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [
  ...parent.querySelectorAll(selector),
];
const header = $("#header");
const navigation = $("#navigation");
const mapDialog = $("#map-dialog");
const dialogs = [navigation, mapDialog].filter(Boolean);
let previousFocus;

function openDialog(dialog) {
  if (!dialog || dialog.open) return;
  previousFocus = document.activeElement;
  dialog.showModal();
  document.body.classList.add("dialog-open");
  if (dialog === navigation)
    $("#menu-open")?.setAttribute("aria-expanded", "true");
}

function closeDialog(dialog) {
  dialog?.close();
}

dialogs.forEach((dialog) => {
  dialog.addEventListener("close", () => {
    if (!dialogs.some((item) => item.open))
      document.body.classList.remove("dialog-open");
    if (dialog === navigation)
      $("#menu-open")?.setAttribute("aria-expanded", "false");
    if (previousFocus?.isConnected)
      previousFocus.focus({ preventScroll: true });
  });
  dialog.addEventListener("click", (event) => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    )
      closeDialog(dialog);
  });
});

$("#menu-open")?.addEventListener("click", () => openDialog(navigation));
$("#menu-close")?.addEventListener("click", () => closeDialog(navigation));
$("#map-open")?.addEventListener("click", () => openDialog(mapDialog));
$("#map-close")?.addEventListener("click", () => closeDialog(mapDialog));
if (navigation) {
  $$("a[href]", navigation).forEach((link) =>
    link.addEventListener("click", () => closeDialog(navigation)),
  );
}

const updateHeader = () =>
  header?.classList.toggle("scrolled", window.scrollY > 100);
addEventListener("scroll", updateHeader, { passive: true });
updateHeader();
const year = $("#year");
if (year) year.textContent = new Date().getFullYear();

const focusOptions = $("#focus-options");
if (focusOptions && focusAreas.length) {
  const description = $("#focus-description");
  const detailLink = $("#focus-detail");
  const number = $("#focus-number");
  const container = $("#focus-image");
  const image = container ? $("img", container) : null;
  let transitionTimer;
  let buttons = [];

  function chooseFocus(index, initial = false) {
    const area = focusAreas[index];
    if (!area) return;
    buttons.forEach((button, buttonIndex) =>
      button.setAttribute("aria-pressed", String(buttonIndex === index)),
    );
    if (description) description.textContent = area.description;
    if (detailLink) detailLink.href = area.href;
    if (number)
      number.textContent = `${String(index + 1).padStart(2, "0")} / ${String(focusAreas.length).padStart(2, "0")}`;

    clearTimeout(transitionTimer);
    if (container && image) {
      const replaceImage = () => {
        container.dataset.area = area.id;
        image.sizes = area.sizes;
        image.srcset = area.srcset || "";
        image.src = area.src;
        image.width = area.width;
        image.height = area.height;
        image.alt = area.alt;
        container.classList.remove("changing");
      };
      if (initial || matchMedia("(prefers-reduced-motion: reduce)").matches)
        replaceImage();
      else {
        container.classList.add("changing");
        transitionTimer = setTimeout(replaceImage, 240);
      }
    }

    if (!initial && matchMedia("(max-width: 760px)").matches) {
      const listRect = focusOptions.getBoundingClientRect();
      const buttonRect = buttons[index].getBoundingClientRect();
      focusOptions.scrollTo({
        left:
          focusOptions.scrollLeft +
          buttonRect.left -
          listRect.left -
          (focusOptions.clientWidth - buttonRect.width) / 2,
        behavior: "instant",
      });
    }
  }

  buttons = focusAreas.map((area, index) => {
    const button = document.createElement("button");
    button.className = "focus-option";
    button.type = "button";
    button.setAttribute("aria-pressed", String(index === 0));
    button.setAttribute("aria-controls", "focus-description focus-image");
    const label = document.createElement("span");
    label.className = "focus-index";
    label.setAttribute("aria-hidden", "true");
    label.textContent = String(index + 1).padStart(2, "0");
    button.append(label, document.createTextNode(area.title));
    button.addEventListener("click", () => chooseFocus(index));
    button.addEventListener("keydown", (event) => {
      const direction = ["ArrowRight", "ArrowDown"].includes(event.key)
        ? 1
        : ["ArrowLeft", "ArrowUp"].includes(event.key)
          ? -1
          : 0;
      if (!direction) return;
      event.preventDefault();
      const next = (index + direction + focusAreas.length) % focusAreas.length;
      chooseFocus(next);
      buttons[next].focus({ preventScroll: true });
    });
    return button;
  });
  focusOptions.replaceChildren(...buttons);
  chooseFocus(0, true);
}

const accordions = $$(".cycle-accordion details");
accordions.forEach((item) =>
  item.addEventListener("toggle", () => {
    if (item.open)
      accordions.forEach((other) => {
        if (other !== item) other.open = false;
      });
  }),
);

const normalizePath = (pathname) =>
  pathname.replace(/\/index\.html$/, "/").replace(/\/+$/, "") || "/";
const currentPath = normalizePath(location.pathname);
$$(".desktop-nav a, .main-nav a, .nav-contact").forEach((link) => {
  if (!link.hasAttribute("href")) return;
  const url = new URL(link.href, location.href);
  if (
    url.origin === location.origin &&
    normalizePath(url.pathname) === currentPath
  )
    link.setAttribute("aria-current", "page");
  else link.removeAttribute("aria-current");
});
$("#copy-email")?.addEventListener("click", async () => {
  const status = $("#copy-status");
  try {
    await navigator.clipboard.writeText("info@ecolive.com.tr");
    if (status) status.textContent = "E-posta adresi kopyalandı.";
  } catch {
    if (status) status.textContent = "E-posta adresi: info@ecolive.com.tr";
  }
});

initHeroScroll();
initWaves();
initMotion();
