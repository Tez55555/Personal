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
  const H2_D = H.H2_D = 1.6;            // depth of the H2 rooftop block (between the mid city d 2 and the hook d 1)
  // in-scene temporal supersampling state (see H.render): FAST skips detail that the smear erases
  H.FAST = false;

  /* ------------------------------------------------------------------ sprites */
  const glowSpr = col => L.cached('mmh-g-' + col, 96, 96, g => { const r = g.createRadialGradient(48, 48, 0, 48, 48, 48); r.addColorStop(0, L.rgba(col, 1)); r.addColorStop(.14, L.rgba(col, .5)); r.addColorStop(.42, L.rgba(col, .13)); r.addColorStop(1, L.rgba(col, 0)); g.fillStyle = r; g.fillRect(0, 0, 96, 96); });
  const bulbSpr = col => L.cached('mmh-b-' + col, 64, 64, g => { let r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, L.rgba(col, .55)); r.addColorStop(.3, L.rgba(col, .18)); r.addColorStop(1, L.rgba(col, 0)); g.fillStyle = r; g.fillRect(0, 0, 64, 64); r = g.createRadialGradient(32, 32, 0, 32, 32, 7); r.addColorStop(0, '#FFFFFF'); r.addColorStop(.45, L.mix(col, '#FFFFFF', .5)); r.addColorStop(1, L.rgba(col, 0)); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
  const discSpr = col => L.cached('mmh-d-' + col, 96, 96, g => { const r = g.createRadialGradient(48, 48, 0, 48, 48, 47); r.addColorStop(0, L.rgba(col, .46)); r.addColorStop(.7, L.rgba(col, .55)); r.addColorStop(.87, L.rgba(col, .72)); r.addColorStop(1, L.rgba(col, 0)); g.fillStyle = r; g.fillRect(0, 0, 96, 96); });
  const softSpr = col => L.cached('mmh-s-' + col, 64, 64, g => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, L.rgba(col, 1)); r.addColorStop(.5, L.rgba(col, .45)); r.addColorStop(1, L.rgba(col, 0)); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
  function put(g, img, x, y, r, a) { if (a <= .004 || r <= .05) return; g.globalAlpha = Math.min(1, a); g.drawImage(img, x - r, y - r, r * 2, r * 2); }
  /** a point light in layer coords: crisp bulb when in focus, lens bokeh disc when defocused */
  let LSTREAK = 0;   // horizontal travel (layer px) of the current layer during one supersample: lights integrate it as a streak
  function lamp(g, x, y, size, col, a, k, blur) {
    const bl = blur / k;
    if (bl > 2) { const r = Math.max(size * 1.4, bl); put(g, discSpr(col), x, y, r, a * clamp(Math.pow(size * 3 / r, 1.1), .16, .9)); return; }
    const r = size * 4.5;
    if (LSTREAK > size) { if (a <= .004) return; g.globalAlpha = Math.min(1, a * 2 * r / (2 * r + LSTREAK)); g.drawImage(bulbSpr(col), x - r - LSTREAK / 2, y - r, 2 * r + LSTREAK, 2 * r); return; }
    put(g, bulbSpr(col), x, y, r, a);
  }
  function setBlur(g, px) { g.filter = px > .6 ? `blur(${(px * L.baseScale).toFixed(2)}px)` : 'none'; }
  /** drifting cloud haze in a band with FEATHERED top/bottom edges and a wide x span (L.haze clips to a hard
      0..1080 box whose edges slide into view under parallax and survive WhatsApp re-encoding as blocks) */
  function hazeBand(g, T, { y0, y1, x0 = -900, x1 = 2000, color, alpha, speed, seed, scale = 3 }) {
    const S = 384 * scale, th = Math.max(8, Math.ceil((y1 - y0) / scale));
    g.save(); g.globalCompositeOperation = 'screen';
    for (let layer = 0; layer < 2; layer++) {
      const sd = seed + layer * 5;
      const band = L.cached(`mmh-haze-${sd}-${color}-${th}`, 384, th, b => {
        const tex = L.cloudTexture(sd); for (let y = 0; y < th; y += 384) b.drawImage(tex, 0, y);
        b.globalCompositeOperation = 'source-in'; b.fillStyle = color; b.fillRect(0, 0, 384, th);
        b.globalCompositeOperation = 'destination-in';
        const m = b.createLinearGradient(0, 0, 0, th); m.addColorStop(0, 'rgba(0,0,0,0)'); m.addColorStop(.32, 'rgba(0,0,0,1)'); m.addColorStop(.68, 'rgba(0,0,0,1)'); m.addColorStop(1, 'rgba(0,0,0,0)');
        b.fillStyle = m; b.fillRect(0, 0, 384, th);
      });
      const sp = speed * (layer ? 1.7 : 1), off = ((T * sp + layer * 210) % S + S) % S;
      g.globalAlpha = alpha * (layer ? .6 : 1);
      for (let x = off - S * Math.ceil((off - x0) / S); x < x1; x += S) g.drawImage(band, x, y0, S + .5, y1 - y0);
    }
    g.restore();
  }

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
    const pr = clamp((LS0 - Math.log(s)) / (LS0 - LS2));
    // the crane pans right EARLY in the pull-back (hook centre x 540 -> 330 by 2.8 -> 270), so the beat-4 boards
    // (H2 on the right, G1's stamp below) are already in frame when they get stamped; it rises later (fy)
    const fx = 1 - Math.pow(1 - pr, 2.5), fy = pr * pr;
    const ax = lerp(540, ANCH.x, fx), ay = lerp(880, ANCH.y, fy);
    let ex = (ax - P.x) * (1 - c) - (ANCH.x - P.x), ey = (ay - P.y) * (1 - c) - (ANCH.y - P.y);
    ex -= 20 * ramp(T, 2.95, .5);                                              // lateral drift: far 5, mid 10, hook 20 px/s
    const w = Ez.inOutCubic(clamp((T - TM.whip0) / (TM.whip1 - TM.whip0)));
    ex -= 1400 * w;                                                            // whip-pan right into s3
    // aperture: shallow in the close-up (city = bokeh), rack focus to deep focus finished by 2.75 (before the beat-4 stamps)
    const ap = 22 * Math.pow(clamp(c / .664), 1.6) * (1 - L.smoothstep(2.3, 2.75, T));
    return { T, s, c, ex, ey, w, ap, zf: 1 - c };
  };
  /** run fn inside depth layer d. fn(g, k, blur) with blur = circle of confusion in screen px */
  H.layer = (ctx, cam, d, fn) => {
    const z = d - cam.c; if (z <= .02) return;
    const k = d / z;
    LSTREAK = H.camV && cam.T > TM.whip0 ? Math.abs(H.camV.ex) * (H.DT || 0) / d : 0;
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
      // Diwali glow of the old city rising behind the Rumi Darwaza (amber, so the mid blocks read as silhouettes against it)
      for (const [x, y, r, a] of [[540, 960, 380, .18], [540, 1010, 620, .07], [-260, 1000, 420, .08], [1500, 1000, 460, .08]]) {
        const wg = g.createRadialGradient(x, y, 0, x, y, r); wg.addColorStop(0, `rgba(255,159,28,${a})`); wg.addColorStop(.45, `rgba(255,150,40,${a * .45})`); wg.addColorStop(1, 'rgba(255,140,40,0)');
        g.save(); g.translate(x, y); g.scale(1, .62); g.translate(-x, -y); g.fillStyle = wg; g.fillRect(x - r, y - r, r * 2, r * 2); g.restore();
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
      if (arch || r % 3 === 2) { g.fillStyle = 'rgba(70,64,66,.55)'; g.fillRect(x + 2, wy - 6, w - 4, 3); }          // chhajja / ledge
      if (!arch && !tower && R(6000 + r) > .72) {                                      // balcony slab + railing
        g.fillStyle = 'rgba(16,14,15,.8)'; g.fillRect(x + 4, wy + wh + 2, w - 8, 4);
        g.fillStyle = 'rgba(140,135,131,.28)'; g.fillRect(x + 4, wy + wh - 6, w - 8, 1); for (let rx = x + 6; rx < x + w - 6; rx += 5) g.fillRect(rx, wy + wh - 6, .8, 8);
      }
      // flats: runs of 2-4 windows share one household's state (dark / tubelight / warm / festive), so facades read lived-in, not gridded
      let c = 0, fl = 0;
      while (c < cols) {
        const fw = 2 + Math.floor(R(7000 + r * 13 + fl) * 3), st = R(5000 + r * 17 + fl * 3);
        const kind = st < .52 ? 0 : st < .68 ? 1 : st < .93 ? 2 : 3;
        for (let j = 0; j < fw && c < cols; j++, c++) {
          const wx = ox + c * cw, v = R(r * 50 + c);
          let fill = 'rgba(12,10,12,.36)';
          if (kind === 1) fill = v > .25 ? 'rgba(201,196,191,.12)' : 'rgba(12,10,12,.36)';
          else if (kind === 2) fill = v > .7 ? 'rgba(255,176,92,.30)' : v > .15 ? 'rgba(255,181,71,.17)' : 'rgba(12,10,12,.36)';
          else if (kind === 3) fill = 'rgba(255,170,80,.36)';
          g.fillStyle = fill;
          if (arch) { g.beginPath(); g.moveTo(wx, wy + wh); g.lineTo(wx, wy + 6); g.quadraticCurveTo(wx, wy, wx + ww / 2, wy - 3); g.quadraticCurveTo(wx + ww, wy, wx + ww, wy + 6); g.lineTo(wx + ww, wy + wh); g.closePath(); g.fill(); }
          else g.fillRect(wx, wy, ww, wh);
          if (kind >= 2 && v > .55) { g.fillStyle = 'rgba(60,24,20,.5)'; g.fillRect(wx + ww * .55, wy, ww * .45, wh); }        // curtain
          if (kind === 3) { g.fillStyle = 'rgba(255,214,140,.55)'; for (let d = 1; d < 4; d++) g.fillRect(wx + d * ww / 4 - .6, wy + 1.5, 1.2, 1.2); }   // fairy lights in the window
          if (!arch && v < .08) { g.fillStyle = 'rgba(120,116,112,.5)'; g.fillRect(wx + ww + 1, wy + wh - 6, 6, 5); }                      // AC unit
        }
        fl++;
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
    for (let i = 0; i < 34; i++) {                                                      // cracker embers drifting up over the city
      const life = 4 + rnd(651, i) * 4, ph = rnd(652, i) * life, age = ((T + ph) % life) / life;
      const x = -200 + rnd(653, i) * 1900 + L.snoise(T * .4 + i, 66) * 30, y = 1500 - age * (420 + rnd(654, i) * 320);
      const a = Math.sin(age * Math.PI) * (.45 + .55 * L.noise1(T * 6 + i, 67));
      lamp(g, x, y, 1 + rnd(655, i) * 1.1, i % 3 ? '#FFB547' : '#FFE7A3', a * .75, k, blur);
    }
    g.restore();
  }

  /* ------------------------------------------------------------------ flyover (d .8) */
  let FLYC = null;
  const FX0 = -900, FXW = 4100;      // wide enough that no cache edge enters frame during the whip (layer shifts 1750 px)
  function flyLayer() {
    if (FLYC) return FLYC;
    FLYC = layerCache('fly', FX0, 1380, FXW, 640, 5, g => {
      const y0 = 1530;
      // the market street under the flyover: shopfronts with warm interiors, awnings and torans
      const st = g.createLinearGradient(0, 1590, 0, 2020); st.addColorStop(0, '#1A1718'); st.addColorStop(1, '#171415');
      g.fillStyle = st; g.fillRect(FX0, 1590, FXW, 430);
      const mk = L.cached('mmh-market', FXW, 300, m => {                                   // drawn sharp, then softened: it lives in the shadow under the deck
        m.translate(-FX0, -1640);
        for (let i = 0, x = FX0; x < FX0 + FXW; i++) {
          const w = 60 + rnd(801, i) * 90, top = 1720 + rnd(802, i) * 50, gapW = rnd(805, i) > .75 ? 20 + rnd(806, i) * 30 : 4;
          m.fillStyle = '#1D1A1B'; m.fillRect(x, top - 46, w - gapW, 300);
          const warm = rnd(803, i) > .22; const a = .26 + rnd(804, i) * .34;
          const ig = m.createLinearGradient(0, top, 0, top + 110); ig.addColorStop(0, warm ? `rgba(255,170,80,${a})` : `rgba(214,220,236,${a * .6})`); ig.addColorStop(1, 'rgba(255,150,70,.02)');
          m.fillStyle = ig; m.fillRect(x + 6, top, w - gapW - 12, 140);
          m.fillStyle = 'rgba(0,0,0,.3)'; for (let sx = x + 8; sx < x + w - gapW - 8; sx += 4) m.fillRect(sx, top + 2, 1, 70 * rnd(807, i));   // half-rolled shutters
          if (warm && rnd(810, i) > .5) { m.fillStyle = 'rgba(30,22,18,.75)'; for (let b = 0; b < 4; b++) m.fillRect(x + 12 + b * (w - gapW - 24) / 4, top + 64, (w - gapW - 24) / 4 - 4, 6); }   // shelves of mithai boxes
          m.fillStyle = '#2B2728'; m.fillRect(x - 2, top - 14, w - gapW + 2, 10); m.fillStyle = 'rgba(140,135,131,.4)'; m.fillRect(x - 2, top - 14, w - gapW + 2, 1.2);
          const nf = Math.floor((w - gapW - 8) / 8);
          for (let f = 0; f < nf; f++) { m.fillStyle = f % 2 ? 'rgba(242,178,62,.6)' : 'rgba(224,110,30,.6)'; L.circle(m, x + 3 + f * 8, top - 2 + Math.sin(f / nf * Math.PI) * 4, 2.2); m.fill(); }
          if (rnd(808, i) > .4) { m.fillStyle = `rgba(244,242,238,${(.06 + rnd(809, i) * .08).toFixed(3)})`; m.fillRect(x + 8, top - 40, w - gapW - 16, 18); }   // signboard
          x += w;
        }
      });
      g.save(); g.filter = 'blur(2.2px)'; g.drawImage(mk, FX0, 1640); g.restore();
      const ds = g.createLinearGradient(0, 1596, 0, 1690); ds.addColorStop(0, 'rgba(10,8,9,.8)'); ds.addColorStop(1, 'rgba(10,8,9,0)');   // deck shadow
      g.fillStyle = ds; g.fillRect(FX0, 1596, FXW, 94);
      // piers: a V-chevron cap on a pillar (the mark's chevron, in concrete)
      for (let x = -640 - 310; x < FX0 + FXW; x += 310) {
        rimFill(g, gg => { gg.beginPath(); gg.moveTo(x - 46, y0 + 66); gg.lineTo(x + 46, y0 + 66); gg.lineTo(x + 20, y0 + 118); gg.lineTo(x + 20, 2020); gg.lineTo(x - 20, 2020); gg.lineTo(x - 20, y0 + 118); gg.closePath(); gg.fill(); }, '#242022', .3);
        g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x + 6, y0 + 118, 14, 900);
      }
      // deck fascia + soffit shadow
      rimFill(g, gg => gg.fillRect(FX0, y0, FXW, 66), C.ink, .75);
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(FX0, y0 + 58, FXW, 8);
      g.fillStyle = 'rgba(140,135,131,.18)'; for (let x = FX0; x < FX0 + FXW; x += 155) g.fillRect(x, y0 + 4, 2, 54);       // expansion joints
      // crash barrier on top
      g.fillStyle = '#1E1B1C'; g.fillRect(FX0, y0 - 14, FXW, 14);
      g.fillStyle = 'rgba(140,135,131,.4)'; g.fillRect(FX0, y0 - 14, FXW, 1.5);
      for (let x = FX0; x < FX0 + FXW; x += 22) { g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(x, y0 - 12, 3, 12); }
      // sodium street-lamp poles (kept clear of the G1 gantry)
      for (const x of LAMPX) { g.fillStyle = '#1A1718'; g.fillRect(x - 2, y0 - 120, 4, 106); g.fillRect(x - 2, y0 - 122, 26, 4); g.fillRect(x + 18, y0 - 124, 14, 6); }
    });
    return FLYC;
  }
  const LAMPX = [-760, -500, -240, 20, 860, 1120, 1380, 1640, 1900, 2160, 2420, 2680, 2940];
  const sodiumPool = () => L.cached('mmh-sodium', 128, 128, g => { const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,181,71,1)'); r.addColorStop(.35, 'rgba(255,170,60,.55)'); r.addColorStop(1, 'rgba(255,160,50,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); });
  function drawFly(g, T, k, blur) {
    const y0 = 1530;
    drawLC(g, flyLayer(), k, blur);
    g.save(); g.globalCompositeOperation = 'lighter';
    // sodium pools on the deck (every 260 px): a flattened amber pool on the barrier + a spill down the fascia
    for (const x of LAMPX) {
      g.globalAlpha = .3; g.drawImage(sodiumPool(), x + 25 - 120, y0 - 30, 240, 56);
      g.globalAlpha = .12; g.drawImage(sodiumPool(), x + 25 - 130, y0 - 12, 260, 70);
      g.globalAlpha = .07; g.drawImage(sodiumPool(), x + 25 - 140, y0 - 160, 280, 230);
    }
    g.globalAlpha = 1;
    for (const x of LAMPX) lamp(g, x + 25, y0 - 117, 3, '#FFB06A', .9, k, blur);
    for (let i = 0; i < 46; i++) {                                                      // market string lights below the deck
      const x = -850 + i * 85, y = 1652 + Math.sin(i * 1.7) * 6;
      lamp(g, x, y, 2.2, LIGHTCOLS[i % 4], .45 + .45 * L.noise1(T * 2 + i, 8), k, blur);
    }
    for (let i = 0; i < 16; i++) {                                                      // light pools on the market street
      const x = -800 + i * 250 + rnd(845, i) * 90;
      g.globalAlpha = .1 + .06 * rnd(846, i); g.drawImage(sodiumPool(), x - 130, 1836, 260, 80);
    }
    g.globalAlpha = 1;
    for (let i = 0; i < 22; i++) {                                                      // akash kandils hanging under the deck, swaying
      const x = -820 + i * 185 + rnd(847, i) * 40, sw = Math.sin(T * 1.3 + i * 1.7) * 2.5, y = 1624 + rnd(848, i) * 22 + sw * .3;
      const col = i % 3 ? '#FFB547' : '#FFC24A', f = .8 + .2 * L.noise1(T * 3 + i, 47);
      put(g, softSpr(col), x + sw, y, 26, .3 * f);
      if (blur / k < 2) { g.globalAlpha = .85 * f; g.fillStyle = i % 4 === 0 ? '#E9473F' : '#FFD9A0'; g.beginPath(); g.moveTo(x + sw, y - 7); g.lineTo(x + sw + 5, y); g.lineTo(x + sw, y + 7); g.lineTo(x + sw - 5, y); g.closePath(); g.fill(); g.globalAlpha = 1; }
      else lamp(g, x + sw, y, 2.4, col, f, k, blur);
    }
    for (let i = 0; i < 12; i++) {
      const sp = 160 + rnd(841, i) * 120, span = 4000, x = ((rnd(842, i) * span + T * sp * (i % 2 ? 1 : -1)) % span + span) % span - 900;
      lamp(g, x, 1872 + (i % 2) * 10, 3, i % 2 ? '#FFF2DC' : '#FF4A3A', .5, k, blur);
    }
    // traffic: long-exposure head/tail-light streaks moving left -> right on the deck
    for (let i = 0; i < 52; i++) {
      const red = i % 3 === 0, sp = 380 + rnd(811, i) * 260, span = 4200;
      const x = ((rnd(812, i) * span + T * sp) % span) - 1000, y = y0 - 22 - (red ? 0 : 5) - rnd(813, i) * 4;
      const len = 46 + rnd(814, i) * 50, col = red ? C.red : '#FFF2DC';
      const gr = g.createLinearGradient(x - len, 0, x, 0); gr.addColorStop(0, L.rgba(col, 0)); gr.addColorStop(1, L.rgba(col, red ? .55 : .7));
      g.fillStyle = gr; g.fillRect(x - len, y - 1.6, len, 3.2);
      lamp(g, x, y, red ? 1.8 : 2.2, red ? '#FF4A3A' : '#FFFFFF', red ? .6 : .85, k, blur);
    }
    g.restore();
  }

  /* ------------------------------------------------------------------ H2 rooftop block (d 1.6) */
  // H2 face (drawn by s2): x 500-800, y 1000-1176; this block is the building it stands on (roof 1262)
  const H2X0 = 470, H2X1 = 2200, H2ROOF = 1262;
  // balconies (Legacy-Line railings of equal pillars) with diyas: [x, w, floor]
  const BALC = [[612, 104, 1], [878, 120, 3], [1010, 92, 0], [1300, 110, 2], [1560, 120, 1]];
  let H2C = null;
  function h2Layer() {
    if (H2C) return H2C;
    H2C = layerCache('h2', H2X0 - 20, 960, H2X1 - H2X0 + 40, 820, 6, g => {
      const roof = H2ROOF, R = i => rnd(830, i);
      rimFill(g, gg => gg.fillRect(H2X0, roof, H2X1 - H2X0, 600), '#262223', .55);
      // floors: 40 px; flats of 3 windows between pilasters; ~35% of flats dark, lit ones warm or tubelight
      const PIT = 34, FLAT = 3 * PIT + 22;
      for (let r = 0; r < 12; r++) {
        const wy = roof + 30 + r * 40;
        g.fillStyle = 'rgba(140,135,131,.16)'; g.fillRect(H2X0, wy - 8, H2X1 - H2X0, 2);                 // floor slab line
        for (let f = 0, fx = H2X0 + 14 + (r % 2) * 9; fx < H2X1 - FLAT; f++, fx += FLAT) {
          const st = R(r * 97 + f * 7), kind = st < .35 ? 0 : st < .55 ? 1 : st < .9 ? 2 : 3;
          g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(fx + 3 * PIT - 4, wy - 6, 22, 30);                // pilaster shadow
          for (let j = 0; j < 3; j++) {
            const wx = fx + j * PIT, v = R(r * 997 + f * 31 + j);
            let fill = 'rgba(10,9,10,.4)';
            if (kind === 1) fill = v > .3 ? 'rgba(201,196,191,.11)' : fill;
            else if (kind === 2) fill = v > .65 ? 'rgba(255,176,92,.32)' : v > .2 ? 'rgba(255,181,71,.17)' : fill;
            else if (kind === 3) fill = 'rgba(255,168,76,.38)';
            g.fillStyle = fill; g.fillRect(wx, wy, 14, 18);
            if (kind >= 2 && v > .5) { g.fillStyle = 'rgba(70,26,22,.5)'; g.fillRect(wx + 8, wy, 6, 18); }        // curtain
            if (kind === 3) { g.fillStyle = 'rgba(255,214,140,.6)'; for (let d = 1; d < 4; d++) g.fillRect(wx + d * 3.5 - .6, wy + 2, 1.3, 1.3); }
            if (kind === 0 && v < .12) { g.fillStyle = 'rgba(120,116,112,.45)'; g.fillRect(wx + 15, wy + 11, 7, 6); }   // AC unit
          }
        }
      }
      // balconies: slab, warm open door, Legacy-Line railing (equal pillars, Stone top edge)
      for (const [bx, bw, fl] of BALC) {
        const by = roof + 30 + fl * 40;
        const dg = g.createLinearGradient(0, by - 4, 0, by + 26); dg.addColorStop(0, 'rgba(255,170,80,.42)'); dg.addColorStop(1, 'rgba(255,150,60,.12)');
        g.fillStyle = dg; g.fillRect(bx + bw * .3, by - 4, bw * .36, 28);
        g.fillStyle = '#151214'; g.fillRect(bx - 6, by + 24, bw + 12, 5);
        g.fillStyle = 'rgba(140,135,131,.55)'; g.fillRect(bx - 6, by + 24, bw + 12, 1.2);
        g.fillStyle = '#1B1819'; for (let px = bx - 4; px < bx + bw + 4; px += 7) g.fillRect(px, by + 9, 4, 15);
        g.fillStyle = '#1B1819'; g.fillRect(bx - 6, by + 7, bw + 12, 3);
        g.fillStyle = 'rgba(140,135,131,.6)'; g.fillRect(bx - 6, by + 7, bw + 12, 1);
      }
      g.fillStyle = 'rgba(140,135,131,.22)'; for (let r = 0; r < 12; r += 3) g.fillRect(H2X0, roof + 22 + r * 40, H2X1 - H2X0, 1.4);
      // parapet with jaali gaps
      g.fillStyle = '#262223'; g.fillRect(H2X0, roof - 12, H2X1 - H2X0, 12);
      g.fillStyle = 'rgba(140,135,131,.5)'; g.fillRect(H2X0, roof - 12, H2X1 - H2X0, 1.5);
      g.fillStyle = 'rgba(0,0,0,.45)'; for (let x = H2X0 + 6; x < H2X1; x += 16) g.fillRect(x, roof - 9, 8, 6);
      // hoarding structure: twin trusses with a V brace under the H2 face (x 500-800, bottom 1176)
      for (const lx of [548, 718]) {
        g.fillStyle = C.steel; g.fillRect(lx, 1182, 8, roof - 1182); g.fillRect(lx + 24, 1182, 8, roof - 1182);
        g.fillStyle = 'rgba(140,135,131,.4)'; g.fillRect(lx, 1182, 1.5, roof - 1182);
        g.strokeStyle = C.steel; g.lineWidth = 2.5; g.beginPath(); for (let y = 1182; y < roof; y += 18) { g.moveTo(lx + 4, y); g.lineTo(lx + 28, y + 9); g.lineTo(lx + 4, y + 18); } g.stroke();
      }
      // Sintex tank + mumty
      g.fillStyle = '#151314'; g.fillRect(930, roof - 52, 54, 40); g.fillRect(936, roof - 12, 4, 12); g.fillRect(974, roof - 12, 4, 12);
      g.fillStyle = 'rgba(140,135,131,.35)'; g.fillRect(930, roof - 52, 54, 2); g.fillRect(930, roof - 38, 54, 1.5); g.fillRect(930, roof - 26, 54, 1.5);
      g.fillStyle = '#1A1718'; g.fillRect(1180, roof - 40, 70, 40); g.fillStyle = 'rgba(255,181,71,.2)'; g.fillRect(1205, roof - 32, 14, 30);
      g.fillStyle = 'rgba(140,135,131,.4)'; g.fillRect(1180, roof - 40, 70, 1.5);
    });
    return H2C;
  }
  function drawH2Block(g, T, k, blur) {
    drawLC(g, h2Layer(), k, blur);
    g.save(); g.globalCompositeOperation = 'lighter';
    const pulse = 1 + .35 * Math.exp(-Math.pow((T - TM.b7 - .05) / .06, 2));
    for (let i = 0; i < 64; i++) { const x = H2X0 + 6 + i * 10.5; lamp(g, x, H2ROOF - 7 + Math.abs(Math.sin(i * .55)) * 4, 1.6, LIGHTCOLS[i % 4], ((Math.floor(T * 8) + i) % 3 === 0 ? 1 : .4) * pulse, k, blur); }
    for (let i = 0; i < 10; i++) { const fl = .7 + .3 * L.noise1(T * 9 + i * 3, 9); lamp(g, 860 + i * 22, H2ROOF - 14, 1.6, '#FFB547', fl * pulse, k, blur); }
    for (const [bx, bw, fl] of BALC) {                                                 // diyas on the balcony rails + door glow
      const by = H2ROOF + 30 + fl * 40;
      put(g, softSpr('#FFB547'), bx + bw / 2, by + 8, bw * .7, .16);
      const n = Math.max(3, Math.round(bw / 26));
      for (let i = 0; i < n; i++) { const f = .7 + .3 * L.noise1(T * 9 + i * 2.1 + bx, 13); lamp(g, bx + 4 + i * (bw - 8) / (n - 1), by + 4, 1.5, '#FFB547', f * pulse, k, blur); }
    }
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
    const bo = L.EN ? { font: 'lat', size: 38, weight: 650, color: C.violet, tracking: 3 } : { font: 'dev', size: 40, weight: 600, color: C.violet };
    const BA = L.EN ? 'DIWALI NIGHT' : 'बुक्ड', BB = L.EN ? '2026' : 'दीपावली 2026';
    const w1 = L.measure(g, BA, bo), w2 = L.measure(g, BB, bo), gap = 40, x0 = -(w1 + gap + w2) / 2;
    L.text(g, BA, x0, 69, Object.assign({ align: 'left', maxWidth: w1 + 4 }, bo));
    L.circle(g, x0 + w1 + gap / 2, 57, 4.2); g.fill();
    L.text(g, BB, x0 + w1 + gap, 69, Object.assign({ align: 'left', maxWidth: w2 + 4 }, bo));
    g.restore();
    if (solid) return;
  }
  /** variant 0 = settled impression; 1..3 = wet "boil" frames (on twos) */
  function stampCanvas(v) {
    return L.cached('mmh-stamp-' + v, STW, STH, g => {
      stampArt(g);
      const ink = L.textureCanvas('ink', 512, 7 + v * 3);
      g.globalCompositeOperation = 'destination-out';
      g.globalAlpha = v ? .2 : .15; g.drawImage(ink, -40 - v * 37, -60 - v * 23, 900, 520);                       // uneven ink density (dense: dry ink >= .92 of wet)
      g.globalAlpha = v ? .14 : .1; const grain = L.textureCanvas('powder', 512, 21 + v); g.drawImage(grain, 0, 0, STW, STH);
      g.globalAlpha = 1; g.fillStyle = '#000';
      for (let i = 0; i < 52; i++) {                                                                               // wood-grain streaks
        const y = 20 + rnd(41 + v, i) * (STH - 40), x0 = rnd(42 + v, i) * STW, len = 30 + rnd(43 + v, i) * 220;
        g.globalAlpha = .1 + rnd(44 + v, i) * .22; g.beginPath(); g.moveTo(x0, y); g.bezierCurveTo(x0 + len * .3, y - 1.5, x0 + len * .7, y + 1.5, x0 + len, y); g.lineWidth = .6 + rnd(45 + v, i) * 1.6; g.strokeStyle = '#000'; g.stroke();
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
    // the ink itself never fades: only the wet boil (on twos) and the sheen dry off between .4 and .8
    g.save(); g.rotate(jit); g.scale(sq, sq);
    if (f <= 0) { g.globalAlpha = 1; g.drawImage(stampSolid(), -STW / 2, -STH / 2); }
    else {
      g.globalAlpha = .35; g.drawImage(stampCanvas(0), -STW / 2 + 2, -STH / 2 - 1.5);       // double strike, 2px misregistration
      g.globalAlpha = 1; g.drawImage(stampCanvas(0), -STW / 2, -STH / 2);
      if (wetA > .01) { g.globalAlpha = .6 * wetA; g.drawImage(stampCanvas(v), -STW / 2, -STH / 2); }
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
      if (L.EN) L.text(g, 'Advertise here', FW / 2, 285, { font: 'lat', size: 66, weight: 700, color: C.stone, maxWidth: 700 });
      else L.text(g, 'जगह खाली है', FW / 2, 290, { font: 'dev', size: 76, weight: 700, color: C.stone, maxWidth: 700 });
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
    const dg3 = g.createRadialGradient(230, 1270, 0, 230, 1270, 200); dg3.addColorStop(0, `rgba(255,181,71,${(.22 * flk).toFixed(3)})`); dg3.addColorStop(.5, `rgba(255,181,71,${(.08 * flk).toFixed(3)})`); dg3.addColorStop(1, 'rgba(255,181,71,0)');
    g.fillStyle = dg3; g.fillRect(FX, 1070, 430, 220);                                  // the diya's warm pool on the face (r 200)
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
    if (T >= TH) {                                                                     // contact from .39 so every sub-frame of the .400 frame is the squash pose
      const tau = Math.max(0, T - TM.hit);
      g.save(); g.translate(cx, cy); g.rotate(rot); H.drawImpression(g, tau, 40, 1); wetSheen(g, T);
      if (tau < .3) {                                                                  // displaced dust: a soft ring racing out from the block's edge
        const r = 1 + tau * 1.1, a = .34 * (1 - tau / .3);
        for (let j = 0; j < 3; j++) { g.strokeStyle = `rgba(214,208,204,${(a * (1 - j * .3)).toFixed(3)})`; g.lineWidth = 10 + j * 10; g.strokeRect(-350 * r - j * 6, -125 * r - j * 6, 700 * r + j * 12, 250 * r + j * 12); }
      }
      g.restore();
    }
    stampShadow(g, T);                                                                 // the airborne/held/lifted block's shadow (<= 25%, face only)
    // ---- handwriting: "for you" (stroke-mask write-on, italic slant edge)
    if (T >= TM.write0) writeOn(g, T);
    if (T >= TM.hi0) {
      const u = Ez.outCubic(clamp((T - TM.hi0) / (TM.hi1 - TM.hi0)));
      L.text(g, L.EN ? '(yes, you.)' : 'आपके लिए', 540, 1244 + 12 * (1 - u), { font: 'tiro', italic: true, size: 60, color: C.red, alpha: u, maxWidth: 400 });
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
  let WC = null, INKCOL = null;
  const FY_W = 1160;
  const FY_SRC = () => L.cached('mmh-foryou', 600, 220, gg => L.text(gg, 'for you', 300, 150, { font: 'tiro', italic: true, size: 120, color: C.red, maxWidth: 520 }));
  // pen schedule (frames after 1.000 -> pen x in the 600 px canvas, rel. to the text's left edge): slow on the f ascender and
  // the y descender, quick on 'or' / 'ou', a 2-frame lift across the word gap
  const PEN = [[0, 0], [3.6, 46], [6.4, 151.8], [8.4, 151.8, 'lift'], [8.4, 183], [11.2, 238], [14, 377.2]];
  function penAt(fr) {
    for (let i = 1; i < PEN.length; i++) {
      const [f0, x0] = PEN[i - 1], [f1, x1, tag] = PEN[i];
      if (fr <= f1 || i === PEN.length - 1) {
        if (f1 <= f0) continue;
        const u = clamp((fr - f0) / (f1 - f0)), e = lerp(u, u * u * (3 - 2 * u), .55);
        return { x: lerp(x0, x1, e), lifted: tag === 'lift' };
      }
    }
    return { x: 377.2, lifted: false };
  }
  function inkColumns() {                                                              // per-column ink centroid of the source, for the nib
    if (INKCOL) return INKCOL;
    const src = FY_SRC(), d = src.getContext('2d').getImageData(0, 0, 600, 220).data, mean = new Float32Array(600), has = new Uint8Array(600);
    for (let x = 0; x < 600; x++) { let sy = 0, n = 0; for (let y = 0; y < 220; y++) if (d[(y * 600 + x) * 4 + 3] > 140) { sy += y; n++; } if (n) { mean[x] = sy / n; has[x] = 1; } }
    INKCOL = { mean, has }; return INKCOL;
  }
  function writeOn(g, T) {
    const src = FY_SRC();
    const fr = (T - TM.write0) * 30;
    if (fr >= 14) { g.drawImage(src, 540 - 300, FY_W - 150); return; }
    if (!WC) { WC = document.createElement('canvas'); WC.width = 600; WC.height = 220; }
    const w = WC.getContext('2d'); w.globalCompositeOperation = 'source-over'; w.globalAlpha = 1; w.clearRect(0, 0, 600, 220); w.drawImage(src, 0, 0);
    const full = 377.2, left = 300 - full / 2, pen = penAt(fr), xe = left + pen.x + 8;
    w.globalCompositeOperation = 'destination-in';
    w.save(); w.transform(1, 0, -.2, 1, .2 * 150, 0);
    const gr = w.createLinearGradient(xe - 7, 0, xe + 1, 0); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    w.fillStyle = gr; w.fillRect(-100, 0, 800, 220); w.restore();
    w.globalCompositeOperation = 'source-over';
    if (!pen.lifted && fr > .3) {                                                      // the nib: a 3 px pool of wet ink at the leading edge
      const ic = inkColumns(); let xc = Math.round(xe - 8), yc = 0, ok = false;
      for (let dx = 0; dx < 10 && !ok; dx++) { const xx = Math.max(0, Math.min(599, xc - dx)); if (ic.has[xx]) { yc = ic.mean[xx]; xc = xx; ok = true; } }
      if (ok) { const nx = xc + 2; w.fillStyle = L.mix(C.red, '#2B2728', .32); L.circle(w, nx, yc, 3.2); w.fill(); w.fillStyle = 'rgba(244,242,238,.35)'; L.circle(w, nx - 1, yc - 1.2, .9); w.fill(); }
    }
    g.drawImage(WC, 540 - 300, FY_W - 150);
  }
  /* ---- the rubber stamp: a real prop, modelled in 3D and projected about the optical centre, so it reads as a
     rubber stamp from every angle: an Ink wood mount (700 x 250) with a 16 px Stone top bevel, the violet rubber die
     under it (its inked edge shows while it is in the air) and a turned knob (120 wide, 160 tall, 2 px Stone highlight).
     Local units: the 700 x 250 footprint centred on the rubber face, +z away from the board.
     Hero choreography: it swings in from the right (the hand's side) leaning on its handle, hangs a beat below the
     tubelights, slams flat (contact .39), holds 2 frames, then is lifted up and out to the right, which reveals the
     ink left to right (B-O-O-K-E-D). It never crosses the sky or the lamps. Motion blur: the prop is supersampled. */
  const TH = q(.4) - .01;                                                              // contact threshold (.39)
  const VPX = 540, VPY = 960;
  const STK = { rw: 349, rh: 124, rz: 20, hw: 350, hh: 125, wz: 60, bev: 16, bz: 74, ballH: 100, ballR: 60 };
  // turned knob [height above the mount's back, radius]: a flange and a waisted neck (lathe discs), then the ball
  // (r 60 at h 100: 120 wide, 160 tall overall)
  const KNOB = [[0, 44], [7, 44], [11, 35], [16, 27], [24, 20], [34, 17.5], [44, 18], [52, 22], [58, 30]];
  const STAMP_D = 1800;                                                                // hook px: a ~40 deg lens
  const LDIR = (() => { const v = [-.2, -.8, .57], n = Math.hypot(v[0], v[1], v[2]); return v.map(x => x / n); })();   // the tubelights: above, in front
  const RGB = h => L.rgb(h), mixA = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const css = c => `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`;
  const W_LO = RGB('#141112'), W_HI = RGB(C.stone), W_INK = RGB(C.ink), WARM = RGB('#5E3D24'), V_LO = RGB('#2C2570'), V_HI = RGB('#7A70CC'), BOUNCE = [128, 84, 50];
  const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  /** wood under the lamps (+ a warm bounce from the diya on faces that look down) */
  function woodCol(n, lift) { const l = dot3(n, LDIR); let c = mixA(W_LO, W_HI, L.smoothstep(.1, .97, l) * (lift || 1)); if (n[1] > .15) c = mixA(c, WARM, .28 * n[1]); return c; }
  function rubberCol(n) { const l = dot3(n, LDIR); return mixA(V_LO, V_HI, L.smoothstep(-.2, .9, l)); }
  /** orientation: in-plane rotation rot, then a lean of `tilt` rad that tips the handle toward screen angle tdir */
  function orient(rot, tilt, tdir) {
    const cr = Math.cos(rot), sr = Math.sin(rot), kx = -Math.sin(tdir), ky = Math.cos(tdir), c = Math.cos(tilt), s = Math.sin(tilt);
    return (x, y, z) => {
      const vx = x * cr - y * sr, vy = x * sr + y * cr, kd = kx * vx + ky * vy;
      return [vx * c + ky * z * s + kx * kd * (1 - c), vy * c - kx * z * s + ky * kd * (1 - c), z * c + (kx * vy - ky * vx) * s];
    };
  }
  /** pose -> painter-ordered polygons. P: { cx, cy, Z (rubber face centre in layer px, Z toward the lens), u (layer px per
      stamp unit), rot, tilt, tdir, D (lens distance, layer px), vx, vy (optical centre in layer coords), alpha, discs } */
  function stampGeom(P) {
    const R = orient(P.rot, P.tilt, P.tdir), u = P.u, D = P.D, cam = [P.vx, P.vy, D];
    const W = (x, y, z) => { const v = R(x, y, z); return [P.cx + v[0] * u, P.cy + v[1] * u, P.Z + v[2] * u]; };
    const pj = w => { const s = D / Math.max(D * .1, D - w[2]); return [P.vx + (w[0] - P.vx) * s, P.vy + (w[1] - P.vy) * s]; };
    const polys = [], pts = [];
    const quad = (ws, nLocal, colFn) => {
      const n = R(nLocal[0], nLocal[1], nLocal[2]), c = [(ws[0][0] + ws[2][0]) / 2, (ws[0][1] + ws[2][1]) / 2, (ws[0][2] + ws[2][2]) / 2];
      if (dot3(n, [cam[0] - c[0], cam[1] - c[1], cam[2] - c[2]]) <= 0) return;
      const p = ws.map(pj); polys.push({ p, fill: css(colFn(n)) }); for (const q2 of p) pts.push(q2);
    };
    const box = (hw, hh, z0, z1, colFn) => {
      const c = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]];
      for (let i = 0; i < 4; i++) {
        const a = c[i], b = c[(i + 1) % 4], nl = [[0, -1, 0], [1, 0, 0], [0, 1, 0], [-1, 0, 0]][i];
        quad([W(a[0], a[1], z0), W(b[0], b[1], z0), W(b[0], b[1], z1), W(a[0], a[1], z1)], nl, colFn);
      }
    };
    box(STK.rw, STK.rh, 0, STK.rz, rubberCol);                                         // the inked rubber die
    box(STK.hw, STK.hh, STK.rz, STK.wz, n => woodCol(n, .8));                          // the wood mount's sides
    const b = STK.bev, o = [[-STK.hw, -STK.hh], [STK.hw, -STK.hh], [STK.hw, STK.hh], [-STK.hw, STK.hh]], ii = [[-STK.hw + b, -STK.hh + b], [STK.hw - b, -STK.hh + b], [STK.hw - b, STK.hh - b], [-STK.hw + b, STK.hh - b]];
    const bevN = [[0, -.707, .707], [.707, 0, .707], [0, .707, .707], [-.707, 0, .707]];
    for (let i = 0; i < 4; i++) {                                                      // the 16 px bevel: Stone where it faces the lamps
      const j = (i + 1) % 4;
      quad([W(o[i][0], o[i][1], STK.wz), W(o[j][0], o[j][1], STK.wz), W(ii[j][0], ii[j][1], STK.bz), W(ii[i][0], ii[i][1], STK.bz)], bevN[i], n => woodCol(n, 1));
    }
    const back = ii.map(c => pj(W(c[0], c[1], STK.bz)));
    // the turned knob: stacked discs (a solid of revolution), each shaded by its profile slope against the light
    const A = R(0, 0, 1), e1 = R(1, 0, 0), e2 = R(0, 1, 0);
    let rl = [LDIR[0] - dot3(LDIR, A) * A[0], LDIR[1] - dot3(LDIR, A) * A[1], LDIR[2] - dot3(LDIR, A) * A[2]]; const rn = Math.hypot(rl[0], rl[1], rl[2]) || 1; rl = rl.map(x => x / rn);
    const thL = Math.atan2(dot3(rl, e2), dot3(rl, e1));
    const discs = [], nd = P.discs || 24, seg = nd > 16 ? 26 : 16;
    for (let i = 0; i < nd; i++) {
      const h = 58 * i / (nd - 1);
      let k = 1; while (k < KNOB.length - 1 && KNOB[k][0] < h) k++;
      const [h0, r0] = KNOB[k - 1], [h1, r1] = KNOB[k], r = r0 + (r1 - r0) * clamp((h - h0) / Math.max(1e-6, h1 - h0)), slope = (r1 - r0) / Math.max(1e-6, h1 - h0);
      if (r < .5) continue;
      const ca = 1 / Math.hypot(1, slope), sa = -slope * ca, z = STK.bz + h;
      const nLit = [rl[0] * ca + A[0] * sa, rl[1] * ca + A[1] * sa, rl[2] * ca + A[2] * sa], nDk = [-rl[0] * ca + A[0] * sa, -rl[1] * ca + A[1] * sa, -rl[2] * ca + A[2] * sa];
      const p = [];
      for (let s = 0; s < seg; s++) { const th = s / seg * 6.2832, cx = Math.cos(th) * r, cy = Math.sin(th) * r; p.push(pj(W(cx, cy, z))); }
      const pl = pj(W(Math.cos(thL) * r, Math.sin(thL) * r, z)), pd = pj(W(-Math.cos(thL) * r, -Math.sin(thL) * r, z));
      discs.push({ p, pl, pd, cl: css(mixA(woodCol(nLit, .8), W_INK, .12)), cd: css(mixA(mixA(woodCol(nDk, .7), W_LO, .2), BOUNCE, .32)), r, h });
      if (i === 0) for (const q2 of p) pts.push(q2);
    }
    // the ball: a sphere seen in perspective (a circle about its projected centre), lit from the lamps' side
    const bw = W(0, 0, STK.bz + STK.ballH), bc = pj(bw), bs = D / Math.max(D * .1, D - bw[2]), br = STK.ballR * u * bs;
    let lx = LDIR[0], ly = LDIR[1]; const ln = Math.hypot(lx, ly) || 1; lx /= ln; ly /= ln;      // the light's direction on screen
    const ball = { x: bc[0], y: bc[1], r: br, lx, ly };
    pts.push([bc[0] - br, bc[1] - br], [bc[0] + br, bc[1] + br]);
    const hl = [];
    // the back face's affine frame (for its wood grain)
    const a0 = pj(W(ii[0][0], ii[0][1], STK.bz)), a1 = pj(W(ii[1][0], ii[1][1], STK.bz)), a3 = pj(W(ii[3][0], ii[3][1], STK.bz));
    for (const q2 of back) pts.push(q2);
    return { polys, back, discs, hl, ball, grain: [a0, a1, a3], pts, u, alpha: P.alpha == null ? 1 : P.alpha, s0: Math.hypot(a1[0] - a0[0], a1[1] - a0[1]) / (2 * (STK.hw - b)) };
  }
  function hull(pts) {
    const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]), cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], up = [];
    for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
    for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
    return lo.slice(0, -1).concat(up.slice(0, -1));
  }
  function polyFill(g, pts, fill) { g.fillStyle = fill; g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.fill(); }
  function polyPath(g, p) { g.beginPath(); for (let i = 0; i < p.length; i++) i ? g.lineTo(p[i][0], p[i][1]) : g.moveTo(p[i][0], p[i][1]); g.closePath(); }
  /** paint a stamp pose (layer coords). Returns its outline points (for bbox / supersampling). */
  function stamp3D(g, P) {
    const G = stampGeom(P);
    if (!g) return G.pts;
    g.save(); g.globalAlpha = G.alpha; g.lineJoin = 'round';
    for (const f of G.polys) { g.fillStyle = f.fill; polyPath(g, f.p); g.fill(); g.strokeStyle = f.fill; g.lineWidth = .6 * Math.max(.5, G.u); g.stroke(); }   // hairline stroke seals the seams
    const [a0, a1, a3] = G.grain, ux = [(a1[0] - a0[0]) / 668, (a1[1] - a0[1]) / 668], uy = [(a3[0] - a0[0]) / 218, (a3[1] - a0[1]) / 218];
    const bg = g.createLinearGradient(a0[0], a0[1], a3[0], a3[1]); bg.addColorStop(0, '#332E2F'); bg.addColorStop(1, C.ink);
    g.fillStyle = bg; polyPath(g, G.back); g.fill();                                  // the mount's back: Ink, a touch lighter toward the lamps
    if (!H.FAST) {                                                                     // wood grain on the back
      g.save(); polyPath(g, G.back); g.clip();
      g.transform(ux[0], ux[1], uy[0], uy[1], a0[0] + 334 * ux[0] + 109 * uy[0], a0[1] + 334 * ux[1] + 109 * uy[1]);
      g.strokeStyle = C.stone;
      for (let i = 0; i < 22; i++) {                                                   // sheesham grain: uneven runs, a knot's ripple
        const y = -109 + rnd(611, i) * 218, x0 = -334 + rnd(615, i) * 300, x1 = Math.min(334, x0 + 180 + rnd(616, i) * 520), bow = (rnd(612, i) - .5) * 14;
        g.globalAlpha = G.alpha * (.05 + rnd(613, i) * .13); g.lineWidth = .8 + rnd(614, i) * 1.6;
        g.beginPath(); g.moveTo(x0, y); g.bezierCurveTo(lerp(x0, x1, .33), y + bow, lerp(x0, x1, .66), y - bow * .6 + (y > 20 && y < 40 ? 7 : 0), x1, y + bow * .2); g.stroke();
      }
      g.globalAlpha = G.alpha;
      g.restore();
    }
    for (const d of G.discs) {                                                         // the knob, lowest disc first
      const gr = g.createLinearGradient(d.pl[0], d.pl[1], d.pd[0], d.pd[1]); gr.addColorStop(0, d.cl); gr.addColorStop(.55, d.cd); gr.addColorStop(1, d.cd);
      g.fillStyle = gr; polyPath(g, d.p); g.fill();
    }
    const B = G.ball, bx = B.x + B.lx * B.r * .38, by = B.y + B.ly * B.r * .38;
    const rg = g.createRadialGradient(bx, by, 0, B.x + B.lx * B.r * .15, B.y + B.ly * B.r * .15, B.r);
    rg.addColorStop(0, '#6A6462'); rg.addColorStop(.35, '#3E393A'); rg.addColorStop(.75, C.ink); rg.addColorStop(1, '#161314');
    g.fillStyle = rg; L.circle(g, B.x, B.y, B.r); g.fill();
    const lw = Math.max(2 * G.u, .9), a0r = Math.atan2(B.ly, B.lx);
    g.strokeStyle = C.stone; g.lineWidth = lw; g.lineCap = 'round';                   // the 2 px Stone highlight on the ball's lit rim
    g.beginPath(); g.arc(B.x, B.y, Math.max(.5, B.r - lw * .6), a0r - 1.05, a0r + 1.05); g.stroke();
    g.strokeStyle = 'rgba(150,98,56,.55)'; g.lineWidth = lw * 1.6;                     // the diya's warm bounce on the shadow side
    g.beginPath(); g.arc(B.x, B.y, Math.max(.5, B.r - lw * .9), a0r + Math.PI - .8, a0r + Math.PI + .8); g.stroke();
    if (!H.FAST) { g.fillStyle = 'rgba(244,242,238,.32)'; g.beginPath(); g.ellipse(bx, by, B.r * .16, B.r * .1, a0r + 1.5708, 0, 6.2832); g.fill(); }   // lacquer glint
    g.restore();
    return G.pts;
  }
  /** hero pose in hook (frame-0) coords. Screen-space keys: centre (sx, sy), apparent scale sc of the rubber face. */
  const T_IN0 = TM.drop - 1 / 30, T_IN1 = q(.3) + .01, T_L0 = q(.467), T_L1 = q(.633);
  function heroKeys(T) {
    if (T < T_IN1) {                                                                   // swings in from the right, leaning on its handle
      const w = clamp((T - T_IN0) / (T_IN1 - T_IN0)), e = Ez.outCubic(w);
      return { sx: lerp(1430, 600, e), sy: lerp(640, 762, e), sc: 1.3, tilt: lerp(52, 34, e), tdir: -38, rot: lerp(-11, -16, Ez.outQuad(w)), alpha: lerp(.6, 1, clamp(w / .45)) };
    }
    if (T < TH) {                                                                      // hangs, then slams flat
      const w = clamp((T - T_IN1) / (TH - T_IN1)), e = Math.pow(w, 2.2);
      return { sx: lerp(600, 540, e), sy: lerp(762, 900, e), sc: lerp(1.3, 1, e), tilt: lerp(34, 0, e), tdir: -38, rot: lerp(-16, -9, e), alpha: 1 };
    }
    if (T < T_L0) return { sx: 540, sy: 900, sc: 1, tilt: 0, tdir: -38, rot: -9, alpha: 1 };   // held 2 frames
    const e = Ez.inCubic(clamp((T - T_L0) / (T_L1 - T_L0)));                          // lifted up and out to the right
    return { sx: 540 + 1120 * e, sy: 900 - 170 * e, sc: lerp(1, 1.12, e), tilt: 34 * L.smoothstep(0, .5, e), tdir: -40, rot: -9, alpha: 1 };
  }
  function heroPose(T) {
    const k = heroKeys(T), Z = STAMP_D * (1 - 1 / k.sc);
    return { cx: VPX + (k.sx - VPX) / k.sc, cy: VPY + (k.sy - VPY) / k.sc, Z, u: 1, rot: k.rot * DEG, tilt: k.tilt * DEG, tdir: k.tdir * DEG, D: STAMP_D, vx: VPX, vy: VPY, alpha: k.alpha, sc: k.sc };
  }
  const heroLive = T => T >= T_IN0 && T < T_L1;
  /** accumulate K sub-samples of a moving prop into the current frame (premultiplied average, source-over per sample).
      Only the prop's device-space bbox is touched, so it stays cheap. */
  let SB = null;
  function subBuffers(w, h) {
    if (!SB || SB[0].width !== w || SB[0].height !== h) { SB = [0, 1].map(() => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }); }
    return SB;
  }
  H.propSS = (g, T, K, span, drawFn, blurPx) => {
    const cw = g.canvas.width, ch = g.canvas.height, M = g.getTransform();
    const [acc, tmp] = subBuffers(cw, ch), a = acc.getContext('2d'), m = tmp.getContext('2d');
    let x0 = cw, y0 = ch, x1 = 0, y1 = 0;
    const samples = [];
    for (let i = 0; i < K; i++) samples.push(T + ((i + .5) / K - .5) * span);
    // pass 1: bbox in device px (drawFn returns its outline points in local coords)
    for (const ti of samples) { const pts = drawFn(null, ti); if (!pts) continue; for (const p of pts) { const X = M.a * p[0] + M.c * p[1] + M.e, Y = M.b * p[0] + M.d * p[1] + M.f; x0 = Math.min(x0, X); y0 = Math.min(y0, Y); x1 = Math.max(x1, X); y1 = Math.max(y1, Y); } }
    const pad = 4 + (blurPx || 0) * 3 * L.baseScale;
    x0 = Math.max(0, Math.floor(x0 - pad)); y0 = Math.max(0, Math.floor(y0 - pad)); x1 = Math.min(cw, Math.ceil(x1 + pad)); y1 = Math.min(ch, Math.ceil(y1 + pad));
    if (x1 <= x0 || y1 <= y0) return;
    const bw = x1 - x0, bh = y1 - y0;
    a.setTransform(1, 0, 0, 1, 0, 0); a.clearRect(x0, y0, bw, bh); a.globalCompositeOperation = 'lighter'; a.globalAlpha = 1 / K;
    for (const ti of samples) {
      m.setTransform(1, 0, 0, 1, 0, 0); m.globalAlpha = 1; m.globalCompositeOperation = 'source-over'; m.filter = 'none'; m.clearRect(x0, y0, bw, bh);
      m.save(); m.beginPath(); m.rect(x0, y0, bw, bh); m.clip(); m.setTransform(M); drawFn(m, ti); m.restore();
      a.drawImage(tmp, x0, y0, bw, bh, x0, y0, bw, bh);
    }
    const bs = L.baseScale;
    g.save(); L.resetTransform(g); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    if (blurPx > .5) g.filter = `blur(${(blurPx * bs).toFixed(2)}px)`;
    g.drawImage(acc, x0, y0, bw, bh, x0 / bs, y0 / bs, bw / bs, bh / bs); g.filter = 'none'; g.restore();
  };
  function stampFlight(g, T) {
    if (T < T_IN0 - 1 / 240 || T >= T_L1 + 1 / 240) return;
    const drawFn = (gg, ti) => heroLive(ti) ? stamp3D(gg, heroPose(ti)) : null;
    const sc = heroKeys(clamp(T, T_IN0, T_L1 - 1e-4)).sc, blurPx = Math.min(3, (sc - 1) * 3.6);   // a touch of defocus when nearer the lens
    if (H.SSK > 1) { if (!heroLive(T)) return; g.save(); if (blurPx > .5) setBlur(g, blurPx); stamp3D(g, heroPose(T)); g.restore(); return; }
    H.propSS(g, T, 8, 1 / 240, drawFn, blurPx);
  }
  // the stamp's shadow on the face (drawn under the lighting multiply, so it is clipped to the face and lit with it):
  // the top lamps throw it down-right of the block; it sharpens and darkens as the block nears the board (<= 25%)
  const shadowSpr = soft => L.cached('mmh-stsh-' + soft, 1000, 560, g => { g.filter = `blur(${soft}px)`; g.fillStyle = '#120E18'; g.fillRect(150, 155, 700, 250); g.filter = 'none'; });
  function stampShadow(g, T) {
    if (!heroLive(T)) return;
    const P = heroPose(T), z = P.Z + 40, near = clamp(1 - z / 700);
    const x = P.cx + .05 * z + 4, y = P.cy + .3 * z + 9, s = 1 + z / 2600, a = .25 * (.35 + .65 * near) * (.5 + .5 * lampI(T)) * P.alpha;
    g.save(); g.translate(x, y); g.rotate(P.rot); g.scale(s, s);
    g.globalAlpha = a * near; g.drawImage(shadowSpr(10), -500, -280);
    g.globalAlpha = a * (1 - near) * .9; g.drawImage(shadowSpr(34), -500, -280);
    g.restore();
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
    hazeBand(ctx, T, { y0: -260, y1: 900, alpha: .08, color: '#7B6BB0', speed: 6, seed: 12, scale: 3.4 });
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
      g.save(); g.strokeStyle = '#0B090B'; g.lineCap = 'round'; g.beginPath();
      for (let i = 0; i <= 40; i++) { const [x, y] = pt(i / 40); i ? g.lineTo(x, y) : g.moveTo(x, y); }
      for (const [lw, a] of [[s.r * 1.1, .12], [s.r * .7, .16], [s.r * .35, .22]]) { g.globalAlpha = fade * a; g.lineWidth = lw; g.stroke(); }
      g.restore();
      g.save(); g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < s.n; i++) {
        const p = (i + .5) / s.n, [x, y] = pt(p); const col = LIGHTCOLS[(i + s.sd) % 4];
        const v = .55 + .45 * L.noise1(T * 1.8 + i * 2.3, s.sd);
        const r = s.r * (.85 + .3 * rnd(s.sd, i)), a = .5 * v * fade;
        if (LSTREAK > 2) { g.globalAlpha = Math.min(1, a * 2 * r / (2 * r + LSTREAK)); g.drawImage(discSpr(col), x - r - LSTREAK / 2, y + s.r * .5 - r, 2 * r + LSTREAK, 2 * r); }
        else put(g, discSpr(col), x, y + s.r * .5, r, a);
      }
      g.restore();
    }
  }

  /* ------------------------------------------------------------------ boards for the city (s2) */
  H.boards = [];   // filled by s2-city-booked.js: { d, draw(g, T, k, blur) }
  const boardsAt = (d) => H.boards.filter(b => b.d === d);
  // Defocus without ctx.filter on the main canvas (Chrome filters a full-canvas layer per call = seconds/frame):
  // a board is drawn sharp into a small offscreen buffer, blurred THERE, and blitted once. Off-screen boards are culled.
  const BUF = [];
  function getBuf(i, w, h) {
    let c = BUF[i]; if (!c) c = BUF[i] = document.createElement('canvas');
    if (c.width < w || c.height < h) { c.width = Math.max(c.width, w); c.height = Math.max(c.height, h); }
    const g = c.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none';
    g.clearRect(0, 0, w + 2, h + 2); return c;
  }
  function drawBoard(g, b, T, k, blur) {
    const bb = b.bbox, m = g.getTransform();
    if (bb) {
      const sx0 = m.a * bb[0] + m.e, sx1 = m.a * bb[2] + m.e, sy0 = m.d * bb[1] + m.f, sy1 = m.d * bb[3] + m.f;
      if (sx1 < -40 || sx0 > g.canvas.width + 40 || sy1 < -40 || sy0 > g.canvas.height + 40) return;
    }
    const bl = blur / k;
    if (!bb || bl < .8) { b.draw(g, T, k, 0); return; }
    const res = Math.min(2, m.a), pad = Math.ceil(bl * 2.5);
    const w = Math.ceil((bb[2] - bb[0] + 2 * pad) * res), h = Math.ceil((bb[3] - bb[1] + 2 * pad) * res);
    const c1 = getBuf(0, w, h), g1 = c1.getContext('2d');
    g1.scale(res, res); g1.translate(pad - bb[0], pad - bb[1]); g1.imageSmoothingQuality = 'high';
    b.draw(g1, T, k, 0);
    const c2 = getBuf(1, w, h), g2 = c2.getContext('2d');
    g2.filter = `blur(${(bl * res).toFixed(2)}px)`; g2.drawImage(c1, 0, 0, w, h, 0, 0, w, h); g2.filter = 'none';
    g.drawImage(c2, 0, 0, w, h, bb[0] - pad, bb[1] - pad, w / res, h / res);
  }
  const drawBoards = (g, d, T, k, blur) => { for (const b of boardsAt(d)) drawBoard(g, b, T, k, blur); };
  const FLY_D = H.FLY_D = .8;

  /* ------------------------------------------------------------------ the world */
  H.world = (ctx, T) => {
    const cam = H.cam(T);
    ctx.save();
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    const sh = shakeAt(T); ctx.translate(sh.x, sh.y);
    drawSky(ctx, T, cam);
    H.layer(ctx, cam, 4, (g, k, blur) => drawFar(g, T, k, blur));
    H.layer(ctx, cam, 3, (g, k, blur) => hazeBand(g, T, { y0: 800, y1: 1180, alpha: .11, color: '#8A6E9A', speed: 9, seed: 19, scale: 2.6 }));
    H.layer(ctx, cam, 2, (g, k, blur) => { drawMid(g, T, k, blur); drawBoards(g, 2, T, k, blur); midFog(g); drawMidLights(g, T, k, blur); drawBoards(g, 2.01, T, k, blur); });
    H.layer(ctx, cam, H2_D, (g, k, blur) => { drawH2Block(g, T, k, blur); drawBoards(g, H2_D, T, k, blur); drawBoards(g, H2_D + .01, T, k, blur); });
    H.layer(ctx, cam, 1, (g, k) => { g.translate(120, 1050); g.scale(SW, SW); g.translate(-100, -470); drawHook(g, T, k * SW); });
    H.layer(ctx, cam, FLY_D, (g, k, blur) => { drawFly(g, T, k, blur); drawBoards(g, FLY_D, T, k, blur); });
    H.layer(ctx, cam, .42, (g, k, blur) => drawFore(g, T, k, blur));
    ctx.restore();
  };
  H.util = { put, lamp, glowSpr, bulbSpr, discSpr, softSpr, setBlur, rimFill, FR, DEG, stamp3D, hull, polyFill };

  /* ------------------------------------------------------------------ in-scene temporal supersampling
     The engine averages 4 sub-frames 1/240 s apart. On the pull-back (2.55-3.15) and the whip (4.933-5.2) the image moves
     8-80 px between them, which reads as 4 hard copies. When it does, each engine sub-frame is itself rendered as k
     stratified, jittered samples spaced 1/(240k) s apart and averaged, so the 4k samples read as a smear. */
  const SPAN = 1 / 240;
  function dispPerSpan(T, A, B, h) {
    let m = 0;
    for (const d of [FLY_D, 1, H2_D, 2, 4]) {
      const za = d - A.c, zb = d - B.c; if (za <= .05 || zb <= .05) continue;
      const ka = d / za, kb = d / zb;
      if (d === FLY_D && P.y + A.ey / za + ka * (1380 - P.y) > 1920) continue;          // the flyover is still below frame
      for (const X of [0, 540, 1080]) for (const Y of [0, 960, 1920]) {
        const lx = P.x + (X - P.x - A.ex / za) / ka, ly = P.y + (Y - P.y - A.ey / za) / ka;
        const X2 = P.x + B.ex / zb + kb * (lx - P.x), Y2 = P.y + B.ey / zb + kb * (ly - P.y);
        m = Math.max(m, Math.hypot(X2 - X, Y2 - Y));
      }
    }
    if (H.headOff) m = Math.max(m, Math.abs(H.headOff(T + h) - H.headOff(T - h)));
    return m * SPAN / (2 * h);
  }
  function frame(g, T) { H.world(g, T); if (H.headline) H.headline(g, T, H.cam(T)); }
  let SSA = null, SST = null;
  H.render = (ctx, T) => {
    const h = 1 / 960, A = H.cam(T - h), B = H.cam(T + h);
    H.camV = { ex: (B.ex - A.ex) / (2 * h) };
    const disp = dispPerSpan(T, A, B, h), kmax = T > TM.whip0 - .05 ? 8 : 4;
    const k = Math.min(kmax, Math.max(1, Math.ceil(disp / 3)));                        // ~3-6 px between samples on the pull-back, <= 10 px at the whip peak
    H.SSK = k; H.FAST = k >= 5; H.DT = SPAN / k;
    if (k <= 1) { frame(ctx, T); return; }
    const bs = L.baseScale, w = Math.round(L.W * bs), hh = Math.round(L.H * bs);
    if (!SSA || SSA.width !== w || SSA.height !== hh) { SSA = document.createElement('canvas'); SSA.width = w; SSA.height = hh; SST = document.createElement('canvas'); SST.width = w; SST.height = hh; }
    const a = SSA.getContext('2d'), m = SST.getContext('2d');
    a.setTransform(1, 0, 0, 1, 0, 0); a.globalCompositeOperation = 'source-over'; a.globalAlpha = 1; a.clearRect(0, 0, w, hh);
    a.globalCompositeOperation = 'lighter'; a.globalAlpha = 1 / k;
    for (let i = 0; i < k; i++) {
      const ti = T + ((i + rnd(977, Math.round(T * 9600) * 7 + i)) / k - .5) * SPAN;   // stratified + jittered
      m.setTransform(bs, 0, 0, bs, 0, 0); m.globalAlpha = 1; m.globalCompositeOperation = 'source-over'; m.filter = 'none';
      m.fillStyle = MM.background; m.fillRect(0, 0, L.W, L.H);
      m.save(); frame(m, ti); m.restore();
      a.drawImage(SST, 0, 0);
    }
    ctx.save(); L.resetTransform(ctx); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(SSA, 0, 0, L.W, L.H); ctx.restore();
    H.SSK = 1; H.FAST = false; H.DT = SPAN;
  };

  // a tiny exposure kick on the stamp impact (no full-frame flash)
  MM.addFlash({ t: TM.hit, dur: .1, exposure: .05, bloom: .25 });

  // s1 and s2 draw the same world; during their 2.5-2.8 overlap s1 draws it once (incl. the headline) and leaves a
  // same-frame token so s2 does not draw it a second time (no state crosses frames: s2 consumes the token immediately)
  MM.scene('s1-hook-space-available', {
    draw(ctx, t, { T }) { H.tok = null; H.render(ctx, T); if (T >= 2.5) H.tok = T; }
  });
})();
