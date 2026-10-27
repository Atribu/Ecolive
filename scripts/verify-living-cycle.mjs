import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

// Exercise the production controller without importing its page-rendering setup.
const source = await readFile(new URL("../living-cycle.js", import.meta.url), "utf8");
const start = source.indexOf("function connectCycle(");
const end = source.indexOf("export function initLivingCycle", start);
assert.ok(start >= 0 && end > start, "The production connectCycle controller must be present");
const controller = source.slice(start, end);

class Target {
  handlers = new Map();

  addEventListener(type, callback) {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type).add(callback);
  }

  removeEventListener(type, callback) {
    this.handlers.get(type)?.delete(callback);
  }

  dispatch(type, detail = {}) {
    const event = {
      type,
      defaultPrevented: false,
      preventDefault() { this.defaultPrevented = true; },
      ...detail,
    };
    for (const callback of this.handlers.get(type) || []) callback(event);
    return event;
  }

  get listenerCount() {
    return [...this.handlers.values()].reduce((total, set) => total + set.size, 0);
  }
}

class Element extends Target {
  dataset = {};
  attributes = new Map();
  textContent = "";
  disabled = true;
  children = new Map();
  groups = new Map();
  style = { setProperty(name, value) { this[name] = value; } };

  querySelector(selector) { return this.children.get(selector) || null; }
  querySelectorAll(selector) { return this.groups.get(selector) || []; }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  getBoundingClientRect() { return { top: 80, bottom: 580 }; }
}

function fixture(count, { explicitRoutes = true, reducedMotion = false } = {}) {
  const targets = [];
  const make = () => { const el = new Element(); targets.push(el); return el; };
  const host = make();
  const document = new Target();
  document.documentElement = { dataset: {} };
  document.hidden = false;
  const reduced = new Target();
  reduced.matches = reducedMotion;
  const window = new Target();
  window.innerHeight = 900;
  window.matchMedia = () => reduced;
  const state = { focused: null, animations: [] };
  const buttons = Array.from({ length: count }, () => {
    const button = make();
    button.focus = (options) => { state.focused = button; button.focusOptions = options; };
    return button;
  });
  // A hub with an additional cross-link deliberately differs from a simple ring.
  const edges = explicitRoutes
    ? [...Array.from({ length: count - 1 }, (_, index) => [0, index + 1]), [1, count - 1]]
    : Array.from({ length: count }, (_, index) => [index, (index + 1) % count]);
  const routes = edges.map(([from, to], index) => {
    const path = make();
    if (explicitRoutes) Object.assign(path.dataset, { from: String(from), to: String(to) });
    path.getTotalLength = () => 100 + index * 20;
    path.getPointAtLength = (length) => ({ x: length, y: length / 2 + index });
    return path;
  });
  const currents = routes.map(make);
  const flows = routes.map(make);
  host.groups.set("[data-resource]", buttons);
  host.groups.set("[data-route]", routes);
  host.groups.set("[data-current]", currents);
  host.groups.set("[data-flow]", flows);

  const image = make();
  const constellation = make();
  const copy = make();
  const eyebrow = make();
  const title = make();
  const text = make();
  const relationship = make();
  const link = make();
  link.firstElementChild = make();
  const counter = make();
  const selection = make();
  const previous = make();
  const next = make();
  for (const [selector, child] of [
    [".living-cycle__eyebrow", eyebrow], ["h3", title], ["p", text],
    [".living-cycle__relationship", relationship],
  ]) copy.children.set(selector, child);
  for (const [selector, child] of [
    [".living-cycle__image img", image], [".living-cycle__constellation", constellation],
    [".living-cycle__copy", copy], [".living-cycle__link", link],
    [".living-cycle__index", counter], [".living-cycle__selection", selection],
    ["[data-cycle-prev]", previous], ["[data-cycle-next]", next],
  ]) host.children.set(selector, child);
  copy.animate = () => {
    const animation = { finished: false, cancelled: false,
      finish() { this.finished = true; }, cancel() { this.cancelled = true; } };
    state.animations.push(animation);
    return animation;
  };

  const items = Array.from({ length: count }, (_, index) => ({
    label: `Konu ${index + 1}`, eyebrow: `ÜST BAŞLIK ${index + 1}`,
    title: `Başlık ${index + 1}`, text: `Açıklama ${index + 1}`,
    relationship: `Alan ${index + 1} → birlikte yaşam`,
    link: `Konu ${index + 1} hakkında bilgi`,
    href: index === count - 1 ? "mailto:info@ecolive.com.tr?subject=Birlikte%20ya%C5%9Fam" : `/konu-${index + 1}/`,
    color: `#abc00${index}`,
    image: {
      src: `/image-${index + 1}.webp`,
      srcset: `/image-${index + 1}-640.webp 640w, /image-${index + 1}-960.webp 960w`,
      alt: `Görsel ${index + 1}`, width: 1200 + index, height: 800 + index,
      ...(index % 2 ? { position: "60% 45%" } : {}),
    },
  }));

  const frames = new Map();
  let frameId = 0;
  let observer;
  class Observer {
    constructor(callback) { this.callback = callback; observer = this; }
    observe(target) { this.target = target; }
    disconnect() { this.disconnected = true; }
    show(isIntersecting) { this.callback([{ isIntersecting }]); }
  }
  const context = vm.createContext({
    window, document, IntersectionObserver: Observer,
    requestAnimationFrame(callback) { frames.set(++frameId, callback); return frameId; },
    cancelAnimationFrame(id) { frames.delete(id); },
  });
  const connect = vm.runInContext(`(${controller.trim()})`, context);
  const dispose = connect({ host, items });
  const flush = (time) => {
    const pending = [...frames.values()];
    frames.clear();
    pending.forEach(callback => callback(time));
  };
  return {
    host, document, window, reduced, state, buttons, edges, currents, flows,
    image, eyebrow, title, text, relationship, link, counter, selection,
    previous, next, items, frames, observer, dispose, flush,
    targets: [...targets, document, window, reduced],
  };
}

