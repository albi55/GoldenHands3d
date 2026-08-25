/**
 * Apartment interior tour — embeds a Coohom 360° tour in an iframe.
 *
 * Vanilla DOM, to match the rest of the app. Styling lives in style.css
 * under the "Apartment tour" heading, alongside every other rule.
 *
 *     import { mountApartmentTour } from './components/apartmentTour.js';
 *     const tour = mountApartmentTour(document.body, {
 *       url: TOURS.unit2.url,
 *       title: TOURS.unit2.label,
 *     });
 *     tour.destroy();
 *
 * The container is given an explicit height (default 600px). `height: 100%`
 * on its own collapses to zero — the iframe has no intrinsic size to push
 * against — so the height is always written as a concrete value.
 */

/** How long to wait for onLoad before assuming the embed is broken. */
const LOAD_TIMEOUT_MS = 15000;

/* The Coohom viewer is a WebGL app, not a document: it spawns workers,
   decodes model data, and caches chunks in its own storage. The four tokens
   the brief asked for are enough to load its *page* but not to run its
   viewer — the model stage stalls at a few percent — so these are added:

     allow-downloads          the viewer offers plan/image export
     allow-popups-to-escape-sandbox
                              popups it opens are not themselves sandboxed,
                              so "open in new tab" from inside works
     allow-modals             alert/confirm from the viewer

   Kept OFF deliberately: allow-top-navigation, which would let the embed
   navigate the whole page away from the site.

   Note allow-same-origin here does NOT give the frame access to this
   origin — the tour is cross-origin, so it only stops the browser forcing
   it into an opaque origin where its own storage would throw. */
const SANDBOX = [
  'allow-scripts',
  'allow-same-origin',
  'allow-popups',
  'allow-forms',
  'allow-downloads',
  'allow-popups-to-escape-sandbox',
  'allow-modals',
].join(' ');

/* Head start given to the embedded viewer after its page loads, before a
   warming tour is considered ready. The viewer is cross-origin, so its real
   progress cannot be observed — this is a grace period, not a signal. */
const VIEWER_GRACE_MS = 25000;

/**
 * @param {HTMLElement} host      element to append the tour to
 * @param {object}      opts
 * @param {string}      opts.url      tour URL (required)
 * @param {string}     [opts.title]   shown in the header and used as the
 *                                    iframe's accessible name
 * @param {number|string} [opts.height=600]  container height; a bare number
 *                                    is treated as px
 * @param {boolean}    [opts.deferTimeout=false]  hold the failure timeout until
 *                                    activate() is called; used while preloading
 * @returns {{ el: HTMLElement, activate: () => void, destroy: () => void }}
 */
