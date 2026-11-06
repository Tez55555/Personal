/* s6 · The city becomes the mark (17.700 – 20.500)
   Three towers + two lantern-weighted light strings snap into the exact MM mark (true geometry from L.markParts) ON the
   18.400 CLACK, then the exact mark holds flat and still 18.600–19.000, where s7 takes it (glide into the lockup).
   From 19.000 this scene is the end card's sky: the city fades under the card background (s7's, MM.S7.background), three
   rockets climb and a wordless triple burst opens at 19.600 above the toran, framing "Happy Diwali" (fine-line peonies,
   s5's style), with glitter rain until 20.500. Every particle is cut out of the mark's (moving) clear space and the
   card's type and lockup boxes through a feathered mask. */
(function () {
  const ID = 's6-city-becomes-the-mark';
  // final mark: w 520 centred (540, 796.4)  ->  x 280..800, y 560..1032.7
  const K = 520 / 110, MX = 280, MY = 560, MH = 100 * K;
  const P = () => L.markParts();
  const toW = p => [MX + p[0] * K, MY + p[1] * K];
  const BOX = { x0: 197.3, x1: 882.7, y0: 477.3, y1: 1115.4 }; // clear space = one pillar width (82.7 px)
  const ROOF = 560, TOWER_BOTTOM = 1300;
  const PILLAR_X = [[280, 362.7], [498.6, 581.4], [717.3, 800]];
  const T_HAND = 19.0, T_LAUNCH = 19.0, T_BURST = 19.6, T_END = 20.5;
  const TAU = Math.PI * 2, RED = '#D2232E', GOLD = '#FFC24A';

  // finishing-pass flash behind the mark at the snap, and a small one for the triple burst
  MM.addFlash({ t: 18.4, dur: .1, exposure: .06, bloom: .2 });
  MM.addFlash({ t: 19.6, dur: .2, exposure: .04, bloom: .3 });

  /** camera: the s4/s5 shared world's dolly (window.MMS45.camAt) so the dissolving towers stay registered on ours.
      z = 2k, Y = cy(1-z) + 710z  <=>  world -> screen: translate(540,Y) scale(k) translate(-540,-560).
      Fallback (shared world absent): the same inOutCubic dolly, 17.700–18.200, scale .52 -> 1. */
  function camKY(T) {
    const NS = window.MMS45;
    if (NS && NS.camAt) { const c = NS.camAt(T); if (c && isFinite(c.cy) && Math.abs(1 - c.z) > 1e-4) return { k: c.z / 2, Y: c.cy * (1 - c.z) + 710 * c.z }; }
    const p = L.prog(T, 17.7, 18.2, L.ease.inOutCubic); return { k: L.lerp(.52, 1, p), Y: L.lerp(702.4, 560, p) };
  }

  /** particles are drawn into an FX layer, then FEATHERED boxes are cut out of it, so sparks fade out softly before
      they reach the mark or the end card's type (no hard edges, nothing inside the clear space). */
  let fx = null;
  function fxLayer() {
    const s = L.baseScale, w = Math.round(L.W * s), h = Math.round(L.H * s);
    if (!fx || fx.width !== w || fx.height !== h) { fx = document.createElement('canvas'); fx.width = w; fx.height = h; }
    const g = fx.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, w, h); g.setTransform(s, 0, 0, s, 0, 0); return g;
  }
  function maskBox(g, { x0, x1, y0, y1, a = 1 }, feather = 70) {
    if (a <= 0) return;
    g.save(); g.globalCompositeOperation = 'destination-out'; g.globalAlpha = Math.min(1, a); g.fillStyle = '#000';
    g.fillRect(x0, y0, x1 - x0, y1 - y0);
    const side = (gx0, gy0, gx1, gy1, rx, ry, rw, rh) => { const gr = g.createLinearGradient(gx0, gy0, gx1, gy1); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(rx, ry, rw, rh); };
    side(x0, 0, x0 - feather, 0, x0 - feather, y0, feather, y1 - y0);
    side(x1, 0, x1 + feather, 0, x1, y0, feather, y1 - y0);
    side(0, y0, 0, y0 - feather, x0, y0 - feather, x1 - x0, feather);
    side(0, y1, 0, y1 + feather, x0, y1, x1 - x0, feather);
    for (const [cx, cy] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1]]) { const rg = g.createRadialGradient(cx, cy, 0, cx, cy, feather); rg.addColorStop(0, 'rgba(0,0,0,1)'); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg;
      g.fillRect(cx < (x0 + x1) / 2 ? cx - feather : cx, cy < (y0 + y1) / 2 ? cy - feather : cy, feather, feather); }
    g.restore();
  }

  /** static city (sky + skylines) rendered once, plus a defocused copy */
  function cityImages() {
    const sharp = L.cached('s6-city-sharp', L.W, L.H, g => {
      const sg = g.createLinearGradient(0, 0, 0, L.H); sg.addColorStop(0, '#25203F'); sg.addColorStop(.55, '#1E1A2A'); sg.addColorStop(1, '#1C1A1A');
      g.fillStyle = sg; g.fillRect(0, 0, L.W, L.H);
      L.stars(g, 0, { count: 120, h: 760, alpha: .5 });
      L.skyline(g, { layer: 'far', baseY: 1180, t: 0, seed: 21, color: '#2A2340' });
      L.skyline(g, { layer: 'mid', baseY: 1430, t: 0, lights: 1, seed: 22, jhalar: .55, windowColor: '#FFB547' });
      L.skyline(g, { layer: 'near', baseY: 1720, t: 0, lights: 1, seed: 23, jhalar: .8, windowColor: '#FFB547' });
      const fg = g.createLinearGradient(0, 1700, 0, L.H); fg.addColorStop(0, 'rgba(28,26,26,0)'); fg.addColorStop(1, 'rgba(28,26,26,1)'); g.fillStyle = fg; g.fillRect(0, 1700, L.W, 220);
    });
    const soft = L.cached('s6-city-soft', L.W, L.H, g => { g.filter = 'blur(7px)'; g.drawImage(sharp, 0, 0); g.filter = 'none'; });
    return { sharp, soft };
  }

  /** tower body with a window grid in world coords; lit: 0..1 ; tone: 'outer' | 'red'. below: alpha of the body under the mark */
  function tower(ctx, x0, x1, tone, t, lit, flood, below) {
    const w = x1 - x0, cut = MY + MH;
    const body = (yA, yB) => {
      const g = ctx.createLinearGradient(0, ROOF, 0, TOWER_BOTTOM); g.addColorStop(0, '#2B2728'); g.addColorStop(.62, '#241F22'); g.addColorStop(1, 'rgba(28,26,26,0)');
      ctx.fillStyle = g; ctx.fillRect(x0, yA, w, yB - yA);
      const cols = 3, cw = 13, ch = 17, gx = (w - cols * cw) / (cols + 1);
      for (let r = 0; ROOF + 16 + r * 30 < TOWER_BOTTOM - 40; r++) for (let c = 0; c < cols; c++) {
        const wy = ROOF + 16 + r * 30; if (wy + ch < yA || wy > yB) continue;
        const id = r * 7 + c + (tone === 'red' ? 300 : x0); const wx = x0 + gx + c * (cw + gx);
        const fade = 1 - L.smoothstep(960, 1180, wy);
        const fl = .78 + .22 * L.noise1(t * 1.3 + id * .7, 5);
        const on = L.rnd(9, id) > .12 ? 1 : .25;
        const col = tone === 'red' ? RED : (L.rnd(10, id) > .45 ? '#FFE7A3' : '#FFD27A');
        ctx.fillStyle = L.rgba(col, lit * on * fl * fade); ctx.fillRect(wx, wy, cw, ch);
        if (tone === 'red' && on > .5) { ctx.fillStyle = L.rgba('#FFB547', .55 * lit * fl * fade); ctx.fillRect(wx + 4, wy + 5, cw - 8, ch - 9); }
      }
    };
    ctx.save(); ctx.beginPath(); ctx.rect(x0 - 2, ROOF - 4, w + 4, cut - ROOF + 4); ctx.clip(); body(ROOF, cut);
    ctx.fillStyle = 'rgba(140,135,131,.55)'; ctx.fillRect(x0, ROOF, w, 2); // stone top-edge highlight
    if (flood > 0) { // window grid floods into flat fill, bottom to top, cut at the mark's bottom edge
      const top = L.lerp(cut, ROOF, L.ease.inOutCubic(flood));
      ctx.fillStyle = tone === 'red' ? L.PAL.red : L.PAL.paper; ctx.fillRect(x0, top, w, cut - top);
      if (flood < 1) { ctx.globalCompositeOperation = 'lighter'; const lg = ctx.createLinearGradient(0, top - 26, 0, top + 10); lg.addColorStop(0, 'rgba(255,214,140,0)'); lg.addColorStop(.7, 'rgba(255,214,140,.55)'); lg.addColorStop(1, 'rgba(255,240,200,0)'); ctx.fillStyle = lg; ctx.fillRect(x0, top - 26, w, 36); }
    }
    ctx.restore();
    // the lower body dissolves into the city as the mark forms (gone by the 18.600 switch to the exact logo)
    if (below > 0) { ctx.save(); ctx.globalAlpha *= below; ctx.beginPath(); ctx.rect(x0 - 2, cut, w + 4, TOWER_BOTTOM - cut); ctx.clip(); body(cut, TOWER_BOTTOM); ctx.restore(); }
  }

  /** a sagging light string between two roof corners with a lantern at its midpoint */
  function lightString(ctx, ax, bx, t, k, snap, tremble, seed) {
    // k: sag shape (1 = soft catenary to y 700). snap 0..1 morphs the curve into the chevron's straight upper edge.
    const apexY = MY + 34.27 * K; // 722.0 : the chevron's inner notch
    const pt = u => {
      const sx = L.lerp(ax, bx, u), sy = ROOF + (700 - ROOF) * 4 * u * (1 - u) * k;
      const vx = L.lerp(ax, bx, u), vy = u < .5 ? L.lerp(ROOF, apexY, u * 2) : L.lerp(apexY, ROOF, (u - .5) * 2);
      const tr = Math.sin(t * 62.8 + u * 9 + seed) * 4 * tremble * Math.sin(u * Math.PI);
      return [L.lerp(sx, vx, snap), L.lerp(sy, vy, snap) + tr];
    };
    ctx.save(); ctx.strokeStyle = 'rgba(20,16,22,.9)'; ctx.lineWidth = 2; ctx.beginPath();
    for (let i = 0; i <= 40; i++) { const [x, y] = pt(i / 40); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); ctx.restore();
    const n = 9;
    for (let i = 0; i < n; i++) {
      const u = (i + .5) / n; const [x, y] = pt(u);
      const chase = .55 + .45 * (.5 + .5 * Math.sin(t * 9 - i * .9 - seed));
      const col = i % 2 ? '#FFB547' : '#FFF4CF';
      L.glow(ctx, x, y + 6, 40, col, .3 * chase * (1 - snap));
      ctx.fillStyle = L.mix(col, '#FFFFFF', .4 * chase, (.6 + .4 * chase)); ctx.beginPath(); ctx.ellipse(x, y + 6, 4.5, 6.5, 0, 0, 6.2832); ctx.fill();
    }
    // akash kandil at the midpoint, pulling the string down; it sways ±6° in the anticipation tremble
    const [lx, ly] = pt(.5);
    if (snap < 1) { ctx.save(); ctx.globalAlpha *= 1 - snap; L.lantern(ctx, lx, ly - 4, 17, t + tremble * Math.sin(t * 20) * .3, seed, { color: RED, light: GOLD }); ctx.restore(); }
    return pt;
  }

  function chevronFill(ctx, poly, wipe, color) {
    // light pours down from the upper edge to fill the band (wipe 0..1, top to bottom)
    if (wipe <= 0) return;
    const yTop = MY, yBot = MY + 73.02 * K; const yw = L.lerp(yTop, yBot + 4, L.ease.inOutCubic(wipe));
    ctx.save(); L.poly(ctx, poly.map(toW)); ctx.clip();
    ctx.fillStyle = color; ctx.fillRect(MX - 10, yTop - 10, MH * 1.2, yw - yTop + 10);
    if (wipe < 1) { ctx.globalCompositeOperation = 'lighter'; const lg = ctx.createLinearGradient(0, yw - 40, 0, yw + 6); lg.addColorStop(0, 'rgba(255,222,150,0)'); lg.addColorStop(.75, 'rgba(255,222,150,.65)'); lg.addColorStop(1, 'rgba(255,245,220,0)'); ctx.fillStyle = lg; ctx.fillRect(MX - 10, yw - 40, MH * 1.2, 46); }
    ctx.restore();
  }

  /* ---------------- fireworks: s5's fine-line closed-form renderer (thin 2 px trails, gravity droop, no hollow core) ----------------
     Bodies/trails stay under the bloom threshold; only heads bloom. Burst centres sit ABOVE the toran so the shells frame
     the greeting, never the logo. */
  // higher drag than s5's shells: they open to full size in ~0.35 s and hang, so they read big in the 0.9 s before the ticker
  const PEONY = { k: 4.2, grav: 170, trail: .12, life: 1.0, head: 2.2 }, WILLOW = { k: 2.2, grav: 620, trail: .45, life: .9, head: 1.7 };
  const BURSTS = [
    { x: 150, y: 200, r: 195, shape: 'peony', body: GOLD, tip: '#FFE7A3', n: 140, seed: 61, pistil: '#FFF4CF', crackle: 1, lx: 115, ly: 1300 },
    { x: 540, y: 150, r: 215, shape: 'peony', body: RED, tip: RED, n: 150, seed: 63, pistil: GOLD, lum: 1, lx: 540, ly: 1480, liftFade: [1250, 1140] },
    { x: 930, y: 200, r: 195, shape: 'peony', body: '#FFF4CF', tip: '#FFFFFF', n: 140, seed: 62, glitter: 1, lx: 965, ly: 1300 },
  ];
  // glitter rain: slow gold willows breaking a beat after the peonies, falling over the sides
  const RAIN = [
    { x: 150, y: 215, r: 150, shape: 'willow', body: GOLD, tip: '#FFE7A3', n: 44, seed: 64, life: .85, dt: .22 },
    { x: 930, y: 215, r: 150, shape: 'willow', body: GOLD, tip: '#FFE7A3', n: 44, seed: 65, life: .85, dt: .22 },
    { x: 540, y: 160, r: 180, shape: 'willow', body: '#FFD27A', tip: '#FFE7A3', n: 50, seed: 66, life: .8, dt: .27, flatBottom: 1 },
  ];
  function burst(g, b, bt, alpha) {
    const Pp = b.shape === 'willow' ? WILLOW : PEONY, life = b.life || Pp.life;
    if (bt < 0 || bt > life + Pp.trail) return;
    if (bt < 1 / 30) { const w = b.shape === 'willow'; L.glow(g, b.x, b.y, w ? 12 : 30, '#FFF4CF', (w ? .6 : .8) * alpha); g.fillStyle = L.rgba('#FFFFFF', alpha); L.circle(g, b.x, b.y, w ? 3 : 4); g.fill(); }
    g.lineCap = 'round';
    shell(g, b, bt, alpha, b.r, b.n, b.body, b.tip, life, 0);
    if (b.pistil) shell(g, b, bt - .03, alpha, b.r * .42, Math.round(b.n * .45), b.pistil, b.pistil, life * .7, 1);
  }
  function shell(g, b, bt, alpha, R, n, body, tip, life, inner) {
    if (bt < 0) return;
    const willow = b.shape === 'willow' && !inner, Pp = willow ? WILLOW : PEONY, k = Pp.k, grav = Pp.grav, v0 = R * k;
    const tr = Math.min(Pp.trail * (inner ? .6 : 1), bt * .7);              // the trail never reaches back to the break point
    const hot = bt < 2 / 30, nseg = willow ? 6 : 3, seed = b.seed + inner * 500;
    for (let i = 0; i < n; i++) {
      const a = (i + .7 * L.rnd(seed, i)) / n * TAU, u = 2 * L.rnd(seed, i + 300) - 1;
      const sp = willow ? .8 + .2 * L.rnd(seed, i + 300) : .32 + .68 * Math.sqrt(1 - u * u);   // a sphere shell seen flat
      const vx = Math.cos(a) * v0 * sp, vy = Math.sin(a) * v0 * sp * (b.flatBottom && Math.sin(a) > 0 ? .5 : 1) - (willow ? v0 * .06 : 0);
      const li = life * (.78 + .22 * L.rnd(seed, i + 600)); if (bt > li) continue;
      const age = bt / li;
      let al = (willow ? Math.pow(1 - age, .75) : Math.pow(1 - age, 1.3)) * alpha;
      if (b.glitter && age > .22) al *= L.rnd(seed + Math.floor(bt * 15) * 31, i) > .42 ? 1 : .1;   // per-star twinkle on twos
      if (al <= .01) continue;
      const pos = tt => L.ballistic(b.x, b.y, vx, vy, k, grav, Math.max(0, tt));
      let prev = pos(bt - tr);
      for (let sgi = 1; sgi <= nseg; sgi++) {
        const f = sgi / nseg, cur = pos(bt - tr * (1 - f));
        g.strokeStyle = L.rgba(body, (willow ? .62 : .7) * al * (.04 + .96 * f * f)); g.lineWidth = 2 + .7 * f;
        g.beginPath(); g.moveTo(prev[0], prev[1]); g.lineTo(cur[0], cur[1]); g.stroke(); prev = cur;
      }
      L.glow(g, prev[0], prev[1], b.lum ? 10 : 6, body, (b.lum ? .55 : .28) * al);
      g.fillStyle = hot ? L.rgba('#FFFFFF', al) : L.rgba(tip, al); L.circle(g, prev[0], prev[1], hot ? 2.6 : Pp.head * (inner ? .85 : 1)); g.fill();
      if (b.crackle && !inner && age > .6) { const f15 = Math.floor(bt * 15);   // gold peonies end in a crackle, on twos
        for (let j = 0; j < 2; j++) { if (L.rnd(seed + f15 * 7, i * 3 + j) < .55) continue; const ca = L.rnd(seed + f15 * 11, i * 5 + j) * TAU, cr = 3 + 7 * L.rnd(seed + f15 * 13, i + j * 97);
          g.fillStyle = L.rgba('#FFFFFF', .9 * alpha); g.fillRect(prev[0] + Math.cos(ca) * cr - 1, prev[1] + Math.sin(ca) * cr - 1, 2, 2); } }
    }
  }
  /** a lean rocket: small hot head, a crackling trail of falling sparks (>= 2 px). 0.6 s flights, easeOutQuad. */
  function rocket(g, b, rt, dur, alpha) {
    const pos = tt => { const p = L.ease.outQuad(L.clamp(tt / dur)); return [L.lerp(b.lx, b.x, p) + L.snoise(tt * 6, b.seed) * 6 * p, L.lerp(b.ly, b.y, p)]; };
    const fadeAt = y => b.liftFade ? L.smoothstep(b.liftFade[1], b.liftFade[0], y) : 1;   // the middle lift charge burns out behind the mark
    g.lineCap = 'round';
    for (let i = 1; i < 18; i++) {
      const tb = rt - i * .028; if (tb < 0) break;
      const p = pos(tb), age = rt - tb, vx = (L.rnd(b.seed, i + Math.floor(tb * 30) * 7) - .5) * 80;
      const q0 = L.ballistic(p[0], p[1], vx, 20, 2, 320, Math.max(0, age - .03)), q1 = L.ballistic(p[0], p[1], vx, 20, 2, 320, age), al = Math.max(0, 1 - age / .5) * fadeAt(p[1]) * alpha;
      if (al <= .01) continue;
      g.strokeStyle = L.rgba(i % 3 ? GOLD : '#FFF4CF', .7 * al); g.lineWidth = 2; g.beginPath(); g.moveTo(q0[0], q0[1]); g.lineTo(q1[0], q1[1]); g.stroke();
    }
    const h = pos(rt), k = (1 - .5 * L.clamp(rt / dur)) * fadeAt(h[1]) * alpha;
    if (k <= .01) return;
    L.glow(g, h[0], h[1], 34, GOLD, .6 * k); L.glow(g, h[0], h[1], 9, '#FFFFFF', .95 * k);
    g.fillStyle = L.rgba('#FFFFFF', k); g.beginPath(); g.arc(h[0], h[1], 2.2, 0, TAU); g.fill();
  }

  MM.scene(ID, {
    draw(ctx, t, { T }) {
      const { sharp, soft } = cityImages();
      const S7 = MM.S7;
      // ---- camera: the shared world's dolly-in (17.700–18.200, inOutCubic), then held
      const { k, Y } = camKY(T); const p = L.clamp((k - .52) / .48);
      const cam = c => { c.translate(540, Y); c.scale(k, k); c.translate(-540, -ROOF); };
      // ---- s5 hand-over: fade our frame in over the stamp lift
      const enter = L.smoothstep(17.8, 18.0, T);
      const card = L.smoothstep(19.0, 19.5, T);      // the end card's background takes over the sky
      ctx.save(); ctx.globalAlpha = enter;

      // ---- background city: parallax, dims to 35% and defocuses as we dolly in
      if (card < 1) {
        const dim = L.lerp(1, .35, L.smoothstep(17.7, 18.4, T));
        const cityScale = L.lerp(1, 1.22, p);
        ctx.save(); ctx.translate(540, 900); ctx.scale(cityScale, cityScale); ctx.translate(-540, -900 + p * 40);
        ctx.globalAlpha = enter * (1 - p); ctx.drawImage(sharp, 0, 0);
        ctx.globalAlpha = enter * p; ctx.drawImage(soft, 0, 0);
        ctx.restore(); ctx.globalAlpha = enter;
        ctx.fillStyle = `rgba(28,26,26,${1 - dim})`; ctx.fillRect(0, 0, L.W, L.H);
        L.bokeh(ctx, T, { seed: 61, count: 22, colors: ['#FFB547', GOLD, '#FF9F1C', RED], rMin: 14, rMax: 48, alpha: .16 * p, y: 1150, h: 770, drift: 10 });
        // dark halo behind the mark + warm light living behind it (never on it)
        const hg = ctx.createRadialGradient(540, 796, 0, 540, 796, 520); hg.addColorStop(0, 'rgba(28,26,26,.6)'); hg.addColorStop(1, 'rgba(28,26,26,0)');
        ctx.fillStyle = hg; ctx.fillRect(0, 200, L.W, 1200);
        L.glow(ctx, 540, 800, 560, '#FF9F1C', .07 * p);
      }
      // ---- from 19.000 the end card's own background (lifted night, buta block-print, bokeh city) fades in over the city
      if (card > 0 && S7) S7.background(ctx, T, card);

      // ---- towers, strings, snap (world space under the camera) — until the exact logo takes over
      // the picture lands ON the 18.400 CLACK (frame 552): strings straight by 18.400, chevrons ~60% solid on 552, full on 555
      const snap = L.prog(T, 18.3, 18.4, L.ease.inCubic);
      const pour = L.prog(T, 18.367, 18.5, L.ease.outCubic);
      const tremble = T >= 18.167 && T < 18.3 ? L.smoothstep(18.167, 18.233, T) : 0;
      if (T < 18.6) {
        ctx.save(); cam(ctx);
        const below = 1 - L.smoothstep(18.4, 18.6, T);
        const parts = P();
        chevronFill(ctx, parts.chevrons[0], pour, L.PAL.paper);
        chevronFill(ctx, parts.chevrons[1], pour, L.PAL.paper);
        tower(ctx, PILLAR_X[0][0], PILLAR_X[0][1], 'outer', T, 1, pour, below);
        tower(ctx, PILLAR_X[1][0], PILLAR_X[1][1], 'red', T, 1, pour, below);
        tower(ctx, PILLAR_X[2][0], PILLAR_X[2][1], 'outer', T, 1, pour, below);
        const strA = 1 - L.smoothstep(18.4, 18.5, T);
        if (strA > 0) {
          ctx.save(); ctx.globalAlpha *= strA;
          lightString(ctx, PILLAR_X[0][1], PILLAR_X[1][0], T, 1, snap, tremble, 1);
          lightString(ctx, PILLAR_X[1][1], PILLAR_X[2][0], T, 1, snap, tremble, 2);
          ctx.restore();
        }
        ctx.restore();
        // the snap flash: a soft paper-white bloom BEHIND the mark (1 frame)
        if (T >= 18.4 && T < 18.434) L.glow(ctx, 540, 796, 600, '#F4F2EE', .12);
      }

      // ---- the exact logo, flat and still, 18.600 – 19.000 (s7 takes it from 19.000 and glides it into the lockup)
      if (T >= 18.6 && T < T_HAND) L.drawLogo(ctx, 'mark', { x: 540, y: 796.36, w: 520, way: 'reverse' });

      // ---- rockets + triple burst + glitter rain, in an FX layer with feathered masks
      {
        const outer = ctx; const g = fxLayer();
        g.save(); g.globalCompositeOperation = 'lighter';
        for (const b of BURSTS) { const rt = T - T_LAUNCH, dur = T_BURST - T_LAUNCH; if (rt >= 0 && rt < dur) rocket(g, b, rt, dur, 1); burst(g, b, T - T_BURST, 1); }
        for (const b of RAIN) burst(g, b, T - T_BURST - b.dt, .8);
        g.restore();
        // embers drifting in the side zones
        const ember = .55 * p * (1 - L.smoothstep(20.2, T_END, T));
        L.motes(g, T, { seed: 64, count: 26, x: 0, w: 200, y: 300, h: 1200, color: '#FFB547', alpha: ember });
        L.motes(g, T, { seed: 65, count: 26, x: 880, w: 200, y: 300, h: 1200, color: '#FFB547', alpha: ember });
        // masks: the still mark's clear space, then (from 19.0) the gliding mark + the card's type and lockup boxes
        if (T < T_HAND) maskBox(g, BOX);
        if (S7 && T >= T_HAND - .05) for (const b of S7.maskBoxes(T)) maskBox(g, b, 46);
        // everything thins out over the last 0.3 s (s7 owns the frame from 20.5)
        ctx = outer;
        ctx.save(); L.resetTransform(ctx); ctx.globalAlpha = enter * (1 - L.smoothstep(20.25, T_END, T)); ctx.drawImage(fx, 0, 0); ctx.restore();
      }

      ctx.restore();
    }
  });
})();
