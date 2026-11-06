/* s6 · The city becomes the mark (17.700 – 20.500)
   Three towers + two lantern-weighted light strings snap into the exact MM mark (true geometry from L.markParts),
   then a wordless triple burst. The mark is flat, still and glow-free from 18.600; every particle is clipped out of
   its clear-space box. From 20.200 s7 owns the mark (it glides away), s6 only keeps the glitter + city bokeh. */
(function () {
  const ID = 's6-city-becomes-the-mark';
  const T0 = 17.7;
  // final mark: w 520 centred (540, 796.4)  ->  x 280..800, y 560..1032.7
  const K = 520 / 110, MX = 280, MY = 560, MH = 100 * K;
  const P = () => L.markParts();
  const toW = p => [MX + p[0] * K, MY + p[1] * K];
  const BOX = { x0: 197.3, x1: 882.7, y0: 477.3, y1: 1115.4 }; // clear space = one pillar width (82.7 px)
  const ROOF = 560, TOWER_BOTTOM = 1300;
  const PILLAR_X = [[280, 362.7], [498.6, 581.4], [717.3, 800]];

  // finishing-pass flash behind the mark at the snap, and for the triple burst
  MM.addFlash({ t: 18.4, dur: .1, exposure: .06, bloom: .2 });
  MM.addFlash({ t: 19.6, dur: .25, exposure: .1, bloom: .3 });
  MM.addFlash({ t: 20.0, dur: .2, exposure: .05, bloom: .2 });

  /** particles are drawn into an FX layer, then a FEATHERED clear-space mask is cut out of it, so sparks fade out softly
      before they reach the mark (no hard edges, nothing inside the clear space). */
  let fx = null;
  function fxLayer() {
    const s = L.baseScale, w = Math.round(L.W * s), h = Math.round(L.H * s);
    if (!fx || fx.width !== w) { fx = document.createElement('canvas'); fx.width = w; fx.height = h; }
    const g = fx.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, w, h); g.setTransform(s, 0, 0, s, 0, 0); return g;
  }
  function maskBox(g, feather = 70) {
    g.save(); g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000';
    const { x0, x1, y0, y1 } = BOX; g.fillRect(x0, y0, x1 - x0, y1 - y0);
    const side = (gx0, gy0, gx1, gy1, rx, ry, rw, rh) => { const gr = g.createLinearGradient(gx0, gy0, gx1, gy1); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(rx, ry, rw, rh); };
    side(x0, 0, x0 - feather, 0, x0 - feather, y0, feather, y1 - y0);
    side(x1, 0, x1 + feather, 0, x1, y0, feather, y1 - y0);
    side(0, y0, 0, y0 - feather, x0, y0 - feather, x1 - x0, feather);
    side(0, y1, 0, y1 + feather, x0, y1, x1 - x0, feather);
    for (const [cx, cy] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1]]) { const rg = g.createRadialGradient(cx, cy, 0, cx, cy, feather); rg.addColorStop(0, 'rgba(0,0,0,1)'); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(cx - feather, cy - feather, feather * 2, feather * 2); }
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

  /** tower body with a window grid in world coords; lit: 0..1 ; tone: 'outer' | 'red' */
  function tower(ctx, x0, x1, tone, t, lit, flood) {
    const w = x1 - x0;
    const g = ctx.createLinearGradient(0, ROOF, 0, TOWER_BOTTOM); g.addColorStop(0, '#2B2728'); g.addColorStop(.62, '#241F22'); g.addColorStop(1, 'rgba(28,26,26,0)');
    ctx.fillStyle = g; ctx.fillRect(x0, ROOF, w, TOWER_BOTTOM - ROOF);
    ctx.fillStyle = 'rgba(140,135,131,.55)'; ctx.fillRect(x0, ROOF, w, 2); // stone top-edge highlight
    const cols = 3, cw = 13, ch = 17, gx = (w - cols * cw) / (cols + 1);
    for (let r = 0; ROOF + 16 + r * 30 < TOWER_BOTTOM - 40; r++) for (let c = 0; c < cols; c++) {
      const id = r * 7 + c + (tone === 'red' ? 300 : x0); const wx = x0 + gx + c * (cw + gx), wy = ROOF + 16 + r * 30;
      const fade = 1 - L.smoothstep(960, 1180, wy);
      const fl = .78 + .22 * L.noise1(t * 1.3 + id * .7, 5);
      const on = L.rnd(9, id) > .12 ? 1 : .25;
      const col = tone === 'red' ? (L.rnd(10, id) > .5 ? '#D2232E' : '#E8452A') : (L.rnd(10, id) > .45 ? '#FFE7A3' : '#FFD27A');
      ctx.fillStyle = L.rgba(col, lit * on * fl * fade); ctx.fillRect(wx, wy, cw, ch);
      if (tone === 'red' && on > .5) { ctx.fillStyle = L.rgba('#FFB547', .55 * lit * fl * fade); ctx.fillRect(wx + 4, wy + 5, cw - 8, ch - 9); }
    }
    if (flood > 0) { // window grid floods into flat fill, bottom to top, cut at the mark's bottom edge
      const top = L.lerp(MY + MH, ROOF, L.ease.inOutCubic(flood));
      ctx.fillStyle = tone === 'red' ? L.PAL.red : L.PAL.paper; ctx.fillRect(x0, top, w, MY + MH - top);
      if (flood < 1) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const lg = ctx.createLinearGradient(0, top - 26, 0, top + 10); lg.addColorStop(0, 'rgba(255,214,140,0)'); lg.addColorStop(.7, 'rgba(255,214,140,.55)'); lg.addColorStop(1, 'rgba(255,240,200,0)'); ctx.fillStyle = lg; ctx.fillRect(x0, top - 26, w, 36); ctx.restore(); }
    }
  }

  /** a sagging light string between two roof corners with a lantern at its midpoint */
  function lightString(ctx, ax, bx, t, k, snap, tremble, seed) {
    // k: sag shape (1 = soft catenary to y 700). snap 0..1 morphs the curve into the chevron's straight upper edge.
    const apexX = (ax + bx) / 2; const apexY = MY + 34.27 * K; // 722.0 : the chevron's inner notch
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
    // akash kandil at the midpoint, pulling the string down
    const [lx, ly] = pt(.5);
    if (snap < 1) { ctx.save(); ctx.globalAlpha *= 1 - snap; L.lantern(ctx, lx, ly - 4, 17, t + tremble * Math.sin(t * 20) * .3, seed, { color: '#D2232E', light: '#FFC24A' }); ctx.restore(); }
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

  MM.scene(ID, {
    draw(ctx, t, { T }) {
      const { sharp, soft } = cityImages();
      // ---- camera: dolly-in 17.700–18.200 from the s5 wide framing (scale .52, roofs at y ~702) to identity
      const p = L.prog(T, 17.7, 18.2, L.ease.outCubic);
      const k = L.lerp(.52, 1, p), Y = L.lerp(702.4, ROOF, p);
      const cam = c => { c.translate(540, Y); c.scale(k, k); c.translate(-540, -ROOF); };
      // ---- s5 hand-over: fade our frame in over the stamp lift
      const enter = L.smoothstep(17.7, 18.0, T);
      const leave = 1 - L.smoothstep(20.2, 20.5, T); // s7 takes over (it paints its own background on top)
      ctx.save(); ctx.globalAlpha = enter;

      // ---- background city: parallax, dims to 35% and defocuses as we dolly in
      const dim = L.lerp(1, .35, L.smoothstep(17.7, 18.4, T));
      const cityScale = L.lerp(1, 1.22, p);
      ctx.save(); ctx.translate(540, 900); ctx.scale(cityScale, cityScale); ctx.translate(-540, -900 + p * 40);
      ctx.globalAlpha = enter * (1 - p); ctx.drawImage(sharp, 0, 0);
      ctx.globalAlpha = enter * p; ctx.drawImage(soft, 0, 0);
      ctx.restore(); ctx.globalAlpha = enter;
      ctx.fillStyle = `rgba(28,26,26,${1 - dim})`; ctx.fillRect(0, 0, L.W, L.H);
      L.bokeh(ctx, T, { seed: 61, count: 22, colors: ['#FFB547', '#FFC24A', '#FF9F1C', '#D2232E'], rMin: 14, rMax: 48, alpha: .16 * p, y: 1150, h: 770, drift: 10 });
      // dark halo behind the mark
      const hg = ctx.createRadialGradient(540, 796, 0, 540, 796, 520); hg.addColorStop(0, 'rgba(28,26,26,.6)'); hg.addColorStop(1, 'rgba(28,26,26,0)');
      ctx.fillStyle = hg; ctx.fillRect(0, 200, L.W, 1200);
      // warm light living behind the mark (never on it)
      L.glow(ctx, 540, 800, 560, '#FF9F1C', .07 * p);

      // ---- towers, strings, snap (world space under the camera) — until the exact logo takes over
      const snap = L.prog(T, 18.4, 18.5, L.ease.inCubic);           // 3 frames
      const pour = L.prog(T, 18.4, 18.6);                             // chevron fill + tower flood
      const tremble = T >= 18.267 && T < 18.4 ? L.smoothstep(18.267, 18.33, T) : 0;
      if (T < 18.6) {
        ctx.save(); cam(ctx);
        const towerLit = 1;
        // below the mark the towers dissolve into the city as the snap happens
        if (pour > 0) { const fg = ctx.createLinearGradient(0, MY + MH, 0, MY + MH + 140); fg.addColorStop(0, `rgba(28,26,26,${.95 * pour})`); fg.addColorStop(1, 'rgba(28,26,26,0)'); ctx.fillStyle = fg; ctx.fillRect(250, MY + MH, 580, 300); }
        const parts = P();
        chevronFill(ctx, parts.chevrons[0], pour, L.PAL.paper);
        chevronFill(ctx, parts.chevrons[1], pour, L.PAL.paper);
        tower(ctx, PILLAR_X[0][0], PILLAR_X[0][1], 'outer', T, towerLit, pour);
        tower(ctx, PILLAR_X[1][0], PILLAR_X[1][1], 'red', T, towerLit, pour);
        tower(ctx, PILLAR_X[2][0], PILLAR_X[2][1], 'outer', T, towerLit, pour);
        if (snap < 1 || pour < 1) {
          ctx.save(); ctx.globalAlpha *= 1 - L.smoothstep(18.45, 18.6, T);
          lightString(ctx, PILLAR_X[0][1], PILLAR_X[1][0], T, 1, snap, tremble, 1);
          lightString(ctx, PILLAR_X[1][1], PILLAR_X[2][0], T, 1, snap, tremble, 2);
          ctx.restore();
        }
        ctx.restore();
        // the snap flash: a soft paper-white bloom BEHIND the mark (1 frame)
        if (T >= 18.4 && T < 18.434) L.glow(ctx, 540, 796, 600, '#F4F2EE', .12);
      }

      // ---- the exact logo, flat and still, 18.600 – 20.200 (s7 takes it from 20.200)
      if (T >= 18.6 && T < 20.2) L.drawLogo(ctx, 'mark', { x: 540, y: 796.36, w: 520, way: 'reverse' });

      // ---- rockets + triple burst + glitter rain, in an FX layer with a feathered clear-space mask
      const outer = ctx; ctx = fxLayer();
      const rockets = [
        { x0: 150, y0: 1260, x1: 165, y1: 400, seed: 3, col: '#FFC24A' },
        { x0: 930, y0: 1260, x1: 915, y1: 400, seed: 4, col: '#FFC24A' },
        { x0: 540, y0: 1480, x1: 540, y1: 300, seed: 5, col: '#FFB547' },
      ];
      for (const r of rockets) L.rocket(ctx, { x0: r.x0, y0: r.y0, x1: r.x1, y1: r.y1, t: T - 19.0, dur: .6, seed: r.seed, color: r.col, wobble: 6 });
      const bt = T - 19.6;
      if (bt >= 0 && bt < .3) for (const [x, y, r] of [[165, 400, 150], [915, 400, 150], [540, 300, 120]]) L.glow(ctx, x, y, r * (1 + bt * 2), '#FFF1C9', .55 * (1 - bt / .3));
      L.firework(ctx, { x: 165, y: 400, t: bt, seed: 11, n: 150, speed: 215 * 1.7, life: 2.1, colors: ['#FFC24A', '#FFF4CF', '#FFFFFF'], glitter: true, size: 3.6, flash: false, trail: .2 });
      L.firework(ctx, { x: 915, y: 400, t: bt, seed: 12, n: 150, speed: 215 * 1.7, life: 2.1, colors: ['#FFC24A', '#FFF4CF', '#FFFFFF'], glitter: true, size: 3.6, flash: false, trail: .2 });
      L.firework(ctx, { x: 540, y: 300, t: bt, seed: 13, n: 180, speed: 175 * 1.7, life: 2.2, colors: ['#D2232E', '#FFC24A', '#FF5A3C', '#FFE7A3'], glitter: true, size: 4, flash: false, trail: .2 });
      // second, higher volley on the off-beat for scale
      const b2 = T - 20.0;
      L.firework(ctx, { x: 330, y: 250, t: b2, seed: 14, n: 90, speed: 150 * 1.7, life: 1.6, shape: 'ring', colors: ['#FFB547', '#FFF4CF'], size: 3, flash: false });
      L.firework(ctx, { x: 760, y: 240, t: b2 - .1, seed: 15, n: 90, speed: 150 * 1.7, life: 1.6, shape: 'ring', colors: ['#FFB547', '#FFF4CF'], size: 3, flash: false });
      // glitter rain: slow golden willow trails falling after the bursts
      if (bt > .35) for (const [x, y, s] of [[165, 400, 21], [915, 400, 22], [540, 330, 23]]) L.firework(ctx, { x, y, t: bt - .35, seed: s, n: 46, speed: 150, life: 1.5, shape: 'willow', colors: ['#FFD27A', '#FFC24A'], flash: false, size: 2, alpha: .75 });
      // embers drifting in the side zones
      L.motes(ctx, T, { seed: 64, count: 26, x: 0, w: 200, y: 300, h: 1200, color: '#FFB547', alpha: .55 * p });
      L.motes(ctx, T, { seed: 65, count: 26, x: 880, w: 200, y: 300, h: 1200, color: '#FFB547', alpha: .55 * p });
      maskBox(ctx); ctx = outer;
      ctx.save(); L.resetTransform(ctx); ctx.globalAlpha = enter; ctx.drawImage(fx, 0, 0); ctx.restore();

      ctx.restore();
      if (leave < 1) { /* s7 paints over us from 20.200; nothing else to do */ }
    }
  });
})();
