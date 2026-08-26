/* Launch audit over the built site. Read-only; delete after running. */
const fs = require('fs');
const path = require('path');

const DIST = 'dist';
let problems = 0;
const flag = (m) => { console.log('  ✗ ' + m); problems++; };

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const files = walk(DIST);
const htmls = files.filter((f) => f.endsWith('.html'));
const assets = new Set(files.map((f) => '/' + path.relative(DIST, f).replace(/\\/g, '/')));

console.log('\n— internal links resolve —');
for (const f of htmls) {
  const html = fs.readFileSync(f, 'utf8');
  const page = '/' + path.relative(DIST, f).replace(/\\/g, '/');
  for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const url = m[1];
    if (/^(https?:|mailto:|tel:|#|data:)/.test(url)) continue;
    // directory URL -> its index.html
    const target = url.endsWith('/') ? url + 'index.html' : url;
    if (!assets.has(target)) flag(`${page} -> ${url} (missing)`);
  }
}
if (!problems) console.log('  all internal links resolve');

console.log('\n— images have alt text —');
let imgs = 0;
for (const f of htmls) {
  const html = fs.readFileSync(f, 'utf8');
  for (const m of html.matchAll(/<img\b[^>]*>/g)) {
    imgs++;
    if (!/\salt=/.test(m[0])) flag(`${f}: <img> without alt`);
    else if (/\salt=""/.test(m[0]) && !/aria-hidden/.test(m[0]))
      console.log(`  · ${f}: empty alt (decorative) — ok if intended`);
  }
}
console.log(`  ${imgs} <img> checked`);

console.log('\n— meta per page —');
for (const f of htmls) {
  const html = fs.readFileSync(f, 'utf8');
  const page = '/' + path.relative(DIST, f).replace(/\\/g, '/');
  const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
  const desc = (html.match(/name="description"\s+content="([^"]*)"/) || [])[1] || '';
  const canon = /rel="canonical"/.test(html);
  const og = /property="og:title"/.test(html);
  const robots = (html.match(/name="robots" content="([^"]*)"/) || [])[1] || '(none)';
  const is404 = page === '/404.html';

  if (!title) flag(`${page}: no <title>`);
  else if (title.length > 65) console.log(`  · ${page}: title ${title.length} chars (may truncate ~60)`);
  if (!desc) flag(`${page}: no meta description`);
  else if (desc.length > 165) console.log(`  · ${page}: description ${desc.length} chars (truncates ~160)`);
  if (!canon && !is404) flag(`${page}: no canonical`);
  if (!og && !is404) flag(`${page}: no Open Graph tags`);
  if (is404 && !/noindex/.test(robots)) flag('404 is indexable');
  console.log(`  ${page.padEnd(24)} title=${title.length} desc=${desc.length} robots=${robots}`);
}

console.log('\n— headings start at h1, no skipped levels —');
for (const f of htmls) {
  const html = fs.readFileSync(f, 'utf8');
  const page = '/' + path.relative(DIST, f).replace(/\\/g, '/');
  const levels = [...html.matchAll(/<h([1-6])\b/g)].map((m) => +m[1]);
  if (!levels.length) { console.log(`  · ${page}: no headings (React renders them)`); continue; }
  if (levels[0] !== 1) flag(`${page}: first heading is h${levels[0]}`);
  if (levels.filter((l) => l === 1).length > 1) flag(`${page}: more than one h1`);
  for (let i = 1; i < levels.length; i++)
    if (levels[i] - levels[i - 1] > 1) flag(`${page}: h${levels[i - 1]} -> h${levels[i]} skips a level`);
  console.log(`  ${page.padEnd(24)} ${levels.map((l) => 'h' + l).join(' ')}`);
}

console.log('\n— lang, viewport, favicon, manifest —');
for (const f of htmls) {
  const html = fs.readFileSync(f, 'utf8');
  const page = '/' + path.relative(DIST, f).replace(/\\/g, '/');
  if (!/<html lang="sq">/.test(html)) flag(`${page}: missing lang="sq"`);
  if (!/name="viewport"/.test(html)) flag(`${page}: missing viewport`);
  if (!/rel="icon"/.test(html)) flag(`${page}: missing favicon`);
}
console.log('  checked lang / viewport / favicon on every page');

console.log('\n— payload —');
const size = (p) => (fs.statSync(p).size / 1024).toFixed(1) + ' KB';
for (const f of files.filter((f) => /\.(js|css|glb|png|svg)$/.test(f)).sort())
  console.log('  ' + size(path.join(f)).padStart(10) + '  /' + path.relative(DIST, f).replace(/\\/g, '/'));

console.log(problems ? `\n${problems} problem(s)` : '\nno problems found');
