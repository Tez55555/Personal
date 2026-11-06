/* s7 · End card: Sponsored by Aapke Apne (19.000 – 24.400)
   The mark glides from the s6 climax into the bilingual lockup (19.0–19.6, landing on the triple burst); a Legacy-Line
   toran with draped marigold swags unfurls; Happy Diwali / शुभ दीपावली is up by 19.3; the sender signs it
   ("Sponsored by: Aapke Apne") and the film's block-print stamp seals it "BOOKED · आपके नाम" on the dhol DHA (20.800);
   the s4 Legacy-Line railing carries the hero diya + two small ones, lit left / red-pillar / right on the sonic-logo notes;
   "Forward the light" and a typed ticker of who to send it to lands on "Sabko!" (22.600). Complete at 22.767, then a
   dead-still hold (the screenshot frame); 24.1–24.4 loop seam.
   Layering with s6 (19.0–20.5): s6 paints the card background (MM.S7.background) over its fading city, then its rockets,
   bursts and glitter rain, masked out of the boxes below (MM.S7.maskBoxes); this scene draws everything else on top. */
(function () {
  const ID = 's7-endcard-sponsored-by-aapke-apne';
  const PAPER = L.PAL.paper, MUSLIN = '#EEECE8', MIST = '#C9C4BF', STONE = '#8C8783', RED = '#D2232E', VIOLET = '#3F3593';
  const TAU = Math.PI * 2, DEG = Math.PI / 180;
  const inOutSine = t => -(Math.cos(Math.PI * t) - 1) / 2;
  const fr = T => Math.round(T * 30);                  // frame index: every motion-blur sub-frame (T ± 1/120 s) of a frame shares it
  const Tq = T => fr(T) / 30;

  // ---- timing (global s, frame aligned) ----
  const T_GLIDE = [19.0, 19.6];                        // mark -> lockup slot, lands on beat 32 with the triple burst
  const T_TORAN = [19.167, 19.6], T_GARL = 19.6;       // toran unfurls centre-out, swags drop with a spring
  const T_HAPPY = 19.267, T_SHUBH = 19.467;
  const T_WORDS = [19.6, 19.867], T_MEDIA = 19.767;
  const T_SIGN = [19.9, 20.267], T_TAG = 20.0, T_LABEL = 20.2, T_SEAL = 20.8;
  const DIYA_T = { l: 20.8, c: 20.933, r: 21.067 };   // sonic logo #2: D5 (left pillar), A5 + bell (red pillar), D6 (right)
  const NAMES = [['Mummy-Papa…', 20.5, 21.0], ['Bestie…', 21.0, 21.4], ['Boss…', 21.4, 21.8], ['Pados wale uncle…', 21.8, 22.6], ['Sabko!', 22.6, 99]];
  const T_SABKO = 22.6, T_DONE = 22.767, T_SEAM = [24.1, 24.4];

  // ---- layout ----
  // lockup: bilingual, reverse, w 560 centred (540,1243.6): a signature-sized sign-off, not an ad. Mark slot = left 110/596.739.
  const LOCK = { x: 540, y: 1243.6, w: 560 };
  const MARK_FROM = { x: 540, y: 796.36, w: 520 }, MARK_TO = { x: 540 - 280 + 560 * 110 / 596.739 / 2, y: 1243.6, w: 560 * 110 / 596.739 };
  const TOR = { x0: 90, x1: 990, yTop: 268, h: 56, offset: 21.1, redIndex: 19 };
  const ts = TOR.h / 100, tStep = 46.25 * ts, tStart = TOR.x0 - ((TOR.offset % tStep) + tStep) % tStep - tStep;
  const ANCH = [90, 315, 540, 765, 990], ANCH_Y = TOR.yTop + TOR.h + 3, SAG = 46, STRAND_N = [5, 4, 3, 4, 5];
  const HAPPY = { y: 524, o: { font: 'lat', size: 122, weight: 770, color: PAPER, maxWidth: 900 } };
  const SHUBH = { y: 660, o: { font: 'dev', size: 104, weight: 700, color: MUSLIN, maxWidth: 880 } };
  const SIGN = { str: 'Sponsored by: Aapke Apne', cx: 446, y: 790, o: { font: 'tiro', italic: true, size: 52, color: MUSLIN, maxWidth: 860 } };
  const SEAL = { x: 858, y: 772, w: 230, h: 84, rot: -8 * DEG };
  const LABEL = { y: 905, a: { font: 'lat', size: 46, weight: 600, color: PAPER }, b: { font: 'dev', size: 48, weight: 600, color: PAPER } };
  const TICK = { y: 995, o: { font: 'tiro', italic: true, size: 64, color: RED, maxWidth: 860 } };
  const RAIL = { top: 1466, cap: 10, mTop: 1476, h: 84, bottom: 1560 };   // Legacy-Line railing (s4), red pillar centred at x 540
  const RS = RAIL.h / 100, RSTEP = 46.25 * RS, RPW = 17.5 * RS, R_X0 = 540 - RPW / 2 - 12 * RSTEP;
  const DIYAS = [{ k: 'l', x: 429, s: 20, fh: 19, seed: 31, lean: -5 }, { k: 'c', x: 540, s: 33, fh: 36, seed: 11, lean: 2.5 }, { k: 'r', x: 651, s: 20, fh: 19, seed: 47, lean: 4 }];

  const sm = L.smoothstep, prog = L.prog, lerp = L.lerp;
  const seamK = T => sm(T_SEAM[0], T_SEAM[1], T);

  /* ======================= background (shared with s6 during the overlap) ======================= */
  /** static card: lifted Rich Black / violet night + a Stamp Violet buta block-print repeat + paper tooth (gives the encoder
      something to spend bits on, so the screenshot frame never breaks into flat 16x16 blocks) */
  function cardImage() {
    return L.cached('s7-card-bg', L.W, L.H, g => {
      const bg = g.createLinearGradient(0, 0, 0, L.H);
      bg.addColorStop(0, '#261F3A'); bg.addColorStop(.45, '#201A2F'); bg.addColorStop(1, '#1E182C');
      g.fillStyle = bg; g.fillRect(0, 0, L.W, L.H);
      // buta repeat, 180 px half-drop grid, hand-stamped (uneven density, slight angle jitter)
      const tile = L.cached('s7-buta-tile', 64, 64, t => { t.translate(32, 32); t.fillStyle = VIOLET; L.butaPath(t, 46); t.fill(); t.fillStyle = 'rgba(0,0,0,1)'; t.globalCompositeOperation = 'destination-out'; L.butaPath(t, 20); t.fill(); });
      g.save();
      for (let r = 0, y = -40; y < L.H + 90; r++, y += 180) for (let c = 0, x = (r % 2) * 90 - 40; x < L.W + 90; c++, x += 180) {
        const id = r * 13 + c; g.save(); g.translate(x + L.rndRange(5, id, -3, 3), y + L.rndRange(6, id, -3, 3)); g.rotate((r % 2 ? .35 : -.35) + L.rndRange(7, id, -.06, .06));
        g.globalAlpha = .08 * (.7 + .3 * L.rnd(8, id)); g.drawImage(tile, -32, -32); g.restore();
      }
      g.restore();
      // Stamp Violet haze rising from the bottom
      const hz = g.createRadialGradient(540, 1900, 0, 540, 1900, 900); hz.addColorStop(0, L.rgba(VIOLET, .26)); hz.addColorStop(1, L.rgba(VIOLET, 0));
      g.fillStyle = hz; g.fillRect(0, 900, L.W, 1020);
      L.textureOverlay(g, 'paper', 0, 0, L.W, L.H, { alpha: .07, blend: 'multiply', scale: 1.4, seed: 9 });
      L.textureOverlay(g, 'paper', 0, 0, L.W, L.H, { alpha: .05, blend: 'screen', scale: .9, seed: 4 });
    });
  }
  /** the card background at T (alpha a). s6 calls this during 19.0–20.5 (under its fireworks); from 20.5 this scene does. */
  function background(ctx, T, a = 1) {
    if (a <= 0) return;
    const seam = seamK(T);
    ctx.save(); ctx.globalAlpha *= a; ctx.drawImage(cardImage(), 0, 0);
    if (seam > 0) { ctx.fillStyle = `rgba(16,13,22,${.35 * seam})`; ctx.fillRect(0, 0, L.W, L.H); }   // loop seam: down to the frame-0 night
    ctx.restore();
    // the lit city, receded to warm bokeh behind the balcony railing (30%)
    const bA = a * (1 - seam * .65);
    L.bokeh(ctx, T * .5, { seed: 71, count: 30, colors: ['#FFB547', '#FFC24A', '#FF9F1C', '#F59E1B'], rMin: 12, rMax: 46, alpha: .3 * bA, y: 1330, h: 590, drift: 12 });
    L.motes(ctx, T, { seed: 72, count: 18, y: 1450, h: 470, color: '#FFB547', alpha: .45 * bA, rise: 6 });
    L.glow(ctx, 540, 560, 520, '#FFB547', .075 * a * (1 - seam * .5));   // warm light behind the greeting (behind copy only)
  }

  /* ======================= the mark's glide ======================= */
  function markAt(T) {
    if (T < T_GLIDE[0]) return null;
    const g = inOutSine(prog(T, T_GLIDE[0], T_GLIDE[1]));
    return { x: lerp(MARK_FROM.x, MARK_TO.x, g), y: lerp(MARK_FROM.y, MARK_TO.y, g), w: lerp(MARK_FROM.w, MARK_TO.w, g), g };
  }

  /* ======================= toran + draped marigold swags (s1's garland) ======================= */
  function toranImage() {
    return L.cached('s7-toran', L.W, 140, g => {
      const parts = L.markParts();
      g.save(); g.beginPath(); g.rect(TOR.x0, 0, TOR.x1 - TOR.x0, 140); g.clip();
      for (let i = 0; i < 60; i++) {
        const bx = tStart + i * tStep; if (bx > TOR.x1 + 60) break;
        g.save(); g.translate(bx, 10); g.scale(ts, ts);
        g.fillStyle = PAPER; L.poly(g, parts.chevrons[0]); g.fill();
        g.fillStyle = i === TOR.redIndex ? RED : PAPER; L.poly(g, parts.pillars[0]); g.fill();
        g.restore();
      }
      g.restore();
      g.save(); g.globalCompositeOperation = 'destination-out'; g.globalAlpha = .1; g.drawImage(L.textureCanvas('ink', 512, 8), 0, -180, 1080, 500); g.restore();
    });
  }
  /** a marigold sprite with its hue jittered between Marigold #F59E1B and Diya Amber #FFB547 (orange -> yellow cross-blend) */
  function flower(g, x, y, r, hue, seed, rot, a = 1) {
    const ri = Math.round(r), hs = Math.round(hue * 3), sd = seed % 5, sz = Math.ceil(ri * 2.4);
    const c = L.cached(`s7-mg-${ri}-${hs}-${sd}`, sz, sz, gg => {
      L.marigold(gg, sz / 2, sz / 2, ri, { tone: 'orange', seed: sd });
      if (hs > 0) { gg.globalAlpha = hs / 3 * .85; L.marigold(gg, sz / 2, sz / 2, ri, { tone: 'yellow', seed: sd + 1, rot: .3 }); gg.globalAlpha = 1; }
      gg.globalCompositeOperation = 'source-atop'; gg.fillStyle = 'rgba(40,20,10,.12)'; gg.fillRect(0, 0, sz, sz);
    });
    g.save(); g.globalAlpha *= a; g.translate(x, y); g.rotate(rot); g.drawImage(c, -sz / 2, -sz / 2); g.restore();
  }
  function garland(ctx, T, half) {
    const seam = seamK(T);
    const drop = d => { if (d <= 0) return 0; const s = 1 + Math.sin(Math.min(d, 1.4) * Math.PI * 1.5) * Math.exp(-d * 4) * .2; return L.ease.outCubic(Math.min(1, d)) * s; };
    const sway = (i, k) => Math.sin(T * 1.7 + i * 1.3 + k * .5) * Math.min(2, .6 + k * .35);   // <= 2 px during the hold
    // shadows of the flowers on the wall behind are skipped: the card is night sky, the garland hangs in light
    const leaves = [], flowers = [], threads = [];
    for (let s = 0; s < ANCH.length - 1; s++) {
      const xa = ANCH[s], xb = ANCH[s + 1], mid = (xa + xb) / 2;
      if (Math.abs(mid - 540) > half + 60) continue;
      const d = (T - T_GARL - Math.abs(mid - 540) / 450 * .1) / .3, k = drop(d); if (k <= 0) continue;
      const sag = SAG * k, n = 15;
      const pt = p => [lerp(xa, xb, p), ANCH_Y + sag * 4 * p * (1 - p) + sway(s, 1) * 4 * p * (1 - p) * .5];
      threads.push(Array.from({ length: 21 }, (_, i) => pt(i / 20)));
      for (let i = 1; i < n; i++) { const p = i / n, [x, y] = pt(p); const id = s * 31 + i;
        flowers.push({ x, y, r: 8 + 3 * L.rnd(73, id), hue: L.rnd(74, id), seed: id, rot: L.rnd(75, id) * TAU, a: Math.min(1, k * 1.5) }); }
    }
    ANCH.forEach((x, s) => {
      if (Math.abs(x - 540) > half + 2) return;
      const d = (T - T_GARL - Math.abs(x - 540) / 450 * .1) / .3, k = drop(d); if (k <= 0) return;
      const n = STRAND_N[s], step = 15 * k;
      for (const sd of [-1, 1]) leaves.push({ x: x + sd * 6, y: ANCH_Y + 2, len: 18 + 3 * L.rnd(76, s * 2 + (sd > 0)), a: sd * .6 + Math.sin(T * 1.3 + s) * .04 });
      flowers.push({ x, y: ANCH_Y, r: 11, hue: L.rnd(77, s), seed: s + 40, rot: s, a: 1 });
      let last = [x, ANCH_Y];
      for (let j = 1; j <= n; j++) { const sw = sway(s, j); const fx = x + sw, fy = ANCH_Y + j * step; last = [fx, fy];
        flowers.push({ x: fx, y: fy, r: 8 + 3 * L.rnd(78, s * 7 + j), hue: L.rnd(79, s * 7 + j), seed: s * 7 + j + 60, rot: L.rnd(80, s * 7 + j) * TAU, a: Math.min(1, k * 1.5) }); }
      leaves.push({ x: last[0], y: last[1] + 7, len: 18 + 4 * L.rnd(81, s), a: Math.sin(T * 1.6 + s) * .1 });
    });
    ctx.save(); ctx.globalAlpha *= 1 - seam * .2;
    ctx.strokeStyle = 'rgba(60,40,20,.85)'; ctx.lineWidth = 1.5;
    for (const th of threads) { ctx.beginPath(); th.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); }
    for (const l of leaves) L.mangoLeaf(ctx, l.x, l.y, l.len, l.a);
    for (const f of flowers) flower(ctx, f.x, f.y, f.r, f.hue, f.seed, f.rot, f.a);
    ctx.restore();
  }

  /* ======================= the s4 Legacy-Line railing + clay diyas ======================= */
  function railShapes(g, lit) {
    const parts = L.markParts(), s = RS;
    const inkC = lit ? '#4A372F' : '#17131A', redC = lit ? RED : '#3A1418', edge = lit ? '#F4CF9E' : '#4A4446';
    g.fillStyle = lit ? '#2E221E' : '#120F14'; g.fillRect(-20, RAIL.bottom - 2, 1120, 14);                       // floor slab edge
    g.fillStyle = lit ? 'rgba(255,214,160,.45)' : 'rgba(110,104,110,.35)'; g.fillRect(-20, RAIL.bottom - 2, 1120, 2);
    for (let i = -2; i < 30; i++) {
      const bx = R_X0 + i * RSTEP; if (bx > 1100) break;
      g.save(); g.translate(bx, RAIL.mTop); g.scale(s, s);
      g.fillStyle = inkC; L.poly(g, parts.chevrons[0]); g.fill();
      g.fillStyle = i === 12 ? redC : inkC; L.poly(g, parts.pillars[0]); g.fill();
      g.restore();
      const ch = parts.chevrons[0].map(p => [bx + p[0] * s, RAIL.mTop + p[1] * s]);
      g.strokeStyle = edge; g.lineWidth = lit ? 2 : 1.5; g.globalAlpha = lit ? .7 : .45;
      g.beginPath(); g.moveTo(ch[1][0], ch[1][1] + 1); g.lineTo(ch[2][0], ch[2][1] + 1); g.lineTo(ch[3][0], ch[3][1] + 1); g.stroke(); g.globalAlpha = 1;
      if (lit && i !== 12) { // pillars catch the flames from the centre side
        const cx = bx + RPW / 2, side = cx < 540 ? 1 : -1, gr = g.createLinearGradient(bx, 0, bx + RPW, 0);
        if (side > 0) { gr.addColorStop(0, 'rgba(0,0,0,.25)'); gr.addColorStop(.7, 'rgba(255,200,140,0)'); gr.addColorStop(1, 'rgba(255,214,160,.35)'); }
        else { gr.addColorStop(0, 'rgba(255,214,160,.35)'); gr.addColorStop(.3, 'rgba(255,200,140,0)'); gr.addColorStop(1, 'rgba(0,0,0,.25)'); }
        g.fillStyle = gr; g.fillRect(bx, RAIL.mTop, RPW, RAIL.h);
      }
      if (lit) { const vg = g.createLinearGradient(0, RAIL.mTop, 0, RAIL.mTop + RAIL.h); vg.addColorStop(0, 'rgba(255,210,150,.18)'); vg.addColorStop(.5, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.35)'); g.fillStyle = vg; g.fillRect(bx, RAIL.mTop, RPW, RAIL.h); }
    }
    // cap rail (coping): flat Ink bar with a Stone top edge
    g.fillStyle = lit ? '#523C31' : '#141116'; g.fillRect(-20, RAIL.top, 1120, RAIL.cap + 1);
    g.fillStyle = lit ? '#7A5844' : '#1E1A20'; g.fillRect(-20, RAIL.top, 1120, 3);
    g.fillStyle = lit ? '#FFE6C0' : 'rgba(140,135,131,.5)'; g.fillRect(-20, RAIL.top, 1120, 1.5);
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(-20, RAIL.top + RAIL.cap, 1120, 2);
    // floor below the railing (the balcony slab, seen from above): warm-black stone, with tooth and a few seams
    const fg = g.createLinearGradient(0, RAIL.bottom + 12, 0, L.H); fg.addColorStop(0, lit ? '#2E2224' : '#211A26'); fg.addColorStop(.35, '#211A2C'); fg.addColorStop(1, '#1F192C');
    g.fillStyle = fg; g.fillRect(-20, RAIL.bottom + 12, 1120, L.H - RAIL.bottom);
    g.strokeStyle = 'rgba(0,0,0,.22)'; g.lineWidth = 2;
    for (const y of [1640, 1745, 1880]) { g.beginPath(); g.moveTo(-20, y); g.lineTo(1100, y); g.stroke(); }
    for (let k = -6; k <= 6; k++) { g.beginPath(); g.moveTo(540 + k * 150, RAIL.bottom + 12); g.lineTo(540 + k * 300, L.H); g.stroke(); }
    L.textureOverlay(g, 'paper', 0, RAIL.top - 4, L.W, L.H - RAIL.top + 4, { alpha: lit ? .2 : .25, blend: 'multiply', scale: .6, seed: 9 });
  }
  const RAIL_Y0 = RAIL.top - 4;
  const railImg = lit => L.cached('s7-rail-' + (lit ? 1 : 0), L.W, L.H - RAIL_Y0, g => { g.translate(0, -RAIL_Y0); railShapes(g, lit); });

  /* clay diya (3/4 front view, the s4 hero), cached per size and state */
  function diyaBody(g, s, lit) {
    const ry = .27 * s;
    const bowl = () => { g.beginPath(); g.moveTo(-s, 0); g.bezierCurveTo(-s * .98, s * .36, -s * .62, s * .6, -s * .28, s * .64); g.lineTo(s * .28, s * .64); g.bezierCurveTo(s * .62, s * .6, s * .98, s * .36, s, 0); g.ellipse(0, 0, s, ry, 0, 0, Math.PI, false); g.closePath(); };
    let gr = g.createLinearGradient(0, -ry, 0, s * .66);
    if (lit) { gr.addColorStop(0, '#D9733A'); gr.addColorStop(.45, '#A8481F'); gr.addColorStop(1, '#5A200E'); } else { gr.addColorStop(0, '#3A1A10'); gr.addColorStop(1, '#170A06'); }
    g.fillStyle = gr; bowl(); g.fill();
    g.fillStyle = lit ? '#6A2810' : '#140806'; g.beginPath(); g.ellipse(0, s * .64, s * .32, s * .07, 0, 0, TAU); g.fill();
    g.save(); bowl(); g.clip();
    const yb = s * .26;
    g.strokeStyle = lit ? 'rgba(242,178,62,.95)' : 'rgba(110,70,30,.6)'; g.lineWidth = Math.max(1, s * .045);
    g.beginPath(); for (let i = 0; i <= 12; i++) { const x = -s * .9 + i * s * .15, y = yb + (i % 2 ? s * .09 : 0) + Math.pow(x / s, 2) * s * .1; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
    g.fillStyle = lit ? 'rgba(238,236,232,.92)' : 'rgba(90,80,70,.5)';
    for (let i = 0; i < 9; i++) { const x = -s * .8 + i * s * .2; L.circle(g, x, yb + s * .2 + Math.pow(x / s, 2) * s * .1, s * .035); g.fill(); }
    if (lit) { const sh = g.createLinearGradient(-s, 0, s, 0); sh.addColorStop(0, 'rgba(0,0,0,.35)'); sh.addColorStop(.45, 'rgba(255,190,120,0)'); sh.addColorStop(.6, 'rgba(255,190,120,.12)'); sh.addColorStop(1, 'rgba(0,0,0,.4)'); g.fillStyle = sh; g.fillRect(-s, -ry, 2 * s, s); }
    g.restore();
    g.fillStyle = lit ? '#E08A4C' : '#3A1C12'; g.beginPath(); g.ellipse(0, 0, s, ry, 0, 0, TAU); g.fill();
    gr = g.createLinearGradient(0, -ry, 0, ry); gr.addColorStop(0, lit ? '#3A1606' : '#0E0604'); gr.addColorStop(1, lit ? '#B5701E' : '#2A1608');
    g.fillStyle = gr; g.beginPath(); g.ellipse(0, s * .02, s * .84, ry * .72, 0, 0, TAU); g.fill();
    if (lit) { g.fillStyle = 'rgba(255,236,190,.55)'; g.beginPath(); g.ellipse(-s * .05, s * .06, s * .22, ry * .16, 0, 0, TAU); g.fill(); }
    g.fillStyle = lit ? '#C86A35' : '#2E150C'; g.beginPath(); g.moveTo(-s * .2, ry * .7); g.quadraticCurveTo(0, ry * 1.75, s * .2, ry * .7); g.closePath(); g.fill();
    g.strokeStyle = lit ? '#F0E2C8' : '#4A4038'; g.lineWidth = Math.max(1.2, s * .07); g.lineCap = 'round';
    g.beginPath(); g.moveTo(-s * .05, ry * .2); g.quadraticCurveTo(-s * .01, ry * .9, 0, ry * 1.05); g.stroke();
  }
  const diyaImg = (s, lit) => L.cached(`s7-diya-${s}-${lit ? 1 : 0}`, s * 2.4 * 2, s * 1.4 * 2, g => { g.scale(2, 2); g.translate(s * 1.2, s * .45); diyaBody(g, s, lit); });
  function drawDiya(g, x, s, light) {
    const yr = RAIL.top - s * .71;
    g.fillStyle = 'rgba(0,0,0,.5)'; g.beginPath(); g.ellipse(x, RAIL.top + 1, s * .62, 3, 0, 0, TAU); g.fill();
    g.drawImage(diyaImg(s, false), x - s * 1.2, yr - s * .45, s * 2.4, s * 1.4);
    if (light > 0) { g.save(); g.globalAlpha *= Math.min(1, light); g.drawImage(diyaImg(s, true), x - s * 1.2, yr - s * .45, s * 2.4, s * 1.4); g.restore(); }
    return { x, y: yr + .27 * s * 1.05 };
  }
  /** a living flame (s4's): blue root, white-gold core that blooms, orange mantle. Own noise seed and lean (deg) per diya. */
  function flame(g, x, y, h, T, seed, I, leanDeg) {
    if (I <= 0 || h <= 0) return;
    const fl = 1 + .09 * L.snoise(T * 7.3, seed) + .05 * L.snoise(T * 17.1, seed + 1);
    const hh = h * fl * Math.min(1.3, I), w = h * .4 * (.93 + .07 * L.noise1(T * 5, seed + 2)) * Math.min(1.15, .6 + .4 * I);
    const sway = w * .3 * L.snoise(T * 2.4, seed + 3);
    const path = (bx, by, fh, fw, sw) => { const cy = by - fh * .18, r = fw * .5; g.beginPath(); g.moveTo(bx + sw, by - fh);
      g.bezierCurveTo(bx + sw * .45 + fw * .2, by - fh * .6, bx + r, by - fh * .4, bx + r, cy); g.arc(bx, cy, r, 0, Math.PI, false);
      g.bezierCurveTo(bx - r, by - fh * .4, bx + sw * .45 - fw * .2, by - fh * .6, bx + sw, by - fh); g.closePath(); };
    const a = Math.min(1, I);
    L.glow(g, x, y - hh * .42, hh * 4.2, '#FF7A1A', .28 * a);
    L.glow(g, x, y - hh * .5, hh * 1.7, '#FFCF7A', .4 * a);
    g.save(); g.translate(x, y); g.rotate(leanDeg * DEG); g.translate(-x, -y); g.globalCompositeOperation = 'lighter';
    let gr = g.createLinearGradient(x, y + hh * .05, x, y - hh);
    gr.addColorStop(0, L.rgba('#FF5A1F', .55 * I)); gr.addColorStop(.3, L.rgba('#FF8A1C', .95 * a)); gr.addColorStop(.7, L.rgba('#FFB547', .55 * a)); gr.addColorStop(1, 'rgba(255,210,122,0)');
    g.fillStyle = gr; path(x, y, hh, w, sway); g.fill();
    gr = g.createLinearGradient(x, y, x, y - hh * .66);
    gr.addColorStop(0, L.rgba('#FFFFFF', .95 * a)); gr.addColorStop(.5, L.rgba('#FFF4CF', .9 * a)); gr.addColorStop(1, 'rgba(255,231,163,0)');
    g.fillStyle = gr; path(x, y - hh * .03, hh * .64, w * .52, sway * .7); g.fill();
    g.fillStyle = L.rgba('#5A6BFF', .35 * a); g.beginPath(); g.ellipse(x, y - hh * .06, w * .3, hh * .07, 0, 0, TAU); g.fill();
    g.restore();
  }
  function railing(ctx, T, inA) {
    if (inA <= 0) return;
    const seam = seamK(T);
    const lights = DIYAS.map(d => L.prog(T, DIYA_T[d.k], DIYA_T[d.k] + .25, L.ease.outCubic) * (1 - seam * .5));
    ctx.save(); ctx.globalAlpha *= inA;
    ctx.drawImage(railImg(false), 0, RAIL_Y0);
    // the flames reveal the lit railing in soft pools (column slices, alpha from the nearest flames)
    if (lights.some(v => v > 0)) {
      const lit = railImg(true), SL = 6;
      for (let x = 0; x < L.W; x += SL) {
        let a = 0; DIYAS.forEach((d, i) => { if (lights[i] > 0) { const r = d.k === 'c' ? 300 : 190; const u = Math.abs(x + SL / 2 - d.x) / r; if (u < 1) a = 1 - (1 - a) * (1 - lights[i] * Math.pow(1 - u * u, 2) * (d.k === 'c' ? 1 : .8)); } });
        if (a > .003) { ctx.globalAlpha = inA * a; ctx.drawImage(lit, x, 0, SL, lit.height, x, RAIL_Y0, SL, lit.height); }
      }
      ctx.globalAlpha = inA;
    }
    // warm pools: on the coping top, and spilling through the railing onto the floor in front (never up into the sky)
    ctx.save(); ctx.beginPath(); ctx.rect(0, RAIL.top, L.W, L.H - RAIL.top); ctx.clip(); ctx.globalCompositeOperation = 'lighter';
    DIYAS.forEach((d, i) => { if (lights[i] <= 0) return; const big = d.k === 'c';
      ctx.save(); ctx.translate(d.x, RAIL.top + 2); ctx.scale(1, .2); const r = big ? 210 : 120;
      let pg = ctx.createRadialGradient(0, 0, 0, 0, 0, r); pg.addColorStop(0, L.rgba('#FFB547', .3 * lights[i])); pg.addColorStop(1, 'rgba(255,181,71,0)'); ctx.fillStyle = pg; ctx.fillRect(-r, -r, 2 * r, 2 * r); ctx.restore();
      ctx.save(); ctx.translate(d.x, RAIL.bottom + 40); ctx.scale(1.6, .55); const r2 = big ? 230 : 130;
      pg = ctx.createRadialGradient(0, 0, 0, 0, 0, r2); pg.addColorStop(0, L.rgba('#FF9F1C', .085 * lights[i])); pg.addColorStop(1, 'rgba(255,159,28,0)'); ctx.fillStyle = pg; ctx.fillRect(-r2, -r2, 2 * r2, 2 * r2); ctx.restore(); });
    ctx.restore();
    DIYAS.forEach((d, i) => { const wk = drawDiya(ctx, d.x, d.s, lights[i]); flame(ctx, wk.x, wk.y, d.fh, T, d.seed, lights[i], d.lean); });
    // near-field defocus over the floor: big soft discs of other balconies' diyas (keeps the bottom of the frame alive + textured)
    L.bokeh(ctx, T * .35, { seed: 74, count: 9, colors: ['#FFB547', '#FF9F1C', '#F59E1B'], rMin: 40, rMax: 90, alpha: .1 * (1 - seam * .65), y: 1600, h: 330, drift: 8 });
    ctx.restore();
  }

  /* ======================= type helpers ======================= */
  /** per-letter rise for Latin type (kerning-aware: positions from prefix widths) */
  function riseLetters(ctx, str, cx, y, T, t0, o) {
    const total = L.measure(ctx, str, o); const x0 = cx - total / 2;
    for (let i = 0; i < str.length; i++) {
      const ch = str[i]; if (ch === ' ') continue;
      const px = x0 + L.measure(ctx, str.slice(0, i), o);
      const p = L.prog(T, t0 + i / 30, t0 + i / 30 + .133, L.ease.outCubic); if (p <= 0) continue;
      L.text(ctx, ch, px, y + (1 - p) * 28, Object.assign({}, o, { align: 'left', alpha: p }));
    }
  }
  /** the seal: the film's block-print stamp, MM Red ink with Muslin knock-outs (cached, hand-stamped) */
  const inkMask = () => L.cached('s7-inkmask', 256, 256, g => {
    g.drawImage(L.textureCanvas('ink', 256, 23), 0, 0); const im = g.getImageData(0, 0, 256, 256), d = im.data;
    for (let i = 0; i < d.length; i += 4) { const v = d[i] / 255; d[i + 3] = Math.round(255 * L.clamp((v - .32) * 2.2) * .6); d[i] = d[i + 1] = d[i + 2] = 0; }
    g.putImageData(im, 0, 0);
  });
  function sealImage(ctx) {
    const W = SEAL.w + 8, H = SEAL.h + 8;
    return L.cached('s7-seal', W, H, g => {
      const ink = L.cached('s7-seal-ink', W, H, k => {
        k.translate(4, 4); k.fillStyle = RED; L.rrect(k, 0, 0, SEAL.w, SEAL.h, 6); k.fill();
        k.globalCompositeOperation = 'destination-out';
        k.strokeStyle = '#000'; k.lineWidth = 2.5; L.rrect(k, 6, 6, SEAL.w - 12, SEAL.h - 12, 3); k.stroke();
        L.text(k, 'BOOKED', SEAL.w / 2, 43, { font: 'lat', size: 39, weight: 780, tracking: 3, color: '#000' });
        L.text(k, 'आपके नाम', SEAL.w / 2, 73, { font: 'dev', size: 28, weight: 700, color: '#000' });
        // uneven ink: the wood grain of the block (luminance -> alpha mask, so the bite is patchy, not a uniform fade)
        k.drawImage(inkMask(), -30, -50, 300, 260);
        for (let i = 0; i < 120; i++) { k.globalAlpha = .35 + .4 * L.rnd(24, i); L.circle(k, L.rnd(25, i) * SEAL.w, L.rnd(26, i) * SEAL.h, .5 + 1.4 * L.rnd(27, i)); k.fill(); }
        // a lighter edge where the block did not meet the card
        k.globalAlpha = .5; const eg = k.createLinearGradient(0, 0, SEAL.w, 0); eg.addColorStop(0, 'rgba(0,0,0,0)'); eg.addColorStop(.85, 'rgba(0,0,0,0)'); eg.addColorStop(1, 'rgba(0,0,0,.6)'); k.fillStyle = eg; k.fillRect(0, 0, SEAL.w, SEAL.h);
      });
      g.globalAlpha = .3; g.drawImage(ink, 1.6, -1); g.globalAlpha = .95; g.drawImage(ink, 0, 0);   // 1-2 px misregistered second impression
    });
  }
  function seal(ctx, T) {
    const d = T - T_SEAL; if (d < -.067) return;
    // the block comes down over 2 frames (big + soft), hits on the DHA, a 1 px rebound
    const s = d < 0 ? lerp(1.32, 1.04, (d + .067) / .067) : 1 + .03 * Math.exp(-d * 30) * Math.cos(d * 60);
    const a = d < 0 ? .45 + .4 * (d + .067) / .067 : 1;
    ctx.save(); ctx.translate(SEAL.x, SEAL.y); ctx.rotate(SEAL.rot); ctx.scale(s, s); ctx.globalAlpha *= a;
    if (d < 0) { ctx.fillStyle = 'rgba(0,0,0,.35)'; L.rrect(ctx, -SEAL.w / 2 + 10, -SEAL.h / 2 + 14, SEAL.w, SEAL.h, 8); ctx.fill(); }
    ctx.drawImage(sealImage(ctx), -SEAL.w / 2 - 4, -SEAL.h / 2 - 4);
    ctx.restore();
    // ink pops on impact (2 frames)
    if (d >= 0 && d < .067) { ctx.save(); ctx.translate(SEAL.x, SEAL.y); ctx.rotate(SEAL.rot); ctx.fillStyle = L.rgba(RED, .8 * (1 - d / .067));
      for (let i = 0; i < 10; i++) { const ang = L.rnd(28, i) * TAU, rr = 125 + 30 * L.rnd(29, i); L.circle(ctx, Math.cos(ang) * rr * .95, Math.sin(ang) * rr * .42, 1.2 + 1.6 * L.rnd(30, i)); ctx.fill(); }
      ctx.restore(); }
  }

  /** feathered boxes s6 cuts out of its fireworks (type, lockup, the gliding mark's clear space), with their strength */
  function maskBoxes(T) {
    const out = [];
    const m = markAt(T);
    if (m && m.g < 1) { const h = m.w * 100 / 110, cs = m.w * 17.5 / 110; out.push({ x0: m.x - m.w / 2 - cs, x1: m.x + m.w / 2 + cs, y0: m.y - h / 2 - cs, y1: m.y + h / 2 + cs, a: 1 }); }
    const vis = (t0, dur = .2) => L.clamp((T - t0) / dur + .5);
    out.push({ x0: 130, x1: 950, y0: 420, y1: 552, a: vis(T_HAPPY) });
    out.push({ x0: 250, x1: 830, y0: 560, y1: 700, a: vis(T_SHUBH) });
    out.push({ x0: 130, x1: 985, y0: 725, y1: 825, a: vis(T_SIGN[0]) });
    out.push({ x0: 120, x1: 960, y0: 862, y1: 1020, a: vis(T_LABEL) });
    if (T >= T_GLIDE[1] - .1) out.push({ x0: 230, x1: 850, y0: 1120, y1: 1310, a: 1 });   // MEDIA PARTNER + lockup clear space
    return out.filter(b => b.a > 0);
  }
  MM.S7 = { background, markAt, maskBoxes, T_GLIDE };

  MM.scene(ID, {
    draw(ctx, t, { T }) {
      const seam = seamK(T);
      // ---------------- background: from 20.5 this scene paints it (before that s6 paints it under its fireworks)
      if (T >= 20.5) background(ctx, T, 1);
      const cardIn = sm(19.0, 19.5, T);

      // ---------------- the s4 Legacy-Line railing (dark; the diyas light on the sonic-logo notes and reveal it)
      railing(ctx, T, cardIn);

      // ---------------- toran: unfurls out from the red pillar
      const unf = L.prog(T, T_TORAN[0], T_TORAN[1], L.ease.outCubic);
      if (unf > 0) {
        const half = 470 * unf;
        ctx.save(); ctx.beginPath(); ctx.rect(540 - half, TOR.yTop - 20, half * 2, 140); ctx.clip();
        ctx.globalAlpha = .95 * (1 - seam * .25); ctx.drawImage(toranImage(), 0, TOR.yTop - 10);
        ctx.restore();
        garland(ctx, T, half);
      }

      // ---------------- greeting
      riseLetters(ctx, 'Happy Diwali', 540, HAPPY.y, T, T_HAPPY, HAPPY.o);
      { const lay = L.layoutWords(ctx, 'शुभ दीपावली', 540, SHUBH.o);
        lay.forEach((w, i) => { const p = L.prog(T, T_SHUBH + i * .1, T_SHUBH + .2 + i * .1, L.ease.outCubic); if (p > 0) L.text(ctx, w.word, w.cx, SHUBH.y + (1 - p) * 24, Object.assign({}, SHUBH.o, { alpha: p })); }); }

      // phuljhadi spark racing under "Happy Diwali" (22.000–22.400), embers fading by 22.700
      if (T >= 22.0 && T < 22.75) {
        const pr = L.prog(T, 22.0, 22.4, L.ease.inOutQuad); const hx = lerp(175, 905, pr);
        if (T < 22.42) L.sparkler(ctx, hx, 560, T, 77, { radius: 46, count: 22, intensity: 1 });
        for (let k = 0; k < 40; k++) { const u = k / 40; const ex = lerp(175, 905, u); const born = 22.0 + .4 * u; if (ex > hx || T < born) continue;
          const age = T - born; const a = Math.max(0, 1 - age / .4); if (a <= 0) continue; const ey = 560 + age * 40 + Math.sin(k * 3.1) * 3;
          ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = L.rgba(k % 3 ? '#FFC24A' : '#FFF4CF', a * .9); L.circle(ctx, ex, ey, 2.2 * a + .5); ctx.fill(); ctx.restore(); }
      }

      // ---------------- the seal, then the sender's signature written across its edge (stamp + sign, like any office in India)
      seal(ctx, T);
      { const w = L.measure(ctx, SIGN.str, SIGN.o); const p = L.prog(T, T_SIGN[0], T_SIGN[1], inOutSine);
        if (p > 0) { ctx.save(); ctx.beginPath(); ctx.rect(SIGN.cx - w / 2 - 10, 730, (w + 20) * p, 90); ctx.clip(); L.text(ctx, SIGN.str, SIGN.cx, SIGN.y, SIGN.o); ctx.restore();
          if (p < 1) { const nx = SIGN.cx - w / 2 + w * p; L.glow(ctx, nx, 775, 26, '#FFC24A', .5); } } }

      // ---------------- forward label: the invitation (Paper, outweighs the credit block)
      { const p = L.prog(T, T_LABEL, T_LABEL + .2, L.ease.outCubic);
        if (p > 0) { const { a, b } = LABEL, s1 = 'Forward the light', s2 = 'रोशनी आगे बढ़ाइए', dot = '  ·  ';
          const w1 = L.measure(ctx, s1, a), wd = L.measure(ctx, dot, a), w2 = L.measure(ctx, s2, b); const x = 540 - (w1 + wd + w2) / 2; const y = LABEL.y + (1 - p) * 16;
          L.text(ctx, s1, x, y, Object.assign({}, a, { align: 'left', alpha: p })); L.text(ctx, dot, x + w1, y, Object.assign({}, a, { align: 'left', alpha: p * .7 })); L.text(ctx, s2, x + w1 + wd, y, Object.assign({}, b, { align: 'left', alpha: p })); } }

      // ---------------- the ticker: typed in place (left edge fixed per name), frame-quantised so every sub-frame agrees
      { const o = TICK.o, Q = Tq(T), F = fr(T);
        for (const [name, tin, tout] of NAMES) {
          const f0 = Math.round(tin * 30), f1 = Math.round(tout * 30); if (F < f0 || F >= f1) continue;
          const last = name === 'Sabko!';
          let n = Math.min(name.length, 2 * (F - f0 + 1));                                        // 60 chars/s
          if (!last && F >= f1 - 2) n = Math.floor(name.length * (f1 - F) / 3);                  // 2-frame backspace
          const shown = name.slice(0, n); const full = L.measure(ctx, name, o), left = 540 - full / 2;
          let sc = 1; if (last) { const b = L.prog(Q, T_SABKO, T_DONE); sc = b < 1 ? lerp(1.15, 1, L.ease.outBack(b)) : 1; }
          if (shown) { ctx.save(); ctx.translate(540, TICK.y - 22); ctx.scale(sc, sc); L.text(ctx, shown, left - 540, 22, Object.assign({}, o, { align: 'left' })); ctx.restore(); }
          const typing = n < name.length && !(F >= f1 - 2);
          const caretOn = last ? Q < T_DONE : (typing || Math.floor(Q * 6) % 2 === 0);
          if (caretOn) { const w = shown ? L.measure(ctx, shown, o) : 0; ctx.fillStyle = RED; ctx.fillRect(540 + (left - 540 + w) * sc + 8, TICK.y - 52, 3, 62); }
        } }

      // ---------------- credit + lockup + tagline
      L.text(ctx, 'MEDIA PARTNER', 540, 1150, { font: 'lat', size: 30, weight: 600, color: STONE, tracking: 6, alpha: L.prog(T, T_MEDIA, T_MEDIA + .2), maxWidth: 600 });
      const m = markAt(T);
      if (m && m.g < 1) {
        // the mark glides + scales uniformly from the s6 climax into its lockup slot (drawn without motion blur: samples 1)
        L.drawLogo(ctx, 'mark', { x: m.x, y: m.y, w: m.w, way: 'reverse' });
      } else if (m) {
        L.drawLogo(ctx, 'bilingual', { x: LOCK.x, y: LOCK.y, w: LOCK.w, way: 'reverse', roles: ['ink', 'pillar'] });
        const wipe = L.prog(T, T_WORDS[0], T_WORDS[1], L.ease.outCubic);
        if (wipe > 0) { const markRight = 260 + MARK_TO.w; ctx.save(); ctx.beginPath(); ctx.rect(markRight, 1170, (820 - markRight + 4) * wipe, 150); ctx.clip();
          L.drawLogo(ctx, 'bilingual', { x: LOCK.x, y: LOCK.y, w: LOCK.w, way: 'reverse', roles: ['word'] }); ctx.restore(); }
      }
      L.text(ctx, 'Trust, made visible.', 540, 1395, { font: 'lat', size: 30, weight: 600, color: MIST, alpha: .8 * L.prog(T, T_TAG, T_TAG + .2), maxWidth: 820 });
    }
  });
})();
