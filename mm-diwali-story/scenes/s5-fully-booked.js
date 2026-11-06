// PLACEHOLDER for s5-fully-booked (15.6–18 s). Replaced by the scene builder.
MM.scene('s5-fully-booked', {
  draw(ctx, t, { T, dur, L }) {
    ctx.fillStyle = '#1C1A1A'; ctx.fillRect(0, 0, L.W, L.H);
    L.text(ctx, 's5-fully-booked', L.W / 2, L.H / 2, { size: 54, weight: 700 });
    L.text(ctx, T.toFixed(2) + ' s', L.W / 2, L.H / 2 + 80, { size: 44, weight: 500, color: '#8C8783' });
  }
});
