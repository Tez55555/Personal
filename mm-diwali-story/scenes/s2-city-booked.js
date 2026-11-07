/* ==========================================================================
   s2-whole-city-booked (2.5–5.2 s)
   Continues s1's camera in the same world (MMH.world from s1-hook.js): the pull-back settles
   on a wide Lucknow night city whose MM boards get stamped BOOKED one cascade per beat,
   the LED flips to a pixel BOOKED, everything pulses on beat 7, then a whip-pan right into s3.
   This file adds the five city boards (as depth-layer members of the shared world) and the headline.
   Rendering (incl. the in-scene temporal supersampling of the pull-back and the whip) is H.render in s1-hook.js.
   ========================================================================== */
(function () {
  'use strict';
  const L = window.L, Ez = L.ease, H = window.MMH;
  const HERE = L.EN ? 'Advertise here' : 'जगह खाली है', HF = L.EN ? 'lat' : 'dev';   // language cut
  const clamp = L.clamp, lerp = L.lerp, rnd = L.rnd, q = L.q;
  const C = H.C, TM = H.TM, U = H.util, DEG = U.DEG;
  const H2_D = H.H2_D;

  /* ---------------------------------------------------------------- board faces */
  // layout: 'land' (centred copy), 'port' (portrait wrap), 'split' (copy in the right 56%, a dashed "your ad here" box on
  // the left where the stamp lands: G1's wide, short face)
  function faceCanvas(id, w, h, layout) {
    const S = 3;  // supersampled: boards are seen up to ~2.3x during the pull-back
    return L.cached('mmh-bf2-' + id, w * S, h * S, g => {
      g.scale(S, S);
      g.fillStyle = C.muslin; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(43,39,40,.45)'; g.lineWidth = 1.2; g.strokeRect(w * .03, h * .05, w * .94, h * .9);
      if (layout === 'port') {
        L.text(g, 'SPACE', w / 2, h * .2, { font: 'lat', size: w * .19, weight: 760, color: C.ink, maxWidth: w * .86 });
        L.text(g, 'AVAILABLE', w / 2, h * .3, { font: 'lat', size: w * .19, weight: 760, color: C.ink, maxWidth: w * .86 });
        L.text(g, HERE, w / 2, h * .43, { font: HF, size: w * .13, weight: 700, color: C.stone, maxWidth: w * .8 });
      } else if (layout === 'split') {
        const big = Math.min(h * .25, w * .055), cx = w * .7;
        L.text(g, 'SPACE AVAILABLE', cx, h * .5, { font: 'lat', size: big, weight: 760, color: C.ink, maxWidth: w * .5 });
        L.text(g, HERE, cx, h * .5 + big * 1.25, { font: HF, size: big * .9, weight: 700, color: C.stone, maxWidth: w * .4 });
        g.save(); g.strokeStyle = 'rgba(140,135,131,.7)'; g.lineWidth = 1.4; g.setLineDash([5, 3.5]);
        g.strokeRect(w * .05, h * .17, w * .36, h * .66); g.restore();
        L.text(g, 'YOUR AD HERE', w * .23, h * .53, { font: 'lat', size: h * .1, weight: 600, color: 'rgba(140,135,131,.75)', maxWidth: w * .3, tracking: 1 });
      } else if (layout === 'top') {                                                    // one line up top; the lower 60% is where the stamp lands
        L.text(g, 'SPACE AVAILABLE', w / 2, h * .3, { font: 'lat', size: Math.min(h * .2, w * .088), weight: 760, color: C.ink, maxWidth: w * .86 });
      } else if (layout === 'high') {                                                   // copy set high so the stamp clears the Hindi line
        const big = Math.min(h * .25, w * .085), y1 = h * .1 + big;
        L.text(g, 'SPACE AVAILABLE', w / 2, y1, { font: 'lat', size: big, weight: 760, color: C.ink, maxWidth: w * .84 });
        L.text(g, HERE, w / 2, y1 + big * 1.08, { font: HF, size: big * .82, weight: 700, color: C.stone, maxWidth: w * .6 });
      } else {
        const big = Math.min(h * .25, w * .085), y1 = h * .2 + big;
        L.text(g, 'SPACE AVAILABLE', w / 2, y1, { font: 'lat', size: big, weight: 760, color: C.ink, maxWidth: w * .84 });
        L.text(g, HERE, w / 2, y1 + big * 1.12, { font: HF, size: big * .86, weight: 700, color: C.stone, maxWidth: w * .6 });
      }
      L.textureOverlay(g, 'paper', 0, 0, w, h, { alpha: .14, blend: 'multiply', scale: .35, seed: 5 });
      for (let i = 0; i < 9; i++) { const x = rnd(950, i + id.length * 9) * w; const gr = g.createLinearGradient(0, 0, 0, h * .7); gr.addColorStop(0, 'rgba(96,78,62,.10)'); gr.addColorStop(1, 'rgba(96,78,62,0)'); g.fillStyle = gr; g.fillRect(x, 0, 1.2, h * .7); }
    });
  }
  const beatPulse = T => Math.exp(-Math.pow((T - TM.b7 - .05) / .055, 2));
  /** lit board face. top/bot: multiply levels (0-255) that rank the boards' values (H2 brightest after the hook);
      kickAt: the stamp-impact frame (2-frame +30% face kick) */
  function litFace(g, img, x, y, w, h, T, blur, fog, top, bot, kickAt) {
    U.setBlur(g, blur);
    g.drawImage(img, x, y, w, h);
    g.filter = 'none';
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    g.globalCompositeOperation = 'multiply';
    const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, `rgb(${top},${top - 2},${top + 4})`); gr.addColorStop(1, `rgb(${bot},${bot - 6},${bot + 10})`);
    g.fillStyle = gr; g.fillRect(x, y, w, h);
    g.globalCompositeOperation = 'lighter';
    const p = beatPulse(T); if (p > .01) { g.globalAlpha = .25 * p; g.drawImage(img, x, y, w, h); g.globalAlpha = 1; }   // beat 7: +25%
    if (kickAt != null) { const f = U.FR(T) - U.FR(kickAt); if (f === 0 || f === 1) { g.globalAlpha = f ? .15 : .3; g.drawImage(img, x, y, w, h); g.globalAlpha = 1; } }
    if (fog) { g.globalCompositeOperation = 'source-over'; g.fillStyle = `rgba(38,32,58,${fog})`; g.fillRect(x, y, w, h); }
    g.restore();
  }
  function frameRect(g, x, y, w, h, t, blur) {
    U.setBlur(g, blur || 0);
    g.fillStyle = '#161314'; g.fillRect(x - t, y - t, w + 2 * t, t); g.fillRect(x - t, y + h, w + 2 * t, t); g.fillRect(x - t, y, t, h); g.fillRect(x + w, y, t, h);
    g.fillStyle = 'rgba(140,135,131,.7)'; g.fillRect(x - t, y - t, w + 2 * t, 1.5);
    g.filter = 'none';
  }
  /** gooseneck tubelights along the top edge: arm, a visible cool cone down the face, a pool on the face's top */
  function lampsOn(g, x, y, w, h, n, k, blur, a = 1) {
    for (let i = 0; i < n; i++) {
      const lx = x + w * (i + .5) / n;
      U.setBlur(g, blur); g.strokeStyle = '#121012'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(lx - 8, y); g.quadraticCurveTo(lx - 8, y - 14, lx, y - 12); g.stroke(); g.filter = 'none';
      g.save(); g.globalCompositeOperation = 'lighter';
      const cg = g.createLinearGradient(0, y - 10, 0, y + h * .8); cg.addColorStop(0, `rgba(244,246,255,${.17 * a})`); cg.addColorStop(1, 'rgba(244,246,255,0)');
      g.fillStyle = cg; g.beginPath(); g.moveTo(lx - 5, y - 9); g.lineTo(lx + 5, y - 9); g.lineTo(lx + w / n * .62, y + h * .8); g.lineTo(lx - w / n * .62, y + h * .8); g.closePath(); g.fill();
      g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); U.put(g, U.softSpr('#F4F6FF'), lx, y + 4, w / n * .55, .13 * a); g.restore();
      U.lamp(g, lx, y - 10, 2.2, '#F4F6FF', .95, k, blur);
      g.restore();
    }
  }
  // media-owner plates. Only the hook board (H1, in s1) carries the full mark + wordmark plate and the gantry G1 a
  // mark-only plate (h 14): the rest are the network's plain Ink plates with a Stone site number, so the wide frame
  // reads as one owner's real sites, not a logo wall.
  const PW = 108, PH = 28;
  const plateImg = code => L.cached('mmh-plate-site-' + code, PW * 4, PH * 4, g => {
    g.scale(4, 4); g.fillStyle = C.ink; g.fillRect(0, 0, PW, PH); g.fillStyle = 'rgba(140,135,131,.6)'; g.fillRect(0, 0, PW, 1.2);
    g.fillStyle = 'rgba(140,135,131,.75)'; for (const bx of [4.5, PW - 4.5]) { L.circle(g, bx, PH / 2, 1.3); g.fill(); }   // rivets
    L.text(g, code, PW / 2, PH / 2 + 3.2, { font: 'lat', size: 8.5, weight: 600, color: L.rgba(C.stone, .85), maxWidth: PW - 20, tracking: 1.2 });
  });
  function plate(g, x, y, blur, code) {   // plain site plate (decorative at this scale)
    U.setBlur(g, blur || 0); g.drawImage(plateImg(code), x, y, PW, PH); g.filter = 'none';
  }
  const MK_H = 14, MK_W = MK_H * L.logoSize('mark').w / L.logoSize('mark').h, MPW = Math.round(MK_W + 11), MPH = MK_H + 10;
  const markPlateImg = () => L.cached('mmh-plate-mark', MPW * 4, MPH * 4, g => {
    g.scale(4, 4); g.fillStyle = C.ink; g.fillRect(0, 0, MPW, MPH); g.fillStyle = 'rgba(140,135,131,.6)'; g.fillRect(0, 0, MPW, 1.2);
    L.drawLogo(g, 'mark', { x: MPW / 2, y: MPH / 2 + .4, h: MK_H, anchor: 'center', way: 'reverse' });
  });
  function markPlate(g, x, y, blur) { U.setBlur(g, blur || 0); g.drawImage(markPlateImg(), x, y, MPW, MPH); g.filter = 'none'; }
  /** mini stamp: the same rubber-stamp prop as the hook (U.stamp3D), scaled. Before `at`: it slams in (apparent scale
      1.3 -> 1 in .1 s, as the hook stamp; leaning on its knob -> flat, real perspective about the camera's optical centre). From `at`: the
      dense impression (clipped to the face), 16 violet specks and a violet ring racing out from the stamp's edge; the
      block holds 2 frames, then is lifted off over 3 frames (up, toward the lens, tipping back, fading), revealing the ink.
      sw = stamp width in layer px (BOOKED cap = .114 sw). */
  const MS_HOLD = 2 / 30, MS_LIFT = 3 / 30;
  function miniStamp(g, face, cx, cy, sw, rotDeg, at, T, d, k) {
    const sc = sw / 700;
    if (T < at - .1) return;
    const tau = T - at;
    if (tau >= 0) {
      g.save(); g.beginPath(); g.rect(face[0], face[1], face[2], face[3]); g.clip();
      g.translate(cx, cy); g.rotate(rotDeg * DEG); g.scale(sc, sc);
      H.drawImpression(g, tau, 16, .55 / sc * .22);
      g.restore();
      if (tau < .15) {                                                                 // the hit, readable even under blur
        const u = tau / .15, r = 70 * Ez.outQuad(u) / k, a = .5 * (1 - u);
        g.save(); g.translate(cx, cy); g.rotate(rotDeg * DEG);
        g.strokeStyle = L.rgba(C.violet, a); g.lineWidth = 3.2 / k;
        L.rrect(g, -350 * sc - r, -125 * sc - r, 700 * sc + 2 * r, 250 * sc + 2 * r, r * .6); g.stroke();
        g.restore();
      }
    }
    // the block: screen-space keys (apparent scale s, lean, offset), then placed in 3D about the optical centre
    if (tau >= MS_HOLD + MS_LIFT) return;
    let s, tilt, ox, oy, alpha;
    if (tau < 0) { const w = clamp((tau + .1) / .1), e = w * w * w; s = lerp(1.3, 1, e); tilt = lerp(34, 0, e); ox = 34 * sc / .25 * (1 - e); oy = -22 * sc / .25 * (1 - e); alpha = clamp(.6 + w * 2); }
    else if (tau < MS_HOLD) { s = 1; tilt = 0; ox = oy = 0; alpha = 1; }
    else { const w = clamp((tau - MS_HOLD) / MS_LIFT), e = w * w; s = lerp(1, 1.3, e); tilt = 30 * e; ox = 40 * sc / .25 * e; oy = -130 * sc / .25 * e; alpha = 1 - L.smoothstep(.3, 1, w); }
    if (alpha <= .01) return;
    const cm = H.cam(T), vx = 540 - cm.ex / d, vy = 960 - cm.ey / d, Dl = 1800 * sc;
    const sx = cx + ox, sy = cy + oy;
    U.stamp3D(g, { cx: vx + (sx - vx) / s, cy: vy + (sy - vy) / s, Z: Dl * (1 - 1 / s), u: sc, rot: rotDeg * DEG, tilt: tilt * DEG, tdir: -38 * DEG, D: Dl, vx, vy, alpha, discs: 12 });
  }

  /* ---------------------------------------------------------------- the five city boards */
  // U1 unipole (mid layer)
  const U1 = [110, 770, 220, 130];
  H.boards.push({ d: 2, bbox: [94, 738, 346, 1006], draw(g, T, k, blur) {
    const [x, y, w, h] = U1;
    U.setBlur(g, blur);
    g.fillStyle = '#151214'; g.fillRect(x + w / 2 - 7, y + h, 14, 1002 - y - h); g.fillStyle = 'rgba(140,135,131,.35)'; g.fillRect(x + w / 2 - 7, y + h, 1.5, 1002 - y - h);
    g.fillStyle = '#131012'; g.fillRect(x - 6, y + h + 4, w + 12, 5);
    frameRect(g, x, y, w, h, 4, blur);
    litFace(g, faceCanvas('U1b', w, h, 'top'), x, y, w, h, T, blur, .04, 214, 160, TM.b5);
    miniStamp(g, U1, x + w * .52, y + h * .66, 166, -10, TM.b5, T, 2, k);
    lampsOn(g, x, y, w, h, 2, k, blur, .9);
    plate(g, x + w - PW, y + h + 12, blur, 'LKO · 0127');
  } });
  // W1 building wrap (mid layer, on the tall tower x 830–1040), lit from below by two floods
  const W1 = [838, 682, 168, 256];
  H.boards.push({ d: 2, bbox: [780, 668, 1050, 1000], draw(g, T, k, blur) {
    const [x, y, w, h] = W1;
    litFace(g, faceCanvas('W1b', w, h, 'port'), x, y, w, h, T, blur, .04, 176, 214, TM.b5);
    g.fillStyle = 'rgba(30,24,22,.6)'; for (let i = 0; i < 8; i++) { L.circle(g, x + 6 + i * (w - 12) / 7, y + 4, 1.4); g.fill(); L.circle(g, x + 6 + i * (w - 12) / 7, y + h - 4, 1.4); g.fill(); }
    miniStamp(g, W1, x + w / 2, y + h * .7, 168, -12, TM.b5, T, 2, k);
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const lx of [x + 32, x + w - 32]) { const cg = g.createLinearGradient(0, y + h + 10, 0, y + 60); cg.addColorStop(0, 'rgba(255,236,206,.16)'); cg.addColorStop(1, 'rgba(255,236,206,0)'); g.fillStyle = cg; g.beginPath(); g.moveTo(lx - 5, y + h + 10); g.lineTo(lx + 5, y + h + 10); g.lineTo(lx + 66, y + 60); g.lineTo(lx - 66, y + 60); g.closePath(); g.fill(); U.lamp(g, lx, y + h + 12, 2, '#FFE9C8', .9, k, blur); }
    g.restore();
    plate(g, x + w - PW - 12, y + h + 10, blur, 'LKO · 0309');
  } });
  // L1 rooftop LED screen (mid layer): test pattern in palette light colours -> 2-frame glitch -> pixel BOOKED
  const PIX = { B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'], O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
    K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'], E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'], D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'] };
  let L1C = null;
  function L1buf() { if (!L1C) { L1C = document.createElement('canvas'); L1C.width = 126 * 3; L1C.height = 82 * 3; } const c = L1C.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.filter = 'none'; c.clearRect(0, 0, L1C.width, L1C.height); return c; }
  // bars: Paper, Gold, Amber, Mist, Stone, Stamp Violet, Ink (no red, no magenta); PLUGE strip below
  const BARS = ['#F4F2EE', '#FFC24A', '#FF9F1C', '#C9C4BF', '#8C8783', '#3F3593', '#2B2728'];
  const PLUGE = ['#2B2728', '#F4F2EE', '#1C1A1A', '#0E0C0D', '#232021', '#3F3593'];
  /** the two static screen states, pre-rendered at 3x (test pattern / pixel BOOKED) */
  const L1art = kind => L.cached('mmh-l1-' + kind, 126 * 3, 82 * 3, g => {
    const x = 0, y = 0, w = 126, h = 82; g.scale(3, 3);
    if (kind === 'bars') {
      BARS.forEach((c, i) => { g.fillStyle = L.mix(c, '#000000', .12); g.fillRect(x + i * w / 7, y, w / 7 + .5, h * .68); });
      for (let i = 0; i < 6; i++) { g.fillStyle = L.mix(PLUGE[i], '#000000', .1); g.fillRect(x + i * w / 6, y + h * .68, w / 6 + .5, h * .32); }
      g.fillStyle = 'rgba(244,242,238,.8)'; g.fillRect(x + w * .5 - .6, y + h * .68, 1.2, h * .32);
      return;
    }
    g.fillStyle = '#0D0B0C'; g.fillRect(0, 0, w, h);
    const word = 'BOOKED', pitch = 3.35, cols = 35, x0 = x + (w - cols * pitch) / 2, y0 = y + (h - 7 * pitch) / 2 - 4;
    g.fillStyle = 'rgba(244,242,238,.07)';
    for (let r = -3; r < 13; r++) for (let c = -4; c < 39; c++) { L.circle(g, x0 + c * pitch + pitch / 2, y0 + r * pitch + pitch / 2, pitch * .28); g.fill(); }
    g.fillStyle = C.paper;
    for (let li = 0; li < 6; li++) { const gl = PIX[word[li]]; for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) if (gl[r][c] === '1') { L.circle(g, x0 + (li * 6 + c) * pitch + pitch / 2, y0 + r * pitch + pitch / 2, pitch * .42); g.fill(); } }
    g.fillStyle = 'rgba(244,242,238,.75)'; g.fillRect(x0, y0 + 8.4 * pitch, cols * pitch, 1.4);
    L.text(g, 'FOR YOU · DIWALI', x + w / 2, y0 + 11.2 * pitch, { font: 'lat', size: 7.5, weight: 650, color: C.paper, maxWidth: w * .8, tracking: .8 });
  });
  H.boards.push({ d: 2, bbox: [578, 600, 950, 872], draw(g, T, k, blur) {
    const x = 700, y = 724, w = 126, h = 82, roof = 862;
    U.setBlur(g, blur);
    g.fillStyle = C.steel; for (const lx of [x + 18, x + w - 26]) g.fillRect(lx, y + h, 8, roof - y - h);
    g.strokeStyle = C.steel; g.lineWidth = 3; g.beginPath(); g.moveTo(x + 22, y + h + 6); g.lineTo(x + w - 22, roof - 4); g.moveTo(x + w - 22, y + h + 6); g.lineTo(x + 22, roof - 4); g.stroke();
    g.filter = 'none';
    frameRect(g, x, y, w, h, 5, blur);
    const outer = g; g = L1buf(); const SS = 3; g.save(); g.scale(SS, SS); g.translate(-x, -y);
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    g.fillStyle = '#0D0B0C'; g.fillRect(x, y, w, h);
    const f = U.FR(T), fl = U.FR(TM.b6), pulse = 1 + .3 * beatPulse(T);
    const boot = clamp((T - 2.42) / .2);
    if (boot < 1) {
      const by = y + h * boot;
      g.save(); g.beginPath(); g.rect(x, y, w, Math.max(0, by - y)); g.clip();
    }
    if (f < fl) g.drawImage(L1art('bars'), x, y, w, h);
    else if (f < fl + 2) {
      for (let s = 0; s < 9; s++) { const sy = y + s * h / 9, off = (rnd(961, f * 20 + s) - .5) * 60; g.fillStyle = L.mix(BARS[(s + f) % 7], '#000000', .1 + rnd(962, f * 20 + s) * .5); g.fillRect(x + off, sy, w, h / 9 + .5); }
      g.fillStyle = 'rgba(244,242,238,.5)'; for (let i = 0; i < 40; i++) g.fillRect(x + rnd(963, f * 100 + i) * w, y + rnd(964, f * 100 + i) * h, 3, 1.4);
    } else g.drawImage(L1art('booked'), x, y, w, h);
    if (boot < 1) { g.restore(); if (boot > 0) { g.fillStyle = 'rgba(244,242,238,.7)'; g.fillRect(x, y + h * boot - 1, w, 2); } }
    // dot-pitch + scanline overlay
    g.fillStyle = 'rgba(0,0,0,.22)'; for (let yy = y; yy < y + h; yy += 2.2) g.fillRect(x, yy, w, .8);
    g.restore(); g.restore();
    const buf = g.canvas; g = outer;
    U.setBlur(g, blur); g.drawImage(buf, x, y, w, h); g.filter = 'none';
    g.save(); g.globalCompositeOperation = 'lighter';
    U.put(g, U.softSpr(f < fl ? '#E8DCC0' : '#FFF1DC'), x + w / 2, y + h / 2, 110, .1 * pulse * boot);
    if (f >= fl && f < fl + 2) U.put(g, U.softSpr('#FFFFFF'), x + w / 2, y + h / 2, 90, .25);
    g.restore();
    plate(g, x + w - PW, y + h + 8, blur, 'LKO · 0221');
  } });
  // H2 rooftop hoarding (d 1.6; its trusses and building live in the h2 block cache): the brightest board after the hook
  const H2F = [500, 1000, 300, 176];
  H.boards.push({ d: H2_D, bbox: [470, 950, 830, 1240], draw(g, T, k, blur) {
    const [x, y, w, h] = H2F;
    U.setBlur(g, blur); g.fillStyle = '#131012'; g.fillRect(x - 8, y + h + 6, w + 16, 6); g.filter = 'none';
    frameRect(g, x, y, w, h, 5, blur);
    litFace(g, faceCanvas('H2c', w, h, 'high'), x, y, w, h, T, blur, 0, 246, 200, TM.b4);
    miniStamp(g, H2F, x + w * .53, y + h * .71, 188, -7, TM.b4, T, H2_D, k);
    lampsOn(g, x, y, w, h, 3, k, blur, 1);
    plate(g, x + w - PW - 4, y + h + 16, blur, 'LKO · 0412');
  } });
  // G1 gantry over the flyover (d .8): a wide, short face laid out in two columns; the stamp lands in the left box,
  // which is the part already in frame on the beat-4 downbeat
  const G1F = [330, 1398, 420, 92];
  H.boards.push({ d: H.FLY_D, bbox: [308, 1366, 772, 1528], draw(g, T, k, blur) {
    const [x, y, w, h] = G1F, deck = 1516;
    U.setBlur(g, blur);
    g.fillStyle = C.steel; for (const px of [x + 12, x + w - 22]) { g.fillRect(px, y + h, 10, deck - y - h); }
    // lattice beam on top: a run of V-chevrons
    g.fillStyle = '#161314'; g.fillRect(x - 16, y - 18, w + 32, 4); g.fillRect(x - 16, y - 6, w + 32, 4);
    g.strokeStyle = '#161314'; g.lineWidth = 2.4; g.beginPath(); for (let bx = x - 14; bx < x + w + 14; bx += 16) { g.moveTo(bx, y - 15); g.lineTo(bx + 8, y - 4); g.lineTo(bx + 16, y - 15); } g.stroke();
    g.fillStyle = 'rgba(140,135,131,.55)'; g.fillRect(x - 16, y - 18, w + 32, 1.2);
    g.filter = 'none';
    frameRect(g, x, y, w, h, 4, blur);
    litFace(g, faceCanvas('G1b', w, h, 'split'), x, y, w, h, T, blur, 0, 222, 172, TM.b4);
    miniStamp(g, G1F, x + w * .23, y + h * .52, 168, -9, TM.b4, T, H.FLY_D, k);
    lampsOn(g, x, y - 18, w, h + 18, 3, k, blur, .85);
    markPlate(g, x + 8, y + h + 4, blur);
  } });

  /* ---------------------------------------------------------------- beat-7 glints along the parapets
     Round white cores (they bloom) in a gold glow sprite + a 1-frame horizontal streak; 2-frame attack, exponential
     decay (tau .12 s); stagger <= .085 s so every glint peaks 4.633-4.72 and is gone before the whip (4.93). */
  const GLINTS = (() => {
    const a = []; const runs = [[420, 570, 1032, 2.01], [0, 140, 1042, 2.01], [140, 350, 1000, 2.01], [690, 830, 862, 2.01], [480, 1080, 1255, H2_D + .01], [830, 1040, 662, 2.01], [560, 690, 985, 2.01]];
    for (let i = 0; i < 30; i++) { const r = runs[i % runs.length]; a.push({ x: lerp(r[0], r[1], rnd(971, i)), y: r[2] - 4 - rnd(972, i) * 12, d: r[3], dl: Math.round(rnd(973, i) * 2.55) / 30, s: .8 + rnd(974, i) * .5 }); }
    return a;
  })();
  const G_T0 = q(TM.b7 - 1 / 30), G_END = q(4.93);
  function glintEnv(T, dl) {
    const t = T - G_T0 - dl; if (t < 0) return 0;
    const atk = 2 / 30; const e = t < atk ? t / atk : Math.exp(-(t - atk) / .12);
    return e * (1 - L.smoothstep(G_END - .1, G_END, T));
  }
  for (const d of [2.01, H2_D + .01]) H.boards.push({ d, draw(g, T, k) {
    if (T < G_T0 || T > G_END) return;
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const p of GLINTS) {
      if (p.d !== d) continue;
      const e = glintEnv(T, p.dl); if (e < .01) continue;
      U.put(g, U.glowSpr('#FFC24A'), p.x, p.y, (34 + 12 * p.s) / k * (.75 + .25 * e), e);
      U.put(g, U.glowSpr('#FFE7A3'), p.x, p.y, 14 / k, e);
      g.globalAlpha = e; g.fillStyle = '#FFFFFF'; L.circle(g, p.x, p.y, 2.6 * p.s / k); g.fill();
      if (U.FR(T) === U.FR(G_T0 + p.dl + 2 / 30)) { g.globalAlpha = .35; g.fillRect(p.x - 20 / k, p.y - 1 / k, 40 / k, 2 / k); }   // 1-frame streak at the peak
    }
    g.restore();
  } });

  /* ---------------------------------------------------------------- headline */
  const HL = { l1: q(2.8), l2: q(2.8333), sub: q(2.8667), out0: q(4.9667), out1: q(5.2) };
  // locked in screen space until one frame after the camera starts whipping, then it leaves with easeInCubic
  H.headOff = T => -1400 * Ez.inCubic(clamp((T - HL.out0) / (HL.out1 - HL.out0)));
  function riseLine(ctx, str, y, T, t0, o, dur) {
    const words = L.layoutWords(ctx, str, 540, o);
    for (const wd of words) {
      const u = clamp((T - t0 - wd.i / 30) / dur); if (u <= 0) continue;
      const e = Ez.outCubic(u);
      L.text(ctx, wd.word, wd.cx, y + 36 * (1 - e), Object.assign({}, o, { align: 'center', alpha: Math.min(1, e * 1.25) }));
    }
  }
  H.headline = (ctx, T) => {
    if (T < TM.b4 - .05) return;
    ctx.save(); ctx.translate(H.headOff(T), 0);
    // 60 px Rich Black halo keeps sky sparkle off the copy
    const ha = clamp((T - TM.b4 + .1) / .25);
    ctx.save(); ctx.translate(540, 430); ctx.scale(1, .36);
    const hg = ctx.createRadialGradient(0, 0, 0, 0, 0, 640); hg.addColorStop(0, `rgba(22,20,24,${(.62 * ha).toFixed(3)})`); hg.addColorStop(.6, `rgba(22,20,24,${(.4 * ha).toFixed(3)})`); hg.addColorStop(1, 'rgba(22,20,24,0)');
    ctx.fillStyle = hg; ctx.fillRect(-700, -700, 1400, 1400); ctx.restore();
    const o = L.EN ? { font: 'lat', size: 76, weight: 740, color: C.paper, maxWidth: 820 } : { font: 'dev', size: 84, weight: 700, color: C.paper, maxWidth: 820 };
    riseLine(ctx, L.EN ? 'Diwali night.' : 'दिवाली की रात,', 370, T, HL.l1, o, .2);
    riseLine(ctx, L.EN ? 'The city is all yours.' : 'पूरा शहर आपके नाम।', 470, T, HL.l2, L.EN ? Object.assign({}, o, { size: 64 }) : o, .167);
    const su = L.EN ? 0 : Ez.outCubic(clamp((T - HL.sub) / .2));   // English cut: the hero IS English, no sub
    if (su > 0) L.text(ctx, 'Diwali night. The whole city’s yours.', 540, 555 + 12 * (1 - su), { font: 'lat', size: 44, weight: 600, color: C.mist, alpha: su, maxWidth: 820 });
    ctx.restore();
  };

  MM.addFlash({ t: TM.b4, dur: .1, exposure: .03, bloom: .15 });

  MM.scene('s2-whole-city-booked', {
    draw(ctx, t, { T }) {
      if (H.tok === T) { H.tok = null; return; }   // s1 already drew this exact frame of the shared world (2.5-2.8 overlap)
      H.render(ctx, T);
    }
  });
})();
