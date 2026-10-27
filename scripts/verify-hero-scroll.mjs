import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const controller = (await readFile(new URL("../hero-scroll.js", import.meta.url), "utf8"))
  .replace("export function initHeroScroll", "function initHeroScroll");

// Deterministic media events model slow delivery without downloading a video.
// currentTime assignments remain pending until the test supplies a seeked event.
function browser({ reduced = false, saveData = false, compact = false } = {}) {
  let now = 0;
  let nextId = 0;
  let progress = 0;
  let currentTime = 0;
  let ranges = [];
  let decodePoster;
  const frames = new Map();
  const timers = new Map();
  const classes = new Set();
  const properties = new Map();
  const seeks = [];
  const poster = { decode: () => new Promise((resolve) => { decodePoster = resolve; }) };
  const video = Object.assign(new EventTarget(), {
    dataset: { src: "/desktop.mp4", mobileSrc: "/mobile.mp4" },
    src: "",
    preload: "none",
    readyState: 0,
    duration: NaN,
    seeking: false,
    paused: true,
    loads: 0,
    canPlayType: () => "probably",
    pause() { this.paused = true; },
    load() { this.loads += 1; },
    hasAttribute(name) { return name === "src" && Boolean(this.src); },
    removeAttribute(name) { if (name === "src") this.src = ""; },
  });
  Object.defineProperties(video, {
    currentTime: {
      get: () => currentTime,
      set(value) {
        currentTime = value;
        video.seeking = true;
        seeks.push(value);
      },
    },
    buffered: {
      get: () => ({
        length: ranges.length,
        start: (index) => ranges[index][0],
        end: (index) => ranges[index][1],
      }),
    },
  });
  const stage = { offsetHeight: 1000 };
  const hero = {
    offsetHeight: 2200,
    getBoundingClientRect: () => ({ top: -progress * 1200 }),
    style: {
      setProperty: (name, value) => properties.set(name, value),
      removeProperty: (name) => properties.delete(name),
    },
    classList: {
      add: (...names) => names.forEach((name) => classes.add(name)),
      remove: (...names) => names.forEach((name) => classes.delete(name)),
      contains: (name) => classes.has(name),
    },
    querySelector: (selector) => ({
      "[data-hero-video]": video,
      ".hero-sticky": stage,
      ".hero-media img": poster,
    })[selector] || null,
  };
  const mediaQueries = new Map();
  const window = Object.assign(new EventTarget(), {
    matchMedia(query) {
      if (!mediaQueries.has(query)) {
        mediaQueries.set(query, Object.assign(new EventTarget(), {
          matches: query.includes("reduced-motion") ? reduced : compact,
        }));
      }
      return mediaQueries.get(query);
    },
  });
  const connection = Object.assign(new EventTarget(), { saveData });
  const document = Object.assign(new EventTarget(), {
    documentElement: { dataset: {} },
    hidden: false,
    // Neither load nor fonts is ready: the decoded poster must be sufficient.
    readyState: "loading",
    fonts: { ready: new Promise(() => {}) },
    querySelector: () => hero,
  });
  const context = vm.createContext({
    window,
    document,
    navigator: { connection },
    CSS: { supports: () => true },
    requestAnimationFrame(callback) {
      frames.set(++nextId, callback);
      return nextId;
    },
    cancelAnimationFrame: (id) => frames.delete(id),
    setTimeout(callback, delay) {
      timers.set(++nextId, { callback, at: now + delay });
      return nextId;
    },
    clearTimeout: (id) => timers.delete(id),
  });
  vm.runInContext(`${controller}\nglobalThis.start = initHeroScroll;`, context);
  const dispose = context.start();
  const emit = (target, type) => target.dispatchEvent(new Event(type));
  async function flush() {
    for (let turn = 0; turn < 20; turn += 1) {
      await Promise.resolve();
      const pending = [...frames.values()];
      frames.clear();
      pending.forEach((callback) => callback(now));
    }
    assert.equal(frames.size, 0, "controller must not create an idle animation loop");
  }
  return {
    video, seeks, classes, properties, dispose, window, connection,
    async motion(paused) {
      document.documentElement.dataset.motion = paused ? "paused" : "running";
      emit(document, "ecolive:motionchange");
      await flush();
    },
    async decode() {
      await flush();
      assert.equal(typeof decodePoster, "function");
      decodePoster();
      await flush();
    },
    async scroll(value) {
      progress = value;
      emit(window, "scroll");
      await flush();
    },
    async media(type, { buffered, ...values } = {}) {
      if (buffered) ranges = buffered;
      Object.assign(video, values);
      emit(video, type);
      await flush();
    },
    async finishSeek() {
      video.seeking = false;
      emit(video, "seeked");
      await flush();
    },
    async advance(milliseconds) {
      const end = now + milliseconds;
      for (;;) {
        const due = [...timers].filter(([, timer]) => timer.at <= end)
          .sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        now = due[1].at;
        timers.delete(due[0]);
        due[1].callback();
        await flush();
      }
      now = end;
      await flush();
    },
  };
}

