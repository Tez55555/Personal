MM.scene('_elements2', {
  draw(ctx, t, { L }) {
    L.sky(ctx, '#0B0914', '#1B1430', '#2A1A33');
    const faces = [
      (g, w, h) => { g.fillStyle = '#F4F2EE'; g.fillRect(0, 0, w, h); L.text(g, 'Diwali safai:', w / 2, h * .42, { size: 64, weight: 760, color: '#2B2728' }); L.text(g, 'Day 6.', w / 2, h * .72, { size: 96, weight: 780, color: '#D2232E' }); },
      (g, w, h) => { g.fillStyle = '#2B2728'; g.fillRect(0, 0, w, h); L.text(g, 'Mummy:', w / 2, h * .42, { size: 64, weight: 700 }); L.text(g, '"Thoda aur."', w / 2, h * .72, { size: 92, weight: 780, color: '#F2B23E' }); },
      (g, w, h) => { g.fillStyle = '#D2232E'; g.fillRect(0, 0, w, h); L.text(g, 'BOOKED', w / 2, h * .62, { size: 150, weight: 800 }); },
    ];
    L.hoarding(ctx, { x: 120, y: 300, w: 840, h: 420, t, lit: 1, seed: 3, legs: 'twin', groundY: 1100, content: (g, w, h) => {
      L.trivision(g, { x: 0, y: 0, w, h, key: 'demo', faces, from: 0, to: 1, p: L.prog(t, .3, 1.6) });
    } });
    L.ledVan(ctx, 120 + (t - 1.5) * 120, 1500, 1.2, t, { screen: (g, w, h, tt) => L.ledText(g, 'BOOKED FOR YOU', 0, 0, w, h, { t: tt, pitch: 7, color: '#FFC24A', scroll: 120 }) });
  }
});
