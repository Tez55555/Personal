/* ==========================================================================
   s4 · Lights off, diya on   (global 12.133 – 16.000)
   The turn from laughter to warmth. We arrive (whip-up from s3) on a wide Lucknow night seen from a
   balcony whose railing is the Legacy Line. Every ad dies on the 12.400 relay thunk. In the dark an MM Red
   matchstick wakes, strikes on the rail, lights one clay diya on the single red pillar; a gold ember climbs
   the red middle tower, the tower lights, and the light ripples home to home in six 8th-note rings
   (windows, ledge diyas, jhalar, kandils, the railing diyas in pairs). One late-latif window pops last.

   This file also owns the SHARED WORLD (window.MMS45) that s5 keeps drawing after 16.000, so the lit city,
   railing and camera are one continuous object across s4 -> s5 -> (s6 dolly hand-over at 17.7).

   Space: "base frame" = the storyboard layout at push-in 1.00 (towers x 410–451 / 519–561 / 629–670, roofs y 710).
   The three towers are drawn in s6's own world coordinates (x 280..800, roof 560) mapped by
   base = (540 + (x-540)/2, 710 + (y-560)/2), so at 17.700 they sit exactly where s6 picks them up.
   Layers (depth factor f for parallax): sky .22 · far .5 · back row .85 · towers/front row 1 · near street 1.2 ·
   railing 1.7 · floor 2.1 · foreground toran 2.6.
   Camera: arrival = s3's whip caught at full speed (dissolve 12.167–12.233 at peak blur), outQuart settle by 12.333
   (lit boards hold 12.333–12.400 with a tubelight stutter at 12.367 before the frame-quantised 12.400 cut);
   a true dolly toward the railing for the strike (rail 2.0x, city 1.08x about (540,1400), so the roofs stay at y >= 650
   whenever copy is on screen), released 13.02–13.66; push-in 1.00 -> 1.04 from 13.3; s6's dolly replicated from 17.7
   (same inOutCubic curve as s6, so the towers dissolve onto themselves; the near field takes the full dolly, slides
   down, racks out of focus and fades 17.700–17.933).
   ========================================================================== */