function setup(t, options) {
  const page = browser(options);
  t.after(page.dispose);
  return page;
}

test("global pause freezes scroll video without changing the track or downloading again", async (t) => {
  const page = setup(t);
  await page.decode();
  await page.media("loadeddata", { duration: 10, readyState: 2, buffered: [[0, 10]] });
  await page.scroll(0.2);
  await page.finishSeek();
  const loads = page.video.loads;
  const seeks = page.seeks.length;
  await page.motion(true);
  await page.scroll(0.8);
  await page.media("progress");
  assert.equal(page.seeks.length, seeks);
  assert.equal(page.classes.has("hero-scroll-enabled"), true);
  assert.equal(page.video.src, "/desktop.mp4");
  assert.equal(page.properties.has("--hero-title-opacity"), false);
  assert.equal(page.properties.has("--hero-bottom-events"), false);
  await page.motion(false);
  assert.ok(Math.abs(page.seeks.at(-1) - 7.968) < 0.001);
  assert.equal(page.video.loads, loads);
});

test("global pause defers video loading until the visitor resumes motion", async (t) => {
  const page = setup(t);
  await page.motion(true);
  await page.decode();
  assert.equal(page.video.src, "");
  await page.motion(false);
  assert.equal(page.video.src, "/desktop.mp4");
});

test("a decoded poster starts preload without document load, fonts, or scroll", async (t) => {
  const page = setup(t);
  assert.equal(page.video.src, "", "video must wait for the poster");
  await page.decode();
  assert.equal(page.video.src, "/desktop.mp4");
  assert.equal(page.video.preload, "auto");
  assert.equal(page.video.paused, true);
});

test("metadata at mid-scroll cannot trigger a seek before a playable frame", async (t) => {
  const page = setup(t);
  await page.decode();
  await page.scroll(0.5);
  await page.media("loadedmetadata", { duration: 10, readyState: 1, buffered: [[0, 10]] });
  assert.deepEqual(page.seeks, []);
  await page.media("loadeddata", { readyState: 2 });
  assert.equal(page.seeks.length, 1);
  assert.ok(Math.abs(page.seeks[0] - 4.98) < 0.001);
});

for (const event of ["progress", "canplaythrough", "suspend"]) {
  test(`${event} catches up to the latest buffered target, including decode margin`, async (t) => {
    const page = setup(t);
    await page.decode();
    await page.media("loadeddata", { duration: 10, readyState: 2, buffered: [[0, 0.4]] });
    await page.scroll(0.45);
    await page.scroll(0.8);
    assert.deepEqual(page.seeks, [], "unbuffered scrolling must retain the current frame");
    assert.equal(page.video.currentTime, 0);
    await page.media(event, { buffered: [[0, 5]] });
    assert.deepEqual(page.seeks, [], "an older scroll target must not be replayed");
    await page.media(event, { buffered: [[0, 8.01]] });
    assert.deepEqual(page.seeks, [], "the frame also needs a small buffered decode margin");
    await page.media(event, { buffered: [[0, 8.1]] });
    assert.equal(page.seeks.length, 1);
    assert.ok(Math.abs(page.seeks[0] - 7.968) < 0.001);
    assert.equal(page.video.src, "/desktop.mp4");
  });
}

