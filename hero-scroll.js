/* The homepage video advances only with the visitor's natural scroll position. */
let disposeHeroScroll = null;

export function initHeroScroll() {
  if (disposeHeroScroll) return disposeHeroScroll;

  const hero = document.querySelector(".hero[data-scroll-hero]");
  const video = hero?.querySelector("[data-hero-video]");
  const stage = hero?.querySelector(".hero-sticky");
  if (!hero || !video || !stage) return () => {};
  const poster = hero.querySelector(".hero-media img");

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const compact = window.matchMedia("(max-width: 760px)");
  const connection = navigator.connection;
  const supported =
    typeof CSS !== "undefined" &&
    CSS.supports("position", "sticky") &&
    Boolean(video.canPlayType("video/mp4"));
  const variables = [
    "--hero-progress",
    "--hero-title-shift",
    "--hero-title-opacity",
    "--hero-bottom-opacity",
    "--hero-bottom-events",
  ];
  const cleanupListeners = [];
  const epsilon = 1 / 30;
  let disposed = false;
  let enabled = false;
  let failed = false;
  let pageHidden = document.hidden;
  let raf = 0;
  let startFrame = 0;
  let loadTimeout = 0;
  let mediaStarted = false;
  let posterReady = false;
  let criticalReady = false;
  let scrollIntent = false;
  let seeking = false;
  let targetTime = 0;
  let selectedSource = "";
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const allowed = () => supported && !reduced.matches && !connection?.saveData;
  const listen = (target, type, handler, options) => {
    target.addEventListener(type, handler, options);
    cleanupListeners.push(() =>
      target.removeEventListener(type, handler, options),
    );
  };
  const listenMedia = (query, handler) => {
    if (query.addEventListener) listen(query, "change", handler);
    else {
      query.addListener(handler);
      cleanupListeners.push(() => query.removeListener(handler));
    }
  };

  function cancelFrame() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  function clearLoadTimeout() {
    if (loadTimeout) clearTimeout(loadTimeout);
    loadTimeout = 0;
  }

  function cancelMediaStart() {
    if (startFrame) cancelAnimationFrame(startFrame);
    startFrame = 0;
  }

  function canStartMedia() {
    return (
      !disposed &&
      enabled &&
      !pageHidden &&
      !mediaStarted &&
      allowed() &&
      posterReady &&
      (criticalReady || scrollIntent)
    );
  }

  function startMedia() {
    if (!canStartMedia()) return;
    mediaStarted = true;
    video.preload = "auto";
    video.src = selectedSource;
    video.load();
    watchInitialLoad();
    schedule();
  }

  function queueMediaStart() {
    if (startFrame || !canStartMedia()) return;
    // Give the decoded poster a painted frame before the video competes for bandwidth.
    // Scroll intent skips document/font waits, while keeping that first image visible.
    startFrame = requestAnimationFrame(() => {
      startFrame = 0;
      if (!canStartMedia()) return;
      startFrame = requestAnimationFrame(() => {
        startFrame = 0;
        startMedia();
      });
    });
  }

  function disable() {
    enabled = false;
    cancelFrame();
    cancelMediaStart();
    clearLoadTimeout();
    video.pause();
    // Removing the source also aborts an in-flight download after a preference change.
    if (video.hasAttribute("src")) {
      video.removeAttribute("src");
      video.load();
    }
    mediaStarted = false;
    video.preload = "none";
    seeking = false;
    targetTime = 0;
    hero.classList.remove("hero-scroll-enabled", "hero-video-ready");
    variables.forEach((name) => hero.style.removeProperty(name));
  }

  function fail() {
    if (!enabled || disposed) return;
    failed = true;
    disable();
  }

  function watchInitialLoad() {
    clearLoadTimeout();
    if (
      !enabled ||
      !mediaStarted ||
      pageHidden ||
      hero.classList.contains("hero-video-ready")
    )
      return;
    // A stalled initial download must not leave a long, motionless poster section.
    loadTimeout = setTimeout(fail, 20000);
  }

  function frameAvailable() {
    if (!enabled || video.readyState < 2 || video.seeking || seeking) return;
    hero.classList.add("hero-video-ready");
    clearLoadTimeout();
  }

  function seekToLatest() {
    if (
      !enabled ||
      pageHidden ||
      seeking ||
      video.seeking ||
      video.readyState < 1 ||
      !Number.isFinite(video.duration) ||
      video.duration <= 0
    )
      return;
    const safeEnd = Math.max(0, video.duration - 0.04);
    const nextTime = clamp(targetTime, 0, safeEnd);
    if (Math.abs(video.currentTime - nextTime) < epsilon) {
      frameAvailable();
      return;
    }
    seeking = true;
    try {
      // Exact seeks preserve the same scene when scrolling back up; playback is never started.
      video.currentTime = nextTime;
    } catch {
      seeking = false;
      fail();
    }
  }

  function update() {
    raf = 0;
    if (disposed || !enabled || pageHidden) return;
    const rect = hero.getBoundingClientRect();
    const range = Math.max(1, hero.offsetHeight - stage.offsetHeight);
    const progress = clamp(-rect.top / range, 0, 1);
    const titleOpacity = 1 - clamp((progress - 0.08) / 0.52, 0, 1);
    const bottomOpacity = 1 - clamp((progress - 0.02) / 0.2, 0, 1);
    hero.style.setProperty("--hero-progress", progress.toFixed(5));
    hero.style.setProperty(
      "--hero-title-shift",
      `${(-progress * (compact.matches ? 45 : 90)).toFixed(2)}px`,
    );
    hero.style.setProperty("--hero-title-opacity", titleOpacity.toFixed(4));
    hero.style.setProperty("--hero-bottom-opacity", bottomOpacity.toFixed(4));
    hero.style.setProperty(
      "--hero-bottom-events",
      bottomOpacity > 0.01 ? "auto" : "none",
    );
    targetTime =
      Number.isFinite(video.duration) && video.duration > 0
        ? progress * Math.max(0, video.duration - 0.04)
        : 0;
    seekToLatest();
    // There is no idle animation loop: scroll, layout, or media events request each frame.
  }

  function schedule() {
    if (!raf && !disposed && enabled && !pageHidden)
      raf = requestAnimationFrame(update);
  }

  function enable() {
    if (disposed || enabled || failed || !allowed()) return;
    // Pick one source for this visit. Resizing never starts a second video download.
    selectedSource ||= compact.matches
      ? video.dataset.mobileSrc || video.dataset.src
      : video.dataset.src;
    if (!selectedSource) return;
    enabled = true;
    seeking = false;
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.autoplay = false;
    video.loop = false;
    video.pause();
    hero.classList.add("hero-scroll-enabled");
    // Reserve the accepted scroll track immediately; loading later cannot move content.
    queueMediaStart();
    schedule();
  }

  function preferenceChanged() {
    if (!allowed()) disable();
    else enable();
  }

  function setVisibility(hidden) {
    pageHidden = hidden;
    if (hidden) {
      cancelFrame();
      cancelMediaStart();
      clearLoadTimeout();
      video.pause();
    } else {
      preferenceChanged();
      queueMediaStart();
      watchInitialLoad();
      schedule();
    }
  }

  function requestByIntent() {
    if (!enabled || pageHidden) return;
    scrollIntent = true;
    queueMediaStart();
  }

  function scrollChanged() {
    requestByIntent();
    schedule();
  }

  function keyIntent(event) {
    if (
      event.defaultPrevented ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.target?.closest?.(
        "input, textarea, select, [contenteditable='true'], [role='textbox']",
      )
    )
      return;
    if (
      [
        "ArrowDown",
        "ArrowUp",
        "PageDown",
        "PageUp",
        "Home",
        "End",
        " ",
      ].includes(event.key)
    )
      requestByIntent();
  }

  function posterSettled() {
    if (disposed || posterReady) return;
    posterReady = true;
    queueMediaStart();
  }

  function documentLoaded() {
    // Read fonts.ready after load, when the page's critical font requests are known.
    Promise.resolve(document.fonts?.ready)
      .catch(() => {})
      .then(() => {
        if (disposed) return;
        criticalReady = true;
        queueMediaStart();
      });
  }

  listen(window, "scroll", scrollChanged, { passive: true });
  listen(window, "wheel", requestByIntent, { passive: true });
  listen(window, "touchmove", requestByIntent, { passive: true });
  listen(window, "keydown", keyIntent);
  listen(window, "resize", schedule, { passive: true });
  listen(window, "hashchange", schedule);
  listen(window, "pagehide", () => setVisibility(true));
  listen(window, "pageshow", () => setVisibility(document.hidden));
  listen(document, "visibilitychange", () => setVisibility(document.hidden));
  listenMedia(reduced, preferenceChanged);
  listenMedia(compact, schedule);
  if (connection?.addEventListener)
    listen(connection, "change", preferenceChanged);
  listen(video, "loadedmetadata", schedule);
  listen(video, "durationchange", schedule);
  listen(video, "loadeddata", () => {
    frameAvailable();
    schedule();
  });
  listen(video, "canplay", () => {
    frameAvailable();
    schedule();
  });
  listen(video, "seeked", () => {
    seeking = false;
    frameAvailable();
    // A scroll received during decoding replaces the previous target, without queuing seeks.
    schedule();
  });
  listen(video, "error", fail);
  // The element is decorative. Even an external playback attempt must remain paused and silent.
  listen(video, "play", () => video.pause());
  const resizeObserver =
    typeof ResizeObserver !== "undefined" ? new ResizeObserver(schedule) : null;
  resizeObserver?.observe(hero);
  resizeObserver?.observe(stage);
  enable();
  if (poster?.decode) {
    Promise.resolve()
      .then(() => poster.decode())
      .catch(() => {})
      .then(posterSettled);
  } else if (!poster || poster.complete) posterSettled();
  else {
    listen(poster, "load", posterSettled, { once: true });
    listen(poster, "error", posterSettled, { once: true });
  }
  if (document.readyState === "complete") documentLoaded();
  else listen(window, "load", documentLoaded, { once: true });

  disposeHeroScroll = () => {
    disposed = true;
    disable();
    resizeObserver?.disconnect();
    cleanupListeners.forEach((remove) => remove());
    disposeHeroScroll = null;
  };
  return disposeHeroScroll;
}
