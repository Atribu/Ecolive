/* Small, event-driven camera movement. Native scrolling always stays native. */
export function initExperience() {
  const root = document.documentElement;
  const hero = document.querySelector('[data-scene-hero]');
  if (!hero) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;
  let visible = typeof IntersectionObserver !== 'function';
  let pageHidden = document.hidden;
  let lastProgress = '';
  const allowed = () => !reduced.matches && root.dataset.motion !== 'paused' && !pageHidden;
  const update = () => {
    frame = 0;
    if (!allowed() || !visible) return;
    const rect = hero.getBoundingClientRect();
    if (rect.height <= 0 || rect.bottom < 0 || rect.top > innerHeight) return;
    const progress = Math.min(1, Math.max(0, -rect.top / rect.height)).toFixed(4);
    if (progress !== lastProgress) {
      hero.style.setProperty('--scene-progress', progress);
      lastProgress = progress;
    }
  };
  const schedule = () => { if (!frame && visible && allowed()) frame = requestAnimationFrame(update); };
  const sync = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    if (!allowed()) { hero.style.removeProperty('--scene-progress'); lastProgress = ''; }
    else schedule();
  };
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule, { passive: true });
  addEventListener('pageshow', () => { pageHidden = document.hidden; sync(); });
  addEventListener('pagehide', () => { pageHidden = true; sync(); });
  document.addEventListener('visibilitychange', () => { pageHidden = document.hidden; sync(); });
  document.addEventListener('ecolive:motionchange', sync);
  reduced.addEventListener('change', sync);
  if (typeof IntersectionObserver === 'function') {
    const observer = new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting);
      if (visible) schedule();
      else { cancelAnimationFrame(frame); frame = 0; }
    }, { rootMargin: '100px 0px' });
    observer.observe(hero);
  }
  schedule();
}
