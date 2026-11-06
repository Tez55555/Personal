/* ==========================================================================
   s1-hook-space-available (0–2.8 s)  +  the shared continuous shot used by s2.

   One camera, one world. The hook hoarding (SPACE AVAILABLE -> BOOKED -> for you)
   stands in a Lucknow night city; s2 draws the very same world (MMH.world), so the
   2.5–2.8 handover is invisible and the pull-back is one unbroken move.

   2.5D model: every layer is a plane at depth d (hook hoarding d = 1, wide-shot camera c = 0).
     screen = P + (p - P)·k + E/(d - c),   k = d/(d - c)
   Layer-local coordinates are the WIDE-SHOT (3.3–4.9 s) screen coordinates, so the s2 layout
   reads directly. The hook hoarding is authored in its frame-0 coordinates (face x100–980,
   y470–1290) and mapped into its layer by a fixed .341 scale.
   Depth of field: the close-up focuses on the hook face (far city = bokeh); the aperture closes
   during the pull-back so the wide shot is deep-focus (rack focus for free).
   ========================================================================== */
(function () {
  'use strict';
  const L = window.L, Ez = L.ease;
  const H = window.MMH = window.MMH || {};
  const clamp = L.clamp, lerp = L.lerp, rnd = L.rnd;
  const C = H.C = {
    sky: '#25203F', rich: '#1C1A1A', ink: '#2B2728', ink2: '#3A3536', stone: '#8C8783', mist: '#C9C4BF',
    muslin: '#EEECE8', paper: '#F4F2EE', red: '#D2232E', violet: '#3F3593',
    amber: '#FFB547', marigold: '#F59E1B', gold: '#FFC24A', amber2: '#FF9F1C', tube: '#F4F6FF', core: '#FFF4CF', white: '#FFFFFF',
    far: '#2A2533', midB: '#2B2728', midF: '#272324', near: '#221F20', steel: '#171416',
  };
  const q = L.q;
  const TM = H.TM = {
    drop: q(.233), hit: q(.4), settle: q(.8), write0: q(1.0), write1: q(1.467), hi0: q(1.3), hi1: q(1.567), flare: q(1.6),
    pull0: q(2.2), pull1: q(2.8), pull2: q(3.3), whip0: q(4.933), whip1: q(5.2),
    // s2 beats
    b4: q(2.8), b5: q(3.4), b6: q(4.0), b7: q(4.6),
  };
  const FR = T => Math.round(T * 30);
  const DEG = Math.PI / 180;

  /* ------------------------------------------------------------------ sprites */
  const glowSpr = col => L.cached('mmh-g-' + col, 96, 96, g => { const r = g.createRadialGradient(48, 48, 0, 48, 48, 48); r.addColorStop(0, L.rgba(col, 1)); r.addColorStop(.14, L.rgba(col, .5)); r.addColorStop(.42, L.rgba(col, .13)); r.addColorStop(1, L.rgba(col, 0)); g.fillStyle = r; g.fillRect(0, 0, 96, 96); });
  const bulbSpr = col => L.cached('mmh-b-' + col, 64, 64, g => { let r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, L.rgba(col, .55)); r.addColorStop(.3, L.rgba(col, .18)); r.addColorStop(1, L.rgba(col, 0)); g.fillStyle = r; g.fillRect(0, 0, 64, 64); r = g.createRadialGradient(32, 32, 0, 32, 32, 7); r.addColorStop(0, '#FFFFFF'); r.addColorStop(.45, L.mix(col, '#FFFFFF', .5)); r.addColorStop(1, L.rgba(col, 0)); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
  const discSpr = col => L.cached('mmh-d-' + col, 96, 96, g => { const r = g.createRadialGradient(48, 48, 0, 48, 48, 47); r.addColorStop(0, L.rgba(col, .46)); r.addColorStop(.7, L.rgba(col, .55)); r.addColorStop(.87, L.rgba(col, .72)); r.addColorStop(1, L.rgba(col, 0)); g.fillStyle = r; g.fillRect(0, 0, 96, 96); });
  const softSpr = col => L.cached('mmh-s-' + col, 64, 64, g => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, L.rgba(col, 1)); r.addColorStop(.5, L.rgba(col, .45)); r.addColorStop(1, L.rgba(col, 0)); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
  function put(g, img, x, y, r, a) { if (a <= .004 || r <= .05) return; g.globalAlpha = Math.min(1, a); g.drawImage(img, x - r, y - r, r * 2, r * 2); }
  /** a point light in layer coords: crisp bulb when in focus, lens bokeh disc when defocused */
  function lamp(g, x, y, size, col, a, k, blur) {
    const bl = blur / k;
    if (bl > 2) { const r = Math.max(size * 1.4, bl); put(g, discSpr(col), x, y, r, a * clamp(Math.pow(size * 3 / r, 1.1), .16, .9)); return; }
    put(g, bulbSpr(col), x, y, size * 4.5, a);
  }
  function setBlur(g, px) { g.filter = px > .6 ? `blur(${(px * L.baseScale).toFixed(2)}px)` : 'none'; }

  /* ------------------------------------------------------------------ camera */
  const SW = .341, P = { x: 540, y: 960 }, ANCH = { x: 120 + 440 * SW, y: 1050 + 410 * SW };
  const LS0 = Math.log(1.015), LS1 = Math.log(.62), LS2 = Math.log(SW), VJ = -2.3;
  const herm = (p0, p1, m0, m1, u) => { const u2 = u * u, u3 = u2 * u; return (2 * u3 - 3 * u2 + 1) * p0 + (u3 - 2 * u2 + u) * m0 + (3 * u2 - 2 * u3) * p1 + (u3 - u2) * m1; };
  function hookScale(T) {
    if (T <= TM.pull0) return 1 + .015 * Math.sin(Math.PI / 2 * clamp(T / TM.pull0));
    if (T <= TM.pull1) { const h = TM.pull1 - TM.pull0; return Math.exp(herm(LS0, LS1, 0, VJ * h, (T - TM.pull0) / h)); }
    if (T <= TM.pull2) { const h = TM.pull2 - TM.pull1; return Math.exp(herm(LS1, LS2, VJ * h, 0, (T - TM.pull1) / h)); }
    return SW;
  }
  const ramp = (T, a, w) => T < a ? 0 : T < a + w ? (T - a) * (T - a) / (2 * w) : T - a - w / 2;
  H.cam = T => {
    const s = hookScale(T), c = 1 - SW / s;
    const pr = clamp((LS0 - Math.log(s)) / (LS0 - LS2)), f = pr * pr;          // crane rises with the pull-back
    const ax = lerp(540, ANCH.x, f), ay = lerp(880, ANCH.y, f);
    let ex = (ax - P.x) * (1 - c) - (ANCH.x - P.x), ey = (ay - P.y) * (1 - c) - (ANCH.y - P.y);
    ex -= 20 * ramp(T, 2.95, .5);                                              // lateral drift: far 5, mid 10, hook 20 px/s
    const w = Ez.inOutCubic(clamp((T - TM.whip0) / (TM.whip1 - TM.whip0)));
    ex -= 1400 * w;                                                            // whip-pan right into s3
    const ap = 22 * Math.pow(clamp(c / .664), 1.6);                           // aperture (shallow close, deep wide)
    return { T, s, c, ex, ey, w, ap, zf: 1 - c };
  };
  /** run fn inside depth layer d. fn(g, k, blur) with blur = circle of confusion in screen px */
  H.layer = (ctx, cam, d, fn) => {
    const z = d - cam.c; if (z <= .02) return;
    const k = d / z;
    ctx.save(); ctx.translate(P.x + cam.ex / z, P.y + cam.ey / z); ctx.scale(k, k); ctx.translate(-P.x, -P.y);
    fn(ctx, k, cam.ap * Math.abs(z - cam.zf) / z, z);
    ctx.restore();
  };
  function shakeAt(T) {
    const f = FR(T), h = FR(TM.hit); let x = 0, y = 0;
    const tab = [[7, -6], [-6, 4], [3, -3], [-1, 1]];
    if (f >= h && f < h + 4) { x = tab[f - h][0]; y = tab[f - h][1]; }
    for (const tb of [TM.b4, TM.b5, TM.b6]) { const b = FR(tb); if (f === b) { x += 3; y -= 4; } else if (f === b + 1) { x -= 2; y += 2; } }
    return { x, y };
  }

  /* ------------------------------------------------------------------ cached layers (sharp + defocused) */
  function layerCache(key, x0, y0, w, h, blurPx, paint) {
    const sharp = L.cached('mmh-' + key, w, h, g => { g.translate(-x0, -y0); paint(g); });
    const soft = L.cached('mmh-' + key + '-soft', w, h, g => { g.filter = `blur(${blurPx}px)`; g.drawImage(sharp, 0, 0); g.filter = 'none'; });
    return { sharp, soft, x0, y0, b: blurPx };
  }
  function drawLC(g, lc, k, blur) {
    const wB = clamp(blur / (lc.b * k));
    if (wB > .03) { g.globalAlpha = Math.min(1, wB * 2); g.drawImage(lc.soft, lc.x0, lc.y0); }
    if (wB < .97) { g.globalAlpha = 1 - (wB > .03 ? wB : 0); g.drawImage(lc.sharp, lc.x0, lc.y0); }
    g.globalAlpha = 1;
  }
  /** fill a path twice: a Stone rim 2px above, then the body (the art direction's "2 px Stone top-edge highlight") */
  function rimFill(g, pathFn, col, rimA) {
    g.save(); g.translate(0, -2); g.fillStyle = L.rgba(C.stone, rimA); pathFn(g); g.restore();
    g.fillStyle = col; pathFn(g);
  }

  /* ------------------------------------------------------------------ far layer: Lucknow silhouettes */
  function rumiDarwaza(g, cx, base, s) {
    const X = v => cx + v * s, Y = v => base - v * s;
    const dome = (x, y, r) => { g.beginPath(); g.moveTo(x - r, y); g.quadraticCurveTo(x - r, y - r * 1.25, x, y - r * 1.55); g.quadraticCurveTo(x + r, y - r * 1.25, x + r, y); g.closePath(); g.fill(); g.fillRect(x - .9 * s, y - r * 1.55 - 7 * s, 1.8 * s, 7 * s); };
    g.fillRect(X(-150), Y(112), 300 * s, 112 * s);                                        // wings
    for (let i = 0; i < 9; i++) { const x = -146 + i * 36.5; g.fillRect(X(x), Y(120), 6 * s, 8 * s); }   // parapet merlons
    for (const sx of [-1, 1]) { g.fillRect(X(sx * 142 - 5), Y(150), 10 * s, 150 * s); dome(X(sx * 142), Y(150), 7 * s); }
    g.beginPath(); g.moveTo(X(-64), Y(0)); g.lineTo(X(-64), Y(200));                     // central iwan with cusped crown
    for (let i = 0; i <= 16; i++) { const p = i / 16; const hh = 200 + 62 * Math.pow(Math.sin(p * Math.PI), 1.5) + (i % 2 ? 0 : 7); g.lineTo(X(lerp(-64, 64, p)), Y(hh)); }
    g.lineTo(X(64), Y(0)); g.closePath(); g.fill();
    for (const sx of [-1, 1]) { g.fillRect(X(sx * 70 - 6), Y(236), 12 * s, 236 * s); dome(X(sx * 70), Y(236), 9 * s); }  // flanking turrets
    g.fillRect(X(-16), Y(286), 32 * s, 26 * s); g.fillRect(X(-20), Y(262), 40 * s, 4 * s);   // chhatri
    dome(X(0), Y(286), 17 * s);
    g.save(); g.globalCompositeOperation = 'destination-out';
    const arch = (x, w, h) => { g.beginPath(); g.moveTo(X(x - w), Y(0)); g.lineTo(X(x - w), Y(h - w * 1.1)); g.quadraticCurveTo(X(x - w), Y(h - w * .2), X(x), Y(h)); g.quadraticCurveTo(X(x + w), Y(h - w * .2), X(x + w), Y(h - w * 1.1)); g.lineTo(X(x + w), Y(0)); g.closePath(); g.fill(); };
    arch(0, 34, 168); for (const x of [-118, -92, 92, 118]) arch(x, 8, 62);
    for (let i = 0; i < 6; i++) arch(-50 + i * 20, 3.5, 222 - Math.abs(i - 2.5) * 6 - 20);
    g.restore();
  }
  function clockTower(g, cx, base, s) {
    const X = v => cx + v * s, Y = v => base - v * s;
    g.fillRect(X(-30), Y(70), 60 * s, 70 * s); g.fillRect(X(-22), Y(236), 44 * s, 236 * s);
    g.fillRect(X(-27), Y(240), 54 * s, 8 * s); g.fillRect(X(-27), Y(196), 54 * s, 6 * s);
    for (const sx of [-1, 1]) { g.fillRect(X(sx * 24 - 3), Y(262), 6 * s, 26 * s); }
    g.beginPath(); g.moveTo(X(-20), Y(240)); g.quadraticCurveTo(X(-20), Y(282), X(0), Y(300)); g.quadraticCurveTo(X(20), Y(282), X(20), Y(240)); g.fill();
    g.fillRect(X(-1), Y(318), 2 * s, 20 * s);
    g.save(); g.globalCompositeOperation = 'destination-out'; L.circle(g, X(0), Y(218), 12 * s); g.fill(); g.restore();
  }
  function domes(g, cx, base, s, seed) {
    const X = v => cx + v * s, Y = v => base - v * s;
    g.fillRect(X(-120), Y(70), 240 * s, 70 * s);
    for (let i = 0; i < 3; i++) { const x = -70 + i * 70, r = i === 1 ? 34 : 22, y0 = i === 1 ? 104 : 86; g.fillRect(X(x - r), Y(y0), r * 2 * s, (y0 - 60) * s); g.beginPath(); g.ellipse(X(x), Y(y0), r * s, r * 1.15 * s, 0, Math.PI, 0); g.fill(); g.fillRect(X(x - 1), Y(y0 + r * 1.15 + 10), 2 * s, 12 * s); }
    for (const x of [-118, 118]) { g.fillRect(X(x - 5), Y(150), 10 * s, 150 * s); g.beginPath(); g.ellipse(X(x), Y(150), 7 * s, 9 * s, 0, Math.PI, 0); g.fill(); }
  }
  let FAR = null;
  const FAR_BASE = 1036;
  function farLayer() {
    if (FAR) return FAR;
    const base = FAR_BASE;
    const sil = L.cached('mmh-farsil', 2700, 640, g => {
      g.translate(700, -540); g.fillStyle = '#000';
      for (let i = 0, x = -700; x < 2000; i++) {                                         // low old-city fabric
        const w = 36 + rnd(501, i) * 80, h = 18 + Math.pow(rnd(502, i), 1.6) * 70; g.fillRect(x, base - h, w + 1, h + 40);
        if (rnd(503, i) > .74) { const mx = x + w * rnd(504, i); g.fillRect(mx - 3, base - h - 46, 6, 46); g.beginPath(); g.ellipse(mx, base - h - 46, 5, 7, 0, Math.PI, 0); g.fill(); }
        if (rnd(505, i) > .8) { g.beginPath(); g.ellipse(x + w / 2, base - h, w * .3, w * .32, 0, Math.PI, 0); g.fill(); }
        x += w;
      }
      rumiDarwaza(g, 540, base, 1.12); clockTower(g, 66, base, 1.05);
      domes(g, -330, base, 1.0); domes(g, 1290, base, .9); clockTower(g, 1700, base, .85); rumiDarwaza(g, 2000, base, .8);
    });
    FAR = layerCache('far', -700, 560, 2700, 580, 7, g => {
      const gr = g.createLinearGradient(0, 700, 0, base + 20);                            // warm Diwali light-pollution at the horizon
      gr.addColorStop(0, 'rgba(255,150,70,0)'); gr.addColorStop(.5, 'rgba(255,140,70,.08)'); gr.addColorStop(1, 'rgba(255,128,64,.22)');
      g.fillStyle = gr; g.fillRect(-700, 700, 2700, base + 20 - 700);
      for (const [x, r] of [[540, 330], [66, 200], [1700, 200]]) {                       // city glow back-lighting the landmarks
        const bg = g.createRadialGradient(x, base - 160, 0, x, base - 160, r); bg.addColorStop(0, 'rgba(150,110,170,.16)'); bg.addColorStop(1, 'rgba(150,110,170,0)');
        g.fillStyle = bg; g.fillRect(x - r, base - 160 - r, r * 2, r * 2);
      }
      const tint = L.cached('mmh-farsil-t', 2700, 640, t => { t.drawImage(sil, 0, 0); t.globalCompositeOperation = 'source-in'; t.fillStyle = '#1E1A25'; t.fillRect(0, 0, 2700, 640); });
      const rim = L.cached('mmh-farsil-r', 2700, 640, t => { t.drawImage(sil, 0, 0); t.globalCompositeOperation = 'source-in'; t.fillStyle = L.rgba('#A39AA8', .38); t.fillRect(0, 0, 2700, 640); });
      g.drawImage(rim, -700, 540 - 2.5); g.drawImage(tint, -700, 540);
    });
    return FAR;
  }
  function drawFar(g, T, k, blur) {
    drawLC(g, farLayer(), k, blur);
    g.save(); g.globalCompositeOperation = 'lighter';                                    // lit clock faces, a lamp in the chhatri
    lamp(g, 66, FAR_BASE - 218 * 1.05, 6, '#FFD9A0', .6, k, blur); lamp(g, 1700, FAR_BASE - 218 * .85, 5, '#FFD9A0', .45, k, blur);
    lamp(g, 540, FAR_BASE - 286 * 1.12 + 8, 3, '#FFC24A', .5, k, blur);
    g.restore();
  }

  /* ------------------------------------------------------------------ mid layer: the city blocks */
  // [x, w, top, style]  back row (taller) then front row (lower, older)
  // wide layout: U1 left (on the x140–350 roof), the Rumi Darwaza rising in a central valley, L1 + W1 on the right
  const BACK = [[-560, 140, 900, 'block'], [-420, 120, 830, 'tower'], [-300, 150, 920, 'block'], [-150, 110, 860, 'tower'], [-40, 180, 965, 'block'],
    [140, 210, 1000, 'block'], [350, 90, 995, 'haveli'], [440, 120, 1012, 'block'], [560, 130, 985, 'haveli'], [690, 140, 862, 'block'],
    [830, 210, 662, 'tower'], [1040, 180, 880, 'block'], [1220, 170, 950, 'jhalar'], [1390, 120, 840, 'tower'], [1510, 180, 920, 'block'],
    [1690, 150, 860, 'jhalar'], [1840, 180, 900, 'block']];
  const FRONT = [[-560, 180, 1080, 'haveli'], [-380, 170, 1030, 'block'], [-210, 190, 1100, 'haveli'], [-20, 160, 1042, 'jhalar'],
    [140, 230, 1120, 'block'], [370, 200, 1032, 'jhalar'], [570, 120, 1092, 'haveli'], [690, 180, 1122, 'block'], [870, 210, 1052, 'haveli'],
    [1080, 190, 1100, 'block'], [1270, 170, 1010, 'haveli'], [1440, 200, 1070, 'block'], [1640, 180, 1020, 'jhalar'], [1820, 220, 1090, 'haveli']];
  const MID_BASE = 1760;
  const LIGHTCOLS = ['#FFC24A', '#FFE7A3', '#FF9F1C', '#FF5C8A'];
  let MIDL = null;
  function midLights() {
    if (MIDL) return MIDL;
    const bulbs = [], diyas = [], shops = [];
    const add = (arr, o) => arr.push(o);
    const strip = (x0, x1, y, n, seed, mode) => { for (let i = 0; i < n; i++) { const p = (i + .5) / n; const x = lerp(x0, x1, p); const scal = Math.abs(Math.sin(p * Math.PI * Math.max(1, Math.round((x1 - x0) / 55)))) * 5; add(bulbs, { x, y: y + 3 + scal, i, seed, mode, s: 2, col: LIGHTCOLS[(i + seed) % 4] }); } };
    const cascade = (x, y0, len, seed) => { const n = Math.floor(len / 10); for (let j = 0; j < n; j++) add(bulbs, { x: x + Math.sin(j * .7 + seed) * .8, y: y0 + 6 + j * 10, i: j, seed, mode: 'fall', s: 1.8, col: j % 3 ? '#FFC24A' : '#FFE7A3' }); };
    const swag = (x0, y0, x1, y1, sag, n, seed) => { for (let i = 0; i < n; i++) { const p = (i + .5) / n; add(bulbs, { x: lerp(x0, x1, p), y: lerp(y0, y1, p) + sag * 4 * p * (1 - p), i, seed, mode: 'twinkle', s: 1.9, col: LIGHTCOLS[(i + seed) % 4] }); } };
    [...BACK.map(b => [b, 0]), ...FRONT.map(b => [b, 1])].forEach(([b, row], bi) => {
      const [x, w, top, style] = b;
      if (style === 'jhalar' || (rnd(611, bi) > .5 && row === 1)) {
        strip(x + 3, x + w - 3, top, Math.floor(w / 8), bi, bi % 2 ? 'chase' : 'twinkle');
        const nc = Math.max(3, Math.floor(w / 22)); for (let v = 0; v < nc; v++) cascade(x + 8 + v * (w - 16) / (nc - 1), top, 110 + rnd(612, bi * 9 + v) * 150, bi * 7 + v);
      } else if (rnd(613, bi) > .25) {
        const n = Math.floor(w / 12); for (let i = 0; i < n; i++) add(diyas, { x: x + 6 + i * (w - 12) / Math.max(1, n - 1), y: top - 2, s: bi * 31 + i });
      }
    });
    swag(-20, 1046, 140, 1004, 22, 14, 3); swag(570, 1096, 690, 1126, 26, 11, 5); swag(980, 1058, 1080, 1104, 20, 9, 7); swag(1040, 884, 1220, 954, 30, 13, 9);
    swag(350, 1000, 440, 1016, 16, 8, 11); swag(-300, 924, -150, 864, 26, 13, 13);
    // street level (visible as bokeh under the hook hoarding at frame 0): shop glows + strings across the lanes
    for (let i = 0; i < 26; i++) { const x = -300 + i * 92 + rnd(621, i) * 40; add(shops, { x, y: 1530 + rnd(622, i) * 120, w: 40 + rnd(623, i) * 50, col: rnd(624, i) > .35 ? '#FFB547' : '#F4F6FF', a: .35 + rnd(625, i) * .35 }); }
    for (let i = 0; i < 9; i++) { const x0 = -200 + i * 260; for (let j = 0; j < 9; j++) { const p = (j + .5) / 9; add(bulbs, { x: x0 + p * 220, y: 1440 + rnd(626, i) * 80 + Math.sin(p * Math.PI) * 40, i: j, seed: 90 + i, mode: 'twinkle', s: 2.2, col: ['#FFC24A', '#FF9F1C', '#FFE7A3'][j % 3] }); } }
    MIDL = { bulbs, diyas, shops };
    return MIDL;
  }
  const WALLS = ['#2B2728', '#2D292B', '#29252A', '#2E2A29', '#2A2629'];
  function paintBuilding(g, b, col, row, bi) {
    const [x, w, top, style] = b, base = MID_BASE;
    const R = (k) => rnd(700 + bi, k);
    const wall = row ? L.mix(WALLS[bi % 5], '#000000', .1) : WALLS[bi % 5];
    rimFill(g, gg => gg.fillRect(x, top, w, base - top), wall, row ? .5 : .42);
    // a faint vertical shade so blocks read as volumes, not stickers
    const sg = g.createLinearGradient(x, 0, x + w, 0); sg.addColorStop(0, 'rgba(255,255,255,.025)'); sg.addColorStop(.8, 'rgba(0,0,0,0)'); sg.addColorStop(1, 'rgba(0,0,0,.18)');
    g.fillStyle = sg; g.fillRect(x, top, w, base - top);
    const arch = style === 'haveli', tower = style === 'tower';
    const cw = arch ? 26 : tower ? 18 : 22, rh = arch ? 40 : tower ? 26 : 30, ww = arch ? 12 : tower ? 9 : 11, wh = arch ? 20 : tower ? 13 : 15;
    const cols = Math.max(1, Math.floor((w - 14) / cw)), rows = Math.floor((base - top - 30) / rh);
    const ox = x + (w - cols * cw) / 2 + (cw - ww) / 2;
    for (let r = 0; r < rows; r++) {
      const wy = top + 22 + r * rh;
      const occ = R(5000 + r);                                                         // floors are lived in (or not) as a whole
      if (arch || r % 3 === 2) { g.fillStyle = 'rgba(70,64,66,.55)'; g.fillRect(x + 2, wy - 6, w - 4, 3); }          // chhajja / ledge
      if (!arch && !tower && R(6000 + r) > .72) {                                      // balcony slab + railing
        g.fillStyle = 'rgba(16,14,15,.8)'; g.fillRect(x + 4, wy + wh + 2, w - 8, 4);
        g.fillStyle = 'rgba(140,135,131,.28)'; g.fillRect(x + 4, wy + wh - 6, w - 8, 1); for (let rx = x + 6; rx < x + w - 6; rx += 5) g.fillRect(rx, wy + wh - 6, .8, 8);
      }
      for (let c = 0; c < cols; c++) {
        const wx = ox + c * cw, v = R(r * 50 + c);
        let fill = 'rgba(14,12,14,.6)';
        if (occ > .45) { if (v > .45) fill = v > .9 ? 'rgba(255,176,92,.34)' : v > .72 ? 'rgba(255,181,71,.16)' : 'rgba(201,196,191,.12)'; }
        else if (v > .93) fill = 'rgba(214,220,236,.2)';
        g.fillStyle = fill;
        if (arch) { g.beginPath(); g.moveTo(wx, wy + wh); g.lineTo(wx, wy + 6); g.quadraticCurveTo(wx, wy, wx + ww / 2, wy - 3); g.quadraticCurveTo(wx + ww, wy, wx + ww, wy + 6); g.lineTo(wx + ww, wy + wh); g.closePath(); g.fill(); }
        else g.fillRect(wx, wy, ww, wh);
        if (fill.includes('.34')) { g.fillStyle = 'rgba(60,24,20,.55)'; g.fillRect(wx + ww * .55, wy, ww * .45, wh); }             // curtain
        if (!arch && v < .08) { g.fillStyle = 'rgba(120,116,112,.5)'; g.fillRect(wx + ww + 1, wy + wh - 6, 6, 5); }                      // AC unit
      }
    }
    // roof clutter: Sintex tank, mumty, dish, TV aerial, chhatris on havelis
    g.fillStyle = row ? '#1C191A' : '#201C1E';
    if (style === 'haveli') {
      for (let i = 0; i < Math.floor(w / 9); i++) g.fillRect(x + 2 + i * 9, top - 7, 5, 7);
      for (const cx of [x + 10, x + w - 10]) { g.fillRect(cx - 7, top - 22, 14, 22); g.beginPath(); g.ellipse(cx, top - 22, 9, 10, 0, Math.PI, 0); g.fill(); g.fillRect(cx - .8, top - 38, 1.6, 7); }
    } else {
      if (R(900) > .3) { const tx = x + w * (.2 + R(901) * .5); g.fillRect(tx - 2, top - 8, 2, 8); g.fillRect(tx + 22, top - 8, 2, 8); g.fillRect(tx - 3, top - 30, 30, 23); g.fillStyle = 'rgba(140,135,131,.35)'; g.fillRect(tx - 3, top - 30, 30, 1.5); g.fillRect(tx - 3, top - 22, 30, 1); g.fillRect(tx - 3, top - 15, 30, 1); g.fillStyle = row ? '#1C191A' : '#201C1E'; }
      if (R(902) > .5) { const mx = x + w * (.55 + R(903) * .3); g.fillRect(mx, top - 26, 32, 26); g.fillStyle = 'rgba(255,181,71,.18)'; g.fillRect(mx + 11, top - 20, 9, 18); g.fillStyle = row ? '#1C191A' : '#201C1E'; }
      if (R(904) > .55) { const ax = x + w * (.15 + R(905) * .7); g.fillRect(ax - .8, top - 56, 1.6, 56); for (let j = 0; j < 4; j++) g.fillRect(ax - 9 + j, top - 50 + j * 7, 18 - j * 2, 1.4); }
      if (R(906) > .6) { const dx = x + w * (.1 + R(907) * .8); g.save(); g.translate(dx, top - 9); g.rotate(-.5); g.beginPath(); g.ellipse(0, 0, 8, 4.5, 0, 0, 7); g.fill(); g.restore(); g.fillRect(dx - .8, top - 9, 1.6, 9); }
    }
    if (style === 'tower') { g.fillStyle = 'rgba(140,135,131,.22)'; for (let r = 0; r < rows; r += 4) g.fillRect(x, top + 16 + r * rh, w, 1); }
  }
  let MIDC = null;
  function midLayer() {
    if (MIDC) return MIDC;
    MIDC = layerCache('mid', -560, 640, 2560, MID_BASE - 640, 9, g => {
      BACK.forEach((b, i) => paintBuilding(g, b, C.midB, 0, i));
      // haze between the rows (depth inside the layer)
      const hz = g.createLinearGradient(0, 950, 0, 1250); hz.addColorStop(0, 'rgba(60,48,80,0)'); hz.addColorStop(1, 'rgba(60,48,80,.25)');
      g.fillStyle = hz; g.fillRect(-560, 950, 2560, 300);
      FRONT.forEach((b, i) => paintBuilding(g, b, C.midF, 1, i + 40));
      // street canyon at the bottom: dark, with shop-shutters
      const st = g.createLinearGradient(0, 1380, 0, MID_BASE); st.addColorStop(0, 'rgba(28,26,26,0)'); st.addColorStop(1, 'rgba(28,26,26,.85)');
      g.fillStyle = st; g.fillRect(-560, 1380, 2560, MID_BASE - 1380);
      // power lines sagging across the blocks (every Indian skyline has them)
      g.strokeStyle = 'rgba(10,8,10,.7)'; g.lineWidth = 1.3;
      for (const [x0, y0, x1, y1, s] of [[-560, 1150, 400, 1120, 40], [400, 1120, 1300, 1170, 50], [1300, 1170, 2000, 1140, 40], [-560, 1180, 600, 1200, 50], [600, 1200, 2000, 1190, 60]]) {
        g.beginPath(); for (let i = 0; i <= 30; i++) { const p = i / 30; const x = lerp(x0, x1, p), y = lerp(y0, y1, p) + s * 4 * p * (1 - p); i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
      }
    });
    return MIDC;
  }
  /** aerial perspective over the far boards (drawn after the d2 boards, before the d2 lights) */
  function midFog(g) {
    const fg = g.createLinearGradient(0, 640, 0, 1200); fg.addColorStop(0, 'rgba(38,32,58,.30)'); fg.addColorStop(1, 'rgba(38,32,58,.12)');
    g.fillStyle = fg; g.fillRect(-600, 640, 2700, 560);
  }
  function drawMid(g, T, k, blur) {
    drawLC(g, midLayer(), k, blur);
  }
  function drawMidLights(g, T, k, blur) {
    const ML = midLights(); const bl = blur / k;
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const s of ML.shops) {                                                         // shopfront glows (street level)
      const a = s.a * (.85 + .15 * L.noise1(T * 2 + s.x, 5));
      put(g, softSpr(s.col), s.x, s.y, s.w * .8 + bl, a * .5);
    }
    const pulse = 1 + .35 * Math.exp(-Math.pow((T - TM.b7 - .05) / .06, 2));          // beat-7 pulse
    for (const b of ML.bulbs) {
      let v = 1;
      if (b.mode === 'chase') v = ((Math.floor(T * 8) + b.i) % 3 === 0) ? 1 : .35;
      else if (b.mode === 'twinkle') v = .45 + .55 * L.noise1(T * 2.4 + b.i * 3.1, b.seed);
      else if (b.mode === 'fall') { const ph = ((T * 1.6 + b.seed * .37) % 1.6) / 1.6; const head = ph * 22; const d = head - b.i; v = d >= 0 && d < 5 ? 1 - d / 5 * .7 : .28; }
      lamp(g, b.x, b.y, b.s, b.col, v * .95 * pulse, k, blur);
    }
    for (const d of ML.diyas) {
      const fl = .7 + .3 * L.noise1(T * 9 + d.s, 3);
      lamp(g, d.x, d.y, 1.7, '#FFB547', fl * pulse, k, blur);
    }
    g.restore();
  }

  /* ------------------------------------------------------------------ flyover (d 1.15) */
  let FLYC = null;
  function flyLayer() {
    if (FLYC) return FLYC;
    FLYC = layerCache('fly', -700, 1380, 3400, 640, 5, g => {
      const y0 = 1530;
      // the market street under the flyover: shopfronts with warm interiors, awnings and torans
      const st = g.createLinearGradient(0, 1590, 0, 2020); st.addColorStop(0, '#1A1718'); st.addColorStop(1, '#151314');
      g.fillStyle = st; g.fillRect(-700, 1590, 3400, 430);
      const mk = L.cached('mmh-market', 3400, 300, m => {                                  // drawn sharp, then softened: it lives in the shadow under the deck
        m.translate(700, -1640);
        for (let i = 0, x = -700; x < 2700; i++) {
          const w = 60 + rnd(801, i) * 90, top = 1720 + rnd(802, i) * 50, gapW = rnd(805, i) > .75 ? 20 + rnd(806, i) * 30 : 4;
          m.fillStyle = '#1D1A1B'; m.fillRect(x, top - 46, w - gapW, 300);
          const warm = rnd(803, i) > .3; const a = .08 + rnd(804, i) * .2;
          const ig = m.createLinearGradient(0, top, 0, top + 110); ig.addColorStop(0, warm ? `rgba(255,170,80,${a})` : `rgba(214,220,236,${a * .7})`); ig.addColorStop(1, 'rgba(255,150,70,0)');
          m.fillStyle = ig; m.fillRect(x + 6, top, w - gapW - 12, 140);
          m.fillStyle = 'rgba(0,0,0,.3)'; for (let sx = x + 8; sx < x + w - gapW - 8; sx += 4) m.fillRect(sx, top + 2, 1, 70 * rnd(807, i));   // half-rolled shutters
          m.fillStyle = '#2B2728'; m.fillRect(x - 2, top - 14, w - gapW + 2, 10); m.fillStyle = 'rgba(140,135,131,.4)'; m.fillRect(x - 2, top - 14, w - gapW + 2, 1.2);
          const nf = Math.floor((w - gapW - 8) / 8);
          for (let f = 0; f < nf; f++) { m.fillStyle = f % 2 ? 'rgba(242,178,62,.55)' : 'rgba(224,110,30,.55)'; L.circle(m, x + 3 + f * 8, top - 2 + Math.sin(f / nf * Math.PI) * 4, 2.2); m.fill(); }
          if (rnd(808, i) > .4) { m.fillStyle = `rgba(244,242,238,${(.05 + rnd(809, i) * .07).toFixed(3)})`; m.fillRect(x + 8, top - 40, w - gapW - 16, 18); }   // signboard
          x += w;
        }
      });
      g.save(); g.filter = 'blur(2.2px)'; g.drawImage(mk, -700, 1640); g.restore();
      const ds = g.createLinearGradient(0, 1596, 0, 1720); ds.addColorStop(0, 'rgba(10,8,9,.85)'); ds.addColorStop(1, 'rgba(10,8,9,0)');   // deck shadow
      g.fillStyle = ds; g.fillRect(-700, 1596, 3400, 124);
      // piers: a V-chevron cap on a pillar (the mark's chevron, in concrete)
      for (let x = -640; x < 2700; x += 310) {
        rimFill(g, gg => { gg.beginPath(); gg.moveTo(x - 46, y0 + 66); gg.lineTo(x + 46, y0 + 66); gg.lineTo(x + 20, y0 + 118); gg.lineTo(x + 20, 2020); gg.lineTo(x - 20, 2020); gg.lineTo(x - 20, y0 + 118); gg.closePath(); gg.fill(); }, '#242022', .3);
        g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x + 6, y0 + 118, 14, 900);
      }
      // deck fascia + soffit shadow
      rimFill(g, gg => gg.fillRect(-700, y0, 3400, 66), C.ink, .75);
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(-700, y0 + 58, 3400, 8);
      g.fillStyle = 'rgba(140,135,131,.18)'; for (let x = -700; x < 2700; x += 155) g.fillRect(x, y0 + 4, 2, 54);       // expansion joints
      // crash barrier on top
      g.fillStyle = '#1E1B1C'; g.fillRect(-700, y0 - 14, 3400, 14);
      g.fillStyle = 'rgba(140,135,131,.4)'; g.fillRect(-700, y0 - 14, 3400, 1.5);
      for (let x = -700; x < 2700; x += 22) { g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(x, y0 - 12, 3, 12); }
      // sodium street-lamp poles (kept clear of the G1 gantry)
      for (const x of LAMPX) { g.fillStyle = '#1A1718'; g.fillRect(x - 2, y0 - 120, 4, 106); g.fillRect(x - 2, y0 - 122, 26, 4); g.fillRect(x + 18, y0 - 124, 14, 6); }
    });
    return FLYC;
  }
  const LAMPX = [-560, -230, 90, 830, 1140, 1450, 1760, 2070, 2380];
  function drawFly(g, T, k, blur) {
    const y0 = 1530;
    drawLC(g, flyLayer(), k, blur);
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const x of LAMPX) {                                                            // sodium lamps + pools
      lamp(g, x + 25, y0 - 117, 3, '#FFB06A', .9, k, blur);
      put(g, softSpr('#FF9F4A'), x + 25, y0 - 20, 90, .10);
    }
    for (let i = 0; i < 40; i++) {                                                      // market string lights + street traffic below the deck
      const x = -650 + i * 85, y = 1652 + Math.sin(i * 1.7) * 6;
      lamp(g, x, y, 2.2, LIGHTCOLS[i % 4], .45 + .45 * L.noise1(T * 2 + i, 8), k, blur);
    }
    for (let i = 0; i < 10; i++) {
      const sp = 160 + rnd(841, i) * 120, span = 3400, x = ((rnd(842, i) * span + T * sp * (i % 2 ? 1 : -1)) % span + span) % span - 700;
      lamp(g, x, 1872 + (i % 2) * 10, 3, i % 2 ? '#FFF2DC' : '#FF4A3A', .5, k, blur);
    }
    // traffic: long-exposure head/tail-light streaks moving left -> right on the deck
    for (let i = 0; i < 26; i++) {
      const red = i % 3 === 0, sp = 380 + rnd(811, i) * 260, span = 3600;
      const x = ((rnd(812, i) * span + T * sp) % span) - 800, y = y0 - 22 - (red ? 0 : 5) - rnd(813, i) * 4;
      const len = 46 + rnd(814, i) * 50, col = red ? C.red : '#FFF2DC';
      const gr = g.createLinearGradient(x - len, 0, x, 0); gr.addColorStop(0, L.rgba(col, 0)); gr.addColorStop(1, L.rgba(col, red ? .55 : .7));
      g.globalAlpha = 1; g.fillStyle = gr; g.fillRect(x - len, y - 1.6, len, 3.2);
      lamp(g, x, y, red ? 1.8 : 2.2, red ? '#FF4A3A' : '#FFFFFF', red ? .6 : .85, k, blur);
    }
    g.restore();
  }

  /* ------------------------------------------------------------------ H2 rooftop block (d 1.3) */
  let H2C = null;
  function h2Layer() {
    if (H2C) return H2C;
    H2C = layerCache('h2', 560, 960, 1400, 800, 6, g => {
      const roof = 1262;
      rimFill(g, gg => gg.fillRect(600, roof, 1400, 600), C.near, .55);
      for (let r = 0; r < 9; r++) for (let c = 0; c < 40; c++) {                         // windows
        const v = rnd(830, r * 60 + c); const wx = 618 + c * 34, wy = roof + 30 + r * 40;
        g.fillStyle = v < .55 ? 'rgba(10,9,10,.6)' : v < .82 ? 'rgba(201,196,191,.12)' : v < .95 ? 'rgba(255,181,71,.16)' : 'rgba(255,176,92,.34)';
        g.fillRect(wx, wy, 14, 18);
      }
      g.fillStyle = 'rgba(140,135,131,.25)'; for (let r = 0; r < 9; r++) g.fillRect(600, roof + 22 + r * 40, 1400, 2);
      // parapet with jaali gaps
      g.fillStyle = C.near; g.fillRect(600, roof - 12, 1400, 12);
      g.fillStyle = 'rgba(0,0,0,.45)'; for (let x = 606; x < 2000; x += 16) g.fillRect(x, roof - 9, 8, 6);
      // hoarding structure: twin trusses with a V brace
      g.strokeStyle = C.steel; g.lineWidth = 5;
      for (const lx of [700, 905]) { g.fillStyle = C.steel; g.fillRect(lx, 1200, 9, roof - 1200); g.fillRect(lx + 26, 1200, 9, roof - 1200); g.beginPath(); for (let y = 1200; y < roof; y += 18) { g.moveTo(lx + 4, y); g.lineTo(lx + 30, y + 9); g.lineTo(lx + 4, y + 18); } g.lineWidth = 2.5; g.stroke(); }
      // Sintex tank + mumty
      g.fillStyle = '#151314'; g.fillRect(1030, roof - 52, 54, 40); g.fillRect(1036, roof - 12, 4, 12); g.fillRect(1074, roof - 12, 4, 12);
      g.fillStyle = 'rgba(140,135,131,.35)'; g.fillRect(1030, roof - 52, 54, 2); g.fillRect(1030, roof - 38, 54, 1.5); g.fillRect(1030, roof - 26, 54, 1.5);
    });
    return H2C;
  }
  function drawH2Block(g, T, k, blur) {
    drawLC(g, h2Layer(), k, blur);
    g.save(); g.globalCompositeOperation = 'lighter';
    const pulse = 1 + .35 * Math.exp(-Math.pow((T - TM.b7 - .05) / .06, 2));
    for (let i = 0; i < 46; i++) { const x = 606 + i * 10.5; lamp(g, x, 1255 + Math.abs(Math.sin(i * .55)) * 4, 1.6, ['#FFC24A', '#FFE7A3', '#FF9F1C', '#FF5C8A'][i % 4], ((Math.floor(T * 8) + i) % 3 === 0 ? 1 : .4) * pulse, k, blur); }
    for (let i = 0; i < 12; i++) { const fl = .7 + .3 * L.noise1(T * 9 + i * 3, 9); lamp(g, 1110 + i * 22, 1248, 1.6, '#FFB547', fl * pulse, k, blur); }
    g.restore();
  }

  /* ------------------------------------------------------------------ the BOOKED stamp (block print) */
  const STW = 760, STH = 320;   // cache size; art is 700 x 250 centred
  function stampArt(g, solid) {
    g.save(); g.translate(STW / 2, STH / 2); g.fillStyle = g.strokeStyle = C.violet;
    g.lineWidth = 10; g.strokeRect(-345, -120, 690, 240);
    g.lineWidth = 4; g.strokeRect(-324, -99, 648, 198);
    L.text(g, 'BOOKED', 0, 2, { font: 'lat', size: 120, weight: 760, stretch: 'expanded', color: C.violet, maxWidth: 600 });
    g.fillRect(-324, 16, 648, 4);
    // band: 'बुक्ड · दीपावली 2026' (the middle dot is drawn: Anek Devanagari has no U+00B7)
    const bo = { font: 'dev', size: 40, weight: 600, color: C.violet };
    const w1 = L.measure(g, 'बुक्ड', bo), w2 = L.measure(g, 'दीपावली 2026', bo), gap = 40, x0 = -(w1 + gap + w2) / 2;
    L.text(g, 'बुक्ड', x0, 69, Object.assign({ align: 'left', maxWidth: 200 }, bo));
    L.circle(g, x0 + w1 + gap / 2, 57, 4.2); g.fill();
    L.text(g, 'दीपावली 2026', x0 + w1 + gap, 69, Object.assign({ align: 'left', maxWidth: 380 }, bo));
    g.restore();
    if (solid) return;
  }
  /** variant 0 = settled impression; 1..3 = wet "boil" frames (on twos) */
  function stampCanvas(v) {
    return L.cached('mmh-stamp-' + v, STW, STH, g => {
      stampArt(g);
      const ink = L.textureCanvas('ink', 512, 7 + v * 3);
      g.globalCompositeOperation = 'destination-out';
      g.globalAlpha = v ? .26 : .34; g.drawImage(ink, -40 - v * 37, -60 - v * 23, 900, 520);                     // uneven ink density
      g.globalAlpha = .22; const grain = L.textureCanvas('powder', 512, 21 + v); g.drawImage(grain, 0, 0, STW, STH);
      g.globalAlpha = 1; g.fillStyle = '#000';
      for (let i = 0; i < 52; i++) {                                                                               // wood-grain streaks
        const y = 20 + rnd(41 + v, i) * (STH - 40), x0 = rnd(42 + v, i) * STW, len = 30 + rnd(43 + v, i) * 220;
        g.globalAlpha = .12 + rnd(44 + v, i) * .25; g.beginPath(); g.moveTo(x0, y); g.bezierCurveTo(x0 + len * .3, y - 1.5, x0 + len * .7, y + 1.5, x0 + len, y); g.lineWidth = .6 + rnd(45 + v, i) * 1.6; g.strokeStyle = '#000'; g.stroke();
      }
      for (let i = 0; i < 900; i++) {                                                                              // voids + chipped edges
        const x = rnd(51 + v, i) * STW, y = rnd(52 + v, i) * STH, r = .5 + Math.pow(rnd(53 + v, i), 3) * 3.4;
        g.globalAlpha = .6 + rnd(54 + v, i) * .4; g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.fill();
      }
      // edge erosion along the outer rule
      for (let i = 0; i < 260; i++) {
        const side = i % 4, p = rnd(55 + v, i); let x, y;
        if (side === 0) { x = 35 + p * 690; y = 40; } else if (side === 1) { x = 35 + p * 690; y = 280; } else if (side === 2) { x = 35; y = 40 + p * 240; } else { x = 725; y = 40 + p * 240; }
        x += (rnd(56 + v, i) - .5) * 6; y += (rnd(57 + v, i) - .5) * 6;
        g.globalAlpha = .9; g.beginPath(); g.arc(x, y, .8 + rnd(58 + v, i) * 2.6, 0, 6.2832); g.fill();
      }
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      if (v) { g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(30,22,80,.13)'; g.fillRect(0, 0, STW, STH); }      // wet ink is darker
    });
  }
  const stampSolid = () => L.cached('mmh-stamp-solid', STW, STH, g => stampArt(g, true));
  const stampBlock = () => L.cached('mmh-stamp-block', STW + 120, STH + 120, g => { g.filter = 'blur(18px)'; g.fillStyle = '#120E18'; g.fillRect(60 + 30, 60 + 35, 700, 250); });
  // spatter: ink flicked off the block's edges on impact (closed form: exponential drag), then it stays
  const SPECKS = (() => {
    const a = [];
    for (let i = 0; i < 40; i++) {
      let s = rnd(302, i) * 1900, px, py, nx, ny;
      if (s < 700) { px = -350 + s; py = -125; nx = 0; ny = -1; } else if (s < 950) { px = 350; py = -125 + (s - 700); nx = 1; ny = 0; }
      else if (s < 1650) { px = 350 - (s - 950); py = 125; nx = 0; ny = 1; } else { px = -350; py = 125 - (s - 1650); nx = -1; ny = 0; }
      const ang = Math.atan2(ny, nx) + (rnd(303, i) - .5) * 1.5;
      a.push({ px, py, ang, dist: 6 + Math.pow(rnd(304, i), 1.7) * 92, size: .9 + Math.pow(rnd(305, i), 2.4) * 4.6, delay: rnd(306, i) * .035, sat: rnd(307, i) });
    }
    return a;
  })();
  function spatter(g, tau, n, scl) {
    if (tau < 0) return;
    g.fillStyle = C.violet;
    for (let i = 0; i < n; i++) {
      const s = SPECKS[i], t = tau - s.delay; if (t < 0) continue;
      const p = 1 - Math.exp(-34 * t), d = s.dist * p, ca = Math.cos(s.ang), sa = Math.sin(s.ang);
      const x = s.px + ca * d, y = s.py + sa * d, r = s.size * (scl || 1);
      const stretch = 1 + 3.2 * (1 - p);
      g.save(); g.translate(x, y); g.rotate(s.ang); g.globalAlpha = .92;
      g.beginPath(); g.ellipse(-r * (stretch - 1) * .8, 0, r * stretch, r * (1 - .25 * (1 - p)), 0, 0, 6.2832); g.fill();
      if (s.sat > .55 && p > .6) { g.beginPath(); g.arc(r * 2.6, (s.sat - .75) * 6, r * .38, 0, 6.2832); g.fill(); }
      if (s.sat > .85 && p > .7) { g.beginPath(); g.arc(r * 4.4, (s.sat - .9) * 18, r * .26, 0, 6.2832); g.fill(); }
      g.restore();
    }
    g.globalAlpha = 1;
  }
  H.stampCanvas = stampCanvas; H.spatter = spatter; H.STW = STW; H.STH = STH;
  /** draw a landed stamp impression in local coords centred at 0,0 (call inside a transform). tau = s since impact */
  H.drawImpression = (g, tau, nSpecks, speckScale) => {
    const f = Math.round(tau * 30), span = TM.settle - TM.hit, settle = clamp(tau / span);
    const wetA = 1 - L.smoothstep(span * .55, span, tau);                              // wet ink (denser, darker, boiling on twos) dries off
    const v = 1 + (Math.floor(f / 2) % 3);
    const sq = f === 0 ? .982 : f === 1 ? 1.008 : 1;
    const jit = wetA > 0 ? (rnd(77, Math.floor(f / 2)) - .5) * .5 * DEG * (1 - settle) : 0;
    const a = lerp(.92, 1, Ez.outQuad(settle));
    g.save(); g.rotate(jit); g.scale(sq, sq);
    if (f === 0) { g.globalAlpha = 1; g.drawImage(stampSolid(), -STW / 2, -STH / 2); }
    else {
      g.globalAlpha = .35 * a; g.drawImage(stampCanvas(0), -STW / 2 + 2, -STH / 2 - 1.5);   // double strike, 2px misregistration
      g.globalAlpha = a; g.drawImage(stampCanvas(0), -STW / 2, -STH / 2);
      if (wetA > .01) { g.globalAlpha = a * wetA; g.drawImage(stampCanvas(v), -STW / 2, -STH / 2); }
    }
    g.restore();
    spatter(g, tau, nSpecks, speckScale);
  };

  /* ------------------------------------------------------------------ hook hoarding (frame-0 coordinates) */
  // face 100–980 x 470–1290
  const FX = 100, FY = 470, FW = 880, FH = 820;
  function faceBase() {
    return L.cached('mmh-face', FW, FH, g => {
      g.fillStyle = C.muslin; g.fillRect(0, 0, FW, FH);
      // printed hairline border, typical of a "space available" flex
      g.strokeStyle = 'rgba(43,39,40,.5)'; g.lineWidth = 3; g.strokeRect(26, 26, FW - 52, FH - 52);
      L.text(g, 'SPACE AVAILABLE', FW / 2, 170, { font: 'lat', size: 78, weight: 760, color: C.ink, maxWidth: 780 });
      L.text(g, 'जगह खाली है', FW / 2, 290, { font: 'dev', size: 76, weight: 700, color: C.stone, maxWidth: 700 });
      // weathering
      L.textureOverlay(g, 'paper', 0, 0, FW, FH, { alpha: .09, blend: 'multiply', scale: .42, seed: 4 });
      L.textureOverlay(g, 'flex', 0, 0, FW, FH, { alpha: .08, blend: 'multiply', scale: .3, seed: 2 });
      L.textureOverlay(g, 'powder', 0, 0, FW, FH, { alpha: .05, blend: 'multiply', scale: .25, seed: 9 });
      for (let i = 0; i < 22; i++) {                                                   // rain streaks from the eyelets
        const x = 12 + i * 40 + rnd(901, i) * 6, len = 60 + rnd(902, i) * 260;
        const gr = g.createLinearGradient(0, 0, 0, len); gr.addColorStop(0, `rgba(96,78,62,${(.05 + rnd(903, i) * .08).toFixed(3)})`); gr.addColorStop(1, 'rgba(96,78,62,0)');
        g.fillStyle = gr; g.fillRect(x, 6, 2 + rnd(904, i) * 3, len);
      }
      const bot = g.createLinearGradient(0, FH - 160, 0, FH); bot.addColorStop(0, 'rgba(70,60,52,0)'); bot.addColorStop(1, 'rgba(70,60,52,.16)');
      g.fillStyle = bot; g.fillRect(0, FH - 160, FW, 160);
      // lacing eyelets + rope loops around the frame
      g.fillStyle = 'rgba(40,34,30,.75)'; g.strokeStyle = 'rgba(120,100,80,.55)'; g.lineWidth = 1.6;
      for (let x = 20; x < FW; x += 40) for (const y of [9, FH - 9]) { L.circle(g, x, y, 3); g.fill(); g.beginPath(); g.moveTo(x, y); g.lineTo(x + 7, y < 50 ? -4 : FH + 4); g.stroke(); }
      for (let y = 30; y < FH; y += 40) for (const x of [9, FW - 9]) { L.circle(g, x, y, 3); g.fill(); g.beginPath(); g.moveTo(x, y); g.lineTo(x < 50 ? -4 : FW + 4, y + 7); g.stroke(); }
      // tension scallops between eyelets (top edge)
      for (let x = 20; x < FW - 40; x += 40) { const gr = g.createRadialGradient(x + 20, 0, 0, x + 20, 0, 26); gr.addColorStop(0, 'rgba(0,0,0,.05)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x, 0, 40, 26); }
    });
  }
  // tubelight intensity per frame: the "dip, never from black" flicker + the impact flicker
  const FLK = { 0: 1, 1: .8, 2: .35, 3: .55, 4: .9, 5: .62, 6: .4, 7: .72, 8: 1, 13: .52, 14: .82 };
  const lampI = T => { const f = FR(T); return FLK[f] != null ? FLK[f] : 1; };
  const flare = T => { const u = T - TM.flare; if (u < 0) return 1; return u < .08 ? 1 + .25 * Ez.outQuad(u / .08) : 1 + .25 * Math.exp(-(u - .08) / .12); };
  let LM = null;
  function lightMap(I) {
    if (!LM) { LM = document.createElement('canvas'); LM.width = 220; LM.height = 205; }
    const g = LM.getContext('2d'); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    const amb = g.createLinearGradient(0, 0, 0, 205); amb.addColorStop(0, 'rgb(150,146,164)'); amb.addColorStop(1, 'rgb(122,116,134)');
    g.fillStyle = amb; g.fillRect(0, 0, 220, 205);
    g.globalCompositeOperation = 'lighter';
    for (const lx of [57.5, 162.5]) {                                                    // two throws: a hot pool up top + a long wash down the face
      let r = g.createRadialGradient(lx, -24, 0, lx, -24, 150);
      r.addColorStop(0, `rgba(70,72,76,${I})`); r.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = r; g.fillRect(0, 0, 220, 205);
      r = g.createRadialGradient(lx, 30, 0, lx, 30, 250);
      r.addColorStop(0, `rgba(54,56,60,${I})`); r.addColorStop(.6, `rgba(30,31,34,${I})`); r.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = r; g.fillRect(0, 0, 220, 205);
    }
    g.globalCompositeOperation = 'source-over';
    return LM;
  }
  // toran: festoons between ties along the top rail + strands with mango-leaf tips
  function flower(g, x, y, r, tone, seed, rot) {
    const key = `mmh-mg-${tone}-${r}-${seed % 6}`, sz = Math.ceil(r * 2.4);
    const c = L.cached(key, sz, sz, gg => { L.marigold(gg, sz / 2, sz / 2, r, { tone, seed: seed % 6 }); gg.globalCompositeOperation = 'source-atop'; gg.fillStyle = 'rgba(40,20,10,.10)'; gg.fillRect(0, 0, sz, sz); });
    g.save(); g.translate(x, y); g.rotate(rot); g.drawImage(c, -sz / 2, -sz / 2); g.restore();
  }
  const TIES = [100, 276, 452, 628, 804, 980];
  function toranPts(T) {
    const tau = T - TM.hit; const bounce = tau > 0 ? -6 * Math.exp(-7 * tau) * Math.sin(2 * Math.PI * 3.2 * tau) : 0;
    const kick = tau > 0 ? Math.exp(-5 * tau) : 0;
    const pts = [];
    for (let s = 0; s < TIES.length - 1; s++) {
      const xa = TIES[s], xb = TIES[s + 1], n = 12, sag = 30 + bounce * 1.4;
      for (let i = 1; i < n; i++) { const p = i / n; pts.push({ x: lerp(xa, xb, p), y: 454 + sag * 4 * p * (1 - p) + bounce * .5, r: 11, tone: (i + s) % 2 ? 'yellow' : 'orange', seed: s * 13 + i, rot: i * .7 + s }); }
    }
    TIES.forEach((x, s) => {
      pts.push({ x, y: 452, r: 12, tone: 'orange', seed: s + 3, rot: s });
      for (let j = 1; j <= 3; j++) { const sw = Math.sin(T * 1.7 + s * 1.3 + j * .5) * j * 1.2 + kick * Math.sin(tau * 26 + s) * j * 2.2; pts.push({ x: x + sw, y: 452 + j * 15 + bounce * (.6 + j * .15), r: 10, tone: (j + s) % 2 ? 'yellow' : 'orange', seed: s * 7 + j, rot: j + s, leafAt: j === 3 }); }
    });
    return { pts, bounce, kick, tau };
  }
  function drawToran(g, T) {
    const { pts, bounce, kick, tau } = toranPts(T);
    // thread
    g.strokeStyle = 'rgba(60,40,20,.8)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(96, 452); g.lineTo(984, 452); g.stroke();
    TIES.forEach((x, s) => { for (const sd of [-1, 1]) L.mangoLeaf(g, x + sd * 6, 456, 26, sd * .55 + Math.sin(T * 1.3 + s) * .05); });
    for (const p of pts) { if (p.leafAt) L.mangoLeaf(g, p.x, p.y + 8, 22, Math.sin(T * 1.6 + p.seed) * .12 + (kick ? Math.sin(tau * 20 + p.seed) * .2 * kick : 0)); }
    for (const p of pts) flower(g, p.x, p.y, p.r, p.tone, p.seed, p.rot);
  }
  function toranShadow(g, T) {
    const { pts } = toranPts(T); const sh = shadowSprSoft();
    g.save(); g.globalAlpha = .2;
    for (const p of pts) if (p.y > 462) g.drawImage(sh, p.x + 4 - 15, p.y + 16 - 15, 30, 30);
    g.restore();
  }
  const shadowSprSoft = () => L.cached('mmh-shs', 32, 32, g => { const r = g.createRadialGradient(16, 16, 0, 16, 16, 16); r.addColorStop(0, 'rgba(30,20,30,1)'); r.addColorStop(.55, 'rgba(30,20,30,.55)'); r.addColorStop(1, 'rgba(30,20,30,0)'); g.fillStyle = r; g.fillRect(0, 0, 32, 32); });
  function legs(g) {
    return L.cached('mmh-legs', 1080, 1500, gg => {
      gg.translate(0, -1290);
      const truss = (x0) => {
        gg.fillStyle = C.steel; gg.fillRect(x0, 1300, 9, 1480); gg.fillRect(x0 + 31, 1300, 9, 1480);
        gg.fillStyle = 'rgba(140,135,131,.75)'; gg.fillRect(x0, 1300, 2, 1480); gg.fillRect(x0 + 31, 1300, 2, 1480);
        gg.strokeStyle = 'rgba(140,135,131,.55)'; gg.lineWidth = 3.2; gg.beginPath();
        for (let y = 1334; y < 2780; y += 38) { gg.moveTo(x0 + 5, y); gg.lineTo(x0 + 35, y + 19); gg.lineTo(x0 + 5, y + 38); }
        gg.stroke();
      };
      truss(250); truss(790);
      // V-brace between the legs (a chevron, like the mark)
      gg.strokeStyle = '#1D1A1C'; gg.lineWidth = 12; gg.lineJoin = 'miter';
      gg.beginPath(); gg.moveTo(290, 1360); gg.lineTo(540, 1610); gg.lineTo(790, 1360); gg.stroke();
      gg.beginPath(); gg.moveTo(290, 1700); gg.lineTo(540, 1950); gg.lineTo(790, 1700); gg.stroke();
      gg.strokeStyle = 'rgba(140,135,131,.4)'; gg.lineWidth = 2;
      gg.beginPath(); gg.moveTo(290, 1354); gg.lineTo(540, 1604); gg.lineTo(790, 1354); gg.stroke();
      gg.beginPath(); gg.moveTo(290, 1694); gg.lineTo(540, 1944); gg.lineTo(790, 1694); gg.stroke();
      gg.fillStyle = '#1D1A1C'; gg.fillRect(290, 1352, 500, 10); gg.fillRect(290, 1692, 500, 10);
    });
  }
  function drawHook(g, T, sc) {
    const I = lampI(T);
    const fl = flare(T);
    // legs & bracing (behind)
    g.drawImage(legs(g), 0, 1290);
    // catwalk platform with grating
    g.fillStyle = '#141213'; g.fillRect(84, 1298, 912, 36);
    g.fillStyle = 'rgba(140,135,131,.55)'; g.fillRect(84, 1298, 912, 2);
    g.fillStyle = 'rgba(0,0,0,.5)'; for (let x = 88; x < 994; x += 9) g.fillRect(x, 1304, 4, 24);
    g.fillStyle = 'rgba(140,135,131,.22)'; g.fillRect(84, 1330, 912, 2);
    // media-owner plate (hangs from the catwalk)
    g.strokeStyle = '#0E0C0D'; g.lineWidth = 3; g.beginPath(); g.moveTo(700, 1334); g.lineTo(700, 1344); g.moveTo(945, 1334); g.lineTo(945, 1344); g.stroke();
    g.fillStyle = C.ink; L.rrect(g, 670, 1342, 305, 56, 4); g.fill();
    g.fillStyle = 'rgba(140,135,131,.6)'; g.fillRect(674, 1342, 297, 2);
    L.drawLogo(g, 'mark', { x: 686, y: 1348, h: 44, anchor: 'topleft', way: 'reverse' });
    L.text(g, 'MM Advertising', 748, 1381, { font: 'lat', size: 28, weight: 650, color: C.paper, align: 'left', maxWidth: 216 });
    g.fillStyle = 'rgba(140,135,131,.8)'; for (const bx of [678, 965]) { L.circle(g, bx, 1350, 2); g.fill(); L.circle(g, bx, 1390, 2); g.fill(); }
    // ---- face
    g.save(); g.beginPath(); g.rect(FX, FY, FW, FH); g.clip();
    g.drawImage(faceBase(), FX, FY);
    drawFaceMarks(g, T);
    toranShadow(g, T);
    g.globalCompositeOperation = 'multiply'; g.drawImage(lightMap(I), FX, FY, FW, FH);
    g.globalCompositeOperation = 'lighter';
    const flk = fl * (.94 + .06 * L.noise1(T * 11, 41));
    const dg = g.createRadialGradient(268, 1262, 0, 268, 1262, 380); dg.addColorStop(0, `rgba(255,136,48,${(.30 * flk).toFixed(3)})`); dg.addColorStop(.35, `rgba(255,120,40,${(.11 * flk).toFixed(3)})`); dg.addColorStop(1, 'rgba(255,120,40,0)');
    g.fillStyle = dg; g.fillRect(FX, 880, 660, 410);
    const dg2 = g.createRadialGradient(925, 1270, 0, 925, 1270, 240); dg2.addColorStop(0, 'rgba(255,136,48,.16)'); dg2.addColorStop(1, 'rgba(255,120,40,0)');
    g.fillStyle = dg2; g.fillRect(680, 1030, 300, 260);
    const pz = Math.exp(-Math.pow((T - TM.b7 - .05) / .055, 2));                       // beat-7: every board pulses
    if (pz > .01) { g.fillStyle = `rgba(255,246,228,${(.12 * pz).toFixed(3)})`; g.fillRect(FX, FY, FW, FH); }
    g.restore();
    // frame
    g.fillStyle = '#1A1718'; g.fillRect(FX - 12, FY - 12, FW + 24, 12); g.fillRect(FX - 12, FY + FH, FW + 24, 10); g.fillRect(FX - 12, FY, 12, FH); g.fillRect(FX + FW, FY, 12, FH);
    g.fillStyle = 'rgba(140,135,131,.7)'; g.fillRect(FX - 12, FY - 12, FW + 24, 2);
    // gooseneck tubelights
    for (const [lx, sd] of [[330, -1], [750, 1]]) tubeLamp(g, lx, sd, I, T);
    // toran on the top rail
    drawToran(g, T);
    // diyas on the catwalk (hero + a small one)
    L.diya(g, 230, 1279, 32, T, 3, { flameSize: 46 * fl });
    L.diya(g, 905, 1284, 22, T + 3.1, 8, { flameSize: 30 });
    moths(g, T);
    dust(g, T);
    stampFlight(g, T);
  }
  function tubeLamp(g, lx, sd, I, T) {
    g.strokeStyle = '#121012'; g.lineWidth = 7; g.lineCap = 'round';
    g.beginPath(); g.moveTo(lx - 50 * sd, 462); g.bezierCurveTo(lx - 54 * sd, 372, lx + 4 * sd, 360, lx, 414); g.stroke();
    g.strokeStyle = 'rgba(140,135,131,.5)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(lx - 53 * sd, 455); g.bezierCurveTo(lx - 57 * sd, 370, lx + 2 * sd, 358, lx - 2 * sd, 410); g.stroke();
    g.save(); g.translate(lx, 424); g.rotate(sd * .04);
    g.fillStyle = '#19161A'; L.rrect(g, -42, -11, 84, 15, 4); g.fill();
    g.fillStyle = 'rgba(140,135,131,.55)'; g.fillRect(-40, -11, 80, 1.5);
    g.fillStyle = L.mix('#5A5C66', '#FFFFFF', I, 1); L.rrect(g, -36, 3, 72, 6, 3); g.fill();
    g.restore();
    g.save(); g.globalCompositeOperation = 'lighter';
    // volumetric cone (soft-edged, faint; the face itself carries the light pool)
    const cone = L.cached('mmh-cone', 560, 600, cg => {
      const gr = cg.createLinearGradient(0, 0, 0, 560); gr.addColorStop(0, 'rgba(244,246,255,.5)'); gr.addColorStop(.35, 'rgba(244,246,255,.16)'); gr.addColorStop(1, 'rgba(244,246,255,0)');
      cg.filter = 'blur(14px)'; cg.fillStyle = gr; cg.beginPath(); cg.moveTo(250, 8); cg.lineTo(310, 8); cg.lineTo(520, 570); cg.lineTo(40, 570); cg.closePath(); cg.fill();
    });
    g.globalAlpha = .2 * I; g.drawImage(cone, lx - 280, 424); g.globalAlpha = 1;
    put(g, glowSpr('#DCE4FF'), lx, 430, 120, .55 * I);
    put(g, glowSpr('#FFFFFF'), lx, 430, 46, .9 * I);
    g.restore();
  }
  function moths(g, T) {
    g.save(); g.fillStyle = 'rgba(244,242,238,.8)';
    for (let m = 0; m < 6; m++) {
      const lx = m < 3 ? 330 : 750, s = m * 1.7;
      const x = lx + 34 * Math.sin(T * (5.3 + m * .4) + s) + 14 * L.snoise(T * 2.3 + s, 61);
      const y = 452 + 16 * Math.cos(T * (7.1 + m * .3) + s * 1.3) + 10 * L.snoise(T * 3.1 + s, 62);
      g.globalAlpha = .55 + .35 * Math.abs(Math.sin(T * 40 + m));
      g.beginPath(); g.ellipse(x, y, 2.6, 1.6, Math.sin(T * 30 + m), 0, 6.2832); g.fill();
    }
    g.restore();
  }
  function dust(g, T) {
    const tau = T - TM.hit; if (tau < 0 || tau > 1.6) return;
    g.save();
    for (let i = 0; i < 16; i++) {                                                     // puffs off the top rail
      const x = 120 + i * 56 + rnd(921, i) * 30, t = tau - rnd(922, i) * .06; if (t < 0) continue;
      const a = .2 * Math.exp(-t * 2.6) * Math.min(1, t * 20), r = 8 + 40 * (1 - Math.exp(-t * 3));
      put(g, softSpr('#B9B2BC'), x + L.snoise(t + i, 4) * 10, 458 - 34 * (1 - Math.exp(-t * 2.2)), r, a);
    }
    g.fillStyle = '#D8D2CC';
    for (let i = 0; i < 26; i++) {                                                     // grit falling through the lamp light
      const x0 = 110 + rnd(923, i) * 860, t = tau - rnd(924, i) * .08; if (t < 0) continue;
      const p = L.ballistic(x0, 462, (rnd(925, i) - .5) * 80, -60 - rnd(926, i) * 90, 1.4, 900, t);
      if (p[1] > 1300) continue;
      g.globalAlpha = .7 * Math.exp(-t * 1.2); g.fillRect(p[0], p[1], 2, 2);
    }
    g.restore();
  }
  // everything printed / stamped / written ON the face (before the lighting multiply)
  function drawFaceMarks(g, T) {
    const cx = 540, cy = 900, rot = -9 * DEG;
    const sh0 = TM.drop - 2 / 30;
    if (T >= sh0 && T < TM.hit) {                                                      // anticipation: the block's shadow arrives first, then converges
      const u = clamp((T - sh0) / (TM.hit - sh0)), e = u * u;
      g.save(); g.translate(cx + 18 * (1 - e), cy + 120 * (1 - e)); g.rotate(lerp(-15, -9, e) * DEG); const s = lerp(1.5, 1.02, e); g.scale(s, s);
      g.globalAlpha = (.12 + .38 * e) * (.5 + .5 * lampI(T)); g.drawImage(stampBlock(), -(STW + 120) / 2, -(STH + 120) / 2); g.restore();
    }
    if (T >= TM.hit) {
      g.save(); g.translate(cx, cy); g.rotate(rot); H.drawImpression(g, T - TM.hit, 40, 1); wetSheen(g, T);
      const tau = T - TM.hit;
      if (tau < .3) {                                                                  // displaced dust: a soft ring racing out from the block's edge
        const r = 1 + tau * 1.1, a = .34 * (1 - tau / .3);
        for (let j = 0; j < 3; j++) { g.strokeStyle = `rgba(214,208,204,${(a * (1 - j * .3)).toFixed(3)})`; g.lineWidth = 10 + j * 10; g.strokeRect(-350 * r - j * 6, -125 * r - j * 6, 700 * r + j * 12, 250 * r + j * 12); }
      }
      g.restore();
    }
    // ---- handwriting: "for you" (stroke-mask write-on, italic slant edge)
    if (T >= TM.write0) {
      const u0 = clamp((T - TM.write0) / (TM.write1 - TM.write0)), u = -(Math.cos(Math.PI * u0) - 1) / 2;
      writeOn(g, u);
    }
    if (T >= TM.hi0) {
      const u = Ez.outCubic(clamp((T - TM.hi0) / (TM.hi1 - TM.hi0)));
      L.text(g, 'आपके लिए', 540, 1250 + 12 * (1 - u), { font: 'tiro', italic: true, size: 64, color: C.red, alpha: u, maxWidth: 420 });
    }
  }
  function wetSheen(g, T) {
    const tau = T - TM.hit; if (tau < .03 || tau > 1.2) return;
    const a = .22 * Math.exp(-tau * 2.4);
    const x = lerp(-420, 420, clamp(tau / .9));
    g.save(); g.globalCompositeOperation = 'source-atop';
    // only meaningful on the face canvas; a soft highlight band sliding across the wet ink
    g.restore();
    g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = a;
    const sh = L.cached('mmh-sheen', STW, STH, gg => { gg.drawImage(stampCanvas(1), 0, 0); gg.globalCompositeOperation = 'source-in'; gg.fillStyle = '#7A70C8'; gg.fillRect(0, 0, STW, STH); });
    g.beginPath(); g.moveTo(x - 60, -160); g.lineTo(x + 40, -160); g.lineTo(x - 20, 160); g.lineTo(x - 120, 160); g.closePath(); g.clip();
    g.drawImage(sh, -STW / 2, -STH / 2); g.restore();
  }
  let WC = null;
  const FY_W = 1160;
  function writeOn(g, u) {
    const src = L.cached('mmh-foryou', 600, 220, gg => L.text(gg, 'for you', 300, 150, { font: 'tiro', italic: true, size: 120, color: C.red, maxWidth: 520 }));
    if (u >= 1) { g.drawImage(src, 540 - 300, FY_W - 150); return; }
    if (!WC) { WC = document.createElement('canvas'); WC.width = 600; WC.height = 220; }
    const w = WC.getContext('2d'); w.globalCompositeOperation = 'source-over'; w.globalAlpha = 1; w.clearRect(0, 0, 600, 220); w.drawImage(src, 0, 0);
    // pen path: "for" then a lift across the gap, then "you"
    const full = 377.2, forW = 151.8, gap = 183 - 151.8, inked = full - gap, left = 300 - full / 2;
    const d = u * inked, xe = left + (d < forW ? d : d + gap) + 8;
    w.globalCompositeOperation = 'destination-in';
    w.save(); w.transform(1, 0, -.2, 1, .2 * 150, 0);
    const gr = w.createLinearGradient(xe - 16, 0, xe + 4, 0); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    w.fillStyle = gr; w.fillRect(-100, 0, 800, 220); w.restore();
    g.drawImage(WC, 540 - 300, FY_W - 150);
  }
  function stampFlight(g, T) {
    if (T < TM.drop || T >= TM.hit) return;
    // enters from above the frame, winds up toward the lens (anticipation), then accelerates into the face
    const u = clamp((T - TM.drop) / (TM.hit - TM.drop)), WU = .3;
    let sc, dy, rot;
    if (u < WU) { const v = Ez.outQuad(u / WU); sc = lerp(1.75, 2.05, v); dy = lerp(-700, -780, v); rot = lerp(-11, -16, v); }
    else { const v = Math.pow((u - WU) / (1 - WU), 2.2); sc = lerp(2.05, 1, v); dy = lerp(-780, 0, v); rot = lerp(-16, -9, v); }
    g.save(); g.translate(540, 900 + dy); g.rotate(rot * DEG); g.scale(sc, sc);
    setBlur(g, (sc - 1) * 9);                                                          // nearer the lens = out of focus
    g.globalAlpha = 1; g.drawImage(stampCanvas(1), -STW / 2, -STH / 2); g.filter = 'none'; g.restore();
  }

  /* ------------------------------------------------------------------ sky (screen space, slight parallax) */
  const SPARKS = [
    { t: -.42, x: 196, y: 318, sd: 3, n: 56, sp: 230, cols: ['#FFC24A', '#FFE7A3', '#FFFFFF'], shape: 'willow' },
    { t: -.85, x: 948, y: 312, sd: 4, n: 34, sp: 150, cols: ['#FFE7A3', '#FFC24A'], shape: 'peony' },
    { t: .9, x: 880, y: 262, sd: 5, n: 46, sp: 200, cols: ['#FFFFFF', '#FFC24A'], shape: 'peony' },
    { t: 1.7, x: 560, y: 170, sd: 7, n: 46, sp: 190, cols: ['#FFC24A', '#FFE7A3'], shape: 'peony' },
    { t: TM.b4 + .3, x: 160, y: 640, sd: 9, n: 46, sp: 190, cols: ['#FFC24A', '#FFFFFF'], shape: 'willow' },
    { t: 4.3, x: 930, y: 610, sd: 11, n: 46, sp: 190, cols: ['#FFFFFF', '#FFC24A'], shape: 'peony' },
    { t: 2.35, x: 820, y: 170, sd: 13, n: 34, sp: 150, cols: ['#FFE7A3', '#FFC24A'], shape: 'peony' },
    { t: 3.75, x: 320, y: 668, sd: 15, n: 30, sp: 130, cols: ['#FFC24A'], shape: 'peony' },
  ];
  function drawSky(ctx, T, cam) {
    const gr = ctx.createLinearGradient(0, 0, 0, 1100); gr.addColorStop(0, C.sky); gr.addColorStop(.6, '#1F1C2B'); gr.addColorStop(1, C.rich);
    ctx.fillStyle = gr; ctx.fillRect(-40, -40, 1160, 2000);
    const vh = ctx.createRadialGradient(540, 120, 0, 540, 120, 760); vh.addColorStop(0, 'rgba(63,53,147,.25)'); vh.addColorStop(1, 'rgba(63,53,147,0)');
    ctx.fillStyle = vh; ctx.fillRect(-40, -40, 1160, 1000);
    const px = cam.ex / 8, py = cam.ey / 8;
    ctx.save(); ctx.translate(px, py);
    L.stars(ctx, T, { seed: 17, count: 46, x: -100, y: -100, w: 1280, h: 780, alpha: .5 });
    L.haze(ctx, T, { y0: 0, y1: 760, alpha: .07, color: '#7B6BB0', speed: 6, seed: 12, scale: 3.4 });
    // distant crackle (tiny pops) — the audio's crackle bed made visible
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const fr = FR(T);
    for (let i = 0; i < 6; i++) { const id = Math.floor(fr / 3) * 7 + i; if (rnd(331, id) > .45) continue; put(ctx, glowSpr('#FFE7A3'), rnd(332, id) * 1080, 520 + rnd(333, id) * 260, 6 + rnd(334, id) * 8, .35); }
    ctx.restore();
    for (const s of SPARKS) {
      const t = T - s.t; if (t < 0 || t > 2.4) continue;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      put(ctx, glowSpr('#FFB547'), s.x, s.y + t * 20, 150 + t * 40, .14 * Math.exp(-t * 1.6));               // smoke lit by the burst
      ctx.restore();
      L.firework(ctx, { x: s.x, y: s.y, t, seed: s.sd, n: s.n, speed: s.sp, drag: 1.5, gravity: 150, life: 1.7, colors: s.cols, trail: .2, size: 2.3, glitter: true, flash: false, alpha: .42, shape: s.shape });
      if (t < .25) put(ctx, glowSpr('#FFF1C9'), s.x, s.y, 90, .3 * (1 - t / .25));
    }
    ctx.restore();
  }

  /* ------------------------------------------------------------------ foreground: jhalar very near the lens (d .42) */
  function drawFore(g, T, k, blur) {
    const fade = clamp((4.2 - k) / 2.2); if (fade <= 0) return;
    // two jhalar strands right at the lens: out of focus, so they are pure bokeh (wire is a soft dark blur)
    const strands = [{ x0: -260, x1: 1340, y: 30, sag: 172, n: 26, r: 15, sd: 71 }, { x0: 760, x1: 1400, y: -30, sag: 120, n: 9, r: 24, sd: 73 }];
    for (const s of strands) {
      const pt = p => [lerp(s.x0, s.x1, p), s.y + s.sag * 4 * p * (1 - p) * (1 + .03 * Math.sin(T * .8 + s.sd))];
      g.save(); g.globalAlpha = fade * .55; g.strokeStyle = '#0B090B'; g.lineWidth = s.r * .45; g.filter = `blur(${(s.r * .3 * L.baseScale).toFixed(1)}px)`; g.beginPath();
      for (let i = 0; i <= 40; i++) { const [x, y] = pt(i / 40); i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); g.restore();
      g.save(); g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < s.n; i++) {
        const p = (i + .5) / s.n, [x, y] = pt(p); const col = LIGHTCOLS[(i + s.sd) % 4];
        const v = .55 + .45 * L.noise1(T * 1.8 + i * 2.3, s.sd);
        put(g, discSpr(col), x, y + s.r * .5, s.r * (.85 + .3 * rnd(s.sd, i)), .5 * v * fade);
      }
      g.restore();
    }
  }

  /* ------------------------------------------------------------------ boards for the city (s2) */
  H.boards = [];   // filled by s2-city-booked.js: { d, draw(g, T, k, blur) }
  const boardsAt = (d) => H.boards.filter(b => b.d === d);
  const FLY_D = H.FLY_D = .8;

  /* ------------------------------------------------------------------ the world */
  H.world = (ctx, T) => {
    const cam = H.cam(T);
    ctx.save();
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    const sh = shakeAt(T); ctx.translate(sh.x, sh.y);
    drawSky(ctx, T, cam);
    H.layer(ctx, cam, 4, (g, k, blur) => drawFar(g, T, k, blur));
    H.layer(ctx, cam, 3, (g, k, blur) => { g.save(); g.globalAlpha = .9; L.haze(g, T, { y0: 860, y1: 1120, alpha: .13, color: '#8A6E9A', speed: 9, seed: 19, scale: 2.6 }); g.restore(); });
    H.layer(ctx, cam, 2, (g, k, blur) => { drawMid(g, T, k, blur); for (const b of boardsAt(2)) b.draw(g, T, k, blur); midFog(g); drawMidLights(g, T, k, blur); for (const b of boardsAt(2.01)) b.draw(g, T, k, blur); });
    H.layer(ctx, cam, 1.3, (g, k, blur) => { drawH2Block(g, T, k, blur); for (const b of boardsAt(1.3)) b.draw(g, T, k, blur); for (const b of boardsAt(1.31)) b.draw(g, T, k, blur); });
    H.layer(ctx, cam, 1, (g, k) => { g.translate(120, 1050); g.scale(SW, SW); g.translate(-100, -470); drawHook(g, T, k * SW); });
    H.layer(ctx, cam, FLY_D, (g, k, blur) => { drawFly(g, T, k, blur); for (const b of boardsAt(FLY_D)) b.draw(g, T, k, blur); });
    H.layer(ctx, cam, .42, (g, k, blur) => drawFore(g, T, k, blur));
    ctx.restore();
  };
  H.util = { put, lamp, glowSpr, bulbSpr, discSpr, softSpr, setBlur, rimFill, FR, DEG };

  // a tiny exposure kick on the stamp impact (no full-frame flash)
  MM.addFlash({ t: TM.hit, dur: .1, exposure: .05, bloom: .25 });

  MM.scene('s1-hook-space-available', {
    draw(ctx, t, { T }) { H.world(ctx, T); }
  });
})();
