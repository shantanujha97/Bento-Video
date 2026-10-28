// usage: node render.js stills 0.5,3,6.2 outdir   |   node render.js video out.mp4 [fps] [start] [end]
const { chromium } = require('playwright');
const sharp = require('sharp');
const { spawn } = require('child_process');
const fs = require('fs');

(async () => {
  const [mode, a1, a2, a3, a4] = process.argv.slice(2);
  const browser = await chromium.launch({ args: ['--disable-web-security', '--force-color-profile=srgb', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on('console', m => { if (m.type() === 'error') console.error('PAGE:', m.text()); });
  page.on('pageerror', e => console.error('PAGEERR:', e.message));
  await page.goto('http://127.0.0.1:' + (process.env.PORT || 8124) + '/' + (process.env.PAGE || 'index.html'));
  await page.evaluate(() => window.ready);
  const stage = await page.$('#stage');
  const shot = async t => { await page.evaluate(t => window.render(t), t); return stage.screenshot({ type: 'png' }); };

  if (mode === 'stills') {
    const ts = a1.split(',').map(Number); fs.mkdirSync(a2, { recursive: true });
    for (const t of ts) { fs.writeFileSync(`${a2}/t_${t.toFixed(2)}.png`, await shot(t)); }
  } else {
    const out = a1, fps = Number(a2 || 60), t0 = Number(a3 || 0), t1 = Number(a4 || 20);
    const MB = await page.evaluate(() => window.MB);
    const ff = spawn('ffmpeg', ['-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', '1920x1080', '-r', String(fps), '-i', '-',
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '14', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
    const n = Math.round((t1 - t0) * fps);
    const SZ = 1920 * 1080 * 3;
    const started = Date.now();
    for (let f = 0; f < n; f++) {
      const t = t0 + f / fps;
      const inMB = MB.some(([a, b]) => t >= a && t <= b);
      const subs = inMB ? 6 : 1;
      let frame;
      if (subs === 1) frame = await sharp(await shot(t)).removeAlpha().raw().toBuffer();
      else {
        const acc = new Float32Array(SZ);
        for (let s = 0; s < subs; s++) { const ts = t + (s / subs - 0.5) * (0.5 / fps) * 2 * 0.5; const b = await sharp(await shot(ts)).removeAlpha().raw().toBuffer(); for (let i = 0; i < SZ; i++) acc[i] += b[i]; }
        frame = Buffer.alloc(SZ); for (let i = 0; i < SZ; i++) frame[i] = Math.round(acc[i] / subs);
      }
      if (!ff.stdin.write(frame)) await new Promise(r => ff.stdin.once('drain', r));
      if (f % 60 === 0) console.log(`frame ${f}/${n} t=${t.toFixed(2)} ${((Date.now() - started) / 1000).toFixed(0)}s`);
    }
    ff.stdin.end(); await new Promise(r => ff.on('close', r));
  }
  await browser.close();
})();
