/* ==========================================================================
   MM Diwali Story: crafted element library (extends window.L)
   Indian-city-at-Diwali + outdoor-advertising elements, drawn with care so every scene shares
   the same level of detail. All deterministic (seeded) and cached where static.
   ========================================================================== */
(function () {
  'use strict';
  const L = window.L;

  /* ---------------- textures ---------------- */
  /** tileable grain/fibre texture canvas (cached). kind: 'paper' | 'ink' | 'powder' | 'flex' */
  L.textureCanvas = (kind = 'paper', size = 512, seed = 3) => L.cached(`tex-${kind}-${size}-${seed}`, size, size, g => {
    const im = g.createImageData(size, size); const d = im.data;
    // value noise octaves for organic variation
    const oct = (x, y, f) => { const xi = Math.floor(x * f), yi = Math.floor(y * f), xf = x * f - xi, yf = y * f - yi;
      const h = (a, b) => L.rnd(seed + f, ((a % (f)) + f) % f * 7919 + ((b % f) + f) % f);
      const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
      return L.lerp(L.lerp(h(xi, yi), h(xi + 1, yi), u), L.lerp(h(xi, yi + 1), h(xi + 1, yi + 1), u), v); };
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const nx = x / size, ny = y / size; const i = (y * size + x) * 4;
      const fine = L.rnd(seed, y * size + x);
      let v;
      if (kind === 'paper') v = .55 * oct(nx, ny, 8) + .25 * oct(nx, ny, 32) + .2 * fine;
      else if (kind === 'ink') v = Math.pow(.5 * oct(nx, ny, 16) + .3 * oct(nx, ny, 64) + .2 * fine, 1.4);
      else if (kind === 'powder') v = .35 * oct(nx, ny, 24) + .65 * fine;
      else v = .5 + .5 * Math.sin(y * 1.9) * .3 + .2 * oct(nx, ny, 6) + .1 * fine; // flex weave
      const c = Math.max(0, Math.min(255, v * 255));
      d[i] = d[i + 1] = d[i + 2] = c; d[i + 3] = 255;
    }
    g.putImageData(im, 0, 0);
    if (kind === 'paper') { // fibres
      g.globalAlpha = .07; g.strokeStyle = '#000'; g.lineWidth = .7;
      for (let k = 0; k < 220; k++) { const x = L.rnd(seed, k * 4) * size, y = L.rnd(seed, k * 4 + 1) * size, a = L.rnd(seed, k * 4 + 2) * 6.28, l = 6 + L.rnd(seed, k * 4 + 3) * 22;
        g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a + .6) * l * .5, y + Math.sin(a + .6) * l * .5, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
    }
  });
  /** overlay a texture over a rect (blend: 'multiply' | 'overlay' | 'soft-light' | 'screen') */
  L.textureOverlay = (ctx, kind, x, y, w, h, { alpha = .12, blend = 'multiply', scale = 1, seed = 3 } = {}) => {
    const tex = L.textureCanvas(kind, 512, seed); ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.globalAlpha *= alpha; ctx.globalCompositeOperation = blend; const s = 512 * scale;
    for (let yy = y; yy < y + h; yy += s) for (let xx = x; xx < x + w; xx += s) ctx.drawImage(tex, xx, yy, s, s);
    ctx.restore();
  };
  /**
   * Block-print: draw a shape (drawFn(g) in a local w x h box) as if hand-stamped with a wooden block:
   * uneven ink density, slightly broken edges, optional misregistered second impression. Cached by key.
   */
  L.blockPrint = (ctx, key, w, h, drawFn, { x = 0, y = 0, color = '#D2232E', density = .82, rough = .5, misreg = 0, alpha = 1, seed = 7 } = {}) => {
    const c = L.cached(`bp-${key}-${color}-${density}-${rough}-${seed}`, w, h, g => {
      g.fillStyle = color; g.strokeStyle = color; drawFn(g);
      const ink = L.textureCanvas('ink', 512, seed);
      g.globalCompositeOperation = 'destination-out';
      g.globalAlpha = rough * .55; for (let yy = 0; yy < h; yy += 512) for (let xx = 0; xx < w; xx += 512) g.drawImage(ink, xx, yy);
      g.globalAlpha = 1 - density; g.fillStyle = '#000';
      for (let k = 0; k < (w * h) / 900 * rough; k++) { const px = L.rnd(seed, k * 2) * w, py = L.rnd(seed, k * 2 + 1) * h; g.beginPath(); g.arc(px, py, .6 + L.rnd(seed, k + 5000) * 1.8, 0, 6.2832); g.fill(); }
    });
    ctx.save(); ctx.globalAlpha *= alpha;
    if (misreg) { ctx.globalAlpha *= .35; ctx.drawImage(c, x + misreg, y - misreg * .6); ctx.globalAlpha /= .35; }
    ctx.drawImage(c, x, y); ctx.restore();
  };
  /** paisley (buta) motif path centred at 0,0, size s */
  L.butaPath = (g, s) => {
    g.beginPath(); g.moveTo(0, -s * .55);
    g.bezierCurveTo(s * .55, -s * .55, s * .62, s * .25, 0, s * .5);
    g.bezierCurveTo(-s * .45, s * .62, -s * .62, s * .05, -s * .3, -s * .05);
    g.bezierCurveTo(-s * .05, -s * .25, s * .18, -s * .2, s * .08, -s * .38);
    g.bezierCurveTo(s * .02, -s * .5, -s * .2, -s * .62, 0, -s * .55); g.closePath();
  };

  /* ---------------- lights ---------------- */
  /**
   * Jhalar / fairy string lights hanging between (x0,y0) and (x1,y1) with sag.
   * mode: 'twinkle' | 'chase' | 'steady' | 'wave'. on: 0..1 progressive switch-on from x0 to x1.
   */
  L.stringLights = (ctx, { x0, y0, x1, y1, sag = 60, n = 24, t = 0, seed = 1, colors = ['#FFC24A', '#FF5C8A', '#FF9F1C', '#9BE7FF', '#FFE9A8'], mode = 'twinkle', on = 1, size = 5, wire = 'rgba(20,16,24,.85)', glow = 1 } = {}) => {
    const pt = p => [L.lerp(x0, x1, p), L.lerp(y0, y1, p) + sag * 4 * p * (1 - p)];
    ctx.save(); ctx.strokeStyle = wire; ctx.lineWidth = 2; ctx.beginPath();
    for (let i = 0; i <= 30; i++) { const [x, y] = pt(i / 30); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); ctx.restore();
    for (let i = 0; i < n; i++) {
      const p = (i + .5) / n; const [x, y] = pt(p); if (p > on) continue;
      let b = 1;
      if (mode === 'twinkle') b = .45 + .55 * L.noise1(t * 2.2 + i * 3.1, seed);
      else if (mode === 'chase') b = ((Math.floor(t * 6) + i) % 3 === 0) ? 1 : .22;
      else if (mode === 'wave') b = .35 + .65 * (.5 + .5 * Math.sin(t * 5 - i * .6));
      const col = colors[i % colors.length];
      const sw = L.smoothstep(on - .06, on, p) ? 1 : 1; // eslint-friendly no-op
      ctx.save(); ctx.fillStyle = 'rgba(25,20,28,.9)'; ctx.fillRect(x - size * .35, y - size * .2, size * .7, size * .9); ctx.restore(); // socket
      if (glow) L.glow(ctx, x, y + size * 1.2, size * 7 * glow, col, .35 * b * sw);
      ctx.save(); ctx.fillStyle = L.mix(col, '#FFFFFF', .35 * b, .55 + .45 * b); ctx.beginPath(); ctx.ellipse(x, y + size * 1.2, size * .7, size, 0, 0, 6.2832); ctx.fill(); ctx.restore();
    }
  };
  /** akash kandil (hanging star lantern), (x,y) = hanging point, s = size */
  L.lantern = (ctx, x, y, s, t, seed = 1, { color = '#D2232E', light = '#FFC24A', lit = 1 } = {}) => {
    const sw = Math.sin(t * 1.3 + seed) * .05; const cy = y + s * 1.4;
    ctx.save(); ctx.strokeStyle = 'rgba(30,24,30,.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.sin(sw) * s * 1.4, cy - s * .9); ctx.stroke();
    ctx.translate(x + Math.sin(sw) * s * 1.4, cy); ctx.rotate(sw);
    if (lit) L.glow(ctx, 0, 0, s * 3.2, light, .35 * lit);
    // 5-point star body with inner glow
    const star = (r1, r2) => { ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? r2 : r1; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); };
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, s); g.addColorStop(0, L.mix(light, '#FFFFFF', .3, .95 * lit + .05)); g.addColorStop(.55, L.mix(color, light, .35 * lit)); g.addColorStop(1, color);
    ctx.fillStyle = g; star(s, s * .45); ctx.fill();
    ctx.strokeStyle = 'rgba(255,233,168,.55)'; ctx.lineWidth = 1.5; star(s * .78, s * .35); ctx.stroke();
    // paper tassels
    ctx.strokeStyle = L.rgba(color, .9); ctx.lineWidth = 1.4;
    for (let k = -3; k <= 3; k++) { ctx.beginPath(); ctx.moveTo(k * s * .08, s * .5); ctx.lineTo(k * s * .1 + Math.sin(t * 2 + k) * 2, s * 1.35 + Math.abs(k) * -s * .05); ctx.stroke(); }
    ctx.restore();
  };

  /* ---------------- flowers & decor ---------------- */
  /** marigold (genda) flower, cached. tone: 'orange' | 'yellow' */
  L.marigold = (ctx, x, y, r, { tone = 'orange', seed = 1, rot = 0, alpha = 1 } = {}) => {
    const key = `mg-${tone}-${Math.round(r)}-${seed % 6}`;
    const sz = Math.ceil(r * 2.4);
    const c = L.cached(key, sz, sz, g => {
      g.translate(sz / 2, sz / 2);
      const base = tone === 'yellow' ? ['#C98A00', '#F2B21B', '#FFD447'] : ['#B9420A', '#F07A12', '#FFA23A'];
      for (let ring = 0; ring < 5; ring++) {
        const rr = r * (1 - ring * .17); const n = 14 + ring * 2;
        for (let i = 0; i < n; i++) {
          const a = i / n * Math.PI * 2 + ring * .4 + L.rnd(seed, ring * 50 + i) * .25;
          const pr = rr * .32; const px = Math.cos(a) * (rr - pr * .9), py = Math.sin(a) * (rr - pr * .9);
          const gg = g.createRadialGradient(px, py, 0, px, py, pr * 1.2);
          gg.addColorStop(0, base[2]); gg.addColorStop(.7, base[1]); gg.addColorStop(1, base[0]);
          g.fillStyle = gg; g.beginPath(); g.ellipse(px, py, pr * 1.05, pr * .7, a, 0, 6.2832); g.fill();
          g.strokeStyle = 'rgba(90,30,0,.25)'; g.lineWidth = .8; g.stroke();
        }
      }
      const cg = g.createRadialGradient(0, 0, 0, 0, 0, r * .25); cg.addColorStop(0, base[0]); cg.addColorStop(1, base[1]);
      g.fillStyle = cg; g.beginPath(); g.arc(0, 0, r * .22, 0, 6.2832); g.fill();
    });
    ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(x, y); if (rot) ctx.rotate(rot); ctx.drawImage(c, -sz / 2, -sz / 2); ctx.restore();
  };
  /** mango leaf, base at (x,y) hanging down at angle a (radians, 0 = straight down) */
  L.mangoLeaf = (ctx, x, y, len, a = 0, { color = '#2F7D32', vein = 'rgba(200,230,150,.5)' } = {}) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    const g = ctx.createLinearGradient(-len * .15, 0, len * .15, 0); g.addColorStop(0, '#1F5A24'); g.addColorStop(.5, color); g.addColorStop(1, '#174A1C');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(len * .2, len * .45, 0, len); ctx.quadraticCurveTo(-len * .2, len * .45, 0, 0); ctx.fill();
    ctx.strokeStyle = vein; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(0, len * .95); ctx.stroke(); ctx.restore();
  };
  /** toran: a door garland across x0..x1 at y with hanging marigold strands and mango leaves. reveal 0..1 */
  L.toran = (ctx, { x0 = 0, x1 = L.W, y = 300, t = 0, seed = 2, flower = 18, strands = 7, strandLen = 5, reveal = 1, sway = 1 } = {}) => {
    const span = x1 - x0; const n = Math.floor(span / (flower * 1.55));
    for (let i = 0; i < n; i++) { const p = i / (n - 1); if (p > reveal) break; const x = x0 + p * span, yy = y + Math.sin(p * Math.PI) * 26;
      if (i % 3 === 1) L.mangoLeaf(ctx, x, yy + flower * .5, flower * 2.6, Math.sin(t * 1.4 + i) * .08 * sway);
      L.marigold(ctx, x, yy, flower, { tone: i % 2 ? 'yellow' : 'orange', seed: i, rot: i }); }
    for (let k = 0; k < strands; k++) {
      const p = (k + .5) / strands; if (p > reveal) break; const x = x0 + p * span, y0 = y + Math.sin(p * Math.PI) * 26;
      for (let j = 1; j <= strandLen; j++) { const sw = Math.sin(t * 1.6 + k * 1.3 + j * .4) * j * 1.6 * sway;
        L.marigold(ctx, x + sw, y0 + j * flower * 1.55, flower * (1 - j * .04), { tone: (j + k) % 2 ? 'orange' : 'yellow', seed: k * 10 + j, rot: j }); }
    }
  };
  /**
   * Rangoli built from the MM mark's chevrons: N-fold symmetric, powder-textured.
   * reveal 0..1 draws rings from the centre outward. palette: array of colours.
   */
  L.rangoli = (ctx, x, y, r, { reveal = 1, t = 0, seed = 4, fold = 8, palette = ['#D2232E', '#F2B23E', '#F07A12', '#3F3593', '#F4F2EE', '#E0218A'], spin = 0 } = {}) => {
    const P = L.markParts(); const chev = P.chevrons[0];
    const S = Math.ceil(r * 2.3); if (!L._rgl || L._rgl.width < S) { L._rgl = document.createElement('canvas'); L._rgl.width = L._rgl.height = S; }
    const layer = L._rgl; const out = ctx; ctx = layer.getContext('2d'); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, layer.width, layer.height);
    ctx.save(); ctx.translate(S / 2, S / 2); ctx.rotate(spin);
    const rings = [
      { at: 0, draw: (k) => { ctx.fillStyle = palette[1]; L.circle(ctx, 0, 0, r * .12); ctx.fill(); ctx.fillStyle = palette[0]; L.circle(ctx, 0, 0, r * .07); ctx.fill(); } },
      { at: .15, draw: (k) => { for (let i = 0; i < fold; i++) { ctx.save(); ctx.rotate(i / fold * 6.2832); ctx.fillStyle = palette[i % 2 ? 2 : 1]; ctx.beginPath(); ctx.ellipse(0, -r * .24, r * .055, r * .12, 0, 0, 6.2832); ctx.fill(); ctx.restore(); } } },
      { at: .32, draw: (k) => { for (let i = 0; i < fold; i++) { ctx.save(); ctx.rotate((i + .5) / fold * 6.2832); ctx.translate(0, -r * .48); const s = r * .2 / 64; ctx.scale(s, -s); ctx.translate(-32, -50); ctx.fillStyle = palette[i % 2 ? 0 : 3]; L.poly(ctx, chev); ctx.fill(); ctx.restore(); } } },
      { at: .5, draw: (k) => { ctx.strokeStyle = palette[4]; ctx.lineWidth = r * .012; ctx.setLineDash([r * .015, r * .03]); L.circle(ctx, 0, 0, r * .62); ctx.stroke(); ctx.setLineDash([]); } },
      { at: .62, draw: (k) => { for (let i = 0; i < fold * 2; i++) { ctx.save(); ctx.rotate(i / (fold * 2) * 6.2832); ctx.fillStyle = palette[[1, 2, 5][i % 3]]; ctx.beginPath(); ctx.moveTo(0, -r * .66); ctx.quadraticCurveTo(r * .09, -r * .8, 0, -r * .94); ctx.quadraticCurveTo(-r * .09, -r * .8, 0, -r * .66); ctx.fill(); ctx.restore(); } } },
      { at: .8, draw: (k) => { for (let i = 0; i < fold * 4; i++) { const a = i / (fold * 4) * 6.2832; ctx.fillStyle = palette[i % 2 ? 4 : 1]; L.circle(ctx, Math.cos(a) * r * .99, Math.sin(a) * r * .99, r * .018); ctx.fill(); } } },
    ];
    for (const ring of rings) { const p = L.clamp((reveal - ring.at) / .18); if (p <= 0) continue; ctx.save(); ctx.globalAlpha *= p; ctx.scale(.85 + .15 * L.ease.outBack(p), .85 + .15 * L.ease.outBack(p)); ring.draw(p); ctx.restore(); }
    ctx.restore();
    // powder texture: knock grains out of the coloured powder (only inside this layer)
    ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.globalAlpha = .32;
    const tex = L.textureCanvas('powder', 512, seed); ctx.drawImage(tex, 0, 0, S, S); ctx.restore();
    out.drawImage(layer, 0, 0, S, S, x - S / 2, y - S / 2, S, S);
  };

  /* ---------------- outdoor advertising ---------------- */
  /**
   * A real hoarding (billboard): steel frame, flex face with texture and wrinkles, gooseneck lamps with light pools,
   * catwalk, support pole(s). (x,y) = top-left of the face, w x h face size (px).
   * content(ctx, w, h, t) draws the artwork in face-local coordinates (clipped).
   * lit 0..1 = lamps on. legs: 'unipole' | 'twin' | 'none'. groundY = where legs end.
   */
  L.hoarding = (ctx, { x, y, w, h, t = 0, lit = 1, seed = 1, content, legs = 'unipole', groundY = L.H + 40, frame = '#1B171D', night = .55, lamps } = {}) => {
    const nL = lamps ?? Math.max(2, Math.round(w / 210));
    ctx.save();
    // legs / pole (behind the face)
    const steel = (px, pw) => { const g = ctx.createLinearGradient(px, 0, px + pw, 0); g.addColorStop(0, '#0E0C10'); g.addColorStop(.45, '#2A2530'); g.addColorStop(1, '#0B0A0D'); ctx.fillStyle = g; ctx.fillRect(px, y + h * .5, pw, groundY - (y + h * .5)); };
    if (legs === 'unipole') steel(x + w / 2 - w * .045, w * .09);
    if (legs === 'twin') { steel(x + w * .2, w * .045); steel(x + w * .755, w * .045); }
    // catwalk under the face
    ctx.fillStyle = '#121014'; ctx.fillRect(x - 14, y + h + 10, w + 28, 9);
    ctx.strokeStyle = 'rgba(70,62,76,.9)'; ctx.lineWidth = 2;
    for (let k = 0; k <= 16; k++) { const px = x - 14 + k * (w + 28) / 16; ctx.beginPath(); ctx.moveTo(px, y + h + 10); ctx.lineTo(px, y + h + 34); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(x - 14, y + h + 34); ctx.lineTo(x + w + 14, y + h + 34); ctx.stroke();
    // face
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); ctx.translate(x, y);
    if (content) content(ctx, w, h, t); else { ctx.fillStyle = '#E9E5DE'; ctx.fillRect(0, 0, w, h); }
    ctx.restore();
    L.textureOverlay(ctx, 'flex', x, y, w, h, { alpha: .07, blend: 'multiply', scale: .5, seed });
    // flex tension wrinkles
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    for (let k = 0; k < 3; k++) { const wx = x + w * (.2 + .3 * k + .05 * L.rnd(seed, k)); const g = ctx.createLinearGradient(wx - 30, 0, wx + 30, 0);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.48, 'rgba(0,0,0,.05)'); g.addColorStop(.52, 'rgba(255,255,255,.035)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(wx - 30, y, 60, h); }
    // night shading: unlit face is dark; lamps paint pools of warm light from the top
    ctx.globalCompositeOperation = 'multiply';
    const shade = ctx.createLinearGradient(0, y, 0, y + h);
    const dark = L.lerp(night, night * .22, lit);
    shade.addColorStop(0, `rgba(${Math.round(255 * (1 - dark * .55))},${Math.round(255 * (1 - dark * .62))},${Math.round(255 * (1 - dark * .45))},1)`);
    shade.addColorStop(1, `rgba(${Math.round(255 * (1 - dark))},${Math.round(255 * (1 - dark * 1.05))},${Math.round(255 * (1 - dark * .85))},1)`);
    ctx.fillStyle = shade; ctx.fillRect(x, y, w, h);
    ctx.globalCompositeOperation = 'screen';
    for (let k = 0; k < nL; k++) { const lx = x + w * (k + .5) / nL; const g = ctx.createRadialGradient(lx, y - h * .05, 0, lx, y + h * .2, h * .95);
      g.addColorStop(0, `rgba(255,238,206,${.38 * lit})`); g.addColorStop(.5, `rgba(255,220,170,${.14 * lit})`); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h); }
    ctx.restore();
    // frame
    ctx.strokeStyle = frame; ctx.lineWidth = 10; ctx.strokeRect(x - 5, y - 5, w + 10, h + 10);
    ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.lineWidth = 1.5; ctx.strokeRect(x - 9, y - 9, w + 18, h + 18);
    // gooseneck lamps
    for (let k = 0; k < nL; k++) {
      const lx = x + w * (k + .5) / nL;
      ctx.strokeStyle = '#141116'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(lx, y - 8); ctx.quadraticCurveTo(lx, y - 62, lx + 26, y - 58); ctx.stroke();
      ctx.save(); ctx.translate(lx + 30, y - 55); ctx.rotate(.5); ctx.fillStyle = '#1D1920'; ctx.fillRect(-16, -9, 32, 16); ctx.restore();
      if (lit > 0) {
        const flick = .92 + .08 * L.noise1(t * 9 + k * 7, seed);
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const cone = ctx.createLinearGradient(lx + 30, y - 46, lx + 10, y + h * .35);
        cone.addColorStop(0, `rgba(255,236,200,${.16 * lit * flick})`); cone.addColorStop(1, 'rgba(255,236,200,0)');
        ctx.fillStyle = cone; ctx.beginPath(); ctx.moveTo(lx + 24, y - 48); ctx.lineTo(lx + 38, y - 50); ctx.lineTo(lx + 95, y + h * .35); ctx.lineTo(lx - 55, y + h * .35); ctx.closePath(); ctx.fill();
        ctx.restore();
        L.glow(ctx, lx + 31, y - 47, 46, '#FFE9C8', .7 * lit * flick); ctx.save(); ctx.fillStyle = L.rgba('#FFFFFF', lit * flick); L.circle(ctx, lx + 31, y - 47, 4.5); ctx.fill(); ctx.restore();
      }
    }
    ctx.restore();
  };

  /**
   * LED dot-matrix text (LED screens, vans). Each LED is a dot with glow. cols = LEDs across the text box.
   * scroll: px/s of horizontal scroll (0 = static). on 0..1 progressive power-up (scanline).
   */
  L.ledText = (ctx, str, x, y, w, h, { t = 0, color = '#FFC24A', pitch = 10, font = 'lat', weight = 760, scroll = 0, on = 1, dim = .07, bg = '#0B0A0D' } = {}) => {
    const cols = Math.floor(w / pitch), rows = Math.floor(h / pitch);
    const fpx = Math.round(rows * .82); const fstr = `${weight} ${fpx}px ${L.FONT[font] || font}`;
    const mctx = L._ledM || (L._ledM = document.createElement('canvas').getContext('2d')); mctx.font = fstr;
    const tw = Math.ceil(mctx.measureText(str).width) + 4; const srcW = scroll ? tw + cols : Math.max(cols, tw);
    const src = L.cached(`led-${str}-${cols}-${rows}-${font}-${weight}-${!!scroll}`, srcW, rows, g => {
      g.fillStyle = '#000'; g.fillRect(0, 0, srcW, rows); g.fillStyle = '#fff'; g.textBaseline = 'middle';
      g.font = fstr; g.textAlign = scroll ? 'left' : 'center'; g.fillText(str, scroll ? cols : srcW / 2, rows * .55);
    });
    const data = src._px || (src._px = src.getContext('2d').getImageData(0, 0, src.width, src.height).data);
    const off = scroll ? Math.floor(t * scroll / pitch) % (src.width) : Math.floor((src.width - cols) / 2);
    ctx.save(); ctx.fillStyle = bg; ctx.fillRect(x, y, cols * pitch, rows * pitch);
    for (let r = 0; r < rows; r++) {
      if (r / rows > on) continue;
      for (let c = 0; c < cols; c++) {
        const sx = (c + off) % src.width; const v = data[(r * src.width + sx) * 4] / 255;
        const px = x + c * pitch + pitch / 2, py = y + r * pitch + pitch / 2;
        if (v > .45) { ctx.fillStyle = L.rgba(color, .55 + .45 * v); L.circle(ctx, px, py, pitch * .36); ctx.fill(); }
        else { ctx.fillStyle = L.rgba(color, dim); L.circle(ctx, px, py, pitch * .3); ctx.fill(); }
      }
    }
    ctx.restore();
    L.glow(ctx, x + cols * pitch / 2, y + rows * pitch / 2, Math.max(cols, rows) * pitch * .6, color, .12 * on);
  };

  /* ---------------- city ---------------- */
  /**
   * Lucknow-at-night skyline with silhouetted landmarks (Rumi Darwaza, Bara Imambara domes, Husainabad Clock Tower,
   * minarets) and modern blocks with water tanks. Lit windows switch on as `lights` goes 0..1.
   * layer: 'far' | 'mid' | 'near'. baseY = ground line. Returns nothing.
   */
  L.skyline = (ctx, { baseY = 1500, layer = 'mid', t = 0, lights = 1, seed = 5, color, windowColor = '#FFC870', offsetX = 0, jhalar = 0 } = {}) => {
    const conf = { far: { h: 260, col: '#2A2140', bw: [60, 130], seedOff: 0 }, mid: { h: 430, col: '#1A1424', bw: [80, 170], seedOff: 100 }, near: { h: 300, col: '#0F0C14', bw: [120, 240], seedOff: 200 } }[layer];
    const col = color || conf.col; const W = L.W + 400; const H = conf.h + 420;
    const key = `sky-${layer}-${seed}-${col}`;
    // build geometry once
    if (!L._skyGeo) L._skyGeo = {};
    if (!L._skyGeo[key]) {
      const blocks = []; let x = -200; let i = 0; const s = seed + conf.seedOff;
      while (x < W) {
        const bw = L.rndRange(s, i * 3, conf.bw[0], conf.bw[1]); const bh = conf.h * L.rndRange(s, i * 3 + 1, .35, 1);
        const kind = layer === 'mid' && i % 7 === 3 ? 'rumi' : layer === 'mid' && i % 7 === 6 ? 'tower' : layer === 'far' && i % 5 === 2 ? 'dome' : layer === 'near' && i % 4 === 1 ? 'house' : 'block';
        blocks.push({ x, w: kind === 'rumi' ? 300 : kind === 'tower' ? 90 : bw, h: kind === 'rumi' ? conf.h * 1.02 : kind === 'tower' ? conf.h * 1.25 : bh, kind, i });
        x += (kind === 'rumi' ? 300 : kind === 'tower' ? 90 : bw) + L.rndRange(s, i * 3 + 2, -10, 24); i++;
      }
      L._skyGeo[key] = blocks;
    }
    const blocks = L._skyGeo[key];
    const sil = L.cached(key, W, H, g => {
      g.fillStyle = col; g.translate(0, H);
      for (const b of blocks) {
        const bx = b.x + 200;
        if (b.kind === 'rumi') { // Rumi Darwaza: big gateway with a tall central arch and a crown of chhatris
          g.fillRect(bx, -b.h * .62, b.w, b.h * .62);
          g.beginPath(); g.moveTo(bx + b.w * .22, -b.h * .62); g.lineTo(bx + b.w * .3, -b.h * .9); g.lineTo(bx + b.w * .5, -b.h); g.lineTo(bx + b.w * .7, -b.h * .9); g.lineTo(bx + b.w * .78, -b.h * .62); g.fill();
          for (let k = 0; k < 7; k++) { const cx = bx + b.w * (.1 + k * .133); const top = -b.h * (.62 + (k === 3 ? .4 : k % 2 ? .1 : .16)); g.fillRect(cx - 5, top, 10, -top - b.h * .6); g.beginPath(); g.arc(cx, top, 9, Math.PI, 0); g.fill(); g.fillRect(cx - 1.5, top - 20, 3, 12); }
          g.save(); g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.moveTo(bx + b.w * .36, 0); g.lineTo(bx + b.w * .36, -b.h * .38); g.quadraticCurveTo(bx + b.w * .5, -b.h * .64, bx + b.w * .64, -b.h * .38); g.lineTo(bx + b.w * .64, 0); g.fill(); g.restore();
        } else if (b.kind === 'tower') { // Husainabad clock tower
          g.fillRect(bx + 20, -b.h * .85, 50, b.h * .85); g.fillRect(bx + 10, -b.h * .3, 70, b.h * .3);
          g.beginPath(); g.moveTo(bx + 16, -b.h * .85); g.lineTo(bx + 45, -b.h * 1.0); g.lineTo(bx + 74, -b.h * .85); g.fill(); g.fillRect(bx + 43, -b.h * 1.07, 4, b.h * .08);
          g.save(); g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(bx + 45, -b.h * .74, 14, 0, 6.2832); g.fill(); g.restore();
        } else if (b.kind === 'dome') { // imambara / mosque domes with minarets
          g.fillRect(bx, -b.h * .55, b.w, b.h * .55); g.beginPath(); g.ellipse(bx + b.w / 2, -b.h * .55, b.w * .32, b.h * .32, 0, Math.PI, 0); g.fill(); g.fillRect(bx + b.w / 2 - 2, -b.h * .95, 4, b.h * .1);
          for (const mx of [bx + 6, bx + b.w - 14]) { g.fillRect(mx, -b.h * .85, 8, b.h * .85); g.beginPath(); g.arc(mx + 4, -b.h * .85, 7, Math.PI, 0); g.fill(); }
        } else if (b.kind === 'house') { // near: low houses with parapets and balconies
          g.fillRect(bx, -b.h * .55, b.w, b.h * .55); for (let k = 0; k < b.w; k += 14) g.fillRect(bx + k, -b.h * .55 - 10, 8, 10);
        } else { // block with water tank / antenna
          g.fillRect(bx, -b.h, b.w, b.h);
          if (L.rnd(seed, b.i + 77) > .45) { g.fillRect(bx + b.w * .3, -b.h - 26, b.w * .3, 26); g.fillRect(bx + b.w * .35, -b.h - 34, b.w * .2, 8); }
          if (L.rnd(seed, b.i + 99) > .8) { g.fillRect(bx + b.w * .75, -b.h - 90, 3, 90); g.fillRect(bx + b.w * .75 - 8, -b.h - 80, 19, 3); g.fillRect(bx + b.w * .75 - 5, -b.h - 62, 13, 3); }
        }
      }
    });
    const ox = -200 + offsetX;
    ctx.drawImage(sil, ox, baseY - H);
    // windows (dynamic so they can switch on)
    if (lights > 0 && layer !== 'far') {
      ctx.save();
      for (const b of blocks) {
        if (b.kind === 'rumi' || b.kind === 'tower') continue;
        const bx = b.x + ox + 200; if (bx > L.W + 20 || bx + b.w < -20) continue;
        const top = b.kind === 'house' ? b.h * .55 : b.h; const cols = Math.max(1, Math.floor((b.w - 12) / 22)), rows = Math.max(1, Math.floor((top - 20) / 30));
        const near = layer === 'near'; const ww = near ? 11 : 8, wh = near ? 14 : 11;
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
          const id = b.i * 1000 + r * 40 + c; const th = L.rnd(seed + 3, id); if (th > .5) continue;
          const onAt = L.rnd(seed + 4, id); if (onAt > lights) continue;
          const wx = bx + 8 + c * (b.w - 16) / cols, wy = baseY - top + 14 + r * 30;
          const k = L.rnd(seed + 5, id); const warm = k > .9 ? '#A8D8FF' : k > .55 ? windowColor : k > .25 ? '#FFB45A' : '#FF9A3C';
          const fl = (.45 + .4 * L.rnd(seed + 6, id)) * (.85 + .15 * L.noise1(t * .7 + id, seed));
          const pop = L.smoothstep(onAt, onAt + .04, lights);
          ctx.fillStyle = L.rgba(warm, fl * pop); ctx.fillRect(wx, wy, ww, wh);
          if (k < .25) { ctx.fillStyle = L.rgba('#2A1A10', .5 * pop); ctx.fillRect(wx + ww * .55, wy, ww * .45, wh); } // curtain
        }
      }
      ctx.restore();
    }
    // jhalar (rooftop strings of lights) on mid/near blocks
    if (jhalar > 0 && layer !== 'far') {
      let k = 0;
      for (const b of blocks) {
        const bx = b.x + ox + 200; if (bx > L.W || bx + b.w < 0 || b.kind === 'tower') continue;
        const top = baseY - (b.kind === 'house' ? b.h * .55 : b.kind === 'rumi' ? b.h * .62 : b.h);
        if (L.rnd(seed + 9, b.i) < jhalar) {
          for (let d = 0; d < 3; d++) L.stringLights(ctx, { x0: bx + 4, y0: top + 6 + d * 3, x1: bx + b.w - 4, y1: top + 6 + d * 3, sag: 0, n: Math.max(4, Math.floor(b.w / 10)), t: t + d, seed: b.i + d * 31, size: 2.4, glow: .6, mode: k % 2 ? 'chase' : 'twinkle', wire: 'rgba(0,0,0,0)', colors: d === 1 ? ['#FFC24A', '#FFE9A8'] : ['#FF5C8A', '#FFC24A', '#9BE7FF'] });
          for (let v = 0; v < Math.min(6, Math.floor((b.kind === 'house' ? b.h * .55 : b.h) / 40)); v++) { // vertical cascades
            const vx = bx + 10 + v * (b.w - 20) / 5; L.stringLights(ctx, { x0: vx, y0: top + 8, x1: vx, y1: Math.min(baseY, top + 160), sag: 0, n: 10, t, seed: b.i * 7 + v, size: 2, glow: .45, mode: 'wave', wire: 'rgba(0,0,0,0)', colors: ['#FFC24A', '#FFE9A8'] });
          }
          k++;
        }
      }
    }
  };
})();

