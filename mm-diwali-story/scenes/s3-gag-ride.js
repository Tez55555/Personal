// PLACEHOLDER for s3-gag-ride (4.933–12.4 s). Replaced by the scene builder.
MM.scene('s3-gag-ride', {
  draw(ctx, t, { T, dur, L }) {
    ctx.fillStyle = '#1C1A1A'; ctx.fillRect(0, 0, L.W, L.H);
    L.text(ctx, 's3-gag-ride', L.W / 2, L.H / 2, { size: 54, weight: 700 });
    L.text(ctx, T.toFixed(2) + ' s', L.W / 2, L.H / 2 + 80, { size: 44, weight: 500, color: '#8C8783' });
  }
});
