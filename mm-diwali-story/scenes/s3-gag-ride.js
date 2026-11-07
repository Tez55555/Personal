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
  const WHIP = 1400, DIP = 220, SEAM = -220, C_OFF = 20;

  /* ---------- palette ---------- */
  const INK = P.ink, RICH = P.rich, STONE = P.stone, MIST = P.mist, MUSLIN = P.muslin, PAPER = P.paper, RED = P.red, LINEN = P.linen, GOLDINK = P.goldInk;
  const GOLD = '#FFC24A', BULB = '#FFF4CF', AMBER = '#FFB547', WARMW = '#FFE7A3', TUBE = '#F4F6FF';

  /* ---------- copy (code points exactly as in storyboard.json) ---------- */
  // English cut (L.EN): the hero lines are English and there is no sub. Gag A becomes two lines; the punch word
  // ('finished', like 'हाफ़') is the one that cracks.
  const EN = !!L.EN;
  const HERO_A = EN ? 'Back: finished.' : 'घर साफ़। कमर हाफ़।', HAF = EN ? 'finished' : 'हाफ़', DANDA = EN ? '.' : '।';
  const HERO_A0 = 'House: spotless.';                       // English line 1 (above the punch line)
  const HO = EN ? { font: 'lat', size: 84, weight: 780 } : { font: 'dev', size: 92, weight: 800 };
  const HY = EN ? 318 : 240, PI = EN ? 1 : 3;              // punch line baseline, punch word index
  const SUB_A = EN ? ' ' : 'House: spotless. Back: finished.';
  const FINE_A_HI = '*नियम व शर्तें: मम्मी', FINE_A_EN = '  ·  *T&C: Mummy';
  const B1 = EN ? 'Diet: from Monday.' : 'डाइट: मंडे से।';
  const B2 = EN ? 'Kaju katli: right now.' : 'काजू कतली: अभी से।';
  const SUB_B = EN ? ' ' : 'Diet: Monday. Kaju katli: right now.';
  const C1 = EN ? 'Soan papdi boxes:' : 'सोन पापड़ी के डिब्बे:';
  const C2A = EN ? 'Got 3. Gave ' : 'आए 3, गए ', C2B = '4', C2C = EN ? '.' : '।';
  const SUB_C = EN ? ' ' : 'Soan papdi: got 3, gave 4.';
  const FINE_C_HI = EN ? '' : '*चौथा डिब्बा: रहस्य', FINE_C_EN = EN ? '*Box #4: a mystery' : '  ·  *Box #4: a mystery';
  /** shrink a font spec so `str` fits `maxW` px (English lines are longer than their Hindi originals) */
  const fitO = (str, o, maxW) => { const c = document.createElement('canvas').getContext('2d'), w = L.measure(c, str, o); return w > maxW ? Object.assign({}, o, { size: o.size * maxW / w }) : o; };

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
  let DT = 1 / 240, FAST = false;   // FAST: heavy in-scene supersampling is running; skip detail that the blur erases   // time span the current sample represents: light points are integrated over it as streaks
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
  function textImg(str, o, color, ko = 0, koCol = '#221D2B', pad = 24) {   // ko: width of a knockout stroke under the glyphs
    const k = `s3txt-${str}-${o.font}-${o.size}-${o.weight}-${color}-${ko}-${koCol}`;
    const c0 = document.createElement('canvas').getContext('2d');
    const w = Math.ceil(L.measure(c0, str, o)) + pad * 2, h = Math.ceil(o.size * 1.75) + pad;
    const img = L.cached(k, w, h, g => L.text(g, str, pad, o.size * 1.2 + pad / 2, Object.assign({}, o, { align: 'left', color, maxWidth: w - pad * 2 + 2 }, ko ? { stroke: { color: koCol, width: ko } } : {})));
    img._bx = pad; img._by = o.size * 1.2 + pad / 2; return img;
  }
  /** copy of an image with a light LED dot-pitch mask baked in, phase-aligned to the screen grid (dots at phx + 6i, phy + 6j) */
  function maskedImg(img, key, phx, phy, dark) {
    const px = ((phx % 6) + 6) % 6, py = ((phy % 6) + 6) % 6;
    return L.cached(`s3mimg-${key}-${px}-${py}-${dark}`, img.width, img.height, g => {
      g.drawImage(img, 0, 0); g.globalCompositeOperation = 'source-atop';
      g.drawImage(L.cached(`s3-dotmask-${img.width}x${img.height}-${px}-${py}-${dark}`, img.width, img.height, m => {
        m.fillStyle = `rgba(0,0,0,${dark})`; m.fillRect(0, 0, img.width, img.height);
        m.globalCompositeOperation = 'destination-out'; m.fillStyle = '#000';
        for (let y = py; y < img.height + 3; y += 6) for (let x = px; x < img.width + 3; x += 6) { m.beginPath(); m.arc(x, y, 2.3, 0, TAU); m.fill(); }
      }), 0, 0);
    });
  }
  /** horizontal box-blurred copy of a cached image (whip frames: thin bright verticals smear instead of combing) */
  function hblur(img, key, r) {
    return L.cached(`s3hb-${key}-${r}`, img.width + r * 2, img.height, g => {
      const n = 9; g.globalCompositeOperation = 'lighter'; g.globalAlpha = 1 / n;
      for (let i = 0; i < n; i++) g.drawImage(img, r + (i / (n - 1) - .5) * 2 * r, 0);
    });
  }
  /** draw a cached static layer, swapping in a smeared copy when the camera moves faster than the sub-sample spacing */
  function drawMB(g, img, key, x, y, vx) {
    const s = Math.abs(vx) * DT;
    if (s < 7) { g.drawImage(img, x, y); return; }
    const r = s < 16 ? 6 : 12; g.drawImage(hblur(img, key, r), x - r, y);
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
    // C is framed 20 px further right so the cab's nose and headlight stay in frame; the whip-up also pulls back left
    // by 1400 so the wide (zoom .5) frames the LED screen centre, the van's panel and the tri-vision's edge, all still lit
    let x = -WHIP + WHIP * (e0 + e1 + e2) + C_OFF * e2 - 1400 * e3, y = DIP * e2 - 1200 * e3, zoom = 1 - .5 * e3, roll = 0;
    // holding: the ride never fully stops: slow drift + gentle push-in (none in C: the van fills the frame)
    for (const [a, b, ein, eout, dr, pi] of [[TA, WAB, e0, e1, 18, .016], [TB, WBC, e1, e2, 18, .016], [TC, WUP, e2, e3, 10, 0]]) {
      const h = clamp((T - a) / (b - a)), live = ein * (1 - eout);
      x += (h - .5) * dr * live; zoom *= 1 + pi * E.inOutQuad(h) * live;
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
    if (!FAST) L.haze(g, T - c.x / 60, { y0: 60 + oy, y1: 900 + oy, color: '#7A6A8A', alpha: .07, speed: 6, seed: 17, scale: 2.6 });
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
      if (!FAST) glow(g, m.x, m.y, 9, m.col, .22 * br); lightDot(g, m.x, m.y, 1.5, L.mix(m.col, '#FFFFFF', .35 * br), .35 + .45 * br, vx, vy);
    }
    g.restore();
  }

  /* ======================= STREET (z 1, world) ======================= */
  /** asphalt tile: coarse bitumen mottling plus 2-4 px aggregate stones, light and dark (drawn at 4 %) */
  const asphaltTex = () => L.cached('s3-asphalt', 512, 512, g => {
    g.drawImage(L.textureCanvas('ink', 512, 61), 0, 0);
    for (let k = 0; k < 2600; k++) { const x = rnd(1301, k) * 512, y = rnd(1302, k) * 512, r = 1 + rnd(1303, k) * 1.6, v = rnd(1304, k);
      g.fillStyle = v > .55 ? `rgb(${190 + v * 60 | 0},${185 + v * 60 | 0},${180 + v * 60 | 0})` : 'rgb(10,9,12)'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
  });
  function drawStreet(g, c) {
    const [xa, xb] = visX(c, 1), xL = Math.floor(xa / 160) * 160 - 160, xR = xb + 160;
    g.fillStyle = '#2A2629'; g.fillRect(xL, 1632, xR - xL, 30); topEdge(g, xL, 1632, xR - xL, .5);
    g.fillStyle = '#1D1A1E'; for (let x = xL; x < xR; x += 64) g.fillRect(x, 1650, 2, 12);
    // lifted, textured blacks: the road never drops below ~(26,21,30) after the grade + vignette, and carries a 4 %
    // asphalt aggregate so the dark band has detail to survive WhatsApp recompression (no flat blocks)
    const gr = g.createLinearGradient(0, 1662, 0, 2400); gr.addColorStop(0, '#36313A'); gr.addColorStop(1, '#2C2731');
    g.fillStyle = gr; g.fillRect(xL, 1662, xR - xL, 1400);
    g.save(); g.globalAlpha = .04; const at = asphaltTex(); for (let y = 1662; y < 2420; y += 512) for (let x = Math.floor(xL / 512) * 512; x < xR; x += 512) g.drawImage(at, x, y); g.restore();
    g.fillStyle = 'rgba(140,135,131,.5)'; for (let x = xL; x < xR; x += 160) g.fillRect(x, 1918, 86, 7);
    if (!FAST) L.textureOverlay(g, 'powder', xL, 1662, xR - xL, 760, { alpha: .09, blend: 'overlay', scale: .5, seed: 9 });
  }

  /* ======================= BAR A: tri-vision on a rooftop ======================= */
  const TV = { x: 120, y: 560, w: 840, h: 620, n: 16 }, LAMPS_A = [420, 660];   // lamps symmetric about 540, clear of the MM plate
  const heroLay = g => L.layoutWords(g, HERO_A, 420, HO);
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
      const o = HO, lay = heroLay(g);
      if (EN) L.text(g, HERO_A0, 420, 214, Object.assign({}, o, { color: INK, maxWidth: 780 }));
      for (const wd of lay) {
        if (wd.i === PI) { const wh = L.measure(g, HAF, o); if (full) L.text(g, HAF, wd.x, HY, Object.assign({}, o, { align: 'left', color: RED, maxWidth: wh + 2 })); L.text(g, DANDA, wd.x + wh, HY, Object.assign({}, o, { align: 'left', color: INK, maxWidth: 60 })); }
        else L.text(g, wd.word, wd.x, HY, Object.assign({}, o, { align: 'left', color: INK, maxWidth: wd.w + 2 }));
      }
      L.text(g, SUB_A, 420, 330, { font: 'lat', size: 44, weight: 600, color: INK, maxWidth: 700 });
      L.textureOverlay(g, 'paper', 0, 0, TV.w, TV.h, { alpha: .07, blend: 'multiply', scale: .6, seed: 5 });
    });
  }
  /** night light map for the face: ambient + two warm up-light pools (multiply) */
  /** night light map for the face (multiply): a well-lit board. Ambient .82 with a soft fall-off to the corners (~.72),
      the two flood cones' footprints (+.06) and the hot spots right above the lenses (+.12). Warm tint. */
  const LENS_Y = 1235, CONE_HALF = 22 * DEG, CONE_LEN = 650;
  const faceLight = () => L.cached('s3-facelight', TV.w, TV.h, g => {
    const im = g.createImageData(TV.w, TV.h), d = im.data, tint = [1, .97, .955];
    for (let y = 0; y < TV.h; y++) for (let x = 0; x < TV.w; x++) {
      const nx = (x - 420) / 470, ny = (y - 300) / 420, r2 = nx * nx + ny * ny;
      let v = .95 - .1 * Math.min(1.5, r2);
      for (const lx of LAMPS_A) {
        const dx = x - (lx - TV.x), dy = (LENS_Y - TV.y) - y, dist = Math.hypot(dx, dy), th = Math.abs(Math.atan2(dx, dy));
        const inCone = Math.exp(-((th / (CONE_HALF * .95)) ** 2));
        v += .06 * inCone * clamp(1 - dist / CONE_LEN);
        v += .12 * Math.exp(-((dx / 150) ** 2 + ((y - TV.h) / 120) ** 2));
      }
      v = Math.min(1, v);
      const i = (y * TV.w + x) * 4;
      for (let k = 0; k < 3; k++) d[i + k] = Math.round(255 * v * tint[k]);
      d[i + 3] = 255;
    }
    g.putImageData(im, 0, 0);
  });
  /** the visible flood cones (additive, in the air in front of the face): Flame-core cream, ±22°, fading out by y ~600 */
  const coneSprite = () => L.cached('s3-cone', 560, CONE_LEN + 10, g => {
    const w = 560, h = CONE_LEN + 10, im = g.createImageData(w, h), d = im.data, s1 = 21.5 * DEG, s2 = 10 * DEG;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dx = x - 280, dy = CONE_LEN - y, r = Math.hypot(dx, dy); if (dy <= 0) continue;
      const th = Math.atan2(dx, dy), ang = .62 * Math.exp(-((th / s1) ** 2)) + .38 * Math.exp(-((th / s2) ** 2));
      const rad = Math.pow(clamp(1 - r / CONE_LEN), 1.4) * L.smoothstep(0, 40, r);
      const i = (y * w + x) * 4; d[i] = 255; d[i + 1] = 231; d[i + 2] = 163; d[i + 3] = Math.round(255 * .15 * ang * rad);
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
    g.fillStyle = '#262225'; g.fillRect(-320, 1540, 1560, 8); topEdge(g, -320, 1540, 1560, .35);
    for (let k = 0; k < 7; k++) {   // street-level shops: shutters half up, warm interiors, a toran on each
      const x = -280 + k * 220, open = rnd(511, k) > .3;
      g.fillStyle = '#19161A'; g.fillRect(x, 1552, 190, 84);
      if (open) { const ig = g.createLinearGradient(0, 1570, 0, 1636); ig.addColorStop(0, 'rgba(255,181,71,.55)'); ig.addColorStop(1, 'rgba(255,140,40,.2)'); g.fillStyle = ig; g.fillRect(x + 6, 1574, 178, 62);
        for (let j = 0; j < 6; j++) { g.fillStyle = ['rgba(242,178,62,.7)', 'rgba(217,114,30,.6)', 'rgba(238,236,232,.45)'][j % 3]; g.fillRect(x + 16 + j * 28, 1606 - (j % 2) * 8, 18, 30 + (j % 2) * 8); } }
      g.fillStyle = '#2C272A'; g.fillRect(x, 1552, 190, open ? 22 : 84); g.fillStyle = 'rgba(0,0,0,.35)'; for (let y = 1556; y < (open ? 1574 : 1636); y += 5) g.fillRect(x, y, 190, 1.5);
      topEdge(g, x, 1552, 190, .4);
    }
    grime(g, -320, 1290, 1560, 360, 1);
    ownMarigolds(() => { for (let k = 0; k < 7; k++) L.toran(g, { x0: -275 + k * 220, x1: -95 + k * 220, y: 1580, t: 0, seed: 50 + k, flower: 7, strands: 4, strandLen: 2, sway: 0 }); });
  });
  function slatAngle(T, i) {
    const t0 = 5.0667 + i * .0035, d = .08, u = (T - t0) / d;
    if (u <= 0) return 0; if (u < 1) return 120 * E.inOutQuad(u);
    const v = T - (t0 + d); return v > .6 ? 120 : 120 + 5 * Math.exp(-30 * v) * Math.sin(60 * v);
  }
  /* ---- the jhadu: a solid, sharp phool-jhadu animated ON TWOS (a new pose every 2 frames, held across the frame's
     motion-blur sub-samples, so it never smears). Two flicks along the printed floor 5.200-5.667 that push the dust
     into a pile, a hop over the pile, then it is set down (5.800) leaning in the face's bottom-right corner against
     the frame, beside its pile, until the whip. On the 'हाफ़' crack (6.400) it slumps 3°, like the back. ---- */
  const FLOOR = 1176, J_HANDLE = 230, J_FAN = 150, J_FANW = 210, J_WALL = 952;
  const twos = T => { const f = Math.round(T * 30); return (f - (f & 1)) / 30; };   // pose clock: steps every 2 frames
  // poses: frame, tip-centre x on the floor, lift, axis angle (deg, + = handle top to the right), bristle bend, press into
  // the floor, lean on the frame (x then solved so the handle top rests on the right frame edge)
  const JK = [[156, 150, 6, -62, -.2, 6], [158, 250, 0, -62, -.9, 14], [160, 350, 0, -57, -.7, 14], [162, 430, 4, -52, .8, 6],
    [164, 400, 22, -60, .3, 0], [166, 470, 0, -62, -.9, 14], [168, 545, 0, -57, -.7, 14], [170, 600, 4, -52, .8, 6],
    [172, 800, 18, -64, .2, 0], [174, 0, 0, 21, -.25, 22, 1], [176, 0, 0, 15.5, .15, 22, 1], [178, 0, 0, 17, 0, 22, 1],
    [192, 0, 0, 17, 0, 22, 1], [194, 0, 0, 21, -.15, 22, 1], [196, 0, 0, 19.8, .05, 22, 1]];
  function jPose(T) { const f = Math.round(twos(T) * 30); let p = null; for (const k of JK) if (k[0] <= f) p = k; return p; }
  const J_STR = [];
  for (let k = 0; k < 29; k++) { const u = k / 28 - .5;
    J_STR.push({ k, u, sx: u * 22, cx: u * 74, cy: J_FAN * .42, tx: u * J_FANW * (.95 + .05 * rnd(71, k)), ty: J_FAN * (.9 + .1 * rnd(72, k)) * (1 - .16 * (2 * u) ** 2) }); }
  const qb = (a, b, c, s) => (1 - s) * (1 - s) * a + 2 * s * (1 - s) * b + s * s * c;
  function jGeom(p) {
    const a = p[3] * DEG, bend = p[4];
    // the grass fan flexes: its local rotation eases off toward the tips, and the tips shear with the stroke
    const loc = (lx, ly) => { const v = clamp(ly / J_FAN), aa = a * (1 - .45 * v), bx = lx + bend * 40 * v * v; return [bx * Math.cos(aa) - ly * Math.sin(aa), bx * Math.sin(aa) + ly * Math.cos(aa)]; };
    const tc = loc(0, J_FAN);
    let Bx = p[1] - tc[0]; const By = FLOOR - p[2] + p[5] - tc[1];
    if (p[6]) Bx += J_WALL - (Bx + (J_HANDLE + 4) * Math.sin(a) + 7 * Math.cos(a));
    return { a, loc, Bx, By };
  }
  function jStrand(G, s, n = 8) {
    const pts = [];
    for (let i = 0; i <= n; i++) { const t = i / n, [wx, wy] = G.loc(qb(s.sx, s.cx, s.tx, t), qb(10, s.cy, s.ty, t)); pts.push([G.Bx + wx, G.By + wy]); }
    // floor contact: bristles that would pass through the floor are pressed flat and splay outward along it
    const dx = pts[n][0] - pts[0][0], dy = pts[n][1] - pts[0][1], sp = clamp(dx / (Math.hypot(dx, dy) || 1) * 1.3 + s.u * 1.5, -1.5, 1.5);
    for (const q of pts) if (q[1] > FLOOR - 1) { q[0] += (q[1] - FLOOR + 1) * sp; q[1] = FLOOR - 1 - 2 * rnd(77, s.k); }
    return pts;
  }
  function drawJhadu(g, T) {
    const p = jPose(T); if (!p) return;
    const G = jGeom(p), strands = J_STR.map(s => jStrand(G, s));
    // fan: solid Ink silhouette with a ragged tip edge
    const P = new Path2D(), N = strands.length;
    strands[0].forEach((q, i) => i ? P.lineTo(q[0], q[1]) : P.moveTo(q[0], q[1]));
    for (let k = 1; k < N; k++) { const v = strands[k][strands[k].length - 2], tp = strands[k][strands[k].length - 1]; P.lineTo((v[0] + tp[0]) / 2, (v[1] + tp[1]) / 2 - 3); P.lineTo(tp[0], tp[1]); }
    for (let i = strands[N - 1].length - 1; i >= 0; i--) P.lineTo(strands[N - 1][i][0], strands[N - 1][i][1]);
    P.closePath(); g.fillStyle = INK; g.fill(P);
    // grass strands: Stone strokes on every other strand, a near-Ink sheen line between; pale fluffy tips
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (const [k, pts] of strands.entries()) {
      g.strokeStyle = k % 2 ? STONE : '#4A4446'; g.lineWidth = k % 2 ? 1.6 : 1.2;
      g.beginPath(); g.moveTo(pts[1][0], pts[1][1]); for (let i = 2; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.stroke();
      const a = pts[pts.length - 2], b = pts[pts.length - 1];
      g.strokeStyle = k % 3 ? '#A39D96' : STONE; g.lineWidth = 3;
      g.beginPath(); g.moveTo(lerp(a[0], b[0], .35), lerp(a[1], b[1], .35)); g.lineTo(b[0], b[1]); g.stroke();
    }
    // handle: Ink, Stone edge highlight, Stone tape wraps at the grip, hanging loop; Stone binding band with Ink wraps
    g.save(); g.translate(G.Bx, G.By); g.rotate(G.a);
    g.fillStyle = INK; g.beginPath(); g.roundRect(-7, -J_HANDLE, 14, J_HANDLE + 4, 4); g.fill();
    g.fillStyle = STONE; g.fillRect(-5, -J_HANDLE + 6, 2, J_HANDLE - 14);
    g.strokeStyle = STONE; g.lineWidth = 2; g.beginPath(); for (let k = 0; k < 4; k++) { g.moveTo(-7, -J_HANDLE + 14 + k * 7); g.lineTo(7, -J_HANDLE + 9 + k * 7); } g.stroke();
    g.beginPath(); g.arc(0, -J_HANDLE - 6, 6, 0, TAU); g.stroke();
    g.fillStyle = STONE; g.beginPath(); g.roundRect(-14, -10, 28, 22, 3); g.fill();
    g.strokeStyle = INK; g.lineWidth = 2.2; g.beginPath(); for (let k = 0; k < 4; k++) { g.moveTo(-14, -5 + k * 5.5); g.lineTo(14, -9 + k * 5.5); } g.stroke();
    g.fillStyle = 'rgba(43,39,40,.5)'; g.fillRect(-14, 10, 28, 2);
    g.restore();
  }
  /** the swept dust: pushed ahead of the fan on every contact pose, left as a small heap (with a marigold petal, a
      scrap of cracker paper and a burnt sparkler wire) beside the leaning jhadu */
  function jPile(T) {
    const f = Math.round(twos(T) * 30); if (f < 156) return null;
    let x = 0; for (const k of JK) if (k[0] <= f && k[0] <= 170 && k[2] < 5) x = Math.max(x, k[1] + 90);
    return { x, s: .45 + .75 * clamp((f - 156) / 14) };
  }
  const pileSprite = () => L.cached('s3-pile', 120, 44, g => {
    g.translate(60, 40);
    const pts = []; for (let k = 0; k <= 16; k++) { const u = k / 16, x = (u - .5) * 104, h = 30 * Math.pow(Math.sin(u * Math.PI), .8) * (.82 + .3 * rnd(781, k)); pts.push([x, -h]); }
    g.fillStyle = '#7E7974'; L.poly(g, [[-54, 2], ...pts, [54, 2]]); g.fill();
    g.save(); g.clip(); L.textureOverlay(g, 'powder', -60, -40, 120, 44, { alpha: .55, blend: 'multiply', scale: .3, seed: 31 });
    g.fillStyle = 'rgba(201,196,191,.45)'; for (let k = 0; k < 34; k++) g.fillRect((rnd(782, k) - .5) * 96, -rnd(783, k) * 26, 2, 2);
    g.fillStyle = 'rgba(43,39,40,.55)'; for (let k = 0; k < 26; k++) g.fillRect((rnd(784, k) - .5) * 96, -rnd(785, k) * 22, 2, 2);
    g.restore();
    g.strokeStyle = '#3D3638'; g.lineWidth = 2; g.beginPath(); g.moveTo(-8, -12); g.lineTo(30, -34); g.stroke();      // burnt sparkler wire
    g.fillStyle = '#E2741C'; g.beginPath(); g.ellipse(-26, -12, 7, 4, -.5, 0, TAU); g.fill();                          // marigold petal
    g.fillStyle = '#D9C9A8'; L.poly(g, [[12, -6], [24, -11], [27, -2], [15, 1]]); g.fill();                              // cracker paper scrap
    g.fillStyle = 'rgba(43,39,40,.35)'; g.fillRect(-54, 0, 108, 2);
  });
  function drawPile(g, T) {
    const pl = jPile(T); if (!pl || pl.x <= 0) return;
    g.save(); g.translate(pl.x, FLOOR + 1); g.scale(pl.s, pl.s); g.drawImage(pileSprite(), -60, -40); g.restore();
  }
  const PUFFS = [[5.4, 470, 1150], [5.667, 650, 1150], [5.8, 790, 1160]];
  /** irregular powder clouds: soft lumpy blobs with a powder-grain alpha (cached variants) */
  const puffSprite = v => L.cached('s3-puff' + v, 128, 128, g => {
    const im = g.createImageData(128, 128), d = im.data, tex = L.textureCanvas('powder', 512, 30 + v).getContext('2d').getImageData(v * 100, v * 60, 128, 128).data;
    const lumps = []; for (let j = 0; j < 6; j++) lumps.push([64 + (rnd(171 + v, j) - .5) * 60, 64 + (rnd(172 + v, j) - .5) * 44, 18 + 16 * rnd(173 + v, j)]);
    for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
      let a = 0; for (const [lx, ly, lr] of lumps) { const q = ((x - lx) ** 2 + (y - ly) ** 2) / (lr * lr); a += Math.exp(-q * 1.6); }
      const i = (y * 128 + x) * 4, n = tex[i] / 255;
      a = clamp(a * 1.1) * clamp(.25 + 1.1 * n) * (1 - L.smoothstep(52, 64, Math.hypot(x - 64, y - 64)));
      d[i] = 140; d[i + 1] = 135; d[i + 2] = 131; d[i + 3] = Math.round(255 * clamp(a));
    }
    g.putImageData(im, 0, 0);
  });
  function drawPuffs(g, T0) {
    const T = twos(T0);   // on twos, with the jhadu
    for (let p = 0; p < 3; p++) {
      const [t0, px, py] = PUFFS[p], u = (T - t0) / .3; if (u < 0 || u > 1) continue;
      const e = E.outCubic(u);
      for (let j = 0; j < 4; j++) {   // powder blobs kicked forward along the stroke and up
        const s = (54 + 34 * rnd(84, p * 4 + j)) * (.45 + .85 * e), bx = px - 20 + j * 22 + (40 + 50 * rnd(85, p * 4 + j)) * e, by = py - 8 - (18 + 40 * rnd(86, p * 4 + j)) * e;
        g.save(); g.globalAlpha = .45 * (1 - u) * (1 - .3 * u); g.translate(bx, by); g.rotate(rnd(87, p * 4 + j) * TAU + u * .6); g.drawImage(puffSprite((p + j) % 3), -s, -s * .8, s * 2, s * 1.6); g.restore();
      }
      g.fillStyle = 'rgba(92,86,84,.9)';   // grit specks flicked along the sweep direction
      for (let j = 0; j < 10; j++) {
        const q = p * 10 + j, tt = (T - t0) * (.85 + .3 * rnd(88, q)), vx = 380 + 520 * rnd(89, q), vy = -160 - 320 * rnd(90, q);
        const x = px - 10 + vx * tt, y = py + vy * tt + 1500 * tt * tt, sz = 2 + rnd(80, q) * 1.4;
        if (tt < .32 && y < py + 30) { g.globalAlpha = 1 - tt / .32; g.fillRect(x - sz / 2, y - sz / 2, sz, sz); }
      }
      g.globalAlpha = 1;
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
    if (T < 5.45 || T > 6.46) return;
    // the swept dust turns to gold glitter that runs OUT along the floor band, then rises up the board's two edges
    // into the sky (never over the copy: x 150..930 x y 690..915 is kept clean)
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 24; k++) {
      const p = k % 3, [, px, py] = PUFFS[p], ts = PUFFS[p][0] + .06 + rnd(91, k) * .2, te = 6.45 - rnd(92, k) * .12, u = (T - ts) / (te - ts); if (u < 0 || u > 1) continue;
      const side = p === 0 ? -1 : p === 2 ? 1 : (Math.floor(k / 3) % 2 ? 1 : -1);
      const ex = side < 0 ? 62 + rnd(93, k) * 80 : 942 + rnd(93, k) * 80;          // corridor beside the frame
      const x0 = px + (rnd(97, k) - .5) * 70, y0 = py - 14 - rnd(94, k) * 30, ym = 1050 + rnd(98, k) * 60, y1 = 400 + rnd(95, k) * 110;
      const u1 = .38, a = clamp(u / u1), b = clamp((u - u1) / (1 - u1));
      const x = lerp(x0, ex, E.inOutQuad(a)) + Math.sin(T * 3.1 + k) * 10 * b, y = lerp(lerp(y0, ym, E.outQuad(a)), y1, E.inOutQuad(b));
      const s = (11 + 15 * rnd(96, k)) * (.55 + .45 * Math.abs(Math.sin(T * 14 + k * 1.7))) * (1 + .8 * Math.max(0, 1 - u * 10));
      const inX = L.smoothstep(130, 150, x) * (1 - L.smoothstep(930, 950, x)), inY = L.smoothstep(670, 690, y) * (1 - L.smoothstep(915, 935, y)), keep = 1 - inX * inY;
      sparkle(g, x, y, s, keep * Math.min(1, u * 8) * (1 - E.inQuad(clamp((u - .6) / .4))));
    }
    g.restore();
  }
  /** 'हाफ़' back-crack: skew (deg), drop (px) and vertical squash. Peak 14° held on two whole frames (6.433, 6.467,
      shutter included), snap through -4° at 6.500, settle by 6.567 into a tired 2° slump, 3 px lower, for the rest of the hold */
  function crack(T) {
    if (T < 6.4) return { sk: 0, dy: 0, sy: 1 };
    if (T < 6.42) { const u = E.outCubic((T - 6.4) / .02); return { sk: 14 * u, dy: 8 * u, sy: 1 - .12 * u }; }
    if (T < 6.478) return { sk: 14, dy: 8, sy: .88 };
    if (T < 6.492) { const u = E.inOutQuad((T - 6.478) / .014); return { sk: lerp(14, -4, u), dy: lerp(8, 1, u), sy: lerp(.88, 1.03, u) }; }
    if (T < 6.508) return { sk: -4, dy: 1, sy: 1.03 };
    const u = clamp((T - 6.508) / .059), e = E.outBack(u, 2.2);
    return { sk: lerp(-4, 2, e), dy: lerp(1, 3, e), sy: lerp(1.03, 1, u) };
  }
  function drawFaceLive(g, T) {   // printed-surface animation (hero word, fine print, jhadu): lit with the face
    g.save(); g.translate(TV.x, TV.y);
    const o = HO, lay = heroLay(g), wd = lay[PI], wh = L.measure(g, HAF, o);
    const cr = crack(T);
    g.save(); g.translate(wd.x + wh / 2, HY + cr.dy); g.transform(1, 0, -Math.tan(cr.sk * DEG), 1, 0, 0); g.scale(1, cr.sy);
    L.text(g, HAF, 0, 0, Object.assign({}, o, { color: RED, maxWidth: wh + 2 }));
    g.restore();
    if (T >= 6.4 && T < 6.6) {   // 'krrk' ticks: three bold Ink strokes radiating off the top of 'हाफ़' (its back)
      const a = 1 - E.inQuad(clamp((T - 6.53) / .07)); g.strokeStyle = L.rgba(INK, .95 * a); g.lineWidth = 6; g.lineCap = 'round';
      const cx = wd.x + wh * .62, cy = HY - 90, grow = E.outCubic(clamp((T - 6.4) / .05));
      for (let j = 0; j < 3; j++) { const ang = -2.2 + j * .6, r0 = 10, r1 = 10 + 30 * grow; g.beginPath(); g.moveTo(cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0); g.lineTo(cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1); g.stroke(); }
    }
    // fine print, readable on a phone: 40 px Ink at 85 %, centred in the clear band under the sub; the two MM Red
    // asterisks (after 'हाफ़।' and at the start of the line) tie the footnote to the punch word
    const fa = prog(T, 5.9, 6.1, E.outQuad);
    if (fa > 0) {
      const oh = { font: 'dev', size: 40, weight: 500 }, oe = { font: 'lat', size: 40, weight: 500 }, oa = { font: 'lat', size: 40, weight: 600 };
      const sa = L.measure(g, '*', oa), w1 = L.measure(g, FINE_A_HI.slice(1), oh), wm = L.measure(g, '  ·  ', oe), w2 = L.measure(g, FINE_A_EN.slice(6), oe);
      const runs = EN ? [['*', oa, RED, sa], [FINE_A_EN.slice(6), oe, INK, w2]] : [['*', oa, RED, sa], [FINE_A_HI.slice(1), oh, INK, w1], ['  ·  ', oe, INK, wm], ['*', oa, RED, sa], [FINE_A_EN.slice(6), oe, INK, w2]];
      let x = 420 - runs.reduce((s, r) => s + r[3], 0) / 2; const y = 440, al = .85 * fa;   // baseline 1000: descenders clear the floor rule
      for (const [str, o, col, w] of runs) {
        L.text(g, str, x, y, Object.assign({}, o, { align: 'left', color: col, alpha: col === RED ? fa : al, maxWidth: w + 2 })); x += w;
      }
      // the footnote mark on the hero, stamped in on the same beat
      const wD = L.measure(g, DANDA, o), sc = keys(T - 5.9, [[0, 1.6], [.1, .9], [.167, 1]]);
      g.save(); g.translate(wd.x + wh + wD + 16, HY - 40); g.scale(sc, sc);
      L.text(g, '*', 0, 22, { font: 'lat', size: 64, weight: 700, color: RED, alpha: fa, maxWidth: 40 }); g.restore();
    }
    g.restore();
    drawPile(g, T);
    drawJhadu(g, T);
    drawPuffs(g, T);
  }
  /** the face as it stands after the gag (slumped 'हाफ़', fine print on): used for the smeared whip-out */
  const faceFinal = () => L.cached('s3-facefinal', TV.w, TV.h, g => { g.translate(-TV.x, -TV.y); g.drawImage(faceB(false), TV.x, TV.y); drawFaceLive(g, 7.0); });
  function drawTri(g, T, vx = 0) {
    const { x: X, y: Y, w: FWd, h: FH, n: N } = TV, SW = FWd / N, RIN = SW / (2 * Math.sqrt(3));
    g.fillStyle = '#0E0C10'; g.fillRect(X, Y, FWd, FH);
    const whipOut = T > 6.62 && Math.abs(vx) * DT >= 7;
    if (whipOut) { g.save(); g.beginPath(); g.rect(X, Y, FWd, FH); g.clip(); drawMB(g, faceFinal(), 'facefinal', X, Y, vx); g.restore(); }
    const fa = faceA(), fb = faceB(T < TA);
    let settled = true; const angs = [];
    for (let i = 0; i < N; i++) { const a = slatAngle(T, i); angs.push(a); if (Math.abs(a - 120) > .25) settled = false; }
    if (whipOut) { /* drawn above */ }
    else if (settled) g.drawImage(fb, X, Y);
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
    if (T >= TA - .001 && !whipOut) { g.save(); g.beginPath(); g.rect(X, Y, FWd, FH); g.clip(); drawFaceLive(g, T); g.restore(); }
    // night light: multiply light map, then warm hot-spots off the up-lights
    g.save(); g.beginPath(); g.rect(X, Y, FWd, FH); g.clip();
    g.globalCompositeOperation = 'multiply'; g.drawImage(faceLight(), X, Y);
    g.globalCompositeOperation = 'lighter';
    for (const lx of LAMPS_A) { const fl = .9 + .1 * L.noise1(T * 7 + lx, 4); glow(g, lx, Y + FH + 10, 130, '#FFD9A8', .07 * fl); }
    g.globalCompositeOperation = 'source-over';
    for (let i = 0; i < N; i++) { const v = rnd(121, i) - .5; g.fillStyle = v > 0 ? `rgba(255,248,236,${.05 * v})` : `rgba(10,8,14,${-.07 * v})`; g.fillRect(X + i * SW, Y, SW, FH); }
    g.fillStyle = 'rgba(8,6,10,.42)'; for (let i = 1; i < N; i++) g.fillRect(X + i * SW - .75, Y, 1.5, FH);
    g.fillStyle = 'rgba(255,246,230,.10)'; for (let i = 1; i < N; i++) g.fillRect(X + i * SW - 2.5, Y, 1.5, FH);
    g.restore();
  }
  function drawA(g, T, vx) {
    drawMB(g, aBack(), 'aback', -320, 1060, vx);
    drawTri(g, T, vx);
    // flood cones: visible warm-white light thrown up the face from the two lenses
    g.save(); g.beginPath(); g.rect(TV.x - 14, 380, TV.w + 28, LENS_Y - 380); g.clip(); g.globalCompositeOperation = 'lighter';
    for (const lx of LAMPS_A) { const fl = .92 + .08 * L.noise1(T * 7 + lx, 4); g.globalAlpha = fl; g.drawImage(coneSprite(), lx - 280, LENS_Y - CONE_LEN); }
    g.restore();
    drawMB(g, aFrame(), 'aframe', 90, 530, vx);
    drawMB(g, aBldg(), 'abldg', -320, 1290, vx);
    // lamp lenses (bloom kept tight: the glow ends > 30 px short of the MM plate at x 730)
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const [k, lx] of LAMPS_A.entries()) {
      const fl = .9 + .1 * L.noise1(T * 7 + lx, 4);
      glow(g, lx, 1229, 62, '#FFD9A8', .6 * fl); glow(g, lx, 1229, 26, '#FFF4E0', .8 * fl);
      g.fillStyle = `rgba(255,236,206,${.2 * fl})`; g.fillRect(lx - 40, 1228, 80, 2);   // anamorphic glint
      g.fillStyle = `rgba(255,250,240,${fl})`; g.beginPath(); g.ellipse(lx, 1229, 24, 4.2, -.1, 0, TAU); g.fill();
    }
    g.restore();
    // parapet: string lights + five diyas (all left of the plate: the MM plate keeps a dark field)
    L.stringLights(g, { x0: -320, y0: 1346, x1: 1240, y1: 1346, sag: 16, n: 64, t: T, seed: 4, size: 4, colors: [GOLD, BULB, '#FF9F1C'], mode: 'twinkle', wire: 'rgba(15,12,16,.9)' });
    for (const [k, x] of [70, 205, 340, 470, 600].entries()) L.diya(g, x, 1291, 13, T, 40 + k, { flameSize: 18 });
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
    for (let k = 0; k < 11; k++) { const jx = 70 + k * 92; g.fillStyle = 'rgba(244,242,238,.10)'; g.beginPath(); g.roundRect(jx, 1408, 44, 62, 8); g.fill(); g.fillStyle = ['rgba(242,178,62,.55)', 'rgba(217,114,30,.5)', 'rgba(238,236,232,.4)'][k % 3]; g.fillRect(jx + 6, 1436, 32, 30); g.fillStyle = 'rgba(140,135,131,.7)'; g.fillRect(jx + 8, 1402, 28, 7); }
    g.fillStyle = 'rgba(140,135,131,.5)'; g.fillRect(50, 1472, 980, 4);
    for (let k = 0; k < 8; k++) { const tx = 105 + k * 112; g.fillStyle = 'rgba(140,135,131,.75)'; g.beginPath(); g.ellipse(tx + 40, 1566, 48, 7, 0, 0, TAU); g.fill();
      if (k % 3 === 1) { for (let r = 0; r < 3; r++) for (let j = 0; j < 4 - r; j++) { const x = tx + 10 + j * 17 + r * 8.5, y = 1556 - r * 9; g.fillStyle = r % 2 ? '#E8DECD' : '#F0E8DA'; L.poly(g, [[x, y - 6], [x + 9, y], [x, y + 6], [x - 9, y]]); g.fill(); } }
      else { const col = k % 3 ? GOLDINK : '#D9721E'; for (let r = 0; r < 3; r++) for (let j = 0; j < 3 - r; j++) { const x = tx + 22 + j * 17 + r * 8.5, y = 1554 - r * 14; g.fillStyle = col; g.beginPath(); g.arc(x, y, 8.5, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,240,200,.35)'; g.beginPath(); g.arc(x - 3, y - 3, 3, 0, TAU); g.fill(); } } }
  });
  function bLines() {   // LED copy rendered once
    const o1 = EN ? fitO(B1, { font: 'lat', size: 68, weight: 720 }, 680) : { font: 'dev', size: 72, weight: 700 };
    const o2 = EN ? fitO(B2, { font: 'lat', size: 78, weight: 800 }, 700) : { font: 'dev', size: 84, weight: 800 }, os = { font: 'lat', size: 40, weight: 600 };
    // line 2 (MM Red punch) gets a thin Rich Black ring, not a grey knockout; it sits OUT of the heavy dot mask
    return { o1, o2, os, l2: textImg(B2, o2, RED), sub: textImg(SUB_B, os, MIST), l2k: textImg(B2, o2, RED, 6, 'rgba(28,26,26,.9)'), subk: textImg(SUB_B, os, MIST, 10) };
  }
  /* kaju katli: real mithai pushed OUT of the screen. Each piece materialises from LED cells at the copy-free band
     (y 1035) and drops a short way onto a heap; the landing table is pre-simulated (seed 44), the landings are the
     audible ones: 8.100 ... 9.267 */
  const KJ_TOP = 1035, KJ_Y0 = 1000, KJ_V0 = 700, KJ_G = 2200;
  let KAJU = null;
  function kajuTable() {
    if (KAJU) return KAJU;
    KAJU = []; const Hf = new Float32Array(320).fill(1212);   // heightfield over x 620..940
    const ev = [8.1, 8.267, 8.4, 8.567, 8.733, 8.933, 9.1, 9.267], cnt = [3, 2, 3, 2, 3, 2, 3, 2]; let i = 0;
    ev.forEach((te, e) => { for (let j = 0; j < cnt[e]; j++, i++) {
      // a loose mound centred near x 770: each piece slides to a low spot near where it falls, lands half a piece
      // off its neighbours, lies at its own depth (dz) and keeps a random ±20° turn
      const target = clamp(772 + (rnd(44, i * 3) + rnd(44, i * 3 + 7) - 1) * 118, 690, 856); let best = null;
      for (let cx = Math.max(668, target - 40); cx <= Math.min(874, target + 40); cx += 2) {
        let top = 1e9; for (let x = cx - 21; x <= cx + 21; x += 2) top = Math.min(top, Hf[Math.round(x) - 620]);
        const score = top - Math.abs(cx - target) * .35; if (!best || score > best.score) best = { cx, top, score };
      }
      const tx = best.cx + (rnd(44, i * 3 + 5) - .5) * 14, dz = rnd(44, i * 3 + 9) * 9, cy = best.top - 6 + dz;
      const sl = (Hf[Math.round(tx + 23) - 620] - Hf[Math.round(tx - 23) - 620]) / 46;
      const ang = clamp(Math.atan(sl) * .5 + (rnd(44, i * 3 + 1) - .5) * .7, -.4, .4);
      for (let x = Math.round(tx - 30); x <= tx + 30; x++) { const q = x - 620; if (q >= 0 && q < 320) Hf[q] = Math.min(Hf[q], cy - dz - 6 + Math.abs(x - tx) * .28); }
      const tl = te + (j - (cnt[e] - 1) / 2) * .012, d = cy - KJ_Y0;
      const fall = (-KJ_V0 + Math.sqrt(KJ_V0 * KJ_V0 + 2 * KJ_G * d)) / KJ_G;   // y = y0 + v0 u + g u²/2 reaches cy
      const tin = (-KJ_V0 + Math.sqrt(KJ_V0 * KJ_V0 + 2 * KJ_G * (KJ_TOP - KJ_Y0))) / KJ_G;   // crosses the emitter line
      KAJU.push({ tl, t0: tl - fall, fall, te: tl - fall + tin, x0: tx + (rnd(45, i) - .5) * 36, tx, cy, ang, spin: (rnd(46, i) - .5) * 2.4, glint: rnd(47, i), i });
    } });
    return KAJU;
  }
  /* kaju katli as mithai, not sugar cubes: a 64x40 diamond slab, warm cashew-fudge top #E9DCC2 over a 5 px
     #CBB894 side face, a 1 px Stone edge and four 2 px silver-leaf flecks (Paper #F4F2EE). Every channel stays
     below the bloom threshold (Paper is the brightest, 244), so the pile never glows like light */
  const kajuSprite = () => L.cached('s3-kaju4', 80, 64, g => {
    g.translate(40, 24);
    g.fillStyle = '#CBB894'; L.poly(g, [[-32, 0], [0, 20], [0, 25], [-32, 5]]); g.fill();
    g.fillStyle = '#BCA882'; L.poly(g, [[0, 20], [32, 0], [32, 5], [0, 25]]); g.fill();
    g.fillStyle = '#E9DCC2'; L.poly(g, [[0, -20], [32, 0], [0, 20], [-32, 0]]); g.fill();
    const tg = g.createLinearGradient(-16, -12, 16, 12); tg.addColorStop(0, 'rgba(236,226,204,.5)'); tg.addColorStop(1, 'rgba(176,150,108,.16)');
    g.fillStyle = tg; L.poly(g, [[0, -20], [32, 0], [0, 20], [-32, 0]]); g.fill();
    g.fillStyle = 'rgba(150,128,90,.18)'; for (let k = 0; k < 18; k++) g.fillRect((rnd(53, k) - .5) * 34, (rnd(54, k) - .5) * 18, 1.5, 1.5);   // cashew grain
    g.strokeStyle = STONE; g.lineWidth = 1; g.lineJoin = 'round';
    L.poly(g, [[-32, 0], [0, -20], [32, 0], [32, 5], [0, 25], [-32, 5]]); g.stroke();
    g.beginPath(); g.moveTo(-32, 0); g.lineTo(0, 20); g.lineTo(32, 0); g.moveTo(0, 20); g.lineTo(0, 25); g.stroke();
    for (const [x, y, r] of [[-12, -4, .4], [6, -9, 1.1], [13, 4, 2.2], [-2, 8, 2.9]]) {   // vark flecks: 2-3 px scraps
      const pts = [[x - 1.6, y - .6], [x + .4, y - 1.4], [x + 1.7, y - .2], [x + .8, y + 1.2], [x - 1.2, y + .9]].map(([px, py]) => [x + (px - x) * Math.cos(r) - (py - y) * Math.sin(r), y + (px - x) * Math.sin(r) + (py - y) * Math.cos(r)]);
      g.fillStyle = 'rgba(140,135,131,.55)'; L.poly(g, pts.map(([a, b]) => [a + .7, b + .7])); g.fill();
      g.fillStyle = PAPER; L.poly(g, pts); g.fill();
    }
  });
  /** the same piece as coarse LED cells (materialise frames) */
  const kajuCells = () => L.cached('s3-kajucells4', 80, 64, g => {
    const sm = L.cached('s3-kajusm4', 14, 11, s => s.drawImage(kajuSprite(), 0, 0, 14, 11));
    g.imageSmoothingEnabled = false; g.drawImage(sm, 0, 0, 84, 66);
    g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(255,248,236,.2)'; g.fillRect(0, 0, 80, 64);
    g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000'; for (let x = 0; x < 80; x += 6) g.fillRect(x, 0, 1, 64); for (let y = 0; y < 64; y += 6) g.fillRect(0, y, 80, 1);
  });
  function vark(g, x, y, s) {   // silver-leaf glint: a thin Paper 4-point star, drawn source-over (no bloom)
    if (s < .8) return; g.fillStyle = PAPER; g.beginPath();
    g.moveTo(x, y - s); g.lineTo(x + s * .18, y - s * .18); g.lineTo(x + s, y); g.lineTo(x + s * .18, y + s * .18); g.lineTo(x, y + s); g.lineTo(x - s * .18, y + s * .18); g.lineTo(x - s, y); g.lineTo(x - s * .18, y - s * .18); g.closePath(); g.fill();
  }
  function drawKaju(g, T) {
    const sp = kajuSprite(), cells = kajuCells(), MAT = 2 / 30;
    for (const k of kajuTable()) {
      if (T < k.te) continue;
      let x, y, a, sy = 1;
      const falling = T < k.tl;
      if (falling) { const u = T - k.t0; y = KJ_Y0 + KJ_V0 * u + .5 * KJ_G * u * u; x = lerp(k.x0, k.tx, u / k.fall); a = k.ang + k.spin * (1 - u / k.fall); }
      else { const u = T - k.tl; x = k.tx; a = k.ang; y = k.cy; if (u < .14) { const b = u / .14; y -= 4 * 9 * b * (1 - b); } if (u < .034) sy = .82; }
      const mat = clamp((T - k.te) / MAT);
      g.save();
      if (falling) { g.beginPath(); g.rect(SCR.x, KJ_TOP, SCR.w, SCR.y + SCR.h - KJ_TOP); g.clip(); }
      if (!falling) {   // contact shadow on the screen glass / on the piece below
        g.fillStyle = 'rgba(8,6,10,.3)'; g.beginPath(); g.ellipse(x + 2, y + 16, 28, 6, a, 0, TAU); g.fill();
      }
      g.translate(x, y); g.rotate(a); g.scale(1 + (1 - sy) * .5, sy);
      if (mat < 1) { g.globalAlpha = 1 - mat * mat; g.drawImage(cells, -40, -24); g.globalAlpha = mat; }
      g.drawImage(sp, -40, -24);
      g.restore();
      if (falling && mat < 1) {   // the emitter line flares where the piece pushes through
        g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = `rgba(255,236,210,${.55 * (1 - mat)})`;
        for (let c = -5; c <= 5; c++) g.fillRect(Math.round((x + c * 6) / 6) * 6 - 2, KJ_TOP - 2, 4, 4);
        glow(g, x, KJ_TOP, 46, '#FFE7C4', .35 * (1 - mat)); g.restore();
      }
      if (!falling && k.glint > .55) { const ph = (T * 1.3 + k.glint * 7) % 2.2; if (ph < .25) vark(g, x + 6, y - 6, 7 * Math.sin(ph / .25 * Math.PI)); }
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
    const l1imgs = lay1.map(w => textImg(w.word, tl.o1, PAPER)), l1k = lay1.map(w => textImg(w.word, tl.o1, PAPER, 11));
    const p1 = lay1.map((w, i) => prog(T, 7.6 + i / 30, 7.6 + i / 30 + .133));
    const pop = T < 7.9 ? 0 : keys(T - 7.9, [[0, .85], [.1, 1.06], [.167, 1]]), a2 = prog(T, 7.9, 7.94), ps = prog(T, 7.9, 8.033);
    const gone = T >= 9.5;
    g.save(); g.globalCompositeOperation = 'lighter';
    lay1.forEach((w, i) => { if (i === 0 && T >= 9.4) return; const im = l1imgs[i], h = haloImg(im, 10, 'b1' + i); g.globalAlpha = .42 * p1[i]; g.drawImage(h, w.x - im._bx - 20, 770 - im._by - 20); });
    if (a2 > 0) {   // emissive red bloom BEHIND the punch line (never on it): wide soft field + tighter core
      const h = haloImg(tl.l2, 28, 'b2w'), h2 = haloImg(tl.l2, 10, 'b2'); g.save(); g.translate(540, 900); g.scale(pop, pop);
      g.globalAlpha = .62 * a2; g.drawImage(h, -tl.l2.width / 2 - 56, -tl.l2._by - 56);
      g.globalAlpha = .3 * a2; g.drawImage(h2, -tl.l2.width / 2 - 20, -tl.l2._by - 20); g.restore();
    }
    if (ps > 0) { const h = haloImg(tl.sub, 8, 'bs'); g.globalAlpha = .32 * ps; g.drawImage(h, 540 - tl.sub.width / 2 - 16, 1010 - tl.sub._by - 16); }
    g.restore();
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
      dissolve(g, l1k[i], x, y, p1[i], 300 + i);
    });
    if (ps > 0) dissolve(g, tl.subk, 540 - tl.subk.width / 2, 1010 - tl.subk._by, ps, 330);
    g.restore();
    if (scanY < Y + SH) { g.fillStyle = '#121014'; g.fillRect(X, scanY, SWd, Y + SH - scanY); }
    // LED dot pitch + scanlines over the whole panel
    g.drawImage(ledMask(SWd, SH), X, Y);
    // the MM Red punch line sits OUT of the heavy mask: true #D2232E with only an 8 % grid baked in (phase-aligned)
    if (a2 > 0) {
      const lx = Math.round(540 - tl.l2k.width / 2), ly = Math.round(900 - tl.l2k._by), mi = maskedImg(tl.l2k, 'l2', X + 3 - lx, Y + 3 - ly, .08);
      g.save(); g.beginPath(); g.rect(X, Y, SWd, SH); g.clip(); g.globalAlpha = a2; g.translate(540, 900); g.scale(pop, pop); g.drawImage(mi, lx - 540, ly - 900); g.restore();
    }
    // kaju katli: physical mithai in front of the glass (no dot mask)
    g.save(); g.beginPath(); g.rect(X, Y, SWd, SH); g.clip(); drawKaju(g, T); g.restore();
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
    ownMarigolds(() => L.toran(g, { x0: 40, x1: 1040, y: 1374, t: T, seed: 3, flower: 11, strands: 9, strandLen: 3, sway: .8 }));
  }

  /* ======================= BAR C: LED van at street level ======================= */
  const cBldg = () => L.cached('s3-cbldg', 2000, 1300, g => {
    g.translate(200, -160);
    // five old-city houses, each with its own window language: louvred, arched, jharokha balconies, plain grilles
    const blds = [[-200, 250, 390, 0, 'louvre'], [250, 640, 330, 1, 'arch'], [640, 1080, 420, 0, 'rect'], [1080, 1470, 350, 1, 'arch'], [1470, 1800, 400, 0, 'louvre']];
    const win = (x, y, w, h, st, kind, id) => {
      const lit = st > .64, warm = lit ? 'rgba(255,181,71,.36)' : st > .2 ? 'rgba(201,196,191,.13)' : '#141215';
      if (kind === 'arch') { g.fillStyle = '#19161A'; archWin(g, x - 4, y - 4, w + 8, h + 8); g.fill(); g.fillStyle = warm; archWin(g, x, y, w, h); g.fill(); g.fillStyle = '#19161A'; g.fillRect(x + w / 2 - 2, y, 4, h); }
      else {
        g.fillStyle = '#19161A'; g.fillRect(x - 5, y - 5, w + 10, h + 10); g.fillStyle = warm; g.fillRect(x, y, w, h);
        if (kind === 'louvre') { g.fillStyle = '#211D21'; for (const sx of [x - 20, x + w + 2]) { g.fillRect(sx, y - 2, 18, h + 4); g.fillStyle = 'rgba(0,0,0,.35)'; for (let yy = y + 2; yy < y + h; yy += 6) g.fillRect(sx + 2, yy, 14, 2); g.fillStyle = '#211D21'; } }
        else { g.fillStyle = 'rgba(25,22,26,.85)'; for (let xx = x + 9; xx < x + w; xx += 10) g.fillRect(xx, y, 2, h); g.fillRect(x, y + h / 2 - 1, w, 2); }
        g.fillStyle = '#2E292D'; g.fillRect(x - 10, y - 14, w + 20, 7); topEdge(g, x - 10, y - 14, w + 20, .55);   // chhajja
      }
      if (lit && (id === 3 || id === 11)) {   // curtains drawn aside in two lit windows
        g.fillStyle = 'rgba(120,42,30,.75)'; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + w * .34, y + h * .4, x + 6, y + h); g.lineTo(x, y + h); g.closePath(); g.fill();
        g.beginPath(); g.moveTo(x + w, y); g.quadraticCurveTo(x + w * .66, y + h * .4, x + w - 6, y + h); g.lineTo(x + w, y + h); g.closePath(); g.fill();
      }
    };
    const jharokha = (cx, y) => {   // projecting oriel: brackets, three arched lights, a curved chhajja
      g.fillStyle = '#2F2A2D'; g.fillRect(cx - 78, y + 96, 156, 14); topEdge(g, cx - 78, y + 96, 156, .6);
      g.fillStyle = '#241F22'; for (const bx of [-64, 0, 64]) { L.poly(g, [[cx + bx - 8, y + 110], [cx + bx + 8, y + 110], [cx + bx, y + 140]]); g.fill(); }
      g.fillStyle = '#2A2528'; g.fillRect(cx - 72, y, 144, 96);
      for (const k of [-1, 0, 1]) { const st = rnd(721, cx + k); g.fillStyle = '#19161A'; archWin(g, cx + k * 46 - 18, y + 18, 36, 70); g.fill(); g.fillStyle = st > .45 ? 'rgba(255,181,71,.42)' : 'rgba(201,196,191,.12)'; archWin(g, cx + k * 46 - 15, y + 22, 30, 64); g.fill(); }
      g.fillStyle = '#332E31'; g.beginPath(); g.moveTo(cx - 90, y + 4); g.quadraticCurveTo(cx, y - 44, cx + 90, y + 4); g.lineTo(cx + 90, y + 12); g.quadraticCurveTo(cx, y - 32, cx - 90, y + 12); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(140,135,131,.7)'; g.lineWidth = 2; g.beginPath(); g.moveTo(cx - 90, y + 4); g.quadraticCurveTo(cx, y - 44, cx + 90, y + 4); g.stroke();
      g.fillStyle = '#2A2528'; g.beginPath(); g.arc(cx, y - 24, 9, Math.PI, TAU); g.fill();
    };
    let wid = 0;
    for (const [x0, x1, top, kg, kind] of blds) {
      g.fillStyle = x0 % 2 ? '#2B2728' : '#292527'; g.fillRect(x0, top, x1 - x0, 1440 - top);
      if (kg) for (let x = x0 + 12; x < x1 - 8; x += 24) merlon(g, x, top, 18, 16);
      g.fillStyle = '#353032'; g.fillRect(x0 - 4, top, x1 - x0 + 8, 12); topEdge(g, x0 - 4, top, x1 - x0 + 8);
      for (let y = top + 40, r = 0; y < 900; y += 120, r++) {
        g.fillStyle = '#242022'; g.fillRect(x0, y + 100, x1 - x0, 8); topEdge(g, x0, y + 100, x1 - x0, .25);
        const w = kind === 'arch' ? 54 : 50, h = kind === 'arch' ? 82 : 70, step = kind === 'louvre' ? 130 : 110;
        for (let x = x0 + (kind === 'louvre' ? 44 : 30); x < x1 - 70; x += step) win(x, y + (kind === 'arch' ? 0 : 6), w, h, rnd(701, x * 7 + r), kind, wid++);
      }
      // shop level: signboard band; rolled shutters, some half up over warm interiors
      g.fillStyle = '#1F1C1F'; g.fillRect(x0, 960, x1 - x0, 80); topEdge(g, x0, 960, x1 - x0, .6);
      g.fillStyle = '#2E2A2D'; g.fillRect(x0 + 14, 972, x1 - x0 - 28, 56); topEdge(g, x0 + 14, 972, x1 - x0 - 28, .5);
      g.fillStyle = '#1A171B'; g.fillRect(x0, 1040, x1 - x0, 380);
      const ig = g.createLinearGradient(0, 1060, 0, 1420); ig.addColorStop(0, 'rgba(255,181,71,.38)'); ig.addColorStop(1, 'rgba(255,140,40,.1)');
      g.fillStyle = ig; g.fillRect(x0 + 20, 1060, x1 - x0 - 40, 360);
      const sw = (x1 - x0 - 40) / 2;
      for (let j = 0; j < 2; j++) {
        const sx = x0 + 20 + j * sw, down = [.55, 1, .25, .7, .4, 1, .6, .3, .85, .5][(x0 / 10 + j * 3 + 100) % 10 | 0];
        g.fillStyle = '#3A3538'; g.fillRect(sx + 4, 1056, sw - 8, 360 * down);
        g.fillStyle = 'rgba(0,0,0,.32)'; for (let yy = 1060; yy < 1056 + 360 * down; yy += 7) g.fillRect(sx + 4, yy, sw - 8, 2);
        g.fillStyle = '#2A2629'; g.fillRect(sx + 4, 1056 + 360 * down - 6, sw - 8, 6); topEdge(g, sx + 4, 1056, sw - 8, .5);
        g.fillStyle = '#25212A'; g.fillRect(sx, 1046, sw, 12);   // shutter box
      }
    }
    jharokha(445, 560); jharokha(1275, 520); jharokha(-30, 600);
    // an AC unit with a long drip stain
    g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(912, 812, 7, 140); g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(906, 812, 18, 70);
    g.fillStyle = '#3B363B'; g.fillRect(866, 770, 70, 44); topEdge(g, 866, 770, 70, .7); g.strokeStyle = '#211E22'; g.lineWidth = 2; g.beginPath(); g.arc(892, 792, 14, 0, TAU); g.stroke(); for (let k = 0; k < 4; k++) { g.fillStyle = '#211E22'; g.fillRect(914, 778 + k * 8, 14, 2); }
    grime(g, -200, 160, 2000, 1300, 1);
    ownMarigolds(() => { for (const [x0, x1] of [[260, 630], [650, 1070]]) L.toran(g, { x0: x0 + 10, x1: x1 - 10, y: 1050, t: 0, seed: x0, flower: 9, strands: 5, strandLen: 2, sway: 0 }); });
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
    for (const f of C_FEST) if (f.kd) L.lantern(g, (f.a + f.b) / 2, f.y + f.d, 10, T, f.id * 3 + 1, { color: f.id % 2 ? '#E8901E' : MUSLIN, light: GOLD });
    // diyas on the shop steps either side of the van (none on the road under the chassis)
    for (const [k, [x, y]] of [[16, 1428], [44, 1430], [1066, 1428]].entries()) L.diya(g, x, y, 11, T, 80 + k, { flameSize: 16 });
  }
  const BOX_SLOTS = [140, 280, 420], BOX_LAND = [10.0, 10.1, 10.2], BOX_HOP = [10.9, 11.033, 11.167, 11.7], BOX4 = 11.3, BW = 126, BH = 60;
  /** soan papdi carton (side face 126x60): Muslin board, printed Marigold band with a die-cut window onto the flaky
      cube, one flat MM Red ribbon with a small knot, Stone top-edge highlight */
  const boxSprite = (old = false) => L.cached('s3-box2' + (old ? 'old' : ''), 180, 120, g => {
    g.translate(27, 50);
    g.fillStyle = MUSLIN; g.fillRect(0, 0, BW, BH);
    // printed band + thin key lines
    g.fillStyle = old ? '#EDB86A' : '#F59E1B'; g.fillRect(0, 17, BW, 27);
    g.fillStyle = 'rgba(150,72,10,.55)'; g.fillRect(0, 17, BW, 1.5); g.fillRect(0, 42.5, BW, 1.5);
    g.fillStyle = 'rgba(238,236,232,.85)'; for (let x = 66; x < 120; x += 9) { g.beginPath(); g.moveTo(x, 30.5); g.lineTo(x + 3.5, 27); g.lineTo(x + 7, 30.5); g.lineTo(x + 3.5, 34); g.closePath(); g.fill(); }   // printed chevron border
    g.save(); g.translate(108, 25); g.scale(.55, .55); g.fillStyle = 'rgba(122,40,10,.55)'; L.butaPath(g, 14); g.fill(); g.restore();
    // die-cut window with the golden flaky cube (stacked strata, ragged edges)
    const wx = 10, wy = 12, ww = 44, wh = 36;
    g.fillStyle = '#E9E5DF'; g.beginPath(); g.roundRect(wx - 3, wy - 3, ww + 6, wh + 6, 7); g.fill();
    g.save(); g.beginPath(); g.roundRect(wx, wy, ww, wh, 5); g.clip();
    g.fillStyle = '#6E4A1C'; g.fillRect(wx, wy, ww, wh);
    for (let k = 0; k < 4; k++) {
      const y0 = wy + 3 + k * 8.4;
      g.fillStyle = k % 2 ? '#E9B655' : '#F5C76A'; g.beginPath(); g.moveTo(wx + 3, y0);
      for (let x = wx + 3; x <= wx + ww - 3; x += 3) g.lineTo(x, y0 + (rnd(611, k * 40 + x) - .5) * 2.2);
      for (let x = wx + ww - 3; x >= wx + 3; x -= 3) g.lineTo(x, y0 + 7 + (rnd(612, k * 40 + x) - .5) * 2.2);
      g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,240,200,.45)'; g.fillRect(wx + 4, y0 + 1, ww - 8, 1.2);
    }
    g.fillStyle = 'rgba(255,255,255,.18)'; L.poly(g, [[wx + 6, wy], [wx + 16, wy], [wx + 6, wy + wh], [wx - 4, wy + wh]]); g.fill();   // cellophane sheen
    g.restore();
    g.strokeStyle = 'rgba(140,135,131,.6)'; g.lineWidth = 1.2; g.beginPath(); g.roundRect(wx, wy, ww, wh, 5); g.stroke();
    // lid lip + Stone top edge, side shading, base shadow line
    g.fillStyle = '#E2DED8'; g.fillRect(-2, 0, BW + 4, 7); g.fillStyle = 'rgba(0,0,0,.14)'; g.fillRect(-2, 7, BW + 4, 1.5);
    topEdge(g, -2, 0, BW + 4, 1);
    const sg = g.createLinearGradient(BW - 26, 0, BW, 0); sg.addColorStop(0, 'rgba(0,0,0,0)'); sg.addColorStop(1, 'rgba(0,0,0,.14)'); g.fillStyle = sg; g.fillRect(BW - 26, 0, 26, BH);
    g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(0, BH - 2, BW, 2);
    // ribbon: one flat 8 px band + a small knot (last year's box: sun-faded to 50 %)
    g.save(); if (old) g.globalAlpha = .5;
    g.fillStyle = RED; g.fillRect(84, 0, 8, BH); g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(90, 0, 2, BH);
    g.fillStyle = RED; g.beginPath(); g.roundRect(80, -5, 16, 11, 4); g.fill();   // small flat knot on the lid
    g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(87.5, -4, 1.5, 9); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(82, -4, 12, 1.5);
    g.restore();
    L.textureOverlay(g, 'paper', -4, -8, BW + 8, BH + 10, { alpha: .14, blend: 'multiply', scale: .4, seed: 6 });
    if (old) {   // a year in the loft: dusty Stone-tinted lid, grimy board, a cobweb across the top-right corner
      g.save(); g.globalCompositeOperation = 'source-atop';
      g.fillStyle = 'rgba(140,135,131,.24)'; g.fillRect(-4, -8, BW + 8, BH + 10);
      g.fillStyle = 'rgba(140,135,131,.62)'; g.fillRect(-4, -8, BW + 8, 16);
      L.textureOverlay(g, 'powder', -4, -8, BW + 8, BH + 10, { alpha: .45, blend: 'multiply', scale: .25, seed: 12 });
      g.restore();
      g.fillStyle = 'rgba(201,196,191,.75)'; for (let k = 0; k < 40; k++) g.fillRect(-2 + rnd(661, k) * (BW + 4), -1 - rnd(662, k) * 3, 1.6, 1.6);   // dust on the lid edge
      g.save(); g.translate(BW, 0); g.strokeStyle = 'rgba(244,242,238,.85)'; g.lineWidth = 1.3;
      const rays = [Math.PI * .5, Math.PI * .62, Math.PI * .76, Math.PI * .9, Math.PI];   // corner web: 5 radials + 3 sagging rings
      g.beginPath(); for (const a of rays) { g.moveTo(0, 0); g.lineTo(Math.cos(a) * 40, Math.sin(a) * 34); } g.stroke();
      g.lineWidth = 1.1; for (const r of [12, 23, 34]) { g.beginPath(); rays.forEach((a, i) => { const x = Math.cos(a) * r, y = Math.sin(a) * r * .86; if (!i) g.moveTo(x, y); else { const pa = rays[i - 1], m = (a + pa) / 2; g.quadraticCurveTo(Math.cos(m) * r * .78, Math.sin(m) * r * .67, x, y); } }); g.stroke(); }
      g.beginPath(); g.moveTo(-30, 0); g.quadraticCurveTo(-33, 9, -29, 17); g.stroke();   // one loose thread hanging off the lid
      g.restore();
    }
  });
  function drawBox(g, x, yb, rot, sx, sy, a = 1, old = false) {   // (x, yb) = bottom-centre
    g.save(); g.globalAlpha *= a; g.translate(x, yb); g.scale(sx, sy); g.translate(0, -BH / 2); g.rotate(rot); g.drawImage(boxSprite(old), -90, -80); g.restore();
  }
  /** arrival arcs: tossed in from off-frame left (a neighbour's balcony), apex ~y 640, each landing on its tok.
      Anchored to the screen (like the van's entry) so the whip doesn't drag them backwards. */
  const ARC_D = .34, ARC_X0 = -200, ARC_Y0 = 720, ARC_APEX = 640;
  function boxArc(k, T) {   // bar-C coords of the box bottom-centre while in flight, else null
    const tl = BOX_LAND[k], u = (T - (tl - ARC_D)) / ARC_D; if (u < 0 || u >= 1) return null;
    const land = 1440 - 309 * VS, lx = 50 + BOX_SLOTS[k], e2 = prog(T, WBC, TC, E.inOutCubic);
    const r = Math.sqrt((ARC_Y0 - ARC_APEX) / (land - ARC_APEX)), ua = r / (1 + r), A = (ARC_Y0 - ARC_APEX) / (ua * ua);   // constant-g parabola
    return { x: lerp(ARC_X0 - k * 40, lx, u) - WHIP * (1 - e2), y: ARC_APEX + A * (u - ua) * (u - ua) - DIP * (1 - e2), rot: (1 - u) * (k % 2 ? .55 : -.45) + Math.sin(u * 9 + k) * .06 * (1 - u) };
  }
  function vanState(T) {
    // screen-relative entry: from 1100 px left of its stop *in the moving frame* (the van overtakes the auto, then brakes)
    const p = prog(T, WBC, TC), x = 50 - 1100 * (1 - E.outCubic(p)) - WHIP * (1 - E.inOutCubic(p)), tau = T - TC;
    let dy = 0, pitch = 0;
    if (T < TC) dy = 1.4 * Math.sin(T * 47) * (1 - p) + 2 * Math.abs(Math.sin(T * 13)) * (1 - p);
    else { const k = Math.exp(-6 * tau); dy = 10 * k * Math.sin(18 * tau); pitch = .011 * k * Math.sin(18 * tau); }
    for (let b = 1; b < 3; b++) { const u = T - BOX_LAND[b]; if (u > 0 && u < .6) dy += 3.5 * Math.exp(-8 * u) * Math.sin(24 * u); }   // each box hit
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
    for (let k = 0; k < 6; k++) marigold(g, 546 * VS, (-142 + k * 11.5) * VS, 10, k % 2 ? 'yellow' : 'orange', k);
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
    const o1 = EN ? fitO(C1, { font: 'lat', size: 58, weight: 720 }, 600) : { font: 'dev', size: 60, weight: 700 };
    const o2 = EN ? { font: 'lat', size: 104, weight: 800 } : { font: 'dev', size: 108, weight: 800 }, os = { font: 'lat', size: 40, weight: 600 };
    // line 2 in three runs so the '4' can be MM Red and pulse; the whole line is held to maxWidth 560
    const wA = L.measure(g, C2A, o2), w4 = L.measure(g, C2B, o2), wD = L.measure(g, C2C, o2), fit = Math.min(1, 560 / (wA + w4 + wD));
    const x0 = 349 - (wA + w4 + wD) * fit / 2, pulse = T < BOX_HOP[3] ? 1 : keys(T - BOX_HOP[3], [[0, 1], [.1, 1.15], [.22, 1]]);
    const i4 = textImg(C2B, o2, RED, 6, 'rgba(28,26,26,.9)');
    g.save(); g.beginPath(); g.rect(px, py, pw, ph); g.clip();
    g.fillStyle = '#121014'; g.fillRect(px, py, pw, ph);
    if (lvl > 0) {
      g.globalAlpha = lvl; g.fillStyle = RICH; g.fillRect(px, py, pw, ph);
      const br = g.createRadialGradient(349, -280, 10, 349, -260, 380); br.addColorStop(0, 'rgba(63,53,147,.25)'); br.addColorStop(1, 'rgba(63,53,147,0)'); g.fillStyle = br; g.fillRect(px, py, pw, ph);
      const i1 = textImg(C1, o1, MUSLIN), is = textImg(SUB_C, os, MIST);
      g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = .4 * lvl;
      g.drawImage(haloImg(i1, 9, 'c1'), 349 - i1.width / 2 - 18, -450 - i1._by - 18);
      const ia = textImg(C2A + C2B + C2C, o2, PAPER); g.save(); g.translate(349, -300); g.scale(fit, fit); g.drawImage(haloImg(ia, 12, 'c2'), -ia.width / 2 - 24, -ia._by - 24); g.restore();
      g.globalAlpha = .28 * lvl; g.drawImage(haloImg(is, 8, 'cs'), 349 - is.width / 2 - 16, -185 - is._by - 16);
      g.globalAlpha = .55 * lvl; g.save(); g.translate(x0 + (wA + w4 / 2) * fit, -300 - 38 * fit); g.scale(fit * pulse, fit * pulse); g.drawImage(haloImg(i4, 22, 'c4'), -i4.width / 2 - 44, 38 - i4._by - 44); g.restore();   // red bloom behind the '4'
      g.restore();
      g.drawImage(i1, 349 - i1.width / 2, -450 - i1._by);
      g.save(); g.translate(x0, -300); g.scale(fit, fit);
      L.text(g, C2A, 0, 0, Object.assign({}, o2, { align: 'left', color: PAPER, maxWidth: wA + 2 }));
      L.text(g, C2C, wA + w4, 0, Object.assign({}, o2, { align: 'left', color: PAPER, maxWidth: wD + 2 }));
      g.restore();
      g.drawImage(is, 349 - is.width / 2, -185 - is._by);
      g.globalAlpha = 1;
    }
    g.restore();
    g.drawImage(ledMask(Math.round(pw), Math.round(ph)), px, py);
    if (lvl > 0) {   // the MM Red '4' sits out of the heavy mask (8 % grid only) so it renders at true #D2232E
      const cx = x0 + (wA + w4 / 2) * fit, lx = Math.round(cx - i4.width / 2), ly = Math.round(-300 - i4._by), mi = maskedImg(i4, 'c4', px + 3 - lx, py + 3 - ly, .08);
      g.save(); g.beginPath(); g.rect(px, py, pw, ph); g.clip(); g.globalAlpha = lvl;
      g.translate(cx, -300 - 38 * fit); g.scale(fit * pulse, fit * pulse); g.drawImage(mi, lx - cx, ly + 300 + 38 * fit); g.restore();
    }
  }
  function drawBoxes(g, T, st) {
    const rackY = 1440 + st.dy - 309 * VS;   // rack top in bar-C coordinates
    for (let k = 0; k < 4; k++) {
      const slot = BOX_SLOTS[k === 3 ? 1 : k], hx = BOX_HOP[k];
      let x = st.x + slot, y = rackY + st.pitch * (slot - 198), rot = 0, sx = 1, sy = 1, onRack = true;
      if (k === 3) {   // the mystery 4th box: LAST YEAR'S, popped onto the empty rack in a cloud of loft dust at 11.300;
        // it sits there, wobbling sheepishly, for 0.4 s, then hops off after the others at 11.700
        if (T < BOX4) continue;
        const u = T - BOX4; if (u < .067) { const s = keys(u, [[0, 0], [.033, 1.15], [.067, 1]]); sx = sy = s; }
        else if (T < hx - .067) { const w = u - .067; rot = .055 * Math.sin(w * 30) * Math.exp(-1.5 * w); y -= Math.abs(Math.sin(w * 15)) * 2.5 * Math.exp(-3 * w); }
        if (u < .5) {
          const v = u / .5, e = E.outCubic(v);
          for (let j = 0; j < 7; j++) { const a = rnd(931, j) * TAU, r = (30 + 60 * rnd(932, j)) * (.4 + .8 * e), s = (60 + 50 * rnd(933, j)) * (.5 + .8 * e);
            g.save(); g.globalAlpha = .75 * (1 - v) * (1 - v); g.translate(x + Math.cos(a) * r * 1.3, y - 30 + Math.sin(a) * r * .55 - 30 * v); g.rotate(a); g.drawImage(puffSprite(j % 3), -s, -s * .8, s * 2, s * 1.6); g.restore(); }
        }
      } else if (T < BOX_LAND[k]) {   // in flight: tossed in from the left
        const a = boxArc(k, T); if (!a) continue;
        x = a.x; y = a.y; rot = a.rot; onRack = false;
      } else {
        const u = T - BOX_LAND[k];
        if (u < 1 / 30) { sy = .85; sx = 1.1; }                                        // one-frame squash on the tok
        else if (u < 1 / 30 + .12) { const b = (u - 1 / 30) / .12; y -= 6 * 4 * b * (1 - b); }   // 6 px bounce
        if (u < .3) {   // soan papdi is flaky: a few golden crumbs burst off on the hit
          for (let j = 0; j < 7; j++) { const q = k * 7 + j, vx = (rnd(941, q) - .5) * 360, vy = -120 - 220 * rnd(942, q), fx = x + (rnd(943, q) - .5) * 100 + vx * u, fy = y - 4 + vy * u + 1800 * u * u;
            if (fy > rackY + 4) continue; g.fillStyle = L.rgba(j % 2 ? '#F5C76A' : '#E9B655', 1 - u / .3); g.fillRect(fx - 1.5, fy - 1.5, 3, 3); }
        }
      }
      if (T >= hx - .067 && T < hx) { sy = .86; sx = 1.07; rot = 0; }
      if (T >= hx) {   // hop off to the right on a parabola (apex y ~640), tumbling
        const u = T - hx; if (u > .75) continue;
        const yb0 = y, xs = x, g0 = 3600, vy0 = Math.sqrt(2 * g0 * Math.max(40, yb0 - BH / 2 - 640));
        x = xs + (1150 - xs) / .6 * u; y = yb0 - vy0 * u + .5 * g0 * u * u; rot = 3.6 * u * u + 1.4 * u; onRack = false;
        if (u < .1) { sy = 1.12 - 1.2 * u; sx = 1 / sy; }
      }
      if (onRack) { g.fillStyle = 'rgba(0,0,0,.32)'; g.fillRect(x - BW / 2 * sx, y - 2, BW * sx, 4); }
      drawBox(g, x, y, rot, sx, sy, 1, k === 3);
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
    // swept-up festival litter: ~70 % banked against the kerb and along two wheel tracks, the rest thin in the open road
    const N = 170;
    for (let k = 0; k < N; k++) {
      const zone = rnd(950, k), x = -180 + rnd(951, k) * 1460;
      let y;
      if (zone < .5) y = 1444 + Math.pow(rnd(952, k), 2.2) * 46;                             // kerb bank
      else if (zone < .78) y = (rnd(958, k) < .5 ? 1568 : 1700) + (rnd(952, k) - .5) * 16;     // two wheel tracks
      else y = 1500 + rnd(952, k) * 360;                                                       // open road (sparse)
      const kind = rnd(953, k), sz = 4 + rnd(956, k) * 6;
      g.save(); g.translate(x, y); g.rotate(rnd(954, k) * TAU); g.scale(1, .55 + .45 * (y - 1440) / 480);
      if (kind < .58) { g.fillStyle = rnd(955, k) > .5 ? 'rgba(217,114,30,.85)' : 'rgba(242,178,62,.85)'; g.beginPath(); g.ellipse(0, 0, sz, sz * .55, 0, 0, TAU); g.fill(); g.fillStyle = 'rgba(90,40,10,.35)'; g.fillRect(-sz * .6, -.5, sz * 1.2, 1); }
      else if (kind < .86) { g.fillStyle = ['rgba(238,236,232,.55)', 'rgba(228,225,220,.5)', 'rgba(140,135,131,.6)'][k % 3]; L.poly(g, [[-sz, -sz * .5], [sz * .8, -sz * .8], [sz, sz * .5], [-sz * .6, sz * .8]]); g.fill(); }
      else { g.fillStyle = 'rgba(8,6,8,.45)'; g.beginPath(); g.arc(0, 0, 6 + sz, 0, TAU); g.fill(); g.strokeStyle = 'rgba(140,135,131,.25)'; g.lineWidth = 1.5; g.stroke(); }
      g.restore();
    }
  });
  function drawC(g, T, c, vx, vy) {
    g.drawImage(cBldg(), -200, 160); g.drawImage(cRoad(), -200, 1440);
    drawCDecor(g, T, vx, vy);
    const st = vanState(T);
    if (T >= WBC - .02) { drawExhaust(g, T, st); drawVan(g, T, st, c); drawBoxes(g, T, st); }
    const fa = prog(T, BOX4, BOX4 + .2, E.outQuad);   // explains box #4 the moment it appears: 34 px, holds 0.83 s
    if (fa > 0) {
      const oh = { font: 'dev', size: 34, weight: 500 }, oe = { font: 'lat', size: 34, weight: 500 }, wh = L.measure(g, FINE_C_HI, oh), we = L.measure(g, FINE_C_EN, oe), x0 = 540 - (wh + we) / 2;
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
  // marigold strands per wire span [u along the span, flowers]: A hold 3 strands top-left, B hold none, C hold 2 long ones
  const NEAR_STRANDS = { 0: [[.52, 5], [.55, 7], [.6, 4]], 1: [[.366, 6], [.39, 4], [.414, 7]], 2: [[.3, 5], [.34, 6]], 4: [[.38, 4], [.42, 6], [.45, 5], [.5, 7]], 5: [[.508, 9], [.528, 6]] };
  /** private marigold sprite, cached by its EXACT radius and seed. (L.marigold caches by round(r) and seed % 6 but draws
      with the first caller's exact r and seed, so its sprite depends on render order; this keeps S3 frame-order free.) */
  function marigold(g, x, y, r, tone, seed) {
    const sz = Math.ceil(r * 2.4);
    const c = L.cached(`s3mg-${tone}-${r.toFixed(3)}-${seed}`, sz, sz, m => {
      m.translate(sz / 2, sz / 2);
      const base = tone === 'yellow' ? ['#C98A00', '#F2B21B', '#FFD447'] : ['#B9420A', '#F07A12', '#FFA23A'];
      for (let ring = 0; ring < 5; ring++) {
        const rr = r * (1 - ring * .17), n = 14 + ring * 2;
        for (let i = 0; i < n; i++) {
          const a = i / n * TAU + ring * .4 + rnd(seed, ring * 50 + i) * .25, pr = rr * .32, px = Math.cos(a) * (rr - pr * .9), py = Math.sin(a) * (rr - pr * .9);
          const gg = m.createRadialGradient(px, py, 0, px, py, pr * 1.2); gg.addColorStop(0, base[2]); gg.addColorStop(.7, base[1]); gg.addColorStop(1, base[0]);
          m.fillStyle = gg; m.beginPath(); m.ellipse(px, py, pr * 1.05, pr * .7, a, 0, TAU); m.fill();
          m.strokeStyle = 'rgba(90,30,0,.25)'; m.lineWidth = .8; m.stroke();
        }
      }
      const cg = m.createRadialGradient(0, 0, 0, 0, 0, r * .25); cg.addColorStop(0, base[0]); cg.addColorStop(1, base[1]);
      m.fillStyle = cg; m.beginPath(); m.arc(0, 0, r * .22, 0, TAU); m.fill();
    });
    g.drawImage(c, x - sz / 2, y - sz / 2);
  }
  /** run fn with L.marigold routed to the private sprite above, for the duration of the call (L.toran draws its flowers
      through L.marigold); restored synchronously, so nothing outside S3 sees it */
  function ownMarigolds(fn) {
    const lib = L.marigold;
    L.marigold = (ctx, x, y, r, { tone = 'orange', seed = 1, rot = 0, alpha = 1 } = {}) => { ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(x, y); if (rot) ctx.rotate(rot); marigold(ctx, 0, 0, r, tone, seed); ctx.restore(); };
    try { fn(); } finally { L.marigold = lib; }
  }
  /** marigold that smears into a streak at whip speed (opaque: alpha conserves coverage) */
  function mgold(g, x, y, r, tone, seed, vx, vy) {
    const lx = vx * DT, ly = vy * DT, len = Math.hypot(lx, ly);
    if (len < r * .8) { marigold(g, x, y, r, tone, seed); return; }
    g.save(); g.globalAlpha *= Math.min(1, 2.2 * r / (2 * r + len)); g.strokeStyle = tone === 'orange' ? '#E2741C' : '#EDB33A'; g.lineWidth = r * 1.9; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x - lx / 2, y - ly / 2); g.lineTo(x + lx / 2, y + ly / 2); g.stroke(); g.restore();
  }
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
      for (const [k, [u, len]] of (NEAR_STRANDS[i] || []).entries()) {   // passing street dressing: different on every span
        const [x, y] = wirePt(p0.x - 72, 96, p1.x - 72, 98, span * .055, u); if (x < a - 40 || x > b + 40) continue;
        for (let j = 1; j <= len; j++) { const sw = Math.sin(T * 1.7 + k + i + j * .4) * j * 1.2; mgold(g, x + sw, y + j * 19, 11 - j * .3, (j + k) % 2 ? 'orange' : 'yellow', i * 50 + k * 7 + j, vx, vy); }
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
    if (!FAST) L.haze(g, T - c.x / (3 * 10), { y0: 400 - c.y / 3, y1: 1250 - c.y / 3, color: '#8C7FA8', alpha: .07, speed: 10, seed: 12 });
    const zz = (z) => 1 + (c.zoom - 1) / z;
    depth(g, c, 1.7, g2 => drawMid(g2, T, c, -vel.x / 1.7 * zz(1.7), -vel.y / 1.7 * zz(1.7)));
    if (!FAST) L.haze(g, T - c.x / (1.7 * 16), { y0: 700 - c.y / 1.7, y1: 1700 - c.y / 1.7, color: '#FF9F6B', alpha: .05, speed: 16, seed: 14 });
    const v1x = -vel.x * zz(1), v1y = -vel.y * zz(1);
    depth(g, c, 1, g2 => {
      drawStreet(g2, c);
      const [va, vb] = visX(c, 1);
      if (va < 1240 && vb > -320) drawA(g2, T, v1x);
      if (va < 2650 && vb > 1250) { g2.save(); g2.translate(WHIP, 0); drawB(g2, T, v1x); g2.restore(); }
      if (va < 4600 && vb > 2600) { g2.save(); g2.translate(2 * WHIP, DIP); drawC(g2, T, c, v1x, v1y); g2.restore(); }
    });
    { const fg = g.createLinearGradient(0, 1560, 0, 1940); fg.addColorStop(0, 'rgba(16,12,22,0)'); fg.addColorStop(1, 'rgba(16,12,22,.45)'); g.fillStyle = fg; g.fillRect(-60, 1560, W + 120, 420); }
    if (c.e3 < .98) { g.save(); g.globalAlpha = 1 - c.e3; depth(g, c, NZ, g2 => drawNear(g2, T, c, -vel.x / NZ * zz(NZ), -vel.y / NZ * zz(NZ)));
      g.restore(); }
    g.restore();
    if (T < TA) {   // whip-in seam from s2: a dark gap between buildings sweeps the cut
      const sx = (SEAM - W / 2 - c.x) * c.zoom + W / 2;
      if (sx > -260 && sx < W + 260) { const gr = g.createLinearGradient(sx - 240, 0, sx + 240, 0); gr.addColorStop(0, 'rgba(14,12,18,0)'); gr.addColorStop(.42, 'rgba(14,12,18,.96)'); gr.addColorStop(.58, 'rgba(14,12,18,.96)'); gr.addColorStop(1, 'rgba(14,12,18,0)'); g.fillStyle = gr; g.fillRect(sx - 240, -20, 480, H + 40); }
    }
  }

  function objSpeed(T) {
    if (T >= 9.4 && T <= 9.76) return 3000;
    if (T >= 9.66 && T <= 10.3) return 1600;
    if (T >= 10.85 && T <= 11.95) return 2200;
    if (T >= 7.9 && T <= 9.45) for (const k of kajuTable()) if (T > k.te && T < k.tl + .15) return 1400;
    return 0;
  }
  let ACC = null, TMP = null;
  function buffers() {
    const s = L.baseScale, w = Math.round(W * s), h = Math.round(H * s);
    if (!ACC || ACC.width !== w || ACC.height !== h) { ACC = document.createElement('canvas'); ACC.width = w; ACC.height = h; TMP = document.createElement('canvas'); TMP.width = w; TMP.height = h; }
    return [ACC, TMP];
  }
  // hand-off for s4: the exact camera of this ride (world units of this file; zoom .5 at 12.400)
  MM.s3Cam = T => { const c = camAt(T); return { x: c.x, y: c.y, zoom: c.zoom }; };
  MM.s3EndCam = (() => { const c = camAt(TE); return { T: TE, x: c.x, y: c.y, zoom: c.zoom }; })();   // {x: 1420, y: -980, zoom: .5}
  MM.scene('s3-gag-ride', {
    draw(ctx, t, info) {
      const T = info.T, h = 1 / 600, c0 = camAt(T - h), c1 = camAt(T + h);
      const vel = { x: (c1.x - c0.x) / (2 * h), y: (c1.y - c0.y) / (2 * h) };
      const vz = Math.abs(c1.zoom - c0.zoom) / (2 * h), van = (T > WBC && T < TC) ? 9000 : 0;
      const span = 1 / 240;   // spacing of the engine's motion-blur sub-frames (4 samples, 180° shutter)
      const speed = Math.max(Math.hypot(vel.x, vel.y) / NZ, vz * 1800, van);
      const kObj = Math.min(3, Math.ceil(objSpeed(T) * span / 4));   // fast props during holds: jhadu, kaju rain, crumble, boxes
      const k = Math.max(kObj, Math.min(3, Math.max(1, Math.ceil(speed * span / 16))));   // x4 engine sub-frames = 12 samples max
      FAST = k >= 4;
      if (k <= 1) { DT = span; frame(ctx, T, vel); return; }
      const [acc, tmp] = buffers(), a = acc.getContext('2d'), m = tmp.getContext('2d');
      a.setTransform(1, 0, 0, 1, 0, 0); a.clearRect(0, 0, acc.width, acc.height); a.globalCompositeOperation = 'lighter'; a.globalAlpha = 1 / k;
      DT = span / k;
      for (let i = 0; i < k; i++) {
        const ti = T + ((i + rnd(977, Math.round(T * 9600) * 7 + i)) / k - .5) * span;   // stratified + jittered per sub-frame
        m.setTransform(L.baseScale, 0, 0, L.baseScale, 0, 0); m.globalAlpha = 1; m.globalCompositeOperation = 'source-over'; m.clearRect(0, 0, W, H);
        frame(m, ti, vel); a.drawImage(tmp, 0, 0);
      }
      ctx.save(); L.resetTransform(ctx); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(acc, 0, 0, W, H); ctx.restore();
    }
  });
})();
