/* ==========================================================================
   MM Diwali Story: drawing library (window.L)
   Every helper is a PURE FUNCTION OF TIME. Never use Math.random() or
   Date.now(); use L.rnd(seed, i) / L.noise1(x, seed) so every frame can be
   rendered in any order, by any worker, and come out identical.
   Coordinate space: 1080 x 1920, y down. Story-safe zone: x 90..990, y 260..1600.
   ========================================================================== */
(function () {
  'use strict';
  const L = {};
  L.W = 1080; L.H = 1920;
  L.SAFE = { x0: 90, x1: 990, y0: 260, y1: 1600 };

  /* ---------- palette ---------- */
  // Brand colours (structure, type, logo).
  L.PAL = {
    ink: '#2B2728', ink2: '#3A3536', rich: '#1C1A1A', red: '#D2232E', red2: '#C21E29',
    violet: '#3F3593', muslin: '#EEECE8', linen: '#E4E1DC', stone: '#8C8783', mist: '#C9C4BF', white: '#FFFFFF',
    // 'paper' = type & logo white. It reads as white but sits just under the bloom threshold, so type never glows.
    // Rule: any colour with a channel >= 247 (e.g. #FFFFFF, #FFC24A) is treated as LIGHT and blooms in the finishing pass.
    paper: '#F4F2EE', goldInk: '#F2B23E',
    // Festive LIGHT colours (only for light, flame, sparks, glow; never for the logo).
    flame: '#FFE9A8', gold: '#FFC24A', amber: '#FF9F1C', marigold: '#FF7A00', ember: '#FF5A1F',
    rose: '#FF5C8A', magenta: '#E0218A', peacock: '#11A7B8', leaf: '#3FA34D', night: '#120F1A', dusk: '#1E1530',
  };

  /* ---------- math & easing ---------- */
  L.clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  L.lerp = (a, b, t) => a + (b - a) * t;
  L.invLerp = (a, b, v) => (v - a) / (b - a);
  L.remap = (v, a, b, c, d, ease) => { let t = L.clamp((v - a) / (b - a)); if (ease) t = ease(t); return c + (d - c) * t; };
  L.smoothstep = (a, b, v) => { const t = L.clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  const E = L.ease = {
    linear: t => t,
    inQuad: t => t * t, outQuad: t => 1 - (1 - t) * (1 - t), inOutQuad: t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
    inCubic: t => t * t * t, outCubic: t => 1 - Math.pow(1 - t, 3), inOutCubic: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    outQuart: t => 1 - Math.pow(1 - t, 4), inOutQuart: t => t < .5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2,
    outQuint: t => 1 - Math.pow(1 - t, 5),
    inExpo: t => t === 0 ? 0 : Math.pow(2, 10 * t - 10), outExpo: t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
    inOutExpo: t => t === 0 ? 0 : t === 1 ? 1 : t < .5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2,
    outBack: (t, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
    inBack: (t, s = 1.70158) => (s + 1) * t * t * t - s * t * t,
    outElastic: t => t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - .75) * (2 * Math.PI) / 3) + 1,
    outBounce: t => { const n = 7.5625, d = 2.75; if (t < 1 / d) return n * t * t; if (t < 2 / d) return n * (t -= 1.5 / d) * t + .75; if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + .9375; return n * (t -= 2.625 / d) * t + .984375; },
  };
  /** 0..1 progress of t through [t0,t1], eased. */
  L.prog = (t, t0, t1, ease = E.linear) => ease(L.clamp((t - t0) / (t1 - t0)));
  /** fade in over [a,b] and out over [c,d] -> 0..1 */
  L.inOut = (t, a, b, c, d) => Math.min(L.smoothstep(a, b, t), 1 - L.smoothstep(c, d, t));

  /** music grid: 100 BPM, beat n at 0.400 + 0.600 n (18 frames). q() snaps a time to the frame grid. */
  L.BPM = 100; L.beat = n => +(0.4 + 0.6 * n).toFixed(4); L.q = t => Math.round(t * 30) / 30;

  /* ---------- deterministic randomness ---------- */
  function hash32(a, b) { let h = (a | 0) * 374761393 + (b | 0) * 668265263; h = (h ^ (h >>> 13)) * 1274126177; h ^= h >>> 16; return h >>> 0; }
  /** uniform [0,1) from (seed, index) */
  L.rnd = (seed, i = 0) => hash32(Math.floor(seed * 9973) + 17, Math.floor(i) * 2654435761) / 4294967296;
  L.rndRange = (seed, i, a, b) => a + (b - a) * L.rnd(seed, i);
  L.rndPick = (seed, i, arr) => arr[Math.floor(L.rnd(seed, i) * arr.length) % arr.length];
  /** smooth 1D value noise in [0,1] */
  L.noise1 = (x, seed = 0) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return L.lerp(L.rnd(seed, i), L.rnd(seed, i + 1), u); };
  /** smooth noise in [-1,1] */
  L.snoise = (x, seed = 0) => L.noise1(x, seed) * 2 - 1;
  /** camera shake offset that decays after t0 */
  L.shake = (t, t0, amp, dur = .35, seed = 3) => { if (t < t0 || t > t0 + dur) return { x: 0, y: 0 }; const k = 1 - (t - t0) / dur; return { x: L.snoise(t * 38, seed) * amp * k * k, y: L.snoise(t * 41, seed + 7) * amp * k * k }; };

  /* ---------- colour ---------- */
  const _rgbCache = {};
  L.rgb = hex => { if (_rgbCache[hex]) return _rgbCache[hex]; const h = hex.replace('#', ''); const v = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); _rgbCache[hex] = v; return v; };
  L.rgba = (hex, a = 1) => { const [r, g, b] = L.rgb(hex); return `rgba(${r},${g},${b},${L.clamp(a)})`; };
  L.mix = (a, b, t, alpha = 1) => { const A = L.rgb(a), B = L.rgb(b); return `rgba(${Math.round(L.lerp(A[0], B[0], t))},${Math.round(L.lerp(A[1], B[1], t))},${Math.round(L.lerp(A[2], B[2], t))},${L.clamp(alpha)})`; };

  /* ---------- transforms ----------
     The engine may render at a preview scale. Scenes must NOT call ctx.setTransform(1,0,0,1,0,0)
     or ctx.resetTransform(); use save/restore/translate/scale/rotate, or L.resetTransform(ctx). */
  L.baseScale = 1;
  L.resetTransform = ctx => ctx.setTransform(L.baseScale, 0, 0, L.baseScale, 0, 0);
  /** run fn with transform: translate(x,y) rotate(r) scale(s), restoring afterwards */
  L.at = (ctx, x, y, s, r, fn) => { ctx.save(); ctx.translate(x, y); if (r) ctx.rotate(r); if (s !== 1 && s != null) ctx.scale(s, s); fn(ctx); ctx.restore(); };
  /** zoom about a point (camera push-in) */
  L.zoomAbout = (ctx, cx, cy, z) => { ctx.translate(cx, cy); ctx.scale(z, z); ctx.translate(-cx, -cy); };

  /* ---------- shapes ---------- */
  L.poly = (ctx, pts) => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); };
  L.rrect = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
  L.circle = (ctx, x, y, r) => { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2); };

  /* ---------- light ---------- */
  /** additive radial glow */
  L.glow = (ctx, x, y, r, color, alpha = 1, falloff = 0) => {
    if (r <= 0 || alpha <= 0) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, L.rgba(color, alpha)); g.addColorStop(L.clamp(.18 + falloff), L.rgba(color, alpha * .45));
    g.addColorStop(.5, L.rgba(color, alpha * .12)); g.addColorStop(1, L.rgba(color, 0));
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
  };
  /** soft vignette over the whole frame */
  L.vignette = (ctx, strength = .55, color = '#000000') => {
    const g = ctx.createRadialGradient(L.W / 2, L.H * .46, L.H * .28, L.W / 2, L.H * .5, L.H * .78);
    g.addColorStop(0, L.rgba(color, 0)); g.addColorStop(1, L.rgba(color, strength));
    ctx.save(); ctx.fillStyle = g; ctx.fillRect(0, 0, L.W, L.H); ctx.restore();
  };
  let _grain = null;
  /** film grain (deterministic per frame). amount ~ .04-.08 */
  L.grain = (ctx, T, amount = .05) => {
    if (!_grain) {
      _grain = document.createElement('canvas'); _grain.width = 384; _grain.height = 384;
      const g = _grain.getContext('2d'); const im = g.createImageData(384, 384);
      for (let i = 0; i < 384 * 384; i++) { const v = Math.floor(L.rnd(91, i) * 255); im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255; }
      g.putImageData(im, 0, 0);
    }
    const f = Math.floor(T * 30); const ox = -Math.floor(L.rnd(5, f) * 384), oy = -Math.floor(L.rnd(6, f) * 384);
    ctx.save(); ctx.globalAlpha = amount; ctx.globalCompositeOperation = 'overlay';
    for (let x = ox; x < L.W; x += 384) for (let y = oy; y < L.H; y += 384) ctx.drawImage(_grain, x, y);
    ctx.restore();
  };

  /** night sky gradient background */
  L.sky = (ctx, top = '#0E0B16', mid = '#1E1530', bottom = '#2B1A2E') => {
    const g = ctx.createLinearGradient(0, 0, 0, L.H); g.addColorStop(0, top); g.addColorStop(.55, mid); g.addColorStop(1, bottom);
    ctx.fillStyle = g; ctx.fillRect(0, 0, L.W, L.H);
  };
  /** twinkling stars in a rect */
  L.stars = (ctx, t, { seed = 11, count = 120, x = 0, y = 0, w = L.W, h = L.H * .6, color = '#FFFFFF', alpha = .8 } = {}) => {
    ctx.save(); ctx.fillStyle = color;
    for (let i = 0; i < count; i++) {
      const px = x + L.rnd(seed, i * 3) * w, py = y + L.rnd(seed, i * 3 + 1) * h, s = .6 + L.rnd(seed, i * 3 + 2) * 1.8;
      const tw = .45 + .55 * L.noise1(t * (1.5 + L.rnd(seed + 1, i) * 2) + i, seed + 2);
      ctx.globalAlpha = alpha * tw; ctx.beginPath(); ctx.arc(px, py, s, 0, 6.2832); ctx.fill();
    }
    ctx.restore();
  };
  /** floating soft bokeh lights (additive) */
  L.bokeh = (ctx, t, { seed = 21, count = 26, colors = ['#FFC24A', '#FF9F1C', '#FF5C8A'], rMin = 10, rMax = 46, alpha = .22, drift = 18, x = 0, y = 0, w = L.W, h = L.H } = {}) => {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < count; i++) {
      const r = L.lerp(rMin, rMax, L.rnd(seed, i * 5));
      const px = x + ((L.rnd(seed, i * 5 + 1) * w + L.snoise(t * .2 + i, seed) * drift) % w + w) % w;
      const py = y + ((L.rnd(seed, i * 5 + 2) * h - t * drift * (.5 + L.rnd(seed, i * 5 + 3))) % h + h) % h;
      const c = colors[i % colors.length]; const a = alpha * (.55 + .45 * L.noise1(t * .8 + i * 1.7, seed + 3));
      const g = ctx.createRadialGradient(px, py, 0, px, py, r);
      g.addColorStop(0, L.rgba(c, a)); g.addColorStop(.7, L.rgba(c, a * .55)); g.addColorStop(1, L.rgba(c, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, r, 0, 6.2832); ctx.fill();
    }
    ctx.restore();
  };

  /* ---------- flame & diya ---------- */
  function flamePath(ctx, x, y, h, w, sway) {
    // base of flame at (x,y); tip at (x+sway, y-h)
    const cy = y - h * .2, r = w * .5;
    ctx.beginPath();
    ctx.moveTo(x + sway, y - h);
    ctx.bezierCurveTo(x + sway * .45 + w * .18, y - h * .62, x + r, y - h * .42, x + r, cy);
    ctx.arc(x, cy, r, 0, Math.PI, false);
    ctx.bezierCurveTo(x - r, y - h * .42, x + sway * .45 - w * .18, y - h * .62, x + sway, y - h);
    ctx.closePath();
  }
  /** a living diya-style flame; (x,y) = base of the flame (wick tip). size = flame height in px. */
  L.flame = (ctx, x, y, size, t, seed = 1, { glow = 1, color = '#FF9F1C', core = '#FFF4CF', lit = 1 } = {}) => {
    if (lit <= 0 || size <= 0) return;
    const fl = 1 + .1 * L.snoise(t * 7.3, seed) + .05 * L.snoise(t * 17, seed + 1);
    const h = size * fl * lit, w = size * .46 * (0.92 + .08 * L.noise1(t * 5, seed + 2));
    const sway = w * .32 * L.snoise(t * 2.6, seed + 3);
    if (glow > 0) { L.glow(ctx, x, y - h * .45, h * 3.2 * glow, '#FF8A1A', .32 * lit * glow); L.glow(ctx, x, y - h * .5, h * 1.3, '#FFD27A', .45 * lit * glow); }
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    let g = ctx.createLinearGradient(x, y, x, y - h);
    g.addColorStop(0, L.rgba('#FF5A1F', .85 * lit)); g.addColorStop(.35, L.rgba(color, .95 * lit)); g.addColorStop(1, L.rgba('#FFD27A', .0));
    ctx.fillStyle = g; flamePath(ctx, x, y, h, w, sway); ctx.fill();
    g = ctx.createLinearGradient(x, y, x, y - h * .62);
    g.addColorStop(0, L.rgba('#FFE9A8', .95 * lit)); g.addColorStop(.6, L.rgba(core, .9 * lit)); g.addColorStop(1, L.rgba(core, 0));
    ctx.fillStyle = g; flamePath(ctx, x, y - h * .02, h * .62, w * .55, sway * .7); ctx.fill();
    ctx.restore();
    // tiny dark wick
    ctx.save(); ctx.fillStyle = 'rgba(40,20,10,.9)'; ctx.fillRect(x - size * .025, y - size * .02, size * .05, size * .09); ctx.restore();
  };
  /** clay diya. (x,y) = centre of the bowl's rim; s = half-width of the bowl in px. Returns wick position. */
  L.diya = (ctx, x, y, s, t, seed = 1, { lit = 1, body = '#C8572B', bodyDark = '#7A2A14', rim = '#E8A04A', dots = '#FFD27A', flameSize } = {}) => {
    const sp = { x: x + s * 1.18, y: y - s * .16 };
    ctx.save();
    // bowl
    const g = ctx.createLinearGradient(x, y - s * .2, x, y + s * .7);
    g.addColorStop(0, body); g.addColorStop(1, bodyDark);
    ctx.fillStyle = g; ctx.beginPath();
    ctx.moveTo(x - s, y);
    ctx.quadraticCurveTo(x - s * .92, y + s * .7, x, y + s * .66);
    ctx.quadraticCurveTo(x + s * .78, y + s * .6, x + s * .98, y + s * .08);
    ctx.lineTo(sp.x + s * .06, sp.y - s * .02);
    ctx.lineTo(x + s * .72, y - s * .1);
    ctx.closePath(); ctx.fill();
    // oil surface + rim
    ctx.fillStyle = bodyDark; ctx.beginPath(); ctx.ellipse(x - s * .06, y, s * .94, s * .2, 0, 0, Math.PI * 2); ctx.fill();
    const og = ctx.createLinearGradient(x, y - s * .15, x, y + s * .15); og.addColorStop(0, '#5A1E0C'); og.addColorStop(1, '#C27A2A');
    ctx.fillStyle = og; ctx.beginPath(); ctx.ellipse(x - s * .06, y + s * .02, s * .82, s * .14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = rim; ctx.lineWidth = Math.max(1, s * .05); ctx.beginPath(); ctx.ellipse(x - s * .06, y, s * .94, s * .2, 0, 0, Math.PI * 2); ctx.stroke();
    // decorative dots
    ctx.fillStyle = dots;
    for (let i = 0; i < 7; i++) { const a = .25 + i / 6 * .5; const px = L.lerp(x - s * .78, x + s * .7, i / 6); const py = y + s * (.22 + .22 * Math.sin(a * Math.PI)); ctx.beginPath(); ctx.arc(px, py, s * .045, 0, 6.2832); ctx.fill(); }
    ctx.restore();
    if (lit > 0) {
      L.glow(ctx, sp.x, sp.y, s * 1.6, '#FF9F1C', .18 * lit); // warm bounce on the rim
      L.flame(ctx, sp.x, sp.y, flameSize || s * 1.15, t, seed, { lit });
    }
    return sp;
  };

  /* ---------- fireworks & sparks ---------- */
  /** ballistic position with linear drag k and gravity g (px/s^2) */
  function ballistic(x0, y0, vx, vy, k, g, t) { const e = (1 - Math.exp(-k * t)) / k; return [x0 + vx * e, y0 + vy * e + g * (t / k - e / k)]; }
  L.ballistic = ballistic;
  /**
   * Firework burst. t = seconds since burst (draw nothing if t<0).
   * shape: 'peony' (sphere), 'ring', 'willow' (long gold drooping trails), 'crossette', 'heart'
   */
  L.firework = (ctx, { x, y, t, seed = 1, n = 90, speed = 560, drag = 1.7, gravity = 240, life = 1.9, colors = ['#FFC24A', '#FF5C8A'], trail = .14, size = 3.2, glitter = true, shape = 'peony', flash = true, alpha = 1 } = {}) => {
    if (t < 0 || t > life * 1.6) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    if (flash && t < .25) L.glow(ctx, x, y, 260 * (1 + t * 3), '#FFF1C9', .7 * (1 - t / .25) * alpha);
    const willow = shape === 'willow';
    const k = willow ? 1.1 : drag, g = willow ? gravity * 1.25 : gravity, tr = willow ? trail * 3.2 : trail;
    for (let i = 0; i < n; i++) {
      let a, v;
      if (shape === 'ring') { a = i / n * Math.PI * 2; v = speed; }
      else if (shape === 'heart') { const u = i / n * Math.PI * 2; const hx = 16 * Math.pow(Math.sin(u), 3), hy = -(13 * Math.cos(u) - 5 * Math.cos(2 * u) - 2 * Math.cos(3 * u) - Math.cos(4 * u)); a = Math.atan2(hy, hx); v = speed * Math.hypot(hx, hy) / 17; }
      else { a = i / n * Math.PI * 2 + L.rnd(seed, i) * .35; v = speed * (.55 + .45 * Math.sqrt(L.rnd(seed, i + 500))); }
      const vx = Math.cos(a) * v, vy = Math.sin(a) * v;
      const li = life * (.72 + .28 * L.rnd(seed, i + 900));
      if (t > li) continue;
      const age = t / li;
      let al = Math.pow(1 - age, 1.4) * alpha;
      if (glitter && age > .45) al *= .35 + .65 * (L.rnd(seed + Math.floor(t * 24), i) > .45 ? 1 : 0);
      const col = colors[i % colors.length];
      const p0 = ballistic(x, y, vx, vy, k, g, Math.max(0, t - tr)), pm = ballistic(x, y, vx, vy, k, g, Math.max(0, t - tr * .45)), p1 = ballistic(x, y, vx, vy, k, g, t);
      ctx.strokeStyle = L.mix(col, '#FFFFFF', 0, al * .35); ctx.lineWidth = size * .8;
      ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(pm[0], pm[1]); ctx.stroke();
      ctx.strokeStyle = L.mix(col, '#FFFFFF', Math.max(0, .5 - age), al * .85); ctx.lineWidth = size;
      ctx.beginPath(); ctx.moveTo(pm[0], pm[1]); ctx.lineTo(p1[0], p1[1]); ctx.stroke();
      ctx.fillStyle = L.mix(col, '#FFFFFF', .6 * (1 - age), al); ctx.beginPath(); ctx.arc(p1[0], p1[1], size * .9, 0, 6.2832); ctx.fill();
      if (shape === 'crossette' && age > .35 && age < .8) { // split into 4 mini sparks
        const tt = t - li * .35;
        for (let j = 0; j < 4; j++) { const b = a + j * Math.PI / 2 + .6; const q = ballistic(p1[0], p1[1], Math.cos(b) * 160, Math.sin(b) * 160, 3, g, tt * .6); ctx.fillStyle = L.rgba(col, al * .8); ctx.beginPath(); ctx.arc(q[0], q[1], size * .7, 0, 6.2832); ctx.fill(); }
      }
    }
    ctx.restore();
  };
  /** rising rocket from (x0,y0) to (x1,y1) over dur seconds; t = seconds since launch. Returns head position. */
  L.rocket = (ctx, { x0, y0, x1, y1, t, dur = .9, seed = 1, color = '#FFC24A', wobble = 10, sparks = 26 } = {}) => {
    if (t < 0 || t > dur) return null;
    const pos = tt => { const p = L.ease.outQuad(L.clamp(tt / dur)); return [L.lerp(x0, x1, p) + L.snoise(tt * 6, seed) * wobble * p, L.lerp(y0, y1, p)]; };
    const h = pos(t);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < sparks; i++) { // sparks shed along the path, falling and fading
      const tb = t - i * (.035); if (tb < 0) break;
      const p = pos(tb), age = t - tb; const vx = L.rndRange(seed, i + Math.floor(tb * 30) * 7, -60, 60);
      const q = ballistic(p[0], p[1], vx, 40, 2, 320, age);
      const al = Math.max(0, 1 - age / .55);
      ctx.fillStyle = L.rgba(i % 3 ? color : '#FFFFFF', al * .9); ctx.beginPath(); ctx.arc(q[0], q[1], 2.6 * al + .6, 0, 6.2832); ctx.fill();
    }
    L.glow(ctx, h[0], h[1], 70, color, .55); L.glow(ctx, h[0], h[1], 18, '#FFFFFF', .9);
    ctx.restore();
    return h;
  };
  /** phuljhadi / sparkler head at (x,y) */
  L.sparkler = (ctx, x, y, t, seed = 1, { radius = 130, count = 34, color = '#FFD27A', intensity = 1 } = {}) => {
    if (intensity <= 0) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    L.glow(ctx, x, y, radius * 2.2, '#FF9F1C', .35 * intensity); L.glow(ctx, x, y, radius * .5, '#FFF6DC', .9 * intensity);
    const frame = Math.floor(t * 30);
    for (let k = 0; k < count; k++) {
      const id = frame * 131 + k; const a = L.rnd(seed, id) * Math.PI * 2; const len = radius * (.35 + .65 * Math.pow(L.rnd(seed, id + 7), .7));
      const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len;
      ctx.strokeStyle = L.rgba(k % 4 ? color : '#FFFFFF', (.5 + .5 * L.rnd(seed, id + 3)) * intensity); ctx.lineWidth = 1.6 + L.rnd(seed, id + 9) * 1.6;
      ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * len * .12, y + Math.sin(a) * len * .12); ctx.lineTo(ex, ey); ctx.stroke();
      if (L.rnd(seed, id + 11) > .55) { // fork
        for (const s of [-1, 1]) { const b = a + s * (.5 + L.rnd(seed, id + 13) * .4); const fl = len * .28; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex + Math.cos(b) * fl, ey + Math.sin(b) * fl); ctx.stroke(); }
      }
    }
    ctx.restore();
  };
  /** anaar / flower-pot fountain emitting upward from (x,y) */
  L.fountain = (ctx, x, y, t, seed = 1, { height = 520, spread = .38, rate = 160, life = 1.1, colors = ['#FFD27A', '#FFFFFF', '#FF9F1C'], intensity = 1, gravity = 900 } = {}) => {
    if (intensity <= 0 || t < 0) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const v0 = Math.sqrt(2 * gravity * height);
    const jEnd = Math.floor(t * rate), jStart = Math.max(0, Math.floor((t - life) * rate));
    for (let j = jStart; j <= jEnd; j++) {
      const age = t - j / rate; if (age < 0 || age > life) continue;
      const a = -Math.PI / 2 + L.snoise(j * .37, seed) * spread + (L.rnd(seed, j) - .5) * spread;
      const v = v0 * (.6 + .4 * L.rnd(seed, j + 3));
      const p = ballistic(x, y, Math.cos(a) * v, Math.sin(a) * v, .35, gravity, age);
      const al = intensity * Math.pow(1 - age / life, 1.2);
      ctx.fillStyle = L.rgba(colors[j % colors.length], al); ctx.beginPath(); ctx.arc(p[0], p[1], 2.2 + 1.6 * (1 - age / life), 0, 6.2832); ctx.fill();
    }
    L.glow(ctx, x, y - 30, 160, '#FF9F1C', .45 * intensity);
    ctx.restore();
  };
  /** confetti / petals falling; kind: 'confetti' | 'petal' (marigold petals) */
  L.confetti = (ctx, t, { seed = 41, count = 70, colors = ['#FFC24A', '#FF7A00', '#D2232E', '#FF5C8A', '#FFFFFF'], t0 = 0, x = 0, w = L.W, y0 = -80, speed = 520, kind = 'confetti', alpha = 1 } = {}) => {
    const tt = t - t0; if (tt < 0) return;
    ctx.save();
    for (let i = 0; i < count; i++) {
      const delay = L.rnd(seed, i) * .8; const a = tt - delay; if (a < 0) continue;
      const px = x + L.rnd(seed, i + 100) * w + Math.sin(a * (1.5 + L.rnd(seed, i + 200) * 2) + i) * 40;
      const py = y0 + a * speed * (.6 + .4 * L.rnd(seed, i + 300));
      if (py > L.H + 60) continue;
      const rot = a * (3 + L.rnd(seed, i + 400) * 6) + i; const s = kind === 'petal' ? 16 + L.rnd(seed, i + 500) * 12 : 10 + L.rnd(seed, i + 500) * 10;
      ctx.save(); ctx.translate(px, py); ctx.rotate(rot); ctx.scale(1, Math.abs(Math.cos(a * 4 + i)) * .8 + .2);
      ctx.fillStyle = L.rgba(colors[i % colors.length], alpha);
      if (kind === 'petal') { ctx.beginPath(); ctx.ellipse(0, 0, s * .5, s * .28, 0, 0, 6.2832); ctx.fill(); }
      else ctx.fillRect(-s / 2, -s / 4, s, s / 2);
      ctx.restore();
    }
    ctx.restore();
  };

  /* ---------- the MM mark ---------- */
  const LOGO = window.MM_LOGO; const _p2d = {};
  L.MARK = LOGO.MARK; // {W:110,H:100,w:17.5 (pillar width),y_tip,blunt,g,step:46.25}
  L.logoSize = name => ({ w: LOGO[name].w, h: LOGO[name].h });
  function logoPaths(name) { if (!_p2d[name]) _p2d[name] = LOGO[name].items.map(it => ({ role: it.role, path: new Path2D(it.d) })); return _p2d[name]; }
  const WAYS = {
    full: { ink: '#2B2728', pillar: '#D2232E', word: '#2B2728', since: '#D2232E' },
    reverse: { ink: '#F4F2EE', pillar: '#D2232E', word: '#F4F2EE', since: '#F4F2EE' },
    onred: { ink: '#F4F2EE', pillar: '#2B2728', word: '#F4F2EE', since: '#F4F2EE' },
  };
  /**
   * Draw a logo lockup exactly (never distorted).
   * name: 'mark' | 'horizontal' | 'horizontal_nosince' | 'bilingual' | 'stacked' | 'wordmark' | 'seal'
   * opts: { x, y, h (height px) or w (width px), anchor: 'center'|'topleft'|'bottomcenter', way: 'reverse'|'full'|'onred',
   *         colors: {ink,pillar,word,since} overrides, roles: ['ink','pillar',...] subset to draw, alpha }
   * Returns the bounding box {x,y,w,h} it used.
   */
  L.drawLogo = (ctx, name, { x = L.W / 2, y = L.H / 2, h, w, anchor = 'center', way = 'reverse', colors = {}, roles, alpha = 1 } = {}) => {
    const sz = L.logoSize(name); const s = h ? h / sz.h : w ? w / sz.w : 1; const bw = sz.w * s, bh = sz.h * s;
    let ox = x, oy = y;
    if (anchor === 'center') { ox = x - bw / 2; oy = y - bh / 2; } else if (anchor === 'bottomcenter') { ox = x - bw / 2; oy = y - bh; }
    const map = Object.assign({}, WAYS[way] || WAYS.reverse, colors);
    ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(ox, oy); ctx.scale(s, s);
    for (const it of logoPaths(name)) { if (roles && !roles.includes(it.role)) continue; ctx.fillStyle = map[it.role] || '#FFFFFF'; ctx.fill(it.path); }
    ctx.restore();
    return { x: ox, y: oy, w: bw, h: bh, s };
  };
  /**
   * The mark broken into its five parts, in mark units (0..110 x 0..100, y down), for custom animation.
   * { pillars: [left, middle(red), right] as 4-point polys, chevrons: [left, right] as 7-point polys }
   * Draw with L.poly(ctx, pts) after translating/scaling (scale = heightPx / 100).
   */
  L.markParts = () => {
    const M = L.MARK, H = M.H, wp = M.w, step = M.step, yTip = M.y_tip, blunt = M.blunt;
    const f = p => [p[0], H - p[1]];
    const chevrons = [0, 1].map(i => {
      const x0 = i * step, x1 = (i + 1) * step + wp, xm = (x0 + x1) / 2;
      const slope = (H - yTip) / (xm - x0), yNotch = yTip + wp * slope, yb = yTip + (blunt / 2) * slope;
      return [[x0, H], [x0 + wp, H], [xm, yNotch], [x1 - wp, H], [x1, H], [xm + blunt / 2, yb], [xm - blunt / 2, yb]].map(f);
    });
    const pillars = [0, 1, 2].map(i => { const x = i * step; return [[x, 0], [x + wp, 0], [x + wp, H], [x, H]].map(f); });
    return { pillars, chevrons, W: M.W, H: M.H, pillarW: wp };
  };
  /**
   * Legacy Line: a strip of M's where each shares a pillar with the next.
   * Draws between x0..x1 with M height h, top at yTop. redIndex: which pillar is red (null = none). Only one red pillar per line.
   * reveal (0..1) draws pillars/chevrons progressively left-to-right.
   */
  L.legacyLine = (ctx, { x0 = 0, x1 = L.W, yTop = 0, h = 60, color = '#3A3536', red = '#D2232E', redIndex = null, alpha = 1, reveal = 1, offset = 0 } = {}) => {
    const s = h / L.MARK.H; const parts = L.markParts(); const step = L.MARK.step * s;
    const n = Math.ceil((x1 - x0) / step) + 2; const start = x0 - ((offset % step) + step) % step - step;
    ctx.save(); ctx.globalAlpha *= alpha; ctx.beginPath(); ctx.rect(x0, yTop - 2, x1 - x0, h + 4); ctx.clip();
    for (let i = 0; i < n; i++) {
      const bx = start + i * step; if ((bx - x0) / (x1 - x0) > reveal) break;
      ctx.save(); ctx.translate(bx, yTop); ctx.scale(s, s);
      ctx.fillStyle = color; L.poly(ctx, parts.chevrons[0]); ctx.fill();
      ctx.fillStyle = (redIndex === i) ? red : color; L.poly(ctx, parts.pillars[0]); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  };

  /* ---------- type ---------- */
  L.FONT = { lat: '"Anek Latin"', dev: '"Anek Devanagari"', tiro: '"Tiro Devanagari Hindi"' };
  /** set ctx font. font: 'lat'|'dev'|'tiro'; stretch: canvas keyword e.g. 'semi-expanded' (~112%), 'normal', 'expanded' */
  L.setFont = (ctx, { font = 'lat', size = 80, weight = 700, italic = false, stretch } = {}) => {
    const fam = L.FONT[font] || font;
    ctx.font = `${italic ? 'italic ' : ''}${font === 'tiro' ? 400 : weight} ${size}px ${fam}`;
    ctx.fontStretch = stretch || (font === 'lat' ? 'semi-expanded' : 'normal');
    ctx.fontKerning = 'normal';
  };
  /**
   * Draw a line of text. opts: font, size, weight, italic, stretch, color, align ('center'), baseline ('alphabetic'|'middle'|'top'),
   * alpha, tracking (px letter-spacing; never for Hindi), glow: {color, blur}, stroke: {color, width}, maxWidth (auto-shrinks)
   * Returns measured width.
   */
  L.text = (ctx, str, x, y, o = {}) => {
    const { color = '#F4F2EE', align = 'center', baseline = 'alphabetic', alpha = 1, tracking = 0, glow, stroke, maxWidth } = o;
    if (alpha <= 0) return 0;
    ctx.save(); let size = o.size || 80;
    L.setFont(ctx, Object.assign({}, o, { size }));
    ctx.letterSpacing = (o.font === 'dev' ? 0 : tracking) + 'px';
    if (maxWidth) { let w = ctx.measureText(str).width; while (w > maxWidth && size > 12) { size *= .96; L.setFont(ctx, Object.assign({}, o, { size })); w = ctx.measureText(str).width; } }
    ctx.textAlign = align; ctx.textBaseline = baseline; ctx.globalAlpha *= alpha;
    if (glow) { ctx.save(); ctx.shadowColor = glow.color || color; ctx.shadowBlur = glow.blur || 30; ctx.fillStyle = color; ctx.fillText(str, x, y); ctx.restore(); }
    if (stroke) { ctx.lineJoin = 'round'; ctx.strokeStyle = stroke.color; ctx.lineWidth = stroke.width; ctx.strokeText(str, x, y); }
    ctx.fillStyle = color; ctx.fillText(str, x, y);
    const w = ctx.measureText(str).width; ctx.restore(); return w;
  };
  L.measure = (ctx, str, o = {}) => { ctx.save(); L.setFont(ctx, o); ctx.letterSpacing = (o.font === 'dev' ? 0 : (o.tracking || 0)) + 'px'; const w = ctx.measureText(str).width; ctx.restore(); return w; };
  /**
   * Lay out a line word-by-word (safe for Devanagari: words are shaped whole). Returns [{word, x (left), w, cx}]
   * for a line centred (or aligned) at x. Use it to animate words individually.
   */
  L.layoutWords = (ctx, str, x, o = {}) => {
    const words = str.split(' '); const space = L.measure(ctx, ' ', o);
    const ws = words.map(wd => L.measure(ctx, wd, o)); const total = ws.reduce((a, b) => a + b, 0) + space * (words.length - 1);
    let cx = o.align === 'left' ? x : o.align === 'right' ? x - total : x - total / 2;
    return words.map((wd, i) => { const r = { word: wd, x: cx, w: ws[i], cx: cx + ws[i] / 2, i }; cx += ws[i] + space; return r; });
  };
  /**
   * Kinetic line: words pop in one after another from t0, `stagger` s apart.
   * style: 'rise' (slide up + fade), 'pop' (scale overshoot), 'drop' (fall in from above)
   */
  L.kineticLine = (ctx, str, x, y, t, t0, o = {}) => {
    const { stagger = .08, dur = .45, style = 'rise', out } = o;
    const words = L.layoutWords(ctx, str, x, o);
    for (const wd of words) {
      const p = L.clamp((t - t0 - wd.i * stagger) / dur); if (p <= 0) continue;
      let a = L.ease.outCubic(p), dy = 0, sc = 1;
      if (style === 'rise') dy = (1 - L.ease.outCubic(p)) * (o.size || 80) * .5;
      if (style === 'drop') dy = -(1 - L.ease.outBack(p)) * (o.size || 80) * .8;
      if (style === 'pop') sc = L.ease.outBack(p, 2.2);
      if (out != null) a *= 1 - L.smoothstep(out, out + .3, t);
      ctx.save(); ctx.translate(wd.cx, y + dy); ctx.scale(sc, sc);
      L.text(ctx, wd.word, 0, 0, Object.assign({}, o, { align: 'center', alpha: (o.alpha ?? 1) * a }));
      ctx.restore();
    }
  };

  /* ---------- offscreen cache for heavy static drawings ---------- */
  const _cache = {};
  /** returns an offscreen canvas of w x h drawn once by fn(ctx). Draw it with ctx.drawImage(c, x, y). */
  L.cached = (key, w, h, fn) => {
    if (_cache[key]) return _cache[key];
    const c = document.createElement('canvas'); c.width = Math.ceil(w); c.height = Math.ceil(h); fn(c.getContext('2d')); _cache[key] = c; return c;
  };

  window.L = L;
})();
