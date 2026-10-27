/* A native-scroll story. No wheel interception, autoplay or continuous render loop. */
let disposeJourney = null;

const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));

function connectJourney(host) {
  let items;
  try { items = JSON.parse(host.querySelector('[data-journey-items]')?.textContent || '[]'); }
  catch { return () => {}; }
  const buttons = [...host.querySelectorAll('[data-journey-choice]')];
  const photos = [...host.querySelectorAll('[data-journey-image]')];
  const track = host.querySelector('[data-journey-track]');
  const stage = host.querySelector('[data-journey-stage]');
  const scene = host.querySelector('[data-journey-scene]');
  const copy = host.querySelector('[data-journey-copy]');
  const status = host.querySelector('[data-journey-status]');
  const progress = host.querySelector('[data-journey-progress]');
  const link = host.querySelector('[data-journey-link]');
  const previous = host.querySelector('[data-journey-prev]');
  const next = host.querySelector('[data-journey-next]');
  const fields = Object.fromEntries(['eyebrow', 'title', 'text', 'count', 'label'].map(key => [key, host.querySelector(`[data-journey-${key}]`)]));
  if (items.length < 2 || buttons.length !== items.length || photos.length !== 2 || !track || !stage || !scene) return () => {};

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = window.matchMedia('(min-width: 901px) and (min-height: 741px)');
  const listeners = [];
  let selected = Math.max(0, buttons.findIndex(button => button.getAttribute('aria-pressed') === 'true'));
  let displayed = selected;
  let activePhoto = Math.max(0, photos.findIndex(photo => photo.classList.contains('is-current')));
  let visible = false;
  let pageHidden = document.hidden;
  let disposed = false;
  let frame = 0;
  let request = 0;
  let pending = null;
  let copyAnimation = null;
  let scrollMode = false;
  let stickyTop = 88;
  let lastProgress = -1;
  let manualUntilScroll = false;
  let lastScrollY = window.scrollY;

  const listen = (target, type, callback, options) => {
    if (!target) return;
    target.addEventListener(type, callback, options);
    listeners.push(() => target.removeEventListener(type, callback, options));
  };
  const stopped = () => reduced.matches || document.documentElement.dataset.motion === 'paused';
  const moving = () => !disposed && visible && !pageHidden && !stopped();
  const announce = (text = '') => { if (status) status.textContent = text; };
  const busy = (value) => scene.setAttribute('aria-busy', String(value));

  function cancelFrame() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  }

  function settleImages() {
    photos.forEach(photo => {
      for (const animation of photo.getAnimations?.() || []) {
        if (animation.transitionProperty === 'opacity' && Number.isFinite(animation.effect?.getComputedTiming?.().endTime)) animation.finish();
      }
    });
  }

  function cancelImage() {
    request += 1;
    if (pending) {
      pending.onload = null;
      pending.onerror = null;
      pending.removeAttribute('srcset');
      pending.removeAttribute('src');
      pending = null;
    }
  }

  function imageSource(photo, image) {
    photo.sizes = image.sizes || '100vw';
    photo.srcset = image.srcset || '';
    photo.src = image.src;
    photo.width = image.width;
    photo.height = image.height;
    photo.alt = image.alt || '';
    photo.style.objectPosition = image.position || '50% 50%';
  }

  function showCopy(index, animate = true) {
    const item = items[index];
    for (const key of ['eyebrow', 'title', 'text', 'label']) {
      if (fields[key]) fields[key].textContent = item[key];
    }
    if (fields.count) fields.count.textContent = `${String(index + 1).padStart(2, '0')} / ${String(items.length).padStart(2, '0')}`;
    if (link) {
      link.href = item.href;
      const label = link.querySelector('[data-journey-link-label]') || link.firstElementChild;
      if (label) label.textContent = item.link;
    }
    copyAnimation?.cancel();
    if (animate && moving() && copy?.animate) {
      copyAnimation = copy.animate([{opacity: .2, transform: 'translateY(12px)'}, {opacity: 1, transform: 'translateY(0)'}], {duration: 520, easing: 'cubic-bezier(.2,.65,.25,1)'});
    }
    host.dataset.journeyScene = String(index);
  }

  function loadImage(index, manual) {
    cancelImage();
    if (index === displayed) {
      busy(false);
      announce(manual ? `${items[index].label}. ${items[index].title}` : '');
      return;
    }
    const token = request;
    const image = new Image();
    pending = image;
    busy(true);
    announce(manual ? 'Sahne hazırlanıyor.' : '');
    const current = () => !disposed && token === request && selected === index;
    const fail = () => {
      if (!current()) return;
      pending = null;
      image.onload = image.onerror = null;
      busy(false);
      announce('Bu sahnenin görseli yüklenemedi. Önceki sahne gösteriliyor; yeniden seçerek deneyebilirsiniz.');
    };
    image.decoding = 'async';
    image.onload = async () => {
      image.onload = null;
      try {
        if (image.decode) await image.decode();
        if (!current()) return;
        settleImages();
        const slot = 1 - activePhoto;
        imageSource(photos[slot], items[index].image);
        if (photos[slot].decode) await photos[slot].decode();
        if (!current()) return;
        photos[activePhoto].classList.remove('is-current');
        photos[activePhoto].setAttribute('aria-hidden', 'true');
        photos[slot].classList.add('is-current');
        photos[slot].removeAttribute('aria-hidden');
        activePhoto = slot;
        displayed = index;
        showCopy(index);
        pending = null;
        image.onerror = null;
        busy(false);
        announce(manual ? `${items[index].label}. ${items[index].title}` : '');
      } catch { fail(); }
    };
    image.onerror = fail;
    imageSource(image, items[index].image);
  }

  function setProgress(value) {
    const rounded = Math.round(clamp(value) * 1000) / 1000;
    if (rounded === lastProgress) return;
    lastProgress = rounded;
    host.style.setProperty('--journey-progress', String(rounded));
    progress?.setAttribute('aria-valuenow', String(Math.round(rounded * 100)));
  }

  function choose(index, manual = false) {
    if (disposed || !Number.isInteger(index) || index < 0 || index >= items.length) return;
    if (selected !== index || (manual && !pending && displayed !== index)) {
      selected = index;
      host.dataset.journeyIndex = String(index);
      buttons.forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
      loadImage(index, manual);
    }
    if (manual) {
      // An explicit chapter choice seeks within the native scroll track. The
      // wheel and touch gestures remain entirely owned by the browser.
      const fraction = (index + .35) / items.length;
      if (scrollMode && !stopped()) {
        const rect = track.getBoundingClientRect();
        const span = Math.max(0, rect.height - stage.getBoundingClientRect().height);
        window.scrollTo({top: window.scrollY + rect.top - stickyTop + span * fraction, behavior: 'instant'});
        setProgress(fraction);
      } else {
        manualUntilScroll = true;
        lastScrollY = window.scrollY;
        setProgress((index + 1) / items.length);
      }
    }
  }

  function update() {
    frame = 0;
    if (!moving() || !scrollMode || manualUntilScroll) return;
    const rect = track.getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();
    const span = Math.max(1, rect.height - stageRect.height);
    const value = clamp((stickyTop - rect.top) / span);
    const index = Math.min(items.length - 1, Math.floor(value * items.length));
    setProgress(value);
    choose(index);
  }

  function schedule() {
    if (!frame && moving() && scrollMode && !manualUntilScroll) frame = requestAnimationFrame(update);
  }

  function syncMotion() {
    cancelFrame();
    host.classList.toggle('journey-paused', !moving());
    if (!moving()) {
      copyAnimation?.finish();
      settleImages();
    } else schedule();
  }

  function layout() {
    if (disposed) return;
    scrollMode = desktop.matches && !reduced.matches;
    host.classList.toggle('journey-static', !scrollMode);
    if (scrollMode) stickyTop = Number.parseFloat(getComputedStyle(stage).top) || 88;
    if (!scrollMode) setProgress((selected + 1) / items.length);
    syncMotion();
  }

  buttons.forEach((button, index) => {
    button.disabled = false;
    listen(button, 'click', () => choose(index, true));
    listen(button, 'keydown', event => {
      let target;
      if (['ArrowRight', 'ArrowDown'].includes(event.key)) target = (index + 1) % items.length;
      if (['ArrowLeft', 'ArrowUp'].includes(event.key)) target = (index + items.length - 1) % items.length;
      if (event.key === 'Home') target = 0;
      if (event.key === 'End') target = items.length - 1;
      if (target === undefined) return;
      event.preventDefault();
      buttons[target].focus({preventScroll: true});
      choose(target, true);
    });
  });
  [previous, next].forEach(button => { if (button) button.disabled = false; });
  listen(previous, 'click', () => choose((selected + items.length - 1) % items.length, true));
  listen(next, 'click', () => choose((selected + 1) % items.length, true));
  listen(window, 'scroll', () => {
    if (Math.abs(window.scrollY - lastScrollY) > 2) manualUntilScroll = false;
    lastScrollY = window.scrollY;
    schedule();
  }, {passive: true});
  listen(window, 'resize', layout, {passive: true});
  listen(document, 'ecolive:motionchange', syncMotion);
  listen(document, 'visibilitychange', () => { pageHidden = document.hidden; syncMotion(); });
  listen(window, 'pagehide', () => { pageHidden = true; cancelImage(); busy(false); syncMotion(); });
  listen(window, 'pageshow', () => {
    pageHidden = document.hidden;
    const rect = host.getBoundingClientRect();
    visible = rect.bottom > 0 && rect.top < window.innerHeight;
    if (displayed !== selected) loadImage(selected, false);
    layout();
  });
  for (const query of [reduced, desktop]) {
    if (query.addEventListener) listen(query, 'change', layout);
    else { query.addListener(layout); listeners.push(() => query.removeListener(layout)); }
  }
  const observer = typeof IntersectionObserver === 'function' ? new IntersectionObserver(entries => {
    visible = entries.some(entry => entry.isIntersecting);
    syncMotion();
  }, {threshold: 0}) : null;
  if (observer) observer.observe(track);
  else visible = true;
  copy?.setAttribute('aria-live', 'off');
  host.classList.add('journey-ready');
  showCopy(selected, false);
  busy(false);
  layout();

  return () => {
    disposed = true;
    cancelFrame();
    cancelImage();
    copyAnimation?.cancel();
    observer?.disconnect();
    listeners.forEach(remove => remove());
    host.classList.remove('journey-ready', 'journey-static', 'journey-paused');
    busy(false);
  };
}

export function initImmersiveJourney() {
  if (disposeJourney) return disposeJourney;
  const cleanups = [...document.querySelectorAll('[data-journey]')].map(connectJourney);
  disposeJourney = () => { cleanups.forEach(cleanup => cleanup()); disposeJourney = null; };
  return disposeJourney;
}
