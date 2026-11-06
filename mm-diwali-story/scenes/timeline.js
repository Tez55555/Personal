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
  "id": "s6-city-becomes-the-mark",
  "file": "s6-mark.js",
  "start": 17.7,
  "end": 20.5
 },
 {
  "id": "s7-endcard-sponsored-by-aapke-apne",
  "file": "s7-endcard.js",
  "start": 20.2,
  "end": 24.4
 }
];

// Finishing-pass control. Scenes register flashes at load time: MM.addFlash({ t: 16.0, dur: .2, exposure: .25, bloom: .4 })
MM.postParams = (T) => {
  let exposure = 1, bloom = .9;
  for (const f of MM.flashes) { if (T >= f.t && T < f.t + f.dur) { const k = 1 - (T - f.t) / f.dur; exposure += (f.exposure || 0) * k * k; bloom += (f.bloom || 0) * k; } }
  // chromatic aberration: subtle in the city, OFF whenever the MM mark / plates / end card are on screen
  const ca = (T >= 17.9) ? 0 : .0015;
  return { exposure, bloom, vignette: .45, grain: .042, ca };
};
