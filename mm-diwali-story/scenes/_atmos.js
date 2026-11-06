MM.scene('_atmos', {
  draw(ctx, t, { L }) {
    const cam = { x: (t - 1.5) * 40, y: 0, zoom: 1 + t * .04 };
    L.sky(ctx, '#0B0914', '#1B1430', '#2A1A33'); L.stars(ctx, t, { count: 90, h: 700 });
    L.depth(ctx, cam, 3, () => L.skyline(ctx, { layer: 'far', baseY: 1180, t }));
    L.depth(ctx, cam, 1.6, () => L.skyline(ctx, { layer: 'mid', baseY: 1320, t, lights: 1, jhalar: .5 }));
    L.haze(ctx, t, { y0: 700, y1: 1500, alpha: .22 });
    L.depth(ctx, cam, 1, () => { L.hoarding(ctx, { x: 150, y: 330, w: 780, h: 390, t, seed: 2, legs: 'unipole', groundY: 1420, night: .4, content: (g, w, h) => { g.fillStyle = '#F4F2EE'; g.fillRect(0, 0, w, h); L.text(g, 'Booked. For you.', w / 2, h * .58, { size: 86, weight: 780, color: '#2B2728' }); } });
      for (let k = 0; k < 4; k++) L.shaft(ctx, 150 + 780 * (k + .5) / 4 + 31, 283, -.15, 520, 260, t, { seed: k, alpha: .07 }); });
    L.depth(ctx, cam, .6, () => L.skyline(ctx, { layer: 'near', baseY: 1560, t, lights: 1, jhalar: .8 }));
    L.haze(ctx, t, { y0: 1300, y1: 1920, alpha: .18, color: '#FF9F6B', seed: 14, speed: 24 });
    L.motes(ctx, t, { count: 50, y: 900, h: 1000 });
  }
});
