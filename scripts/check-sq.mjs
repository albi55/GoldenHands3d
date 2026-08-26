/**
 * Kontroll i shqipes mbi të gjithë tekstin e faqes.
 *
 * Çdo gabim që u gjet dhe u rregullua një herë hyn këtu, që të mos
 * rikthehet. Kalon mbi tekstin e chapters.js dhe mbi tekstin e dukshëm
 * të çdo faqeje HTML.
 *
 *   node scripts/check-sq.mjs
 */
import fs from 'node:fs';
import { CHAPTERS, ADVANTAGES, UI, FACTS, BUILDING } from '../src/content/chapters.js';

const RULES = [
  [/\bobjekt(i|it|e|in)?\b/i, 'ndërtesa duhet quajtur "ndërtesa", jo "objekt"'],
  [/\bpallat(i|in|it)?\b/i, 'ndërtesa duhet quajtur "ndërtesa", jo "pallat"'],
  [/përdhes/i, '"përdhes" — duhet "kati i parë"'],
  [/urë termike|ura termike|urat termike/i, 'term i paverifikuar "urë termike"'],
  [/ndërprerje termike/i, 'duhet "ndarës termik" (term i Alumil Albania)'],
  [/ndërpret ndërprerjet|ndërpritet ndërprerje/i, 'përsëritje e pakuptimtë'],
  [/dritaret japin mbi|dritaret shohin nga/i, 'duhet "dritaret kanë pamje nga"'],
  [/ju njoftohemi/i, 'kahje e gabuar e foljes — duhet "ju shfaqet" ose "ju njoftojmë"'],
  [/sa gjatë/i, 'kalk nga anglishtja — duhet "sa kohë"'],
  [/japim me qira të dhëna/i, 'kalk nga anglishtja "rent data"'],
  [/gri e errët/i, 'gjinia: "kati" mashkullor -> "gri i errët"'],
  [/telefon \(opsionale\)/i, 'gjinia: "telefon" mashkullor -> "(opsional)"'],
  [/hyrja e banimit/i, 'duhet "hyrja e banorëve"'],
  [/kontrollues i të dhënave është/i, 'trajta e shquar: "Kontrolluesi"'],
  [/dy fronte rruge do të thotë/i, 'pajtim: kryefjala shumës kërkon "sjellin"'],
  [/tabelë të njëjtë/i, 'pajtim numri: "tabela të njëjta"'],
  [/ashensor veç\./i, 'fjali e cunguar'],
  [/paradhënie apo kontratë/i, '"paradhënie" nuk i përket këtij vargu'],
  [/\bplotësohet\]/i, 'ka mbetur një vend bosh [plotësohet]'],
  [/\bTODO\b|\bXXX\b|\blorem\b/i, 'shënim pune i harruar në tekst'],
];

/** Teksti i dukshëm i një faqeje HTML, pa script dhe pa head. */
function visible(file) {
  return fs
    .readFileSync(file, 'utf8')
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<head>[\s\S]*?<\/head>/, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    /* Ndarës mes blloqeve: pa të, titulli dhe paragrafi ngjiten dhe një
       titull i ndjekur nga e njëjta fjalë duket si përsëritje e rreme. */
    .replace(/<\/(h[1-6]|p|li|div|td|th)>/g, ' ¶ ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');
}

const items = [];
for (const c of CHAPTERS) {
  items.push([c.id, c.title], [c.id, c.kicker], [c.id, c.lead]);
  c.body.forEach((p) => items.push([c.id, p]));
  (c.notes || []).forEach(([k, v]) => items.push([c.id, k + ' — ' + v]));
}
ADVANTAGES.forEach(([t, d]) => items.push(['përparësitë', t + ' — ' + d]));
Object.entries(UI).forEach(([k, v]) =>
  (Array.isArray(v) ? v : [v]).forEach((x) => items.push(['ui.' + k, x])),
);
FACTS.forEach((f) => items.push(['të dhënat', f.label + ' — ' + f.value]));
items.push(['building', BUILDING.tagline]);

for (const f of ['index.html', '404.html', 'pyetje/index.html', 'kushtet/index.html', 'privatesia/index.html'])
  items.push([f, visible(f)]);

let bad = 0;
const hit = (where, why, text, at) => {
  bad++;
  console.log(`  ✗ ${where}: ${why}`);
  console.log(`    → …${text.slice(Math.max(0, at - 30), at + 60).trim()}…`);
};

for (const [where, text] of items) {
  for (const [re, why] of RULES) {
    const m = text.match(re);
    if (m) hit(where, why, text, m.index);
  }
}

/* ------------------------------------------------------------------
   Kontrolle mekanike.

   Rregullat më sipër kapin vetëm gabime që i kemi gjetur një herë. Këto
   nuk dinë asgjë paraprakisht — kërkojnë forma që janë pothuajse
   gjithmonë gabim, ndaj kapin edhe gabime të reja.
   ------------------------------------------------------------------ */

/* Fjalë e përsëritur ngjitur: "të të", "në në", "dhe dhe". */
const DOUBLE = /\b(\p{L}{2,})\s+\1\b/giu;

/* E njëjta parafjalë dy herë në një fjali është shpesh fjali e ngatërruar
   ("ndiqet nga i njëjti staf nga fillimi"). Disa janë të ligjshme, ndaj
   kontrollohen vetëm parafjalët që i kemi ngatërruar vërtet. */
const PREP = /\b(nga|me|për|te|tek)\b/gi;

for (const [where, text] of items) {
  for (const m of text.matchAll(DOUBLE)) {
    /* "për të" + folje, dhe numrat, nuk janë përsëritje. */
    if (/^(të|e|i|a|o)$/i.test(m[1])) continue;
    hit(where, `fjalë e përsëritur: "${m[1]} ${m[1]}"`, text, m.index);
  }

  for (const sentence of text.split(/(?<=[.!?])\s+/)) {
    if (sentence.length < 25) continue;
    const counts = new Map();
    for (const m of sentence.matchAll(PREP)) {
      const k = m[1].toLowerCase();
      counts.set(k, (counts.get(k) || 0) + 1);
    }
    for (const [prep, n] of counts) {
      if (n < 3) continue; // dy herë shpesh është e saktë; tre rrallë
      hit(where, `parafjala "${prep}" ${n} herë në një fjali`, sentence, 0);
    }
  }
}

console.log(
  bad
    ? `\n${bad} gabime`
    : `\n${items.length} pjesë teksti të kontrolluara — asnjë nga ${RULES.length} gabimet e njohura`,
);
process.exit(bad ? 1 : 0);
