import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";

const source = (await readFile(new URL("../motion.js", import.meta.url), "utf8"))
  .replace("export function initMotion", "function initMotion");

class Element extends EventTarget {
  dataset = {};
  textContent = "";
  classes = new Set();
  writes = [];
  values = new Map();
  rect = { top: 100, height: 700, width: 1200 };
  classList = {
    add: (...values) => values.forEach(value => this.classes.add(value)),
    remove: (...values) => values.forEach(value => this.classes.delete(value)),
    contains: value => this.classes.has(value),
    toggle: (value, enabled = !this.classes.has(value)) => enabled ? this.classes.add(value) : this.classes.delete(value),
  };
  style = {
    setProperty: (name, value) => { this.values.set(name, value); this.writes.push([name, value]); },
    removeProperty: name => this.values.delete(name),
  };
  getBoundingClientRect() { return { ...this.rect, bottom: this.rect.top + this.rect.height }; }
  querySelector() { return null; }
  closest() { return null; }
  matches() { return false; }
  contains(other) { return other === this; }
  emit(name) { this.dispatchEvent(new Event(name)); }
}

function fixture({ waveTop = 100, waveHeight = 2600, text = false } = {}) {
  const root = new Element();
  root.dataset.motion = "running";
  root.clientHeight = 900;
  const document = new Element();
  document.documentElement = root;
  document.body = new Element();
  document.activeElement = document.body;
  document.hidden = false;
  const window = new Element();
  window.innerHeight = 900;
  const reduced = new Element();
  reduced.matches = false;
  const compact = new Element();
  compact.matches = false;
  window.matchMedia = query => query.includes("prefers-reduced") ? reduced : compact;
  const wave = new Element();
  wave.rect.top = waveTop;
  wave.rect.height = waveHeight;
  wave.classList.add("motion-wave-active");
  const photoFrame = new Element();
  const photo = new Element();
  photo.parentElement = photoFrame;
  const paragraph = new Element();
  paragraph.textContent = "An existing editorial paragraph.";
  paragraph.rect = { top: 1100, height: 60, width: 400 };
  document.querySelectorAll = selector => {
    if (selector.startsWith("main h1")) return text ? [paragraph] : [];
    if (selector === "[data-motion-wave]") return [wave];
    if (selector.startsWith(".deep-image > img")) return [photo];
    return [];
  };
  const observers = [];
  class IntersectionObserver {
    targets = new Set();
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe(element) { this.targets.add(element); }
    unobserve(element) { this.targets.delete(element); }
    disconnect() { this.targets.clear(); }
    show(...targets) { this.callback(targets.map(target => ({ target, isIntersecting: true }))); }
  }
  class ResizeObserver {
    observe() {}
    disconnect() {}
  }
  let id = 0;
  const frames = new Map();
  const context = {
    document, window, Element, IntersectionObserver, ResizeObserver,
    location: { hash: "" }, CSS: { supports: () => true },
    getComputedStyle: () => ({ getPropertyValue: () => compact.matches ? "32px" : "58px" }),
    requestAnimationFrame: callback => { frames.set(++id, callback); return id; },
    cancelAnimationFrame: key => frames.delete(key),
  };
  runInNewContext(`${source}\nthis.initMotion = initMotion;`, context);
  const dispose = context.initMotion();
  const flush = () => {
    const callbacks = [...frames.values()];
    frames.clear();
    callbacks.forEach(callback => callback());
  };
  const clearWrites = () => [wave, photo, paragraph].forEach(element => { element.writes.length = 0; });
  return { root, document, window, reduced, compact, wave, photo, photoFrame, paragraph, observers, frames, flush, clearWrites, dispose };
}

test("a tall visible chapter stops repainting its offscreen wave while its photo still moves", () => {
  const page = fixture({ waveTop: -600 });
  try {
    page.observers[0].show(page.wave, page.photoFrame);
    page.flush();
    assert.equal(page.wave.writes.length, 0, "the section intersects, but its curved edge does not");
    assert.equal(page.photo.writes.length, 2);
    page.clearWrites();
    page.wave.rect.top -= 100;
    page.photoFrame.rect.top -= 100;
    page.window.emit("scroll");
    page.flush();
    assert.equal(page.wave.writes.length, 0);
    assert.deepEqual(page.photo.writes.map(([name]) => name), ["--motion-parallax-y"]);
    assert.equal(page.frames.size, 0, "no continuous frame loop");
  } finally { page.dispose(); }
});

