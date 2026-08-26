/**
 * Everything that changes when the site moves, is renamed, or gets
 * measured — in one file.
 *
 * The build reads this to write <link rel="canonical">, the Open Graph
 * tags, robots.txt and sitemap.xml, so the domain is never hard-coded in
 * a template. Change `url` here and every one of those follows.
 */

export const SITE = {
  /**
   * ⚠ VERIFY THIS. Inferred from the contact address (info@goldenhands.al)
   * because nobody told me the real domain. Canonical tags, Open Graph
   * URLs, robots.txt and sitemap.xml are all built from it, and a wrong
   * value here makes every one of them wrong — no trailing slash.
   */
  url: 'https://goldenhands.al',

  name: 'Golden Hands 4',
  developer: 'Golden Hands Construction',
  locale: 'sq_AL',
  lang: 'sq',

  /** Falls back to the page title when a page sets nothing. */
  description:
    'Golden Hands 4 — shtatë kate banimi mbi një përdhesë tregtare, në cep ' +
    'të një kryqëzimi në qendër të qytetit. Shfletoni ndërtesën në modelin ' +
    'tredimensional të projektit.',

  /**
   * Open Graph image, relative to the site root.
   *
   * This is a real render of the building rather than a made-up graphic.
   * It is 1440x900 (1.6:1) where the ideal is 1200x630 (1.91:1), so
   * Facebook and LinkedIn will crop the top and bottom slightly. Worth
   * exporting a purpose-made one at some point; it is not worth blocking
   * a launch over.
   */
  ogImage: '/og.png',
  ogImageWidth: 1440,
  ogImageHeight: 900,

  /**
   * Analytics. Nothing loads and no banner appears while `provider` is ''.
   *
   *   'plausible' — cookieless. Loads immediately, needs no consent
   *                 banner under GDPR. `id` is the domain you registered.
   *   'ga4'       — sets cookies. Loads ONLY after the visitor consents,
   *                 and the cookie banner appears. `id` is G-XXXXXXXXXX.
   *
   * Leaving this empty is a valid, and the most private, choice.
   */
  analytics: {
    provider: '',
    id: '',
  },

  /**
   * Where the contact form posts.
   *
   * Empty means there is no backend, so the form falls back to opening
   * the visitor's mail client with the fields filled in — which works
   * everywhere and stores nothing. Put a Formspree/Basin/Netlify endpoint
   * here and it posts properly instead.
   */
  formEndpoint: '',

  /** Every page, for sitemap.xml. `path` is the URL, not the file. */
  pages: [
    { path: '/', priority: '1.0', changefreq: 'monthly' },
    { path: '/pyetje/', priority: '0.7', changefreq: 'monthly' },
    { path: '/kushtet/', priority: '0.3', changefreq: 'yearly' },
    { path: '/privatesia/', priority: '0.3', changefreq: 'yearly' },
  ],
};

export default SITE;
