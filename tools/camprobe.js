const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await p.goto('http://127.0.0.1:' + (process.env.PORT || 8124) + '/' + process.argv[2]); await p.evaluate(() => window.ready);
  const out = await p.evaluate(() => {
    const cams = { A: S.camA, B: S.camB, C: S.camC };
    const tw = []; if (typeof KEYS !== 'undefined') for (const [k, L] of Object.entries(KEYS)) L.forEach(x => tw.push({ cam: k, start: x.t, dur: x.d, ease: x.ease, to: x.to }));
    tl.getChildren(true, true, false).forEach(c => { const tg = c.targets()[0]; for (const [k, v] of Object.entries(cams)) if (tg === v) tw.push({ cam: k, start: +c.startTime().toFixed(3), dur: +c.duration().toFixed(3), ease: (c.vars.ease || 'none').toString(), to: Object.fromEntries(['cx','cy','z'].filter(q => q in c.vars).map(q => [q, c.vars[q]])) }); });
    const fps = 60, rows = [];
    for (let f = 0; f <= Math.round(window.DURATION * fps); f++) { const t = f / fps; tl.time(t, false); if (typeof camAt === 'function') { Object.assign(S.camA, camAt('A', t)); Object.assign(S.camB, camAt('B', t)); Object.assign(S.camC, camAt('C', t)); } rows.push([t, S.A > 0.001 ? 'A' : S.B > 0.001 ? 'B' : S.C > 0.001 ? 'C' : '-', S.camA.z, S.camA.cx, S.camA.cy, S.camB.z, S.camB.cx, S.camB.cy, S.camC.z, S.camC.cx, S.camC.cy]); }
    return { tw, rows };
  });
  require('fs').writeFileSync(process.argv[3], JSON.stringify(out)); await b.close();
})();