function assertSelection(f, index) {
  const item = f.items[index];
  assert.equal(f.eyebrow.textContent, item.eyebrow);
  assert.equal(f.title.textContent, item.title);
  assert.equal(f.text.textContent, item.text);
  assert.equal(f.relationship.textContent, item.relationship);
  assert.equal(f.image.src, item.image.src);
  assert.equal(f.image.srcset, item.image.srcset);
  assert.equal(f.image.alt, item.image.alt);
  assert.equal(f.image.width, item.image.width);
  assert.equal(f.image.height, item.image.height);
  assert.equal(f.image.style.objectPosition, item.image.position || "50% 50%");
  assert.equal(f.link.href, item.href);
  assert.equal(f.link.firstElementChild.textContent, item.link);
  assert.equal(f.counter.textContent, `${String(index + 1).padStart(2, "0")} / ${String(f.items.length).padStart(2, "0")}`);
  assert.equal(f.selection.textContent, `${String(index + 1).padStart(2, "0")} — ${item.label}`);
  assert.equal(f.host.style["--cycle-accent"], item.color);
  f.buttons.forEach((button, buttonIndex) => {
    assert.equal(button.disabled, false);
    assert.equal(button.getAttribute("aria-pressed"), String(buttonIndex === index));
  });
  f.edges.forEach(([from, to], edgeIndex) => {
    const active = String(from === index || to === index);
    assert.equal(f.currents[edgeIndex].dataset.active, active);
    assert.equal(f.flows[edgeIndex].dataset.active, active);
  });
}

for (const count of [3, 4, 5, 6]) {
  test(`${count} choices update content, responsive image, link, count and connected paths`, () => {
    const f = fixture(count);
    assertSelection(f, 0);
    for (let index = 1; index < count; index++) {
      f.buttons[index].dispatch("click");
      assertSelection(f, index);
    }
    f.buttons[0].dispatch("click");
    assertSelection(f, 0);
    f.dispose();
  });

  test(`${count} choices support Home/End, wrapping arrow keys and previous/next controls`, () => {
    const f = fixture(count);
    const key = (from, value, expected) => {
      const event = f.buttons[from].dispatch("keydown", { key: value });
      assert.equal(event.defaultPrevented, true);
      assert.equal(f.state.focused, f.buttons[expected]);
      assert.equal(f.buttons[expected].focusOptions.preventScroll, true);
      assertSelection(f, expected);
    };
    key(0, "End", count - 1);
    key(count - 1, "ArrowRight", 0);
    key(0, "ArrowLeft", count - 1);
    key(count - 1, "Home", 0);
    key(0, "ArrowUp", count - 1);
    key(count - 1, "ArrowDown", 0);
    const ignored = f.buttons[0].dispatch("keydown", { key: "Escape" });
    assert.equal(ignored.defaultPrevented, false);
    assertSelection(f, 0);
    assert.equal(f.previous.disabled, false);
    assert.equal(f.next.disabled, false);
    f.previous.dispatch("click");
    assertSelection(f, count - 1);
    f.next.dispatch("click");
    assertSelection(f, 0);
    f.next.dispatch("click");
    assertSelection(f, 1);
    f.dispose();
  });
}

