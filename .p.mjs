import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const cdp = await p.context().newCDPSession(p);
await cdp.send('Performance.enable');
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:5180', { waitUntil: 'networkidle', timeout: 180000 });
await p.waitForFunction(() => document.querySelector('.loader')?.classList.contains('is-done'), null, { timeout: 180000 }).catch(()=>{});
await p.waitForTimeout(4000);
await p.evaluate(() => { window.__long = [];
  new PerformanceObserver(l => { for (const e of l.getEntries()) window.__long.push(Math.round(e.duration)); }).observe({entryTypes:['longtask']}); });
const at=(m,k)=>(m.metrics.find(x=>x.name===k)||{}).value||0;
const m0 = await cdp.send('Performance.getMetrics');
const H = await p.evaluate(() => document.body.scrollHeight);
for (let i=0;i<=60;i++){ await p.evaluate(y=>window.scrollTo(0,y),(H/60)*i); await p.waitForTimeout(45); }
const m1 = await cdp.send('Performance.getMetrics');
const long = await p.evaluate(() => window.__long);
console.log('ScriptDuration  ' + (+(at(m1,'ScriptDuration')-at(m0,'ScriptDuration')).toFixed(2)) + ' s');
console.log('detyra > 50 ms  ' + long.length + (long.length ? '   më e gjata ' + Math.max(...long) + ' ms' : ''));
console.log('Layout / Style  ' + Math.round(at(m1,'LayoutCount')-at(m0,'LayoutCount')) + ' / ' + Math.round(at(m1,'RecalcStyleCount')-at(m0,'RecalcStyleCount')));
// shënuesi ende ndjek ndërtesën?
await p.evaluate(() => window.scrollTo(0,0)); await p.waitForTimeout(2500);
const pos1 = await p.evaluate(() => { const e=document.querySelector('.hs-marker'); return e ? e.style.left : null; });
await p.evaluate(() => window.scrollTo(0, 600)); await p.waitForTimeout(1800);
const pos2 = await p.evaluate(() => { const e=document.querySelector('.hs-marker'); return e ? e.style.left : null; });
console.log('shënuesi lëviz  ' + pos1 + ' -> ' + pos2 + (pos1!==pos2 ? '  ✔' : '  ✗ nuk lëviz'));
console.log(errs.length ? 'GABIME: ' + errs.join(' | ') : 'pa gabime');
await b.close();
