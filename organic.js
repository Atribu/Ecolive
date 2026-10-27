/* Light, local SVG surfaces: the photographs remain separate and unfiltered. */
let initialized = false;

export function initOrganic() {
  if (initialized) return;
  initialized = true;
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const pendingPointers = new Set();
  const surfaceEntries = new Map();
  let pointerFrame = 0;
  let pageHidden = document.hidden;
  const cancelPointers = () => {
    if (pointerFrame) cancelAnimationFrame(pointerFrame);
    pointerFrame = 0;
    pendingPointers.clear();
  };
  let paused = false;
  try { paused = localStorage.getItem('ecolive.motion') === 'paused'; } catch {}
  const control = document.createElement('button');
  control.type = 'button';
  control.className = 'organic-control';
  control.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 15c0-5 4-10 13-10 1 8-2 14-8 14-3 0-5-2-5-4Z"/><path d="M6 20c1-5 4-8 8-11"/><path class="organic-pause" d="M16 15v5m4-5v5"/></svg><span></span>';
  document.body.append(control);
  function preference() {
    const stopped = paused || reduced.matches;
    root.dataset.motion = stopped ? 'paused' : 'running';
    control.setAttribute('aria-pressed', String(!stopped));
    control.setAttribute('aria-label', stopped ? 'Animasyonları başlat' : 'Animasyonları duraklat');
    control.querySelector('span').textContent = stopped ? 'Hareket kapalı' : 'Canlı görünüm';
    control.disabled = reduced.matches;
    control.title = reduced.matches ? 'Cihazınızın hareketi azalt tercihi etkin' : (stopped ? 'Animasyonları başlat' : 'Animasyonları duraklat');
    if (stopped) cancelPointers();
    document.dispatchEvent(new CustomEvent('ecolive:motionchange', { detail: { paused: stopped } }));
  }
  control.addEventListener('click', () => {
    paused = !paused;
    try { localStorage.setItem('ecolive.motion', paused ? 'paused' : 'running'); } catch {}
    preference();
  });
  reduced.addEventListener('change', preference);
  preference();

  const paths = Array.from({ length: 12 }, (_, i) => {
    const d = i * 24;
    return `M${850+d} ${680+d} C${545-d*.4} ${820+d},${385-d} ${590+d},${490-d} ${390-d*.5} S${990+d} ${260-d},${860+d*.4} ${90-d} S${490-d} ${-30-d},${490-d} ${-180-d}`;
  });
  const terrain = paths.map(d => `<path d="${d}"/>`).join('');
  const ripples = Array.from({ length: 12 }, (_, i) => `<ellipse cx="790" cy="450" rx="${110+i*26}" ry="${65+i*23}" transform="rotate(-25 790 450)"/>`).join('');
  const arches = Array.from({ length: 12 }, (_, i) => `<path d="M${520-i*20} 800 V${350-i*15} C${520-i*20} ${120-i*18},${950+i*20} ${120-i*18},${950+i*20} ${350-i*15} V800"/>`).join('');
  const connections = '<path d="M360 700Q700 560 650 300T1000 30M450 30Q370 400 900 500T1080 800M200 600Q750 180 1100 400M520 800Q500 620 820 620T1010 130"/>' + [[650,300],[790,490],[560,350],[610,630],[860,195],[435,465]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="6"/><circle cx="${x}" cy="${y}" r="20" class="organic-node"/>`).join('');
  const observer = typeof IntersectionObserver === 'function' ? new IntersectionObserver(entries => {
    entries.forEach(({target,isIntersecting}) => {
      target.classList.toggle('organic-visible',isIntersecting);
      const entry = surfaceEntries.get(target);
      if (entry) {
        entry.visible = isIntersecting;
        if (!isIntersecting) pendingPointers.delete(entry);
      }
    });
  }, { rootMargin: '30px' }) : null;
  const updatePointers = () => {
    pointerFrame = 0;
    if (pageHidden || !fine.matches || root.dataset.motion === 'paused') { pendingPointers.clear(); return; }
    // Raw pointer events only store coordinates. Geometry is read once per
    // active surface and all reads precede the corresponding paint updates.
    const measurements = [...pendingPointers].filter(entry => entry.visible)
      .map(entry => ({ entry, rect: entry.surface.getBoundingClientRect() }));
    pendingPointers.clear();
    measurements.forEach(({ entry, rect }) => {
      if (!rect.width || !rect.height) return;
      entry.art.style.setProperty('--organic-x', `${Math.max(0, Math.min(100, (entry.x - rect.left) / rect.width * 100)).toFixed(2)}%`);
      entry.art.style.setProperty('--organic-y', `${Math.max(0, Math.min(100, (entry.y - rect.top) / rect.height * 100)).toFixed(2)}%`);
    });
  };
  document.querySelectorAll('[data-surface-art]').forEach((surface, index) => {
    // A future mixed photo/text surface must never receive a texture overlay.
    if (surface.querySelector('img, video, canvas, picture')) return;
    const motif = surface.dataset.surfaceArt || (document.body.matches('.theme-doga,.theme-uretim') ? 'terrain' : document.body.matches('.theme-dongu,.theme-saglik') ? 'ripples' : document.body.matches('.theme-egitim,.theme-contact') ? 'connections' : 'terrain');
    const artwork = {terrain,ripples,arches,connections}[motif] || terrain;
    const art = document.createElement('div');
    art.className = 'organic-surface';
    art.setAttribute('aria-hidden','true');
    art.innerHTML = `<svg viewBox="0 0 1100 800" fill="none" preserveAspectRatio="xMidYMid slice"><g class="organic-contours">${artwork}</g><g class="organic-current">${artwork}</g></svg><span class="organic-glow"></span>`;
    art.style.setProperty('--organic-offset', `${-index*2.7}s`);
    surface.prepend(art);
    surface.classList.add('organic-host');
    const entry = { surface, art, visible: !observer, x: 0, y: 0 };
    surfaceEntries.set(surface, entry);
    if (observer) observer.observe(surface);
    else surface.classList.add('organic-visible');
    surface.addEventListener('pointermove', e => {
      if (pageHidden || !entry.visible || !fine.matches || root.dataset.motion === 'paused' || e.pointerType === 'touch') return;
      entry.x = e.clientX;
      entry.y = e.clientY;
      pendingPointers.add(entry);
      if (!pointerFrame) pointerFrame = requestAnimationFrame(updatePointers);
    }, {passive:true});
    surface.addEventListener('pointerleave', () => pendingPointers.delete(entry), {passive:true});
    surface.addEventListener('pointercancel', () => pendingPointers.delete(entry), {passive:true});
  });

  const progress = document.createElement('div');
  progress.className = 'organic-progress';
  progress.setAttribute('aria-hidden','true');
  document.body.append(progress);
  let scrollFrame = 0;
  let metricsDirty = true;
  let range = 0;
  let viewport = 0;
  let lastProgress = '';
  let controlReady = false;
  const update = () => {
    scrollFrame = 0;
    if (pageHidden) return;
    if (metricsDirty) {
      viewport = innerHeight;
      range = root.scrollHeight - viewport;
      metricsDirty = false;
    }
    const position = scrollY;
    const value = (range > 0 ? Math.min(1, Math.max(0,position/range)) : 0).toFixed(5);
    if (value !== lastProgress) { progress.style.scale = `${value} 1`; lastProgress = value; }
    const ready = position > viewport * .45;
    if (ready !== controlReady) { control.classList.toggle('organic-control-ready', ready); controlReady = ready; }
  };
  const schedule = () => { if (!scrollFrame && !pageHidden) scrollFrame=requestAnimationFrame(update); };
  const invalidate = () => { metricsDirty = true; schedule(); };
  const visibility = (hidden = document.hidden) => {
    pageHidden = hidden;
    root.classList.toggle('organic-hidden', hidden);
    if (hidden) {
      cancelPointers();
      if (scrollFrame) cancelAnimationFrame(scrollFrame);
      scrollFrame = 0;
    } else invalidate();
  };
  addEventListener('scroll',schedule,{passive:true});
  addEventListener('resize',invalidate,{passive:true});
  document.addEventListener('load',invalidate,true);
  document.addEventListener('toggle',invalidate,true);
  document.addEventListener('visibilitychange', () => visibility());
  addEventListener('pagehide', () => visibility(true));
  addEventListener('pageshow', () => visibility());
  if (typeof ResizeObserver === 'function') {
    const layoutObserver = new ResizeObserver(invalidate);
    layoutObserver.observe(document.body);
    layoutObserver.observe(root);
  }
  visibility();
}
