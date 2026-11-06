/* ==========================================================================
   s3-gag-ride  ·  global 4.933 – 12.400 s  ·  "the comedy ride"
   One lateral auto-rickshaw track down a festive Lucknow street, past three MM media,
   each roasting one Diwali family truth:
     A  tri-vision on a rooftop  ·  safai          (hero 5.200 – 7.333)
     B  LED screen on a facade   ·  diet vs kaju   (hero 7.900 – 9.733)
     C  LED van at street level  ·  soan papdi     (hero 10.000 – 12.133)
   Camera: 8-frame easeInOutCubic whips (+1400 world px), a bump + lean mid-whip, a brake
   settle on landing, slow drift and push-in while holding. Five depth planes:
   sky+fireworks (z 6) / far Lucknow (z 3) / mid city (z 1.7) / board plane (z 1) / near poles+wires (z .55).
   While the camera whips, the scene supersamples itself in time (k sub-samples inside each engine
   sub-frame) so the engine's 180° motion blur reads as a smear rather than 4 ghosts.
   ========================================================================== */
(function () {
  'use strict';
  const L = window.L, P = L.PAL, E = L.ease, W = L.W, H = L.H;
  const clamp = L.clamp, lerp = L.lerp, rnd = L.rnd, prog = L.prog;
  const TAU = Math.PI * 2, DEG = Math.PI / 180;

  /* ---------- timing (global seconds, frame aligned) ---------- */
  const S0 = L.q(4.9334), TA = L.q(5.2), WAB = L.q(7.3334), TB = L.q(7.6), WBC = L.q(9.7334), TC = L.q(10), WUP = L.q(12.1334), TE = L.q(12.4);
  const WHIP = 1400, DIP = 220, SEAM = -220;

  /* ---------- palette ---------- */
  const INK = P.ink, RICH = P.rich, STONE = P.stone, MIST = P.mist, MUSLIN = P.muslin, PAPER = P.paper, RED = P.red, LINEN = P.linen, GOLDINK = P.goldInk;
  const GOLD = '#FFC24A', BULB = '#FFF4CF', AMBER = '#FFB547', WARMW = '#FFE7A3', TUBE = '#F4F6FF';

  /* ---------- copy (code points exactly as in storyboard.json) ---------- */
  const HERO_A = 'घर साफ़। कमर हाफ़।', HAF = 'हाफ़', DANDA = '।';
  const SUB_A = 'House: spotless. Back: finished.';
  const FINE_A_HI = '*नियम व शर्तें: मम्मी', FINE_A_EN = '  ·  *T&C: Mummy';
  const B1 = 'डाइट: मंडे से।';
  const B2 = 'काजू कतली: अभी से।';
  const SUB_B = 'Diet: Monday. Kaju katli: right now.';
  const C1 = 'सोन पापड़ी के डिब्बे:';
  const C2A = 'आए 3, गए ', C2B = '4', C2C = '।';
  const SUB_C = 'Soan papdi: got 3, gave 4.';
  const FINE_C_HI = '*चौथा डिब्बा: रहस्य', FINE_C_EN = '  ·  *Box #4: a mystery';

  /* ---------- small helpers ---------- */
  const keys = (T, ks, ease = E.inOutQuad) => {
    if (T <= ks[0][0]) return ks[0][1];
    for (let i = 1; i < ks.length; i++) if (T <= ks[i][0]) { const a = ks[i - 1], b = ks[i]; return lerp(a[1], b[1], ease((T - a[0]) / (b[0] - a[0]))); }
    return ks[ks.length - 1][1];
  };
  const spr = col => L.cached('s3spr' + col, 64, 64, g => {
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, L.rgba(col, 1)); r.addColorStop(.2, L.rgba(col, .5)); r.addColorStop(.5, L.rgba(col, .13)); r.addColorStop(1, L.rgba(col, 0));
    g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  });
  /** additive soft glow sprite (caller sets 'lighter') */
  function glow(g, x, y, r, col, a) { if (a <= .003 || r <= 0) return; const o = g.globalAlpha; g.globalAlpha = o * Math.min(1, a); g.drawImage(spr(col), x - r, y - r, r * 2, r * 2); g.globalAlpha = o; }
  let DT = 1 / 240;   // time span the current sample represents: light points are integrated over it as streaks
  /** a light point that integrates its own screen motion (vx, vy px/s) over DT (caller sets 'lighter') */
  function lightDot(g, x, y, r, col, a, vx = 0, vy = 0) {
    if (a <= .004) return;
    const lx = vx * DT, ly = vy * DT, len = Math.hypot(lx, ly), o = g.globalAlpha;
    if (len < r * .7) { g.globalAlpha = o * Math.min(1, a); g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
    else { g.globalAlpha = o * Math.min(1, a * 2 * r / (2 * r + len)); g.strokeStyle = col; g.lineWidth = r * 2; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - lx / 2, y - ly / 2); g.lineTo(x + lx / 2, y + ly / 2); g.stroke(); }
    g.globalAlpha = o;
  }
  function bulb(g, x, y, s, col, b, vx, vy) { glow(g, x, y, s * 6.5, col, .34 * b); lightDot(g, x, y, s * .72, L.mix(col, '#FFFFFF', .5 * b), .45 + .55 * b, vx, vy); }
  function merlon(g, cx, y, w, h) { g.beginPath(); g.moveTo(cx - w / 2, y); g.lineTo(cx - w / 2, y - h * .42); g.quadraticCurveTo(cx - w / 2, y - h * .82, cx, y - h); g.quadraticCurveTo(cx + w / 2, y - h * .82, cx + w / 2, y - h * .42); g.lineTo(cx + w / 2, y); g.closePath(); g.fill(); }
  function archWin(g, x, y, w, h) { g.beginPath(); g.moveTo(x, y + h); g.lineTo(x, y + w * .55); g.quadraticCurveTo(x, y + w * .08, x + w / 2, y - w * .12); g.quadraticCurveTo(x + w, y + w * .08, x + w, y + w * .55); g.lineTo(x + w, y + h); g.closePath(); }
  function topEdge(g, x, y, w, a = .9) { g.fillStyle = `rgba(140,135,131,${a})`; g.fillRect(x, y, w, 2); }
  /** plaster / grime: subtle tonal noise for walls (drawn source-atop, so only on painted pixels) */
  const plasterTex = (w, h) => L.cached(`s3-plaster-${w}x${h}`, w, h, g => {
    const t = L.textureCanvas('paper', 512, 21), t2 = L.textureCanvas('ink', 512, 22);
    g.globalAlpha = 1; for (let y = 0; y < h; y += 512) for (let x = 0; x < w; x += 512) g.drawImage(t, x, y);
    g.globalCompositeOperation = 'multiply'; g.globalAlpha = .5; for (let y = 0; y < h; y += 384) for (let x = 0; x < w; x += 384) g.drawImage(t2, x, y, 384, 384);
    g.globalCompositeOperation = 'destination-in'; g.globalAlpha = 1; g.fillStyle = 'rgba(0,0,0,.09)'; g.fillRect(0, 0, w, h);
    // grime streaks running down from ledges
    g.globalCompositeOperation = 'source-over';
    for (let k = 0; k < w / 26; k++) { const x = rnd(551, k) * w, y = rnd(552, k) * h, l = 40 + rnd(553, k) * 160; const gr = g.createLinearGradient(0, y, 0, y + l); gr.addColorStop(0, 'rgba(0,0,0,.10)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x, y, 3 + rnd(554, k) * 9, l); }
  });
  const grime = (g, x, y, w, h, a = 1) => { g.save(); g.globalCompositeOperation = 'source-atop'; g.globalAlpha = a; g.drawImage(plasterTex(Math.ceil(w), Math.ceil(h)), x, y); g.restore(); };
  /** crisp cached sprite under a scaled transform: undo the scale locally */
  function unscaled(g, s, fn) { g.save(); g.scale(1 / s, 1 / s); fn(g); g.restore(); }
  function plate(g, x, y, w, h) {   // MM media-owner plate (Ink, Stone top edge, reverse lockup)
    g.fillStyle = '#242022'; g.fillRect(x, y, w, h); topEdge(g, x, y, w);
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x, y + h - 2, w, 2);
    L.drawLogo(g, 'horizontal_nosince', { x: x + w / 2, y: y + h / 2 + 1, h: Math.min(30, h - 10), anchor: 'center', way: 'reverse' });
  }
  /** a word/line rendered once into its own canvas (for dissolves, halos, glitches) */
  function textImg(str, o, color, pad = 24) {
    const k = `s3txt-${str}-${o.font}-${o.size}-${o.weight}-${color}`;
    const c0 = document.createElement('canvas').getContext('2d');
    const w = Math.ceil(L.measure(c0, str, o)) + pad * 2, h = Math.ceil(o.size * 1.75) + pad;
    const img = L.cached(k, w, h, g => L.text(g, str, pad, o.size * 1.2 + pad / 2, Object.assign({}, o, { align: 'left', color, maxWidth: w - pad * 2 + 2 })));
    img._bx = pad; img._by = o.size * 1.2 + pad / 2; return img;
  }
  function haloImg(img, blur, key) { return L.cached('s3halo-' + key, img.width + blur * 4, img.height + blur * 4, g => { g.filter = `blur(${blur}px)`; g.drawImage(img, blur * 2, blur * 2); }); }
  function cellsOf(img, cell, seed) {   // non-empty LED cells of an image, each with a dissolve threshold
    if (img._cells && img._cells.cell === cell) return img._cells;
    const d = img.getContext('2d').getImageData(0, 0, img.width, img.height).data, out = []; out.cell = cell;
    for (let y = 0; y < img.height; y += cell) for (let x = 0; x < img.width; x += cell) {
      let on = false; for (let yy = y; yy < Math.min(img.height, y + cell) && !on; yy += 2) for (let xx = x; xx < Math.min(img.width, x + cell); xx += 2) if (d[(yy * img.width + xx) * 4 + 3] > 30) { on = true; break; }
      if (on) out.push([x, y, rnd(seed, out.length * 7 + 3)]);
    }
    img._cells = out; return out;
  }
  /** LED dissolve: cells switch on in random order as p goes 0 -> 1, freshly lit cells flash */
  function dissolve(g, img, x, y, p, seed, cell = 6) {
    if (p <= 0) return; if (p >= 1) { g.drawImage(img, x, y); return; }
    const cs = cellsOf(img, cell, seed);
    for (const [cx, cy, th] of cs) if (th < p) g.drawImage(img, cx, cy, cell, cell, x + cx, y + cy, cell, cell);
    g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(255,250,240,.55)';
    for (const [cx, cy, th] of cs) if (th < p && th > p - .22) g.fillRect(x + cx + 1, y + cy + 1, cell - 2, cell - 2);
    g.restore();
  }

  /* ---------- camera ---------- */
  function camAt(T) {
    const e0 = prog(T, S0, TA, E.inOutCubic), e1 = prog(T, WAB, TB, E.inOutCubic), e2 = prog(T, WBC, TC, E.inOutCubic), e3 = prog(T, WUP, TE, E.inOutCubic);
    let x = -WHIP + WHIP * (e0 + e1 + e2), y = DIP * e2 - 1200 * e3, zoom = 1 - .5 * e3, roll = 0;
    // holding: the ride never fully stops: slow drift + gentle push-in
    for (const [a, b, ein, eout] of [[TA, WAB, e0, e1], [TB, WBC, e1, e2], [TC, WUP, e2, e3]]) {
      const h = clamp((T - a) / (b - a)), live = ein * (1 - eout);
      x += (h - .5) * 18 * live; zoom *= 1 + .016 * E.inOutQuad(h) * live;
    }
    // whip: the auto hits a bump and leans; the motor rattles
    for (const e of [e0, e1, e2]) { const s = Math.sin(Math.PI * e); if (s <= 0) continue; y -= 16 * s; roll += .007 * s; x += 2.5 * L.snoise(T * 31, 7) * s; y += 3 * L.snoise(T * 37, 9) * s; }
    // brake: damped settle (overshoot in x, nose-dip in y, tiny roll back)
    for (const tl of [TA, TB, TC]) { const u = T - tl; if (u <= 0 || u > 1.4) continue; const k = Math.exp(-6.5 * u); x += 15 * k * Math.sin(15 * u); y += 9 * k * Math.sin(19 * u); roll -= .004 * k * Math.sin(13 * u); }
    return { x, y, zoom, roll, e3 };
  }
  function depth(g, c, z, fn) {
    const f = 1 / z, zz = 1 + (c.zoom - 1) * f; g.save(); g.translate(W / 2, H / 2); g.scale(zz, zz); g.translate(-W / 2 - c.x * f, -H / 2 - c.y * f); fn(g, zz); g.restore();
  }
  /** visible x range (layer coords) of a depth layer */
  function visX(c, z) { const f = 1 / z, zz = 1 + (c.zoom - 1) * f, cx = W / 2 + c.x * f, hw = W / 2 / zz + 60; return [cx - hw, cx + hw]; }

  /* ======================= SKY (z 6) ======================= */
  const FW = [
    { t: 4.62, x: 600, y: 360, cols: [GOLD, '#FFE9A8'], seed: 3, shape: 'peony' },
    { t: 5.70, x: 230, y: 330, cols: ['#FF5C8A', GOLD], seed: 5, shape: 'ring' },
    { t: 6.85, x: 870, y: 300, cols: [GOLD, '#FFFFFF'], seed: 7, shape: 'willow' },
    { t: 8.05, x: 520, y: 320, cols: ['#FFE9A8', '#FF9F1C'], seed: 9, shape: 'peony' },
    { t: 9.15, x: 1060, y: 300, cols: ['#FF5C8A', '#FFE9A8'], seed: 11, shape: 'crossette' },
    { t: 10.45, x: 1240, y: 250, cols: [GOLD, '#FFFFFF'], seed: 13, shape: 'peony' },
    { t: 11.55, x: 700, y: 230, cols: ['#FF9F1C', '#FF5C8A'], seed: 15, shape: 'ring' },
  ];
  function drawSky(g, T, c) {
    const oy = -c.y / 6;
    const gr = g.createLinearGradient(0, oy - 60, 0, oy + 1250);
    gr.addColorStop(0, '#1A171D'); gr.addColorStop(.3, '#1F1A2B'); gr.addColorStop(.55, '#25203F'); gr.addColorStop(.8, '#2F2540'); gr.addColorStop(1, '#3A2B3D');
    g.fillStyle = gr; g.fillRect(-300, -1400, W + 600, H + 2800);
    g.save(); g.globalCompositeOperation = 'lighter'; glow(g, 300 - c.x / 6, 700 + oy, 900, '#6A3A40', .32); glow(g, 900 - c.x / 6, 760 + oy, 800, '#4A3A6A', .3); glow(g, 1500 - c.x / 6, 700 + oy, 900, '#6A3A40', .28); g.restore();
    L.haze(g, T - c.x / 60, { y0: 60 + oy, y1: 900 + oy, color: '#7A6A8A', alpha: .07, speed: 6, seed: 17, scale: 2.6 });
    L.stars(g, T, { seed: 33, count: 46, x: -150, y: oy - 500, w: W + 300, h: 980, alpha: .32 });
    for (const f of FW) {
      const u = T - f.t; if (u < 0 || u > 2.6) continue;
      L.firework(g, { x: f.x - c.x / 6, y: f.y + oy, t: u, seed: f.seed, n: 44, speed: 150, drag: 1.5, gravity: 60, life: 1.6, colors: f.cols, size: 2.1, shape: f.shape, alpha: .3, trail: .16 });
    }
  }

  /* ======================= FAR: Lucknow silhouettes (z 3) ======================= */
  const FAR = { x0: -900, y0: 150, w: 3600, h: 1060, base: 1070 }, FARC = '#1E1925';
  function onion(g, cx, y, r) {
    g.beginPath(); g.moveTo(cx - r * .78, y);
    g.bezierCurveTo(cx - r * 1.28, y - r * .72, cx - r * .42, y - r * 1.22, cx, y - r * 1.72);
    g.bezierCurveTo(cx + r * .42, y - r * 1.22, cx + r * 1.28, y - r * .72, cx + r * .78, y);
    g.closePath(); g.fill(); g.fillRect(cx - 1.5, y - r * 2.25, 3, r * .6); g.beginPath(); g.arc(cx, y - r * 1.98, Math.max(2, r * .1), 0, TAU); g.fill();
  }
  function chhatri(g, cx, y, w) {
    g.fillRect(cx - w * .6, y - w * .12, w * 1.2, w * .12);
    g.fillRect(cx - w * .5, y - w * .78, w * .16, w * .68); g.fillRect(cx + w * .34, y - w * .78, w * .16, w * .68);
    g.fillRect(cx - w * .62, y - w * .92, w * 1.24, w * .16); onion(g, cx, y - w * .92, w * .46);
  }
  function pointedArch(g, cx, b, w, h) { g.beginPath(); g.moveTo(cx - w / 2, b); g.lineTo(cx - w / 2, b - h * .58); g.quadraticCurveTo(cx - w / 2, b - h * .9, cx, b - h); g.quadraticCurveTo(cx + w / 2, b - h * .9, cx + w / 2, b - h * .58); g.lineTo(cx + w / 2, b); g.closePath(); }
  function gateway(g, cx, b) {   // Rumi Darwaza-style gate (generic, secular)
    g.fillRect(cx - 250, b - 290, 500, 290); g.fillRect(cx - 125, b - 520, 250, 520);
    g.beginPath(); g.moveTo(cx - 142, b - 515); g.quadraticCurveTo(cx - 128, b - 615, cx, b - 652); g.quadraticCurveTo(cx + 128, b - 615, cx + 142, b - 515); g.closePath(); g.fill();
    for (let k = 0; k <= 12; k++) { const u = k / 12, px = lerp(cx - 136, cx + 136, u), py = b - 515 - Math.sin(u * Math.PI) * 128; g.fillRect(px - 2, py - 16, 4, 18); g.beginPath(); g.arc(px, py - 17, 3.5, 0, TAU); g.fill(); }
    chhatri(g, cx, b - 646, 42);
    for (const s of [-1, 1]) { const tx = cx + s * 238; g.fillRect(tx - 10, b - 420, 20, 420); for (const yy of [300, 380]) g.fillRect(tx - 15, b - yy, 30, 7); onion(g, tx, b - 420, 13); chhatri(g, cx + s * 178, b - 290, 30); chhatri(g, cx + s * 98, b - 290, 22); }
    g.save(); g.globalCompositeOperation = 'destination-out';
    pointedArch(g, cx, b, 112, 380); g.fill();
    for (const s of [-1, 1]) for (let k = 0; k < 2; k++) { pointedArch(g, cx + s * (158 + k * 46), b - 36, 26, 112); g.fill(); }
    g.restore();
  }
  function mosque(g, cx, b, s = 1) {
    g.fillRect(cx - 150 * s, b - 160 * s, 300 * s, 160 * s);
    g.fillRect(cx - 50 * s, b - 198 * s, 100 * s, 42 * s); onion(g, cx, b - 198 * s, 56 * s);
    for (const d of [-1, 1]) {
      g.fillRect(cx + d * 100 * s - 22 * s, b - 188 * s, 44 * s, 30 * s); onion(g, cx + d * 100 * s, b - 188 * s, 25 * s);
      const mx = cx + d * 168 * s; g.fillRect(mx - 9 * s, b - 360 * s, 18 * s, 360 * s); for (const yy of [250, 330]) g.fillRect(mx - 14 * s, b - yy * s, 28 * s, 7 * s); onion(g, mx, b - 360 * s, 11 * s);
    }
    g.save(); g.globalCompositeOperation = 'destination-out'; for (let k = -2; k <= 2; k++) { pointedArch(g, cx + k * 50 * s, b - 22 * s, 24 * s, 82 * s); g.fill(); } g.restore();
  }
  function clockTower(g, cx, b) {
    g.fillRect(cx - 36, b - 170, 72, 170); g.fillRect(cx - 25, b - 610, 50, 610);
    g.fillRect(cx - 35, b - 698, 70, 92); g.fillRect(cx - 41, b - 708, 82, 12);
    g.beginPath(); g.moveTo(cx - 37, b - 708); g.lineTo(cx, b - 800); g.lineTo(cx + 37, b - 708); g.closePath(); g.fill();
    g.fillRect(cx - 1.5, b - 842, 3, 46);
    for (const s of [-1, 1]) { g.fillRect(cx + s * 37 - 5, b - 742, 10, 44); onion(g, cx + s * 37, b - 742, 6); }
    // lit dial
    g.fillStyle = 'rgba(201,196,191,.42)'; g.beginPath(); g.arc(cx, b - 652, 19, 0, TAU); g.fill();
    g.strokeStyle = FARC; g.lineWidth = 3; g.beginPath(); g.moveTo(cx, b - 652); g.lineTo(cx, b - 667); g.moveTo(cx, b - 652); g.lineTo(cx + 10, b - 648); g.stroke(); g.fillStyle = FARC;
  }
  function mobileTower(g, x, b, h) {
    g.save(); g.strokeStyle = FARC; g.lineWidth = 3; g.beginPath(); g.moveTo(x - 22, b); g.lineTo(x - 4, b - h); g.moveTo(x + 22, b); g.lineTo(x + 4, b - h);
    for (let k = 0; k < 9; k++) { const y1 = b - k * h / 9, y2 = b - (k + 1) * h / 9, w1 = lerp(22, 4, k / 9), w2 = lerp(22, 4, (k + 1) / 9); g.moveTo(x - w1, y1); g.lineTo(x + w2, y2); g.moveTo(x + w1, y1); g.lineTo(x - w2, y2); }
    g.stroke(); g.fillStyle = FARC; g.fillRect(x - 13, b - h - 30, 8, 28); g.fillRect(x + 5, b - h - 30, 8, 28); g.restore();
  }
  const farCanvas = () => L.cached('s3-far', FAR.w, FAR.h, g => {
    g.translate(-FAR.x0, -FAR.y0); const b = FAR.base; g.fillStyle = FARC;
    g.fillRect(FAR.x0, b - 70, FAR.w, 2000);
    for (let i = 0, x = FAR.x0; x < FAR.x0 + FAR.w; i++) {
      const w = 60 + rnd(301, i) * 120, h = 110 + rnd(302, i) * 190; g.fillRect(x, b - h, w - 3, h);
      if (rnd(303, i) > .5) { g.fillRect(x + w * .3, b - h - 22, w * .28, 22); g.beginPath(); g.ellipse(x + w * .44, b - h - 22, w * .14, 5, 0, 0, TAU); g.fill(); }
      x += w;
    }
    gateway(g, 250, b); mosque(g, 700, b, .9); clockTower(g, 1010, b); mobileTower(g, 1380, b - 230, 240); mosque(g, 1800, b, .75); gateway(g, 2350, b + 40); mosque(g, 2900, b, .8);
    g.globalCompositeOperation = 'source-atop';
    for (let i = 0; i < 260; i++) { const x = FAR.x0 + rnd(304, i) * FAR.w, y = b - 24 - rnd(305, i) * 260; g.fillStyle = rnd(306, i) > .72 ? 'rgba(255,181,71,.5)' : 'rgba(201,196,191,.16)'; g.fillRect(x, y, 4, 5); }
    // atmospheric lift toward the base (city glow in the haze)
    const hz = g.createLinearGradient(0, b - 700, 0, b); hz.addColorStop(0, 'rgba(80,62,96,0)'); hz.addColorStop(1, 'rgba(80,62,96,.28)');
    g.fillStyle = hz; g.fillRect(FAR.x0, b - 700, FAR.w, 700);
  });

  /* ======================= MID city (z 1.7) ======================= */
  const MID = { x0: -1400, y0: 360, w: 5200, h: 1380, base: 1740 }, MIDC = '#242027';
  let MIDB = null, MIDBLD = null;
  function midTable() {
    if (MIDBLD) return MIDBLD;
    MIDBLD = []; MIDB = [];
    let x = MID.x0 + 20, i = 0;
    while (x < MID.x0 + MID.w - 60) {
      const w = 130 + rnd(401, i) * 170, cx = x + w / 2; let top = 470 + rnd(402, i) * 270 - (rnd(403, i) > .84 ? 110 : 0);
      if ((cx > 80 && cx < 1000) || (cx > 1120 && cx < 1650)) top = Math.max(top, 610 + rnd(417, i) * 60);
      MIDBLD.push({ x, w, top, i });
      if (rnd(410, i) < .42) { const n = Math.floor((w - 8) / 9); for (let k = 0; k < n; k++) { const u = k / (n - 1 || 1); MIDB.push({ x: x + 4 + k * 9, y: top + 10 + Math.sin(u * Math.PI) * 6, col: k % 3 ? GOLD : BULB, ph: rnd(412, i * 50 + k) * 9, kind: 0 }); } }
      if (rnd(411, i) < .16) { const n = Math.floor((w - 16) / 13); for (let s = 0; s < n; s++) { const len = 90 + rnd(413, i * 40 + s) * 170; for (let j = 0; j * 10 < len; j++) MIDB.push({ x: x + 10 + s * 13, y: top + 16 + j * 10, col: (i + s) % 4 === 0 ? '#FF9F1C' : GOLD, ph: s * .9 + j * .55, kind: 1 }); } }
      x += w + (rnd(404, i) > .7 ? 14 + rnd(405, i) * 30 : 2); i++;
    }
    return MIDBLD;
  }
  const midCanvas = () => L.cached('s3-mid', MID.w, MID.h, g => {
    g.translate(-MID.x0, -MID.y0);
    for (const b of midTable()) {
      g.fillStyle = MIDC; g.fillRect(b.x, b.top, b.w, MID.base - b.top);
      if (rnd(406, b.i) > .55) for (let k = 8; k < b.w - 8; k += 17) merlon(g, b.x + k, b.top, 12, 13);
      topEdge(g, b.x, b.top, b.w, .3);
      const cols = Math.max(1, Math.floor((b.w - 20) / 30)), rows = Math.floor((MID.base - b.top - 40) / 40), cw = (b.w - 24) / cols;
      for (let r = 0; r < rows; r++) for (let cc = 0; cc < cols; cc++) {
        const k = rnd(407, b.i * 997 + r * 31 + cc), wx = b.x + 12 + cc * cw + (cw - 14) / 2, wy = b.top + 28 + r * 40;
        g.fillStyle = k < .4 ? '#1B181D' : k < .93 ? 'rgba(201,196,191,.1)' : 'rgba(255,181,71,.34)'; g.fillRect(wx, wy, 14, 20);
        if (k >= .9 && rnd(408, b.i * 13 + r) > .5) { g.fillStyle = 'rgba(40,24,18,.5)'; g.fillRect(wx + 8, wy, 6, 20); }
      }
      if (rnd(409, b.i) > .5) for (let r = 1; r < rows; r += 2) { const y = b.top + 28 + r * 40 + 22; g.fillStyle = '#1B181D'; g.fillRect(b.x + 4, y, b.w - 8, 4); g.fillStyle = 'rgba(140,135,131,.16)'; for (let xx = b.x + 6; xx < b.x + b.w - 6; xx += 6) g.fillRect(xx, y - 10, 1.5, 10); g.fillRect(b.x + 4, y - 10, b.w - 8, 1.5); }
      if (rnd(414, b.i) > .45) { const tx = b.x + b.w * (.2 + .5 * rnd(415, b.i)); g.fillStyle = '#17141A'; g.fillRect(tx, b.top - 30, 34, 30); g.beginPath(); g.ellipse(tx + 17, b.top - 30, 17, 5, 0, 0, TAU); g.fill(); g.fillStyle = 'rgba(140,135,131,.25)'; g.fillRect(tx, b.top - 31, 34, 1.5); }
      if (rnd(416, b.i) > .8) { const ax = b.x + b.w * .8; g.fillStyle = '#17141A'; g.fillRect(ax, b.top - 70, 3, 70); g.fillRect(ax - 9, b.top - 60, 21, 3); g.fillRect(ax - 6, b.top - 46, 15, 3); }
    }
    g.globalCompositeOperation = 'source-atop'; g.globalAlpha = .5; g.drawImage(plasterTex(MID.w, MID.h), MID.x0, MID.y0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  });
  function drawMid(g, T, c, vx, vy) {
    g.drawImage(midCanvas(), MID.x0, MID.y0);
    const [a, b] = visX(c, 1.7);
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const m of MIDB) {
      if (m.x < a || m.x > b) continue;
      const br = m.kind ? .3 + .7 * (.5 + .5 * Math.sin(T * 5 - m.ph)) : .45 + .55 * L.noise1(T * 2.2 + m.ph, 3);
      glow(g, m.x, m.y, 9, m.col, .22 * br); lightDot(g, m.x, m.y, 1.5, L.mix(m.col, '#FFFFFF', .35 * br), .35 + .45 * br, vx, vy);
    }
    g.restore();
  }

  /* ======================= STREET (z 1, world) ======================= */
  function drawStreet(g, c) {
    const [xa, xb] = visX(c, 1), xL = Math.floor(xa / 160) * 160 - 160, xR = xb + 160;
    g.fillStyle = '#2A2629'; g.fillRect(xL, 1632, xR - xL, 30); topEdge(g, xL, 1632, xR - xL, .5);
    g.fillStyle = '#1D1A1E'; for (let x = xL; x < xR; x += 64) g.fillRect(x, 1650, 2, 12);
    const gr = g.createLinearGradient(0, 1662, 0, 2400); gr.addColorStop(0, '#201D21'); gr.addColorStop(1, '#141215');
    g.fillStyle = gr; g.fillRect(xL, 1662, xR - xL, 1400);
    g.fillStyle = 'rgba(140,135,131,.5)'; for (let x = xL; x < xR; x += 160) g.fillRect(x, 1918, 86, 7);
    L.textureOverlay(g, 'powder', xL, 1662, xR - xL, 760, { alpha: .09, blend: 'overlay', scale: .5, seed: 9 });
  }

  /* ======================= BAR A: tri-vision on a rooftop ======================= */
  const TV = { x: 120, y: 560, w: 840, h: 620, n: 16 }, LAMPS_A = [380, 700];
  const heroLay = g => L.layoutWords(g, HERO_A, 420, { font: 'dev', size: 92, weight: 800 });
  function printToran(g, w) {
    g.strokeStyle = 'rgba(140,135,131,.8)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 18); g.quadraticCurveTo(w / 2, 40, w, 18); g.stroke();
    const n = 28;
    for (let k = 0; k <= n; k++) { const u = k / n, x = u * w, y = 18 + 22 * 4 * u * (1 - u) * .5 + 1;
      g.fillStyle = k % 2 ? GOLDINK : '#D9721E'; g.beginPath(); g.arc(x, y, 10, 0, TAU); g.fill();
      g.fillStyle = 'rgba(122,56,10,.45)'; g.beginPath(); g.arc(x, y, 3.5, 0, TAU); g.fill();
      if (k % 4 === 2) for (let j = 1; j <= 3; j++) { g.fillStyle = (j + k) % 2 ? GOLDINK : '#D9721E'; g.beginPath(); g.arc(x, y + j * 17, 8 - j, 0, TAU); g.fill(); }
      if (k % 4 === 0 && k > 0 && k < n) { g.fillStyle = '#5E6B3A'; g.beginPath(); g.moveTo(x - 6, y + 6); g.lineTo(x + 6, y + 6); g.lineTo(x, y + 30); g.closePath(); g.fill(); }
    }
  }
  const faceA = () => L.cached('s3-faceA', TV.w, TV.h, g => {
    g.fillStyle = MIST; g.fillRect(0, 0, TV.w, TV.h);
    g.fillStyle = 'rgba(228,225,220,.55)'; for (let k = -8; k < 22; k++) { g.beginPath(); g.moveTo(k * 70, 0); g.lineTo(k * 70 + 32, 0); g.lineTo(k * 70 - 140 + 32, TV.h); g.lineTo(k * 70 - 140, TV.h); g.closePath(); g.fill(); }
    g.fillStyle = MIST; g.fillRect(36, 150, 768, 290); g.strokeStyle = STONE; g.lineWidth = 3; g.strokeRect(36, 150, 768, 290);
    L.text(g, 'MEGA SALE 50%', 420, 340, { font: 'lat', size: 90, weight: 760, color: STONE, maxWidth: 760 });
    L.text(g, 'UPTO*', 60, 205, { font: 'lat', size: 30, weight: 650, color: STONE, align: 'left', maxWidth: 200 });
    L.text(g, '*T&C apply', 786, 420, { font: 'lat', size: 22, weight: 500, color: STONE, align: 'right', maxWidth: 200 });
    L.textureOverlay(g, 'paper', 0, 0, TV.w, TV.h, { alpha: .2, blend: 'multiply', scale: .6, seed: 4 });
  });
  function faceB(full) {
    return L.cached('s3-faceB' + (full ? 'F' : 'N'), TV.w, TV.h, g => {
      g.fillStyle = MUSLIN; g.fillRect(0, 0, TV.w, TV.h);
      // printed floor band where the jhadu sweeps: flat diamond tiles
      g.fillStyle = LINEN; g.fillRect(0, 452, TV.w, 168);
      g.save(); g.beginPath(); g.rect(0, 452, TV.w, 168); g.clip(); g.strokeStyle = 'rgba(244,242,238,.85)'; g.lineWidth = 2;
      for (let k = -10; k < 30; k++) { g.beginPath(); g.moveTo(k * 56, 452); g.lineTo(k * 56 + 168, 620); g.moveTo(k * 56, 620); g.lineTo(k * 56 + 168, 452); g.stroke(); }
      g.restore(); g.fillStyle = 'rgba(140,135,131,.55)'; g.fillRect(0, 452, TV.w, 3);
      printToran(g, TV.w);
      const o = { font: 'dev', size: 92, weight: 800 }, lay = heroLay(g);
      for (const wd of lay) {
        if (wd.i === 3) { const wh = L.measure(g, HAF, o); if (full) L.text(g, HAF, wd.x, 240, Object.assign({}, o, { align: 'left', color: RED, maxWidth: wh + 2 })); L.text(g, DANDA, wd.x + wh, 240, Object.assign({}, o, { align: 'left', color: INK, maxWidth: 60 })); }
        else L.text(g, wd.word, wd.x, 240, Object.assign({}, o, { align: 'left', color: INK, maxWidth: wd.w + 2 }));
      }
      L.text(g, SUB_A, 420, 330, { font: 'lat', size: 44, weight: 600, color: INK, maxWidth: 700 });
      L.textureOverlay(g, 'paper', 0, 0, TV.w, TV.h, { alpha: .07, blend: 'multiply', scale: .6, seed: 5 });
    });
  }
  /** night light map for the face: ambient + two warm up-light pools (multiply) */
  const faceLight = () => L.cached('s3-facelight', TV.w, TV.h, g => {
    const im = g.createImageData(TV.w, TV.h), d = im.data, amb = .34, warm = [1, .95, .86], cool = [.82, .78, .9];
    for (let y = 0; y < TV.h; y++) for (let x = 0; x < TV.w; x++) {
      let l = 0; for (const lx of LAMPS_A) { const dx = (x - (lx - TV.x)) / 360, dy = (y - 700) / 600; l += Math.exp(-(dx * dx + dy * dy)); }
      l = Math.min(1.12, l * .9); const v = amb + (1 - amb) * Math.min(1, l), w = Math.min(1, l);
      const i = (y * TV.w + x) * 4;
      for (let k = 0; k < 3; k++) d[i + k] = Math.min(255, 255 * v * lerp(cool[k], warm[k], w) * (1 + .06 * Math.max(0, l - 1)));
      d[i + 3] = 255;
    }
    g.putImageData(im, 0, 0);
  });
  const aBack = () => L.cached('s3-aback', 1560, 300, g => {
    g.translate(320, -1060);
    // W-truss under the board: pillars and V-braces (the mark's own vocabulary)
    g.fillStyle = '#1C191C'; g.fillRect(150, 1226, 780, 9); g.fillRect(150, 1286, 780, 9);
    g.strokeStyle = '#1C191C'; g.lineWidth = 6; g.beginPath(); for (let x = 150; x < 920; x += 77) { g.moveTo(x, 1290); g.lineTo(x + 38.5, 1230); g.lineTo(x + 77, 1290); } g.stroke();
    for (const px of [250, 802]) { g.fillStyle = '#1F1C1F'; g.fillRect(px, 1180, 28, 140); g.fillStyle = 'rgba(140,135,131,.35)'; g.fillRect(px, 1180, 2, 140); }
    topEdge(g, 150, 1226, 780, .35);
    // water tank (Sintex-style) and dish
    g.fillStyle = '#141216'; g.fillRect(992, 1176, 104, 130); g.beginPath(); g.ellipse(1044, 1176, 52, 12, 0, 0, TAU); g.fill();
    g.fillStyle = 'rgba(140,135,131,.35)'; g.beginPath(); g.ellipse(1044, 1176, 52, 12, 0, Math.PI, TAU); g.lineWidth = 2; g.strokeStyle = 'rgba(140,135,131,.4)'; g.stroke();
    g.fillStyle = 'rgba(0,0,0,.35)'; for (const y of [1205, 1235, 1265]) g.fillRect(992, y, 104, 4);
    g.fillStyle = '#1A171B'; g.fillRect(36, 1250, 5, 60); g.save(); g.translate(40, 1246); g.rotate(-.5); g.beginPath(); g.ellipse(0, 0, 24, 9, 0, 0, TAU); g.fill(); g.restore();
    // stair room (mumty) with a lit doorway
    g.fillStyle = '#211D21'; g.fillRect(-300, 1150, 230, 160); topEdge(g, -300, 1150, 230, .5);
    g.fillStyle = 'rgba(255,181,71,.45)'; g.fillRect(-210, 1200, 46, 100);
  });
  const aFrame = () => L.cached('s3-aframe', 920, 770, g => {
    g.translate(-90, -530);
    const fx = TV.x - 14, fy = TV.y - 14, fw = TV.w + 28, fh = TV.h + 28;
    g.fillStyle = '#231F22'; g.fillRect(fx, fy, fw, 14); g.fillRect(fx, TV.y + TV.h, fw, 14); g.fillRect(fx, fy, 14, fh); g.fillRect(TV.x + TV.w, fy, 14, fh);
    topEdge(g, fx, fy, fw); g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(TV.x, TV.y, TV.w, 6);
    g.fillStyle = 'rgba(140,135,131,.6)'; for (const [x, y] of [[fx + 7, fy + 7], [fx + fw - 7, fy + 7], [fx + 7, fy + fh - 7], [fx + fw - 7, fy + fh - 7]]) { g.beginPath(); g.arc(x, y, 3, 0, TAU); g.fill(); }
    // catwalk
    g.fillStyle = '#1E1B1E'; g.fillRect(96, 1196, 888, 12); topEdge(g, 96, 1196, 888, .8);
    g.fillStyle = '#151316'; for (let x = 100; x < 980; x += 12) g.fillRect(x, 1200, 6, 5);
    g.strokeStyle = '#1E1B1E'; g.lineWidth = 4; g.beginPath(); for (let x = 110; x < 970; x += 64) { g.moveTo(x, 1208); g.lineTo(x + 32, 1224); g.lineTo(x + 64, 1208); } g.stroke();
    // lamp arms + housings (lens drawn live)
    for (const lx of LAMPS_A) {
      g.fillStyle = '#19161A'; g.fillRect(lx - 3, 1206, 6, 22);
      g.save(); g.translate(lx, 1240); g.rotate(-.1); g.fillStyle = '#1D1A1E'; g.beginPath(); g.moveTo(-34, -10); g.lineTo(34, -10); g.lineTo(26, 16); g.lineTo(-26, 16); g.closePath(); g.fill();
      g.fillStyle = '#141215'; for (let k = -2; k <= 2; k++) g.fillRect(k * 11 - 2, 0, 4, 14);
      g.fillStyle = 'rgba(140,135,131,.8)'; g.fillRect(-34, -11, 68, 2); g.restore();
    }
    g.fillStyle = '#19161A'; g.fillRect(760, 1208, 3, 26); g.fillRect(928, 1208, 3, 26);
    plate(g, 730, 1232, 230, 40);
  });
  const aBldg = () => L.cached('s3-abldg', 1560, 360, g => {
    g.translate(320, -1290);
    g.fillStyle = INK; g.fillRect(-320, 1340, 1560, 300);
    // parapet with chevron jaali
    g.fillStyle = '#332E31'; g.fillRect(-320, 1300, 1560, 42); topEdge(g, -320, 1300, 1560, .9);
    g.fillStyle = '#161317'; for (let x = -310; x < 1230; x += 30) { g.beginPath(); g.moveTo(x, 1312); g.lineTo(x + 8, 1312); g.lineTo(x + 13, 1322); g.lineTo(x + 18, 1312); g.lineTo(x + 26, 1312); g.lineTo(x + 13, 1334); g.closePath(); g.fill(); }
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(-320, 1342, 1560, 6);
    // one storey of arched windows + a balcony
    for (let k = 0; k < 10; k++) {
      const x = -250 + k * 150, st = rnd(501, k);
      g.fillStyle = '#19161A'; archWin(g, x - 4, 1384, 72, 92); g.fill();
      g.fillStyle = st > .72 ? 'rgba(255,181,71,.36)' : st > .2 ? 'rgba(201,196,191,.13)' : '#141215'; archWin(g, x, 1388, 64, 86); g.fill();
      g.fillStyle = '#19161A'; g.fillRect(x + 30, 1388, 4, 86); topEdge(g, x - 6, 1476, 76, .4);
    }
    g.fillStyle = '#1F1C1F'; g.fillRect(500, 1478, 300, 10); topEdge(g, 500, 1478, 300, .6);
    g.fillStyle = 'rgba(140,135,131,.3)'; for (let x = 504; x < 800; x += 10) g.fillRect(x, 1488, 2, 30); g.fillRect(500, 1516, 300, 2);
    g.fillStyle = '#262225'; g.fillRect(-320, 1540, 1560, 8);
    grime(g, -320, 1290, 1560, 360, 1);
  });
  function slatAngle(T, i) {
    const t0 = 5.0667 + i * .0035, d = .08, u = (T - t0) / d;
    if (u <= 0) return 0; if (u < 1) return 120 * E.inOutQuad(u);
    const v = T - (t0 + d); return v > .6 ? 120 : 120 + 5 * Math.exp(-30 * v) * Math.sin(60 * v);
  }
  // jhadu sweep keyframes: t, contact x, lift, angle (deg), bristle bend
  const JK = [[5.2, 150, 8, -52, -.3], [5.233, 215, 0, -50, -.9], [5.35, 560, 0, -36, -.7], [5.383, 615, 0, -30, .8], [5.417, 585, 24, -46, .2], [5.45, 610, 0, -50, -.9], [5.53, 930, 0, -36, -.7], [5.567, 1010, 4, -28, .8], [5.62, 1110, 34, -22, .4]];
  const JX = JK.map(k => [k[0], k[1]]), JL = JK.map(k => [k[0], k[2]]), JA = JK.map(k => [k[0], k[3]]), JB = JK.map(k => [k[0], k[4]]);
  function jhadu(g, bend) {
    for (let k = 0; k < 46; k++) {   // bristle fan: straight tapered strands spreading into a V
      const u = k / 45 - .5, len = 92 * (.84 + .16 * rnd(71, k)) * (1 - .18 * Math.abs(u));
      const tx = u * 130 + bend * 30 * (.55 + .45 * rnd(72, k)) * (.4 + Math.abs(u)), ty = len;
      g.strokeStyle = [STONE, '#9A948D', '#A9A39B', '#7E7974', '#B7B1AA'][Math.floor(rnd(73, k) * 5)]; g.lineWidth = 2.8 - 1.1 * rnd(74, k); g.lineCap = 'butt';
      g.beginPath(); g.moveTo(u * 18, 8); g.quadraticCurveTo(u * 18 + (tx - u * 18) * .3 - bend * 6, ty * .55, tx, ty); g.stroke();
    }
    g.fillStyle = '#3A3536'; g.beginPath(); g.moveTo(-12, -6); g.lineTo(12, -6); g.lineTo(9, 16); g.lineTo(-9, 16); g.closePath(); g.fill();
    g.fillStyle = MIST; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(-12, -4 + k * 5); g.lineTo(12, -7 + k * 5); g.lineTo(12, -5 + k * 5); g.lineTo(-12, -2 + k * 5); g.closePath(); g.fill(); }
    g.fillStyle = INK; g.beginPath(); g.roundRect(-5, -152, 10, 148, 4); g.fill();
    g.fillStyle = 'rgba(140,135,131,.75)'; g.fillRect(-4, -148, 2, 140);
    g.strokeStyle = STONE; g.lineWidth = 2; g.beginPath(); g.arc(0, -158, 6, 0, TAU); g.stroke();
  }
  const PUFFS = [[5.29, 430, 1128], [5.383, 655, 1124], [5.55, 958, 1124]];
  function drawPuffs(g, T) {
    for (let p = 0; p < 3; p++) {
      const [t0, px, py] = PUFFS[p], u = (T - t0) / .42; if (u < 0 || u > 1) continue;
      for (let j = 0; j < 9; j++) {
        const a = -Math.PI * (.1 + .8 * rnd(81, p * 9 + j)), d = 16 + 46 * E.outCubic(u) * (.6 + .6 * rnd(82, p * 9 + j));
        const r = (12 + 20 * rnd(83, p * 9 + j)) * (.4 + .9 * E.outCubic(u));
        g.fillStyle = L.rgba(['#9C968F', STONE, '#B3ADA6'][j % 3], .9 * (1 - u) * (1 - u));
        g.beginPath(); g.arc(px + Math.cos(a) * d + 26 * u, py + Math.sin(a) * d - 30 * u, r, 0, TAU); g.fill();
      }
    }
  }
  function sparkle(g, x, y, s, a) {   // 4-point glint: thin gold arms, white core (true light: blooms)
    if (a <= .01) return;
    glow(g, x, y, s * 2.4, GOLD, .28 * a);
    g.fillStyle = L.rgba(GOLD, .95 * a); g.beginPath();
    g.moveTo(x, y - s); g.lineTo(x + s * .16, y - s * .16); g.lineTo(x + s, y); g.lineTo(x + s * .16, y + s * .16); g.lineTo(x, y + s); g.lineTo(x - s * .16, y + s * .16); g.lineTo(x - s, y); g.lineTo(x - s * .16, y - s * .16); g.closePath(); g.fill();
    g.fillStyle = L.rgba('#FFFFFF', a); g.beginPath(); g.arc(x, y, s * .16 + .8, 0, TAU); g.fill();
  }
  function drawSparkles(g, T) {
    if (T < 5.45 || T > 6.5) return;
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 24; k++) {
      const p = k % 3, [, px, py] = PUFFS[p], ts = 5.48 + rnd(91, k) * .3, te = 6.4 - rnd(92, k) * .12, u = (T - ts) / (te - ts); if (u < 0 || u > 1) continue;
      const side = [-1, 0, 1][p], e = E.outCubic(u);
      const x = px + (rnd(93, k) - .5) * 90 + side * 120 * e + Math.sin(T * 3 + k) * 14, y = lerp(py - 20 - rnd(94, k) * 40, 420 + rnd(95, k) * 70, e);
      const s = (11 + 15 * rnd(96, k)) * (.55 + .45 * Math.abs(Math.sin(T * 14 + k * 1.7))) * (1 + .8 * Math.max(0, 1 - u * 10));
      sparkle(g, x, y, s, Math.min(1, u * 8) * (1 - E.inQuad(clamp((u - .6) / .4))));
    }
    g.restore();
  }
  function crackT(T) { const u = T - 6.4; if (u < 0 || u > .14) return 0; return keys(u, [[0, 0], [.033, 1], [.1, -.25], [.133, 0]]); }
  function drawFaceLive(g, T) {   // printed-surface animation (hero word, fine print, jhadu): lit with the face
    g.save(); g.translate(TV.x, TV.y);
    const o = { font: 'dev', size: 92, weight: 800 }, lay = heroLay(g), wd = lay[3], wh = L.measure(g, HAF, o);
    const k = crackT(T), sq = (T >= 6.4 && T < 6.467) ? .92 : 1;
    g.save(); g.translate(wd.x + wh / 2, 240); g.transform(1, 0, -Math.tan(8 * DEG * k), 1, 0, 0); g.scale(1, sq);
    L.text(g, HAF, 0, 0, Object.assign({}, o, { color: RED, maxWidth: wh + 2 }));
    g.restore();
    if (T >= 6.4 && T < 6.53) {   // 'krrk' ticks
      const a = 1 - (T - 6.4) / .13; g.strokeStyle = L.rgba(INK, a); g.lineWidth = 4; g.lineCap = 'round';
      const cx = wd.x + wh + 10, cy = 240 - 74;
      for (let j = 0; j < 3; j++) { const ang = -1.1 + j * .55, r0 = 14, r1 = 14 + 22 * E.outCubic(clamp((T - 6.4) / .06)); g.beginPath(); g.moveTo(cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0); g.lineTo(cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1); g.stroke(); }
    }
    const fa = prog(T, 6.4, 6.6, E.outQuad);
    if (fa > 0) {
      const ew = L.measure(g, FINE_A_EN, { font: 'lat', size: 28, weight: 500 });
      L.text(g, FINE_A_EN, 810, 590, { font: 'lat', size: 28, weight: 500, color: STONE, align: 'right', alpha: fa, maxWidth: 260 });
      L.text(g, FINE_A_HI, 810 - ew, 590, { font: 'dev', size: 28, weight: 500, color: STONE, align: 'right', alpha: fa, maxWidth: 230 });
    }
    g.restore();
    // jhadu: two strokes along the printed floor, shadow on the face
    if (T >= 5.2 && T <= 5.64) {
      const x = keys(T, JX), lift = keys(T, JL), ang = keys(T, JA) * DEG, bend = keys(T, JB);
      for (const sh of [1, 0]) {
        g.save(); g.translate(x + sh * 12, 1150 - lift + sh * 14); g.rotate(ang); g.scale(1.22, 1.22); g.translate(0, -86);
        if (sh) { g.globalAlpha = .13; g.filter = 'none'; g.globalCompositeOperation = 'multiply'; }
        jhadu(g, bend); g.restore();
      }
    }
    drawPuffs(g, T);
  }
  function drawTri(g, T) {
    const { x: X, y: Y, w: FWd, h: FH, n: N } = TV, SW = FWd / N, RIN = SW / (2 * Math.sqrt(3));
    g.fillStyle = '#0E0C10'; g.fillRect(X, Y, FWd, FH);
    const fa = faceA(), fb = faceB(T < TA);
    let settled = true; const angs = [];
    for (let i = 0; i < N; i++) { const a = slatAngle(T, i); angs.push(a); if (Math.abs(a - 120) > .25) settled = false; }
    if (settled) g.drawImage(fb, X, Y);
    else for (let i = 0; i < N; i++) {
      const th = angs[i] * DEG, cx = X + (i + .5) * SW; let edgeX = null;
      for (const [img, ph] of [[fa, th], [fb, th - 2 * Math.PI / 3]]) {
        const cs = Math.cos(ph); if (cs <= .004) continue;
        const cc = cx + RIN * Math.sin(ph), hw = SW / 2 * cs;
        g.drawImage(img, i * SW, 0, SW, FH, cc - hw, Y, hw * 2 + .5, FH);
        const shade = 1 - (.22 + .78 * Math.pow(cs, .8)); if (shade > .01) { g.fillStyle = `rgba(12,9,16,${shade * .9})`; g.fillRect(cc - hw, Y, hw * 2 + .5, FH); }
        if (img === fb) edgeX = cc + hw; else if (edgeX === null) edgeX = cc - hw;
      }
      if (edgeX !== null && angs[i] > 2 && angs[i] < 118) { g.fillStyle = 'rgba(255,238,214,.35)'; g.fillRect(edgeX - 1, Y, 2, FH); }
    }
    if (T >= TA - .001) { g.save(); g.beginPath(); g.rect(X, Y, FWd, FH); g.clip(); drawFaceLive(g, T); g.restore(); }
    // night light: multiply light map, then warm hot-spots off the up-lights
    g.save(); g.beginPath(); g.rect(X, Y, FWd, FH); g.clip();
    g.globalCompositeOperation = 'multiply'; g.drawImage(faceLight(), X, Y);
    g.globalCompositeOperation = 'lighter';
    for (const lx of LAMPS_A) { const fl = .9 + .1 * L.noise1(T * 7 + lx, 4); glow(g, lx, Y + FH + 10, 150, '#FFD9A8', .16 * fl); }
    g.globalCompositeOperation = 'source-over';
    for (let i = 0; i < N; i++) { const v = rnd(121, i) - .5; g.fillStyle = v > 0 ? `rgba(255,248,236,${.05 * v})` : `rgba(10,8,14,${-.07 * v})`; g.fillRect(X + i * SW, Y, SW, FH); }
    g.fillStyle = 'rgba(8,6,10,.42)'; for (let i = 1; i < N; i++) g.fillRect(X + i * SW - .75, Y, 1.5, FH);
    g.fillStyle = 'rgba(255,246,230,.10)'; for (let i = 1; i < N; i++) g.fillRect(X + i * SW - 2.5, Y, 1.5, FH);
    g.restore();
  }
  function drawA(g, T, vx) {
    g.drawImage(aBack(), -320, 1060);
    drawTri(g, T);
    g.drawImage(aFrame(), 90, 530);
    g.drawImage(aBldg(), -320, 1290);
    // lamp lenses + faint volumetric beams up the face
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const [k, lx] of LAMPS_A.entries()) {
      const fl = .9 + .1 * L.noise1(T * 7 + lx, 4);
      glow(g, lx, 1229, 110, '#FFD9A8', .6 * fl); glow(g, lx, 1229, 36, '#FFF4E0', .8 * fl);
      g.fillStyle = `rgba(255,236,206,${.22 * fl})`; g.fillRect(lx - 120, 1228, 240, 2);   // anamorphic glint
      g.fillStyle = `rgba(255,250,240,${fl})`; g.beginPath(); g.ellipse(lx, 1229, 26, 4.5, -.1, 0, TAU); g.fill();
    }
    g.restore();
    // parapet: string lights + five diyas
    L.stringLights(g, { x0: -320, y0: 1346, x1: 1240, y1: 1346, sag: 16, n: 64, t: T, seed: 4, size: 4, colors: [GOLD, BULB, '#FF9F1C'], mode: 'twinkle', wire: 'rgba(15,12,16,.9)' });
    for (const [k, x] of [190, 362, 540, 718, 890].entries()) L.diya(g, x, 1291, 13, T, 40 + k, { flameSize: 18 });
    drawSparkles(g, T);
  }

  /* ======================= BAR B: LED screen on a facade ======================= */
  const SCR = { x: 170, y: 620, w: 740, h: 600 };
  const bBldg = () => L.cached('s3-bbldg', 1400, 1150, g => {
    g.translate(150, -520);
    const X0 = -130, X1 = 1230;
    g.fillStyle = INK; g.fillRect(X0, 560, X1 - X0, 1100);
    for (let x = X0 + 14; x < X1 - 10; x += 26) merlon(g, x, 552, 20, 18);
    g.fillStyle = '#353032'; g.fillRect(X0 - 6, 550, X1 - X0 + 12, 14); topEdge(g, X0 - 6, 550, X1 - X0 + 12);
    for (let y = 700; y < 1300; y += 128) { g.fillStyle = '#252123'; g.fillRect(X0, y, X1 - X0, 8); topEdge(g, X0, y, X1 - X0, .22); }
    // side windows: arched, a few warm, most cool
    const win = (x, y, k) => { g.fillStyle = '#19161A'; archWin(g, x - 4, y - 4, 64, 92); g.fill(); const st = rnd(601, k);
      g.fillStyle = st > .62 ? 'rgba(255,181,71,.34)' : st > .18 ? 'rgba(201,196,191,.13)' : '#141215'; archWin(g, x, y, 56, 84); g.fill();
      if (st > .62) { g.fillStyle = 'rgba(52,28,20,.55)'; g.fillRect(x + 30, y + 10, 26, 74); }
      g.fillStyle = '#19161A'; g.fillRect(x + 26, y, 4, 84); topEdge(g, x - 6, y + 86, 68, .45); };
    let kk = 0; for (const y of [612, 740, 868, 996, 1124]) { win(-100, y, kk++); win(40, y, kk++); win(960, y, kk++); win(1100, y, kk++); }
    // AC units
    const ac = (x, y) => { g.fillStyle = '#39343A'; g.fillRect(x, y, 58, 40); topEdge(g, x, y, 58, .6); g.strokeStyle = '#211E22'; g.lineWidth = 2; g.beginPath(); g.arc(x + 22, y + 20, 13, 0, TAU); g.stroke(); for (let k = 0; k < 4; k++) g.fillRect(x + 42, y + 8 + k * 7, 10, 2); };
    ac(30, 1080); ac(1080, 960); ac(-110, 830);
    // bezel + switched-off screen
    g.fillStyle = '#211E20'; g.fillRect(150, 600, 780, 640); topEdge(g, 150, 600, 780);
    g.fillStyle = '#121014'; g.fillRect(170, 620, 740, 600);
    g.fillStyle = 'rgba(140,135,131,.55)'; for (const [x, y] of [[160, 610], [920, 610], [160, 1230], [920, 1230], [540, 610], [540, 1230]]) { g.beginPath(); g.arc(x, y, 3, 0, TAU); g.fill(); }
    // controller box + cable run down the facade
    g.fillStyle = '#2E292D'; g.fillRect(150, 1250, 64, 40); topEdge(g, 150, 1250, 64, .6);
    g.strokeStyle = '#141215'; g.lineWidth = 3; g.beginPath(); for (const dx of [0, 6, 12]) { g.moveTo(170 + dx, 1290); g.quadraticCurveTo(150 + dx, 1330, 132 + dx, 1400); } g.stroke();
    plate(g, 690, 1246, 240, 40);
    // ground-floor mithai shop: awning, warm interior, counter with trays
    g.fillStyle = '#1E1B1E'; g.fillRect(X0, 1300, X1 - X0, 340);
    const ig = g.createLinearGradient(0, 1350, 0, 1640); ig.addColorStop(0, 'rgba(255,181,71,.42)'); ig.addColorStop(1, 'rgba(255,140,40,.12)');
    g.fillStyle = ig; g.fillRect(40, 1352, 1000, 288);
    g.fillStyle = '#2A2427'; for (let x = 40; x < 1040; x += 6) g.fillRect(x, 1352, 6, 22); g.fillStyle = 'rgba(0,0,0,.4)'; for (let x = 40; x < 1040; x += 6) g.fillRect(x, 1352, 1.5, 22);
    for (let k = 0; k < 26; k++) { const x = X0 + k * 52; g.fillStyle = k % 2 ? '#8C8783' : '#3A3536'; g.beginPath(); g.moveTo(x, 1300); g.lineTo(x + 52, 1300); g.lineTo(x + 52, 1336); g.arc(x + 26, 1336, 26, 0, Math.PI); g.closePath(); g.fill(); }
    g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(X0, 1300, X1 - X0, 36); topEdge(g, X0, 1300, X1 - X0, .8);
    grime(g, -150, 520, 1400, 1150, 1);
    g.fillStyle = 'rgba(244,242,238,.08)'; g.fillRect(80, 1500, 920, 140); g.strokeStyle = 'rgba(140,135,131,.6)'; g.lineWidth = 2; g.strokeRect(80, 1500, 920, 140);
    for (let k = 0; k < 9; k++) { const tx = 110 + k * 100; g.fillStyle = 'rgba(140,135,131,.6)'; g.fillRect(tx, 1560, 80, 4);
      for (let j = 0; j < 4; j++) { g.fillStyle = [GOLDINK, MUSLIN, '#D9721E', LINEN][k % 4]; if (k % 4 === 1) { g.beginPath(); g.moveTo(tx + 10 + j * 18, 1546); g.lineTo(tx + 18 + j * 18, 1540); g.lineTo(tx + 26 + j * 18, 1546); g.lineTo(tx + 18 + j * 18, 1552); g.closePath(); g.fill(); } else { g.beginPath(); g.arc(tx + 16 + j * 16, 1552, 7, 0, TAU); g.fill(); } } }
  });
  function bLines() {   // LED copy rendered once
    const o1 = { font: 'dev', size: 72, weight: 700 }, o2 = { font: 'dev', size: 84, weight: 800 }, os = { font: 'lat', size: 40, weight: 600 };
    return { o1, o2, os, l2: textImg(B2, o2, RED), sub: textImg(SUB_B, os, MIST) };
  }
  let KAJU = null;
  function kajuTable() {
    if (KAJU) return KAJU;
    KAJU = []; const Hf = new Float32Array(320).fill(1214);   // heightfield over x 620..940
    const ev = [8.1, 8.267, 8.4, 8.567, 8.733, 8.933, 9.1, 9.267], cnt = [3, 2, 3, 2, 3, 2, 3, 2]; let i = 0;
    ev.forEach((te, e) => { for (let j = 0; j < cnt[e]; j++, i++) {
      const target = 668 + rnd(44, i * 3) * 204; let best = null;
      for (let cx = Math.max(664, target - 80); cx <= Math.min(876, target + 80); cx += 6) {
        let top = 1e9; for (let x = cx - 24; x <= cx + 24; x += 2) top = Math.min(top, Hf[Math.round(x) - 620]);
        const score = top - Math.abs(cx - target) * .12; if (!best || score > best.score) best = { cx, top, score };
      }
      const tx = best.cx + (rnd(44, i * 3 + 5) - .5) * 5, cy = best.top - 11;
      const sl = (Hf[Math.round(tx + 22) - 620] - Hf[Math.round(tx - 22) - 620]) / 44;
      const ang = clamp(Math.atan(sl) * .6 + (rnd(44, i * 3 + 1) - .5) * .32, -.4, .4);
      for (let x = Math.round(tx - 30); x <= tx + 30; x++) { const q = x - 620; if (q >= 0 && q < 320) Hf[q] = Math.min(Hf[q], cy - 7 + Math.abs(x - tx) * .22); }
      const tl = te + (j - (cnt[e] - 1) / 2) * .012, fall = e === 0 ? tl - 7.9 : .24 + rnd(44, i * 3 + 2) * .14, y0 = 590, d = cy - y0;
      KAJU.push({ tl, t0: tl - fall, fall, x0: tx + (rnd(45, i) - .5) * 140, tx, cy, ang, y0, v0: (d - 1100 * fall * fall) / fall, spin: (rnd(46, i) - .5) * 10, glint: rnd(47, i) });
    } });
    return KAJU;
  }
  const kajuSprite = () => L.cached('s3-kaju', 76, 64, g => {
    g.translate(38, 26);
    g.fillStyle = '#D9CDB9'; L.poly(g, [[-28, 0], [0, 18], [0, 26], [-28, 8]]); g.fill();
    g.fillStyle = '#B9AB95'; L.poly(g, [[0, 18], [28, 0], [28, 8], [0, 26]]); g.fill();
    g.fillStyle = 'rgba(255,255,255,.18)'; L.poly(g, [[-28, 0], [0, 18], [0, 20], [-28, 2]]); g.fill();
    const tg = g.createLinearGradient(-20, -14, 18, 14); tg.addColorStop(0, '#F3EDE2'); tg.addColorStop(1, '#E4DACA');
    g.fillStyle = tg; L.poly(g, [[0, -18], [28, 0], [0, 18], [-28, 0]]); g.fill();
    g.fillStyle = 'rgba(201,190,170,.75)'; L.poly(g, [[0, -12], [19, 0], [0, 12], [-19, 0]]); g.fill();   // the bevelled top facet
    g.fillStyle = '#EFE8DC'; L.poly(g, [[0, -10], [16, 0], [0, 10], [-16, 0]]); g.fill();
    for (let k = 0; k < 9; k++) { const x = (rnd(48, k) - .5) * 26, y = (rnd(49, k) - .5) * 12, s = 2 + rnd(50, k) * 3; g.fillStyle = k % 3 ? PAPER : '#D8D5D0'; L.poly(g, [[x - s, y], [x, y - s * .6], [x + s, y + s * .2], [x + s * .2, y + s * .7]]); g.fill(); }
    g.fillStyle = 'rgba(255,255,255,.0)';
  });
  function drawKaju(g, T) {
    const sp = kajuSprite();
    for (const k of kajuTable()) {
      if (T < k.t0) continue;
      let x, y, a, sy = 1;
      if (T < k.tl) { const u = T - k.t0; y = k.y0 + k.v0 * u + 1100 * u * u; x = lerp(k.x0, k.tx, u / k.fall); a = k.ang + k.spin * (1 - u / k.fall); }
      else { const u = T - k.tl; x = k.tx; a = k.ang; y = k.cy; if (u < .14) { const b = u / .14; y -= 4 * 13 * b * (1 - b); } if (u < .034) sy = .82; }
      const ghost = T < k.tl ? 1 - .45 * clamp(1 - Math.abs(y - 880) / 170) : 1;
      g.save(); g.globalAlpha *= ghost; g.translate(x, y); g.rotate(a); g.scale(1 + (1 - sy) * .5, sy); g.drawImage(sp, -38, -26); g.restore();
      if (T > k.tl && k.glint > .55) { const ph = (T * 1.3 + k.glint * 7) % 2.2; if (ph < .25) { g.save(); g.globalCompositeOperation = 'lighter'; sparkle(g, x + 6, y - 6, 6 * Math.sin(ph / .25 * Math.PI), .9); g.restore(); } }
    }
  }
  let CRUMB = null;
  function crumbTable(img, x0, y0) {
    if (CRUMB) return CRUMB;
    const d = img.getContext('2d').getImageData(0, 0, img.width, img.height).data; let pitch = 6, pts = [];
    for (; pitch < 16; pitch++) { pts = []; for (let y = 0; y < img.height; y += pitch) for (let x = 0; x < img.width; x += pitch) if (d[(y * img.width + x) * 4 + 3] > 140) pts.push([x, y]); if (pts.length <= 70) break; }
    const ymax = Math.max(...pts.map(p => p[1])), ymin = Math.min(...pts.map(p => p[1]));
    CRUMB = pts.map(([x, y], i) => ({ x: x0 + x, y: y0 + y, t0: 9.5 + (1 - (y - ymin) / (ymax - ymin || 1)) * .05 + rnd(61, i) * .05, vx: (rnd(62, i) - .5) * 160, vy: 250 + rnd(63, i) * 250, r: pitch * .42 }));
    return CRUMB;
  }
  function drawScreen(g, T, vx) {
    const { x: X, y: Y, w: SWd, h: SH } = SCR;
    if (T < 7.467) return;
    const boot = prog(T, 7.467, 7.6), scanY = Y + SH * boot;
    g.save(); g.beginPath(); g.rect(X, Y, SWd, SH); g.clip();
    // powered black + slow violet breath
    g.fillStyle = RICH; g.fillRect(X, Y, SWd, scanY - Y);
    const br = g.createRadialGradient(540 + Math.sin(T * .9) * 120, 860, 20, 540, 900, 520); br.addColorStop(0, 'rgba(63,53,147,.22)'); br.addColorStop(1, 'rgba(63,53,147,0)');
    g.fillStyle = br; g.fillRect(X, Y, SWd, scanY - Y);
    if (boot < 1) { g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(244,246,255,.9)'; g.fillRect(X, scanY - 3, SWd, 4); glow(g, 540, scanY, 380, '#C9D2FF', .25); g.restore(); }
    if (T >= 7.5 && T < 7.567) { g.save(); g.globalCompositeOperation = 'lighter'; const cols = ['rgba(255,40,40,.16)', 'rgba(40,255,90,.16)', 'rgba(40,90,255,.16)']; for (let x = X; x < X + SWd; x += 6) { g.fillStyle = cols[(x / 6 + Math.floor(T * 30)) % 3 | 0]; g.fillRect(x, Y, 2, scanY - Y); } g.restore(); }
    const tl = bLines(), lay1 = L.layoutWords(g, B1, 540, tl.o1);
    // chaser border (LED marquee): every 4th dot lit, stepping on twos
    if (T >= 7.6) {
      g.save(); g.globalCompositeOperation = 'lighter';
      const step = Math.floor(T * 15), inset = 9, per = 2 * (SWd + SH - 4 * inset), n = Math.floor(per / 18);
      for (let i = 0; i < n; i++) { let s = i * per / n, px, py; const a = SWd - 2 * inset, b = SH - 2 * inset;
        if (s < a) { px = X + inset + s; py = Y + inset; } else if ((s -= a) < b) { px = X + SWd - inset; py = Y + inset + s; } else if ((s -= b) < a) { px = X + SWd - inset - s; py = Y + SH - inset; } else { s -= a; px = X + inset; py = Y + SH - inset - s; }
        const on = (i + step) % 4 === 0; if (on) { glow(g, px, py, 11, GOLD, .45); lightDot(g, px, py, 2.4, '#FFE7A3', 1); } else { g.fillStyle = 'rgba(255,194,74,.16)'; g.beginPath(); g.arc(px, py, 2, 0, TAU); g.fill(); } }
      g.restore();
    }
    // halos behind the copy (emissive LED), then copy
    const l1imgs = lay1.map(w => textImg(w.word, tl.o1, PAPER));
    const p1 = lay1.map((w, i) => prog(T, 7.6 + i / 30, 7.6 + i / 30 + .133));
    const pop = T < 7.9 ? 0 : keys(T - 7.9, [[0, .85], [.1, 1.06], [.167, 1]]), a2 = prog(T, 7.9, 7.94), ps = prog(T, 7.9, 8.033);
    const gone = T >= 9.5;
    g.save(); g.globalCompositeOperation = 'lighter';
    lay1.forEach((w, i) => { if (i === 0 && T >= 9.4) return; const im = l1imgs[i], h = haloImg(im, 10, 'b1' + i); g.globalAlpha = .42 * p1[i]; g.drawImage(h, w.x - im._bx - 20, 770 - im._by - 20); });
    if (a2 > 0) { const h = haloImg(tl.l2, 12, 'b2'); g.globalAlpha = .55 * a2; g.save(); g.translate(540, 900); g.scale(pop, pop); g.drawImage(h, -tl.l2.width / 2 - 24, -tl.l2._by - 24); g.restore(); }
    if (ps > 0) { const h = haloImg(tl.sub, 8, 'bs'); g.globalAlpha = .32 * ps; g.drawImage(h, 540 - tl.sub.width / 2 - 16, 1010 - tl.sub._by - 16); }
    g.restore();
    drawKaju(g, T);
    lay1.forEach((w, i) => {
      const im = l1imgs[i], x = w.x - im._bx, y = 770 - im._by;
      if (i === 0 && T >= 9.4) {
        if (T < 9.5) {   // glitch: RGB split + sliced bands, 3 frames
          const f = Math.min(2, Math.floor((T - 9.4) * 30 + 1e-6)), dx = [-11, 8, -5][f];
          g.save(); g.globalAlpha = .85; g.drawImage(textImg(w.word, tl.o1, '#11A7B8'), x + dx, y); g.drawImage(textImg(w.word, tl.o1, '#E0218A'), x - dx, y + 2); g.restore();
          const bands = 5, bh = im.height / bands; for (let b = 0; b < bands; b++) g.drawImage(im, 0, b * bh, im.width, bh, x + (rnd(9, f * 9 + b) - .5) * 30, y + b * bh, im.width, bh);
        } else {
          const cr = crumbTable(im, x, y);
          g.fillStyle = PAPER;
          for (const d of cr) { const u = T - d.t0; if (u < 0) { g.fillRect(d.x - d.r, d.y - d.r, d.r * 2, d.r * 2); continue; } const px = d.x + d.vx * u, py = d.y + d.vy * u + 8000 * u * u; if (py > Y + SH + 10) continue; g.beginPath(); g.arc(px, py, d.r * (1 - .35 * clamp(u / .25)), 0, TAU); g.fill(); }
        }
        return;
      }
      dissolve(g, im, x, y, p1[i], 300 + i);
    });
    if (a2 > 0) { g.save(); g.globalAlpha = a2; g.translate(540, 900); g.scale(pop, pop); g.drawImage(tl.l2, -tl.l2.width / 2, -tl.l2._by); g.restore(); }
    if (ps > 0) dissolve(g, tl.sub, 540 - tl.sub.width / 2, 1010 - tl.sub._by, ps, 330);
    g.restore();
    if (scanY < Y + SH) { g.fillStyle = '#121014'; g.fillRect(X, scanY, SWd, Y + SH - scanY); }
    // LED dot pitch + scanlines over the whole panel
    g.drawImage(ledMask(SWd, SH), X, Y);
  }
  const ledMask = (w, h) => L.cached(`s3-ledmask-${w}x${h}`, w, h, g => {
    g.fillStyle = 'rgba(0,0,0,.24)'; g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000';
    for (let y = 3; y < h; y += 6) for (let x = 3; x < w; x += 6) { g.beginPath(); g.arc(x, y, 2.3, 0, TAU); g.fill(); }
    g.globalCompositeOperation = 'source-over'; g.fillStyle = 'rgba(0,0,0,.08)'; for (let y = 0; y < h; y += 3) g.fillRect(0, y, w, 1);
  });
  function drawB(g, T, vx) {
    g.drawImage(bBldg(), -150, 520);
    // screen light spilling onto the facade
    const on = prog(T, 7.467, 7.6);
    if (on > 0) { g.save(); g.globalCompositeOperation = 'lighter'; glow(g, 540, 920, 820, '#B9C2FF', .11 * on); glow(g, 540, 1290, 420, '#C9D2FF', .07 * on); glow(g, 540, 600, 380, '#C9D2FF', .05 * on); g.restore(); }
    drawScreen(g, T, vx);
    // fairy lights along the facade top, akash kandil, diyas on the awning ledge
    L.stringLights(g, { x0: -140, y0: 578, x1: 1240, y1: 578, sag: 22, n: 70, t: T, seed: 8, size: 4, colors: [GOLD, BULB, '#FF5C8A', '#FF9F1C'], mode: 'chase', wire: 'rgba(15,12,16,.9)' });
    g.fillStyle = '#19161A'; g.fillRect(990, 640, 44, 5);
    L.lantern(g, 1010, 645, 30, T, 3, { color: RED, light: GOLD });
    for (const [k, x] of [30, 100, 980, 1050].entries()) L.diya(g, x, 1292, 12, T, 60 + k, { flameSize: 17 });
    L.toran(g, { x0: 40, x1: 1040, y: 1374, t: T, seed: 3, flower: 11, strands: 9, strandLen: 3, sway: .8 });
  }

  /* ======================= BAR C: LED van at street level ======================= */
  const cBldg = () => L.cached('s3-cbldg', 2000, 1300, g => {
    g.translate(200, -160);
    const blds = [[-200, 250, 390, 0], [250, 640, 330, 1], [640, 1080, 420, 0], [1080, 1470, 350, 1], [1470, 1800, 400, 0]];
    for (const [x0, x1, top, kg] of blds) {
      g.fillStyle = x0 % 2 ? '#2B2728' : '#292527'; g.fillRect(x0, top, x1 - x0, 1440 - top);
      if (kg) for (let x = x0 + 12; x < x1 - 8; x += 24) merlon(g, x, top, 18, 16);
      g.fillStyle = '#353032'; g.fillRect(x0 - 4, top, x1 - x0 + 8, 12); topEdge(g, x0 - 4, top, x1 - x0 + 8);
      for (let y = top + 40, r = 0; y < 900; y += 120, r++) {
        g.fillStyle = '#242022'; g.fillRect(x0, y + 100, x1 - x0, 8); topEdge(g, x0, y + 100, x1 - x0, .25);
        for (let x = x0 + 30, k = 0; x < x1 - 70; x += 110, k++) { const st = rnd(701, x * 7 + r);
          g.fillStyle = '#19161A'; archWin(g, x - 4, y - 4, 62, 90); g.fill();
          g.fillStyle = st > .66 ? 'rgba(255,181,71,.34)' : st > .2 ? 'rgba(201,196,191,.13)' : '#141215'; archWin(g, x, y, 54, 82); g.fill();
          g.fillStyle = '#19161A'; g.fillRect(x + 25, y, 4, 82); }
      }
      // shop level: signboard band and shutters
      g.fillStyle = '#1F1C1F'; g.fillRect(x0, 960, x1 - x0, 80); topEdge(g, x0, 960, x1 - x0, .6);
      g.fillStyle = '#2E2A2D'; g.fillRect(x0 + 14, 972, x1 - x0 - 28, 56); topEdge(g, x0 + 14, 972, x1 - x0 - 28, .5);
      g.fillStyle = '#1A171B'; g.fillRect(x0, 1040, x1 - x0, 380);
      const ig = g.createLinearGradient(0, 1060, 0, 1420); ig.addColorStop(0, 'rgba(255,181,71,.38)'); ig.addColorStop(1, 'rgba(255,140,40,.1)');
      g.fillStyle = ig; g.fillRect(x0 + 20, 1060, x1 - x0 - 40, 360);
    }
    grime(g, -200, 160, 2000, 1300, 1);
    for (const [x0, x1] of [[260, 630], [650, 1070]]) L.toran(g, { x0: x0 + 10, x1: x1 - 10, y: 1050, t: 0, seed: x0, flower: 9, strands: 5, strandLen: 2, sway: 0 });
  });
  const C_FEST = [];   // light strings pulled into V's by small kandils (the chevron motif), two rows per building
  for (const [x0, x1, y, d, kd] of [[-200, 250, 432, 52, 1], [250, 640, 374, 58, 1], [640, 1080, 464, 50, 1], [-200, 250, 600, 40, 0], [250, 640, 560, 44, 0], [640, 1080, 640, 40, 0], [1080, 1470, 400, 52, 1]]) {
    const n = Math.max(2, Math.round((x1 - x0) / 120));
    for (let k = 0; k < n; k++) C_FEST.push({ a: x0 + (x1 - x0) * k / n + 6, b: x0 + (x1 - x0) * (k + 1) / n - 6, y, d, kd, id: C_FEST.length });
  }
  function drawCDecor(g, T, vx, vy) {
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const f of C_FEST) {
      const m = (f.a + f.b) / 2, len = Math.hypot(m - f.a, f.d), n = Math.floor(len / 12);
      for (const [x0, y0, x1, y1, side] of [[f.a, f.y, m, f.y + f.d, 0], [m, f.y + f.d, f.b, f.y, 1]]) for (let j = side; j < n; j++) {
        const u = j / n, x = lerp(x0, x1, u), y = lerp(y0, y1, u), q = side ? j + n : j;
        const b = .35 + .65 * (.5 + .5 * Math.sin(T * 7 - q * .55 + f.id * 1.3)), col = q % 4 === 0 ? '#FF9F1C' : GOLD;
        glow(g, x, y, 11, col, .26 * b); lightDot(g, x, y, 1.9, L.mix(col, '#FFFFFF', .45 * b), .45 + .5 * b, vx, vy);
      }
    }
    g.restore();
    g.strokeStyle = 'rgba(14,11,16,.7)'; g.lineWidth = 1.5; g.beginPath(); for (const f of C_FEST) { g.moveTo(f.a, f.y); g.lineTo((f.a + f.b) / 2, f.y + f.d); g.lineTo(f.b, f.y); } g.stroke();
    for (const f of C_FEST) if (f.kd) L.lantern(g, (f.a + f.b) / 2, f.y + f.d, 10, T, f.id * 3 + 1, { color: f.id % 3 === 1 ? RED : f.id % 3 ? '#3F3593' : MUSLIN, light: GOLD });
    for (const [k, x] of [330, 430, 545, 655, 760, 1060].entries()) L.diya(g, x, 1416, 12, T, 80 + k, { flameSize: 17 });
  }
  const BOX_SLOTS = [145, 275, 405], BOX_LAND = [10.0, 10.1, 10.2], BOX_HOP = [11.2, 11.333, 11.467, 11.6];
  const boxSprite = () => L.cached('s3-box', 160, 110, g => {
    g.translate(25, 46);
    g.fillStyle = MUSLIN; g.fillRect(0, 0, 110, 52);
    g.fillStyle = 'rgba(242,178,62,.5)'; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(8, 20 + k * 7); for (let x = 8; x <= 102; x += 8) g.lineTo(x, 20 + k * 7 + (x / 8 % 2 ? -2 : 2)); g.lineTo(102, 22 + k * 7); g.lineTo(8, 22 + k * 7); g.fill(); }
    g.fillStyle = 'rgba(43,39,40,.12)'; g.fillRect(88, 12, 22, 40);
    g.fillStyle = '#E3DFD9'; g.fillRect(-3, 0, 116, 12); topEdge(g, -3, 0, 116); g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(-3, 11, 116, 2);
    g.fillStyle = RED; g.fillRect(51, 0, 8, 52); g.fillRect(-3, 30, 116, 8);
    g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(57, 0, 2, 52);
    // bow: two chevron loops + knot + tails
    g.fillStyle = RED; L.poly(g, [[55, -3], [33, -17], [31, 3]]); g.fill(); L.poly(g, [[55, -3], [77, -17], [79, 3]]); g.fill();
    g.fillStyle = 'rgba(0,0,0,.22)'; L.poly(g, [[55, -3], [38, -10], [37, 0]]); g.fill(); L.poly(g, [[55, -3], [72, -10], [73, 0]]); g.fill();
    g.fillStyle = RED; g.fillRect(50, -8, 10, 10); L.poly(g, [[52, 0], [44, 13], [49, 13], [55, 2]]); g.fill(); L.poly(g, [[58, 0], [66, 13], [61, 13], [55, 2]]); g.fill();
  });
  function drawBox(g, x, yb, rot, sx, sy, a = 1) {   // (x, yb) = bottom-centre
    g.save(); g.globalAlpha *= a; g.translate(x, yb); g.scale(sx, sy); g.translate(0, -26); g.rotate(rot); g.drawImage(boxSprite(), -80, -72); g.restore();
  }
  function vanState(T) {
    // screen-relative entry: from 1100 px left of its stop *in the moving frame* (the van overtakes the auto, then brakes)
    const p = prog(T, WBC, TC), x = 50 - 1100 * (1 - E.outCubic(p)) - WHIP * (1 - E.inOutCubic(p)), tau = T - TC;
    let dy = 0, pitch = 0;
    if (T < TC) dy = 1.4 * Math.sin(T * 47) * (1 - p) + 2 * Math.abs(Math.sin(T * 13)) * (1 - p);
    else { const k = Math.exp(-6 * tau); dy = 10 * k * Math.sin(18 * tau); pitch = .011 * k * Math.sin(18 * tau); }
    return { x, dy, pitch };
  }
  const VS = 1.8;
  const CAB = new Path2D();
  CAB.moveTo(386, -46); CAB.lineTo(386, -224); CAB.quadraticCurveTo(386, -232, 395, -232); CAB.lineTo(462, -232); CAB.quadraticCurveTo(470, -232, 475, -225);
  CAB.lineTo(522, -157); CAB.quadraticCurveTo(526, -150, 535, -149); CAB.lineTo(541, -148); CAB.quadraticCurveTo(546, -147, 546, -141); CAB.lineTo(546, -46);
  CAB.lineTo(492, -46); CAB.arc(450, -32, 44, -.32, Math.PI + .32, true); CAB.closePath();
  function wheel(g, cx, cy, ang) {
    g.fillStyle = '#0D0B0F'; g.beginPath(); g.arc(cx, cy, 34, 0, TAU); g.fill();
    g.strokeStyle = '#211E23'; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, 28, 0, TAU); g.stroke();
    g.save(); g.translate(cx, cy); g.rotate(ang);
    g.fillStyle = '#17141A'; for (let k = 0; k < 16; k++) { g.rotate(TAU / 16); g.fillRect(31, -2, 3, 4); }
    g.fillStyle = '#5E5862'; g.beginPath(); g.arc(0, 0, 19, 0, TAU); g.fill();
    g.fillStyle = '#2E2A31'; for (let k = 0; k < 5; k++) { g.rotate(TAU / 5); g.beginPath(); g.ellipse(12, 0, 4, 3, 0, 0, TAU); g.fill(); }
    g.fillStyle = STONE; g.beginPath(); g.arc(0, 0, 6, 0, TAU); g.fill();
    g.fillStyle = '#B9B3AC'; for (let k = 0; k < 5; k++) { g.rotate(TAU / 5); g.beginPath(); g.arc(8.5, 0, 1.4, 0, TAU); g.fill(); }
    g.restore();
    g.fillStyle = 'rgba(140,135,131,.28)'; g.beginPath(); g.arc(cx, cy, 19, Math.PI * 1.1, Math.PI * 1.6); g.lineTo(cx, cy); g.fill();
  }
  function drawVan(g, T, st, c) {
    const ang = st.x / (34 * VS);
    g.save(); g.translate(st.x, 1440);
    // ground: contact shadow, panel light pool, headlight beam
    g.save(); g.translate(520, 4); g.scale(1, .05); const sg = g.createRadialGradient(0, 0, 0, 0, 0, 600); sg.addColorStop(0, 'rgba(0,0,0,.6)'); sg.addColorStop(.75, 'rgba(0,0,0,.45)'); sg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = sg; g.fillRect(-600, -600, 1200, 1200); g.restore();
    const lvl = panelLevel(T), hl = headLevel(T);
    g.save(); g.globalCompositeOperation = 'lighter'; glow(g, 360, 40, 520, '#AEB8FF', .07 * lvl);
    const bm = g.createLinearGradient(990, 0, 1500, 0); bm.addColorStop(0, `rgba(255,236,200,${.22 * hl})`); bm.addColorStop(1, 'rgba(255,236,200,0)');
    g.fillStyle = bm; g.beginPath(); g.moveTo(985, -232); g.lineTo(1500, -150); g.lineTo(1500, 60); g.lineTo(985, -160); g.closePath(); g.fill(); g.restore();
    // wheels (outside the suspension)
    g.save(); g.scale(VS, VS); wheel(g, 110, -32, ang); wheel(g, 450, -32, ang); g.restore();
    // body (bounces + pitches about the rear axle)
    g.translate(0, st.dy); g.translate(198, -58); g.rotate(st.pitch); g.translate(-198, 58);
    g.save(); g.scale(VS, VS);
    g.fillStyle = '#141114'; g.fillRect(8, -76, 530, 26); topEdge(g, 8, -76, 530, .25);
    g.fillStyle = '#1E1B1F'; g.fillRect(290, -58, 40, 18); g.fillRect(196, -60, 70, 22); topEdge(g, 196, -60, 70, .4);
    g.fillStyle = '#1C191D'; g.beginPath(); g.arc(110, -32, 41, Math.PI, TAU); g.arc(110, -32, 36, TAU, Math.PI, true); g.closePath(); g.fill();
    g.fillStyle = '#211E22'; g.fillRect(64, -48, 8, 32); g.fillStyle = 'rgba(255,159,28,.5)'; g.fillRect(65, -30, 6, 4);
    g.fillStyle = '#1E1B1F'; g.fillRect(0, -64, 12, 16);
    // LED box frame (aluminium) with rivets; boxes ride on the roof rack
    g.fillStyle = '#3A3536'; g.fillRect(8, -306, 372, 242); topEdge(g, 8, -306, 372);
    g.fillStyle = '#2B2728'; g.fillRect(8, -306, 6, 242); g.fillRect(374, -306, 6, 242); g.fillRect(8, -70, 372, 6);
    g.fillStyle = 'rgba(140,135,131,.55)'; for (let x = 18; x < 374; x += 16) { g.fillRect(x, -304, 1.4, 1.4); g.fillRect(x, -67.5, 1.4, 1.4); }
    g.fillStyle = '#1D1A1E'; g.fillRect(10, -312, 368, 3); for (let x = 14; x < 378; x += 60) g.fillRect(x, -312, 3, 7);
    g.fillStyle = 'rgba(255,159,28,.85)'; g.fillRect(2, -120, 5, 14);
    // cab (MM Red), with a wheel arch over the front wheel
    g.fillStyle = RED; g.fill(CAB);
    g.save(); g.clip(CAB);
    const cg = g.createLinearGradient(0, -232, 0, -46); cg.addColorStop(0, 'rgba(255,255,255,.07)'); cg.addColorStop(.55, 'rgba(0,0,0,0)'); cg.addColorStop(1, 'rgba(0,0,0,.2)');
    g.fillStyle = cg; g.fillRect(380, -240, 170, 200);
    g.fillStyle = 'rgba(0,0,0,.14)'; g.fillRect(386, -92, 160, 46); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(386, -232, 6, 186);
    g.fillStyle = 'rgba(185,195,255,.22)'; g.fillRect(392, -228, 2.2, 178);   // LED panel light catching the cab's back edge
    g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(386, -150, 160, 2.5);       // swage line highlight
    g.restore();
    g.fillStyle = 'rgba(244,242,238,.0)';
    topEdge(g, 395, -232, 68, .85);
    g.strokeStyle = 'rgba(0,0,0,.28)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(396, -226); g.lineTo(396, -52); g.moveTo(396, -52); g.lineTo(404, -52); g.moveTo(498, -52); g.lineTo(506, -52); g.lineTo(506, -150); g.lineTo(474, -222); g.stroke();
    const wg = g.createLinearGradient(400, -220, 500, -160); wg.addColorStop(0, '#1C2030'); wg.addColorStop(1, '#3B4559');
    g.fillStyle = wg; g.beginPath(); g.moveTo(402, -221); g.lineTo(462, -221); g.lineTo(502, -163); g.lineTo(402, -163); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.moveTo(426, -221); g.lineTo(442, -221); g.lineTo(420, -163); g.lineTo(404, -163); g.closePath(); g.fill();
    g.fillStyle = PAPER; g.fillRect(470, -141, 18, 3.5);
    g.fillStyle = '#1E1B1F'; g.fillRect(470, -206, 18, 3); g.beginPath(); g.roundRect(486, -224, 7, 22, 2); g.fill();
    g.fillStyle = '#1E1B1F'; g.fillRect(532, -70, 20, 18); topEdge(g, 532, -70, 20, .7);
    g.fillStyle = '#1E1B1F'; g.beginPath(); g.arc(539, -112, 8.5, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,159,28,.9)'; g.fillRect(540, -132, 5, 8);
    g.fillStyle = '#1E1B1F'; g.fillRect(398, -50, 44, 5);
    L.drawLogo(g, 'mark', { x: 425, y: -111, h: 50 / VS, anchor: 'center', way: 'onred' });
    g.restore();
    // grille garland, nimbu-mirchi (crisp, in screen units)
    for (let k = 0; k < 6; k++) L.marigold(g, 546 * VS, (-142 + k * 11.5) * VS, 10, { tone: k % 2 ? 'yellow' : 'orange', seed: k });
    g.strokeStyle = '#1A171B'; g.lineWidth = 2; g.beginPath(); g.moveTo(548 * VS, -52 * VS); g.lineTo(548 * VS + Math.sin(T * 3) * 3, -30 * VS); g.stroke();
    const nx = 548 * VS + Math.sin(T * 3) * 3, ny = -30 * VS;
    g.fillStyle = '#8FA03A'; g.beginPath(); g.arc(nx, ny + 7, 8, 0, TAU); g.fill();
    g.fillStyle = '#2F6B2A'; for (const d of [-5, 0, 5]) { L.poly(g, [[nx + d - 2.5, ny + 14], [nx + d + 2.5, ny + 14], [nx + d * 1.6, ny + 34]]); g.fill(); }
    // panel content (screen units, origin = van rear-bottom)
    drawVanPanel(g, T, lvl);
    // headlight + indicator lenses
    g.save(); g.globalCompositeOperation = 'lighter';
    glow(g, 539 * VS, -112 * VS, 90 + 60 * (hl - 1), '#FFE9C8', .55 * hl); lightDot(g, 539 * VS, -112 * VS, 7, '#FFFFFF', 1);
    glow(g, 542 * VS, -128 * VS, 22, '#FF9F1C', .4); glow(g, 4.5 * VS, -113 * VS, 22, '#FF9F1C', .35);
    g.restore();
    g.restore();
  }
  function panelLevel(T) { if (T < 9.867) return 0; if (T >= TC) return 1; return [.6, 0, .85, .15][Math.min(3, Math.floor((T - 9.867) * 30 + 1e-6))]; }
  function headLevel(T) { return (T >= 10.6 && T < 10.667) || (T >= 10.7 && T < 10.767) ? 1.9 : 1; }
  function drawVanPanel(g, T, lvl) {
    const px = 14 * VS, py = -300 * VS, pw = 360 * VS, ph = 230 * VS;
    g.save(); g.beginPath(); g.rect(px, py, pw, ph); g.clip();
    g.fillStyle = '#121014'; g.fillRect(px, py, pw, ph);
    if (lvl > 0) {
      g.globalAlpha = lvl; g.fillStyle = RICH; g.fillRect(px, py, pw, ph);
      const br = g.createRadialGradient(349, -280, 10, 349, -260, 380); br.addColorStop(0, 'rgba(63,53,147,.25)'); br.addColorStop(1, 'rgba(63,53,147,0)'); g.fillStyle = br; g.fillRect(px, py, pw, ph);
      const o1 = { font: 'dev', size: 60, weight: 700 }, o2 = { font: 'dev', size: 108, weight: 800 }, os = { font: 'lat', size: 40, weight: 600 };
      const i1 = textImg(C1, o1, MUSLIN), is = textImg(SUB_C, os, MIST);
      // line 2 in three runs so the '4' can be MM Red and pulse
      const wA = L.measure(g, C2A, o2), w4 = L.measure(g, C2B, o2), wD = L.measure(g, C2C, o2), x0 = 349 - (wA + w4 + wD) / 2;
      const pulse = T < 11.6 ? 1 : keys(T - 11.6, [[0, 1], [.1, 1.15], [.22, 1]]);
      g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = .4 * lvl;
      g.drawImage(haloImg(i1, 9, 'c1'), 349 - i1.width / 2 - 18, -450 - i1._by - 18);
      const ia = textImg(C2A + C2B + C2C, o2, PAPER); g.drawImage(haloImg(ia, 12, 'c2'), 349 - ia.width / 2 - 24, -300 - ia._by - 24);
      g.globalAlpha = .28 * lvl; g.drawImage(haloImg(is, 8, 'cs'), 349 - is.width / 2 - 16, -185 - is._by - 16);
      g.restore();
      g.drawImage(i1, 349 - i1.width / 2, -450 - i1._by);
      L.text(g, C2A, x0, -300, Object.assign({}, o2, { align: 'left', color: PAPER, maxWidth: wA + 2 }));
      g.save(); g.translate(x0 + wA + w4 / 2, -300 - 38); g.scale(pulse, pulse); L.text(g, C2B, 0, 38, Object.assign({}, o2, { color: RED, maxWidth: w4 + 2 })); g.restore();
      L.text(g, C2C, x0 + wA + w4, -300, Object.assign({}, o2, { align: 'left', color: PAPER, maxWidth: wD + 2 }));
      g.drawImage(is, 349 - is.width / 2, -185 - is._by);
      g.globalAlpha = 1;
    }
    g.restore();
    g.drawImage(ledMask(Math.round(pw), Math.round(ph)), px, py);
  }
  function drawBoxes(g, T, st) {
    const rackY = 1440 + st.dy - 309 * VS;   // rack top in bar-C screen coordinates
    for (let k = 0; k < 4; k++) {
      const slot = BOX_SLOTS[k === 3 ? 1 : k], hx = BOX_HOP[k];
      let x = st.x + slot, y = rackY + st.pitch * (slot - 198) * 1, rot = 0, sx = 1, sy = 1;
      if (k === 3) {   // the mystery 4th box: pops out of nowhere, hops straight away
        if (T < 11.533) continue;
        const u = T - 11.533; if (u < .067) { const s = keys(u, [[0, 0], [.033, 1.15], [.067, 1]]); sx = sy = s; }
        if (u < .36) { const v = u / .36; g.save(); for (let j = 0; j < 11; j++) { const a = rnd(931, j) * TAU, r = (26 + 54 * rnd(932, j)) * (.45 + .8 * E.outCubic(v)); g.fillStyle = L.rgba([MIST, '#B3ADA6', PAPER][j % 3], .85 * (1 - v) * (1 - v)); g.beginPath(); g.arc(x + Math.cos(a) * r * 1.3, y - 26 + Math.sin(a) * r * .7 - 24 * v, (16 + 18 * rnd(933, j)) * (.6 + .7 * v), 0, TAU); g.fill(); } g.restore(); }
      } else if (T < BOX_LAND[k]) {   // riding in; tossed up by the brake jolt
        const ts = 9.95 + k * .008;
        if (T > ts) { const A = BOX_LAND[k] - ts, u = (T - ts) / A; y -= 4 * (2500 * A * A / 8) * u * (1 - u); x += 8 * u; rot = .06 * Math.sin(u * Math.PI) * (k % 2 ? 1 : -1); }
        else y -= Math.abs(Math.sin(T * 26 + k)) * 2.5;
      } else if (T < BOX_LAND[k] + .2) { const u = T - BOX_LAND[k]; x += 8; if (u < .067) { sy = .84; sx = 1.08; } else { const b = (u - .067) / .133; y -= 6 * 4 * b * (1 - b); } }
      else x += 8;
      if (k < 3 && T >= hx - .067 && T < hx) { sy = .86; sx = 1.07; }
      if (T >= hx) {   // hop off to the right on a parabola (apex y ~640), tumbling
        const u = T - hx; if (u > .75) continue;
        const yb0 = y, xs = x, g0 = 3600, vy0 = Math.sqrt(2 * g0 * Math.max(40, yb0 - 26 - 640));
        x = xs + (1150 - xs) / .6 * u; y = yb0 - vy0 * u + .5 * g0 * u * u; rot = 3.6 * u * u + 1.4 * u;
        if (u < .1) { sy = 1.12 - 1.2 * u; sx = 1 / sy; }
      }
      g.fillStyle = 'rgba(0,0,0,.3)'; if (T < hx) g.fillRect(x - 54 * sx, y - 2, 108 * sx, 4);
      drawBox(g, x, y, rot, sx, sy);
    }
  }
  function drawExhaust(g, T, st) {
    if (T < TC) return;
    const n = Math.floor((T - TC) / .32);
    for (let i = Math.max(0, n - 4); i <= n; i++) {
      const u = (T - TC - i * .32) / 1.28; if (u < 0 || u > 1) continue;
      g.fillStyle = L.rgba(MIST, .2 * (1 - u)); g.beginPath(); g.arc(st.x + 20 - 120 * u + rnd(901, i) * 20, 1440 - 76 - 90 * u, 8 + 26 * u, 0, TAU); g.fill();
    }
  }
  const cRoad = () => L.cached('s3-croad', 1500, 420, g => {
    g.translate(200, -1440);
    for (let k = 0; k < 110; k++) {
      const x = -180 + rnd(951, k) * 1460, y = 1446 + Math.pow(rnd(952, k), 3.6) * 330; if (y > 1488 && y < 1548 && x > 250 && x < 830) continue;
      const kind = rnd(953, k) * (k % 9 === 0 ? 1 : .95);
      g.save(); g.translate(x, y); g.rotate(rnd(954, k) * TAU);
      if (kind < .55) { g.fillStyle = rnd(955, k) > .5 ? 'rgba(217,114,30,.85)' : 'rgba(242,178,62,.85)'; g.beginPath(); g.ellipse(0, 0, 5 + rnd(956, k) * 4, 3, 0, 0, TAU); g.fill(); }
      else if (kind < .85) { g.fillStyle = ['rgba(238,236,232,.55)', 'rgba(228,225,220,.5)', 'rgba(140,135,131,.6)'][k % 3]; L.poly(g, [[-6, -3], [5, -5], [7, 3], [-4, 5]]); g.fill(); }
      else { g.fillStyle = 'rgba(8,6,8,.45)'; g.beginPath(); g.arc(0, 0, 9 + rnd(957, k) * 8, 0, TAU); g.fill(); g.strokeStyle = 'rgba(140,135,131,.25)'; g.lineWidth = 1.5; g.stroke(); }
      g.restore();
    }
  });
  function drawC(g, T, c, vx, vy) {
    g.drawImage(cBldg(), -200, 160); g.drawImage(cRoad(), -200, 1440);
    drawCDecor(g, T, vx, vy);
    const st = vanState(T);
    if (T >= WBC - .02) { drawExhaust(g, T, st); drawVan(g, T, st, c); drawBoxes(g, T, st); }
    const fa = prog(T, 11.6, 11.8, E.outQuad);
    if (fa > 0) {
      const oh = { font: 'dev', size: 28, weight: 500 }, oe = { font: 'lat', size: 28, weight: 500 }, wh = L.measure(g, FINE_C_HI, oh), we = L.measure(g, FINE_C_EN, oe), x0 = 540 - (wh + we) / 2;
      L.text(g, FINE_C_HI, x0, 1530, Object.assign({}, oh, { align: 'left', color: MIST, alpha: fa, maxWidth: wh + 2 }));
      L.text(g, FINE_C_EN, x0 + wh, 1530, Object.assign({}, oe, { align: 'left', color: MIST, alpha: fa, maxWidth: we + 2 }));
    }
  }

  /* ======================= NEAR: poles, wires, garlands (z .55) ======================= */
  const NZ = .55;
  const POLES = [{ x: -1680, k: 0 }, { x: -760, k: 1 }, { x: 1480, k: 1 }, { x: 2180, k: 0 }, { x: 4060, k: 1 }, { x: 4720, k: 0 }, { x: 6900, k: 1 }];
  const poleSprite = kind => L.blurredCache('s3-pole' + kind, 220, 2500, 3, g => {
    g.translate(110, 320);
    g.fillStyle = '#141116'; g.beginPath(); g.moveTo(-11, -300); g.lineTo(11, -300); g.lineTo(18, 2160); g.lineTo(-18, 2160); g.closePath(); g.fill();
    g.fillStyle = 'rgba(140,135,131,.3)'; g.beginPath(); g.moveTo(9, -300); g.lineTo(11, -300); g.lineTo(18, 2160); g.lineTo(15, 2160); g.closePath(); g.fill();
    g.fillStyle = '#141116'; g.fillRect(-84, 112, 168, 10); for (const x of [-72, 0, 72]) { g.fillRect(x - 5, 94, 10, 18); g.fillStyle = 'rgba(140,135,131,.45)'; g.fillRect(x - 6, 92, 12, 3); g.fillStyle = '#141116'; }
    g.strokeStyle = '#141116'; g.lineWidth = 2.5; for (let k = 0; k < 5; k++) { g.beginPath(); g.ellipse(-4 + k * 3, 470 + k * 9, 22 + k * 4, 34 + k * 6, .2 * k, 0, TAU); g.stroke(); }
    if (kind) { g.fillStyle = '#1A171C'; g.fillRect(-46, 560, 92, 120); for (let k = 0; k < 7; k++) g.fillRect(-56 + k * 16, 572, 6, 96); g.fillStyle = 'rgba(140,135,131,.35)'; g.fillRect(-46, 560, 92, 2); }
    for (let k = 0; k < 14; k++) { const a = k / 14 * TAU; g.fillStyle = k % 2 ? '#C98A00' : '#B9420A'; g.beginPath(); g.arc(Math.cos(a) * 20, 900 + Math.sin(a) * 6, 8, 0, TAU); g.fill(); }
  });
  function wirePt(x0, y0, x1, y1, sag, u) { return [lerp(x0, x1, u), lerp(y0, y1, u) + sag * 4 * u * (1 - u)]; }
  function drawNear(g, T, c, vx, vy) {
    const [a, b] = visX(c, NZ);
    for (const p of POLES) if (p.x > a - 200 && p.x < b + 200) g.drawImage(poleSprite(p.k), p.x - 116, -326);
    for (let i = 0; i < POLES.length - 1; i++) {
      const p0 = POLES[i], p1 = POLES[i + 1]; if (p1.x < a - 100 || p0.x > b + 100) continue;
      const span = p1.x - p0.x;
      g.strokeStyle = 'rgba(13,11,16,.92)'; g.lineCap = 'round';
      for (const [dx, dy, sg, lw] of [[-72, 96, .055, 2.4], [72, 98, .05, 2.4], [0, 104, .07, 2], [-10, 300, .1, 5]]) {
        g.lineWidth = lw; g.beginPath(); g.moveTo(p0.x + dx, dy); g.quadraticCurveTo((p0.x + p1.x) / 2, dy + span * sg * 2, p1.x + dx, dy); g.stroke();
      }
      // a string of festive bulbs across the street + hanging marigold strands
      const sg = span * .085, n = Math.floor(span / 38);
      g.lineWidth = 2; g.beginPath(); g.moveTo(p0.x, 150); g.quadraticCurveTo((p0.x + p1.x) / 2, 150 + sg * 2, p1.x, 150); g.stroke();
      g.save(); g.globalCompositeOperation = 'lighter';
      for (let k = 1; k < n; k++) { const [x, y] = wirePt(p0.x, 150, p1.x, 150, sg, k / n); if (x < a || x > b) continue; const br = .55 + .45 * L.noise1(T * 2.4 + k * 1.3, i + 5); bulb(g, x, y + 7, 3.4, [GOLD, '#FF9F1C', BULB, '#FF5C8A'][k % 4], br, vx, vy); }
      g.restore();
      for (let k = 0; k < 7; k++) {
        const u = .12 + k * .028 + (i % 2) * .62, [x, y] = wirePt(p0.x - 72, 96, p1.x - 72, 98, span * .055, u); if (x < a - 40 || x > b + 40) continue;
        for (let j = 1; j <= 6; j++) { const sw = Math.sin(T * 1.7 + k + j * .4) * j * 1.3; L.marigold(g, x + sw, y + j * 19, 11 - j * .4, { tone: (j + k) % 2 ? 'orange' : 'yellow', seed: k * 7 + j }); }
      }
    }
  }

  /* ======================= frame assembly ======================= */
  function frame(g, T, vel) {
    const c = camAt(T);
    g.save();
    if (T < TA) { const sx = (SEAM - W / 2 - c.x) * c.zoom + W / 2; g.beginPath(); g.rect(sx, -20, W + 40 - sx, H + 40); g.clip(); }
    g.translate(W / 2, H / 2); g.rotate(c.roll); g.translate(-W / 2, -H / 2);
    drawSky(g, T, c);
    depth(g, c, 3, g2 => g2.drawImage(farCanvas(), FAR.x0, FAR.y0));
    L.haze(g, T - c.x / (3 * 10), { y0: 400 - c.y / 3, y1: 1250 - c.y / 3, color: '#8C7FA8', alpha: .07, speed: 10, seed: 12 });
    const zz = (z) => 1 + (c.zoom - 1) / z;
    depth(g, c, 1.7, g2 => drawMid(g2, T, c, -vel.x / 1.7 * zz(1.7), -vel.y / 1.7 * zz(1.7)));
    L.haze(g, T - c.x / (1.7 * 16), { y0: 700 - c.y / 1.7, y1: 1700 - c.y / 1.7, color: '#FF9F6B', alpha: .05, speed: 16, seed: 14 });
    const v1x = -vel.x * zz(1), v1y = -vel.y * zz(1);
    depth(g, c, 1, g2 => {
      drawStreet(g2, c);
      const [va, vb] = visX(c, 1);
      if (va < 1240 && vb > -320) drawA(g2, T, v1x);
      if (va < 2650 && vb > 1250) { g2.save(); g2.translate(WHIP, 0); drawB(g2, T, v1x); g2.restore(); }
      if (va < 4600 && vb > 2600) { g2.save(); g2.translate(2 * WHIP, DIP); drawC(g2, T, c, v1x, v1y); g2.restore(); }
    });
    { const fg = g.createLinearGradient(0, 1560, 0, 1940); fg.addColorStop(0, 'rgba(10,8,12,0)'); fg.addColorStop(1, 'rgba(10,8,12,.62)'); g.fillStyle = fg; g.fillRect(-60, 1560, W + 120, 420); }
    if (c.e3 < .98) { g.save(); g.globalAlpha = 1 - c.e3; depth(g, c, NZ, g2 => drawNear(g2, T, c, -vel.x / NZ * zz(NZ), -vel.y / NZ * zz(NZ)));
      g.restore(); }
    g.restore();
    if (T < TA) {   // whip-in seam from s2: a dark gap between buildings sweeps the cut
      const sx = (SEAM - W / 2 - c.x) * c.zoom + W / 2;
      if (sx > -260 && sx < W + 260) { const gr = g.createLinearGradient(sx - 240, 0, sx + 240, 0); gr.addColorStop(0, 'rgba(14,12,18,0)'); gr.addColorStop(.42, 'rgba(14,12,18,.96)'); gr.addColorStop(.58, 'rgba(14,12,18,.96)'); gr.addColorStop(1, 'rgba(14,12,18,0)'); g.fillStyle = gr; g.fillRect(sx - 240, -20, 480, H + 40); }
    }
  }

  let ACC = null, TMP = null;
  function buffers() {
    const s = L.baseScale, w = Math.round(W * s), h = Math.round(H * s);
    if (!ACC || ACC.width !== w || ACC.height !== h) { ACC = document.createElement('canvas'); ACC.width = w; ACC.height = h; TMP = document.createElement('canvas'); TMP.width = w; TMP.height = h; }
    return [ACC, TMP];
  }
  MM.scene('s3-gag-ride', {
    draw(ctx, t, info) {
      const T = info.T, h = 1 / 600, c0 = camAt(T - h), c1 = camAt(T + h);
      const vel = { x: (c1.x - c0.x) / (2 * h), y: (c1.y - c0.y) / (2 * h) };
      const vz = Math.abs(c1.zoom - c0.zoom) / (2 * h), van = (T > WBC && T < TC) ? 9000 : 0;
      const span = 1 / 240;   // spacing of the engine's motion-blur sub-frames (4 samples, 180° shutter)
      const speed = Math.max(Math.hypot(vel.x, vel.y) / NZ, vz * 1800, van);
      const k = Math.min(8, Math.max(1, Math.ceil(speed * span / 14)));
      if (k <= 1) { DT = span; frame(ctx, T, vel); return; }
      const [acc, tmp] = buffers(), a = acc.getContext('2d'), m = tmp.getContext('2d');
      a.setTransform(1, 0, 0, 1, 0, 0); a.clearRect(0, 0, acc.width, acc.height); a.globalCompositeOperation = 'lighter'; a.globalAlpha = 1 / k;
      DT = span / k;
      for (let i = 0; i < k; i++) {
        const ti = T + ((i + .5) / k - .5) * span;
        m.setTransform(L.baseScale, 0, 0, L.baseScale, 0, 0); m.globalAlpha = 1; m.globalCompositeOperation = 'source-over'; m.clearRect(0, 0, W, H);
        frame(m, ti, vel); a.drawImage(tmp, 0, 0);
      }
      ctx.save(); L.resetTransform(ctx); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(acc, 0, 0, W, H); ctx.restore();
    }
  });
})();
