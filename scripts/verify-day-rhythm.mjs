import test from "node:test";
import assert from "node:assert/strict";

class Classes {
  values = new Set();
  add(value) { this.values.add(value); }
  remove(value) { this.values.delete(value); }
  contains(value) { return this.values.has(value); }
  toggle(value, force) {
    const active = force ?? !this.contains(value);
    if (active) this.add(value);
    else this.remove(value);
    return active;
  }
}

class Element extends EventTarget {
  attributes = new Map();
  classList = new Classes();
  dataset = {};
  style = { setProperty(name, value) { this[name] = value; } };
  textContent = "";
  disabled = true;
  value = "0";
  animations = [];
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  removeAttribute(name) { this.attributes.delete(name); }
  focus() { this.focused = true; }
  animate(keyframes, options) {
    const animation = {
      keyframes, options, state: "running",
      cancel() { this.state = "cancelled"; },
      finish() { this.state = "finished"; },
    };
    this.animations.push(animation);
    return animation;
  }
  getAnimations() { return this.animations.filter((animation) => animation.state !== "finished"); }
  emit(name, attributes = {}) {
    const event = new Event(name, { cancelable: true });
    Object.assign(event, attributes);
    this.dispatchEvent(event);
    return event;
  }
}

class Photo extends Element {
  decodeQueue = [];
  decode() { return this.decodeQueue.shift() || Promise.resolve(); }
}

const deferred = () => {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
};

let fixtureId = 0;

