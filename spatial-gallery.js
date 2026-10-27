// Native scroll and native modal semantics, with an event-driven image transition.
let disposeGallery = null;

function connectGallery(host) {
  let items;
  try { items = JSON.parse(host.querySelector('[data-spatial-items]')?.textContent || '[]'); }
  catch { return () => {}; }
  const links = [...host.querySelectorAll('[data-spatial-open]')];
  const cards = [...host.querySelectorAll('[data-spatial-card]')];
  const composition = host.querySelector('[data-spatial-composition]');
  const dialog = host.querySelector('[data-spatial-dialog]');
  const target = host.querySelector('[data-spatial-target]');
  const detailImage = host.querySelector('[data-spatial-detail-image]');
  const caption = host.querySelector('[data-spatial-caption]');
  const veil = host.querySelector('[data-spatial-veil]');
  const closeButton = host.querySelector('[data-spatial-close]');
  if (!items.length || items.length !== links.length || !composition || !dialog?.showModal || !target || !detailImage || !caption || !closeButton) return () => {};

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = matchMedia('(min-width: 1001px)');
  const listeners = [];
  let visible = false;
  let disposed = false;
  let raf = 0;
  let operation = 0;
  let phase = 'idle';
  let source = null;
  let sourceImage = null;
  let flight = null;
  let flightAnimation = null;
  let captionAnimation = null;
  let veilAnimation = null;
  let motionDestination = null;
  const stopped = () => reduced.matches || document.documentElement.dataset.motion === 'paused';
  const listen = (node, type, handler, options) => { node.addEventListener(type, handler, options); listeners.push(() => node.removeEventListener(type, handler, options)); };
  const rectOf = element => {
    const rect = element.getBoundingClientRect();
    return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
  };
  const clearFlight = () => { flightAnimation?.cancel(); flightAnimation = null; flight?.remove(); flight = null; };
  const revealSource = () => { if (sourceImage) sourceImage.style.removeProperty('visibility'); };
  const sourceRect = () => rectOf(source?.querySelector('.spatial-image-window') || sourceImage);

  function shade(opening) {
    if (!veil) return;
    const opacity = opening ? 0 : Number(getComputedStyle(veil).opacity);
    veilAnimation?.cancel();
    veilAnimation = null;
    if (!stopped() && veil.animate) veilAnimation = veil.animate([{ opacity }, { opacity: opening ? 1 : 0 }], { duration: opening ? 620 : 500, easing: 'ease-out', fill: 'both' });
  }

  function cancelFrame() { if (raf) cancelAnimationFrame(raf); raf = 0; }
  function updateDepth() {
    raf = 0;
    if (!visible || stopped() || !desktop.matches || document.hidden || dialog.open || disposed) return;
    const bounds = composition.getBoundingClientRect();
    const progress = Math.max(-1, Math.min(1, (innerHeight / 2 - (bounds.top + bounds.height / 2)) / ((bounds.height + innerHeight) / 2)));
    cards.forEach((card, index) => {
      const depth = [26, -21, 18, -30][index] || 0;
      card.style.setProperty('--spatial-drift', `${(progress * depth).toFixed(2)}px`);
      card.style.setProperty('--spatial-angle', `${(progress * (index % 2 ? -.7 : .7)).toFixed(3)}deg`);
    });
  }
  function schedule() { if (!raf && visible && !stopped() && desktop.matches && !document.hidden && !dialog.open && !disposed) raf = requestAnimationFrame(updateDepth); }

  function captionIn(animate) {
    captionAnimation?.cancel();
    caption.style.removeProperty('opacity');
    if (animate && caption.animate) captionAnimation = caption.animate([{ opacity: 0, transform: 'translateY(15px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 560, delay: 80, easing: 'cubic-bezier(.22,.72,.2,1)', fill: 'backwards' });
  }

  function settleOpen(animate = false) {
    clearFlight();
    veilAnimation?.cancel();
    veilAnimation = null;
    dialog.classList.remove('is-transforming');
    phase = 'open';
    motionDestination = null;
    captionIn(animate);
  }

  function settleClosed() {
    operation += 1;
    clearFlight();
    captionAnimation?.cancel();
    captionAnimation = null;
    veilAnimation?.cancel();
    veilAnimation = null;
    dialog.classList.remove('is-transforming');
    revealSource();
    phase = 'idle';
    motionDestination = null;
    document.body.classList.remove('spatial-dialog-open');
    if (dialog.open) dialog.close();
    source?.focus({ preventScroll: true });
    source = null;
    sourceImage = null;
    schedule();
  }

  function fly(from, to, onFinish) {
    const token = ++operation;
    clearFlight();
    if (stopped() || !detailImage.animate || from.width < 1 || from.height < 1 || to.width < 1 || to.height < 1) { onFinish(); return; }
    dialog.classList.add('is-transforming');
    flight = document.createElement('img');
    flight.className = 'spatial-flight';
    flight.alt = '';
    flight.setAttribute('aria-hidden', 'true');
    flight.src = detailImage.currentSrc || detailImage.src;
    flight.style.objectPosition = detailImage.style.objectPosition;
    Object.assign(flight.style, { left: `${to.left}px`, top: `${to.top}px`, width: `${to.width}px`, height: `${to.height}px` });
    dialog.append(flight);
    // FLIP the existing image from its measured source position to its modal position.
    const transform = `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})`;
    flightAnimation = flight.animate([{ transform }, { transform: 'translate(0,0) scale(1,1)' }], { duration: phase === 'closing' ? 520 : 760, easing: 'cubic-bezier(.2,.75,.15,1)', fill: 'both' });
    motionDestination = onFinish;
    flightAnimation.finished.then(() => { if (token === operation && !disposed) onFinish(); }).catch(() => {});
  }

  function open(index) {
    if (dialog.open || disposed) return;
    source = links[index];
    sourceImage = source.querySelector('img');
    const item = items[index];
    if (!sourceImage || !item) return;
    const from = sourceRect();
    detailImage.removeAttribute('srcset');
    detailImage.src = sourceImage.currentSrc || item.image.src;
    detailImage.alt = item.image.alt;
    detailImage.style.objectPosition = item.image.position;
    target.style.setProperty('--spatial-ratio', String(item.image.width / item.image.height));
    dialog.querySelector('[data-spatial-detail-label]').textContent = item.label;
    dialog.querySelector('[data-spatial-detail-title]').textContent = item.title;
    dialog.querySelector('[data-spatial-detail-copy]').textContent = item.text;
    dialog.querySelector('[data-spatial-detail-count]').textContent = `0${index + 1} / 0${items.length}`;
    phase = 'opening';
    caption.style.opacity = '0';
    document.body.classList.add('spatial-dialog-open');
    dialog.showModal();
    shade(true);
    closeButton.focus({ preventScroll: true });
    sourceImage.style.visibility = 'hidden';
    fly(from, rectOf(target), () => {
      settleOpen(!stopped());
      // The first frame uses the already decoded source; load the appropriate larger
      // responsive candidate only after the transition is complete.
      detailImage.sizes = '(max-width: 700px) 96vw, 88vw';
      detailImage.srcset = item.image.srcset;
      detailImage.src = item.image.src;
    });
  }

  function close() {
    if (!dialog.open || phase === 'closing' || phase === 'idle') return;
    const from = flight ? rectOf(flight) : rectOf(target);
    const destination = sourceImage ? sourceRect() : from;
    const sourceVisible = destination.top + destination.height > 0 && destination.top < innerHeight && destination.left + destination.width > 0 && destination.left < innerWidth;
    captionAnimation?.cancel();
    caption.style.opacity = '0';
    phase = 'closing';
    if (stopped() || !sourceVisible || document.hidden) settleClosed();
    else { shade(false); fly(from, destination, settleClosed); }
  }

  function motionChanged() {
    if (stopped()) {
      cancelFrame();
      cards.forEach(card => { card.style.removeProperty('--spatial-drift'); card.style.removeProperty('--spatial-angle'); });
      if (motionDestination) { const finish = motionDestination; operation += 1; finish(); }
      captionAnimation?.cancel();
    }
    schedule();
  }

  links.forEach((link, index) => listen(link, 'click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    open(index);
  }));
  listen(closeButton, 'click', close);
  listen(dialog, 'cancel', event => { event.preventDefault(); close(); });
  listen(dialog, 'click', event => { if (event.target === dialog) close(); });
  listen(dialog, 'close', () => { if (phase !== 'idle') settleClosed(); });
  listen(window, 'scroll', schedule, { passive: true });
  listen(window, 'resize', () => {
    if (motionDestination) { const finish = motionDestination; operation += 1; finish(); }
    if (!desktop.matches) cards.forEach(card => { card.style.removeProperty('--spatial-drift'); card.style.removeProperty('--spatial-angle'); });
    schedule();
  }, { passive: true });
  listen(document, 'ecolive:motionchange', motionChanged);
  listen(document, 'visibilitychange', () => { if (document.hidden) { cancelFrame(); if (motionDestination) { const finish = motionDestination; operation += 1; finish(); } } else schedule(); });
  listen(window, 'pagehide', () => { cancelFrame(); if (dialog.open) settleClosed(); });
  listen(window, 'pageshow', schedule);
  for (const query of [reduced, desktop]) {
    if (query.addEventListener) listen(query, 'change', motionChanged);
    else { query.addListener(motionChanged); listeners.push(() => query.removeListener(motionChanged)); }
  }
  const observer = typeof IntersectionObserver === 'function' ? new IntersectionObserver(entries => { visible = entries.some(entry => entry.isIntersecting); if (visible) schedule(); else cancelFrame(); }, { rootMargin: '80px 0px' }) : null;
  if (observer) observer.observe(composition);
  else { visible = true; schedule(); }
  host.classList.add('spatial-ready');
  return () => {
    disposed = true;
    cancelFrame();
    if (dialog.open) settleClosed();
    clearFlight();
    captionAnimation?.cancel();
    observer?.disconnect();
    listeners.forEach(remove => remove());
    cards.forEach(card => { card.style.removeProperty('--spatial-drift'); card.style.removeProperty('--spatial-angle'); });
    host.classList.remove('spatial-ready');
  };
}

export function initSpatialGallery() {
  disposeGallery?.();
  const cleanups = [...document.querySelectorAll('[data-spatial-gallery]')].map(connectGallery);
  disposeGallery = () => cleanups.forEach(cleanup => cleanup());
  return disposeGallery;
}
