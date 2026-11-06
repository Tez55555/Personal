/* s7 · End card: Sponsored by Aapke Apne (20.200 – 24.400)
   The mark glides from the s6 climax into the bilingual lockup; a Legacy-Line toran with marigold strands unfurls;
   Happy Diwali / शुभ दीपावली; the sender signs it ("Sponsored by: Aapke Apne"); a forward ticker types who to send it to
   and lands on "Sabko!". Complete at 22.767, then a dead-still hold (the screenshot frame); 24.1–24.4 loop seam. */
(function () {
  const ID = 's7-endcard-sponsored-by-aapke-apne';
  const PAPER = L.PAL.paper, MUSLIN = '#EEECE8', MIST = '#C9C4BF', STONE = '#8C8783', RED = '#D2232E', RICH = '#1C1A1A';
  // lockup: bilingual, reverse, w 700 centred (540,1243.6). The mark slot inside it: centre (254.5,1243.6), w 129.
  const LOCK = { x: 540, y: 1243.6, w: 560 };  // signature-sized (smaller than the storyboard's 700) so it reads as a sign-off, not an ad
  const MARK_FROM = { x: 540, y: 796.36, w: 520 }, MARK_TO = { x: 540 - 280 + 560 * 110 / 596.739 / 2, y: 1243.6, w: 560 * 110 / 596.739 };
  // toran (Legacy Line) geometry
  const TOR = { x0: 90, x1: 990, yTop: 268, h: 56, offset: 21.1, redIndex: 19 };
  const ts = TOR.h / 100, tStep = 46.25 * ts, tStart = TOR.x0 - ((TOR.offset % tStep) + tStep) % tStep - tStep;
  const NAMES = [['Mummy-Papa…', 21.567, 21.767], ['Bestie…', 21.8, 22.033], ['Boss…', 22.067, 22.267], ['Pados wale uncle…', 22.3, 22.567], ['Sabko!', 22.6, 99]];

  /** the toran: Legacy Line in Paper with one MM Red pillar at x 540, lightly block-printed (static -> cached) */
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
      // subtle block-print grain on the Paper parts (never on the logo)
      g.save(); g.globalCompositeOperation = 'destination-out'; g.globalAlpha = .1; g.drawImage(L.textureCanvas('ink', 512, 8), 0, -180, 1080, 500); g.restore();
    });
  }
  /** chevron tips of the toran (where the marigold strands hang) */
  function tips() {
    const out = [];
    for (let i = 0; i < 60; i++) { const bx = tStart + i * tStep; const x = bx + 31.875 * ts; if (x < TOR.x0 + 4) continue; if (x > TOR.x1 - 4) break; out.push({ x, y: TOR.yTop + 73.02 * ts, i }); }
    return out;
  }

  /** per-letter rise for Latin type (kerning-aware: positions from prefix widths) */
  function riseLetters(ctx, str, cx, y, T, t0, o) {
    const total = L.measure(ctx, str, o); let x0 = cx - total / 2;
    for (let i = 0; i < str.length; i++) {
      const ch = str[i]; if (ch === ' ') continue;
      const px = x0 + L.measure(ctx, str.slice(0, i), o);
      const p = L.prog(T, t0 + i / 30, t0 + i / 30 + .133, L.ease.outCubic); if (p <= 0) continue;
      L.text(ctx, ch, px, y + (1 - p) * 28, Object.assign({}, o, { align: 'left', alpha: p }));
    }
  }

  MM.scene(ID, {
    draw(ctx, t, { T }) {
      // ---------------- background (fades in over s6's glitter, 20.200–20.500)
      const bgIn = L.smoothstep(20.2, 20.5, T);
      const seam = L.smoothstep(24.1, 24.4, T);              // loop seam: background dims to the frame-0 night
      ctx.save(); ctx.globalAlpha = bgIn;
      const bg = ctx.createLinearGradient(0, 0, 0, L.H); bg.addColorStop(0, '#201C2E'); bg.addColorStop(.45, RICH); bg.addColorStop(1, '#1A1722');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, L.W, L.H);
      // Stamp Violet haze at the bottom + warm city bokeh below y 1450 (the city, receding)
      const hz = ctx.createRadialGradient(540, 1900, 0, 540, 1900, 900); hz.addColorStop(0, L.rgba('#3F3593', .30 * (1 - seam * .6))); hz.addColorStop(1, L.rgba('#3F3593', 0));
      ctx.fillStyle = hz; ctx.fillRect(0, 900, L.W, 1020);
      ctx.restore();
      const bokehA = (1 - seam * .65);
      L.bokeh(ctx, T * .5, { seed: 71, count: 26, colors: ['#FFB547', '#FFC24A', '#FF9F1C', '#F59E1B'], rMin: 12, rMax: 44, alpha: .2 * bgIn * bokehA, y: 1470, h: 450, drift: 12 });
      L.motes(ctx, T, { seed: 72, count: 18, y: 1450, h: 470, color: '#FFB547', alpha: .45 * bgIn * bokehA, rise: 6 });
      L.textureOverlay(ctx, 'paper', 0, 0, L.W, L.H, { alpha: .05 * bgIn, blend: 'soft-light', scale: 1.4, seed: 9 });
      // warm light behind the greeting (behind copy only)
      L.glow(ctx, 540, 560, 520, '#FFB547', .075 * bgIn * (1 - seam * .5));

      // ---------------- toran: unfurls out from the red pillar (20.367–20.800)
      const unf = L.prog(T, 20.367, 20.8, L.ease.outCubic);
      if (unf > 0) {
        const half = 470 * unf;
        ctx.save(); ctx.beginPath(); ctx.rect(540 - half, TOR.yTop - 20, half * 2, 140); ctx.clip();
        ctx.globalAlpha = .95 * (1 - seam * .25); ctx.drawImage(toranImage(), 0, TOR.yTop - 10);
        ctx.restore();
        // marigold strands drop from every chevron tip with a spring (20.800–21.100)
        const tp = tips();
        for (const tip of tp) {
          if (Math.abs(tip.x - 540) > half) continue;
          const d = L.clamp((T - 20.8 - Math.abs(tip.x - 540) / 470 * .08) / .3); if (d <= 0) continue;
          const spring = 1 + Math.sin(d * Math.PI * 1.5) * Math.exp(-d * 4) * .35; // 8 px-ish overshoot
          const n = tip.i % 2 ? 4 : 3; const sway = Math.sin(T * 1.7 + tip.i) * 1.6;
          const len = (n * 20 + 16) * L.ease.outCubic(d) * spring;
          ctx.save(); ctx.strokeStyle = 'rgba(60,44,30,.8)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(tip.x, tip.y); ctx.lineTo(tip.x + sway, tip.y + len); ctx.stroke(); ctx.restore();
          for (let k = 0; k < n; k++) { const yy = tip.y + 11 + k * 20; if (yy - tip.y > len) break; L.marigold(ctx, tip.x + sway * (k + 1) / n, yy, 11 - k * .6, { tone: (k + tip.i) % 2 ? 'yellow' : 'orange', seed: tip.i * 3 + k, rot: tip.i + k }); }
          if (len > n * 20 + 4) L.mangoLeaf(ctx, tip.x + sway, tip.y + 11 + n * 20 - 8, 16, sway * .02);
        }
      }

      // ---------------- greeting
      riseLetters(ctx, 'Happy Diwali', 540, 524, T, 20.467, { font: 'lat', size: 122, weight: 770, color: PAPER, maxWidth: 900 });
      { const words = ['शुभ', 'दीपावली']; const o = { font: 'dev', size: 104, weight: 700, color: MUSLIN };
        const lay = L.layoutWords(ctx, words.join(' '), 540, o);
        lay.forEach((w, i) => { const p = L.prog(T, 20.667 + i * .1, 20.867 + i * .1, L.ease.outCubic); if (p > 0) L.text(ctx, w.word, w.cx, 660 + (1 - p) * 24, Object.assign({}, o, { alpha: p, maxWidth: 880 })); }); }

      // phuljhadi spark racing under "Happy Diwali" (22.000–22.400), embers fading by 22.700
      if (T >= 22.0 && T < 22.75) {
        const prog = L.prog(T, 22.0, 22.4, L.ease.inOutQuad); const hx = L.lerp(175, 905, prog);
        if (T < 22.42) L.sparkler(ctx, hx, 560, T, 77, { radius: 46, count: 22, intensity: 1 });
        for (let k = 0; k < 40; k++) { const u = k / 40; const ex = L.lerp(175, 905, u); const born = 22.0 + .4 * L.ease.inOutQuad(u) * 0 + .4 * u; if (ex > hx || T < born) continue;
          const age = T - born; const a = Math.max(0, 1 - age / .4); if (a <= 0) continue; const ey = 560 + age * 40 + Math.sin(k * 3.1) * 3;
          ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = L.rgba(k % 3 ? '#FFC24A' : '#FFF4CF', a * .9); L.circle(ctx, ex, ey, 2.2 * a + .5); ctx.fill(); ctx.restore(); }
      }

      // ---------------- the sender signs it
      { const str = 'Sponsored by: Aapke Apne'; const o = { font: 'tiro', italic: true, size: 54, color: MUSLIN, maxWidth: 860 };
        const w = L.measure(ctx, str, o); const p = L.prog(T, 21.1, 21.467, L.ease.inOutSine || L.ease.inOutCubic);
        if (p > 0) { ctx.save(); ctx.beginPath(); ctx.rect(540 - w / 2 - 10, 730, (w + 20) * p, 90); ctx.clip(); L.text(ctx, str, 540, 790, o); ctx.restore();
          if (p < 1) { const nx = 540 - w / 2 + w * p; L.glow(ctx, nx, 775, 26, '#FFC24A', .5); } } }

      // ---------------- forward label
      { const p = L.prog(T, 21.4, 21.6, L.ease.outCubic);
        if (p > 0) { const a = { font: 'lat', size: 38, weight: 600, color: MIST }, b = { font: 'dev', size: 40, weight: 600, color: MIST };
          const s1 = 'Forward the light', s2 = 'रोशनी आगे बढ़ाइए', dot = '  ·  ';
          const w1 = L.measure(ctx, s1, a), wd = L.measure(ctx, dot, a), w2 = L.measure(ctx, s2, b); let x = 540 - (w1 + wd + w2) / 2; const y = 905 + (1 - p) * 16;
          L.text(ctx, s1, x, y, Object.assign({}, a, { align: 'left', alpha: p })); L.text(ctx, dot, x + w1, y, Object.assign({}, a, { align: 'left', alpha: p })); L.text(ctx, s2, x + w1 + wd, y, Object.assign({}, b, { align: 'left', alpha: p })); } }

      // ---------------- the ticker (types names, lands on "Sabko!")
      { const o = { font: 'tiro', italic: true, size: 64, color: RED, maxWidth: 860 };
        for (const [name, tin, tout] of NAMES) {
          if (T < tin || T >= tout) continue;
          const last = name === 'Sabko!';
          const typeDur = last ? .15 : Math.min((tout - tin) * .6, name.length / 40);
          let n = Math.min(name.length, Math.ceil(name.length * L.clamp((T - tin) / typeDur)));
          if (!last && T > tout - 2 / 30) n = Math.max(0, Math.floor(name.length * (tout - T) / (2 / 30))); // 2-frame backspace
          const shown = name.slice(0, n); if (!shown) continue;
          let sc = 1; if (last) { const b = L.prog(T, 22.6, 22.767); sc = b < 1 ? L.lerp(1.15, 1, L.ease.outBack(b)) : 1; }
          ctx.save(); ctx.translate(540, 995 - 22); ctx.scale(sc, sc); L.text(ctx, shown, 0, 22, o); ctx.restore();
          const caretOn = last ? T < 22.767 : true;
          if (caretOn && (Math.floor(T * 6) % 2 === 0 || T - tin < typeDur)) { const w = L.measure(ctx, shown, o) * sc; ctx.fillStyle = RED; ctx.fillRect(540 + w / 2 + 8, 995 - 52, 3, 62); }
        } }

      // ---------------- five clay diyas on a warm-lit ground, lit from the centre outward on the beats
      { const DI = [[540, 20.8], [360, 21.0], [720, 21.0], [180, 21.2], [900, 21.2]];
        const ground = 1548;
        const gg = ctx.createLinearGradient(0, ground - 30, 0, ground + 120); gg.addColorStop(0, 'rgba(255,170,80,0)'); gg.addColorStop(.3, L.rgba('#FFB547', .06 * bgIn)); gg.addColorStop(1, 'rgba(255,170,80,0)');
        ctx.fillStyle = gg; ctx.fillRect(0, ground - 30, L.W, 150);
        for (const [x, tl] of DI) {
          const lit = L.prog(T, tl, tl + .25, L.ease.outCubic) * (1 - seam * .5); const a = L.prog(T, 20.5, 20.9) * bgIn;
          if (a <= 0) continue;
          ctx.save(); ctx.globalAlpha = a;
          if (lit > 0) { // warm pool of light on the ground + soft reflection
            const pg = ctx.createRadialGradient(x + 20, ground + 26, 0, x + 20, ground + 26, 150); pg.addColorStop(0, L.rgba('#FFB547', .22 * lit)); pg.addColorStop(1, 'rgba(255,181,71,0)');
            ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = pg; ctx.beginPath(); ctx.ellipse(x + 20, ground + 26, 150, 34, 0, 0, 6.2832); ctx.fill(); ctx.restore();
          }
          L.diya(ctx, x, ground, 34, T, 300 + x, { lit });
          ctx.restore();
        } }

      // ---------------- credit + lockup + tagline
      L.text(ctx, 'MEDIA PARTNER', 540, 1150, { font: 'lat', size: 30, weight: 600, color: STONE, tracking: 6, alpha: L.prog(T, 20.967, 21.167), maxWidth: 600 });
      const g = L.prog(T, 20.2, 20.8, L.ease.inOutCubic);
      if (g < 1) {
        // the mark glides + scales uniformly from the s6 climax into its lockup slot
        L.drawLogo(ctx, 'mark', { x: L.lerp(MARK_FROM.x, MARK_TO.x, g), y: L.lerp(MARK_FROM.y, MARK_TO.y, g), w: L.lerp(MARK_FROM.w, MARK_TO.w, g), way: 'reverse' });
      } else {
        L.drawLogo(ctx, 'bilingual', { x: LOCK.x, y: LOCK.y, w: LOCK.w, way: 'reverse', roles: ['ink', 'pillar'] });
        const wipe = L.prog(T, 20.8, 21.067, L.ease.outCubic);
        if (wipe > 0) { const markRight = 260 + MARK_TO.w; ctx.save(); ctx.beginPath(); ctx.rect(markRight, 1170, (820 - markRight + 4) * wipe, 150); ctx.clip();
          L.drawLogo(ctx, 'bilingual', { x: LOCK.x, y: LOCK.y, w: LOCK.w, way: 'reverse', roles: ['word'] }); ctx.restore(); }
      }
      L.text(ctx, 'Trust, made visible.  ·  mmadvertising.org', 540, 1395, { font: 'lat', size: 32, weight: 600, color: MIST, alpha: L.prog(T, 21.2, 21.4), maxWidth: 820 });
    }
  });
})();
