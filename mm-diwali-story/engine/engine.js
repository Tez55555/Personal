/* ==========================================================================
   MM Diwali Story: engine core (window.MM)
   - scenes/timeline.js sets MM.timeline = [{ id, file, start, end, layer? }], MM.duration, MM.fps
   - each scene file calls MM.scene(id, { draw(ctx, t, info) { ... } })
       t    = seconds since the scene's start (local time)
       info = { T (global seconds), dur, start, end, L }
   - MM.renderFrame(T, { only }) draws one frame. Scenes active at T are drawn in timeline order
     (later entries on top; use `layer` to override). Then MM.post(ctx, T) runs (grain, vignette).
   ========================================================================== */
(function () {
  'use strict';
  const MM = window.MM = window.MM || {};
  MM.scenes = {}; MM.errors = []; MM.timeline = MM.timeline || []; MM.duration = MM.duration || 24; MM.fps = MM.fps || 30;
  MM.background = '#120F1A';
  MM.scene = (id, def) => { MM.scenes[id] = def; };
  MM.flashes = [];
  /** register a finishing-pass flash (call at scene-file load time): { t (global s), dur, exposure (+), bloom (+) } */
  MM.addFlash = f => MM.flashes.push(f);
  MM.post = null;

  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: true });
  MM.canvas = canvas; MM.ctx = ctx;

  MM.post2d = null; // optional 2D overlay after scenes (the GL finishing pass already adds grain/vignette)
  MM.postGL = null; MM.useGL = true; MM.postParams = null; // (T) => partial MMPost.DEFAULTS
  MM.setScale = s => {
    L.baseScale = s; canvas.width = Math.round(L.W * s); canvas.height = Math.round(L.H * s);
    MM.postGL = null;
    if (MM.useGL && window.MMPost) { try { MM.postGL = MMPost.create(canvas); } catch (e) { MM.errors.push('postGL: ' + e.message); } }
  };
  MM.params = (T, extra) => Object.assign({}, window.MMPost ? MMPost.DEFAULTS : {}, MM.postParams ? MM.postParams(T) : {}, extra || {});

  MM.active = (T, only) => MM.timeline
    .filter(e => T >= e.start && T < e.end && (!only || only.includes(e.id)))
    .sort((a, b) => (a.layer ?? 0) - (b.layer ?? 0) || MM.timeline.indexOf(a) - MM.timeline.indexOf(b));

  /** draw the scenes for time T into the 2D canvas (no finishing pass) */
  MM.renderScenes = (T, opts = {}) => {
    L.resetTransform(ctx); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.shadowBlur = 0; ctx.filter = 'none';
    ctx.fillStyle = MM.background; ctx.fillRect(0, 0, L.W, L.H);
    for (const e of MM.active(T, opts.only)) {
      const sc = MM.scenes[e.id];
      if (!sc) { MM.errors.push(`missing scene ${e.id}`); continue; }
      ctx.save();
      try { sc.draw(ctx, T - e.start, { T, dur: e.end - e.start, start: e.start, end: e.end, L }); }
      catch (err) { MM.errors.push(`${e.id} @${T.toFixed(3)}: ${err && err.stack || err}`); }
      ctx.restore();
      L.resetTransform(ctx); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.shadowBlur = 0; ctx.filter = 'none';
    }
    if (MM.post2d && !opts.noPost) { ctx.save(); try { MM.post2d(ctx, T); } catch (err) { MM.errors.push('post2d: ' + err); } ctx.restore(); }
    if (opts.label) { ctx.save(); L.resetTransform(ctx); ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(0, 0, 330, 70); L.text(ctx, opts.label, 20, 50, { font: 'lat', size: 40, weight: 600, align: 'left', color: '#fff' }); ctx.restore(); }
  };

  /** final frame: motion-blurred sub-frames + cinematic finishing pass. Returns the canvas holding the frame. */
  MM.renderFrame = (T, opts = {}) => {
    if (!MM.postGL || opts.raw) { MM.renderScenes(T, opts); return canvas; }
    const P = MM.params(T, opts.post); const S = Math.max(1, Math.round(opts.samples || P.samples));
    MM.postGL.clear();
    for (let i = 0; i < S; i++) { const tt = S === 1 ? T : T + ((i + .5) / S - .5) * P.shutter / MM.fps; MM.renderScenes(Math.max(0, tt), opts); MM.postGL.add(1 / S); }
    MM.postGL.finish(P, T);
    return MM.postGL.canvas;
  };
  MM.output = () => MM.postGL ? MM.postGL.canvas : canvas;

  /** contact sheet: frames at the given times into one canvas -> dataURL */
  MM.renderSheet = (times, { cols = 6, scale = .22, only } = {}) => {
    const fw = Math.round(L.W * scale), fh = Math.round(L.H * scale), rows = Math.ceil(times.length / cols);
    const sheet = document.createElement('canvas'); sheet.width = cols * fw + (cols + 1) * 8; sheet.height = rows * (fh + 30) + 8;
    const sx = sheet.getContext('2d'); sx.fillStyle = '#333'; sx.fillRect(0, 0, sheet.width, sheet.height);
    times.forEach((T, i) => {
      const out = MM.renderFrame(T, { only, samples: 1 });
      const x = 8 + (i % cols) * (fw + 8), y = 8 + Math.floor(i / cols) * (fh + 30);
      sx.drawImage(out, x, y, fw, fh); sx.fillStyle = '#fff'; sx.font = '600 18px sans-serif'; sx.fillText(`${T.toFixed(2)}s`, x + 4, y + fh + 21);
    });
    return sheet.toDataURL('image/png');
  };

  function loadScript(src) {
    return new Promise((ok, fail) => { const s = document.createElement('script'); s.src = src + '?v=' + Math.floor(performance.now()); s.onload = ok; s.onerror = () => fail(new Error('cannot load ' + src)); document.head.appendChild(s); });
  }
  MM.boot = async () => {
    await Promise.all([
      document.fonts.load('700 100px "Anek Latin"'), document.fonts.load('400 100px "Anek Latin"'),
      document.fonts.load('700 100px "Anek Devanagari"', 'दीपावली'), document.fonts.load('500 100px "Anek Devanagari"', 'दीपावली'),
      document.fonts.load('400 100px "Tiro Devanagari Hindi"', 'since दी'), document.fonts.load('italic 400 100px "Tiro Devanagari Hindi"', 'since दी'),
    ]);
    const files = [...new Set(MM.timeline.map(e => e.file).filter(Boolean))];
    for (const f of files) {
      try { await loadScript('../scenes/' + f); } catch (e) { MM.errors.push(String(e)); }
    }
    if (window.MM_AFTER_LOAD) window.MM_AFTER_LOAD();
    MM.isReady = true;
  };

  /* Live preview when opened in a browser with ?play */
  if (location.search.includes('play')) {
    window.addEventListener('load', async () => {
      while (!MM.isReady) await new Promise(r => setTimeout(r, 50));
      MM.useGL = false; MM.setScale(.5); canvas.style.width = '540px'; const t0 = performance.now();
      const tick = () => { MM.renderFrame(((performance.now() - t0) / 1000) % MM.duration); requestAnimationFrame(tick); }; tick();
    });
  }
})();
