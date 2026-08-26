import { SITE } from '../../site.config.js';

/**
 * Analytics, and the consent it does or does not need.
 *
 * The rule this encodes: nothing that stores anything on the visitor's
 * device loads before they have said yes. That is not just courtesy — a
 * cookie set before consent is the single most common way a site like
 * this breaks GDPR, and it happens by default with the copy-paste GA4
 * snippet, which fires the moment the page parses.
 *
 * Three configurations, in site.config.js:
 *
 *   provider: ''           nothing loads, no banner. The default, and the
 *                          most private answer.
 *   provider: 'plausible'  cookieless by design, so it needs no consent
 *                          and shows no banner. Loads immediately.
 *   provider: 'ga4'        sets cookies, so it loads only after consent
 *                          and the banner appears.
 */

const STORAGE_KEY = 'gh-consent';

/** Does this configuration need the visitor to agree to anything? */
export function needsConsent() {
  return SITE.analytics.provider === 'ga4' && Boolean(SITE.analytics.id);
}

/** 'granted' | 'denied' | null (never asked). */
export function readConsent() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    /* Private mode, or storage blocked. Treat as never asked and never
       store anything, which is the safe direction. */
    return null;
  }
}

export function writeConsent(value) {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* Nothing to do — the visitor simply gets asked again next time. */
  }
}

let loaded = false;

/** Inject the provider's script. Idempotent. */
function inject() {
  if (loaded) return;
  const { provider, id } = SITE.analytics;
  if (!provider || !id) return;
  loaded = true;

  if (provider === 'plausible') {
    const s = document.createElement('script');
    s.defer = true;
    s.dataset.domain = id;
    s.src = 'https://plausible.io/js/script.js';
    document.head.appendChild(s);
    return;
  }

  if (provider === 'ga4') {
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
    document.head.appendChild(s);

    window.dataLayer = window.dataLayer || [];
    function gtag() {
      window.dataLayer.push(arguments);
    }
    window.gtag = gtag;
    gtag('js', new Date());
    /* No cross-site identifiers, and the IP truncated before storage. */
    gtag('config', id, { anonymize_ip: true, allow_google_signals: false });
  }
}

/**
 * Call once on mount. Loads analytics if it is allowed to run right now,
 * and does nothing at all otherwise.
 */
export function initAnalytics() {
  const { provider, id } = SITE.analytics;
  if (!provider || !id) return;
  if (!needsConsent()) {
    inject(); // cookieless: no permission required
    return;
  }
  if (readConsent() === 'granted') inject();
}

/** Called by the banner when the visitor accepts. */
export function grantConsent() {
  writeConsent('granted');
  inject();
}

/** Called by the banner when the visitor declines. Nothing is loaded. */
export function denyConsent() {
  writeConsent('denied');
}