test("unchanged scroll positions produce no repeated style writes; resizing recalculates photo overscan", () => {
  const page = fixture();
  try {
    page.observers[0].show(page.wave, page.photoFrame);
    page.flush();
    assert.equal(page.wave.writes.length, 2);
    assert.equal(page.photo.writes.length, 2);
    page.clearWrites();
    page.window.emit("scroll");
    page.window.emit("scroll");
    assert.equal(page.frames.size, 1);
    page.flush();
    assert.equal(page.wave.writes.length + page.photo.writes.length, 0);
    page.wave.rect.top -= 60;
    page.photoFrame.rect.top -= 60;
    page.window.emit("scroll");
    page.flush();
    assert.equal(page.wave.writes.length, 2);
    assert.deepEqual(page.photo.writes.map(([name]) => name), ["--motion-parallax-y"]);
    page.clearWrites();
    page.photoFrame.rect.height = 500;
    page.window.emit("resize");
    page.flush();
    assert.equal(page.photo.values.get("--motion-parallax-scale"), "1.052000");
    assert.equal(page.photo.writes.filter(([name]) => name === "--motion-parallax-scale").length, 1);
  } finally { page.dispose(); }
});

test("a curve resumes on reentry and respects the smaller mobile edge", () => {
  const page = fixture({ waveTop: -100 });
  try {
    page.observers[0].show(page.wave);
    page.flush();
    assert.equal(page.wave.writes.length, 0);
    page.wave.rect.top = -60;
    page.window.emit("scroll");
    page.flush();
    assert.equal(page.wave.writes.length, 2, "the lower part of the desktop curve is visible");
    page.clearWrites();
    page.compact.matches = true;
    page.compact.emit("change");
    page.flush();
    assert.equal(page.wave.writes.length, 0, "the mobile curve has already left view");
    page.wave.rect.top = -30;
    page.window.emit("scroll");
    page.flush();
    assert.equal(page.wave.writes.length, 2);
  } finally { page.dispose(); }
});

test("pause and reduced motion neutralize once, then resume the correct cached photo scale", () => {
  const page = fixture();
  try {
    page.observers[0].show(page.wave, page.photoFrame);
    page.flush();
    const activeScale = page.photo.values.get("--motion-parallax-scale");
    page.root.dataset.motion = "paused";
    page.document.emit("ecolive:motionchange");
    assert.equal(page.photo.values.get("--motion-parallax-scale"), "1");
    assert.equal(page.wave.values.get("--wave-shift"), "0px");
    page.clearWrites();
    page.document.emit("ecolive:motionchange");
    page.window.emit("scroll");
    assert.equal(page.frames.size, 0);
    assert.equal(page.wave.writes.length + page.photo.writes.length, 0);
    page.root.dataset.motion = "running";
    page.document.emit("ecolive:motionchange");
    page.flush();
    assert.equal(page.photo.values.get("--motion-parallax-scale"), activeScale);
    page.reduced.matches = true;
    page.reduced.emit("change");
    assert.equal(page.photo.values.get("--motion-parallax-scale"), "1");
    page.window.emit("scroll");
    assert.equal(page.frames.size, 0);
  } finally { page.dispose(); }
});

test("visibility and disposal cancel work without leaving effect styles or listeners", () => {
  const page = fixture();
  page.observers[0].show(page.wave, page.photoFrame);
  page.document.hidden = true;
  page.document.emit("visibilitychange");
  assert.equal(page.frames.size, 0);
  page.document.hidden = false;
  page.window.emit("pageshow");
  page.flush();
  assert.equal(page.photo.writes.length, 2);
  page.dispose();
  assert.equal(page.photo.values.size, 0);
  assert.equal(page.wave.values.size, 0);
  page.window.emit("scroll");
  page.window.emit("resize");
  assert.equal(page.frames.size, 0);
  assert.equal(page.observers[0].targets.size, 0);
});

test("text keeps its existing entrance delay and is never hidden again after reveal", () => {
  const page = fixture({ text: true });
  try {
    assert.equal(page.paragraph.classList.contains("motion-waiting"), true);
    page.paragraph.rect.top = 400;
    page.observers[0].show(page.paragraph);
    page.flush();
    assert.equal(page.paragraph.classList.contains("motion-waiting"), false);
    assert.equal(page.paragraph.values.get("--motion-delay"), "250ms");
    page.paragraph.rect.top = 1500;
    page.window.emit("scroll");
    page.flush();
    assert.equal(page.paragraph.classList.contains("motion-waiting"), false);
  } finally { page.dispose(); }
});
