import test from 'node:test';
import assert from 'node:assert/strict';

class Classes {
  values = new Set();
  add(...values) { values.forEach(value => this.values.add(value)); }
  remove(...values) { values.forEach(value => this.values.delete(value)); }
  contains(value) { return this.values.has(value); }
  toggle(value, force = !this.contains(value)) {
    if (force) this.add(value); else this.remove(value);
    return force;
  }
}

class Element extends EventTarget {
  attributes = new Map();
  classList = new Classes();
  dataset = {};
  style = { setProperty(name, value) { this[name] = value; } };
  textContent = '';
  disabled = true;
  animations = [];
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  removeAttribute(name) { this.attributes.delete(name); }
  focus(options) { this.focused = true; this.focusOptions = options; }
  querySelector() { return null; }
  animate(keyframes, options) {
    const animation = {
      keyframes, options, state: 'running',
      cancel() { this.state = 'cancelled'; },
      finish() { this.state = 'finished'; },
    };
    this.animations.push(animation);
    return animation;
  }
  getAnimations() { return this.animations.filter(animation => animation.state === 'running'); }
  emit(name, properties = {}) {
    const event = new Event(name, { cancelable: true });
    Object.assign(event, properties);
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
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

let fixtureId = 0;

async function fixture(run, { desktop: isDesktop = true, reduced: isReduced = false } = {}) {
  const items = ['Bahçe', 'Ev', 'Buluşma', 'Üretim'].map((label, index) => ({
    id: `scene-${index}`, label, eyebrow: `Başlık ${index}`, title: `Sahne ${index}`,
    text: `İçerik ${index}`, href: `/alan-${index}/`, link: `Keşif ${index}`,
    image: { src: `/photo-${index}.webp`, srcset: `/photo-${index}-large.webp 1200w`, sizes: '90vw', width: 1200, height: 800, alt: `Görsel ${index}`, position: `${40 + index * 10}% 50%` },
  }));
  const fields = Object.fromEntries(['eyebrow', 'title', 'text', 'count', 'label'].map(key => [key, new Element()]));
  const buttons = items.map((_, index) => {
    const button = new Element();
    button.setAttribute('aria-pressed', String(index === 0));
    return button;
  });
  const photos = [new Photo(), new Photo()];
  Object.assign(photos[0], items[0].image);
  photos[0].classList.add('is-current');
  photos[1].setAttribute('aria-hidden', 'true');
  const scene = new Element();
  const copy = new Element();
  const previous = new Element();
  const next = new Element();
  const status = new Element();
  const progress = new Element();
  const link = new Element();
  link.firstElementChild = new Element();
  const data = new Element();
  data.textContent = JSON.stringify(items);
  const track = new Element();
  const stage = new Element();
  const host = new Element();
  const query = new Map([
    ['[data-journey-items]', data], ['[data-journey-track]', track], ['[data-journey-stage]', stage],
    ['[data-journey-scene]', scene], ['[data-journey-copy]', copy], ['[data-journey-status]', status],
    ['[data-journey-progress]', progress], ['[data-journey-link]', link],
    ['[data-journey-prev]', previous], ['[data-journey-next]', next],
    ...Object.entries(fields).map(([key, element]) => [`[data-journey-${key}]`, element]),
  ]);
  host.querySelector = selector => query.get(selector) || null;
  host.querySelectorAll = selector => selector === '[data-journey-choice]' ? buttons : selector === '[data-journey-image]' ? photos : [];
  const document = new Element();
  document.documentElement = { dataset: { motion: 'running' } };
  document.hidden = false;
  document.querySelectorAll = selector => selector === '[data-journey]' ? [host] : [];
  const reduced = new Element();
  reduced.matches = isReduced;
  const desktop = new Element();
  desktop.matches = isDesktop;
  const window = new Element();
  window.innerHeight = 900;
  window.scrollY = 0;
  window.matchMedia = query => query.includes('prefers-reduced') ? reduced : desktop;
  const seeks = [];
  window.scrollTo = options => { seeks.push(options); window.scrollY = options.top; };
  const geometry = { top: 1000, trackHeight: 2600, stageHeight: 600, stickyTop: 88 };
  track.getBoundingClientRect = () => ({ top: geometry.top - window.scrollY, bottom: geometry.top - window.scrollY + geometry.trackHeight, height: geometry.trackHeight });
  host.getBoundingClientRect = track.getBoundingClientRect;
  stage.getBoundingClientRect = () => ({ top: geometry.stickyTop, bottom: geometry.stickyTop + geometry.stageHeight, height: geometry.stageHeight });
  const preloads = [];
  const observers = [];
  class Image extends Photo {
    constructor() { super(); preloads.push(this); }
  }
  class IntersectionObserver {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe(element) { this.element = element; }
    disconnect() { this.disconnected = true; }
    show(visible = true) { this.callback([{ target: this.element, isIntersecting: visible }]); }
  }
  let frameId = 0;
  const frames = new Map();
  const requestAnimationFrame = callback => { frames.set(++frameId, callback); return frameId; };
  const cancelAnimationFrame = id => frames.delete(id);
  const flush = () => {
    const callbacks = [...frames.values()];
    frames.clear();
    callbacks.forEach(callback => callback());
  };
  const scroll = fraction => {
    window.scrollY = geometry.top - geometry.stickyTop + (geometry.trackHeight - geometry.stageHeight) * fraction;
    window.emit('scroll');
  };
  const globals = { document, window, Image, IntersectionObserver, requestAnimationFrame, cancelAnimationFrame, getComputedStyle: () => ({ top: `${geometry.stickyTop}px` }) };
  const originals = new Map(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  Object.assign(globalThis, globals);
  let dispose;
  try {
    const module = await import(`../immersive-journey.js?test=${++fixtureId}`);
    dispose = module.initImmersiveJourney();
    await run({ items, fields, buttons, photos, scene, copy, previous, next, status, progress, link, host, track, stage, document, window, reduced, desktop, geometry, preloads, observers, frames, seeks, flush, scroll, dispose, init: module.initImmersiveJourney });
  } finally {
    dispose?.();
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
}

test('initializes once, coalesces native scroll events and selects exact scene boundaries without an idle loop', async () => fixture(async ({ init, dispose, buttons, previous, next, preloads, observers, frames, flush, scroll, host, progress, fields, items }) => {
  assert.equal(init(), dispose);
  assert.ok([...buttons, previous, next].every(control => !control.disabled));
  assert.equal(preloads.length, 0);
  assert.equal(frames.size, 0);
  observers[0].show();
  scroll(.1);
  scroll(.25);
  assert.equal(frames.size, 1);
  flush();
  assert.equal(frames.size, 0);
  assert.equal(host.dataset.journeyIndex, '1');
  assert.equal(progress.getAttribute('aria-valuenow'), '25');
  assert.equal(fields.title.textContent, items[0].title, 'copy waits for its matching photo');
  await preloads[0].onload();
  assert.equal(fields.title.textContent, items[1].title);
  assert.equal(frames.size, 0);
  scroll(1);
  flush();
  assert.equal(host.dataset.journeyIndex, '3');
  assert.equal(progress.getAttribute('aria-valuenow'), '100');
  assert.equal(frames.size, 0);
}));

test('desktop chapter controls seek the native track, while mobile selection stays manual', async () => {
  await fixture(({ buttons, seeks, geometry, window, host, flush }) => {
    buttons[2].emit('click');
    assert.equal(seeks.length, 1);
    assert.equal(seeks[0].top, geometry.top - geometry.stickyTop + (geometry.trackHeight - geometry.stageHeight) * (2.35 / 4));
    assert.equal(seeks[0].behavior, 'instant');
    window.emit('scroll');
    flush();
    assert.equal(host.dataset.journeyIndex, '2');
  });
  await fixture(async ({ buttons, seeks, host, observers, frames, scroll, preloads, fields, items }) => {
    assert.equal(host.classList.contains('journey-static'), true);
    observers[0].show();
    buttons[2].emit('click');
    await preloads[0].onload();
    scroll(.1);
    assert.equal(seeks.length, 0);
    assert.equal(frames.size, 0);
    assert.equal(fields.title.textContent, items[2].title);
  }, { desktop: false });
});

test('pause preserves the desktop layout and freezes scroll, while manual scene selection remains usable', async () => fixture(async ({ observers, flush, document, host, buttons, preloads, fields, items, copy, frames, scroll, seeks, window }) => {
  observers[0].show();
  flush();
  document.documentElement.dataset.motion = 'paused';
  document.emit('ecolive:motionchange');
  assert.equal(host.classList.contains('journey-static'), false);
  assert.equal(host.classList.contains('journey-paused'), true);
  scroll(.8);
  assert.equal(frames.size, 0);
  buttons[1].emit('click');
  await preloads[0].onload();
  assert.equal(fields.title.textContent, items[1].title);
  assert.equal(copy.animations.length, 0);
  assert.equal(seeks.length, 0);
  document.documentElement.dataset.motion = 'running';
  document.emit('ecolive:motionchange');
  window.emit('resize');
  assert.equal(frames.size, 0, 'resuming does not overwrite an explicit paused selection');
  scroll(.81);
  assert.equal(frames.size, 1);
  flush();
  assert.equal(host.dataset.journeyIndex, '3');
}));

test('offscreen, hidden and reduced-motion modes gate scroll work and retain manual navigation', async () => fixture(async ({ observers, flush, frames, scroll, document, reduced, host, buttons, preloads, fields, items, seeks, copy }) => {
  scroll(.4);
  assert.equal(frames.size, 0);
  observers[0].show();
  assert.equal(frames.size, 1);
  document.hidden = true;
  document.emit('visibilitychange');
  assert.equal(frames.size, 0);
  scroll(.6);
  assert.equal(frames.size, 0);
  document.hidden = false;
  document.emit('visibilitychange');
  assert.equal(frames.size, 1);
  observers[0].show(false);
  assert.equal(frames.size, 0);
  reduced.matches = true;
  reduced.emit('change');
  observers[0].show();
  assert.equal(host.classList.contains('journey-static'), true);
  assert.equal(frames.size, 0);
  buttons[3].emit('click');
  await preloads[0].onload();
  flush();
  assert.equal(fields.title.textContent, items[3].title);
  assert.equal(copy.animations.length, 0);
  assert.equal(seeks.length, 0);
}));

test('keyboard arrows wrap and Home/End preserve focused controls; previous and next wrap too', async () => fixture(({ buttons, previous, next, host, seeks }) => {
  const end = buttons[0].emit('keydown', { key: 'End' });
  assert.equal(end.defaultPrevented, true);
  assert.equal(buttons[3].focused, true);
  assert.deepEqual(buttons[3].focusOptions, { preventScroll: true });
  assert.equal(host.dataset.journeyIndex, '3');
  buttons[3].emit('keydown', { key: 'ArrowRight' });
  assert.equal(host.dataset.journeyIndex, '0');
  buttons[0].emit('keydown', { key: 'ArrowUp' });
  assert.equal(host.dataset.journeyIndex, '3');
  buttons[3].emit('keydown', { key: 'Home' });
  assert.equal(host.dataset.journeyIndex, '0');
  previous.emit('click');
  assert.equal(host.dataset.journeyIndex, '3');
  next.emit('click');
  assert.equal(host.dataset.journeyIndex, '0');
  const unrelated = buttons[0].emit('keydown', { key: 'Tab' });
  assert.equal(unrelated.defaultPrevented, false);
  assert.equal(seeks.length, 0);
}, { desktop: false }));

test('obsolete preload and mounted-image decodes cannot replace the latest image or its matching copy', async () => {
  await fixture(async ({ buttons, preloads, photos, fields, items, link }) => {
    buttons[1].emit('click');
    const gate = deferred();
    preloads[0].decodeQueue.push(gate.promise);
    const stale = preloads[0].onload();
    buttons[3].emit('click');
    await preloads[1].onload();
    gate.resolve();
    await stale;
    const active = photos.filter(photo => photo.classList.contains('is-current'));
    assert.equal(active.length, 1);
    assert.equal(active[0].src, items[3].image.src);
    assert.equal(fields.title.textContent, items[3].title);
    assert.equal(link.href, items[3].href);
  });
  await fixture(async ({ buttons, preloads, photos, fields, items, scene }) => {
    buttons[1].emit('click');
    const gate = deferred();
    photos[1].decodeQueue.push(gate.promise);
    const stale = preloads[0].onload();
    await Promise.resolve();
    buttons[2].emit('click');
    await preloads[1].onload();
    gate.resolve();
    await stale;
    const active = photos.filter(photo => photo.classList.contains('is-current'));
    assert.equal(active.length, 1);
    assert.equal(active[0].src, items[2].image.src);
    assert.equal(fields.title.textContent, items[2].title);
    assert.equal(scene.getAttribute('aria-busy'), 'false');
  });
});

test('image failures keep prior content, never retry on unchanged scroll selection, and permit explicit retry', async () => fixture(async ({ buttons, photos, fields, preloads, items, scene, status, link, observers, scroll, flush }) => {
  observers[0].show();
  flush();
  buttons[3].emit('click');
  preloads[0].onerror();
  assert.equal(photos[0].classList.contains('is-current'), true);
  assert.equal(fields.title.textContent, items[0].title);
  assert.equal(link.href, items[0].href);
  assert.match(status.textContent, /Önceki sahne/);
  assert.equal(scene.getAttribute('aria-busy'), 'false');
  for (const fraction of [.81, .86, .91]) {
    scroll(fraction);
    flush();
  }
  assert.equal(preloads.length, 1, 'scrolling within a failed scene must not repeatedly retry its network request');
  buttons[3].emit('click');
  assert.equal(preloads.length, 2, 'explicitly choosing the failed scene starts a fresh request');
  const failure = deferred();
  photos[1].decodeQueue.push(failure.promise);
  const loading = preloads[1].onload();
  await Promise.resolve();
  failure.reject(new Error('decode failed'));
  await loading;
  assert.equal(photos[0].classList.contains('is-current'), true);
  assert.equal(fields.title.textContent, items[0].title);
  assert.equal(scene.getAttribute('aria-busy'), 'false');
  for (const fraction of [.88, .94]) {
    scroll(fraction);
    flush();
  }
  assert.equal(preloads.length, 2, 'mounted-image decode failures also stay quiet during unchanged scene scroll');
  buttons[3].emit('click');
  assert.equal(preloads.length, 3);
  await preloads[2].onload();
  assert.equal(photos[1].src, items[3].image.src);
  assert.equal(photos[1].classList.contains('is-current'), true);
  assert.equal(fields.title.textContent, items[3].title);
  assert.equal(photos[0].getAttribute('aria-hidden'), 'true');
  assert.equal(photos[1].getAttribute('aria-hidden'), null);
}));

test('BFCache pagehide invalidates pending decode and pageshow restores it; disposal removes every event and queued frame', async () => fixture(async ({ buttons, preloads, photos, fields, items, scene, window, observers, frames, flush, dispose, host }) => {
  observers[0].show();
  flush();
  buttons[2].emit('click');
  const gate = deferred();
  photos[1].decodeQueue.push(gate.promise);
  const stale = preloads[0].onload();
  await Promise.resolve();
  window.emit('pagehide');
  assert.equal(preloads[0].onload, null);
  assert.equal(preloads[0].onerror, null);
  assert.equal(scene.getAttribute('aria-busy'), 'false');
  assert.equal(frames.size, 0);
  gate.resolve();
  await stale;
  assert.equal(fields.title.textContent, items[0].title);
  assert.equal(photos[0].classList.contains('is-current'), true);
  window.emit('pageshow');
  assert.equal(preloads.length, 2);
  await preloads[1].onload();
  assert.equal(fields.title.textContent, items[2].title);
  assert.equal(frames.size, 1);
  dispose();
  assert.equal(frames.size, 0);
  assert.equal(host.classList.contains('journey-ready'), false);
  assert.equal(observers[0].disconnected, true);
  buttons[0].emit('click');
  window.emit('scroll');
  window.emit('pageshow');
  assert.equal(frames.size, 0);
  assert.equal(preloads.length, 2);
  assert.equal(fields.title.textContent, items[2].title);
}));
