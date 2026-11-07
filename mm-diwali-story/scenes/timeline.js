// Scene timeline (GLOBAL seconds, frame-aligned). Generated from storyboard.json.
// Beat grid: 100 BPM, beat n at t = 0.400 + 0.600*n (18 frames). Use L.beat(n) and L.q(t).
MM.duration = 24.4; MM.fps = 30;
MM.timeline = [
 {
  "id": "s1-hook-space-available",
  "file": "s1-hook.js",
  "start": 0.0,
  "end": 2.8
 },
 {
  "id": "s2-whole-city-booked",
  "file": "s2-city-booked.js",
  "start": 2.5,
  "end": 5.2
 },
 {
  "id": "s3-gag-ride",
  "file": "s3-gag-ride.js",
  "start": 4.933333333333334,
  "end": 12.4
 },
 {
  "id": "s4-lights-off-diya-on",
  "file": "s4-diya-turn.js",
  "start": 12.133333333333333,
  "end": 16.0
 },
 {
  "id": "s5-fully-booked",
  "file": "s5-fully-booked.js",
  "start": 15.6,
  "end": 18.0
 },
 {
  // from 19.0 s6 only keeps the rockets, the triple burst, the glitter rain and the city fading under the card
  "id": "s6-city-becomes-the-mark",
  "file": "s6-mark.js",
  "start": 17.7,
  "end": 20.5
 },
 {
  // the end card takes the mark at 19.000 (glide 19.0-19.6), so the greeting is up by 19.3
  "id": "s7-endcard-sponsored-by-aapke-apne",
  "file": "s7-endcard.js",
  "start": 19.0,
  "end": 24.4
 }
];

// Finishing-pass control. Scenes register flashes at load time: MM.addFlash({ t: 16.0, dur: .2, exposure: .25, bloom: .4 })
(function () {
  const D = window.MMPost ? MMPost.DEFAULTS : { saturation: 1.06, contrast: 1.04, splitTone: .08, highlightTint: [1, .82, .55], lift: [.022, .014, .034] };
  // on the mark / end card the black lift goes near-neutral and the vignette eases off a little, so MM Red and Paper
  // land on their brand values (the card's own background carries the lifted floor + texture against banding)
  const LIFT_CARD = [.012, .011, .016], VIG = .45, VIG_CARD = .32;
  const lerp = (a, b, t) => a + (b - a) * t;
  const sm = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
  // fast moves in the neighbours' scenes: 10 sub-frames so whips/slats/type blur instead of printing 4 discrete copies
  // (+ the 18.4 snap, where the chevron pour / tower flood fronts move ~200 px in a frame)
  const DENSE = [[2.60, 2.95], [4.95, 5.20], [7.33, 7.60], [9.73, 10.00], [12.13, 12.35], [15.65, 16.00], [18.35, 18.52]];
  MM.postParams = (T) => {
    let exposure = 1, bloom = .9;
    for (const f of MM.flashes) { if (T >= f.t && T < f.t + f.dur) { const k = 1 - (T - f.t) / f.dur; exposure += (f.exposure || 0) * k * k; bloom += (f.bloom || 0) * k; } }
    // chromatic aberration: subtle in the city, OFF whenever the MM mark / plates / end card are on screen
    const ca = (T >= 17.9) ? 0 : .0015;
    // motion-blur sub-frames: 1 while the exact mark holds and glides into the lockup (no stepped copies of the logo)
    let samples = 4;
    if (T >= 18.55 && T < 19.6) samples = 1;
    else if (DENSE.some(([a, b]) => T >= a && T < b)) samples = 10;
    // brand-true colour on the mark and the end card: the creative grade eases to neutral over 18.40-18.60
    const n = sm(18.4, 18.6, T);
    const saturation = lerp(D.saturation, 1, n), contrast = lerp(D.contrast, 1, n), splitTone = lerp(D.splitTone, 0, n);
    const highlightTint = D.highlightTint.map(v => lerp(v, 1, n));
    const lift = D.lift.map((v, i) => lerp(v, LIFT_CARD[i], n)), vignette = lerp(VIG, VIG_CARD, n);
    // a touch more (coarse) grain on the end card so the dark card keeps texture through WhatsApp's re-encode
    const grain = lerp(.042, .055, sm(19.0, 19.5, T));
    return { exposure, bloom, vignette, grain, ca, samples, saturation, contrast, splitTone, highlightTint, lift };
  };
})();