test("the existing energy cycle retains ring connections without explicit endpoints", () => {
  const f = fixture(5, { explicitRoutes: false });
  f.buttons[4].dispatch("click");
  assertSelection(f, 4);
  assert.equal(f.currents[3].dataset.active, "true");
  assert.equal(f.currents[4].dataset.active, "true");
  assert.equal(f.currents[0].dataset.active, "false");
  f.dispose();
});

test("motion only runs while visible; global pause freezes flows while selection remains usable", () => {
  const f = fixture(4);
  assert.equal(f.host.dataset.running, "false");
  assert.equal(f.frames.size, 0);
  f.observer.show(true);
  assert.equal(f.frames.size, 1);
  const before = f.flows[0].getAttribute("transform");
  f.flush(100);
  f.flush(140);
  assert.notEqual(f.flows[0].getAttribute("transform"), before);
  assert.equal(f.frames.size, 1, "Only one animation loop is queued");
  f.buttons[1].dispatch("click");
  assert.equal(f.state.animations.length, 1);
  f.document.documentElement.dataset.motion = "paused";
  f.document.dispatch("ecolive:motionchange");
  assert.equal(f.host.dataset.running, "false");
  assert.equal(f.frames.size, 0);
  assert.equal(f.state.animations[0].finished, true);
  const pausedTransform = f.flows[0].getAttribute("transform");
  f.flush(1000);
  assert.equal(f.flows[0].getAttribute("transform"), pausedTransform);
  f.buttons[2].dispatch("click");
  assertSelection(f, 2);
  assert.equal(f.state.animations.length, 1, "Paused content changes do not animate");
  f.document.documentElement.dataset.motion = "running";
  f.document.dispatch("ecolive:motionchange");
  assert.equal(f.frames.size, 1);
  f.observer.show(false);
  assert.equal(f.frames.size, 0);
  assert.equal(f.host.dataset.running, "false");
  f.dispose();
});

test("reduced motion, hidden tabs and page lifecycle suspend and resume the same loop", () => {
  const f = fixture(3, { reducedMotion: true });
  f.observer.show(true);
  assert.equal(f.frames.size, 0);
  f.next.dispatch("click");
  assertSelection(f, 1);
  assert.equal(f.state.animations.length, 0);
  f.reduced.matches = false;
  f.reduced.dispatch("change");
  assert.equal(f.frames.size, 1);
  f.document.hidden = true;
  f.document.dispatch("visibilitychange");
  assert.equal(f.frames.size, 0);
  f.document.hidden = false;
  f.document.dispatch("visibilitychange");
  assert.equal(f.frames.size, 1);
  f.window.dispatch("pagehide");
  assert.equal(f.frames.size, 0);
  f.window.dispatch("pageshow");
  assert.equal(f.frames.size, 1);
  f.window.dispatch("pageshow");
  assert.equal(f.frames.size, 1, "Repeated lifecycle events cannot duplicate the loop");
  f.reduced.matches = true;
  f.reduced.dispatch("change");
  assert.equal(f.frames.size, 0);
  f.dispose();
});

test("disposal cancels animation frames, entry animations, observers and event handlers", () => {
  const f = fixture(6);
  f.observer.show(true);
  f.buttons[2].dispatch("click");
  assert.equal(f.frames.size, 1);
  f.dispose();
  assert.equal(f.frames.size, 0);
  assert.equal(f.host.dataset.running, "false");
  assert.equal(f.observer.disconnected, true);
  assert.equal(f.state.animations[0].cancelled, true);
  assert.equal(f.targets.reduce((total, target) => total + target.listenerCount, 0), 0);
  f.buttons[4].dispatch("click");
  f.window.dispatch("pageshow");
  f.document.dispatch("ecolive:motionchange");
  f.observer.show(true);
  assertSelection(f, 2);
  assert.equal(f.frames.size, 0, "Late callbacks cannot revive a disposed controller");
});
