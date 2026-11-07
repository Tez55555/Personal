#!/usr/bin/env node
/* MM Diwali Story renderer (Playwright + ffmpeg)
   Stills:   node render/render.js --stills 0.5,2,4.2 --outdir out/stills [--scale .5] [--only s1-hook,s2-x]
   Sheet:    node render/render.js --sheet out/sheet.png [--from 0 --to 24 --every .5 --cols 8] [--only ...]
   Video:    node render/render.js --video out/video.mp4 [--from 0 --to 24 --fps 30 --scale 1 --workers 3 --crf 17 --format png]
   Flags: --lang hi|en|mix, --cut full|main|short (scenes/cuts.json), --lite (less brand), --raw (skip the GL finishing pass), --samples N (motion-blur sub-frames; default from MMPost.DEFAULTS)
   Exits non-zero if any scene threw (errors printed). */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');

const args = {}; for (let i = 2; i < process.argv.length; i++) { const k = process.argv[i]; if (k.startsWith('--')) { const v = process.argv[i + 1]; if (!v || v.startsWith('--')) args[k.slice(2)] = true; else { args[k.slice(2)] = v; i++; } } }
const num = (k, d) => args[k] != null ? parseFloat(args[k]) : d;
const only = args.only ? String(args.only).split(',') : undefined;

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.ttf': 'font/ttf', '.png': 'image/png', '.svg': 'image/svg+xml', '.css': 'text/css' };
function serve() {
  return new Promise(ok => {
    const srv = http.createServer((req, res) => {
      const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
      if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end('404'); }
      res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream', 'cache-control': 'no-store' }); fs.createReadStream(p).pipe(res);
    });
    srv.listen(0, '127.0.0.1', () => ok(srv));
  });
}

async function openPage(browser, port, scale) {
  const context = await browser.newContext({ viewport: { width: 600, height: 1000 } });
  const page = await context.newPage();
  const logs = [];
  page.on('pageerror', e => logs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') logs.push('console: ' + m.text()); });
  await page.goto(`http://127.0.0.1:${port}/engine/index.html?lang=${args.lang || 'hi'}&lite=${args.lite ? 1 : 0}&cut=${args.cut || 'full'}`);
  await page.waitForFunction(() => window.MM && window.MM.isReady, null, { timeout: 60000 });
  await page.evaluate(s => MM.setScale(s), scale);
  page._logs = logs;
  return page;
}

const RAW = !!args.raw, SAMPLES = args.samples ? parseInt(args.samples) : undefined;
async function grab(page, t, fmt) {
  const b64 = await page.evaluate(([t, only, fmt, raw, samples]) => { const c = MM.renderFrame(t, { only, raw, samples }); return c.toDataURL(fmt === 'jpeg' ? 'image/jpeg' : 'image/png', .95).split(',')[1]; }, [t, only, fmt, RAW, SAMPLES]);
  return Buffer.from(b64, 'base64');
}

async function reportErrors(pages) {
  let errs = [];
  for (const p of pages) { errs = errs.concat(p._logs, await p.evaluate(() => MM.errors.slice(0, 20))); }
  errs = [...new Set(errs)];
  if (errs.length) { console.error('ERRORS:\n' + errs.slice(0, 30).join('\n')); process.exitCode = 1; }
}

(async () => {
  const srv = await serve(); const port = srv.address().port;
  const browser = await chromium.launch({ args: ['--disable-accelerated-2d-canvas', '--disable-gpu-vsync', '--force-color-profile=srgb', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const t0 = Date.now();
  try {
    if (args.stills) {
      const scale = num('scale', .5); const outdir = path.resolve(args.outdir || 'out/stills'); fs.mkdirSync(outdir, { recursive: true });
      const page = await openPage(browser, port, scale);
      for (const t of String(args.stills).split(',').map(parseFloat)) {
        const f = path.join(outdir, `frame_${t.toFixed(2)}.png`); fs.writeFileSync(f, await grab(page, t, 'png')); console.log(f);
      }
      await reportErrors([page]);
    } else if (args.sheet) {
      const page = await openPage(browser, port, 1);
      const dur = await page.evaluate(() => MM.duration);
      const from = num('from', 0), to = num('to', dur), every = num('every', .5);
      const times = []; for (let t = from; t <= to + 1e-6; t += every) times.push(+t.toFixed(3));
      const b64 = await page.evaluate(([times, cols, only]) => MM.renderSheet(times, { cols, only }).split(',')[1], [times, num('cols', 8), only]);
      const out = path.resolve(args.sheet); fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, Buffer.from(b64, 'base64')); console.log(out);
      await reportErrors([page]);
    } else if (args.video) {
      const scale = num('scale', 1), fps = num('fps', 30), fmt = args.format || 'png';
      const probe = await openPage(browser, port, scale); const dur = await probe.evaluate(() => MM.duration); await probe.context().close();
      const from = num('from', 0), to = num('to', dur); const N = Math.round((to - from) * fps);
      const workers = Math.max(1, Math.min(num('workers', 3), N)); const per = Math.ceil(N / workers);
      const out = path.resolve(args.video); const tmp = out + '.parts'; fs.mkdirSync(tmp, { recursive: true });
      const pages = [];
      const jobs = Array.from({ length: workers }, (_, w) => (async () => {
        const a = w * per, b = Math.min(N, a + per); if (a >= b) return null;
        const page = await openPage(browser, port, scale); pages.push(page);
        const seg = path.join(tmp, `seg_${w}.mp4`);
        const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', fmt === 'jpeg' ? 'mjpeg' : 'png', '-i', '-',
          '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
          '-c:v', 'libx264', '-preset', args.preset || 'medium', '-crf', String(args.crf || 17), '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level', '4.2', '-r', String(fps), seg], { stdio: ['pipe', 'inherit', 'inherit'] });
        const done = new Promise((ok, fail) => ff.on('close', c => c === 0 ? ok() : fail(new Error('ffmpeg exit ' + c))));
        for (let i = a; i < b; i++) {
          const buf = await grab(page, from + i / fps, fmt);
          if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
          if (w === 0 && (i - a) % 30 === 0) console.log(`worker0 ${i - a}/${b - a} frames  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
        }
        ff.stdin.end(); await done; return seg;
      })());
      const segs = (await Promise.all(jobs)).filter(Boolean);
      fs.writeFileSync(path.join(tmp, 'list.txt'), segs.map(s => `file '${s}'`).join('\n'));
      await new Promise((ok, fail) => spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(tmp, 'list.txt'), '-c', 'copy', '-movflags', '+faststart', out], { stdio: 'inherit' }).on('close', c => c === 0 ? ok() : fail(new Error('concat failed'))));
      fs.rmSync(tmp, { recursive: true, force: true });
      console.log(`${out}  (${N} frames, ${((Date.now() - t0) / 1000).toFixed(1)}s)`);
      await reportErrors(pages);
    } else {
      console.log('usage: --stills t1,t2 | --sheet out.png | --video out.mp4 (see header)');
    }
  } finally { await browser.close(); srv.close(); }
})().catch(e => { console.error(e); process.exit(1); });