test("forward and reverse scrolling use exact buffered times and coalesce pending seeks", async (t) => {
  const page = setup(t);
  await page.decode();
  await page.media("loadeddata", { duration: 10, readyState: 4, buffered: [[0, 10]] });
  await page.scroll(0.8);
  await page.scroll(0.6);
  await page.scroll(0.25);
  assert.equal(page.seeks.length, 1, "only one decode may be pending");
  await page.finishSeek();
  assert.equal(page.seeks.length, 2);
  assert.ok(Math.abs(page.seeks[1] - 2.49) < 0.001, "reverse scroll must reach the latest exact time");
  await page.finishSeek();
  await page.scroll(1);
  assert.ok(Math.abs(page.seeks.at(-1) - 9.96) < 0.001, "end-of-video margin must not prevent the final frame");
});

test("disconnected buffered ranges do not make a gap seekable", async (t) => {
  const page = setup(t);
  await page.decode();
  await page.media("loadeddata", { duration: 10, readyState: 2, buffered: [[0, 0.4], [6, 10]] });
  await page.scroll(0.5);
  assert.deepEqual(page.seeks, [], "the final buffered endpoint must not hide a gap");
  await page.media("progress", { buffered: [[0, 0.4], [4.9, 5.2], [6, 10]] });
  assert.equal(page.seeks.length, 1);
  assert.ok(Math.abs(page.seeks[0] - 4.98) < 0.001);
});

test("a first frame delayed beyond 20 seconds keeps the source and reserved track", async (t) => {
  const page = setup(t);
  await page.decode();
  await page.scroll(0.5);
  await page.media("loadedmetadata", { duration: 10, readyState: 1 });
  await page.advance(25_000);
  assert.equal(page.video.src, "/desktop.mp4");
  assert.equal(page.classes.has("hero-scroll-enabled"), true);
  assert.equal(page.classes.has("hero-video-ready"), false);
  await page.media("loadeddata", { readyState: 2, buffered: [[0, 10]] });
  await page.finishSeek();
  assert.equal(page.classes.has("hero-video-ready"), true);
  assert.ok(Math.abs(page.video.currentTime - 4.98) < 0.001);
});

for (const preference of ["reduced", "saveData"]) {
  test(`${preference} keeps the poster without loading video`, async (t) => {
    const page = setup(t, { [preference]: true });
    await page.decode();
    await page.scroll(0.5);
    await page.advance(25_000);
    assert.equal(page.video.src, "");
    assert.equal(page.video.loads, 0);
    assert.equal(page.classes.has("hero-scroll-enabled"), false);
    assert.deepEqual(page.seeks, []);
  });
}

test("a real media error falls back, and disposal prevents late callbacks from restarting", async (t) => {
  const page = setup(t);
  await page.decode();
  await page.media("error");
  assert.equal(page.video.src, "");
  assert.equal(page.classes.has("hero-scroll-enabled"), false);
  page.dispose();
  const loads = page.video.loads;
  await page.scroll(0.8);
  await page.media("progress", { duration: 10, readyState: 4, buffered: [[0, 10]] });
  await page.advance(30_000);
  assert.equal(page.video.loads, loads);
  assert.equal(page.video.src, "");
  assert.deepEqual(page.seeks, []);
  assert.equal(page.properties.size, 0);
});

test("disposal before poster decode cancels the deferred media start", async (t) => {
  const page = setup(t);
  page.dispose();
  await page.decode();
  await page.scroll(0.5);
  assert.equal(page.video.src, "");
  assert.equal(page.video.loads, 0);
});

test("disposing an active controller clears media, presentation, and event work", async (t) => {
  const page = setup(t);
  await page.decode();
  await page.media("loadeddata", { duration: 10, readyState: 4, buffered: [[0, 10]] });
  await page.scroll(0.5);
  await page.finishSeek();
  page.dispose();
  const loads = page.video.loads;
  const seekCount = page.seeks.length;
  await page.scroll(0.8);
  await page.media("canplaythrough");
  await page.advance(30_000);
  assert.equal(page.video.src, "");
  assert.equal(page.video.loads, loads);
  assert.equal(page.seeks.length, seekCount);
  assert.equal(page.classes.size, 0);
  assert.equal(page.properties.size, 0);
});