(function () {
  'use strict';
  const L = window.L, P = L.PAL, E = L.ease, W = L.W, H = L.H;
  const clamp = L.clamp, lerp = L.lerp, rnd = L.rnd, prog = L.prog, sm = L.smoothstep, q = L.q;
  const TAU = Math.PI * 2, DEG = Math.PI / 180;
  const NS = window.MMS45 = {};
  /** the relay cut is frame-quantised: every motion-blur sub-sample of the 12.400 frame is already dark */
  const killed = T => Math.round(T * 30) >= Math.round(L.beat(20) * 30);

  /* ---------------- timing (global seconds, frame aligned) ---------------- */
  const T_IN = q(12.1667), T_ARR = q(12.2333), T_ARR_SS = 12.285, T_SETTLE = q(12.3333), T_DIE = L.beat(20), T_WAKE = q(12.5667), T_STRIKE = q(12.7), T_LIT = L.beat(21),
    T_TOWER = q(13.3), T_STR = L.beat(23), T_HOP = L.beat(24), T_HOPEND = q(15.0667), T_LATE = q(15.1),
    T_COPY_OUT = q(15.5), T_X = 17.7, T_NEAR_OUT = q(17.9333);                       // T_X: s6 dolly starts; the near field leaves, the city dims + defocuses
  const RING_T = [q(13.6), q(13.9), q(14.2), q(14.5), q(14.8)];   // window rings 1..5 (the red tower is ring 0 at 13.300)
  const RING_R = [205, 330, 455, 580];                           // band edges (px from the red tower centre (540,900))
  NS.T = { T_DIE, T_LIT, T_TOWER, T_STR, T_LATE };

  /* ---------------- palette ---------------- */
  const INK = P.ink, RICH = P.rich, STONE = P.stone, MIST = P.mist, MUSLIN = P.muslin, PAPER = P.paper, RED = P.red;
  const AMBER = '#FFB547', WARMW = '#FFE7A3', BULB = '#FFF4CF', GOLD = '#FFC24A', ORANGE = '#FF9F1C', TUBE = '#F4F6FF';

  /* ---------------- small helpers ---------------- */
  const rgba = L.rgba, mix = L.mix;
  const inOutSine = s => .5 - .5 * Math.cos(Math.PI * clamp(s));
  /** hex colour lerp that returns hex (L.mix returns rgba()) */
  const hmix = (a, b, t) => { const A = L.rgb(a), B = L.rgb(b); return '#' + [0, 1, 2].map(i => Math.round(lerp(A[i], B[i], clamp(t))).toString(16).padStart(2, '0')).join(''); };
  const zoomAbout = (g, cx, cy, z) => { if (z === 1) return; g.translate(cx, cy); g.scale(z, z); g.translate(-cx, -cy); };
  const spr = col => L.cached('s45g-' + col, 64, 64, g => {
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, rgba(col, 1)); r.addColorStop(.22, rgba(col, .46)); r.addColorStop(.55, rgba(col, .12)); r.addColorStop(1, rgba(col, 0));
    g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  });
  /** additive soft glow sprite (caller sets 'lighter') */
  function glow(g, x, y, r, col, a) { if (a <= .003 || r <= 0) return; const o = g.globalAlpha; g.globalAlpha = o * Math.min(1, a); g.drawImage(spr(col), x - r, y - r, r * 2, r * 2); g.globalAlpha = o; }
  /** out-of-focus bokeh disc (flat with a faint brighter rim, like a real lens) */
  const bokehSpr = col => L.cached('s45b-' + col, 96, 96, g => {
    const r = g.createRadialGradient(48, 48, 0, 48, 48, 46);
    r.addColorStop(0, rgba(col, .3)); r.addColorStop(.7, rgba(col, .36)); r.addColorStop(.9, rgba(col, .46)); r.addColorStop(1, rgba(col, 0));
    g.fillStyle = r; g.beginPath(); g.arc(48, 48, 46, 0, TAU); g.fill();
  });
  function offscreen(key) {
    const s = L.baseScale, w = Math.round(W * s), h = Math.round(H * s);
    let c = NS['_off_' + key];
    if (!c || c.width !== w || c.height !== h) { c = document.createElement('canvas'); c.width = w; c.height = h; NS['_off_' + key] = c; }
    const g = c.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, w, h); g.setTransform(s, 0, 0, s, 0, 0);
    return [c, g];
  }
  NS.glow = glow; NS.spr = spr; NS.offscreen = offscreen;
  /** multiply a grain texture INTO the opaque pixels of a cache canvas only (keeps transparency clean) */
  function texturize(g, kind, alpha, scale, seed) {
    const c = g.canvas, w = c.width, h = c.height;
    const keep = document.createElement('canvas'); keep.width = w; keep.height = h; keep.getContext('2d').drawImage(c, 0, 0);
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    const tex = L.textureCanvas(kind, 512, seed), S = 512 * scale;
    g.globalAlpha = alpha; g.globalCompositeOperation = 'multiply';
    for (let y = 0; y < h; y += S) for (let x = 0; x < w; x += S) g.drawImage(tex, x, y, S, S);
    g.globalAlpha = 1; g.globalCompositeOperation = 'destination-in'; g.drawImage(keep, 0, 0);
    g.restore();
  }

  /* ======================= CAMERA ======================= */
  const F = { sky: .22, far: .5, back: .85, city: 1, near: 1.2, rail: 1.7, floor: 2.1, top: 2.6 };
  // lean-in (the strike): a true dolly toward the railing. Rail 2.0x, city only 1.08x (roofs stay at y >= 650, clear of the copy)
  const LEAN = 1.0, LEAN_EXP = Math.log(.08) / Math.log(1 / F.rail), LEAN_CY = 1400;
  const leanZ = (c, f) => 1 + c * Math.pow(Math.min(f, F.rail) / F.rail, LEAN_EXP);   // floor + toran lean with the rail (stay attached)
  /** camera at T. nearDamp (0..1): fraction of s6's dolly applied (1 everywhere now: the near field takes the full dolly) */
  function camAt(T, nearDamp = 1) {
    // arrival: the end of s3's whip-up (tilt up + pull back). We pick the move up at full speed (outQuart starts at its
    // maximum velocity, where s3's inCubic whip ends) and decelerate into the wide by 12.333: lit boards hold 12.333–12.400
    const a = T < T_SETTLE ? 1 - E.outQuart(prog(T, T_IN, T_SETTLE)) : 0;
    // in the dark the camera leans in toward the railing, then releases as the ember climbs
    let c = 0;
    if (T >= 12.45 && T < T_LIT + .02) c = LEAN * E.inOutQuad(prog(T, 12.45, 12.98));
    else if (T >= T_LIT) c = LEAN * (1 - E.inOutCubic(prog(T, 13.02, 13.66)));
    // slow push-in 1.00 -> 1.04 about (540,900) (held to s6's start framing at 17.700)
    let z = 1 + .04 * inOutSine(prog(T, T_TOWER, T_X)), cy = 900;
    // s6 hand-over: replicate its dolly so the towers dissolve onto themselves
    if (T > T_X) { const p = prog(T, T_X, 18.2, E.inOutCubic) * nearDamp, k = lerp(.52, 1, p), Y = lerp(702.4, 560, p); z = 2 * k; cy = (Y - 1420 * k) / (1 - z); }
    return { a, c, z, cy, sx: 0, sy: 0 };
  }
  function applyCam(g, cam, f) {
    if (cam.sx || cam.sy) g.translate(cam.sx * Math.min(1.3, .4 + .6 * f), cam.sy * Math.min(1.3, .4 + .6 * f));
    if (cam.a > 0) { const k = clamp(f, .3, 1.6); g.translate(0, -560 * cam.a * k); zoomAbout(g, 540, 1500, 1 + .8 * cam.a * k); }
    zoomAbout(g, 540, cam.cy, 1 + (cam.z - 1) * f);
    if (cam.c > 0) zoomAbout(g, 540, LEAN_CY, leanZ(cam.c, f));
  }
  /** screen position of a base-frame point on layer f */
  function camPt(cam, f, x, y) {
    if (cam.c > 0) { const z = leanZ(cam.c, f); x = 540 + (x - 540) * z; y = LEAN_CY + (y - LEAN_CY) * z; }
    { const z = 1 + (cam.z - 1) * f; x = 540 + (x - 540) * z; y = cam.cy + (y - cam.cy) * z; }
    if (cam.a > 0) { const k = clamp(f, .3, 1.6), z = 1 + .8 * cam.a * k; x = 540 + (x - 540) * z; y = 1500 + (y - 1500) * z - 560 * cam.a * k; }
    const sk = Math.min(1.3, .4 + .6 * f);
    return [x + cam.sx * sk, y + cam.sy * sk];
  }
  NS.camAt = camAt; NS.applyCam = applyCam; NS.camPt = camPt; NS.F = F;

  /* ======================= GLOBAL LIGHT STATE ======================= */
  function stateAt(T) {
    const pre = !killed(T);
    const warm = sm(T_TOWER, 15.0, T);                                  // how much of the city is home-lit
    const dark = pre ? .0 : lerp(.62, .14, sm(T_TOWER, 15.2, T));       // extra night on the bodies after the power cut
    const cool = pre ? .12 : .06;                                      // cold window glass (Mist)
    return { pre, warm, dark, cool };
  }

  /* ======================= CITY DATA (built once, deterministic) ======================= */
  // building defs: [x0, x1, top, features]
  const BACK = [
    [-40, 70, 902, { tank: 1 }], [70, 150, 866, { ant: 1, arch: 0 }], [150, 262, 928, { tank: 1, jh: 1 }],
    [262, 300, 1002, {}], [394, 680, 1004, { plain: 1 }], [680, 712, 990, {}],
    [748, 884, 878, { led: 1, tank: 1 }], [884, 992, 926, { jh: 1, dish: 1 }], [992, 1120, 888, { ant: 1, tank: 1 }],
  ];
  const FRONT = [
    [-40, 98, 1060, { jh: 1, diyas: 1 }], [92, 312, 1102, { tri: 1, arch: 1 }], [306, 436, 1044, { jh: 1, arch: 1, diyas: 1 }],
    [428, 556, 1112, { arch: 1 }], [550, 694, 1136, { jh: 1, diyas: 1 }], [688, 798, 1072, { tank: 1, arch: 1 }],
    [792, 944, 1016, { wstar: 1, arch: 1 }], [938, 1120, 1150, { jh: 1, diyas: 1 }],
  ];
  const NEAR = [
    [-40, 176, 1296, { house: 1, jh: 1 }], [176, 452, 1352, { shops: 1 }], [452, 646, 1318, { house: 1, tank: 1 }],
    [646, 902, 1306, { house: 1, jh: 1 }], [902, 1120, 1300, { house: 1, hoarding: 1 }],
  ];
  const ROWS = { back: { defs: BACK, col: '#221D29', win: [6, 8], pitch: [14, 19], m: 9, exist: .62, seed: 401, f: F.back },
    front: { defs: FRONT, col: '#1C181C', win: [7, 10], pitch: [17, 24], m: 10, exist: .7, seed: 402, f: F.city },
    near: { defs: NEAR, col: '#151215', win: [9, 12], pitch: [22, 28], m: 12, exist: .55, seed: 403, f: F.near } };
  const WSTAR = { x: 820, y: 1040, w: 60, h: 50 };               // the late-latif balcony window
  const RAIL_TOP = 1430;

  function ringOf(d) { let k = 0; while (k < RING_R.length && d >= RING_R[k]) k++; return k; }
  function ringTime(d, seed, id) {
    const k = ringOf(d), r0 = k ? RING_R[k - 1] : 120, r1 = RING_R[k] || 760;
    const within = .11 * clamp((d - r0) / (r1 - r0));
    const j = rnd(seed, id), lag = j < .78 ? Math.floor(j / .78 * 3) / 30 : .1 + (j - .78) * 1.1;
    return q(RING_T[k] + within + lag);
  }
  const CITY = (function build() {
    const out = {};
    for (const key of ['back', 'front', 'near']) {
      const R = ROWS[key]; const B = [];
      R.defs.forEach((d, bi) => {
        const [x0, x1, top, fx] = d; const b = { x0, x1, top, fx, i: bi, wins: [], jh: [], ledges: [] };
        const w = x1 - x0, [ww, wh] = R.win, [px, py] = R.pitch;
        const arch = fx.arch ?? (key === 'near' ? 0 : rnd(R.seed + 7, bi) < .4 ? 1 : 0);
        b.arch = arch;
        if (!fx.plain) {
          const cols = Math.max(1, Math.floor((w - 2 * R.m) / px)), gx = (w - cols * px) / 2;
          const firstY = top + R.m + (key === 'near' ? 8 : 4);
          for (let r = 0; ; r++) {
            const y = Math.round(firstY + r * py); if (y > 1424) break;
            for (let c = 0; c < cols; c++) {
              const id = bi * 1000 + r * 40 + c;
              if (rnd(R.seed, id) > R.exist) continue;
              const x = Math.round(x0 + gx + c * px + (px - ww) / 2);
              if (fx.wstar && x + ww > WSTAR.x - 10 && x < WSTAR.x + WSTAR.w + 10 && y + wh > WSTAR.y - 12 && y < WSTAR.y + WSTAR.h + 16) continue;
              if (fx.led && y < 1000 && x > 712 && x < 870) continue;
              const cx = x + ww / 2, cy = y + wh / 2, dd = Math.hypot(cx - 540, cy - 900);
              const k = rnd(R.seed + 2, id);
              const win = { x, y, w: ww, h: wh, arch, d: dd, id,
                tOn: ringTime(dd, R.seed + 3, id), never: rnd(R.seed + 4, id) < .1,
                col: k < .42 ? WARMW : k < .86 ? AMBER : '#FF9A3C', curtain: rnd(R.seed + 5, id) < .3,
                diyaLit: k >= .42, preCool: rnd(R.seed + 6, id) < .16, kandil: false };
              b.wins.push(win);
            }
          }
          // a ledge of tiny diyas under one window row (rows of earthen lamps along balconies)
          if (fx.diyas) {
            const r0 = 1 + Math.floor(rnd(R.seed + 9, bi) * 2), ly = Math.round(firstY + r0 * py + wh + 3);
            if (ly < 1420) { const n = Math.floor((w - 16) / 9); const dd = Math.hypot((x0 + x1) / 2 - 540, ly - 900);
              b.ledges.push({ y: ly, x0: x0 + 8, n, t: ringTime(dd, R.seed + 11, bi) }); }
          }
        }
        // jhalar: parapet string + vertical cascades
        if (fx.jh) {
          const dd = Math.hypot((x0 + x1) / 2 - 540, top + 40 - 900);
          const t0 = ringTime(dd, R.seed + 13, bi), dir = (x0 + x1) / 2 < 540 ? -1 : 1;
          const n = Math.floor((w - 8) / 7);
          for (let i = 0; i < n; i++) { const u = (i + .5) / n; const bx = x0 + 4 + u * (w - 8); const by = top + 4 + Math.sin(u * Math.PI * 3) * 1.5;
            const order = dir < 0 ? 1 - u : u; b.jh.push({ x: bx, y: by, t: t0 + order * .22, c: i % 4, s: 1.7 }); }
          const nc = Math.min(5, Math.floor(w / 34));
          for (let v = 0; v < nc; v++) { const vx = x0 + 12 + v * (w - 24) / Math.max(1, nc - 1); const len = 50 + rnd(R.seed + 15, bi * 9 + v) * 90;
            for (let j = 0; j < len / 8; j++) b.jh.push({ x: vx, y: top + 10 + j * 8, t: t0 + .06 + j * .018, c: (j + v) % 2 ? 1 : 0, s: 1.4, casc: 1 }); }
        }
        B.push(b);
      });
      out[key] = B;
    }
    // akash kandils in ~12 front-row windows
    let kc = 0;
    for (const b of out.front) for (const w of b.wins) { if (kc >= 12) break; if (w.y < 1300 && rnd(77, w.id + b.i * 13) < .07 && !w.never) { w.kandil = true; kc++; } }
    for (const b of out.back) for (const w of b.wins) { if (kc >= 14) break; if (w.y < 1050 && rnd(78, w.id + b.i * 13) < .05 && !w.never) { w.kandil = true; kc++; } }
    return out;
  })();
  NS.CITY = CITY;

  /* ======================= SKY + FAR ======================= */
  function drawSky(g, T, cam, S) {
    g.save(); applyCam(g, cam, F.sky);
    // the low sky is lit by the city itself: cool commercial glow -> blackout -> warm home glow
    const cityGlow = S.pre ? 1 : .25 + .75 * S.warm;
    const hz = S.pre ? '#3A2D47' : hmix('#1F1929', '#3D2B3A', S.warm);
    const gr = g.createLinearGradient(0, -100, 0, 1040);
    gr.addColorStop(0, '#1C1830'); gr.addColorStop(.42, '#25203F'); gr.addColorStop(.78, hmix('#221C30', '#2E2640', cityGlow)); gr.addColorStop(1, hz);
    g.fillStyle = gr; g.fillRect(-400, -900, W + 800, 1940);
    g.fillStyle = hz; g.fillRect(-400, 1039, W + 800, 1800);
    L.stars(g, T, { seed: 45, count: 130, x: -120, y: -260, w: W + 240, h: 1000, alpha: .5 });
    const dark = S.pre ? 0 : 1 - S.warm;       // with the city off, the stars come out (no moon on Diwali night)
    if (dark > 0) { L.stars(g, T, { seed: 46, count: 150, x: -120, y: -260, w: W + 240, h: 1150, alpha: .55 * dark });
      g.globalCompositeOperation = 'lighter'; for (let i = 0; i < 14; i++) { const x = -60 + rnd(47, i) * 1200, y = -150 + rnd(48, i) * 1000, tw = .6 + .4 * L.noise1(T * 2 + i, 47); glow(g, x, y, 7, '#DDE4FF', .5 * dark * tw); }
      g.globalCompositeOperation = 'source-over'; }
    L.haze(g, T, { y0: 60, y1: 900, color: '#3F3593', alpha: .04 + .04 * cityGlow, speed: 5, seed: 17, scale: 2.4 });
    if (S.warm > 0) { // the lit city lifts a warm dome of light into the low sky
      g.globalCompositeOperation = 'lighter';
      glow(g, 540, 1080, 1050, '#FF8A3A', .12 * S.warm); glow(g, 160, 1060, 640, AMBER, .07 * S.warm); glow(g, 930, 1050, 640, AMBER, .07 * S.warm);
      g.globalCompositeOperation = 'source-over';
    }
    g.restore();
  }
  function onion(g, cx, y, r) {
    g.beginPath(); g.moveTo(cx - r * .8, y);
    g.bezierCurveTo(cx - r * 1.3, y - r * .75, cx - r * .4, y - r * 1.25, cx, y - r * 1.75);
    g.bezierCurveTo(cx + r * .4, y - r * 1.25, cx + r * 1.3, y - r * .75, cx + r * .8, y);
    g.closePath(); g.fill(); g.fillRect(cx - 1, y - r * 2.25, 2, r * .6);
  }
  const farCanvas = () => L.cached('s45-far', 1480, 520, g => {
    g.translate(200, -620); g.fillStyle = '#251F2C';
    // low skyline noise along the base
    for (let i = 0; i < 46; i++) { const x = -200 + i * 33 + rnd(51, i) * 12, h = 26 + rnd(52, i) * 70; g.fillRect(x, 1000 - h, 26 + rnd(53, i) * 22, h); }
    // gateway (Rumi Darwaza-like, generic) centred x 340
    { const cx = 340, b = 1000, s = .56;
      g.fillRect(cx - 150 * s, b - 170 * s, 300 * s, 170 * s); g.fillRect(cx - 80 * s, b - 300 * s, 160 * s, 300 * s);
      g.beginPath(); g.moveTo(cx - 90 * s, b - 296 * s); g.quadraticCurveTo(cx - 82 * s, b - 360 * s, cx, b - 384 * s); g.quadraticCurveTo(cx + 82 * s, b - 360 * s, cx + 90 * s, b - 296 * s); g.closePath(); g.fill();
      for (let k = 0; k <= 10; k++) { const u = k / 10, px = lerp(cx - 86 * s, cx + 86 * s, u), py = b - 300 * s - Math.sin(u * Math.PI) * 80 * s; g.fillRect(px - 1.5, py - 10, 3, 11); g.beginPath(); g.arc(px, py - 11, 2.4, 0, TAU); g.fill(); }
      onion(g, cx, b - 384 * s - 6, 12); g.fillRect(cx - 14, b - 384 * s - 8, 28, 6);
      for (const mx of [cx - 150 * s, cx + 150 * s - 10]) { g.fillRect(mx, b - 236 * s, 10, 236 * s); onion(g, mx + 5, b - 236 * s, 7); }
      g.save(); g.globalCompositeOperation = 'destination-out';
      g.beginPath(); g.moveTo(cx - 34 * s, b); g.lineTo(cx - 34 * s, b - 150 * s); g.quadraticCurveTo(cx - 34 * s, b - 230 * s, cx, b - 262 * s); g.quadraticCurveTo(cx + 34 * s, b - 230 * s, cx + 34 * s, b - 150 * s); g.lineTo(cx + 34 * s, b); g.closePath(); g.fill(); g.restore(); }
    // domes + minarets (behind the towers, seen in their gaps)
    { const cx = 545, b = 1000; g.fillRect(cx - 110, b - 70, 220, 70); onion(g, cx, b - 70, 36); onion(g, cx - 72, b - 70, 18); onion(g, cx + 72, b - 70, 18);
      for (const mx of [cx - 118, cx + 108]) { g.fillRect(mx, b - 150, 10, 150); onion(g, mx + 5, b - 150, 8); } }
    // clock tower (Husainabad-like) x 724
    { const cx = 724, b = 1000; g.fillRect(cx - 15, b - 225, 30, 225); g.fillRect(cx - 22, b - 70, 44, 70); g.fillRect(cx - 19, b - 232, 38, 10);
      g.beginPath(); g.moveTo(cx - 19, b - 232); g.lineTo(cx, b - 272); g.lineTo(cx + 19, b - 232); g.fill(); g.fillRect(cx - 1, b - 290, 2, 20);
      g.save(); g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(cx, b - 202, 9, 0, TAU); g.fill(); g.restore(); }
    // a second smaller dome group far right
    { const cx = 1010, b = 1000; g.fillRect(cx - 60, b - 50, 120, 50); onion(g, cx, b - 50, 22); g.fillRect(cx + 54, b - 112, 8, 112); onion(g, cx + 58, b - 112, 6); }
  });
  const farMask = () => L.cached('s45-farm', 1480, 520, g => { g.drawImage(farCanvas(), 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#100D14'; g.fillRect(0, 0, 1480, 520); });
  // far city lights (switch on with the last ring)
  const FAR_LIGHTS = (() => { const a = []; for (let i = 0; i < 70; i++) { const x = -20 + rnd(61, i) * 1120, y = 940 + rnd(62, i) * 56; a.push({ x, y, t: q(14.8 + rnd(63, i) * .5), c: rnd(64, i) < .5 ? AMBER : WARMW }); } return a; })();
  function drawFar(g, T, cam, S) {
    g.save(); applyCam(g, cam, F.far);
    g.drawImage(farCanvas(), -200, 620);
    if (!S.pre) { g.globalAlpha = .55 * S.dark / .62; g.drawImage(farMask(), -200, 620); g.globalAlpha = 1; }
    g.globalCompositeOperation = 'lighter';
    for (const p of FAR_LIGHTS) { if (T < p.t) continue; const a = .55 * (.7 + .3 * L.noise1(T * 1.2 + p.x, 3)); g.fillStyle = rgba(p.c, a); g.fillRect(p.x, p.y, 2, 2); glow(g, p.x + 1, p.y + 1, 9, p.c, .12); }
    g.restore();
  }

  /* ======================= CITY ROWS ======================= */
  function rowArt(key) {
    const R = ROWS[key], B = CITY[key];
    return L.cached('s45-row-' + key, 1220, 960, g => {
      g.translate(70, -800);
      for (const b of B) {
        const w = b.x1 - b.x0;
        // body: flat Ink with a faint vertical falloff (no outlines)
        const gr = g.createLinearGradient(0, b.top, 0, 1440); gr.addColorStop(0, R.col); gr.addColorStop(1, mix(R.col, '#141114', .5)); g.fillStyle = gr;
        g.fillRect(b.x0, b.top, w, 1440 - b.top);
        // stone 2 px top-edge highlight + parapet rhythm
        g.fillStyle = rgba(STONE, key === 'back' ? .38 : .5); g.fillRect(b.x0, b.top, w, 2);
        if (b.fx.house) { g.fillStyle = R.col; for (let k = 2; k < w - 6; k += 12) g.fillRect(b.x0 + k, b.top - 7, 6, 7); g.fillStyle = rgba(STONE, .35); g.fillRect(b.x0, b.top - 9, w, 2); }
        // floor ledges (balcony slabs) every couple of rows
        if (key !== 'back') { g.fillStyle = 'rgba(0,0,0,.22)'; const py = R.pitch[1]; for (let y = b.top + R.m + R.win[1] + 7; y < 1430; y += py * 2) g.fillRect(b.x0 + 3, y, w - 6, 2); }
        // rooftop clutter: black water tanks, antennas, a dish
        g.fillStyle = mix(R.col, '#000000', .35);
        if (b.fx.tank) { const tx = b.x0 + w * (.22 + .4 * rnd(71, b.i)); g.fillRect(tx - 1, b.top - 4, 22, 4); g.beginPath(); g.ellipse(tx + 10, b.top - 14, 10, 4, 0, 0, TAU); g.fill(); g.fillRect(tx, b.top - 14, 20, 10);
          g.fillStyle = rgba(STONE, .3); g.fillRect(tx, b.top - 15, 20, 1.5); g.fillStyle = mix(R.col, '#000000', .35); }
        if (b.fx.ant) { const ax = b.x0 + w * .7; g.fillRect(ax, b.top - 58, 2, 58); g.fillRect(ax - 9, b.top - 50, 20, 2); g.fillRect(ax - 6, b.top - 38, 14, 2); }
        if (b.fx.dish) { const dx = b.x0 + w * .3; g.beginPath(); g.ellipse(dx, b.top - 9, 8, 5, -.5, 0, TAU); g.fill(); g.fillRect(dx - 1, b.top - 6, 2, 6); }
        if (b.fx.shops) { // low shop fronts: shutters and awnings
          for (let k = 0; k < 5; k++) { const sx = b.x0 + 10 + k * 54; g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(sx, 1378, 44, 50);
            g.fillStyle = 'rgba(140,135,131,.12)'; for (let l = 0; l < 9; l++) g.fillRect(sx, 1380 + l * 5.5, 44, 1); }
        }
      }
      if (key === 'near') { // the street below, seen through the railing
        const sg = g.createLinearGradient(0, 1426, 0, 1740); sg.addColorStop(0, '#120F12'); sg.addColorStop(1, '#0B090B'); g.fillStyle = sg; g.fillRect(-70, 1426, 1220, 314);
        g.fillStyle = 'rgba(140,135,131,.18)'; for (let k = 0; k < 14; k++) g.fillRect(-60 + k * 90, 1520, 46, 3);
      }
      texturize(g, 'paper', .16, .3, 4 + key.length);
    });
  }
  const rowMask = key => L.cached('s45-rowm-' + key, 1220, 960, g => { g.drawImage(rowArt(key), 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#0D0B10'; g.fillRect(0, 0, 1220, 960); });

  function winPath(g, w) {
    if (w.arch) { const r = w.w / 2; g.beginPath(); g.moveTo(w.x, w.y + w.h); g.lineTo(w.x, w.y + r); g.arc(w.x + r, w.y + r, r, Math.PI, 0); g.lineTo(w.x + w.w, w.y + w.h); g.closePath(); }
    else { g.beginPath(); g.rect(w.x, w.y, w.w, w.h); }
  }
  /** brightness state of one home window */
  function winLight(w, T, S, flare) {
    if (S.pre) return w.preCool ? { warm: 1, pop: 0, cool: 1 } : { warm: 0, pop: 0 };
    if (w.never || T < w.tOn) return { warm: 0, pop: 0 };
    const u = T - w.tOn; const pop = u < 1 / 30 ? 1 : Math.exp(-(u - 1 / 30) * 16) * .45;
    return { warm: 1, pop: clamp(pop + (flare || 0)) };
  }
  function drawWindows(g, B, T, S, key, opt) {
    const isNear = key === 'near';
    // cold glass first
    g.fillStyle = rgba(MIST, S.cool);
    for (const b of B) for (const w of b.wins) { const st = winLight(w, T, S); if (st.warm < 1) { winPath(g, w); g.fill(); } }
    // warm homes
    for (const b of B) for (const w of b.wins) {
      const fl = opt.flare ? opt.flare(w.x, w.y) : 0;
      const st = winLight(w, T, S, fl); if (st.warm <= 0) continue;
      const flick = st.cool ? .92 + .08 * L.noise1(T * 23 + w.id, 9) : w.diyaLit ? .86 + .14 * L.noise1(T * 3.1 + w.id * .37, 7) : .97;
      const col = st.cool ? '#DCE4F2' : w.col;
      const a = (st.cool ? .42 : .8) * flick * st.warm;
      g.fillStyle = st.pop > .02 ? mix(col, '#FFFFFF', .7 * st.pop, Math.min(1, a + st.pop)) : rgba(col, a);
      winPath(g, w); g.fill();
      if (w.curtain && !st.cool) { g.fillStyle = 'rgba(70,30,14,.55)'; g.fillRect(w.x + w.w * .52, w.y + (w.arch ? w.w / 2 : 0), w.w * .48, w.h - (w.arch ? w.w / 2 : 0)); }
      else if (!isNear) { g.fillStyle = 'rgba(40,20,12,.35)'; g.fillRect(w.x + w.w / 2 - .5, w.y + 2, 1, w.h - 2); }   // mullion
    }
    // spill light on the facades (additive)
    g.globalCompositeOperation = 'lighter';
    for (const b of B) for (const w of b.wins) {
      const st = winLight(w, T, S, opt.flare ? opt.flare(w.x, w.y) : 0); if (st.warm <= 0) continue;
      glow(g, w.x + w.w / 2, w.y + w.h / 2, (isNear ? 26 : 17) * (1 + st.pop), st.cool ? '#C8D4F0' : w.col, (st.cool ? .05 : .11) + .45 * st.pop);
    }
    g.globalCompositeOperation = 'source-over';
    // kandils in windows
    for (const b of B) for (const w of b.wins) {
      if (!w.kandil || S.pre || T < w.tOn) continue;
      const u = T - w.tOn, sw = 6 * Math.exp(-u * 2.5) * Math.sin(u * 7) + 1.5 * Math.sin(T * 1.3 + w.id);
      const s = clamp(u / .12) * (key === 'back' ? 3.6 : 4.6);
      g.save(); g.translate(w.x + w.w / 2, w.y + 1); g.rotate(sw * DEG);
      L.lantern(g, 0, 0, s, T, w.id, { color: RED, light: GOLD, lit: 1 }); g.restore();
    }
  }
  function drawJhalar(g, B, T, S) {
    const cols = [GOLD, WARMW, ORANGE, '#FF5C8A'];
    g.globalCompositeOperation = 'lighter';
    for (const b of B) for (const j of b.jh) {
      let on = 0;
      if (S.pre) on = b.fx.preJh ? 1 : 0; else if (T >= j.t) on = 1;
      if (!on) continue;
      const k = j.casc ? .45 + .55 * (.5 + .5 * Math.sin(T * 5 - j.y * .09)) : ((Math.floor(T * 7) + Math.round(j.x / 7)) % 3 === 0 ? 1 : .45);
      const pop = T - j.t < .05 ? 1.5 : 1;
      const c = cols[j.c];
      g.fillStyle = mix(c, '#FFFFFF', .35 * k, Math.min(1, .55 + .45 * k * pop)); g.fillRect(j.x - j.s / 2, j.y - j.s / 2, j.s, j.s);
      glow(g, j.x, j.y, 7, c, .14 * k * pop);
    }
    g.globalCompositeOperation = 'source-over';
  }
  function drawLedges(g, B, T, S) {
    for (const b of B) for (const l of b.ledges) {
      if (S.pre || T < l.t) continue;
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < l.n; i++) {
        const tt = l.t + i * .015; if (T < tt) continue;
        const x = l.x0 + i * 9, f = .75 + .25 * L.noise1(T * 6 + i * 2.3, b.i);
        g.fillStyle = rgba(BULB, .9 * f); g.fillRect(x - .8, l.y - 3.2 * f, 1.6, 3.2 * f);
        glow(g, x, l.y - 2, 8, ORANGE, .2 * f);
      }
      g.globalCompositeOperation = 'source-over';
      g.fillStyle = 'rgba(122,52,22,.9)'; for (let i = 0; i < l.n; i++) g.fillRect(l.x0 + i * 9 - 2, l.y, 4, 1.6);
    }
  }
  function drawRow(g, T, cam, S, key, opt) {
    const R = ROWS[key], B = CITY[key];
    g.save(); applyCam(g, cam, R.f);
    g.drawImage(rowArt(key), -70, 800);
    if (S.dark > 0) { g.globalAlpha = S.dark; g.drawImage(rowMask(key), -70, 800); g.globalAlpha = 1; }
    if (opt.preRow) opt.preRow(g);
    drawWindows(g, B, T, S, key, opt);
    drawLedges(g, B, T, S);
    drawJhalar(g, B, T, S);
    if (opt.postRow) opt.postRow(g);
    g.restore();
  }

  /* ======================= THE THREE TOWERS (s6 world coords) ======================= */
  const ROOF = 560, TOWER_BOTTOM = 1300, PILLAR_X = [[280, 362.7], [498.6, 581.4], [717.3, 800]];
  function towerLitAt(tone, wy, T) {
    if (tone === 'red') return q(T_TOWER + .1333 * (TOWER_BOTTOM - wy) / (TOWER_BOTTOM - ROOF));
    return q(RING_T[0] + .1 * (TOWER_BOTTOM - wy) / (TOWER_BOTTOM - ROOF));
  }
  function tower(g, x0, x1, tone, T, S, flareA) {
    const w = x1 - x0;
    const gr = g.createLinearGradient(0, ROOF, 0, TOWER_BOTTOM); gr.addColorStop(0, '#2B2728'); gr.addColorStop(.62, '#241F22'); gr.addColorStop(1, 'rgba(28,26,26,0)');
    g.fillStyle = gr; g.fillRect(x0, ROOF, w, TOWER_BOTTOM - ROOF);
    if (S.dark > 0) { const dg = g.createLinearGradient(0, ROOF, 0, TOWER_BOTTOM); dg.addColorStop(0, rgba('#0D0B10', S.dark * .45)); dg.addColorStop(1, rgba('#0D0B10', 0)); g.fillStyle = dg; g.fillRect(x0, ROOF, w, TOWER_BOTTOM - ROOF); }
    g.fillStyle = 'rgba(140,135,131,.55)'; g.fillRect(x0, ROOF, w, 2);
    if (!S.pre) { const rg = g.createLinearGradient(0, ROOF, 0, 1000); rg.addColorStop(0, 'rgba(160,150,190,.32)'); rg.addColorStop(1, 'rgba(160,150,190,0)'); g.fillStyle = rg; g.fillRect(x0, ROOF, 2.5, 440); g.fillRect(x1 - 2.5, ROOF, 2.5, 440); }
    const cols = 3, cw = 13, ch = 17, gx = (w - cols * cw) / (cols + 1);
    for (let r = 0; ROOF + 16 + r * 30 < TOWER_BOTTOM - 40; r++) for (let c = 0; c < cols; c++) {
      const id = r * 7 + c + (tone === 'red' ? 300 : x0); const wx = x0 + gx + c * (cw + gx), wy = ROOF + 16 + r * 30;
      const fade = 1 - L.smoothstep(960, 1180, wy);
      const on = L.rnd(9, id) > .12 ? 1 : .25;
      const tl = S.pre ? 99 : towerLitAt(tone, wy, T);
      if (T < tl) { g.fillStyle = rgba(MIST, S.cool * fade * (on > .5 ? 1 : .4)); g.fillRect(wx, wy, cw, ch); continue; }
      const u = T - tl, pop = u < 1 / 30 ? 1 : Math.exp(-(u - 1 / 30) * 14) * .4;
      const fl = .78 + .22 * L.noise1(T * 1.3 + id * .7, 5);
      const k = Math.min(1, fl * (1 + .4 * (flareA || 0)));
      const warmV = tone === 'red' && L.rnd(10, id) <= .5;   // half the red windows burn a touch warmer: brand red + amber LIGHT, never a 2nd red
      const col = tone === 'red' ? RED : (L.rnd(10, id) > .45 ? '#FFE7A3' : '#FFD27A');
      g.fillStyle = pop > .05 ? mix(col, '#FFFFFF', (tone === 'red' ? .35 : .6) * pop, Math.min(1, on * k * fade + pop)) : rgba(col, on * k * fade); g.fillRect(wx, wy, cw, ch);
      if (warmV) { g.globalCompositeOperation = 'lighter'; g.fillStyle = rgba(ORANGE, .16 * on * k * fade); g.fillRect(wx, wy, cw, ch); g.globalCompositeOperation = 'source-over'; }
      if (tone === 'red' && on > .5) { g.fillStyle = rgba('#FFB547', .55 * k * fade); g.fillRect(wx + 4, wy + 5, cw - 8, ch - 9); }
      if (pop > .05) { g.globalCompositeOperation = 'lighter'; glow(g, wx + cw / 2, wy + ch / 2, 34, tone === 'red' ? ORANGE : WARMW, .5 * pop * fade); g.globalCompositeOperation = 'source-over'; }
    }
  }
  /** s6's light string (sag to y 700 with an akash kandil at its midpoint). on: 0..1 left-to-right switch-on */
  function lightString(g, ax, bx, T, on, seed) {
    const pt = u => [lerp(ax, bx, u), ROOF + (700 - ROOF) * 4 * u * (1 - u)];
    g.save(); g.strokeStyle = 'rgba(20,16,22,.9)'; g.lineWidth = 2; g.beginPath();
    for (let i = 0; i <= 40; i++) { const [x, y] = pt(i / 40); i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); g.restore();
    const n = 9;
    for (let i = 0; i < n; i++) {
      const u = (i + .5) / n; const [x, y] = pt(u);
      const lit = clamp((on * (n + 2) - i) / 1.5);
      const chase = .55 + .45 * (.5 + .5 * Math.sin(T * 9 - i * .9 - seed));
      const col = i % 2 ? '#FFB547' : '#FFF4CF';
      if (lit > 0) L.glow(g, x, y + 6, 40, col, .3 * chase * lit);
      g.fillStyle = lit > 0 ? L.mix(col, '#FFFFFF', .4 * chase * lit, .25 + .75 * (.6 + .4 * chase) * lit) : 'rgba(70,62,60,.6)';
      g.beginPath(); g.ellipse(x, y + 6, 4.5, 6.5, 0, 0, TAU); g.fill();
    }
    const [lx, ly] = pt(.5);
    const ll = clamp(on * 1.4 - .3);
    g.save(); g.globalAlpha *= .3 + .7 * Math.min(1, on * 3); L.lantern(g, lx, ly - 4, 17, T, seed, { color: ll > 0 ? '#D2232E' : '#4A1A1C', light: '#FFC24A', lit: ll }); g.restore();
  }
  function drawTowers(g, T, cam, S, opt) {
    g.save(); applyCam(g, cam, F.city);
    g.translate(540, 710); g.scale(.5, .5); g.translate(-540, -560);
    // the red tower's warmth spills onto both neighbours
    const redOn = S.pre ? 0 : sm(T_TOWER, T_TOWER + .3, T);
    if (redOn > 0) { g.globalCompositeOperation = 'lighter'; glow(g, 540, 820, 420, ORANGE, .14 * redOn); glow(g, 540, 700, 260, AMBER, .1 * redOn); g.globalCompositeOperation = 'source-over'; }
    const fa = opt.towerFlare || 0;
    tower(g, PILLAR_X[0][0], PILLAR_X[0][1], 'outer', T, S, fa);
    tower(g, PILLAR_X[1][0], PILLAR_X[1][1], 'red', T, S, fa);
    tower(g, PILLAR_X[2][0], PILLAR_X[2][1], 'outer', T, S, fa);
    // rooftop touch-flare where the ember lands
    const lu = T - T_TOWER; if (lu >= -.03 && lu < .5) { g.globalCompositeOperation = 'lighter'; const k = Math.exp(-Math.max(0, lu) * 7);
      glow(g, 540, 562, 150 * (1 + lu), GOLD, .7 * k); glow(g, 540, 562, 40, '#FFFFFF', .9 * k); g.globalCompositeOperation = 'source-over'; }
    const on = S.pre ? 0 : prog(T, T_STR, T_STR + .3);
    lightString(g, PILLAR_X[0][1], PILLAR_X[1][0], T, on, 1);
    lightString(g, PILLAR_X[1][1], PILLAR_X[2][0], T, on, 2);
    g.restore();
  }

  /* ======================= MM MEDIA (lit until 12.400) ======================= */
  const faceTri = () => L.cached('s45-tri', 180, 115, g => {
    g.fillStyle = MUSLIN; g.fillRect(0, 0, 180, 115);
    if (L.EN) {   // English cut: the same two-line gag as s3, in miniature
      const o = { font: 'lat', size: 15, weight: 780, color: INK };
      L.text(g, 'House: spotless.', 90, 46, Object.assign({ maxWidth: 160 }, o));
      const w1 = L.measure(g, 'Back: ', o), w2 = L.measure(g, 'finished.', o), x0 = 90 - (w1 + w2) / 2;
      L.text(g, 'Back: ', x0, 66, Object.assign({ align: 'left', maxWidth: w1 + 2 }, o)); L.text(g, 'finished.', x0 + w1, 66, Object.assign({ align: 'left', maxWidth: w2 + 2 }, o, { color: RED }));
    } else {
    const o = { font: 'dev', size: 17, weight: 800, color: INK };
    const w1 = L.measure(g, 'घर साफ़। कमर ', o), w2 = L.measure(g, 'हाफ़।', o), x0 = 90 - (w1 + w2) / 2;
    L.text(g, 'घर साफ़। कमर ', x0, 52, Object.assign({ align: 'left', maxWidth: 140 }, o)); L.text(g, 'हाफ़।', x0 + w1, 52, Object.assign({ align: 'left', maxWidth: 60 }, o, { color: RED }));
    L.text(g, 'House: spotless. Back: finished.', 90, 72, { font: 'lat', size: 8, weight: 600, color: STONE, maxWidth: 150 });
    }
    g.fillStyle = 'rgba(0,0,0,.12)'; for (let i = 1; i < 16; i++) g.fillRect(i * 180 / 16, 0, .8, 115);
    g.fillStyle = INK; g.fillRect(122, 100, 52, 11); L.drawLogo(g, 'mark', { x: 132, y: 105.5, h: 7, way: 'reverse' });
  });
  const faceLed = () => L.cached('s45-led', 140, 90, g => {
    g.fillStyle = '#0B0A0D'; g.fillRect(0, 0, 140, 90);
    L.text(g, L.EN ? 'Diet: from Monday.' : 'डाइट: मंडे से।', 70, 34, { font: L.EN ? 'lat' : 'dev', size: L.EN ? 13 : 15, weight: 700, color: '#FFE2B0', maxWidth: 122 });
    L.text(g, L.EN ? 'Kaju katli: right now.' : 'काजू कतली: अभी से।', 70, 58, { font: L.EN ? 'lat' : 'dev', size: L.EN ? 14 : 16, weight: 800, color: RED, maxWidth: 128 });
    g.fillStyle = 'rgba(0,0,0,.45)'; for (let y = 0; y < 90; y += 3) g.fillRect(0, y, 140, 1); for (let x = 0; x < 140; x += 3) g.fillRect(x, 0, 1, 90);
    for (let i = 0; i < 6; i++) { g.fillStyle = MUSLIN; g.save(); g.translate(96 + i * 7, 78 - (i % 2) * 4); g.rotate(.3); g.fillRect(-3, -2, 6, 4); g.restore(); }
  });
  const faceHook = () => L.cached('s45-hook', 140, 75, g => {
    g.fillStyle = MUSLIN; g.fillRect(0, 0, 140, 75);
    L.text(g, 'SPACE AVAILABLE', 70, 18, { font: 'lat', size: 11, weight: 760, color: INK, maxWidth: 120 });
    g.save(); g.translate(70, 40); g.rotate(-9 * DEG); g.strokeStyle = P.violet; g.lineWidth = 2; g.strokeRect(-40, -12, 80, 24);
    L.text(g, 'BOOKED', 0, 6, { font: 'lat', size: 15, weight: 760, stretch: 'expanded', color: P.violet, maxWidth: 70 }); g.restore();
    L.text(g, 'for you', 70, 66, { font: 'tiro', italic: true, size: 15, color: RED, maxWidth: 70 });
  });
  const faceVan = () => L.cached('s45-van', 360, 230, g => {
    g.fillStyle = '#0B0A0D'; g.fillRect(0, 0, 360, 230);
    L.text(g, L.EN ? 'Soan papdi boxes:' : 'सोन पापड़ी के डिब्बे:', 180, 80, { font: L.EN ? 'lat' : 'dev', size: L.EN ? 34 : 40, weight: 700, color: '#FFE2B0', maxWidth: 320 });
    L.text(g, L.EN ? 'Got 3. Gave 4.' : 'आए 3, गए 4।', 180, 150, { font: L.EN ? 'lat' : 'dev', size: L.EN ? 50 : 56, weight: 800, color: '#FFF1DA', maxWidth: 320 });
  });
  function lampHead(g, x, y, T, on, die) {
    // a tiny gooseneck lamp; after the cut the filament cools orange and fades
    g.fillStyle = '#141116'; g.fillRect(x - 4, y - 2, 8, 4);
    g.globalCompositeOperation = 'lighter';
    if (on > 0) { glow(g, x, y + 2, 26, TUBE, .55 * on); g.fillStyle = rgba('#FFFFFF', on); g.fillRect(x - 1.5, y, 3, 2); }
    if (die > 0) { glow(g, x, y + 1, 10, ORANGE, .5 * die); g.fillStyle = rgba('#FF7A2A', die); g.fillRect(x - 1.2, y, 2.4, 1.6); }
    g.globalCompositeOperation = 'source-over';
  }
  function cone(g, x, y, x0, x1, y1, a) {
    g.globalCompositeOperation = 'lighter';
    const gr = g.createLinearGradient(0, y, 0, y1); gr.addColorStop(0, rgba(TUBE, a)); gr.addColorStop(1, rgba(TUBE, 0));
    g.fillStyle = gr; g.beginPath(); g.moveTo(x - 3, y); g.lineTo(x + 3, y); g.lineTo(x1, y1); g.lineTo(x0, y1); g.closePath(); g.fill();
    g.globalCompositeOperation = 'source-over';
  }
  const F_FLICK = Math.round(q(12.3667) * 30);
  function boardLife(T) { // 1 = lit, then the relay cut; returns {on, die (filament afterglow)}
    if (!killed(T)) return { on: Math.round(T * 30) === F_FLICK ? .7 : 1, die: 0 };   // one tubelight stutter before the thunk
    const u = Math.max(0, T - T_DIE); return { on: 0, die: u < .3 ? Math.pow(1 - u / .3, 2) * .9 : 0 };
  }
  function drawTri(g, T, life) {
    const x = 110, y = 965, w = 180, h = 115;
    g.fillStyle = '#141116'; g.fillRect(x + 30, y + h, 6, 1102 - y - h); g.fillRect(x + w - 36, y + h, 6, 1102 - y - h);
    g.fillStyle = '#16131A'; g.fillRect(x - 6, y - 6, w + 12, h + 12);
    g.drawImage(faceTri(), x, y);
    g.fillStyle = rgba('#0D0B10', life.on ? lerp(.93, .18, life.on) : .93); g.fillRect(x - 1, y - 1, w + 2, h + 2);
    g.fillStyle = '#141116'; g.fillRect(x - 8, y + h + 4, w + 16, 4);
    for (const lx of [x + 45, x + w - 45]) { if (life.on) cone(g, lx, y + h + 3, lx - 70, lx + 70, y - 10, .1 * life.on); lampHead(g, lx, y + h + 2, T, life.on, life.die); }
    if (life.on) { g.globalCompositeOperation = 'lighter'; glow(g, x + w / 2, y + h / 2, 150, TUBE, .1 * life.on); g.globalCompositeOperation = 'source-over'; }
  }
  /** reflections of the lit homes opposite, caught in the dead LED glass (blurred, cached) */
  const ledReflect = () => L.blurredCache('s45-ledrefl', 140, 90, 2, g => {
    g.fillStyle = AMBER;
    for (let r = 0; r < 4; r++) for (let c = 0; c < 9; c++) { if (rnd(171, r * 9 + c) < .42) continue; const xx = 10 + c * 14 + (r % 2) * 5, yy = 14 + r * 19 + c * 1.4; g.fillRect(xx, yy, 5, 6); }
  });
  function drawLed(g, T, S) {
    const x = 720, y = 900, w = 140, h = 90, u = killed(T) ? Math.max(0, T - T_DIE) : -1;
    g.fillStyle = '#121014'; g.fillRect(x - 5, y - 5, w + 10, h + 10);
    g.fillStyle = '#060507'; g.fillRect(x, y, w, h);
    if (u < 0) { g.drawImage(faceLed(), x, y); if (Math.round(T * 30) === F_FLICK) { g.fillStyle = 'rgba(6,5,7,.3)'; g.fillRect(x, y, w, h); }
      g.globalCompositeOperation = 'lighter'; glow(g, x + w / 2, y + h / 2, 130, '#FFD7A0', .12 * boardLife(T).on); g.globalCompositeOperation = 'source-over'; return; }
    // CRT collapse: squash to a line, then a dot, then out (3 frames)
    const f = Math.round(T * 30) - Math.round(T_DIE * 30);
    if (f >= 3) {
      // switched-off glass: Ink panel, Stone top edge, a diagonal sheen; from 14.2 it mirrors the warm homes opposite
      g.fillStyle = INK; g.fillRect(x, y, w, h);
      g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
      g.fillStyle = rgba(MUSLIN, .05); g.beginPath(); g.moveTo(x + 18, y + h); g.lineTo(x + 62, y); g.lineTo(x + 92, y); g.lineTo(x + 48, y + h); g.closePath(); g.fill();
      g.fillStyle = rgba(MUSLIN, .03); g.beginPath(); g.moveTo(x + 66, y + h); g.lineTo(x + 110, y); g.lineTo(x + 120, y); g.lineTo(x + 76, y + h); g.closePath(); g.fill();
      const rf = sm(14.2, 14.9, T); if (rf > 0) { g.globalAlpha = .1 * rf * 1.8; g.drawImage(ledReflect(), x - 4, y - 4); g.globalAlpha = 1; }
      g.restore();
      g.fillStyle = rgba(STONE, .75); g.fillRect(x, y, w, 2);
      if (S && S.dark > 0) { g.fillStyle = rgba('#0D0B10', S.dark * .62); g.fillRect(x - 5, y - 5, w + 10, h + 10); }
    }
    g.save(); g.globalCompositeOperation = 'lighter';
    if (f === 0) { g.save(); g.translate(0, y + h / 2); g.scale(1, .22); g.drawImage(faceLed(), x, -h / 2); g.restore(); g.fillStyle = rgba('#FFFFFF', .55); g.fillRect(x, y + h / 2 - 9, w, 18); }
    else if (f === 1) { g.fillStyle = '#FFFFFF'; g.fillRect(x, y + h / 2 - 1, w, 2); glow(g, x + w / 2, y + h / 2, 90, '#DDE6FF', .5); }
    else if (f === 2) { g.fillStyle = rgba('#FFFFFF', .8); g.fillRect(x + w * .38, y + h / 2 - 1, w * .24, 2); glow(g, x + w / 2, y + h / 2, 30, '#DDE6FF', .45); }
    else if (u < .6) { glow(g, x + w / 2, y + h / 2, 8, '#B8C8FF', .5 * (1 - u / .6)); }
    g.restore();
  }
  function drawHook(g, T, life) {
    const x = 880, y = 1170, w = 140, h = 75;
    g.fillStyle = '#121014'; g.fillRect(x + w / 2 - 5, y + h, 10, 1300 - y - h); g.fillRect(x - 6, y + h + 4, w + 12, 3);
    g.fillStyle = '#16131A'; g.fillRect(x - 4, y - 4, w + 8, h + 8);
    g.drawImage(faceHook(), x, y);
    g.fillStyle = rgba('#0D0B10', life.on ? lerp(.93, .14, life.on) : .93); g.fillRect(x - 1, y - 1, w + 2, h + 2);
    for (const lx of [x + 35, x + w - 35]) {
      g.strokeStyle = '#141116'; g.lineWidth = 2; g.beginPath(); g.moveTo(lx, y - 2); g.quadraticCurveTo(lx, y - 16, lx + 7, y - 15); g.stroke();
      if (life.on) cone(g, lx + 8, y - 13, lx - 30, lx + 46, y + h * .6, .14 * life.on);
      lampHead(g, lx + 8, y - 14, T, life.on, life.die);
    }
    g.fillStyle = INK; g.fillRect(x + w - 44, y + h + 8, 40, 10); L.drawLogo(g, 'mark', { x: x + w - 36, y: y + h + 13, h: 6.5, way: 'reverse' });
  }
  function drawVan(g, T, life) {
    // lit: the LED van parked on the street. After the cut it is a dark silhouette that slips out of frame left
    // under the blackout (12.42 – 12.70), so no maroon smudge is left behind the railing diyas.
    if (life.on) {
      L.ledVan(g, 70, 1428, .355, T, { drive: 0, bounce: 0, lit: life.on, seed: 3, screen: (c, w, h) => {
        c.drawImage(faceVan(), 0, 0, w, h); if (life.on < 1) { c.fillStyle = rgba('#060507', 1 - life.on); c.fillRect(0, 0, w, h); } } });
      return;
    }
    const u = prog(T, T_DIE + .02, q(12.7), E.inQuad); if (u >= 1) return;
    L.ledVan(g, 70 - 330 * u, 1428, .355, T, { drive: u > 0 ? -.6 : 0, bounce: 0, lit: 0, seed: 3, body: '#2B2728', cab: '#1E1A1C', screen: (c, w, h) => {
      c.fillStyle = '#0C0A0D'; c.fillRect(0, 0, w, h); if (life.die > .3) { c.fillStyle = rgba('#FFE2B0', .15 * life.die); c.fillRect(0, h * .45, w, h * .12); } } });
    // headlamp off (ledVan always paints the lens white), and a 2 px Stone top edge so it reads as a vehicle, not a stain
    const vx = 70 - 330 * u;
    g.fillStyle = '#3A3536'; g.fillRect(vx + 533 * .355, 1428 - 103 * .355, 9 * .355, 14 * .355);
    g.fillStyle = rgba(STONE, .45); g.fillRect(vx + 14 * .355 - 2, 1428 - 300 * .355 - 2, 360 * .355 + 4, 2);
  }

  /* ======================= LATE-LATIF WINDOW W* ======================= */
  function drawWStar(g, T, S) {
    const { x, y, w, h } = WSTAR, r = w / 2;
    const path = () => { g.beginPath(); g.moveTo(x, y + h); g.lineTo(x, y + r * .7); g.quadraticCurveTo(x, y - 4, x + r, y - 8); g.quadraticCurveTo(x + w, y - 4, x + w, y + r * .7); g.lineTo(x + w, y + h); g.closePath(); };
    // jharokha frame
    g.fillStyle = '#1E1B1E'; g.fillRect(x - 6, y + h, w + 12, 6); g.fillStyle = rgba(STONE, .5); g.fillRect(x - 6, y + h, w + 12, 1.5);
    for (let k = 0; k < 7; k++) { g.fillStyle = '#1E1B1E'; g.fillRect(x - 4 + k * (w + 8) / 6 - 1, y + h + 6, 2, 10); }
    g.fillStyle = '#1E1B1E'; g.fillRect(x - 6, y + h + 15, w + 12, 3);
    const u = T - T_LATE;
    let k = 0, pop = 0;
    if (u >= 0) { k = 1; pop = u < 1 / 30 ? 1 : Math.exp(-(u - 1 / 30) * 9) * .5; }
    if (k <= 0) { g.fillStyle = rgba(MIST, S.pre ? .12 : .045); path(); g.fill(); }
    else {
      const gr = g.createRadialGradient(x + r, y + h * .55, 2, x + r, y + h * .55, w * .8);
      gr.addColorStop(0, mix(WARMW, '#FFFFFF', pop)); gr.addColorStop(.55, mix(AMBER, '#FFF4CF', pop)); gr.addColorStop(1, mix('#D8702A', '#FFE7A3', pop));
      g.fillStyle = gr; path(); g.fill();
      // curtains tied back
      g.fillStyle = 'rgba(150,40,30,.55)'; g.beginPath(); g.moveTo(x, y + 6); g.quadraticCurveTo(x + 12, y + 20, x + 4, y + h); g.lineTo(x, y + h); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(x + w, y + 6); g.quadraticCurveTo(x + w - 12, y + 20, x + w - 4, y + h); g.lineTo(x + w, y + h); g.closePath(); g.fill();
      g.globalCompositeOperation = 'lighter'; glow(g, x + r, y + h * .5, 60 * (1 + pop), WARMW, .16 + .7 * pop); glow(g, x + r, y + h * .5, 150, AMBER, .1 + .3 * pop); g.globalCompositeOperation = 'source-over';
      // a little kandil swinging ±8° (damped)
      const sw = 8 * Math.exp(-u * 1.6) * Math.sin(u * 6.5) + 1.2 * Math.sin(T * 1.4);
      g.save(); g.translate(x + r, y - 2); g.rotate(sw * DEG); L.lantern(g, 0, 0, 7.5, T, 9, { color: RED, light: GOLD, lit: 1 }); g.restore();
      // two sill diyas catch after it
      g.globalCompositeOperation = 'lighter';
      [[x + 8, .07], [x + w - 8, .13]].forEach(([dx, dt]) => { if (u < dt) return; const f = .8 + .2 * L.noise1(T * 7 + dx, 4); g.fillStyle = rgba(BULB, .95); g.fillRect(dx - 1, y + h - 6 * f, 2, 5 * f); glow(g, dx, y + h - 4, 14, ORANGE, .4 * f); });
      g.globalCompositeOperation = 'source-over';
    }
    // a small toran over it (breeze on it in the stillness)
    const br = 1 + 2.4 * L.inOut(T, 12.4, 12.48, 12.62, 12.9);
    for (let i = 0; i <= 8; i++) { const uu = i / 8, mx = x - 4 + uu * (w + 8), my = y - 12 + Math.sin(uu * Math.PI) * 6; L.marigold(g, mx, my, 2.6, { tone: i % 2 ? 'yellow' : 'orange', seed: i }); }
    for (let s = 0; s < 3; s++) { const sx = x + 8 + s * (w - 16) / 2; for (let j = 1; j <= 3; j++) { const swx = Math.sin(T * 2.2 + s + j * .5) * j * .9 * br; L.marigold(g, sx + swx, y - 8 + j * 4.6, 2.2, { tone: (s + j) % 2 ? 'orange' : 'yellow', seed: s * 4 + j }); } }
    if (!S.pre && k <= 0) { g.fillStyle = rgba('#0A090C', .25); path(); g.fill(); }
  }

  /* ======================= THE RAILING (Legacy Line) + DIYAS + MATCH ======================= */
  const RS = 1.2, STEP = L.MARK.step * RS, PW = L.MARK.w * RS, LL_X0 = -((25.5 % STEP) + STEP) % STEP - STEP, LL_TOP = 1440, LL_H = 120;
  const pillarX = i => LL_X0 + i * STEP;            // left edge; i = 11 -> 529.5 (red, centred at 540)
  const RED_I = 11;
  const SMALL = [[9, 13, q(13.3)], [7, 15, q(13.6)], [5, 17, q(13.9)], [3, 19, q(14.2)]];
  const RAIL_Y0 = 1418, RAIL_H = 176, RAIL_X0 = -20, RAIL_W = 1120, RAIL_RES = 2;
  const STRIKE = { x0: 418, x1: 494 };
  function railShapes(g, mode) {
    // mode: 'dark' | 'lit'
    const lit = mode === 'lit';
    const parts = L.markParts(); const s = RS;
    const inkC = lit ? '#4A372F' : '#141114', redC = lit ? RED : '#1E0E10', edge = lit ? '#F4CF9E' : '#2E2A2B';
    // floor slab edge under the M strip
    g.fillStyle = lit ? '#3A2B25' : '#100E10'; g.fillRect(RAIL_X0, LL_TOP + LL_H - 2, RAIL_W, 16); g.fillStyle = lit ? 'rgba(255,214,160,.55)' : 'rgba(80,74,72,.5)'; g.fillRect(RAIL_X0, LL_TOP + LL_H - 2, RAIL_W, 2);
    for (let i = 0; i < 24; i++) {
      const bx = pillarX(i); if (bx > 1100) break;
      g.save(); g.translate(bx, LL_TOP); g.scale(s, s);
      g.fillStyle = inkC; L.poly(g, parts.chevrons[0]); g.fill();
      g.fillStyle = i === RED_I ? redC : inkC; L.poly(g, parts.pillars[0]); g.fill();
      g.restore();
      // 2 px top-edge highlight on the chevron's upper edges + bevel on the pillar side facing the hero diya
      const ch = parts.chevrons[0].map(p => [bx + p[0] * s, LL_TOP + p[1] * s]);
      g.strokeStyle = edge; g.lineWidth = lit ? 2 : 1.5; g.globalAlpha = lit ? .75 : .5;
      g.beginPath(); g.moveTo(ch[1][0], ch[1][1] + 1); g.lineTo(ch[2][0], ch[2][1] + 1); g.lineTo(ch[3][0], ch[3][1] + 1); g.stroke();
      g.globalAlpha = 1;
      const cx = bx + PW / 2;
      if (lit && i === RED_I) {
        // the Legacy-Line pillar stays true MM Red; the flame's warmth sits on it as additive amber LIGHT (top-lit, falls off)
        g.save(); g.translate(bx, LL_TOP); g.scale(s, s); L.poly(g, parts.pillars[0]); g.restore(); g.save(); g.clip();
        g.globalCompositeOperation = 'lighter';
        const ag = g.createRadialGradient(cx, LL_TOP - 6, 0, cx, LL_TOP - 6, LL_H * .95);
        ag.addColorStop(0, rgba(ORANGE, .25)); ag.addColorStop(.55, rgba(ORANGE, .1)); ag.addColorStop(1, rgba(ORANGE, 0));
        g.fillStyle = ag; g.fillRect(bx, LL_TOP, PW, LL_H);
        g.globalCompositeOperation = 'source-over';
        const vg = g.createLinearGradient(0, LL_TOP, 0, LL_TOP + LL_H); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(.55, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.3)');
        g.fillStyle = vg; g.fillRect(bx, LL_TOP, PW, LL_H);
        g.restore();
      } else if (lit) {
        const side = cx < 540 ? 1 : cx > 540 ? -1 : 0;
        const gr = g.createLinearGradient(bx, 0, bx + PW, 0);
        if (side > 0) { gr.addColorStop(0, 'rgba(0,0,0,.25)'); gr.addColorStop(.7, 'rgba(255,200,140,0)'); gr.addColorStop(1, 'rgba(255,214,160,.4)'); }
        else if (side < 0) { gr.addColorStop(0, 'rgba(255,214,160,.4)'); gr.addColorStop(.3, 'rgba(255,200,140,0)'); gr.addColorStop(1, 'rgba(0,0,0,.25)'); }
        else { gr.addColorStop(0, 'rgba(255,220,170,.4)'); gr.addColorStop(.5, 'rgba(255,220,170,0)'); gr.addColorStop(1, 'rgba(255,220,170,.4)'); }
        g.fillStyle = gr; g.fillRect(bx, LL_TOP, PW, LL_H);
        const vg = g.createLinearGradient(0, LL_TOP, 0, LL_TOP + LL_H); vg.addColorStop(0, 'rgba(255,210,150,.25)'); vg.addColorStop(.5, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.35)');
        g.fillStyle = vg; g.fillRect(bx, LL_TOP, PW, LL_H);
      }
    }
    // cap rail (coping) on top: a flat Ink bar with a Stone top edge and the striker strip
    g.fillStyle = lit ? '#523C31' : '#121013'; g.fillRect(RAIL_X0, RAIL_TOP, RAIL_W, 12);
    g.fillStyle = lit ? '#7A5844' : '#1A1719'; g.fillRect(RAIL_X0, RAIL_TOP, RAIL_W, 3);
    g.fillStyle = lit ? '#FFE6C0' : 'rgba(140,135,131,.55)'; g.fillRect(RAIL_X0, RAIL_TOP, RAIL_W, lit ? 1.5 : 1.2);
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(RAIL_X0, RAIL_TOP + 11, RAIL_W, 2);
    // striker strip (4 px Stone, gritty)
    g.fillStyle = lit ? '#B9A48F' : '#3A3634'; g.fillRect(STRIKE.x0, RAIL_TOP - 1, STRIKE.x1 - STRIKE.x0, 4);
    g.fillStyle = 'rgba(0,0,0,.4)'; for (let k = 0; k < 60; k++) g.fillRect(STRIKE.x0 + rnd(88, k) * (STRIKE.x1 - STRIKE.x0), RAIL_TOP - 1 + rnd(89, k) * 3.4, 1, 1);
    texturize(g, 'paper', lit ? .22 : .3, .35 * RAIL_RES, 9);
  }
  // cached at 2x: the lean-in pushes the railing layer to 2.0x, so it must stay crisp
  const railImg = mode => L.cached('s45-rail2-' + mode, RAIL_W * RAIL_RES, RAIL_H * RAIL_RES, g => { g.scale(RAIL_RES, RAIL_RES); g.translate(-RAIL_X0, -RAIL_Y0); railShapes(g, mode); });

  /* clay diya (3/4 front view, spout to camera so the flame stands on the red pillar's axis) */
  function diyaBody(g, s, lit) {
    const ry = .27 * s;
    // bowl
    const bowl = () => { g.beginPath(); g.moveTo(-s, 0); g.bezierCurveTo(-s * .98, s * .36, -s * .62, s * .6, -s * .28, s * .64); g.lineTo(s * .28, s * .64); g.bezierCurveTo(s * .62, s * .6, s * .98, s * .36, s, 0); g.ellipse(0, 0, s, ry, 0, 0, Math.PI, false); g.closePath(); };
    let gr = g.createLinearGradient(0, -ry, 0, s * .66);
    if (lit) { gr.addColorStop(0, '#D9733A'); gr.addColorStop(.45, '#A8481F'); gr.addColorStop(1, '#5A200E'); }
    else { gr.addColorStop(0, '#3A1A10'); gr.addColorStop(1, '#170A06'); }
    g.fillStyle = gr; bowl(); g.fill();
    // foot ring
    g.fillStyle = lit ? '#6A2810' : '#140806'; g.beginPath(); g.ellipse(0, s * .64, s * .32, s * .07, 0, 0, TAU); g.fill();
    // painted band: Muslin dots and a gold-ink chevron run (the mark's V)
    g.save(); bowl(); g.clip();
    const yb = s * .26;
    g.strokeStyle = lit ? 'rgba(242,178,62,.95)' : 'rgba(110,70,30,.6)'; g.lineWidth = Math.max(1, s * .045);
    g.beginPath(); for (let i = 0; i <= 12; i++) { const x = -s * .9 + i * s * .15, y = yb + (i % 2 ? s * .09 : 0) + Math.pow(x / s, 2) * s * .1; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
    g.fillStyle = lit ? 'rgba(238,236,232,.92)' : 'rgba(90,80,70,.5)';
    for (let i = 0; i < 9; i++) { const x = -s * .8 + i * s * .2; L.circle(g, x, yb + s * .2 + Math.pow(x / s, 2) * s * .1, s * .035); g.fill(); }
    if (lit) { const sh = g.createLinearGradient(-s, 0, s, 0); sh.addColorStop(0, 'rgba(0,0,0,.35)'); sh.addColorStop(.45, 'rgba(255,190,120,.0)'); sh.addColorStop(.6, 'rgba(255,190,120,.12)'); sh.addColorStop(1, 'rgba(0,0,0,.4)'); g.fillStyle = sh; g.fillRect(-s, -ry, 2 * s, s); }
    g.restore();
    // rim + oil
    g.fillStyle = lit ? '#E08A4C' : '#3A1C12'; g.beginPath(); g.ellipse(0, 0, s, ry, 0, 0, TAU); g.fill();
    gr = g.createLinearGradient(0, -ry, 0, ry); gr.addColorStop(0, lit ? '#3A1606' : '#0E0604'); gr.addColorStop(1, lit ? '#B5701E' : '#2A1608');
    g.fillStyle = gr; g.beginPath(); g.ellipse(0, s * .02, s * .84, ry * .72, 0, 0, TAU); g.fill();
    if (lit) { g.fillStyle = 'rgba(255,236,190,.55)'; g.beginPath(); g.ellipse(-s * .05, s * .06, s * .22, ry * .16, 0, 0, TAU); g.fill(); }
    // pinched spout lip at the front + cotton wick
    g.fillStyle = lit ? '#C86A35' : '#2E150C'; g.beginPath(); g.moveTo(-s * .2, ry * .7); g.quadraticCurveTo(0, ry * 1.75, s * .2, ry * .7); g.closePath(); g.fill();
    g.strokeStyle = lit ? '#F0E2C8' : '#4A4038'; g.lineWidth = Math.max(1.2, s * .07); g.lineCap = 'round';
    g.beginPath(); g.moveTo(-s * .05, ry * .2); g.quadraticCurveTo(-s * .01, ry * .9, 0, ry * 1.05); g.stroke();
  }
  const diyaImg = (s, lit) => L.cached(`s45-diya2-${s}-${lit ? 1 : 0}`, s * 2.4 * RAIL_RES, s * 1.4 * RAIL_RES, g => { g.scale(RAIL_RES, RAIL_RES); g.translate(s * 1.2, s * .45); diyaBody(g, s, lit); });
  const DIYA_FLAME_Y = s => -0.27 * s * 1.0;     // flame base (wick tip) relative to rim centre
  function drawDiya(g, x, s, light) {           // x = centre; sits on the cap rail
    const yr = RAIL_TOP - s * .71;              // rim centre
    g.fillStyle = 'rgba(0,0,0,.55)'; g.beginPath(); g.ellipse(x, RAIL_TOP + 1, s * .62, 3, 0, 0, TAU); g.fill();
    g.drawImage(diyaImg(s, false), x - s * 1.2, yr - s * .45, s * 2.4, s * 1.4);
    if (light > 0) { g.globalAlpha = Math.min(1, light); g.drawImage(diyaImg(s, true), x - s * 1.2, yr - s * .45, s * 2.4, s * 1.4); g.globalAlpha = 1; }
    return { x, y: yr + .27 * s * 1.05 };       // wick tip
  }

  /** a real-feeling flame: blue root, white-gold core (blooms), orange mantle, soft halo. (x,y) = wick tip */
  function flame(g, x, y, h, T, seed, I, o = {}) {
    if (I <= 0 || h <= 0) return;
    const fl = 1 + .09 * L.snoise(T * 7.3, seed) + .05 * L.snoise(T * 17.1, seed + 1);
    const hh = h * fl * Math.min(1.3, I), w = h * .4 * (.93 + .07 * L.noise1(T * 5, seed + 2)) * Math.min(1.15, .6 + .4 * I);
    const sway = w * .32 * L.snoise(T * 2.4, seed + 3) + (o.lean || 0);
    const path = (bx, by, fh, fw, sw) => { const cy = by - fh * .18, r = fw * .5; g.beginPath(); g.moveTo(bx + sw, by - fh);
      g.bezierCurveTo(bx + sw * .45 + fw * .2, by - fh * .6, bx + r, by - fh * .4, bx + r, cy); g.arc(bx, cy, r, 0, Math.PI, false);
      g.bezierCurveTo(bx - r, by - fh * .4, bx + sw * .45 - fw * .2, by - fh * .6, bx + sw, by - fh); g.closePath(); };
    g.save(); g.globalCompositeOperation = 'lighter';
    const ga = o.glow ?? 1;
    glow(g, x, y - hh * .42, hh * 4.6, '#FF7A1A', .3 * Math.min(1, I) * ga);
    glow(g, x, y - hh * .5, hh * 1.7, '#FFCF7A', .42 * Math.min(1, I) * ga);
    let gr = g.createLinearGradient(x, y + hh * .05, x, y - hh);
    gr.addColorStop(0, rgba('#FF5A1F', .55 * I)); gr.addColorStop(.3, rgba('#FF8A1C', .95 * I)); gr.addColorStop(.7, rgba('#FFB547', .55 * I)); gr.addColorStop(1, rgba('#FFD27A', 0));
    g.fillStyle = gr; path(x, y, hh, w, sway); g.fill();
    gr = g.createLinearGradient(x, y, x, y - hh * .66);
    gr.addColorStop(0, rgba('#FFFFFF', .95 * Math.min(1, I))); gr.addColorStop(.5, rgba('#FFF4CF', .9 * Math.min(1, I))); gr.addColorStop(1, rgba('#FFE7A3', 0));
    g.fillStyle = gr; path(x, y - hh * .03, hh * .64, w * .52, sway * .7); g.fill();
    // blue root
    g.fillStyle = rgba('#5A6BFF', .35 * Math.min(1, I)); g.beginPath(); g.ellipse(x, y - hh * .06, w * .3, hh * .07, 0, 0, TAU); g.fill();
    g.restore();
  }
  NS.flame = flame;

  /* ---- the matchstick: keyframed by head position + stick angle (head -> tail) ---- */
  const DI = { x: 540, s: 46 };                          // hero diya
  const HERO_WICK = { x: 540, y: RAIL_TOP - DI.s * .71 + .27 * DI.s * 1.05 };
  const MK = [ // [t, hx, hy, angDeg]
    [12.0, 488, 1355, 107.5], [T_WAKE, 488, 1355, 107.5], [12.633, 476, 1328, 150], [12.69, 424, 1424, 205], [T_STRIKE, 424, 1426, 205],
    [12.8, 492, 1426, 198], [12.867, 512, 1372, 228], [12.967, 529, 1398, 240], [13.067, 529, 1398, 240],
    [13.3, 486, 1366, 200],
  ];
  const T_MATCH_GONE = q(13.5);
  function matchPose(T) {
    // retired: from 13.30 the spent match tips backward off the rail (head first, +80°) and drops behind the coping
    if (T > 13.3) { const u = E.inQuad(prog(T, 13.3, T_MATCH_GONE)); return [486 - 12 * u, 1366 + 172 * u, 200 + 80 * u]; }
    for (let i = 1; i < MK.length; i++) if (T <= MK[i][0]) {
      const a = MK[i - 1], b = MK[i]; let u = clamp((T - a[0]) / (b[0] - a[0]));
      u = (a[0] === T_STRIKE) ? E.inQuad(u) : (a[0] === 13.3 ? E.outBounce(u) : E.inOutQuad(u));
      let ang = lerp(a[3], b[3], u);
      if (T > T_WAKE && T < 12.633) ang += 4 * Math.sin((T - T_WAKE) * 70) * (1 - (T - T_WAKE) / .067);   // it wakes up (wobble)
      return [lerp(a[1], b[1], u), lerp(a[2], b[2], u), ang];
    }
    const z = MK[MK.length - 1]; return [z[1], z[2], z[3]];
  }
  function matchFlameI(T) {
    const ig = q(12.767);
    if (T < ig) return 0;
    if (T < 13.1) return T - ig < .1 ? 1.7 - 7 * (T - ig) : 1;          // flare on ignition
    return Math.max(0, 1 - (T - 13.1) / .32);                            // spent, it gutters out
  }
  function drawMatch(g, T, light) {
    const [hx, hy, ang] = matchPose(T);
    const burnt = sm(12.77, 13.0, T);
    g.save(); g.translate(hx, hy); g.rotate(ang * DEG);
    // stick (14 x 80, MM Red, pillar proportion) + 2 px Stone edge
    const lit = clamp(light);
    g.fillStyle = mix('#3A1215', RED, lit); L.rrect(g, 5, -7, 75, 14, 2); g.fill();
    // flat stick with form: lit edge facing up, shadowed edge, a fine wood fibre
    const up = Math.sin(ang * DEG) > 0 ? -1 : 1;
    g.fillStyle = rgba('#FF8A6A', .35 * lit); g.fillRect(8, up < 0 ? -7 : 4, 72, 3);
    g.fillStyle = rgba(STONE, .2 + .35 * lit); g.fillRect(8, up < 0 ? -7 : 5, 72, 1.5);
    g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(8, up < 0 ? 4 : -7, 72, 3);
    g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(14, -1, 60, 1);
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(78, -7, 2, 14);
    if (burnt > 0) { const bg = g.createLinearGradient(5, 0, 26, 0); bg.addColorStop(0, rgba('#1A0F0B', burnt)); bg.addColorStop(1, 'rgba(26,15,11,0)'); g.fillStyle = bg; g.fillRect(5, -7, 21, 14); }
    // head: Muslin -> charred
    g.fillStyle = mix(hmix('#3B3634', MUSLIN, lit), '#24150F', burnt); g.beginPath(); g.ellipse(-1, 0, 13, 10.5, 0, 0, TAU); g.fill();
    g.fillStyle = rgba('#FFFFFF', .25 * lit * (1 - burnt)); g.beginPath(); g.ellipse(-3, -4, 6, 3, 0, 0, TAU); g.fill();
    if (burnt > 0) { g.globalCompositeOperation = 'lighter'; const e = (1 - sm(13.3, 14.4, T)) * burnt; g.fillStyle = rgba('#FF5A1F', .55 * e * (.7 + .3 * L.noise1(T * 9, 3))); g.beginPath(); g.ellipse(-1, 1, 6, 4.5, 0, 0, TAU); g.fill(); glow(g, 0, 0, 16, ORANGE, .25 * e); }
    g.restore();
    return [hx, hy];
  }
  /** the match while it moves fast (lift, strike, tilt, retire): supersampled in-scene so the 4-sample shutter shows one
      smeared stick, not a fan of red copies. Each of N sub-poses inside one engine sub-sample interval is drawn normally
      into a small device-space canvas and averaged additively (premultiplied), then laid over g in one draw. */
  const MATCH_SS = 8, MATCH_SPAN = (window.MMPost ? MMPost.DEFAULTS.shutter / MMPost.DEFAULTS.samples : .125) / 30;
  const matchFast = T => (T > T_WAKE - .02 && T < 13.0) || (T > 13.29 && T < T_MATCH_GONE);
  function ssCanvas(key, w, h) {
    let c = NS['_ss_' + key];
    if (!c || c.width < w || c.height < h) { c = document.createElement('canvas'); c.width = Math.max(w, c ? c.width : 0); c.height = Math.max(h, c ? c.height : 0); NS['_ss_' + key] = c; }
    return c;
  }
  function drawMatchSS(g, T, light) {
    const m = g.getTransform(), N = MATCH_SS, ts = [];
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (let j = 0; j < N; j++) {
      const tt = T + ((j + .5) / N - .5) * MATCH_SPAN; ts.push(tt);
      const [hx, hy, ang] = matchPose(tt), tx = hx + Math.cos(ang * DEG) * 82, ty = hy + Math.sin(ang * DEG) * 82;
      x0 = Math.min(x0, hx, tx); x1 = Math.max(x1, hx, tx); y0 = Math.min(y0, hy, ty); y1 = Math.max(y1, hy, ty);
    }
    x0 -= 22; y0 -= 22; x1 += 22; y1 += 22;
    const dx0 = Math.floor(m.a * x0 + m.c * y0 + m.e), dy0 = Math.floor(m.b * x0 + m.d * y0 + m.f);
    const dx1 = Math.ceil(m.a * x1 + m.c * y1 + m.e), dy1 = Math.ceil(m.b * x1 + m.d * y1 + m.f);
    const w = Math.max(1, dx1 - dx0), h = Math.max(1, dy1 - dy0);
    const A = ssCanvas('acc', w, h), B = ssCanvas('one', w, h), a = A.getContext('2d'), b = B.getContext('2d');
    a.setTransform(1, 0, 0, 1, 0, 0); a.globalAlpha = 1; a.globalCompositeOperation = 'source-over'; a.clearRect(0, 0, w, h);
    for (const tt of ts) {
      b.setTransform(1, 0, 0, 1, 0, 0); b.globalAlpha = 1; b.globalCompositeOperation = 'source-over'; b.clearRect(0, 0, w, h);
      b.setTransform(m.a, m.b, m.c, m.d, m.e - dx0, m.f - dy0);
      drawMatch(b, tt, light);
      a.globalCompositeOperation = 'lighter'; a.globalAlpha = 1 / N; a.drawImage(B, 0, 0, w, h, 0, 0, w, h);
    }
    const bs = L.baseScale;
    g.save(); L.resetTransform(g); g.drawImage(A, 0, 0, w, h, dx0 / bs, dy0 / bs, w / bs, h / bs); g.restore();
  }
  /** strike sparks: 24 sparks born along the strike, ballistic, analytic */
  const SPARKS = (() => { const a = []; for (let i = 0; i < 24; i++) { a.push({ b: 12.72 + rnd(31, i) * .08, ang: Math.PI + (rnd(32, i) - .62) * 1.9, v: 300 + rnd(33, i) * 680, life: .16 + rnd(34, i) * .11, c: rnd(35, i) < .4 ? '#FFFFFF' : rnd(35, i) < .75 ? GOLD : ORANGE }); } return a; })();
  function drawSparks(g, T) {
    if (T < 12.72 || T > 13.05) return;
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    for (const s of SPARKS) {
      const age = T - s.b; if (age < 0 || age > s.life) continue;
      const [hx, hy] = matchPose(s.b);
      const vx = Math.cos(s.ang) * s.v, vy = Math.sin(s.ang) * s.v - 120;
      const p1 = L.ballistic(hx, hy, vx, vy, 3, 1400, age), p0 = L.ballistic(hx, hy, vx, vy, 3, 1400, Math.max(0, age - .022));
      const k = 1 - age / s.life;
      g.strokeStyle = rgba(s.c, k); g.lineWidth = 2 + 1.8 * k; g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.stroke();
      glow(g, p1[0], p1[1], 10, GOLD, .45 * k);
    }
    const ig = T - q(12.767); if (ig >= 0 && ig < .2) { const [hx, hy] = matchPose(T); glow(g, hx, hy, 90 * (1 + ig * 3), '#FFD9A0', .7 * (1 - ig / .2)); glow(g, hx, hy, 18, '#FFFFFF', 1 - ig / .2); }
    g.restore();
    // a small ignition puff of smoke
    const pu = T - q(12.767); if (pu > 0 && pu < .6) { const [hx, hy] = matchPose(q(12.767)); g.save(); g.globalAlpha = .07 * (1 - pu / .6); g.fillStyle = MIST; for (let k = 0; k < 5; k++) { g.beginPath(); g.ellipse(hx - 4 - pu * 24 + k * 5 + L.snoise(k + pu * 3, 5) * 6, hy - 10 - pu * 70 - k * 9, 3 + pu * 10, 6 + pu * 16, .3, 0, TAU); g.fill(); } g.restore(); }
  }
  /** a thin smoke curl from the spent match head (13.3 – 14.6) */
  function drawSmoke(g, T, hx, hy) {
    const u = T - 13.28; if (u < 0 || u > 1.6) return;
    g.save(); g.lineCap = 'round';
    for (let s = 0; s < 2; s++) {
      g.beginPath();
      for (let i = 0; i <= 26; i++) {
        const v = i / 26, len = Math.min(1, u * 1.4) * 150, y = hy - 4 - v * len;
        const x = hx + L.snoise(v * 3 - T * .9 + s * 3, 12 + s) * 16 * v + v * v * 18 + s * 3;
        i ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.strokeStyle = rgba(MIST, .14 * (1 - u / 1.6) * (s ? .6 : 1)); g.lineWidth = 2.5 + s * 2; g.stroke();
    }
    g.restore();
  }

  function heroFlameI(T) {
    if (T < T_LIT - .02) return 0;
    const u = T - (T_LIT - .02);
    if (u < .1) return 1.25 * E.outQuad(u / .1);
    if (u < .35) return lerp(1.25, 1, E.inOutQuad((u - .1) / .25));
    return 1;
  }
  function smallFlameI(T, t0) { const u = T - t0; if (u < 0) return 0; if (u < .07) return 1.2 * u / .07; if (u < .25) return lerp(1.2, 1, (u - .07) / .18); return 1; }

  /** railing light map: dark railing + lit railing revealed by the flames (smooth pools of light) */
  function drawRailing(g, T, lights, amb) {
    g.drawImage(railImg('dark'), RAIL_X0, RAIL_Y0, RAIL_W, RAIL_H);
    if (amb > 0) { g.globalAlpha = amb; g.drawImage(railImg('lit'), RAIL_X0, RAIL_Y0, RAIL_W, RAIL_H); g.globalAlpha = 1; }
    if (!lights.length) return;
    const R = Math.max(.5, L.baseScale) * RAIL_RES;
    let c = NS._lt; const cw = Math.ceil(RAIL_W * R), chh = Math.ceil(RAIL_H * R);
    if (!c || c.width !== cw || c.height !== chh) { c = NS._lt = document.createElement('canvas'); c.width = cw; c.height = chh; }
    const x = c.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, cw, chh);
    x.setTransform(R, 0, 0, R, -RAIL_X0 * R, -RAIL_Y0 * R); x.globalCompositeOperation = 'lighter';
    for (const li of lights) {
      if (li.a <= .01) continue;
      const gr = x.createRadialGradient(li.x, li.y, 0, li.x, li.y, li.r);
      gr.addColorStop(0, `rgba(255,255,255,${Math.min(1, li.a)})`); gr.addColorStop(.22, `rgba(255,255,255,${Math.min(1, li.a * .72)})`); gr.addColorStop(.55, `rgba(255,255,255,${li.a * .3})`); gr.addColorStop(.85, `rgba(255,255,255,${li.a * .07})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = gr; x.fillRect(li.x - li.r, li.y - li.r, li.r * 2, li.r * 2);
    }
    x.globalCompositeOperation = 'source-in'; x.setTransform(R, 0, 0, R, 0, 0); x.drawImage(railImg('lit'), 0, 0, RAIL_W, RAIL_H);
    g.drawImage(c, RAIL_X0, RAIL_Y0, RAIL_W, RAIL_H);
  }

  /* ======================= FLOOR + FOREGROUND ======================= */
  const rangoliImg = () => L.cached('s45-rangoli2', 560, 560, g => { const t = document.createElement('canvas'); t.width = t.height = 560; L.rangoli(t.getContext('2d'), 280, 280, 240, { reveal: 1, t: 0, seed: 6, spin: .2, palette: ['#F59E1B', '#FFB547', '#F59E1B', '#3F3593', '#EEECE8', '#EEECE8'] }); g.filter = 'blur(7px) saturate(.7)'; g.drawImage(t, 0, 0); g.filter = 'none'; });
  function drawFloor(g, T, cam, lights, S) {
    g.save(); applyCam(g, cam, F.floor);
    const y0 = LL_TOP + LL_H + 12;
    const gr = g.createLinearGradient(0, y0, 0, 2300); gr.addColorStop(0, '#171416'); gr.addColorStop(1, '#0E0C0E');
    g.fillStyle = gr; g.fillRect(-300, y0, W + 600, 1200);
    // rangoli on the floor in steep perspective, revealed by the light
    const la = lights.reduce((s, l) => s + l.a * (l.floor || 0), 0);
    g.save(); g.translate(540, 1830); g.scale(1, .3); g.globalAlpha = clamp(.13 * la); g.drawImage(rangoliImg(), -280, -280); g.restore();
    // warm pools thrown onto the floor by the rail diyas
    g.globalCompositeOperation = 'lighter';
    for (const l of lights) if (l.floor) { g.save(); g.translate(l.x, y0 + 40); g.scale(1, .32); glow(g, 0, 0, l.r * 1.25, AMBER, .22 * l.a * l.floor); g.restore(); }
    // out-of-focus diyas on the balcony floor, right at the lens
    const B = [[60, 1790, 70, q(13.3)], [190, 1880, 52, q(13.6)], [1010, 1800, 74, q(13.3)], [880, 1890, 50, q(13.9)], [330, 1930, 44, q(14.2)], [760, 1940, 46, q(14.2)]];
    for (const [bx, by, br, bt] of B) { if (S.pre || T < bt) continue; const k = clamp((T - bt) / .2) * (.85 + .15 * L.noise1(T * 4 + bx, 2)); g.globalAlpha = .22 * k; g.drawImage(bokehSpr('#FF9A4A'), bx - br, by - br, br * 2, br * 2); g.globalAlpha = 1; glow(g, bx, by, br * 2.2, '#FF7A1A', .08 * k); }
    g.globalCompositeOperation = 'source-over';
    g.restore();
  }
  /** a defocused marigold toran right in front of the lens (top of frame) */
  const toranImg = mode => L.cached('s45-toran-' + mode, 1200, 330, g => {
    const tmp = document.createElement('canvas'); tmp.width = 1200; tmp.height = 330; const t = tmp.getContext('2d');
    t.translate(60, 0);
    t.strokeStyle = '#3A2A20'; t.lineWidth = 3; t.beginPath(); t.moveTo(-60, 14); t.quadraticCurveTo(540, 64, 1140, 14); t.stroke();
    for (let i = 0; i <= 52; i++) { const u = i / 52, x = -50 + u * 1180, y = 14 + Math.sin(u * Math.PI) * 25; if (i % 3 === 1) L.mangoLeaf(t, x, y + 6, 42, (rnd(91, i) - .5) * .4); L.marigold(t, x, y, 14, { tone: i % 2 ? 'yellow' : 'orange', seed: i % 6, rot: i }); }
    for (const [sx, n] of [[20, 7], [110, 4], [200, 6], [880, 6], [970, 4], [1060, 7]]) { const u = (sx + 50) / 1180, y0 = 14 + Math.sin(u * Math.PI) * 25; for (let j = 1; j <= n; j++) L.marigold(t, sx + Math.sin(j * .9) * 2, y0 + j * 21, 12 - j * .3, { tone: (j + sx) % 2 ? 'orange' : 'yellow', seed: j % 6, rot: j }); }
    g.filter = 'blur(3px)'; g.drawImage(tmp, 0, 0); g.filter = 'none';
    if (mode === 'dark') { g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(14,10,16,.84)'; g.fillRect(0, 0, 1200, 330); }
    else { g.globalCompositeOperation = 'source-atop'; const lg = g.createLinearGradient(0, 0, 0, 330); lg.addColorStop(0, 'rgba(20,12,16,.55)'); lg.addColorStop(1, 'rgba(255,170,90,.1)'); g.fillStyle = lg; g.fillRect(0, 0, 1200, 330); }
  });
  function drawToran(g, T, cam, S) {
    g.save(); applyCam(g, cam, F.top);
    const sw = Math.sin(T * .9) * .004 + (S.pre ? 0 : L.inOut(T, 12.4, 12.5, 12.6, 12.95) * Math.sin(T * 9) * .004);
    g.translate(540, -40); g.rotate(sw); g.translate(-540, 40);
    g.drawImage(toranImg('dark'), -60, -26);
    const k = S.pre ? .25 : clamp(.08 * heroFlameI(T) + .85 * S.warm);
    if (k > 0) { g.globalAlpha = k; g.drawImage(toranImg('lit'), -60, -26); g.globalAlpha = 1; }
    g.restore();
  }

  /* ======================= EMBERS (light passed on) ======================= */
  function emberPath(cam, T, u) {
    const [sx, sy] = camPt(cam, F.rail, HERO_WICK.x, HERO_WICK.y - 46);
    const [ex, ey] = camPt(cam, F.city, 540, 710);
    return [lerp(sx, ex, u) + 56 * Math.sin(u * TAU) * Math.sin(u * Math.PI), lerp(sy, ey, u)];
  }
  function drawEmberToTower(g, T) {
    const t0 = T_LIT + .02, t1 = T_TOWER; if (T < t0 || T > t1 + .02) return;
    const cam = camAt(T); const uu = t => E.inOutQuad(clamp((t - t0) / (t1 - t0)));
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    const n = 14, pts = [];
    for (let i = 0; i <= n; i++) { const tt = T - i * .006; if (tt < t0) break; pts.push(emberPath(camAt(tt), tt, uu(tt))); }
    for (let i = 1; i < pts.length; i++) { const k = 1 - i / n; g.strokeStyle = rgba(GOLD, .75 * k); g.lineWidth = 1 + 4.5 * k; g.beginPath(); g.moveTo(pts[i - 1][0], pts[i - 1][1]); g.lineTo(pts[i][0], pts[i][1]); g.stroke(); }
    const [hx, hy] = emberPath(cam, T, uu(T));
    glow(g, hx, hy, 70, GOLD, .55); glow(g, hx, hy, 22, '#FFFFFF', .9);
    g.fillStyle = '#FFFFFF'; L.circle(g, hx, hy, 3); g.fill();
    g.restore();
  }
  /** little embers hopping along the railing from diya to diya, pair by pair */
  function drawRailHops(g, T) {
    g.save(); g.globalCompositeOperation = 'lighter';
    const prev = [DI.x, DI.x];
    SMALL.forEach(([il, ir, tl], j) => {
      const t0 = j === 0 ? tl - .2 : tl - .3, u = (T - t0) / (j === 0 ? .2 : .3);
      const targets = [pillarX(il) + PW / 2, pillarX(ir) + PW / 2], from = j === 0 ? [DI.x, DI.x] : [pillarX(SMALL[j - 1][0]) + PW / 2, pillarX(SMALL[j - 1][1]) + PW / 2];
      if (u > 0 && u < 1) for (let s = 0; s < 2; s++) {
        const fy = j === 0 ? HERO_WICK.y - 40 : RAIL_TOP - 40, ty = RAIL_TOP - 30;
        const e = E.inOutQuad(u), x = lerp(from[s], targets[s], e), y = lerp(fy, ty, e) - Math.sin(u * Math.PI) * 34;
        const e2 = E.inOutQuad(Math.max(0, u - .08)), x2 = lerp(from[s], targets[s], e2), y2 = lerp(fy, ty, e2) - Math.sin(Math.max(0, u - .08) * Math.PI) * 34;
        g.strokeStyle = rgba(GOLD, .5); g.lineWidth = 2; g.lineCap = 'round'; g.beginPath(); g.moveTo(x2, y2); g.lineTo(x, y); g.stroke();
        glow(g, x, y, 22, GOLD, .5); g.fillStyle = BULB; L.circle(g, x, y, 1.8); g.fill();
      }
    });
    g.restore();
  }
  /** the tiny MM Red ember hopping from the red tower to the late window */
  function drawLateHop(g, T) {
    if (T < T_HOP || T > T_HOPEND + .05) return;
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    const pos = tt => { const cam = camAt(tt); const u = inOutSine((tt - T_HOP) / (T_HOPEND - T_HOP)); const [ax, ay] = camPt(cam, F.city, 561, 760), [bx, by] = camPt(cam, F.city, WSTAR.x + 30, WSTAR.y + 25);
      return [lerp(ax, bx, u), lerp(ay, by, u) - Math.sin(u * Math.PI) * 120]; };
    const pts = []; for (let i = 0; i < 10; i++) { const tt = T - i * .008; if (tt < T_HOP) break; pts.push(pos(Math.min(tt, T_HOPEND))); }
    for (let i = 1; i < pts.length; i++) { const k = 1 - i / 10; g.strokeStyle = rgba(ORANGE, .7 * k); g.lineWidth = 1 + 3 * k; g.beginPath(); g.moveTo(pts[i - 1][0], pts[i - 1][1]); g.lineTo(pts[i][0], pts[i][1]); g.stroke(); }
    const [hx, hy] = pos(Math.min(T, T_HOPEND));
    glow(g, hx, hy, 46, RED, .7); glow(g, hx, hy, 16, AMBER, .8); g.fillStyle = BULB; L.circle(g, hx, hy, 2.2); g.fill();
    g.restore();
  }

  /** paper sky lanterns drifting up from the rooftops in the side zones (light passed on to the sky) */
  const SKYL = [[96, 1030, 14.45], [1006, 1000, 14.62], [150, 1060, 14.9], [948, 1060, 15.05], [62, 990, 15.3], [1040, 1050, 15.5], [120, 1040, 16.4], [990, 1030, 16.7]].map(([x, y, t], i) => ({ x, y, t: q(t), v: 52 + rnd(81, i) * 26, i }));
  function drawSkyLanterns(g, T) {
    g.save();
    for (const l of SKYL) {
      const u = T - l.t; if (u < 0) continue;
      const x = l.x + 10 * Math.sin(u * .9 + l.i) + u * (l.x < 540 ? -3 : 3), y = l.y - l.v * u - 18 * (1 - Math.exp(-u * 2)), a = Math.min(1, u / .5);
      const f = .82 + .18 * L.noise1(T * 5 + l.i * 3, 8);
      g.globalCompositeOperation = 'lighter'; glow(g, x, y, 26, ORANGE, .26 * a * f); glow(g, x, y + 2, 9, WARMW, .5 * a * f);
      g.globalCompositeOperation = 'source-over';
      g.fillStyle = rgba(hmix('#E8A050', '#FFE7A3', f - .8), .85 * a); L.rrect(g, x - 3.5, y - 5, 7, 9, 2.5); g.fill();
      g.fillStyle = rgba('#FFFFFF', .9 * a * f); g.fillRect(x - 1, y + 2, 2, 2);
    }
    g.restore();
  }

  /* ======================= WORLD ======================= */
  /**
   * Draw the whole world at global time T into g (screen space, camera applied per layer).
   * opt (from s5): { shake: {x,y}, flare: (x,y)=>0..1 (home windows), towerFlare, lights: [], nearFx(g), railFx(g), skyFx(g) }
   */
  /* ---- s6 hand-over helpers: the lit rows as cached, defocused snapshots (the city dims + defocuses around the towers) ---- */
  const T_REF = 17.0;
  const rowSnapRaw = key => L.cached('s45-snap-' + key, 1220, 960, g => {
    g.translate(70, -800);
    const S = stateAt(T_REF), life = boardLife(T_REF);
    g.drawImage(rowArt(key), -70, 800);
    if (S.dark > 0) { g.globalAlpha = S.dark; g.drawImage(rowMask(key), -70, 800); g.globalAlpha = 1; }
    drawWindows(g, CITY[key], T_REF, S, key, {}); drawLedges(g, CITY[key], T_REF, S); drawJhalar(g, CITY[key], T_REF, S);
    if (key === 'back') drawLed(g, T_REF, S);
    if (key === 'front') { drawTri(g, T_REF, life); drawWStar(g, T_REF, S); }
    if (key === 'near') drawHook(g, T_REF, life);
  });
  const rowSnap = (key, b) => L.cached('s45-snapb-' + key + '-' + b, 1220 + 4 * b, 960 + 4 * b, g => { g.filter = `blur(${b}px)`; g.drawImage(rowSnapRaw(key), 2 * b, 2 * b); g.filter = 'none'; });
  /** one city row: live (sharp) until T_X, then cross-dissolved into its 6 px and 14 px defocused snapshots */
  function rowOrSnap(g, T, cam, S, key, opt) {
    const d1 = sm(T_X, T_X + .067, T), d2 = sm(T_X + .05, T_X + .2, T);
    if (d1 < 1) drawRow(g, T, cam, S, key, opt);
    if (d1 <= 0) return;
    g.save(); applyCam(g, cam, ROWS[key].f);
    g.globalAlpha = d1; g.drawImage(rowSnap(key, 6), -70 - 12, 800 - 12);
    if (d2 > 0) { g.globalAlpha = d2; g.drawImage(rowSnap(key, 14), -70 - 28, 800 - 28); }
    g.restore();
  }

  /**
   * Draw the whole world at global time T into g (screen space, camera applied per layer).
   * opt (from s5): { shake: {x,y}, flare: (x,y)=>0..1 (home windows), towerFlare, lights: [], preNearFx(g) (behind the near
   *   street row), nearFx(g), railFx(g), skyFx(g), exit (0..1 near-field fade) }
   */
  NS.drawWorld = function (g, T, opt = {}) {
    const cam = camAt(T); if (opt.shake) { cam.sx = opt.shake.x; cam.sy = opt.shake.y; }
    const S = stateAt(T); const life = boardLife(T);
    const trans = T > T_X;                                               // s6 dolly running
    const exitA = trans ? sm(T_X, T_NEAR_OUT, T) : 0;                    // near field: 7-frame exit, gone by 17.933
    drawSky(g, T, cam, S);
    if (opt.skyFx && !trans) { g.save(); applyCam(g, cam, F.far); opt.skyFx(g, cam); g.restore(); }
    drawFar(g, T, cam, S);
    rowOrSnap(g, T, cam, S, 'back', { flare: opt.flare, postRow: gg => { drawLed(gg, T, S); drawSkyLanterns(gg, T); } });
    if (!trans) drawTowers(g, T, cam, S, opt);
    rowOrSnap(g, T, cam, S, 'front', { flare: opt.flare, postRow: gg => { drawTri(gg, T, life); drawWStar(gg, T, S); } });
    // a low warm haze of cracker smoke drifting over the lit city
    if (S.warm > 0) { g.save(); applyCam(g, cam, F.city); L.haze(g, T, { y0: 900, y1: 1440, color: '#FF9F6B', alpha: .09 * S.warm, speed: 12, seed: 14, scale: 2.6 }); g.restore(); }
    if (opt.preNearFx && exitA < 1) { g.save(); applyCam(g, cam, F.near); opt.preNearFx(g, 1 - exitA); g.restore(); }
    rowOrSnap(g, T, cam, S, 'near', { flare: opt.flare, postRow: gg => { drawHook(gg, T, life); drawVan(gg, T, life); } });
    if (opt.nearFx && exitA < 1) { g.save(); applyCam(g, cam, F.near); opt.nearFx(g, 1 - exitA); g.restore(); }
    if (trans) {
      // everything outside the three towers dims to 40%; the towers + strings stay sharp to dissolve onto s6's
      g.fillStyle = rgba(RICH, .6 * exitA); g.fillRect(-60, -60, W + 120, H + 120);
      if (opt.skyFx) { g.save(); applyCam(g, cam, F.far); opt.skyFx(g, cam); g.restore(); }
      drawTowers(g, T, cam, S, opt);
    }
    if (exitA >= 1) return cam;
    // ---- the near field (railing, diyas, floor, toran): during the hand-over it takes the FULL s6 dolly (it is nearest the
    //      lens, so parallax slides it down and out), racks out of focus as the focus pulls to the towers, and fades as one
    //      layer (no inner overlaps flashing through), 17.700 – 17.933
    let out = g, off = null;
    if (exitA > 0) { off = offscreen('near'); g = off[1]; }
    drawNearField(g, T, cam, S, opt);
    if (off) {
      out.save(); L.resetTransform(out); out.globalAlpha = 1 - exitA;
      const bl = 10 * E.outQuad(exitA) * L.baseScale; if (bl > .3) out.filter = `blur(${bl.toFixed(2)}px)`;
      out.drawImage(off[0], 0, 0, W, H); out.filter = 'none'; out.restore();
    }
    return cam;
  };
  function drawNearField(g, T, cam, S, opt) {
    // ---- railing layer: lights
    const hI = heroFlameI(T), mI = matchFlameI(T);
    const lights = [];
    const [mhx, mhy] = matchPose(T);
    if (mI > 0) lights.push({ x: mhx, y: mhy - 10, r: 230 * Math.min(1.3, mI), a: .95 * Math.min(1.2, mI) * (.9 + .1 * L.snoise(T * 13, 4)), floor: .5 });
    if (hI > 0) lights.push({ x: HERO_WICK.x, y: HERO_WICK.y - 18, r: 380 * Math.min(1.15, hI), a: 1.05 * hI * (.92 + .08 * L.snoise(T * 7.3, 1)), floor: 1 });
    for (const [il, ir, tl] of SMALL) for (const i of [il, ir]) { const k = smallFlameI(T, tl); if (k > 0) lights.push({ x: pillarX(i) + PW / 2, y: RAIL_TOP - 24, r: 190, a: .75 * k * (.9 + .1 * L.snoise(T * 8 + i, 2)), floor: .6 }); }
    if (opt.lights) for (const l of opt.lights) lights.push(l);
    const amb = S.pre ? .16 : .04 + .2 * S.warm;
    g.save(); applyCam(g, cam, F.rail);
    drawRailing(g, T, lights, amb);
    // the match (drawn first while it tips backward off the rail: it falls behind the diyas and the coping)
    const matchLight = clamp(Math.max(mI, hI * .9, amb * 1.5));
    const behind = T < 12.62 || T > 13.3, falling = T > 13.3;
    const matchDraw = () => {
      if (T >= T_MATCH_GONE) return;
      if (falling) { g.save(); g.beginPath(); g.rect(-2000, -2000, 5000, RAIL_TOP + 2000); g.clip(); }   // drops behind the coping
      if (matchFast(T)) drawMatchSS(g, T, matchLight); else drawMatch(g, T, matchLight);
      if (mI > 0) { const [hx, hy] = matchPose(T); flame(g, hx, hy - 2, 24, T, 21, mI, { glow: .8 }); }
      if (falling) g.restore();
    };
    if (falling) matchDraw();
    // small diyas on alternate shared pillars
    for (const [il, ir, tl] of SMALL) for (const i of [il, ir]) {
      const x = pillarX(i) + PW / 2, k = smallFlameI(T, tl);
      const hl = hI > 0 ? .25 * hI * Math.max(0, 1 - Math.abs(x - 540) / 260) : 0;
      const wk = drawDiya(g, x, 22, Math.max(k * .95, hl, amb * .8));
      flame(g, wk.x, wk.y, 25, T, i + 3, k, { glow: .9 });
    }
    // the hero diya
    if (behind && !falling) matchDraw();
    const wk = drawDiya(g, DI.x, DI.s, Math.max(hI, mI * .55, amb));
    if (!behind) matchDraw();
    flame(g, wk.x, wk.y, 50, T, 11, hI, { glow: 1.1 });
    drawSparks(g, T);
    { const [hx, hy] = matchPose(Math.min(T, 13.3)); drawSmoke(g, T, hx, hy); }   // the curl stays where the match went out
    drawRailHops(g, T);
    if (opt.railFx) opt.railFx(g);
    g.restore();

    drawFloor(g, T, cam, lights, S);
    drawToran(g, T, cam, S);
    // light passed on
    drawEmberToTower(g, T);
    drawLateHop(g, T);
    // late-latif: the frame quietly tightens on the dark window, then lets go when it pops
    const vt = L.inOut(T, 14.5, 14.7, T_LATE + .05, 15.5);
    if (vt > 0) {
      const [wx, wy] = camPt(cam, F.city, WSTAR.x + 30, WSTAR.y + 25);
      const vg = g.createRadialGradient(wx, wy, 90, wx, wy, 1150);
      vg.addColorStop(0, 'rgba(8,6,10,0)'); vg.addColorStop(.45, rgba('#08060A', .12 * vt)); vg.addColorStop(1, rgba('#08060A', .3 * vt));
      g.fillStyle = vg; g.fillRect(0, 0, W, H);
    }
  }

  /* ======================= COPY ======================= */
  // English cut: the wish itself is English (two lines), no sub
  const L1 = L.EN ? 'From my diya' : 'मेरे दीये से,', L2 = L.EN ? 'to yours.' : 'आपके दीये तक।', EN = L.EN ? '' : 'From my diya to yours.';
  const O1 = L.EN ? { font: 'lat', size: 92, weight: 740, color: MUSLIN } : { font: 'dev', size: 92, weight: 700, color: MUSLIN }, OEN = { font: 'lat', size: 46, weight: 600, color: MIST };
  function wordsRise(g, str, y, T, t0, o, outA, outDy) {
    const words = L.layoutWords(g, str, 540, o);
    for (const wd of words) {
      const p = clamp((T - t0 - wd.i * (2 / 30)) / .3); if (p <= 0) continue;
      const e = E.outCubic(p);
      L.text(g, wd.word, wd.cx, y + (1 - e) * 34 + outDy, Object.assign({}, o, { align: 'center', alpha: e * outA, maxWidth: wd.w + 4 }));
    }
  }
  function drawCopy(g, T) {
    if (T < T_LIT - .01 || T > 15.7) return;
    const outA = 1 - sm(T_COPY_OUT, q(15.667), T), outDy = -10 * E.inQuad(prog(T, T_COPY_OUT, q(15.667)));
    // warm bloom BEHIND the copy (never on it), breathing
    const bA = .18 * sm(T_LIT, T_LIT + .5, T) * (.86 + .14 * Math.sin((T - 13) * 2.6)) * (.35 + .65 * outA);
    g.save(); g.globalCompositeOperation = 'lighter'; glow(g, 540, 440, 520, AMBER, bA); g.restore();
    wordsRise(g, L1, 380, T, T_LIT, O1, outA, outDy);
    wordsRise(g, L2, 490, T, q(13.1), O1, outA, outDy);
    const pe = E.outCubic(clamp((T - q(13.1333)) / .267));
    if (pe > 0) L.text(g, EN, 540, 565 + (1 - pe) * 12 + outDy, Object.assign({}, OEN, { alpha: pe * outA, maxWidth: 820 }));
  }

  /* ======================= POST: exposure dip 12.4 – 13.6 ======================= */
  // per-frame flashes centred on each frame time (half-frame window: k = .5 at the frame time -> x4 for exposure, x2 for bloom)
  for (let f = Math.round(T_DIE * 30); f < Math.round(13.6 * 30); f++) {
    const ft = f / 30; const d = ft < T_LIT ? -.18 : -.18 * (1 - inOutSine((ft - T_LIT) / .6));
    MM.addFlash({ t: ft - 1 / 120, dur: 1 / 60, exposure: 4 * d });
  }

  /* ======================= SCENE ======================= */
  MM.scene('s4-lights-off-diya-on', {
    draw(ctx, t, { T }) {
      if (T < T_ARR_SS) {
        // arrival: we cross-dissolve over s3's whip-up at peak speed/blur (12.167–12.233), already sliding into the wide shot;
        // the slide decelerates until 12.333. While it is fast the world is supersampled in-scene (3 sub-poses inside each
        // engine sub-sample, averaged additively), so the boards smear instead of printing stepped copies.
        const a = sm(T_IN, T_ARR, T), P = MM.params ? MM.params(T) : { shutter: .5, samples: 4 };
        const span = P.shutter / Math.max(1, P.samples) / (MM.fps || 30), N = 3;
        const [c, acc] = offscreen('arr'), bs = L.baseScale;
        acc.setTransform(1, 0, 0, 1, 0, 0); acc.globalCompositeOperation = 'lighter'; acc.globalAlpha = 1 / N;
        for (let j = 0; j < N; j++) {
          const [c1, g1] = offscreen('arr1');
          NS.drawWorld(g1, T + ((j + .5) / N - .5) * span);
          acc.drawImage(c1, 0, 0);
        }
        acc.globalCompositeOperation = 'source-over'; acc.globalAlpha = 1; acc.setTransform(bs, 0, 0, bs, 0, 0);
        ctx.save(); L.resetTransform(ctx); ctx.globalAlpha = a; ctx.drawImage(c, 0, 0, W, H); ctx.restore();
        return;
      }
      NS.drawWorld(ctx, T);
      drawCopy(ctx, T);
    }
  });
})();
