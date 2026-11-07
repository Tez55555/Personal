// Element showcase (reference for scene builders)
MM.scene('_elements', {
  draw(ctx, t, { L }) {
    L.sky(ctx, '#0B0914', '#1B1430', '#2A1A33'); L.stars(ctx, t, { count: 90, h: 700 });
    L.skyline(ctx, { layer: 'far', baseY: 1180, t, lights: 1 });
    L.skyline(ctx, { layer: 'mid', baseY: 1300, t, lights: L.prog(t, 0, 2.5), jhalar: .5 });
    L.hoarding(ctx, { x: 150, y: 330, w: 780, h: 390, t, lit: L.prog(t, .3, .9), seed: 2, legs: 'unipole', groundY: 1350, content: (g, w, h) => {
      g.fillStyle = '#D2232E'; g.fillRect(0, 0, w, h);
      L.blockPrint(g, 'buta', 200, 200, b => { b.translate(100, 100); L.butaPath(b, 160); b.fill(); }, { x: w - 230, y: 60, color: '#F2B23E', misreg: 4 });
      L.text(g, 'This hoarding is', 40, 150, { align: 'left', size: 54, weight: 650 });
      L.text(g, 'booked for you.', 40, 225, { align: 'left', size: 74, weight: 760 });
      L.drawLogo(g, 'horizontal', { x: 40, y: 290, h: 56, anchor: 'topleft', way: 'onred' });
    } });
    L.skyline(ctx, { layer: 'near', baseY: 1460, t, lights: 1, jhalar: .7 });
    L.toran(ctx, { x0: 40, x1: 1040, y: 280, t, reveal: L.prog(t, 0, 1.5) });
    L.stringLights(ctx, { x0: 0, y0: 760, x1: 1080, y1: 780, sag: 90, n: 30, t, mode: 'chase' });
    L.lantern(ctx, 170, 760, 46, t, 1); L.lantern(ctx, 900, 770, 40, t, 2, { color: '#3F3593' });
    L.rangoli(ctx, 300, 1640, 210, { reveal: L.prog(t, .2, 2.5), t, spin: t * .1 });
    L.ledText(ctx, 'HAPPY DIWALI • शुभ दीपावली • ', 560, 1520, 460, 90, { t, pitch: 9, scroll: 140 });
    L.diya(ctx, 760, 1720, 70, t, 3);
    L.marigold(ctx, 980, 1760, 40, {}); L.marigold(ctx, 920, 1810, 30, { tone: 'yellow', seed: 3 });
  }
});
