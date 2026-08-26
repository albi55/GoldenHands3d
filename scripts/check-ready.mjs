/**
 * Çfarë mbetet pa plotësuar para publikimit.
 *
 * Faqja punon edhe pa këto — çdo pjesë fshihet vetë kur fusha është bosh,
 * ndaj asgjë e trilluar nuk del para një klienti. Por asnjëra nuk mund të
 * merret me mend nga kodi, ndaj listohen këtu që të mos harrohen.
 *
 *   node scripts/check-ready.mjs
 */
import fs from 'node:fs';
import { SITE } from '../site.config.js';
import { CONTACT, PROJECTS } from '../src/content/chapters.js';

const items = [];
const need = (ok, çfarë, ku, pasoja) => items.push({ ok, çfarë, ku, pasoja });

need(
  SITE.url !== 'https://goldenhands.al',
  'Domeni i vërtetë',
  'site.config.js › url',
  'canonical, Open Graph, robots.txt dhe sitemap.xml dalin të gjitha gabim',
);

need(
  Boolean(SITE.formEndpoint),
  'Adresa ku dërgohet formulari',
  'site.config.js › formEndpoint',
  'formulari hap programin e email-it; ju nuk ruani asnjë gjurmë',
);

need(
  Boolean(CONTACT.whatsapp || CONTACT.telegram),
  'Numri për WhatsApp/Telegram',
  'src/content/chapters.js › CONTACT',
  'butonat nuk shfaqen fare',
);

need(
  Boolean(CONTACT.phone),
  'Numri i telefonit',
  'src/content/chapters.js › CONTACT.phone',
  'rreshti i telefonit nuk shfaqet te kontakti',
);

need(
  PROJECTS.every((p) => p.year || p.note),
  'Projektet e tjera (emrat janë hamendësim)',
  'src/content/chapters.js › PROJECTS',
  'shfaqen vetëm emrat “Golden Hands 1/2/3”, pa vit e pa përshkrim',
);

const logo = fs.statSync('public/brand/logo.png').size;
const png = fs.readFileSync('public/brand/logo.png');
const w = png.readUInt32BE(16);
need(
  w >= 256,
  `Logo më e madhe (tani ${w}×${png.readUInt32BE(20)} px, ${Math.round(logo / 1024)} KB)`,
  'public/brand/logo.png',
  'në navbar duket e butë; nuk zmadhohet dot mbi ~52px',
);

const todo = ['privatesia/index.html', 'kushtet/index.html']
  .some((f) => fs.readFileSync(f, 'utf8').includes('class="todo"'));
need(
  !todo,
  'Shqyrtim ligjor i faqeve',
  'privatesia/ dhe kushtet/',
  'kutitë e verdha me shënime për administratorin janë ende aty',
);

const left = items.filter((i) => !i.ok);
const done = items.length - left.length;

console.log(`\nGati: ${done}/${items.length}\n`);
for (const i of items) {
  if (i.ok) { console.log('  ✔ ' + i.çfarë); continue; }
  console.log('  ▸ ' + i.çfarë);
  console.log('      ku      : ' + i.ku);
  console.log('      pa të   : ' + i.pasoja);
}
console.log(
  left.length
    ? `\n${left.length} për të plotësuar. Faqja punon edhe kështu.\n`
    : '\nGjithçka e plotësuar.\n',
);