/* ---------------- tri-vision & LED van (appended) ---------------- */
(function () {
  'use strict';
  const L = window.L;
  /**
   * Tri-vision board: `slats` vertical triangular prisms that rotate to swap between faces.
   * faces: array of draw functions (g, w, h) -> each painted once into a cached canvas (key must be unique per face set).
   * from/to: face indices; p: 0..1 overall progress of the turn (each slat staggered left->right by `stagger`).
   * (x,y,w,h) = face rect. Draw frame/lamps around it with L.hoarding(content: ...) or your own frame.
   */
  L.trivision = (ctx, { x, y, w, h, key, faces, from = 0, to = 1, p = 0, slats = 22, stagger = .5, shade = .55 } = {}) => {
    const imgs = faces.map((fn, i) => L.cached(`tv-${key}-${i}-${w}x${h}`, w, h, g => fn(g, w, h)));
    const sw = w / slats;
    for (let i = 0; i < slats; i++) {
      const d = i / Math.max(1, slats - 1) * stagger;
      const q = L.ease.inOutCubic(L.clamp((p - d) / (1 - stagger)));
      const sx = x + i * sw;
      if (q <= 0 || q >= 1) { const img = imgs[q >= 1 ? to : from]; ctx.drawImage(img, i * sw, 0, sw, h, sx, y, sw + .6, h); continue; }
      // prism turning: outgoing face shrinks to the right edge, incoming face grows from the left edge
      const ang = q * 2 * Math.PI / 3; // 120 degrees per face
      const wa = Math.max(0, Math.cos(ang)) * sw, wb = Math.max(0, Math.cos(2 * Math.PI / 3 - ang)) * sw;
      const tot = wa + wb || 1; const k = sw / tot; // keep slat filled (perspective cheat)
      const A = wa * k, B = wb * k;
      ctx.drawImage(imgs[to], i * sw, 0, sw, h, sx, y, B + .6, h);
      ctx.drawImage(imgs[from], i * sw, 0, sw, h, sx + B, y, A + .6, h);
      ctx.save(); ctx.fillStyle = `rgba(0,0,0,${shade * (1 - Math.cos(ang - Math.PI / 3) * .9)})`; ctx.fillRect(sx, y, B, h);
      ctx.fillStyle = `rgba(0,0,0,${shade * .5 * Math.sin(ang)})`; ctx.fillRect(sx + B, y, A, h);
      ctx.fillStyle = 'rgba(255,240,210,.18)'; ctx.fillRect(sx + B - 1, y, 2, h); ctx.restore();
    }
    ctx.save(); ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1; for (let i = 1; i < slats; i++) { ctx.beginPath(); ctx.moveTo(x + i * sw, y); ctx.lineTo(x + i * sw, y + h); ctx.stroke(); } ctx.restore();
  };

  /**
   * LED ad van (Indian mini-truck with a lit LED box), side view facing right. (x, groundY) = rear-bottom of the van.
   * s = scale (1 => ~560px long). screen(g, w, h, t) draws the LED panel content. drive: wheel rotation speed.
   */
  L.ledVan = (ctx, x, groundY, s, t, { screen, body = '#E9E4DA', cab = '#D2232E', drive = 1, bounce = 1, seed = 1, lit = 1 } = {}) => {
    ctx.save(); ctx.translate(x, groundY); ctx.scale(s, s);
    const by = -Math.abs(Math.sin(t * 9 + seed)) * 2.5 * bounce * drive;
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.beginPath(); ctx.ellipse(280, 4, 300, 14, 0, 0, 6.2832); ctx.fill();
    ctx.save(); ctx.translate(0, by);
    // chassis
    ctx.fillStyle = '#17141A'; ctx.fillRect(10, -70, 520, 26);
    // LED box
    const bx = 14, bw = 360, bh = 230, byy = -70 - bh;
    ctx.fillStyle = '#121014'; ctx.fillRect(bx - 6, byy - 6, bw + 12, bh + 12);
    ctx.save(); ctx.beginPath(); ctx.rect(bx, byy, bw, bh); ctx.clip(); ctx.translate(bx, byy);
    if (screen) screen(ctx, bw, bh, t); else { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, bw, bh); }
    ctx.restore();
    // LED pixel grid + glass sheen
    ctx.save(); ctx.globalAlpha = .22 * lit; ctx.strokeStyle = '#000'; ctx.lineWidth = 1.2;
    for (let gx = bx; gx < bx + bw; gx += 6) { ctx.beginPath(); ctx.moveTo(gx, byy); ctx.lineTo(gx, byy + bh); ctx.stroke(); }
    for (let gy = byy; gy < byy + bh; gy += 6) { ctx.beginPath(); ctx.moveTo(bx, gy); ctx.lineTo(bx + bw, gy); ctx.stroke(); }
    ctx.restore();
    L.glow(ctx, bx + bw / 2, byy + bh / 2, 300, '#FFC24A', .1 * lit);
    // cab (Tata-407-style), facing right
    ctx.fillStyle = cab; ctx.beginPath(); ctx.moveTo(390, -70); ctx.lineTo(390, -228); ctx.lineTo(470, -228); ctx.lineTo(525, -150); ctx.lineTo(540, -150); ctx.lineTo(540, -70); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(390, -110, 150, 40);
    const wg = ctx.createLinearGradient(400, -220, 520, -150); wg.addColorStop(0, '#2B3445'); wg.addColorStop(1, '#5D6E86');
    ctx.fillStyle = wg; ctx.beginPath(); ctx.moveTo(405, -215); ctx.lineTo(465, -215); ctx.lineTo(510, -158); ctx.lineTo(405, -158); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.beginPath(); ctx.moveTo(420, -212); ctx.lineTo(440, -212); ctx.lineTo(425, -162); ctx.lineTo(410, -162); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#F4F2EE'; ctx.fillRect(470, -128, 20, 4); // door handle
    // marigold garland on the grille (Diwali!)
    for (let k = 0; k < 6; k++) L.marigold(ctx, 532, -146 + k * 13, 7, { tone: k % 2 ? 'yellow' : 'orange', seed: k });
    // headlight
    L.glow(ctx, 540, -95, 90, '#FFE9C8', .5 * lit); ctx.fillStyle = '#FFFFFF'; ctx.fillRect(534, -102, 7, 12);
    ctx.restore();
    // wheels (outside the bounce)
    for (const wx of [110, 450]) {
      ctx.save(); ctx.translate(wx, -32); ctx.fillStyle = '#0C0B0E'; L.circle(ctx, 0, 0, 34); ctx.fill();
      ctx.fillStyle = '#4A4550'; L.circle(ctx, 0, 0, 16); ctx.fill(); ctx.rotate(t * 14 * drive);
      ctx.strokeStyle = '#8C8783'; ctx.lineWidth = 3; for (let k = 0; k < 5; k++) { ctx.rotate(6.2832 / 5); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(14, 0); ctx.stroke(); }
      ctx.restore();
    }
    ctx.restore();
  };
})();
