/* ==========================================================================
   s2-whole-city-booked (2.5–5.2 s)
   Continues s1's camera in the same world (MMH.world from s1-hook.js): the pull-back settles
   on a wide Lucknow night city whose MM boards get stamped BOOKED one cascade per beat,
   the LED flips to a pixel BOOKED, everything pulses on beat 7, then a whip-pan right into s3.
   This file adds the five city boards (as depth-layer members of the shared world) and the headline.
   ========================================================================== */
(function () {
  'use strict';
  const L = window.L, Ez = L.ease, H = window.MMH;
  const clamp = L.clamp, lerp = L.lerp, rnd = L.rnd;
  const C = H.C, TM = H.TM, U = H.util, DEG = U.DEG;

  /* ---------------------------------------------------------------- board faces */
  function faceCanvas(id, w, h, portrait) {
    const S = 3;  // supersampled: boards are seen up to ~2.4x during the pull-back
    return L.cached('mmh-bf-' + id, w * S, h * S, g => {
      g.scale(S, S);
      g.fillStyle = C.muslin; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(43,39,40,.45)'; g.lineWidth = 1.2; g.strokeRect(w * .03, h * .04, w * .94, h * .92);
      if (portrait) {
        L.text(g, 'SPACE', w / 2, h * .25, { font: 'lat', size: w * .2, weight: 760, color: C.ink, maxWidth: w * .86 });
        L.text(g, 'AVAILABLE', w / 2, h * .37, { font: 'lat', size: w * .2, weight: 760, color: C.ink, maxWidth: w * .86 });
        L.text(g, 'जगह खाली है', w / 2, h * .52, { font: 'dev', size: w * .14, weight: 700, color: C.stone, maxWidth: w * .8 });
      } else {
        const big = Math.min(h * .25, w * .085), y1 = h * .2 + big;
        L.text(g, 'SPACE AVAILABLE', w / 2, y1, { font: 'lat', size: big, weight: 760, color: C.ink, maxWidth: w * .84 });
        L.text(g, 'जगह खाली है', w / 2, y1 + big * 1.12, { font: 'dev', size: big * .86, weight: 700, color: C.stone, maxWidth: w * .6 });
      }
      L.textureOverlay(g, 'paper', 0, 0, w, h, { alpha: .14, blend: 'multiply', scale: .35, seed: 5 });
      for (let i = 0; i < 9; i++) { const x = rnd(950, i + id.length * 9) * w; const gr = g.createLinearGradient(0, 0, 0, h * .7); gr.addColorStop(0, 'rgba(96,78,62,.10)'); gr.addColorStop(1, 'rgba(96,78,62,0)'); g.fillStyle = gr; g.fillRect(x, 0, 1.2, h * .7); }
    });
  }
  const beatPulse = T => Math.exp(-Math.pow((T - TM.b7 - .05) / .055, 2));
  function litFace(g, img, x, y, w, h, T, blur, k, fog) {
    U.setBlur(g, blur);
    g.drawImage(img, x, y, w, h);
    g.filter = 'none';
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    g.globalCompositeOperation = 'multiply';
    const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, 'rgb(236,234,240)'); gr.addColorStop(1, 'rgb(150,144,162)');
    g.fillStyle = gr; g.fillRect(x, y, w, h);
    g.globalCompositeOperation = 'lighter';
    const p = beatPulse(T); if (p > .01) { g.fillStyle = `rgba(255,246,228,${(.2 * p).toFixed(3)})`; g.fillRect(x, y, w, h); }
    if (fog) { g.globalCompositeOperation = 'source-over'; g.fillStyle = `rgba(38,32,58,${fog})`; g.fillRect(x, y, w, h); }
    g.restore();
  }
  function frameRect(g, x, y, w, h, t, blur) {
    U.setBlur(g, blur || 0);
    g.fillStyle = '#161314'; g.fillRect(x - t, y - t, w + 2 * t, t); g.fillRect(x - t, y + h, w + 2 * t, t); g.fillRect(x - t, y, t, h); g.fillRect(x + w, y, t, h);
    g.fillStyle = 'rgba(140,135,131,.7)'; g.fillRect(x - t, y - t, w + 2 * t, 1.5);
    g.filter = 'none';
  }
  function lampsOn(g, x, y, w, n, k, blur) {
    for (let i = 0; i < n; i++) {
      const lx = x + w * (i + .5) / n;
      U.setBlur(g, blur); g.strokeStyle = '#121012'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(lx - 8, y); g.quadraticCurveTo(lx - 8, y - 14, lx, y - 12); g.stroke(); g.filter = 'none';
      g.save(); g.globalCompositeOperation = 'lighter';
      const cg = g.createLinearGradient(0, y - 10, 0, y + 70); cg.addColorStop(0, 'rgba(244,246,255,.10)'); cg.addColorStop(1, 'rgba(244,246,255,0)');
      g.fillStyle = cg; g.beginPath(); g.moveTo(lx - 6, y - 9); g.lineTo(lx + 6, y - 9); g.lineTo(lx + 40, y + 70); g.lineTo(lx - 40, y + 70); g.closePath(); g.fill();
      U.lamp(g, lx, y - 10, 2.2, '#F4F6FF', .95, k, blur);
      g.restore();
    }
  }
  const plateImg = () => L.cached('mmh-plate', 92 * 4, 28 * 4, g => {
    g.scale(4, 4); g.fillStyle = C.ink; g.fillRect(0, 0, 92, 28); g.fillStyle = 'rgba(140,135,131,.6)'; g.fillRect(0, 0, 92, 1.2);
    L.drawLogo(g, 'mark', { x: 5, y: 5, h: 18, anchor: 'topleft', way: 'reverse' });
    L.text(g, 'MM Advertising', 28, 18.5, { font: 'lat', size: 9.5, weight: 650, color: C.paper, align: 'left', maxWidth: 60 });
  });
  function plate(g, x, y, blur) {   // tiny MM media-owner plate (decorative at this scale)
    U.setBlur(g, blur || 0); g.drawImage(plateImg(), x, y, 92, 28); g.filter = 'none';
  }
  /** mini stamp: anticipation-free slam (scale 1.5 -> 1 in .1 s), then the impression with 16 specks */
  function miniStamp(g, cx, cy, w, rotDeg, at, T) {
    const sc = .62 * w / 700;
    if (T < at - .1) return;
    g.save(); g.translate(cx, cy); g.rotate(rotDeg * DEG); g.scale(sc, sc);
    if (T < at) {
      const u = clamp((T - (at - .1)) / .1), e = u * u * u;
      const s = lerp(1.5, 1, e); g.scale(s, s); g.globalAlpha = clamp(.2 + u * 1.6);
      g.drawImage(H.stampCanvas(0), -H.STW / 2, -H.STH / 2);
    } else {
      H.drawImpression(g, T - at, 16, .55 / sc * .22);
      // impact ring of displaced dust
      const tau = T - at; if (tau < .25) { g.strokeStyle = `rgba(201,196,191,${(.5 * (1 - tau / .25)).toFixed(3)})`; g.lineWidth = 6 / sc * .4; const r = 1 + tau * 1.6; g.strokeRect(-350 * r, -125 * r, 700 * r, 250 * r); }
    }
    g.restore();
  }

  /* ---------------------------------------------------------------- the five city boards */
  // U1 unipole (mid layer)
  H.boards.push({ d: 2, draw(g, T, k, blur) {
    const x = 110, y = 770, w = 220, h = 130;
    U.setBlur(g, blur);
    g.fillStyle = '#151214'; g.fillRect(x + w / 2 - 7, y + h, 14, 1002 - y - h); g.fillStyle = 'rgba(140,135,131,.35)'; g.fillRect(x + w / 2 - 7, y + h, 1.5, 1002 - y - h);
    g.fillStyle = '#131012'; g.fillRect(x - 6, y + h + 4, w + 12, 5);
    frameRect(g, x, y, w, h, 4, blur);
    litFace(g, faceCanvas('U1', w, h), x, y, w, h, T, blur, k);
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); miniStamp(g, x + w * .53, y + h * .76, w * .92, -10, TM.b5, T); g.restore();
    lampsOn(g, x, y, w, 2, k, blur);
    plate(g, x + w - 92, y + h + 12, blur);
  } });
  // W1 building wrap (mid layer, on the tall tower x 672–922)
  H.boards.push({ d: 2, draw(g, T, k, blur) {
    const x = 850, y = 682, w = 135, h = 256;
    litFace(g, faceCanvas('W1', w, h, true), x, y, w, h, T, blur, k);
    g.fillStyle = 'rgba(30,24,22,.6)'; for (let i = 0; i < 8; i++) { L.circle(g, x + 6 + i * (w - 12) / 7, y + 4, 1.4); g.fill(); L.circle(g, x + 6 + i * (w - 12) / 7, y + h - 4, 1.4); g.fill(); }
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); miniStamp(g, x + w / 2, y + h * .74, w * 1.1, -12, TM.b5, T); g.restore();
    // floodlights at the parapet throwing light up the wrap
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const lx of [x + 30, x + w - 30]) { const cg = g.createLinearGradient(0, y + h + 10, 0, y + 80); cg.addColorStop(0, 'rgba(255,236,206,.10)'); cg.addColorStop(1, 'rgba(255,236,206,0)'); g.fillStyle = cg; g.beginPath(); g.moveTo(lx - 5, y + h + 10); g.lineTo(lx + 5, y + h + 10); g.lineTo(lx + 60, y + 80); g.lineTo(lx - 60, y + 80); g.closePath(); g.fill(); U.lamp(g, lx, y + h + 12, 2, '#FFE9C8', .9, k, blur); }
    g.restore();
    plate(g, x + w - 92, y + h + 10, blur);
  } });
  // L1 rooftop LED screen (mid layer): test bars -> 2-frame glitch -> pixel BOOKED
  const PIX = { B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'], O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
    K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'], E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'], D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'] };
  let L1C = null;
  function L1buf() { if (!L1C) { L1C = document.createElement('canvas'); L1C.width = 126 * 3; L1C.height = 82 * 3; } const c = L1C.getContext('2d'); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.filter = 'none'; c.clearRect(0, 0, L1C.width, L1C.height); return c; }
  const BARS = ['#C9C4BF', '#CDB06A', '#8FA6B2', '#7E9A78', '#93809E', '#B07A5A', '#4A3F9A'];
  H.boards.push({ d: 2, draw(g, T, k, blur) {
    const x = 700, y = 724, w = 126, h = 82, roof = 862;
    U.setBlur(g, blur);
    g.fillStyle = C.steel; for (const lx of [x + 18, x + w - 26]) g.fillRect(lx, y + h, 8, roof - y - h);
    g.strokeStyle = C.steel; g.lineWidth = 3; g.beginPath(); g.moveTo(x + 22, y + h + 6); g.lineTo(x + w - 22, roof - 4); g.moveTo(x + w - 22, y + h + 6); g.lineTo(x + 22, roof - 4); g.stroke();
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
    if (f < fl) {
      BARS.forEach((c, i) => { g.fillStyle = L.mix(c, '#000000', .18); g.fillRect(x + i * w / 7, y, w / 7 + .5, h * .7); });
      for (let i = 0; i < 5; i++) { g.fillStyle = L.mix(['#2B2728', '#C9C4BF', '#1C1A1A', '#8C8783', '#3F3593'][i], '#000000', .15); g.fillRect(x + i * w / 5, y + h * .7, w / 5 + .5, h * .3); }
    } else if (f < fl + 2) {
      for (let s = 0; s < 9; s++) { const sy = y + s * h / 9, off = (rnd(961, f * 20 + s) - .5) * 60; g.fillStyle = L.mix(BARS[(s + f) % 7], '#000000', .1 + rnd(962, f * 20 + s) * .5); g.fillRect(x + off, sy, w, h / 9 + .5); }
      g.fillStyle = 'rgba(244,242,238,.5)'; for (let i = 0; i < 40; i++) g.fillRect(x + rnd(963, f * 100 + i) * w, y + rnd(964, f * 100 + i) * h, 3, 1.4);
    } else {
      const word = 'BOOKED', pitch = 3.35, cols = 35, x0 = x + (w - cols * pitch) / 2, y0 = y + (h - 7 * pitch) / 2 - 4;
      g.fillStyle = 'rgba(244,242,238,.07)';
      for (let r = -3; r < 13; r++) for (let c = -4; c < 39; c++) { L.circle(g, x0 + c * pitch + pitch / 2, y0 + r * pitch + pitch / 2, pitch * .28); g.fill(); }
      g.fillStyle = C.paper;
      for (let li = 0; li < 6; li++) { const gl = PIX[word[li]]; for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) if (gl[r][c] === '1') { L.circle(g, x0 + (li * 6 + c) * pitch + pitch / 2, y0 + r * pitch + pitch / 2, pitch * .42); g.fill(); } }
      g.fillStyle = 'rgba(244,242,238,.75)'; g.fillRect(x0, y0 + 8.4 * pitch, cols * pitch, 1.4);
      L.text(g, 'FOR YOU · DIWALI', x + w / 2, y0 + 11.2 * pitch, { font: 'lat', size: 7.5, weight: 650, color: C.paper, maxWidth: w * .8, tracking: .8 });
    }
    if (boot < 1) { g.restore(); if (boot > 0) { g.fillStyle = 'rgba(244,242,238,.7)'; g.fillRect(x, y + h * boot - 1, w, 2); } }
    // dot-pitch + scanline overlay
    g.fillStyle = 'rgba(0,0,0,.22)'; for (let yy = y; yy < y + h; yy += 2.2) g.fillRect(x, yy, w, .8);
    g.restore(); g.restore();
    const buf = g.canvas; g = outer;
    U.setBlur(g, blur); g.drawImage(buf, x, y, w, h); g.filter = 'none';
    g.save(); g.globalCompositeOperation = 'lighter';
    U.put(g, U.softSpr(f < fl ? '#B8B4D8' : '#FFF1DC'), x + w / 2, y + h / 2, 110, .1 * pulse * boot);
    if (f >= fl && f < fl + 2) U.put(g, U.softSpr('#FFFFFF'), x + w / 2, y + h / 2, 90, .25);
    g.restore();
    plate(g, x + w - 92, y + h + 8, blur);
  } });
  // H2 rooftop hoarding (d 1.3; its structure lives in the h2 block cache)
  H.boards.push({ d: 1.3, draw(g, T, k, blur) {
    const x = 640, y = 1000, w = 340, h = 200;
    U.setBlur(g, blur); g.fillStyle = '#131012'; g.fillRect(x - 8, y + h + 6, w + 16, 6);
    frameRect(g, x, y, w, h, 5, blur);
    litFace(g, faceCanvas('H2', w, h), x, y, w, h, T, blur, k, .1);
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); miniStamp(g, x + w * .54, y + h * .76, w * .9, -8, TM.b4, T); g.restore();
    lampsOn(g, x, y, w, 3, k, blur);
    plate(g, x + w - 96, y + h + 16, blur);
  } });
  // G1 gantry over the flyover (d 1.15)
  H.boards.push({ d: H.FLY_D, draw(g, T, k, blur) {
    const x = 330, y = 1398, w = 420, h = 92, deck = 1516;
    U.setBlur(g, blur);
    g.fillStyle = C.steel; for (const px of [x + 12, x + w - 22]) { g.fillRect(px, y + h, 10, deck - y - h); }
    // lattice beam on top: a run of V-chevrons
    g.fillStyle = '#161314'; g.fillRect(x - 16, y - 18, w + 32, 4); g.fillRect(x - 16, y - 6, w + 32, 4);
    g.strokeStyle = '#161314'; g.lineWidth = 2.4; g.beginPath(); for (let bx = x - 14; bx < x + w + 14; bx += 16) { g.moveTo(bx, y - 15); g.lineTo(bx + 8, y - 4); g.lineTo(bx + 16, y - 15); } g.stroke();
    g.fillStyle = 'rgba(140,135,131,.55)'; g.fillRect(x - 16, y - 18, w + 32, 1.2);
    frameRect(g, x, y, w, h, 4, blur);
    litFace(g, faceCanvas('G1', w, h), x, y, w, h, T, blur, k);
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); miniStamp(g, x + w * .74, y + h * .62, w * .5, -9, TM.b4, T); g.restore();
    plate(g, x + 8, y + h + 4, blur);
  } });

  /* ---------------------------------------------------------------- beat-7 sparkles along the parapets */
  const GLINTS = (() => {
    const a = []; const runs = [[420, 570, 1032, 2.01], [0, 140, 1042, 2.01], [140, 350, 1000, 2.01], [690, 830, 862, 2.01], [606, 1080, 1255, 1.31], [830, 1040, 662, 2.01], [560, 690, 985, 2.01]];
    for (let i = 0; i < 30; i++) { const r = runs[i % runs.length]; a.push({ x: lerp(r[0], r[1], rnd(971, i)), y: r[2] - 4 - rnd(972, i) * 14, d: r[3], dl: rnd(973, i) * .28, s: 9 + rnd(974, i) * 9 }); }
    return a;
  })();
  function glint(g, x, y, s, a) {
    g.save(); g.translate(x, y); g.globalAlpha = a; g.fillStyle = '#FFE7A3';
    g.beginPath(); g.moveTo(0, -s); g.lineTo(s * .16, -s * .16); g.lineTo(s, 0); g.lineTo(s * .16, s * .16); g.lineTo(0, s); g.lineTo(-s * .16, s * .16); g.lineTo(-s, 0); g.lineTo(-s * .16, -s * .16); g.closePath(); g.fill();
    g.restore(); U.put(g, U.glowSpr('#FFC24A'), x, y, s * 2.2, a * .6); U.put(g, U.glowSpr('#FFFFFF'), x, y, s * .5, a);
  }
  for (const d of [2.01, 1.31]) H.boards.push({ d, draw(g, T) {
    const t0 = TM.b7; if (T < t0 - .05 || T > t0 + .9) return;
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const p of GLINTS) { if (p.d !== d) continue; const u = (T - t0 - p.dl) / .45; if (u < 0 || u > 1) continue; glint(g, p.x, p.y, p.s * Math.sin(u * Math.PI), Math.sin(u * Math.PI)); }
    g.restore();
  } });

  /* ---------------------------------------------------------------- headline */
  function riseLine(ctx, str, y, T, t0, o, dur) {
    const words = L.layoutWords(ctx, str, 540, o);
    for (const wd of words) {
      const u = clamp((T - t0 - wd.i / 30) / dur); if (u <= 0) continue;
      const e = Ez.outCubic(u);
      L.text(ctx, wd.word, wd.cx, y + 36 * (1 - e), Object.assign({}, o, { align: 'center', alpha: e }));
    }
  }
  H.headline = (ctx, T, cam) => {
    if (T < TM.b4 - .05) return;
    const off = -1400 * cam.w;
    ctx.save(); ctx.translate(off, 0);
    // 60 px Rich Black halo keeps sky sparkle off the copy
    const ha = clamp((T - TM.b4 + .1) / .3);
    ctx.save(); ctx.translate(540, 430); ctx.scale(1, .36);
    const hg = ctx.createRadialGradient(0, 0, 0, 0, 0, 640); hg.addColorStop(0, `rgba(22,20,24,${(.62 * ha).toFixed(3)})`); hg.addColorStop(.6, `rgba(22,20,24,${(.4 * ha).toFixed(3)})`); hg.addColorStop(1, 'rgba(22,20,24,0)');
    ctx.fillStyle = hg; ctx.fillRect(-700, -700, 1400, 1400); ctx.restore();
    const o = { font: 'dev', size: 84, weight: 700, color: C.paper, maxWidth: 820 };
    riseLine(ctx, 'दिवाली की रात,', 370, T, TM.b4, o, .3);
    riseLine(ctx, 'पूरा शहर आपके नाम।', 470, T, L.q(2.9), o, .3);
    const su = Ez.outCubic(clamp((T - L.q(2.967)) / .267));
    if (su > 0) L.text(ctx, "Diwali night. The whole city's yours.", 540, 555 + 12 * (1 - su), { font: 'lat', size: 44, weight: 600, color: C.mist, alpha: su, maxWidth: 820 });
    ctx.restore();
  };

  MM.addFlash({ t: TM.b4, dur: .1, exposure: .03, bloom: .15 });

  MM.scene('s2-whole-city-booked', {
    draw(ctx, t, { T }) {
      H.world(ctx, T);
      H.headline(ctx, T, H.cam(T));
    }
  });
})();
