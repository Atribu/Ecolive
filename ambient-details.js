/* Event-driven finishing details. Artwork and clickable hit areas never move. */
let disposeAmbient = null;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const arrowDirection = (text) => ({
  '↗': [2, -2], '→': [3, 0], '↓': [0, 3], '↑': [0, -3],
  '↖': [-2, -2], '↘': [2, 2], '↙': [-2, 2], '←': [-3, 0],
}[text]);

function contourLayer() {
  const layer = document.createElement('div');
  layer.className = 'ambient-surface';
  layer.setAttribute('aria-hidden', 'true');
  // A local light trace, not another glow; the existing organic surface remains intact.
  layer.innerHTML = '<svg viewBox="0 0 1000 700" preserveAspectRatio="none" focusable="false"><path d="M-90 610C150 660 220 340 480 405S810 660 1110 320"/><path d="M-80 575C165 630 235 310 495 375S825 630 1120 285"/><path d="M-70 540C180 600 250 280 510 345S840 600 1130 250"/></svg>';
  return layer;
}

export function initAmbientDetails() {
  if (disposeAmbient) return disposeAmbient;
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  const cleanups = [];
  const pending = new Set();
  const entries = [];
  let frame = 0;
  let disposed = false;
  let pageHidden = document.hidden;
  const allowed = () => !disposed && !pageHidden && !reduced.matches && root.dataset.motion !== 'paused';
  const listen = (target, name, handler, options) => {
    target.addEventListener(name, handler, options);
    cleanups.push(() => target.removeEventListener(name, handler, options));
  };

  function cancelRipple(entry) {
    entry.animation?.cancel();
    entry.animation = null;
    entry.ripple?.remove();
    entry.ripple = null;
  }

  function reset(entry) {
    pending.delete(entry);
    entry.active = false;
    entry.element.classList.remove('ambient-surface-active', 'ambient-control-active');
    if (entry.arrow) {
      entry.arrow.style.removeProperty('--ambient-arrow-x');
      entry.arrow.style.removeProperty('--ambient-arrow-y');
    }
    cancelRipple(entry);
    if (!pending.size && frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  }

  function update() {
    frame = 0;
    if (!allowed() || !fine.matches) { pending.clear(); return; }
    // One read pass and one write pass, shared by every hovered surface/control.
    const measurements = [...pending].filter((entry) => entry.active && entry.visible)
      .map((entry) => ({ entry, rect: entry.element.getBoundingClientRect() }));
    pending.clear();
    measurements.forEach(({ entry, rect }) => {
      if (!rect.width || !rect.height) return;
      const x = clamp(entry.clientX - rect.left, 0, rect.width);
      const y = clamp(entry.clientY - rect.top, 0, rect.height);
      if (entry.layer) {
        entry.layer.style.setProperty('--ambient-light-x', `${x.toFixed(1)}px`);
        entry.layer.style.setProperty('--ambient-light-y', `${y.toFixed(1)}px`);
        entry.layer.style.setProperty('--ambient-contour-x', `${((x / rect.width - .5) * 7).toFixed(2)}px`);
        entry.layer.style.setProperty('--ambient-contour-y', `${((y / rect.height - .5) * 5).toFixed(2)}px`);
      } else {
        entry.arrow.style.setProperty('--ambient-arrow-x', `${((x / rect.width - .5) * 8).toFixed(2)}px`);
        entry.arrow.style.setProperty('--ambient-arrow-y', `${((y / rect.height - .5) * 6).toFixed(2)}px`);
      }
    });
  }

  function point(entry, event) {
    if (!allowed() || !fine.matches || !entry.visible || event.pointerType === 'touch') return;
    entry.clientX = event.clientX;
    entry.clientY = event.clientY;
    entry.active = true;
    entry.element.classList.add(entry.layer ? 'ambient-surface-active' : 'ambient-control-active');
    pending.add(entry);
    if (!frame) frame = requestAnimationFrame(update);
  }

  function ripple(entry, event) {
    if (!allowed() || !entry.visible || event.button > 0 || entry.element.matches(':disabled, [aria-disabled="true"]')) return;
    cancelRipple(entry);
    const rect = entry.element.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dot = document.createElement('i');
    const size = Math.hypot(rect.width, rect.height) * 2;
    dot.style.width = `${size}px`;
    dot.style.height = `${size}px`;
    dot.style.left = `${clamp(event.clientX - rect.left, 0, rect.width)}px`;
    dot.style.top = `${clamp(event.clientY - rect.top, 0, rect.height)}px`;
    entry.press.append(dot);
    entry.ripple = dot;
    if (typeof dot.animate !== 'function') { dot.remove(); entry.ripple = null; return; }
    const animation = dot.animate([
      { transform: 'translate(-50%, -50%) scale(.04)', opacity: .18 },
      { transform: 'translate(-50%, -50%) scale(1)', opacity: 0 },
    ], { duration: 620, easing: 'cubic-bezier(.2,.7,.3,1)' });
    entry.animation = animation;
    animation.onfinish = () => {
      dot.remove();
      if (entry.animation === animation) { entry.animation = null; entry.ripple = null; }
    };
  }

  document.querySelectorAll('[data-surface-art]').forEach((element) => {
    // Never apply an effect to a mixed image/text panel, even if marked in future content.
    if (element.querySelector('img, picture, video, canvas')) return;
    const layer = contourLayer();
    element.append(layer);
    element.classList.add('ambient-surface-host');
    entries.push({ element, layer, visible: false, active: false });
  });

  document.querySelectorAll('.text-link, a.button, button.button').forEach((element) => {
    const arrow = [...element.children].find((child) => child.tagName === 'SPAN' && arrowDirection(child.textContent.trim()));
    if (!arrow) return;
    const direction = arrowDirection(arrow.textContent.trim());
    const press = document.createElement('span');
    press.className = 'ambient-press';
    press.setAttribute('aria-hidden', 'true');
    element.append(press);
    element.classList.add('ambient-control');
    arrow.classList.add('ambient-arrow');
    arrow.style.setProperty('--ambient-focus-x', `${direction[0]}px`);
    arrow.style.setProperty('--ambient-focus-y', `${direction[1]}px`);
    const entry = { element, arrow, press, visible: false, active: false, ripple: null, animation: null };
    entries.push(entry);
    listen(element, 'pointerdown', (event) => ripple(entry, event), { passive: true });
  });

  entries.forEach((entry) => {
    listen(entry.element, 'pointerenter', (event) => point(entry, event), { passive: true });
    listen(entry.element, 'pointermove', (event) => point(entry, event), { passive: true });
    listen(entry.element, 'pointerleave', () => reset(entry), { passive: true });
    listen(entry.element, 'pointercancel', () => reset(entry), { passive: true });
  });

  const byElement = new Map(entries.map((entry) => [entry.element, entry]));
  const observer = typeof IntersectionObserver === 'function' ? new IntersectionObserver((observed) => {
    observed.forEach(({ target, isIntersecting }) => {
      const entry = byElement.get(target);
      if (!entry) return;
      entry.visible = isIntersecting;
      if (!isIntersecting) reset(entry);
    });
  }, { threshold: 0 }) : null;
  if (observer) entries.forEach((entry) => observer.observe(entry.element));
  else entries.forEach((entry) => { entry.visible = true; });

  function sync() {
    root.classList.toggle('ambient-details-still', !allowed());
    // Returning from a hidden tab never resumes stale pointer coordinates or a press.
    entries.forEach(reset);
  }
  listen(document, 'ecolive:motionchange', sync);
  listen(document, 'visibilitychange', () => { pageHidden = document.hidden; sync(); });
  listen(window, 'pagehide', () => { pageHidden = true; sync(); });
  listen(window, 'pageshow', () => { pageHidden = document.hidden; sync(); });
  [reduced, fine].forEach((media) => {
    if (media.addEventListener) listen(media, 'change', sync);
    else { media.addListener(sync); cleanups.push(() => media.removeListener(sync)); }
  });
  sync();

  disposeAmbient = () => {
    if (disposed) return;
    disposed = true;
    entries.forEach(reset);
    observer?.disconnect();
    cleanups.forEach((cleanup) => cleanup());
    entries.forEach(({ element, layer, arrow, press }) => {
      element.classList.remove('ambient-surface-host', 'ambient-control');
      layer?.remove();
      press?.remove();
      if (arrow) {
        arrow.classList.remove('ambient-arrow');
        arrow.style.removeProperty('--ambient-focus-x');
        arrow.style.removeProperty('--ambient-focus-y');
      }
    });
    root.classList.remove('ambient-details-still');
    disposeAmbient = null;
  };
  return disposeAmbient;
}