async function fixture(run) {
  const items = ["Sabah", "Öğle", "Öğleden sonra", "Akşam"].map((label, index) => ({
    id: `time-${index}`, label, eyebrow: `Başlık ${index}`, title: `An ${index}`,
    text: `İçerik ${index}`, relationship: `İlişki ${index}`, link: `Keşif ${index}`,
    href: `/bolum-${index}/`, theme: ["morning", "noon", "afternoon", "evening"][index],
    sun: { x: 20 + index * 20, y: 40 - index * 5 },
    image: { src: `/photo-${index}.webp`, srcset: `/photo-${index}-large.webp 1200w`, sizes: "90vw", width: 1200, height: 800, alt: `Görsel ${index}`, position: `${index * 10 + 40}% 50%` },
  }));
  const fields = Object.fromEntries(["eyebrow", "title", "text", "relationship", "count", "label"].map((key) => [key, new Element()]));
  const buttons = items.map((_, index) => {
    const button = new Element();
    button.setAttribute("aria-pressed", String(index === 0));
    return button;
  });
  const photos = [new Photo(), new Photo()];
  Object.assign(photos[0], items[0].image);
  photos[0].classList.add("is-current");
  const scene = new Element();
  const copy = new Element();
  const range = new Element();
  const previous = new Element();
  const next = new Element();
  const status = new Element();
  const link = new Element();
  link.firstElementChild = new Element();
  const data = new Element();
  data.textContent = JSON.stringify(items);
  const host = new Element();
  const query = new Map([
    ["[data-day-items]", data], ["[data-day-scene]", scene],
    ["[data-day-detail]", copy], [".day-rhythm__copy", copy],
    ["[data-day-range]", range], ["[data-day-prev]", previous], ["[data-day-next]", next],
    ["[data-day-status]", status], ["[data-day-link]", link],
    ...Object.entries(fields).map(([key, element]) => [`[data-day-${key}]`, element]),
  ]);
  host.querySelector = (selector) => query.get(selector) || null;
  host.querySelectorAll = (selector) => selector === "[data-day-choice]" ? buttons : selector === "[data-day-image]" ? photos : [];
  host.getBoundingClientRect = () => ({ top: 10, bottom: 600 });
  const document = new Element();
  document.documentElement = { dataset: { motion: "running" } };
  document.hidden = false;
  document.querySelectorAll = (selector) => selector === "[data-day-rhythm]" ? [host] : [];
  const media = new Element();
  media.matches = false;
  const window = new Element();
  window.innerHeight = 800;
  window.matchMedia = () => media;
  const preloads = [];
  const observers = [];
  class Image extends Photo {
    constructor() { super(); preloads.push(this); }
  }
  class IntersectionObserver {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe(element) { this.element = element; }
    disconnect() { this.disconnected = true; }
    show(visible = true) { this.callback([{ isIntersecting: visible }]); }
  }
  const globals = { document, window, Image, IntersectionObserver };
  const originals = new Map(Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  Object.assign(globalThis, globals);
  let dispose;
  try {
    const module = await import(`../day-rhythm.js?test=${++fixtureId}`);
    dispose = module.initDayRhythm();
    await run({ items, fields, buttons, photos, scene, copy, range, previous, next, status, link, host, document, window, media, preloads, observers, dispose, init: module.initDayRhythm });
  } finally {
    dispose?.();
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
}

test("initializes once without preloading the unselected scenes", async () => fixture(({ init, dispose, preloads, buttons, range, previous, next, photos, scene }) => {
  assert.equal(init(), dispose);
  assert.equal(preloads.length, 0);
  assert.ok([...buttons, range, previous, next].every((control) => !control.disabled));
  assert.equal(photos[0].classList.contains("is-current"), true);
  assert.equal(photos[1].getAttribute("aria-hidden"), "true");
  assert.equal(scene.getAttribute("aria-busy"), "false");
  assert.equal(range.getAttribute("aria-valuetext"), "Sabah");
}));

test("range selection updates the copy immediately and retains the photo until decoding finishes", async () => fixture(async ({ items, range, fields, host, link, scene, photos, preloads }) => {
  range.value = "2";
  range.emit("input");
  assert.equal(fields.title.textContent, items[2].title);
  assert.equal(fields.count.textContent, "03 / 04");
  assert.equal(range.getAttribute("aria-valuetext"), items[2].label);
  assert.equal(host.dataset.day, "afternoon");
  assert.equal(host.style["--day-sun-x"], "60%");
  assert.equal(link.href, items[2].href);
  assert.equal(scene.getAttribute("aria-busy"), "true");
  assert.equal(photos[0].classList.contains("is-current"), true);
  const gate = deferred();
  photos[1].decodeQueue.push(gate.promise);
  const loading = preloads[0].onload();
  await Promise.resolve();
  assert.equal(photos[0].classList.contains("is-current"), true);
  gate.resolve();
  await loading;
  assert.equal(photos[1].classList.contains("is-current"), true);
  assert.equal(photos[1].alt, items[2].image.alt);
  assert.equal(photos[0].getAttribute("aria-hidden"), "true");
  assert.equal(scene.getAttribute("aria-busy"), "false");
}));

test("an obsolete preload cannot overwrite a newer selection", async () => fixture(async ({ buttons, photos, fields, preloads, items }) => {
  buttons[1].emit("click");
  const gate = deferred();
  preloads[0].decodeQueue.push(gate.promise);
  const older = preloads[0].onload();
  buttons[3].emit("click");
  await preloads[1].onload();
  gate.resolve();
  await older;
  assert.equal(fields.title.textContent, items[3].title);
  assert.equal(photos.find((photo) => photo.classList.contains("is-current")).src, items[3].image.src);
}));

test("a stale mounted-image decode cannot swap back after a fast second choice", async () => fixture(async ({ buttons, photos, preloads, items }) => {
  buttons[1].emit("click");
  const gate = deferred();
  photos[1].decodeQueue.push(gate.promise);
  const older = preloads[0].onload();
  await Promise.resolve();
  buttons[2].emit("click");
  await preloads[1].onload();
  gate.resolve();
  await older;
  const active = photos.filter((photo) => photo.classList.contains("is-current"));
  assert.equal(active.length, 1);
  assert.equal(active[0].src, items[2].image.src);
}));

test("a rapid third scene settles both opacity transitions before reusing a fading image slot", async () => fixture(async ({ buttons, photos, preloads, items }) => {
  buttons[1].emit("click");
  await preloads[0].onload();
  const transitions = photos.map((photo) => {
    const transition = {
      transitionProperty: "opacity", state: "running",
      effect: { getComputedTiming: () => ({ endTime: 750 }) },
      finish() { this.state = "finished"; },
    };
    photo.animations.push(transition);
    return transition;
  });
  const otherTransition = {
    transitionProperty: "transform", state: "running",
    effect: { getComputedTiming: () => ({ endTime: 750 }) },
    finish() { this.state = "finished"; },
  };
  photos[0].animations.push(otherTransition);
  const assignmentStates = [];
  Object.defineProperty(photos[0], "srcset", {
    configurable: true,
    set(value) {
      assignmentStates.push({ value, states: transitions.map((transition) => transition.state) });
    },
  });

  buttons[2].emit("click");
  await preloads[1].onload();
  assert.equal(assignmentStates.length, 1);
  assert.deepEqual(assignmentStates[0].states, ["finished", "finished"]);
  assert.equal(assignmentStates[0].value, items[2].image.srcset);
  assert.equal(otherTransition.state, "running");
  assert.equal(photos[0].classList.contains("is-current"), true);
  assert.equal(photos[0].src, items[2].image.src);
}));

test("a failed photo preserves the old image and the same selection can be retried", async () => fixture(async ({ buttons, photos, scene, status, preloads }) => {
  buttons[3].emit("click");
  preloads[0].onerror();
  assert.equal(photos[0].classList.contains("is-current"), true);
  assert.match(status.textContent, /Önceki görsel/);
  assert.equal(scene.getAttribute("aria-busy"), "false");
  buttons[3].emit("click");
  assert.equal(preloads.length, 2);
  assert.equal(status.textContent, "");
  await preloads[1].onload();
  assert.equal(photos[1].classList.contains("is-current"), true);
  assert.equal(status.textContent, "");
}));

test("returning to the displayed scene cancels the pending request without another preload", async () => fixture(({ buttons, preloads, scene, photos }) => {
  buttons[2].emit("click");
  buttons[0].emit("click");
  assert.equal(preloads.length, 1);
  assert.equal(preloads[0].onload, null);
  assert.equal(preloads[0].onerror, null);
  assert.equal(scene.getAttribute("aria-busy"), "false");
  assert.equal(photos[0].classList.contains("is-current"), true);
}));

test("motion follows visibility, global pause, reduced motion and tab visibility", async () => fixture(({ observers, host, buttons, copy, document, media }) => {
  const visible = () => host.classList.contains("day-visible");
  assert.equal(visible(), false);
  observers[0].show();
  assert.equal(visible(), true);
  buttons[1].emit("click");
  assert.equal(copy.animations.length, 1);
  document.documentElement.dataset.motion = "paused";
  document.emit("ecolive:motionchange");
  assert.equal(visible(), false);
  assert.equal(copy.animations[0].state, "finished");
  buttons[2].emit("click");
  assert.equal(copy.animations.length, 1);
  document.documentElement.dataset.motion = "running";
  document.emit("ecolive:motionchange");
  assert.equal(visible(), true);
  media.matches = true;
  media.emit("change");
  assert.equal(visible(), false);
  media.matches = false;
  media.emit("change");
  document.hidden = true;
  document.emit("visibilitychange");
  assert.equal(visible(), false);
  document.hidden = false;
  document.emit("visibilitychange");
  assert.equal(visible(), true);
  observers[0].show(false);
  assert.equal(visible(), false);
}));

test("keyboard navigation works and disposal stops listeners and pending work", async () => fixture(({ buttons, fields, preloads, observers, dispose, scene }) => {
  const event = buttons[0].emit("keydown", { key: "End" });
  assert.equal(event.defaultPrevented, true);
  assert.equal(buttons[3].focused, true);
  assert.equal(fields.count.textContent, "04 / 04");
  dispose();
  buttons[0].emit("click");
  assert.equal(fields.count.textContent, "04 / 04");
  assert.equal(preloads[0].onload, null);
  assert.equal(preloads[0].onerror, null);
  assert.equal(observers[0].disconnected, true);
  assert.equal(scene.getAttribute("aria-busy"), "false");
}));
