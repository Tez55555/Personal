// Library showcase: render with  node render/render.js --stills 1,2.5 --only _demo  (after pointing timeline at it)
MM.scene('_demo', {
  draw(ctx, t, { L }) {
    L.sky(ctx); L.stars(ctx, t, { count: 140 }); L.bokeh(ctx, t, { alpha: .18 });
    L.legacyLine(ctx, { x0: 0, x1: L.W, yTop: 120, h: 70, color: '#3A3536', redIndex: 6, reveal: L.prog(t, 0, 1.2) });
    L.drawLogo(ctx, 'horizontal', { x: L.W / 2, y: 330, h: 90, way: 'reverse' });
    L.drawLogo(ctx, 'mark', { x: 220, y: 560, h: 160, way: 'reverse' });
    const P = L.markParts(); ctx.save(); ctx.translate(420, 480); ctx.scale(1.6, 1.6);
    P.pillars.forEach((p, i) => { ctx.fillStyle = i === 1 ? L.PAL.red : '#fff'; L.poly(ctx, p); ctx.fill(); });
    P.chevrons.forEach((p, i) => { ctx.save(); ctx.translate(0, -30 * L.prog(t, 0.5, 1.5, L.ease.outBack)); ctx.fillStyle = '#FFC24A'; L.poly(ctx, p); ctx.fill(); ctx.restore(); });
    ctx.restore();
    L.text(ctx, 'Happy Diwali', L.W / 2, 820, { font: 'lat', size: 120, weight: 720, color: '#fff', glow: { color: '#FF9F1C', blur: 40 } });
    L.text(ctx, 'शुभ दीपावली', L.W / 2, 940, { font: 'dev', size: 96, weight: 650, color: '#FFC24A' });
    L.text(ctx, 'Trust, made visible. since 1998', L.W / 2, 1020, { font: 'tiro', italic: true, size: 46, color: L.PAL.mist });
    L.kineticLine(ctx, 'Diet: postponed till Bhai Dooj', L.W / 2, 1110, t, .2, { font: 'lat', size: 62, weight: 700, style: 'pop', color: '#fff' });
    L.diya(ctx, 230, 1380, 90, t, 1); L.diya(ctx, 520, 1400, 60, t, 2);
    L.firework(ctx, { x: 820, y: 640, t: (t % 2.2), seed: 3, colors: ['#FFC24A', '#FF5C8A', '#FFFFFF'] });
    L.firework(ctx, { x: 300, y: 1700, t: ((t + .8) % 2.4), seed: 5, shape: 'willow', colors: ['#FFC24A', '#FF9F1C'] });
    L.rocket(ctx, { x0: 700, y0: 1900, x1: 760, y1: 1300, t: t % 1.2, dur: 1, seed: 4 });
    L.sparkler(ctx, 850, 1450, t, 7, { radius: 120 });
    L.fountain(ctx, 960, 1880, t, 8, { height: 380 });
    L.confetti(ctx, t, { kind: 'petal', count: 40, t0: .3 });
  }
});
