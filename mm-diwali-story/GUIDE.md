# MM Diwali Story — builder's guide

A 9:16 (1080×1920, 30 fps) Diwali wish video for **MM Advertising**, rendered procedurally:
every frame is drawn by Canvas 2D as a pure function of time, then encoded with ffmpeg.
The soundtrack is synthesized in numpy (`audio/synth.py`). No stock media.

```
brand/            exact MM logo geometry (logo-paths.js), brand fonts, logo SVGs, logo-sheet.png
engine/lib.js     drawing library  -> window.L   (read it: every helper is documented inline)
engine/elements.js crafted elements on L: hoarding (steel frame, gooseneck lamps, flex), skyline (Lucknow landmarks,
                  windows switching on, rooftop jhalar), stringLights, lantern (akash kandil), marigold, mangoLeaf, toran,
                  rangoli (from MM chevrons, powder texture), ledText (dot-matrix), textures (paper/ink/powder/flex),
                  blockPrint (hand-stamped look with misregistration), butaPath (paisley)
engine/post.js    cinematic finishing pass (motion blur, bloom, halation, grade, grain): steer per time via MM.postParams
RESEARCH.md       what gets forwarded, what looks AI-made, music & story-format rules: READ IT
engine/engine.js  frame loop       -> window.MM
scenes/timeline.js  scene list with GLOBAL start/end seconds + global post FX
scenes/<id>.js    one file per scene:  MM.scene('<id>', { draw(ctx, t, info) { ... } })
storyboard.json   the approved creative (art direction, scenes, copy, audio cues)
audio/synth.py    instruments + SFX + Mix bus;  audio/compose.py builds out/soundtrack.wav
render/render.js  stills / contact sheets / video
build.sh          full build -> out/MM-Diwali-Story.mp4
```

## Writing a scene

```js
MM.scene('s2-city', {
  draw(ctx, t, { T, dur, L }) {   // t = seconds since this scene's start; T = global seconds
    // draw the whole frame region this scene owns; the engine has already filled MM.background
  }
});
```

Rules that matter:
1. **Deterministic.** Never `Math.random()`, `Date.now()`, `performance.now()`, or state carried between frames.
   Use `L.rnd(seed, i)`, `L.noise1(x, seed)`, `L.snoise`. Particles are computed analytically from t
   (`L.ballistic`). Frames are rendered out of order by several workers.
2. **Transforms.** Never `ctx.setTransform(1,0,0,1,0,0)`/`ctx.resetTransform()` (the engine renders previews at
   a base scale). Use `save/restore/translate/scale/rotate`, `L.at`, `L.zoomAbout`, or `L.resetTransform(ctx)`.
3. **Logo.** Only via `L.drawLogo(ctx, name, {...})` (exact outlines, never distorted: uniform scale only) or
   the mark's real parts `L.markParts()` for the transformation moments. Ways: `reverse` on dark, `full` on light,
   `onred` on red. No glow/shadow/effects ON the logo itself (glow can sit behind it). Keep clear space.
4. **Safe zone.** All text and the logo inside x 90..990, y 260..1600 (Story UI covers the top/bottom).
   Backgrounds and effects go full-bleed.
5. **Type.** `L.text` / `L.kineticLine` with `font: 'lat'` (Anek Latin, headlines, weight 650-760, semi-expanded),
   `'dev'` (Anek Devanagari, Hindi, never letter-spaced), `'tiro'` + `italic: true` (Tiro Devanagari italic: dates, quotes,
   small doses). Animate Hindi per word (`L.layoutWords`), never per character (it breaks the shaping).
6. **Performance budget.** A full-res frame should draw in < 250 ms. Cache static heavy art (skylines, rangoli, panels)
   with `L.cached(key, w, h, fn)`; avoid big `shadowBlur` on many items (use `L.glow`); keep particles < ~1500/frame.
7. **Transitions.** Your scene owns its own in/out. Respect the overlap with neighbours in `timeline.js`
   (e.g. fade or wipe during the last 0.3–0.5 s) so cuts feel intentional and continuous.
8. **Stay in your lane.** Edit only your own scene file(s). Do not edit `engine/*`, `scenes/timeline.js`,
   `brand/*` or other scenes. If you need a helper, define it inside your scene file (prefix it to avoid clashes).

## Light, colour & the finishing pass
- The finishing pass blooms ONLY pixels with a channel >= ~247/255. So: type and logo white = `L.PAL.paper` (#F4F2EE, never glows);
  lights, flames, bulb cores, firework heads = pure white / `#FFC24A` gold etc. (they bloom). Gold TYPE that should not glow: `L.PAL.goldInk`.
- Additive light: `ctx.globalCompositeOperation = 'lighter'`, `L.glow`. Brand MM Red is the only red; festive light colours are for light only.
- Motion blur is real (4 sub-frames, 180° shutter): fast moves look filmic; do not fake blur trails for camera moves.
- `MM.postParams` (set in timeline.js) can vary exposure/bloom over time (e.g. a firework flash: exposure 1.15 for 3 frames).
- Previews: `--raw` skips the finishing pass (fast); `--samples 1` keeps the look without motion blur. Check final look before you finish.

## Previewing (always look at your frames)

```bash
cd /home/user/Personal/mm-diwali-story
node render/render.js --stills 3.0,3.5,4.2 --only s2-city --scale .5 --outdir out/s2   # PNGs you can Read
node render/render.js --sheet out/s2/sheet.png --from 2.6 --to 7.0 --every .2 --only s2-city
node render/render.js --video out/s2/s2.mp4 --from 2.6 --to 7 --workers 2              # motion check
```
The renderer exits non-zero and prints `ERRORS:` if any scene throws. Times are GLOBAL seconds.
Read the PNGs with your Read tool and judge them as a demanding art director would.

## Sound (audio/compose.py)
`audio/synth.py`: synthesized tabla (na/tin/ge/ke), dhol (boom/tik), clap, shaker, bells, chime, ghungroo, twinkle, tanpura, flute,
shehnai, sitar/santoor plucks, pad, riser, whoosh, sub_boom, firework_launch/burst, crackle, sparkler, flip_clack, pop, ui_tap,
match_strike, and `Mix(dur)` (stereo, reverb send, mastering to -14 LUFS / -1 dBFS).
`audio/sampler.py`: sampled GM instruments via fluidsynth (GeneralUser GS): sitar, shehnai, flute, strings, choir, harp, celesta,
tinkle_bell, taiko, timpani, orch_hit, reverse_cymbal ... with pitch bends (meend) and CC swells; GM percussion via `drums=True`.

## Quality bar

Premium festive motion design, not clip-art: rich layered night lighting (deep gradients, warm bloom, bokeh,
depth via scale/blur/alpha), confident geometric illustration in the spirit of the MM mark (straight lines, pillars,
chevrons), smooth eased motion with anticipation/overshoot, nothing static for more than ~0.4 s,
crisp legible type, and a consistent palette across scenes:
brand Ink/Rich Black/Violet for night, MM Red for the hero pillar, festive light colours (gold, amber, marigold, rose)
only as light, flame, sparks and glow.
