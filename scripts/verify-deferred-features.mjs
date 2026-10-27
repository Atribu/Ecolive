import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";

const source = (await readFile(new URL("../deferred-features.js", import.meta.url), "utf8"))
  .replace("export function loadWhenNear", "function loadWhenNear");

function harness({ present = true, observer = true } = {}) {
  const events = new Map();
  const target = {
    addEventListener: (name, handler) => events.set(name, handler),
    removeEventListener: name => events.delete(name),
  };
  let notify;
  let disconnected = false;
  const context = {
    document: { querySelectorAll: () => present ? [target] : [] },
    ...(observer ? { IntersectionObserver: class {
      constructor(callback) { notify = callback; }
      observe() {}
      disconnect() { disconnected = true; }
    } } : {}),
  };
  runInNewContext(`${source}\nthis.loadWhenNear = loadWhenNear;`, context);
  return {
    load: context.loadWhenNear, events,
    enter: () => notify([{ isIntersecting: true }]),
    leave: () => notify([{ isIntersecting: false }]),
    get disconnected() { return disconnected; },
  };
}

test("absent and distant sections do not download enhancements", async () => {
  let downloads = 0;
  const absent = harness({ present: false });
  assert.equal(absent.load("section", () => downloads++), undefined);
  const distant = harness();
  distant.load("section", () => downloads++);
  distant.leave();
  await Promise.resolve();
  assert.equal(downloads, 0);
});

test("approach and keyboard intent share one download, then release observers", async () => {
  const page = harness();
  let downloads = 0;
  let ready;
  const start = page.load("section", () => { downloads++; return new Promise(resolve => { ready = resolve; }); });
  page.enter();
  page.events.get("focusin")();
  const result = start();
  await Promise.resolve();
  assert.equal(downloads, 1);
  ready();
  await result;
  await start();
  assert.equal(downloads, 1);
  assert.equal(page.disconnected, true);
  assert.equal(page.events.size, 0);
});

test("a failed download can be retried without removing the static content", async () => {
  const page = harness();
  let downloads = 0;
  const start = page.load("section", () => {
    downloads++;
    if (downloads === 1) throw new Error("offline");
  });
  await start();
  assert.equal(page.disconnected, false);
  assert.equal(page.events.size, 3);
  await page.events.get("pointerdown")();
  assert.equal(downloads, 2);
  assert.equal(page.disconnected, true);
});

test("browsers without IntersectionObserver initialize usable controls", async () => {
  const page = harness({ observer: false });
  let downloads = 0;
  page.load("section", () => downloads++);
  await Promise.resolve();
  assert.equal(downloads, 1);
});
