import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { SITE } from './site.config.js';

/**
 * Multi-page build.
 *
 * The legal pages, the FAQ and the 404 are real HTML files rather than
 * client-side routes. That matters for more than tidiness: each gets its
 * own <title>, description and canonical without JavaScript, a crawler
 * sees the content in the first response, and — the practical part — none
 * of them load the 700 KB Three.js bundle that only the 3D page needs.
 */

/**
 * Puts the site URL into the HTML and writes robots.txt and sitemap.xml.
 *
 * The templates carry `__SITE_URL__` instead of a domain, so the domain
 * lives only in site.config.js. `__CANONICAL__` becomes the page's own
 * absolute URL, worked out from its path in the build.
 */
function siteMeta() {
  return {
    name: 'site-meta',

    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        /* ctx.path is like /privatesia/index.html — turn it into the
           public URL that page will actually be served at. */
        const clean = ctx.path
          .replace(/^\/?/, '/')
          .replace(/index\.html$/, '')
          .replace(/\/404\.html$/, '/404.html');
        const canonical = SITE.url + clean;

        return html
          .replace(/__SITE_URL__/g, SITE.url)
          .replace(/__CANONICAL__/g, canonical)
          .replace(/__OG_IMAGE__/g, SITE.url + SITE.ogImage)
          .replace(/__OG_W__/g, String(SITE.ogImageWidth))
          .replace(/__OG_H__/g, String(SITE.ogImageHeight))
          .replace(/__LOCALE__/g, SITE.locale)
          .replace(/__SITE_NAME__/g, SITE.name);
      },
    },

    generateBundle() {
      const today = new Date().toISOString().slice(0, 10);

      const urls = SITE.pages
        .map(
          (p) =>
            `  <url>\n` +
            `    <loc>${SITE.url}${p.path}</loc>\n` +
            `    <lastmod>${today}</lastmod>\n` +
            `    <changefreq>${p.changefreq}</changefreq>\n` +
            `    <priority>${p.priority}</priority>\n` +
            `  </url>`,
        )
        .join('\n');

      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source:
          `<?xml version="1.0" encoding="UTF-8"?>\n` +
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
          `${urls}\n` +
          `</urlset>\n`,
      });

      /* The model and the Draco decoder are large and useless to a
         crawler, so they are kept out of the crawl budget. */
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source:
          `User-agent: *\n` +
          `Allow: /\n` +
          `Disallow: /models/\n` +
          `Disallow: /draco/\n\n` +
          `Sitemap: ${SITE.url}/sitemap.xml\n`,
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), siteMeta()],

  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        pyetje: resolve(__dirname, 'pyetje/index.html'),
        kushtet: resolve(__dirname, 'kushtet/index.html'),
        privatesia: resolve(__dirname, 'privatesia/index.html'),
        notfound: resolve(__dirname, '404.html'),
      },
      output: {
        /* Three.js is the bulk of the bundle and changes only when the
           dependency is upgraded, so it is split out to be cached across
           deploys instead of re-downloaded whenever the copy changes. */
        manualChunks: {
          three: ['three'],
        },
      },
    },
    chunkSizeWarningLimit: 800,
  },
});
