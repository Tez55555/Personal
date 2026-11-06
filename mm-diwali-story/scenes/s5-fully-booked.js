/* ==========================================================================
   s5 · FULLY BOOKED   (global 15.600 – 18.000)
   The wish, as a callback to the hook's BOOKED stamp: "आपका पूरा साल… / Wishing you a year…" and a giant
   MM Red block-print stamp slams onto the whole lit city: FULLY BOOKED · खुशियों से · with happiness.
   Its shadow arrives first (15.600); the block then drops from behind the lens along z only (15.633 – 15.967: a huge
   defocused ghost fading in, never an opaque pop, never translating through the copy band) and lands at 16.000 as a
   print centred (540,960), so the M's three roofs + V strings stand clear above it. The print is ink on paper:
   starved ink shows the Muslin through (lighter mottling, never dark holes), an eroded edge (the s1 stamp's noise),
   and a 30% misregistered second strike. Slam, squash and shake are worked
   out from frame-quantised time (no sub-sample straddling). Then rockets on the groove, two burst waves on the beats
   (own closed-form renderer, colour map per storyboard), phuljhadis on the balconies on the 17.2 / 17.4 / 17.567 cues.
   The lit city, railing and camera are the shared world from s4 (window.MMS45); s4 draws it until 16.000,
   this scene from the 16.000 frame (it only overlays copy + the falling stamp during the 15.6–16.0 overlap).
   17.700–18.000: s6 fades in over us; the shared world replicates its dolly, the near field slides out, racks out of
   focus and fades by 17.933, the city outside the three towers dims to 40% + defocuses (cached 6/14 px snapshots), and
   the stamp lifts on the same dolly (17.767 – 17.900), gone before the towers are 60% of the way to their final size.
   ========================================================================== */