export function mountApartmentTour(host, { url, title = 'Tur virtual 360°', height = 600, deferTimeout = false } = {}) {
  if (!url) throw new Error('mountApartmentTour: `url` is required');

  const root = document.createElement('div');
  root.className = 'tour';
  root.style.height = typeof height === 'number' ? `${height}px` : height;

  /* Loading state. Removed on load, replaced by the fallback on failure. */
  const loading = document.createElement('div');
  loading.className = 'tour-state';
  loading.innerHTML =
    '<div class="tour-spinner" aria-hidden="true"></div>' +
    '<p class="tour-state-text">Duke ngarkuar turin…</p>';
  root.appendChild(loading);

  const frame = document.createElement('iframe');
  frame.className = 'tour-frame';
  frame.src = url;
  frame.title = title;
  frame.allowFullscreen = true;
  frame.setAttribute('allow', 'fullscreen; xr-spatial-tracking; gyroscope; accelerometer');
  /* Escape hatch: ?nosandbox=1 drops the sandbox entirely. The viewer is a
     complex third-party app and sandbox tokens are the likeliest cause of a
     stalled load, so this makes that testable in one reload instead of
     guessing. Development aid only — the attribute is always applied
     otherwise. */
  const noSandbox = typeof location !== 'undefined'
    && new URLSearchParams(location.search).has('nosandbox');
  if (!noSandbox) frame.setAttribute('sandbox', SANDBOX);
  /* eager, not lazy: a preloading tour is mounted offscreen, and a lazy
     iframe there may never start fetching at all — which is the opposite
     of the point. */
  frame.setAttribute('loading', 'eager');
  frame.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');
  root.appendChild(frame);

  let settled = false;
  let timer = null;

  /* A cross-origin iframe that 4xxs still fires onLoad, and its error event
     is not reliably delivered — so a timeout is the only signal that
     actually catches a dead embed. Cleared as soon as either fires.

     The clock only runs while someone is watching. A tour preloaded at page
     load may sit warming for minutes before it is opened, and timing that
     out would show a failure nobody was waiting on. */
  function startTimer() {
    if (settled || timer) return;
    timer = setTimeout(() => fail(), LOAD_TIMEOUT_MS);
  }
  function stopTimer() {
    clearTimeout(timer);
    timer = null;
  }
  if (!deferTimeout) startTimer();

  /** Subscribers notified when the iframe page itself finishes loading. */
  const pageLoadFns = [];

  /* Reveal is held while `hold` is set, so a caller can keep the spinner up
     past the page load — the Coohom viewer is still fetching its model at
     that point and revealing early just shows its own progress bar. */
  let hold = false;
  let pageLoaded = false;

  function reveal() {
    if (settled || hold) return;
    settled = true;
    stopTimer();
    loading.remove();
    root.classList.add('is-loaded');
  }

  function succeed() {
    if (pageLoaded) return;
    pageLoaded = true;
    pageLoadFns.forEach((fn) => fn());
    reveal();
  }

  function fail() {
    if (settled) return;
    settled = true;
    stopTimer();
    frame.remove();
    loading.remove();
    root.classList.add('is-failed');

    /* Never leave a blank box: always offer a plain link out. Built with
       DOM calls rather than innerHTML so the url is set as a property and
       cannot break out of an attribute. */
    const fallback = document.createElement('div');
    fallback.className = 'tour-state';

    const heading = document.createElement('p');
    heading.className = 'tour-state-title';
    heading.textContent = 'Turi nuk u ngarkua';

    const body = document.createElement('p');
    body.className = 'tour-state-text';
    body.textContent = 'Shfletuesi nuk e hapi dot turin këtu. Provoni ta hapni në një skedë të re.';

    const link = document.createElement('a');
    link.className = 'tour-link';
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Hap turin në skedë të re ↗';

    fallback.append(heading, body, link);
    root.appendChild(fallback);
  }

  frame.addEventListener('load', succeed);
  frame.addEventListener('error', fail);

  host.appendChild(root);

  return {
    el: root,
    /* Called when a preloaded tour is shown: starts the failure clock that
       was held back while it warmed offscreen. No-op once settled. */
    activate: startTimer,
    /** Register a callback for when the iframe page (not the 3D scene) loads. */
    onPageLoad(fn) { pageLoaded ? fn() : pageLoadFns.push(fn); },
    /** Keep the spinner up past page load; release() reveals when ready. */
    holdSpinner() { hold = true; },
    /* Lifts the hold, and reveals only if the page has actually loaded.
       Revealing unconditionally would mark a tour that never loaded as
       ready — hiding the spinner and cancelling the failure timeout, so a
       dead embed would sit as a blank frame instead of showing its
       fallback link. */
    release() {
      hold = false;
      if (pageLoaded) reveal();
    },
    destroy() {
      stopTimer();
      settled = true;
      root.remove();
    },
  };
}

/**
 * Full-screen overlay wrapper around mountApartmentTour, for opening a tour
 * over the 3D canvas. Closes on the button or Escape.
 *
 * Adopts a preloaded tour when one is warm, and re-warms on close so the
 * second open is as fast as the first. Pass rewarmOnClose:false to opt out.
 *
 * @returns {{ close: () => void }}
 */
