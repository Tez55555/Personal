// Placeholder timeline (replaced by the storyboard's scenes).
MM.duration = 3; MM.fps = 30;
MM.timeline = [{ id: '_demo', file: '_demo.js', start: 0, end: 3 }];
MM.post = (ctx, T) => { L.vignette(ctx, .45); L.grain(ctx, T, .05); };