(function () {
  'use strict';
  const L = window.L, P = L.PAL, E = L.ease, W = L.W, H = L.H;
  const clamp = L.clamp, lerp = L.lerp, rnd = L.rnd, prog = L.prog, sm = L.smoothstep, q = L.q;
  const TAU = Math.PI * 2, DEG = Math.PI / 180;
  const RED = P.red, MUSLIN = P.muslin, PAPER = P.paper, MIST = P.mist, RICH = P.rich;
  const GOLD = '#FFC24A', AMBER = '#FFB547', AMBER2 = '#FF9F1C', BULB = '#FFF4CF', WARMW = '#FFE7A3';

  const T_FALL = q(15.7), T_HIT = L.beat(26), T_W1 = L.beat(27), T_W2 = L.beat(28), T_LIFT = L.beat(29), T_END = 18.0;
  const T_SHADOW = 15.6, T_AIR = q(15.6333), T_AIR_OPAQUE = q(15.7333);   // shadow first, then the slab drops in from behind the lens
  const T_LIFT0 = q(17.7667), T_LIFT1 = q(17.9), T_X = 17.7;               // the lift rides s6's dolly and is gone by 17.900

  /* ---------------- finishing-pass cues ---------------- */
  // exposure 1.06 for 3 frames on the slam; bloom +20% while the sky is full (per-frame flashes, k = .5 at frame time)
  for (let f = Math.round(T_HIT * 30); f < Math.round(T_HIT * 30) + 3; f++) MM.addFlash({ t: f / 30 - 1 / 120, dur: 1 / 60, exposure: 4 * .06 });
  for (let f = Math.round(16.6 * 30); f < Math.round(17.8 * 30); f++) MM.addFlash({ t: f / 30 - 1 / 120, dur: 1 / 60, bloom: 2 * .18 });

  /* ---------------- the stamp (cached block print) ---------------- */
  const SW = 900, SH = 380, RW = 820, RH = 300;          // cache / art size (art centred)
  const LAY = { title: -14, rule: 24, band: 90 };       // stamp-local baselines (balanced inside the inner rule)
  /** the knock-out art (inner rule, words, band rule, dot) in colour col; grow = stroke dilation for the paper underlay */
  function knockouts(g, col, grow) {
    g.fillStyle = col; g.strokeStyle = col;
    g.lineWidth = 5 + grow * 2; g.strokeRect(-RW / 2 + 16, -RH / 2 + 16, RW - 32, RH - 32);          // inner rule (5 px: reads 4 px after the misregistered 2nd strike)
    const st = grow ? { color: col, width: grow * 2 } : null;
    L.text(g, 'FULLY BOOKED', 0, LAY.title, { font: 'lat', size: 80, weight: 760, stretch: 'expanded', color: col, maxWidth: 700, stroke: st });
    g.fillRect(-300 - grow, LAY.rule - grow, 600 + 2 * grow, 5 + 2 * grow);                        // band rule
    // band at weight 700: knock-out stems stay >= 6 px, so the line survives WhatsApp re-encoding
    const bh = { font: 'dev', size: 44, weight: 700, color: col, stroke: st }, be = { font: 'lat', size: 40, weight: 700, color: col, stroke: st };
    const w1 = L.measure(g, 'खुशियों से', bh), w2 = L.measure(g, 'with happiness', be), gap = 46, x0 = -(w1 + gap + w2) / 2;
    L.text(g, 'खुशियों से', x0, LAY.band, Object.assign({ align: 'left', maxWidth: 260 }, bh));
    L.circle(g, x0 + w1 + gap / 2, LAY.band - 13, 4.5 + grow); g.fill();                           // the middle dot is drawn
    L.text(g, 'with happiness', x0 + w1 + gap, LAY.band, Object.assign({ align: 'left', maxWidth: 360 }, be));
  }
  /* 2D value noise (deterministic) for the ink-starvation field */
  function vnoise(x, y, seed) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), w = yf * yf * (3 - 2 * yf);
    const h = (a, b) => rnd(seed, (a & 2047) * 2053 + (b & 2047));
    return lerp(lerp(h(xi, yi), h(xi + 1, yi), u), lerp(h(xi, yi + 1), h(xi + 1, yi + 1), u), w);
  }
  /** Muslin starvation mottling (alpha field): thin ink lets the paper through in 3–8 px blobs, clustered in soft patches,
      plus faint dry-brushed wood grain. Lighter, never dark: the print reads as ink on paper, not a sticker with dirt. */
  const starveMask = v => L.cached('s5-starve-' + v, SW, SH, g => {
    const im = g.createImageData(SW, SH), d = im.data, M = L.rgb(MUSLIN), sd = 600 + v * 17;
    const maxA = v ? .085 : .14;                                        // wet ink (boil frames) starves less; it dries lighter
    for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) {
      const patch = vnoise(x / 46, y / 38, sd), blob = vnoise(x / 5.2, y / 4.4, sd + 1), fine = vnoise(x / 2.6, y / 2.6, sd + 2);
      const grain = vnoise(x / 90, y / 2.2, sd + 3);                   // long horizontal fibres of the wooden block
      let a = maxA * sm(.5, .74, .72 * blob + .28 * fine) * (.3 + .7 * sm(.32, .72, patch))
            + .045 * sm(.55, .95, patch) + .05 * sm(.72, .9, grain) * (.4 + .6 * patch);
      const i = (y * SW + x) * 4; d[i] = M[0]; d[i + 1] = M[1]; d[i + 2] = M[2]; d[i + 3] = Math.round(255 * Math.min(.22, a));
    }
    g.putImageData(im, 0, 0);
  });
  /** outer-edge erosion with the s1 stamp's own noise mask (its 'ink' texture, same placement), limited to a 9 px band */
  const erodeMask = v => L.cached('s5-erode-' + v, SW, SH, g => {
    const t = document.createElement('canvas'); t.width = SW; t.height = SH; const tg = t.getContext('2d');
    tg.drawImage(L.textureCanvas('ink', 512, 7 + v * 3), -40 - v * 37, -60 - v * 23, 900, 520);
    const n = tg.getImageData(0, 0, SW, SH).data, im = g.createImageData(SW, SH), d = im.data;
    const x0 = SW / 2 - RW / 2, x1 = SW / 2 + RW / 2, y0 = SH / 2 - RH / 2, y1 = SH / 2 + RH / 2;
    for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) {
      const dist = Math.min(x - x0, x1 - x, y - y0, y1 - y); if (dist < -2 || dist > 10) continue;
      const i = (y * SW + x) * 4, nv = n[i] / 255, band = 1 - sm(.5, 9, dist);
      const a = band * sm(.34, .5, nv + .12 * (rnd(611 + v, y * SW + x) - .5));
      d[i + 3] = Math.round(255 * clamp(a));
    }
    g.putImageData(im, 0, 0);
  });
  function inkLayer(g, v) {
    // MM Red ink; the knock-outs reveal Muslin paper
    g.save(); g.translate(SW / 2, SH / 2);
    g.fillStyle = RED; L.rrect(g, -RW / 2, -RH / 2, RW, RH, 7); g.fill();
    g.globalCompositeOperation = 'destination-out'; knockouts(g, '#000', 0);
    g.restore();
    // ink starvation: lighter Muslin mottling on the ink only
    g.save(); g.globalCompositeOperation = 'source-atop'; g.drawImage(starveMask(v), 0, 0); g.restore();
    // eroded outer edge (noise bites + a few chips), like the BOOKED impression
    g.save(); g.globalCompositeOperation = 'destination-out';
    g.drawImage(erodeMask(v), 0, 0);
    g.fillStyle = '#000';
    for (let i = 0; i < 180; i++) {
      const side = i % 4, p = rnd(155 + v, i); let x, y;
      if (side === 0) { x = SW / 2 - RW / 2 + p * RW; y = SH / 2 - RH / 2; } else if (side === 1) { x = SW / 2 - RW / 2 + p * RW; y = SH / 2 + RH / 2; }
      else if (side === 2) { x = SW / 2 - RW / 2; y = SH / 2 - RH / 2 + p * RH; } else { x = SW / 2 + RW / 2; y = SH / 2 - RH / 2 + p * RH; }
      x += (rnd(156 + v, i) - .5) * 5; y += (rnd(157 + v, i) - .5) * 5;
      g.globalAlpha = .9; g.beginPath(); g.arc(x, y, .7 + rnd(158 + v, i) * 2.4, 0, TAU); g.fill();
    }
    g.restore();
    if (v) { g.save(); g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(70,0,8,.08)'; g.fillRect(0, 0, SW, SH); g.restore(); }   // wet ink reads a touch darker
  }
  const inkCanvas = v => L.cached('s5-ink-' + v, SW, SH, g => inkLayer(g, v));
  const paperCanvas = () => L.cached('s5-paper', SW, SH, g => {
    g.translate(SW / 2, SH / 2); knockouts(g, MUSLIN, 1.5);
    g.globalCompositeOperation = 'source-atop'; g.globalAlpha = .1; g.drawImage(L.textureCanvas('paper', 512, 5), -SW / 2, -SH / 2, SW, SH);
  });
  /** a printed impression: paper, ink, and a misregistered second strike (30%, +2 / -1 px) */
  const stampCanvas = v => L.cached('s5-stamp2-' + v, SW, SH, g => {
    g.drawImage(paperCanvas(), 0, 0);
    g.globalAlpha = .3; g.drawImage(inkCanvas(v), 2, -1); g.globalAlpha = 1;
    g.drawImage(inkCanvas(v), 0, 0);
  });
  /** the airborne BLOCK (not yet a print): a fully inked, opaque MM Red face, so nothing shows through while it falls */
  const blockCanvas = () => L.cached('s5-block', SW, SH, g => {
    g.translate(SW / 2, SH / 2); g.fillStyle = RED; L.rrect(g, -RW / 2, -RH / 2, RW, RH, 7); g.fill(); knockouts(g, MUSLIN, 0);
  });
  const printSoft = b => L.cached('s5-print-soft2-' + b, SW, SH, g => { g.filter = `blur(${b}px)`; g.drawImage(stampCanvas(0), 0, 0); g.filter = 'none'; });
  const stampSoft = b => L.cached('s5-block-soft-' + b, SW, SH, g => { g.filter = `blur(${b}px)`; g.drawImage(blockCanvas(), 0, 0); g.filter = 'none'; });
  const shadowCanvas = b => L.cached('s5-shadow-' + b, SW + 200, SH + 200, g => { g.filter = `blur(${b}px)`; g.fillStyle = '#000'; L.rrect(g, 100 + SW / 2 - RW / 2, 100 + SH / 2 - RH / 2, RW, RH, 8); g.fill(); g.filter = 'none'; });
  // dark halo: generous at the sides and bottom (the low bursts), tight on top so the M's roofs + strings stay clean
  const haloCanvas = () => L.cached('s5-halo2', SW + 260, SH + 260, g => { g.filter = 'blur(24px)'; g.fillStyle = RICH; L.rrect(g, 130 + SW / 2 - RW / 2 - 44, 130 + SH / 2 - RH / 2 - 10, RW + 88, RH + 54, 30); g.fill(); g.filter = 'none'; });

  // ink spatter flicked off the block's edges on impact (closed form, then it stays)
  const SPECKS = (() => {
    const a = [], per = 2 * (RW + RH);
    for (let i = 0; i < 34; i++) {
      let s = rnd(302, i) * per, px, py, nx, ny;
      if (s < RW) { px = -RW / 2 + s; py = -RH / 2; nx = 0; ny = -1; } else if (s < RW + RH) { px = RW / 2; py = -RH / 2 + (s - RW); nx = 1; ny = 0; }
      else if (s < 2 * RW + RH) { px = RW / 2 - (s - RW - RH); py = RH / 2; nx = 0; ny = 1; } else { px = -RW / 2; py = RH / 2 - (s - 2 * RW - RH); nx = -1; ny = 0; }
      a.push({ px, py, ang: Math.atan2(ny, nx) + (rnd(303, i) - .5) * 1.4, dist: 4 + Math.pow(rnd(304, i), 2.2) * 46, size: .8 + Math.pow(rnd(305, i), 2.4) * 4.2, delay: rnd(306, i) * .03, sat: rnd(307, i) });
    }
    return a;
  })();
  function spatter(g, tau) {
    if (tau < 0) return;
    g.fillStyle = RED;
    for (const s of SPECKS) {
      const t = tau - s.delay; if (t < 0) continue;
      const p = 1 - Math.exp(-30 * t), d = s.dist * p, x = s.px + Math.cos(s.ang) * d, y = s.py + Math.sin(s.ang) * d, r = s.size, st = 1 + 3 * (1 - p);
      g.save(); g.translate(x, y); g.rotate(s.ang);
      g.beginPath(); g.ellipse(-r * (st - 1) * .8, 0, r * st, r * (1 - .25 * (1 - p)), 0, 0, TAU); g.fill();
      if (s.sat > .55 && p > .6) { g.beginPath(); g.arc(r * 2.7, (s.sat - .75) * 6, r * .4, 0, TAU); g.fill(); }
      g.restore();
    }
  }

  /* The slam is worked out from FRAME-QUANTISED time, so the 4 motion-blur sub-samples of a frame always agree.
     15.600 – 16.000  the shadow comes first (Rich Black multiply 0 -> .40, big + soft, tightening onto the footprint).
     15.633 – 15.967  the slab drops from behind the lens along z only (scale 3.0 -> 1.0 over 15.633–16.000, inCubic;
                      rotation -14 -> -7; alpha smoothstep 15.633–15.733): its first visible frames are a huge, defocused
                      ghost that never pops in opaque, and it never translates through the copy band.
     16.000           landed with squash, then fixed per-frame shake offsets.
     17.767 – 17.900  the print lifts (scale 1 -> 1.15, soft) and fades, riding s6's dolly so it flies past the lens. */
  const SC = { x: 540, y: 960 };                         // landing centre: the M's roofs + V strings stand clear above it
  const FA = Math.round(T_AIR * 30), FH = Math.round(T_HIT * 30);
  const SHAKE = [[10, -6], [-7, 5], [4, -3], [-2, 1]];  // 16.000, 16.033, 16.067, 16.100
  const shakeAt = T => { const k = Math.round(T * 30) - FH, v = SHAKE[k]; return v ? { x: v[0], y: v[1] } : { x: 0, y: 0 }; };
  const airE = T => E.inCubic(prog(T, T_AIR, T_HIT));
  /** stamp transform at T: { s, sx, sy, rot, a, dy, soft, fall, tau } */
  function stampPose(T) {
    const fi = Math.round(T * 30);
    if (fi < FA) return null;
    if (fi < FH) {
      const tq = fi / 30, e = airE(tq), sc = lerp(3, 1, e);
      // defocus grows with closeness to the lens (cache px; on screen it is x scale)
      const soft = sc > 2.4 ? 12 : sc > 1.95 ? 8 : sc > 1.55 ? 5 : sc > 1.2 ? 3 : 0;
      // right at the lens a defocused slab is see-through (the background light wraps round it into the aperture):
      // it solidifies as it falls into the focal plane, so the first frames stay a translucent ghost, never a red wall
      const seeThru = lerp(.42, 1, sm(2.7, 1.6, sc));
      return { s: sc, sx: 1, sy: 1, rot: lerp(-14, -7, e), a: sm(T_AIR, T_AIR_OPAQUE, tq) * seeThru, dy: 0, soft, fall: e, p: prog(tq, T_AIR, T_HIT) };
    }
    const k = fi - FH, tau = Math.max(0, T - T_HIT);
    let sx = 1, sy = 1, s = 1, rot = -7, a = 1, dy = 0, soft = 0;
    if (k === 0) { sx = 1.04; sy = .96; } else if (k === 1) { sx = .992; sy = 1.012; } else if (k === 2) { sx = 1.004; sy = .997; }
    // lift: alpha 1 -> 0 over 17.767–17.900, front-loaded ((1-u)^2) so the ghost has cleared the forming M by 17.867
    if (T > T_LIFT0) { const u = prog(T, T_LIFT0, T_LIFT1, E.inQuad), l = prog(T, T_LIFT0, T_LIFT1); s = lerp(1, 1.15, u); a = (1 - l) * (1 - l); dy = -24 * u; rot = -7 + 1.2 * u; soft = 6 * Math.min(1, l * 1.6); }
    return { s, sx, sy, rot, a, dy, soft, fall: 1, p: 1, tau };
  }
  /** s6's dolly, as the shared world applies it to the city layer, relative to the held wide at 17.700 */
  function dollyXf(g, T) {
    const NS = window.MMS45; if (T <= T_X || !NS || !NS.camAt) return;
    const c0 = NS.camAt(T_X), c = NS.camAt(T);
    g.translate(540, c.cy); g.scale(c.z, c.z); g.translate(-540, -c.cy);
    g.translate(540, c0.cy); g.scale(1 / c0.z, 1 / c0.z); g.translate(-540, -c0.cy);
  }
  function drawStampShadow(g, T, pose) {
    if (T < T_SHADOW || T > T_LIFT1) return;
    const fi = Math.round(T * 30);
    g.save();
    if (fi < FH) {
      // airborne: a big soft shadow that darkens and tightens onto the footprint as the block comes down
      const e = airE(T), al = .40 * prog(T, T_SHADOW, T_HIT), sc = lerp(1.32, 1, E.inQuad(prog(T, T_SHADOW, T_HIT)));
      g.translate(SC.x + 18 * (1 - e) + 6, SC.y + 30 * (1 - e) + 10); g.rotate(lerp(-11, -7, e) * DEG); g.scale(sc, sc);
      const w = sm(.25, .9, e);                          // soft (36) -> tighter (14) as it approaches
      g.globalAlpha = al * (1 - w); g.drawImage(shadowCanvas(36), -(SW + 200) / 2, -(SH + 200) / 2);
      g.globalAlpha = al * w; g.drawImage(shadowCanvas(14), -(SW + 200) / 2, -(SH + 200) / 2);
    } else {
      const u = prog(T, T_LIFT0, T_LIFT0 + .1), sc = lerp(1, 1.08, u);
      g.translate(SC.x + 6, SC.y + 10); g.rotate(-7 * DEG); g.scale(sc, sc);
      g.globalAlpha = .32 * (1 - u); g.drawImage(shadowCanvas(u > .3 ? 14 : 8), -(SW + 200) / 2, -(SH + 200) / 2);
    }
    g.restore();
  }
  function drawStamp(g, T, pose) {
    if (!pose || pose.a <= 0) return;
    // pivot snapped to whole pixels so the 4 px rules do not alias
    g.save(); g.translate(Math.round(SC.x), Math.round(SC.y) + pose.dy); g.rotate(pose.rot * DEG); g.scale(pose.s * pose.sx, pose.s * pose.sy);
    // dark halo so sparks never sit on the stamp's edge
    g.globalAlpha = .55 * pose.a * pose.fall; g.drawImage(haloCanvas(), -(SW + 260) / 2, -(SH + 260) / 2);
    g.globalAlpha = pose.a;
    let img;
    if (pose.tau == null) img = pose.soft > 0 ? stampSoft(pose.soft) : blockCanvas();
    else if (pose.soft > 1) img = printSoft(pose.soft > 4 ? 6 : pose.soft > 2.5 ? 4 : 2);
    else if (pose.tau != null && pose.tau < .37) img = stampCanvas(1 + (Math.floor(pose.tau * 15) % 3));   // wet ink "boils" on twos
    else img = stampCanvas(0);
    g.drawImage(img, -SW / 2, -SH / 2);
    if (pose.tau != null) { g.globalAlpha = pose.a; spatter(g, pose.tau); }
    g.restore();
  }

  /* ---------------- fireworks (closed form, own renderer) ----------------
     Colour map: gold #FFC24A, white glitter, MM Red, gold willows (#FFC24A bodies, #FFE7A3 tips), amber #FF9F1C.
     Bodies/trails are kept under the bloom threshold; only heads/tips bloom. Heads are white for the first 2 frames only.
     Streaks are >= 2 px so they survive WhatsApp. Rocket pairs launch 16.1/16.2 (0.5 s flights) and 16.3/16.4 (0.9 s). */
  const PEONY = { k: 2.8, grav: 150, trail: .13, life: 1.35, head: 2.1 }, WILLOW = { k: 2.2, grav: 620, trail: .5, life: 1.25, head: 1.7 };
  const BURSTS = [
    { t: T_W1, x: 180, y: 640, r: 170, shape: 'peony', body: GOLD, tip: '#FFE7A3', n: 120, seed: 51, pistil: '#FFF4CF', crackle: 1, lx: 220, ly: 1300, lt: q(16.1) },
    { t: T_W1, x: 900, y: 620, r: 170, shape: 'peony', body: '#FFF4CF', tip: '#FFFFFF', n: 130, seed: 52, lx: 860, ly: 1300, lt: q(16.1), glitter: 1 },
    { t: q(16.7), x: 120, y: 290, r: 150, shape: 'peony', body: RED, tip: RED, n: 110, seed: 53, pistil: GOLD, lx: 120, ly: 1300, lt: q(16.2), lum: 1 },
    { t: q(16.7), x: 1000, y: 262, r: 150, shape: 'willow', body: GOLD, tip: '#FFE7A3', n: 56, seed: 54, lx: 960, ly: 1300, lt: q(16.2), life: 1.6 },
    { t: T_W2, x: 250, y: 1215, r: 140, shape: 'crossette', body: GOLD, tip: '#FFE7A3', n: 40, seed: 55, lx: 300, ly: 1720, lt: q(16.3), low: 1 },
    { t: T_W2, x: 830, y: 1195, r: 150, shape: 'peony', body: AMBER2, tip: GOLD, n: 100, seed: 56, pistil: '#FFE7A3', lx: 780, ly: 1720, lt: q(16.3), low: 1 },
    { t: q(17.3), x: 540, y: 230, r: 260, shape: 'willow', body: GOLD, tip: '#FFE7A3', n: 70, seed: 57, lx: 800, ly: 1320, lt: q(16.4), life: 1.05, liftFade: [700, 600], flatBottom: 1 },
    { t: q(17.3), x: 700, y: 1280, r: 120, shape: 'peony', body: '#FFF4CF', tip: '#FFFFFF', n: 80, seed: 58, glitter: 1, lx: 960, ly: 1720, lt: q(16.4), low: 1 },
  ];
  function burst(g, b, bt, alpha) {
    const P = b.shape === 'willow' ? WILLOW : PEONY, life = b.life || P.life;
    if (bt < 0 || bt > life + P.trail) return;
    // the break: one small hot frame, never a moon
    if (bt < 1 / 30) { const w = b.shape === 'willow'; glow(g, b.x, b.y, w ? 12 : 30, '#FFF4CF', (w ? .6 : .8) * alpha); g.fillStyle = rgbaHex('#FFFFFF', alpha); L.circle(g, b.x, b.y, w ? 3 : 4); g.fill(); }
    g.lineCap = 'round';
    shell(g, b, bt, alpha, b.r, b.n, b.body, b.tip, life, 0);
    if (b.pistil) shell(g, b, bt - .03, alpha, b.r * .42, Math.round(b.n * .45), b.pistil, b.pistil, life * .7, 1);
  }
  function shell(g, b, bt, alpha, R, n, body, tip, life, inner) {
    if (bt < 0) return;
    const willow = b.shape === 'willow' && !inner, P = willow ? WILLOW : PEONY, k = P.k, grav = P.grav, v0 = R * k;
    const tr = Math.min(P.trail * (inner ? .6 : 1), bt * .7);              // the trail never reaches back to the break point
    const hot = bt < 2 / 30, nseg = willow ? 6 : 3, seed = b.seed + inner * 500;
    for (let i = 0; i < n; i++) {
      const a = (i + .7 * rnd(seed, i)) / n * TAU, u = 2 * rnd(seed, i + 300) - 1;
      const sp = willow ? .8 + .2 * rnd(seed, i + 300) : .32 + .68 * Math.sqrt(1 - u * u);   // a sphere shell seen flat
      const vx = Math.cos(a) * v0 * sp, vy = Math.sin(a) * v0 * sp * (b.flatBottom && Math.sin(a) > 0 ? .5 : 1) - (willow ? v0 * .06 : 0);
      const li = life * (.78 + .22 * rnd(seed, i + 600)); if (bt > li) continue;
      const age = bt / li;
      let al = (willow ? Math.pow(1 - age, .75) : Math.pow(1 - age, 1.3)) * alpha;
      if (b.glitter && age > .22) al *= rnd(seed + Math.floor(bt * 15) * 31, i) > .42 ? 1 : .1;   // per-star twinkle on twos
      if (al <= .01) continue;
      const pos = tt => L.ballistic(b.x, b.y, vx, vy, k, grav, Math.max(0, tt));
      let prev = pos(bt - tr);
      for (let sgi = 1; sgi <= nseg; sgi++) {
        const f = sgi / nseg, cur = pos(bt - tr * (1 - f));
        g.strokeStyle = rgbaHex(body, (willow ? .62 : .7) * al * (.04 + .96 * f * f)); g.lineWidth = 2 + .7 * f;
        g.beginPath(); g.moveTo(prev[0], prev[1]); g.lineTo(cur[0], cur[1]); g.stroke(); prev = cur;
      }
      glow(g, prev[0], prev[1], b.lum ? 10 : 6, body, (b.lum ? .55 : .28) * al);
      g.fillStyle = hot ? rgbaHex('#FFFFFF', al) : rgbaHex(tip, al); L.circle(g, prev[0], prev[1], hot ? 2.6 : P.head * (inner ? .85 : 1)); g.fill();
      // gold peonies end in a crackle: tiny white pops around each star, on twos
      if (b.crackle && !inner && age > .6) { const fr = Math.floor(bt * 15);
        for (let j = 0; j < 2; j++) { if (rnd(seed + fr * 7, i * 3 + j) < .55) continue; const ca = rnd(seed + fr * 11, i * 5 + j) * TAU, cr = 3 + 7 * rnd(seed + fr * 13, i + j * 97);
          g.fillStyle = rgbaHex('#FFFFFF', .9 * alpha); g.fillRect(prev[0] + Math.cos(ca) * cr - 1, prev[1] + Math.sin(ca) * cr - 1, 2, 2); } }
      if (b.shape === 'crossette' && !inner && age > .36) {   // each star splits in four
        const t0 = li * .36, sp0 = pos(t0), tt = bt - t0;
        for (let j = 0; j < 4; j++) {
          const bb = a + j * Math.PI / 2 + .6, c0 = L.ballistic(sp0[0], sp0[1], Math.cos(bb) * 150, Math.sin(bb) * 150, 3.2, grav, Math.max(0, tt - .08)), c1 = L.ballistic(sp0[0], sp0[1], Math.cos(bb) * 150, Math.sin(bb) * 150, 3.2, grav, tt);
          g.strokeStyle = rgbaHex(body, .6 * al); g.lineWidth = 2; g.beginPath(); g.moveTo(c0[0], c0[1]); g.lineTo(c1[0], c1[1]); g.stroke();
          g.fillStyle = rgbaHex(tip, .9 * al); L.circle(g, c1[0], c1[1], 1.6); g.fill();
        }
      }
    }
  }
  /** a lean rocket: small hot head, a crackling trail of falling sparks (>= 2 px) */
  function rocket(g, b, rt, dur, alpha) {
    const pos = tt => { const p = E.outQuad(clamp(tt / dur)); return [lerp(b.lx, b.x, p) + L.snoise(tt * 6, b.seed) * 6 * p, lerp(b.ly, b.y, p)]; };
    const fadeAt = y => b.liftFade ? sm(b.liftFade[1], b.liftFade[0], y) : 1;   // the lift charge burns out before the copy band
    g.lineCap = 'round';
    for (let i = 1; i < 18; i++) {
      const tb = rt - i * .028; if (tb < 0) break;
      const p = pos(tb), age = rt - tb, vx = (rnd(b.seed, i + Math.floor(tb * 30) * 7) - .5) * 80;
      const q0 = L.ballistic(p[0], p[1], vx, 20, 2, 320, Math.max(0, age - .03)), q1 = L.ballistic(p[0], p[1], vx, 20, 2, 320, age), al = Math.max(0, 1 - age / .5) * fadeAt(p[1]) * alpha;
      if (al <= .01) continue;
      g.strokeStyle = rgbaHex(i % 3 ? GOLD : BULB, .7 * al); g.lineWidth = 2; g.beginPath(); g.moveTo(q0[0], q0[1]); g.lineTo(q1[0], q1[1]); g.stroke();
    }
    const h = pos(rt), k = (1 - .5 * clamp(rt / dur)) * fadeAt(h[1]) * alpha;
    if (k <= .01) return;
    glow(g, h[0], h[1], 26, GOLD, .45 * k); glow(g, h[0], h[1], 8, '#FFFFFF', .9 * k);
    g.fillStyle = rgbaHex('#FFFFFF', k); g.beginPath(); g.arc(h[0], h[1], 2.2, 0, TAU); g.fill();
  }
  function drawBursts(g, T, low, alpha = 1) {
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const b of BURSTS) {
      if (!!b.low !== low) continue;
      const rt = T - b.lt, dur = b.t - b.lt, bt = T - b.t;
      if (low && bt > -.05 && bt < 1.4) {   // Rich Black local halo: the burst never sits on a busy window grid
        const env = sm(-.05, .05, bt) * (1 - sm(.7, 1.4, bt)) * alpha;
        g.globalCompositeOperation = 'source-over';
        const hg = g.createRadialGradient(b.x, b.y, 0, b.x, b.y, 160); hg.addColorStop(0, rgbaRich(.3 * env)); hg.addColorStop(.6, rgbaRich(.2 * env)); hg.addColorStop(1, rgbaRich(0));
        g.fillStyle = hg; g.fillRect(b.x - 160, b.y - 160, 320, 320);
        g.globalCompositeOperation = 'lighter';
      }
      if (rt >= 0 && rt < dur) rocket(g, b, rt, dur, alpha);
      burst(g, b, bt, alpha);
    }
    g.restore();
  }
  const rgbaHex = L.rgba;
  function glow(g, x, y, r, col, a) { if (window.MMS45) window.MMS45.glow(g, x, y, r, col, a); else L.glow(g, x, y, r, col, a); }
  /** light from the bursts (for the railing light map, base coords) */
  function burstLights(T) {
    const out = [];
    for (const b of BURSTS) { const bt = T - b.t; if (bt < 0 || bt > .7) continue; out.push({ x: b.x, y: 1300, r: 520, a: .35 * Math.pow(1 - bt / .7, 2) }); }
    return out;
  }

  /* ---------------- phuljhadis (they catch on the sound cues 17.2 / 17.4 / 17.567) ---------------- */
  const SPARKLERS = [{ x: 200, y: 1380, seed: 71, t: T_W2 }, { x: 880, y: 1386, seed: 72, t: q(17.5667) }];
  const RAIL_SPARK = { x: 700, y: 1376, seed: 73, t: q(17.4) };
  const sparkI = (T, t0) => L.inOut(T, t0 - .03, t0 + .06, 17.7, 17.82) * (.85 + .15 * L.noise1(T * 11, 5));
  function sparkler(g, s, T, I) {
    if (I <= 0) return;
    L.sparkler(g, s.x, s.y, T, s.seed, { radius: 40, count: 24, intensity: I * .9 });
  }
  function railSparkler(g, T) {
    // a little clay pot with a phuljhadi, right of the hero diya
    const x = RAIL_SPARK.x, base = 1430;
    g.fillStyle = '#5A2614'; g.beginPath(); g.moveTo(x - 9, base); g.quadraticCurveTo(x - 12, base - 14, x - 6, base - 18); g.lineTo(x + 6, base - 18); g.quadraticCurveTo(x + 12, base - 14, x + 9, base); g.closePath(); g.fill();
    g.strokeStyle = '#3A3634'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, base - 16); g.lineTo(x + 6, RAIL_SPARK.y); g.stroke();
    const I = sparkI(T, RAIL_SPARK.t); if (I > 0) L.sparkler(g, x + 6, RAIL_SPARK.y, T, RAIL_SPARK.seed, { radius: 50, count: 28, intensity: I });
  }

  /* ---------------- copy ---------------- */
  const OA = { font: 'dev', size: 84, weight: 700, color: PAPER }, OAe = { font: 'lat', size: 84, weight: 700, color: PAPER };
  const OEN = { font: 'lat', size: 44, weight: 600, color: MIST };
  function drawCopy(g, T) {
    if (T < T_FALL) return;
    const outA = 1 - sm(T_LIFT, q(17.9667), T);
    if (outA <= 0) return;
    // dark halo behind the top band (fireworks never sit on the copy)
    g.save(); g.translate(540, 418); g.scale(1, .34);
    const hg = g.createRadialGradient(0, 0, 0, 0, 0, 520); hg.addColorStop(0, rgbaRich(.55)); hg.addColorStop(.6, rgbaRich(.38)); hg.addColorStop(1, rgbaRich(0));
    g.globalAlpha = sm(T_FALL, T_FALL + .2, T) * outA; g.fillStyle = hg; g.fillRect(-540, -520, 1080, 1040); g.restore();
    // line A: per word, 2-frame stagger, .2 s; the ellipsis rides on the last word (Latin glyph)
    const words = ['आपका', 'पूरा', 'साल'], ell = '…';
    const ws = words.map(w => L.measure(g, w, OA)), sp = L.measure(g, ' ', OA), we = L.measure(g, ell, OAe);
    let x = 540 - (ws.reduce((a, b) => a + b, 0) + sp * 2 + we) / 2;
    words.forEach((w, i) => {
      const p = clamp((T - T_FALL - i * 2 / 30) / .2), e = E.outCubic(p);
      if (p > 0) {
        const y = 395 + (1 - e) * 30;
        L.text(g, w, x, y, Object.assign({}, OA, { align: 'left', alpha: e * outA, maxWidth: ws[i] + 4 }));
        if (i === 2) L.text(g, ell, x + ws[i] + 2, y, Object.assign({}, OAe, { align: 'left', alpha: e * outA, maxWidth: we + 4 }));
      }
      x += ws[i] + sp;
    });
    const pe = E.outCubic(clamp((T - q(15.7667)) / .2));
    if (pe > 0) L.text(g, 'Wishing you a year…', 540, 470 + (1 - pe) * 12, Object.assign({}, OEN, { alpha: pe * outA, maxWidth: 820 }));
  }
  const rgbaRich = a => `rgba(28,26,26,${a})`;

  /* ---------------- impact ---------------- */
  function shockwave(g, T) {
    if (Math.round(T * 30) < FH) return;
    const u = Math.max(0, T - T_HIT) / .4; if (u > 1) return;
    const r = 900 * E.outCubic(u);
    g.save(); g.strokeStyle = `rgba(244,242,238,${.3 * (1 - u)})`; g.lineWidth = 6; g.beginPath(); g.ellipse(SC.x, SC.y, r, r * .92, 0, 0, TAU); g.stroke();
    // the air pushed out from under the block lifts a soft ring of cracker smoke
    g.globalCompositeOperation = 'screen';
    const rg = g.createRadialGradient(SC.x, SC.y, Math.max(0, r * .72), SC.x, SC.y, r * 1.05 + 1);
    rg.addColorStop(0, 'rgba(201,196,191,0)'); rg.addColorStop(.6, `rgba(201,196,191,${.07 * (1 - u)})`); rg.addColorStop(1, 'rgba(201,196,191,0)');
    g.fillStyle = rg; g.fillRect(0, 0, W, H);
    g.restore();
  }
  function flareFn(T) {
    if (T < T_HIT || T > T_HIT + .6) return null;
    return (x, y) => {
      const d = Math.hypot(x - SC.x, y - SC.y), tr = T_HIT + .4 * (1 - Math.cbrt(Math.max(0, 1 - d / 900)));
      const u = T - tr; return u < 0 ? 0 : .4 * Math.exp(-u * 9);
    };
  }

  MM.scene('s5-fully-booked', {
    draw(ctx, t, { T }) {
      const NS = window.MMS45; if (!NS) return;
      const landed = Math.round(T * 30) >= FH;       // frame-quantised: every sub-sample of the 16.000 frame is "landed"
      const shake = shakeAt(T);
      const pose = stampPose(T);
      if (landed) {
        const tau = Math.max(0, T - T_HIT);
        const lights = burstLights(T);
        const rI = sparkI(T, RAIL_SPARK.t); if (rI > 0) lights.push({ x: RAIL_SPARK.x + 6, y: RAIL_SPARK.y, r: 300, a: .95 * rI, floor: .8 });
        NS.drawWorld(ctx, T, {
          shake, flare: flareFn(T), towerFlare: tau < .3 ? .4 * (1 - tau / .3) : 0, lights,
          skyFx: g => drawBursts(g, T, false),
          preNearFx: (g, a) => drawBursts(g, T, true, a),
          nearFx: (g, a) => { for (const s of SPARKLERS) sparkler(g, s, T, sparkI(T, s.t) * a); },
          railFx: g => railSparkler(g, T),
        });
      }
      ctx.save(); ctx.translate(shake.x, shake.y);
      ctx.save(); dollyXf(ctx, T); drawStampShadow(ctx, T, pose); ctx.restore();
      shockwave(ctx, T);
      ctx.save(); dollyXf(ctx, T); drawStamp(ctx, T, pose); ctx.restore();
      drawCopy(ctx, T);
      ctx.restore();
    }
  });
})();
