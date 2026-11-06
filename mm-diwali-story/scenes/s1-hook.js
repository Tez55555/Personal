// PLACEHOLDER for s1-hook-space-available (0–2.8 s). Replaced by the scene builder.
MM.scene('s1-hook-space-available', {
  draw(ctx, t, { T, dur, L }) {
    ctx.fillStyle = '#1C1A1A'; ctx.fillRect(0, 0, L.W, L.H);
    L.text(ctx, 's1-hook-space-available', L.W / 2, L.H / 2, { size: 54, weight: 700 });
    L.text(ctx, T.toFixed(2) + ' s', L.W / 2, L.H / 2 + 80, { size: 44, weight: 500, color: '#8C8783' });
  }
});