export function openTourOverlay({ url, title, height = '100%', rewarmOnClose = true }) {
  const overlay = document.createElement('div');
  overlay.className = 'tour-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', title || 'Tur virtual 360°');

  const bar = document.createElement('header');
  bar.className = 'tour-bar';

  const heading = document.createElement('span');
  heading.className = 'tour-title';
  heading.textContent = title || 'Tur virtual 360°';

  const close = document.createElement('button');
  close.className = 'tour-close';
  close.type = 'button';
  close.textContent = 'Mbyll ✕';

  bar.append(heading, close);
  overlay.appendChild(bar);

  const stage = document.createElement('div');
  stage.className = 'tour-stage';
  overlay.appendChild(stage);

  document.body.appendChild(overlay);

  /* Adopt a warmed tour if one is ready, otherwise mount fresh. Moving the
     existing element into the stage keeps the iframe alive — the browser
     does not reload a frame that is merely reparented — so a preloaded
     tour shows instantly instead of downloading a second time. */
  const preloaded = takeWarm(url);
  const tour = preloaded ?? mountApartmentTour(stage, { url, title, height });
  if (preloaded) {
    tour.el.style.height = typeof height === 'number' ? `${height}px` : height;
    stage.appendChild(tour.el);
    tour.activate();   // it is on screen now, so the failure clock starts
    tour.release();    // stop holding back the reveal: the user is waiting
  }

  const onKey = (e) => { if (e.key === 'Escape') destroy(); };

  function destroy() {
    document.removeEventListener('keydown', onKey);
    tour.destroy();
    overlay.remove();
    /* Closing empties the warm pool, so re-warm for the next open. Without
       this the first visit is instant and every visit after it waits. */
    if (rewarmOnClose) preloadTour({ url, title, height });
  }

  close.addEventListener('click', destroy);
  document.addEventListener('keydown', onKey);
  close.focus();

  return { close: destroy };
}

/* ------------------------------------------------------------------ *
 * Preloading
 *
 * The tour is a heavy third-party page: fetching it only on click means
 * staring at the spinner. Instead it is mounted immediately, hidden
 * offscreen, so the download overlaps with the user looking at the
 * building. On click the *same live element* is moved into the overlay —
 * moving a node in the DOM does not reload it, so an already-warm tour
 * appears instantly and never refetches.
 * ------------------------------------------------------------------ */

/** Warmed tours, keyed by url. */
const warm = new Map();

/**
 * Start fetching a tour in the background. Safe to call more than once for
 * the same url — later calls reuse the first warm-up.
 *
 * @returns {{ el: HTMLElement, destroy: () => void }} the pending tour
 */
export function preloadTour({ url, title, height = '100%' }) {
  if (!url) throw new Error('preloadTour: `url` is required');
  if (warm.has(url)) return warm.get(url);

  /* Offscreen rather than display:none or visibility:hidden — a display:none
     iframe is not guaranteed to load, and some engines throttle hidden
     subframes. This is laid out and painted, just parked outside the
     viewport where nothing can see it. Given a real size for the same
     reason: a 0x0 frame can skip work the viewer needs at open time. */
  const host = document.createElement('div');
  host.className = 'tour-preload';
  host.setAttribute('aria-hidden', 'true');
  document.body.appendChild(host);

  const tour = mountApartmentTour(host, { url, title, height, deferTimeout: true });
  tour.host = host;

  /* The iframe's load event only means the Coohom *page* arrived — its
     viewer then loads WebGL modules, the model and textures, which is the
     slow part. Give that stage a head start before the tour is shown, so
     opening does not land on Coohom's own 5% progress bar.

     There is no way to observe a cross-origin viewer's real progress, so
     this is a fixed grace period rather than a readiness signal. */
  /* Hold the reveal past page load. A cross-origin viewer gives no progress
     signal, so this is a fixed grace period: long enough for the model stage
     to get somewhere, short enough that a broken tour is not hidden for ages.
     Whichever happens first — the grace period elapsing or the user opening
     the tour — releases it. */
  tour.holdSpinner();
  tour.onPageLoad(() => setTimeout(() => tour.release(), VIEWER_GRACE_MS));

  warm.set(url, tour);
  return tour;
}

/**
 * Hand over a warmed tour, removing it from the pool and disposing of its
 * offscreen host. The caller owns the element afterwards and is responsible
 * for calling destroy() on it.
 *
 * Returns null when nothing is warm for this url, so callers fall back to
 * mounting fresh.
 */
function takeWarm(url) {
  const tour = warm.get(url);
  if (!tour) return null;
  warm.delete(url);
  tour.el.remove();      // detach before the host goes, so the frame survives
  tour.host?.remove();
  tour.host = null;
  return tour;
}

/** Drop a warmed tour and stop its download. */
export function discardPreload(url) {
  const tour = warm.get(url);
  if (!tour) return;
  warm.delete(url);
  tour.destroy();
  tour.host?.remove();
}
