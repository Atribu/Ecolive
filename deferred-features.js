/** Load enhancements shortly before their sections enter view. Static content stays usable. */
export function loadWhenNear(selector, load, { margin = "1000px" } = {}) {
  const targets = [...document.querySelectorAll(selector)];
  if (!targets.length) return;
  let pending;
  let complete = false;
  let observer;
  const events = ["focusin", "pointerenter", "pointerdown"];
  const start = () => {
    if (complete) return Promise.resolve();
    if (pending) return pending;
    pending = Promise.resolve().then(load).then(() => {
      complete = true;
      observer?.disconnect();
      targets.forEach(target => events.forEach(event => target.removeEventListener(event, start)));
    }).catch(() => {
      // Keep the static fallback and allow another interaction to retry a failed download.
      pending = null;
    });
    return pending;
  };
  targets.forEach(target => events.forEach(event => target.addEventListener(event, start, { passive: true })));
  if (typeof IntersectionObserver !== "function") {
    start();
    return;
  }
  observer = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) start();
  }, { rootMargin: margin });
  targets.forEach(target => observer.observe(target));
  return start;
}
