#!/usr/bin/env python3
"""MM Diwali Story, "Booked For You": the 24.4 s soundtrack (composition, sound design, mix and master).

    python3 audio/compose.py --out out/soundtrack.wav                      # writes the mastered 48 kHz stereo WAV
    python3 audio/compose.py --out out/soundtrack.wav --check out/audio-check   # + spectrogram/waveform/loudness PNGs

Deterministic: every noise source is seeded and the fluidsynth renders are bit-identical from run to run.

Musical frame
-------------
* 100 BPM. Beat n falls at t = 0.400 + 0.600*n (18 frames at 30 fps); an 8th note is 0.3 s and the fill/tihai
  sub-grid is 0.1 s. Every event time goes through q(t) = round(t*30)/30, so each hit lands on a video frame.
* Sa = D with a Raag Yaman colour (D E F# G# A B C#); the tanpura drones on D and A.
* Sonic logo: D5-A5-D6 (left pillar, red pillar, right pillar), 4 frames apart, played on santoor + sitar +
  hand-chimes, with a temple bell doubling the A (the red pillar). It is stated big at the 18.400 snap and signed off
  at 20.800 when the mark lands in the lockup. The van horn (D4-A4) and the 19.000 rocket whistles (D5/A5/D6)
  foreshadow and echo it.

Structure (global seconds; every cue time lives in CUE so the score can be retimed in one place)
--------------------------------------------------------------------------------------------------
 s1  0.000-2.800  hook: tubelight hum + flicker, shehnai pickup, BOOKED stamp at 0.400, shehnai mangal flourish,
                  santoor + glock 'for you', diya flare, riser.
 s2  2.800-5.200  the keherwa groove drops in (dholak = darbuka samples + synth tabla, dhol on the 1s, shaker,
                  claps, manjira, ghungroo, bass), the stamp cascade climbs D, D#, E, and the sitar hook plays Ni Re Ga Re Sa.
 s3  5.200-12.400 three gags, each punchline on a downbeat with a stinger: safai (slats, jhadu, back-crack and
                  the hook 'breaks its back'), diet (LED blips, sitar ta-daa, a kaju katli melody, crumble + trombone womp
                  over a groove break) and the van (putter, brake, box toks D-E-F#, horn D-A answered by the sitar,
                  hops, 'huh?' meend).
 s4  12.400-16.000 the turn: relay thunk and power-down, the music hard-stops, one cricket, the match, the diya whoomp,
                  then tanpura + bowed strings + bansuri (Ni Re Ga .. Re .. Sa) under a rising santoor Yaman ladder (one
                  note per ring of light). The late-latif window gets a half-beat of silence (14.85-15.10) and then
                  pops brightest, landing the bansuri's delayed Sa.
 s5  15.400-18.400 riser, then the FULLY BOOKED mega stamp at 16.000: the full band returns (double-energy keherwa,
                  claps on 2 and 4, the sitar + shehnai hook an octave up, strings + choir), with rockets and bursts on the beat,
                  and a tutti tabla tihai (walking A, B, C#) that lands on the 18.400 CLACK.
 s6  18.400-20.800 the towers snap into the mark: the CLACK + sonic logo #1, a hold, three launch whistles
                  that glide to the logo chord, the triple burst, and two beats of groove through an opening low-pass.
 s7  20.800-24.400 the end card: sonic logo #2 on the lockup, a warm Dmaj9(#11) pad, ticker plucks per name, a soft
                  tihai that lands on 'Sabko!', the temple bell on the bar-10 downbeat, a tanpura fade,
                  and the tubelight hum back at 24.100 for the loop (its phase is continuous with frame 0).

Mix: six buses (music A/B, drums A/B, SFX, BIG hits) with a short room (0-12.4 s) and a long open-air hall (from 13 s).
Music is ducked 3.5 dB (drums 2 dB) under the big hits. Pads and strings are high-passed at 150 Hz.
Every boom carries a 120-250 Hz body and a 2-4 kHz attack so it reads on phone speakers. The master is
synth.Mix.render (EQ, glue compression, limiter, -14 LUFS), with a -1 dBTP true-peak check.
"""
import argparse
import os
import subprocess
import sys
import time
import wave

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import synth as S  # noqa: E402
from synth import SR, TAU, tt, n_samples, midi_hz, rng, fade, fft_filter, sweep_filter, noise, pink, glide  # noqa: E402
from sampler import render as gm_render, GM, DRUM  # noqa: E402
from samples import hit as sample_hit, list_samples  # noqa: E402

# =====================================================================================================================
# GRID
# =====================================================================================================================
DUR = 24.4
FPS = 30
BPM = 100
BEAT = 60.0 / BPM          # 0.6 s
T0 = 0.4                   # beat 0
E8 = BEAT / 2              # 8th note, 0.3 s
S16 = BEAT / 4             # 16th note, 0.15 s (snapped to frames this becomes a light 4/5-frame dholak swing)
LOGO_STEP = 4 / FPS        # sonic-logo note spacing (4 frames)


def q(t):
    """snap to the nearest video frame"""
    return float(np.floor(t * FPS + 0.5) / FPS)


def beat(n):
    return q(T0 + BEAT * n)


# =====================================================================================================================
# CUE TABLE: every picture-sync time in one place (global seconds). Retime here.
# =====================================================================================================================
CUE = dict(
    # s1 hook ------------------------------------------------------------------------------------------------------
    hum_in=0.0, flicker=[0.067, 0.200], tzzt=0.133, stamp_drop=0.233, stamp=beat(0), ink=0.433,
    for_you=beat(1), aapke_liye=1.300, diya_flare=beat(2), riser_hook=beat(3), ge_pick=2.500, ke_pick=2.700,
    hum_fade=2.200,
    # s2 whole city booked -----------------------------------------------------------------------------------------
    groove_in=beat(4), cascade=[beat(4), beat(5), beat(6)], hook=beat(5), led_flip=beat(6), boards_pulse=beat(7),
    whip1=4.933, slats=5.067,
    # s3 gags ------------------------------------------------------------------------------------------------------
    gag1=beat(8), jhadu=[5.267, 5.400], dust_twinkle=5.500, back_crack=beat(10), fill1=beat(11), whip2=7.333,
    led_boot=7.467,
    gag2=beat(12), word_blips=[7.600, 7.633, 7.667], tadaa=7.900,
    kaju=[8.100, 8.267, 8.400, 8.567, 8.733, 8.933, 9.100, 9.267], crumble=beat(15), whip3=9.733, squeak=9.967,
    gag3=beat(16), boxes=[10.000, 10.100, 10.200], boing=10.033, horn=[10.600, 10.700],
    hops=[11.200, 11.333, 11.467, 11.600], mystery_box=11.533, huh=11.600, fill2=beat(19), whip_up=12.133,
    # s4 the turn --------------------------------------------------------------------------------------------------
    turn=beat(20), cricket=[12.567, 14.567], match=12.700, diya=beat(21),
    rings=[13.300, 13.600, 13.900, 14.200, 14.500, 14.800], late_window=15.100, ember_hop=14.800,
    late_pause=(14.850, 15.100), heartbeat=[beat(22), beat(23), beat(24), beat(25)], strings_on=beat(23),
    riser_turn=beat(25), whistle_fall=15.700,
    # s5 fully booked ----------------------------------------------------------------------------------------------
    mega=beat(26), rockets=[16.100, 16.200, 16.300, 16.400], bursts=[16.600, 16.700, 17.200, 17.300],
    phuljhadi=[17.200, 17.400, 17.567], tihai=17.400, whoosh_up=17.700,
    # s6 the mark --------------------------------------------------------------------------------------------------
    clack=beat(30), snap=18.433, logo1=beat(30), pad_back=18.667, launch3=beat(31), triple=beat(32),
    low_whoosh=beat(33), toran=20.367,
    # s7 end card --------------------------------------------------------------------------------------------------
    logo2=beat(34), pad_chord=21.067, pen=21.100, fwd_label=beat(35), ticker=[21.567, 21.800, 22.067, 22.300],
    ticker_chars=[4, 3, 2, 5], tihai_end=21.600, spark=beat(36), sabko=beat(37), bell=beat(38),
    tanpura_fade=beat(39), hum_back=24.100, end=DUR,
)
# moments that duck the music (big SFX): (time, depth scale). The 18.400 CLACK only ducks the drums: the sonic logo
# that rings over it must stay clean.
DUCK_MUS = [(CUE['stamp'], 1.0), (CUE['mega'], 1.0), (16.600, .8), (16.700, .8), (17.200, .8), (17.300, .8),
            (CUE['triple'], 1.0)]
DUCK_DRM = DUCK_MUS + [(CUE['clack'], 1.0)]

# Scene faders (dB) per bus family: the coarse balance of the film. The arc it encodes (post-master, short-term):
# hook ~-14 with the stamp on top, gags ~-13, the tender turn ~6 LU under the gags, the finale loudest, end card ~-16.
FADER = {
    's1': dict(mus=0.0, drm=2.0, sfx=2.0, big=4.0),
    's2': dict(mus=2.0, drm=2.5, sfx=2.5, big=2.0),
    's3': dict(mus=2.0, drm=2.5, sfx=2.5, big=2.0),
    's4': dict(mus=-7.0, drm=-4.0, sfx=-1.0, big=0.0),
    's5': dict(mus=0.0, drm=0.0, sfx=1.0, big=6.5),
    's6': dict(mus=-2.5, drm=0.0, sfx=0.0, big=5.0),
    's7': dict(mus=-4.0, drm=-3.0, sfx=-1.0, big=0.0),
}

SECTIONS = [('s1 hook', 0.0, 2.8), ('s2 city', 2.8, 5.2), ('s3 gag safai', 5.2, 7.6), ('s3 gag diet', 7.6, 10.0),
            ('s3 gag van', 10.0, 12.4), ('s4 turn', 12.4, 16.0), ('s5 fully booked', 16.0, 18.4),
            ('s6 mark', 18.4, 20.8), ('s7 end card', 20.8, 24.4)]

# =====================================================================================================================
# NOTES / LEVEL HELPERS
# =====================================================================================================================
_PC = {'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11}


def m(name):
    """'C#5' -> MIDI note number"""
    if not isinstance(name, str):
        return int(name)
    return 12 * (int(name[-1]) + 1) + _PC[name[:-1]]


def hz(name):
    return midi_hz(m(name))


def db(x):
    return 10.0 ** (x / 20.0)


def peak1(x):
    return x / (np.max(np.abs(x)) + 1e-12)


def stereo(x):
    x = np.asarray(x, float)
    return x if x.ndim == 2 else np.vstack([x, x])


def pan_stereo(sig, pan=0.0):
    """mono -> constant-power pan (centre = unity per channel); stereo -> balance."""
    sig = np.asarray(sig, float)
    if sig.ndim == 2:
        return np.vstack([sig[0] * min(1.0, 1 - pan), sig[1] * min(1.0, 1 + pan)])
    th = (np.clip(pan, -1, 1) + 1) * np.pi / 4
    return np.vstack([sig * np.cos(th), sig * np.sin(th)]) * np.sqrt(2)


def pan_sweep(sig, p0, p1):
    sig = np.asarray(sig, float)
    if sig.ndim == 2:
        sig = sig.mean(0)
    th = (np.clip(np.linspace(p0, p1, len(sig)), -1, 1) + 1) * np.pi / 4
    return np.vstack([sig * np.cos(th), sig * np.sin(th)]) * np.sqrt(2)


def layer(*items):
    """sum of (sig, gain_db[, offset_s[, pan]]) as one stereo array"""
    parts = []
    for it in items:
        sig, g = it[0], it[1]
        off = it[2] if len(it) > 2 else 0.0
        pan = it[3] if len(it) > 3 else 0.0
        parts.append((int(round(off * SR)), pan_stereo(sig, pan) * db(g)))
    n = max(a + s.shape[1] for a, s in parts)
    out = np.zeros((2, n))
    for a, s in parts:
        out[:, a:a + s.shape[1]] += s
    return out


def hpf(x, f=150, width=.3):
    x = np.asarray(x, float)
    return np.vstack([fft_filter(c, lo=f, width=width) for c in x]) if x.ndim == 2 else fft_filter(x, lo=f, width=width)


def lpf(x, f, width=.3):
    x = np.asarray(x, float)
    return np.vstack([fft_filter(c, hi=f, width=width) for c in x]) if x.ndim == 2 else fft_filter(x, hi=f, width=width)


def bpf(x, lo, hi, width=.3):
    x = np.asarray(x, float)
    if x.ndim == 2:
        return np.vstack([fft_filter(c, lo=lo, hi=hi, width=width) for c in x])
    return fft_filter(x, lo=lo, hi=hi, width=width)


def lp_sweep(x, f0, f1, t_sweep, frame=2048):
    """time-varying low-pass: cutoff glides exponentially f0 -> f1 over t_sweep seconds, then stays open."""
    if x.ndim == 2:
        return np.vstack([lp_sweep(c, f0, f1, t_sweep, frame) for c in x])
    n = len(x)
    hop = frame // 4
    win = np.hanning(frame)
    out = np.zeros(n + frame)
    norm = np.zeros(n + frame)
    xp = np.concatenate([x, np.zeros(frame)])
    f = np.fft.rfftfreq(frame, 1 / SR)
    for i in range(0, n, hop):
        p = np.clip((i + frame / 2) / SR / t_sweep, 0, 1)
        fc = f0 * (f1 / f0) ** p
        mask = 1 / np.sqrt(1 + (f / fc) ** 6)
        seg = xp[i:i + frame] * win
        out[i:i + frame] += np.fft.irfft(np.fft.rfft(seg) * mask, frame) * win
        norm[i:i + frame] += win ** 2
    return out[:n] / np.maximum(norm[:n], 1e-3)


# =====================================================================================================================
# SOURCES: real samples, tuned samples, GM parts
# =====================================================================================================================
def smp(inst, contains='', rr=0, semis=0.0, max_len=None, fade_out=.04, thresh=.03):
    """real CC0 sample, onset-trimmed (so the transient lands on the frame) and peak-normalised to 1."""
    x = sample_hit(inst, contains, rr=rr, semis=semis)
    env = np.max(np.abs(x), axis=0)
    pk = float(env.max()) + 1e-12
    i0 = max(0, int(np.argmax(env > pk * thresh)) - int(.001 * SR))
    x = x[:, i0:] / pk
    if max_len is not None:
        n = min(x.shape[1], int(max_len * SR))
        x = x[:, :n].copy()
        f = min(n, int(fade_out * SR))
        x[:, n - f:] *= np.linspace(1, 0, f) ** 2
    return x


def _tuned(inst, target, layer_filter='', max_len=None):
    """hand_chimes / glockenspiel sound an octave above their file names; pick the nearest file and resample."""
    best = None
    for fn in list_samples(inst):
        if layer_filter and layer_filter not in fn:
            continue
        nm = fn.split('_')[1] if inst == 'hand_chimes' else fn.split('_')[2]
        sounding = m(nm) + 12
        d = abs(target - sounding)
        if best is None or d < best[0]:
            best = (d, fn, sounding)
    _, fn, sounding = best
    return smp(inst, fn, semis=target - sounding, max_len=max_len)


def chime(name, max_len=3.0):
    """real hand-chime (soft bell) at a pitch"""
    return _tuned('hand_chimes', m(name), max_len=max_len)


def glock(name, max_len=2.0):
    return _tuned('glockenspiel', m(name), layer_filter='medium', max_len=max_len)


def gm(inst, notes, t0, length, bends=None, cc=None, bend_range=2, drums=False, kit='standard', volume=110, snap=True):
    """render a GM part with ABSOLUTE note times starting at t0 (frame-snapped unless snap=False, e.g. strums and
    tremolos anchored on a frame). notes: (t, 'D5'|midi, len, vel)."""
    t0 = q(t0)
    rel = [((q(t) if snap else t) - t0, m(n), ln, v) for (t, n, ln, v) in notes]
    b = [(t - t0, s) for (t, s) in (bends or [])]
    c = [(t - t0, k, v) for (t, k, v) in (cc or [])]
    prog = GM[inst] if isinstance(inst, str) else int(inst)
    return gm_render(prog, rel, length, bends=b, cc=c, drums=drums, kit=kit, bend_range=bend_range, volume=volume)


def bend_path(points, step=.008):
    """[(t, semis), ...] -> dense pitch-bend events with smoothstep glides (equal times = jump)."""
    out = []
    for (ta, sa), (tb, sb) in zip(points[:-1], points[1:]):
        if sa == sb or tb - ta < 1e-4:
            out.append((ta, sa))
            continue
        k = max(2, int((tb - ta) / step))
        for i in range(k):
            u = i / k
            out.append((ta + (tb - ta) * u, sa + (sb - sa) * u * u * (3 - 2 * u)))
    out.append(points[-1])
    return out


def ramp_cc(t0, t1, v0, v1, ctl=11, step=.03):
    k = max(1, int((t1 - t0) / step))
    return [(t0 + (t1 - t0) * i / k, ctl, int(round(v0 + (v1 - v0) * i / k))) for i in range(k + 1)]


# =====================================================================================================================
# SOUND DESIGN BUILDING BLOCKS (mono unless noted; peak ~1)
# =====================================================================================================================
def body(f=180, dur=.3, decay=.07, drop=1.25):
    """phone-speaker body: short pitched thump in the 120-250 Hz band (+2nd/3rd harmonics)."""
    t = tt(dur)
    fr = f * (1 + (drop - 1) * np.exp(-t / .02))
    ph = TAU * np.cumsum(fr) / SR
    x = (np.sin(ph) + .3 * np.sin(2 * ph) + .12 * np.sin(3 * ph)) * np.exp(-t / decay)
    return fade(peak1(x), .0005, .01)


def tick(dur=.015, lo=2000, hi=4500, decay=None, seed=0):
    """2-4 kHz attack transient"""
    t = tt(dur)
    return peak1(fft_filter(noise(dur, seed), lo, hi) * np.exp(-t / (decay or dur / 4)))


def square(freq, dur, hmax=6000):
    n = n_samples(dur)
    fr = np.broadcast_to(np.asarray(freq, float), (n,)) if np.ndim(freq) else np.full(n, float(freq))
    ph = TAU * np.cumsum(fr) / SR
    K = int(hmax / max(fr.max(), 20))
    return sum(np.sin(k * ph) / k for k in range(1, K + 1, 2)) * 4 / np.pi


def saw(freq, dur, hmax=6000):
    n = n_samples(dur)
    fr = np.broadcast_to(np.asarray(freq, float), (n,)) if np.ndim(freq) else np.full(n, float(freq))
    ph = TAU * np.cumsum(fr) / SR
    K = int(hmax / max(fr.max(), 20))
    return sum(np.sin(k * ph) / k for k in range(1, K + 1)) * 2 / np.pi


def env_ar(dur, a=.005, r=.02):
    t = tt(dur)
    return np.clip(t / max(a, 1e-4), 0, 1) * np.clip((dur - t) / max(r, 1e-4), 0, 1)


# ---- s1 ------------------------------------------------------------------------------------------------------------
def tubelight_hum(t_abs, dur):
    """mains hum on ABSOLUTE time (100 Hz x 24.4 s = 2440 whole cycles, so the loop seam is phase-continuous)."""
    t = t_abs + tt(dur)
    x = (np.sin(TAU * 100 * t) + .6 * np.sin(TAU * 200 * t) + .22 * np.sin(TAU * 300 * t)
         + .14 * np.sin(TAU * 400 * t + .5) + .06 * np.sin(TAU * 600 * t + 1.1))
    fizz = fft_filter(noise(dur, 77), 2500, 6000) * (np.abs(np.sin(TAU * 50 * t)) ** 8) * .25  # ballast fizz
    return x / 2.0 + fizz


def flicker_tink(seed=0):
    """tubelight starter 'tink': phone-UI tap + a 3 kHz band-passed tick"""
    return peak1(S.ui_tap(seed) + np.pad(tick(.02, 2600, 3400, .004, seed) * .8, (0, n_samples(.06) - n_samples(.02))))


def tzzt(dur=.06):
    x = bpf(square(100, dur, 4000), 150, 4000) * env_ar(dur, .004, .015)
    return peak1(x)


def ink_pops(seed=3):
    r = rng(seed)
    out = np.zeros((2, n_samples(.25)))
    for i in range(8):
        a = int(r.uniform(0, .167) * SR)
        p = S.pop(2400 * r.uniform(.9, 1.15), 2600, .03, seed + i) * r.uniform(.5, 1)
        s = pan_stereo(p, r.uniform(-.3, .3))
        out[:, a:a + s.shape[1]] += s[:, :out.shape[1] - a]
    return out


def pen_scratch(dur, seed=0):
    t = tt(dur)
    x = fft_filter(pink(dur, seed), 2000, 5000)
    r = rng(seed).uniform(.15, 1, int(dur * 16) + 3)
    e = np.interp(t, np.linspace(0, dur, len(r)), r) * np.sin(np.pi * np.clip(t / dur, 0, 1)) ** .4
    grain = 1 + .5 * fft_filter(noise(dur, seed + 1), 30, 200)
    return fade(peak1(x * e * grain), .01, .03)


def flame_flutter(dur=.2, seed=0):
    t = tt(dur)
    x = fft_filter(noise(dur, seed), 150, 900) * (1 + .6 * np.sin(TAU * 17 * t)) * np.sin(np.pi * t / dur)
    return fade(peak1(x), .005, .02)


def stamp_thud(root='D3', hero=False, seed=0):
    """BOOKED stamp. hero: sub + chunk + knock + paper slap + frame drum + bass drum + darbuka + dhol DHA (stereo)."""
    f = hz(root)
    items = [
        (S.sub_boom(.9 if hero else .45, 58 if hero else 62, 38 if hero else 42, seed), -13 if hero else -14),
        (body(f, .35, .09, 1.3), 0),                           # 120-250 Hz body (tuned)
        (body(f * 2, .15, .03, 1.1), -5),                      # rubber 'chunk' (~300 Hz, phones)
        (S.tabla_ke(.12, seed), -5),                           # wood knock
        (tick(.03, 2000, 6000, .005, seed), -5),               # paper slap
        (tick(.012, 2500, 4200, .003, seed + 1), -6),          # 2-4 kHz attack
        (smp('darbuka', 'Darbuka_1_hit_vl2', rr=seed, semis=12 * np.log2(f / 143.0), max_len=.6), -2),
    ]
    if hero:
        items += [
            (smp('frame_drum', 'HDrumL_Hit_v3', rr=seed, max_len=1.2), 0),
            (smp('bass_drum_1', 'v7', rr=seed, max_len=1.0), -10),
            (smp('darbuka', 'Darbuka_2_hit_vl2', rr=seed, max_len=.4), -6),
            (S.dhol_boom(68, .7, seed), -10),
            (S.tabla_na(hz('D5'), .5, seed), -12),
        ]
    return peak1(layer(*items))


# ---- s2 / s3 ---------------------------------------------------------------------------------------------------------
def blip8(notes_hz, step=.022, dur=.07):
    """8-bit LED blip: a square-wave arpeggio"""
    t = tt(dur)
    idx = np.minimum((t / step).astype(int), len(notes_hz) - 1)
    fr = np.asarray(notes_hz, float)[idx]
    return fade(peak1(bpf(square(fr, dur, 7000), 300, 7000) * np.exp(-t / .035)), .001, .01)


def whoosh(dur, f0, f1, seed=0, p0=0.0, p1=0.0):
    w = S.whoosh(dur, f0, f1, seed)
    return pan_sweep(w, p0, p1) if (p0 or p1) else stereo(w)


def wood_clack(f=190, seed=0):
    d = .12
    t = tt(d)
    x = np.sin(TAU * f * t) * np.exp(-t / .02) + .8 * fft_filter(noise(d, seed), 1200, 4000) * np.exp(-t / .008)
    x += .4 * np.sin(TAU * f * 5.3 * t) * np.exp(-t / .01)
    return fade(peak1(x), .0003, .01)


def slat_clatter(n=16, span=.133, seed=5):
    """16 tri-vision slats turning left->right"""
    out = np.zeros((2, n_samples(span + .15)))
    r = rng(seed)
    for i in range(n):
        a = int(i / (n - 1) * span * SR)
        c = wood_clack(r.uniform(170, 260), seed + i) * r.uniform(.45, 1)
        s = pan_stereo(c, -.4 + .8 * i / (n - 1))
        out[:, a:a + s.shape[1]] += s[:, :out.shape[1] - a]
    whirr = sweep_filter(noise(span + .15, seed), 900, 2600, 1.4) * np.sin(np.pi * np.clip(tt(span + .15) / (span + .15), 0, 1))
    return peak1(out + stereo(whirr) * .25)


def jhadu(dur=.12, seed=0):
    t = tt(dur)
    x = sweep_filter(noise(dur, seed), 1000, 4000, 1.5) * np.sin(np.pi * t / dur) ** .7
    x *= 1 + .6 * fft_filter(noise(dur, seed + 9), 40, 300)        # bristles
    return fade(peak1(x), .003, .01)


def back_crack(seed=0):
    """'krrk' (5 micro-clicks) + a drooping bayan"""
    out = np.zeros(n_samples(.6))
    for i, (o, a) in enumerate([(0, 1), (.008, .7), (.019, .9), (.03, .5), (.046, .6)]):
        c = tick(.006, 900, 4500, .0012, seed + i) * a
        k = int(o * SR)
        out[k:k + len(c)] += c
    ge = S.tabla_ge(95, .55, bend=.62, seed=seed)
    out[:len(ge)] += ge * .8
    return peak1(out)


def led_buzz(dur=.133):
    t = tt(dur)
    x = bpf(square(120, dur, 3000), 150, 3000) * .7 + .35 * np.sin(TAU * 2400 * t)
    x *= env_ar(dur, .01, .03) * (1 + .3 * np.sin(TAU * 30 * t))
    return peak1(x)


def kaju_tin(name, seed=0):
    """kaju katli landing: tuned tabla tin + its chime pitch + a soft darbuka touch"""
    f = hz(name)
    return peak1(layer((S.tabla_tin(f / 2, .35, seed), 0), (S.chime(f, .6, seed) * np.exp(-tt(.6) / .12), -6),
                       (smp('darbuka', 'Darbuka_5_hit_vl1', rr=seed, max_len=.3), -11)))


def crumble(dur=.3, seed=0):
    """bit-crushed LED dots crumbling"""
    x = noise(dur, seed)
    x = np.repeat(x[::14], 14)[:len(x)]
    x = np.round(x * 2.5) / 2.5
    t = tt(dur)
    gates = (rng(seed + 1).uniform(0, 1, int(dur * 60) + 2) > .35).astype(float)
    g = np.repeat(gates, int(SR / 60) + 1)[:len(t)]
    x = fft_filter(x, 400, 7000) * g * np.exp(-t / .12)
    blips = np.zeros(len(t))
    for i, nm in enumerate(['A6', 'F#6', 'D6', 'A5', 'F#5']):          # dots falling
        b = blip8([hz(nm)], dur=.04) * (1 - i * .12)
        k = int(i * .05 * SR)
        blips[k:k + len(b)] += b[:len(t) - k]
    return fade(peak1(x + blips * .5), .002, .03)


def womp_synth(dur=.34):
    t = tt(dur)
    fr = 400 * (120 / 400) ** ((t / dur) ** .8) * (1 + .02 * np.sin(TAU * 6 * t))
    x = lpf(saw(fr, dur, 2500), 1400) * env_ar(dur, .02, .08)
    return peak1(x)


def van_putter(dur=.3, seed=0):
    t = tt(dur)
    rate = 24 * (9 / 24) ** (t / dur)
    pulses = (np.sin(TAU * np.cumsum(rate) / SR) * .5 + .5) ** 5
    eng = saw(70 * (45 / 70) ** (t / dur), dur, 1600)
    nz = fft_filter(noise(dur, seed), 60, 1000)
    x = (eng * .7 + nz * .7) * (.3 + .7 * pulses) * np.clip(t / .04, 0, 1) * np.clip((dur - t) / .03, 0, 1)
    return peak1(x)


def brake_squeak(dur=.08):
    t = tt(dur)
    ph = TAU * np.cumsum(2800 * (1 + .012 * np.sin(TAU * 12 * t))) / SR
    return peak1((np.sin(ph) + .25 * np.sin(2 * ph)) * np.sin(np.pi * t / dur) ** .5)


def boing(dur=.45):
    """suspension 'sproing' (an octave above the storyboard's 110->90 Hz so phones can hear it)"""
    t = tt(dur)
    fr = 220 * (1 + .25 * np.exp(-t / .08)) * (1 - .18 * t / dur) * (1 + .07 * np.sin(TAU * 9 * t) * np.exp(-t / .25))
    ph = TAU * np.cumsum(fr) / SR
    return fade(peak1((np.sin(ph) + .5 * np.sin(2 * ph) + .3 * np.sin(3 * ph)) * np.exp(-t / .16)), .002, .03)


def horn_pom(name, dur=.09):
    f = hz(name)
    t = tt(dur)
    fr = f * (1 - .05 * np.exp(-t / .015))
    x = np.tanh(2.2 * (.6 * square(fr, dur, 5000) + .4 * saw(fr, dur, 5000)))
    return peak1(lpf(hpf(x, 200), 1200) * env_ar(dur, .006, .025))


def puff(dur=.12, seed=0):
    t = tt(dur)
    return peak1(fft_filter(noise(dur, seed), 200, 1600) * np.clip(t / .012, 0, 1) * np.exp(-t / .035))


def tirakita(t0, bus, g=0.0, room=.08, seed=0):
    """ti-ra-ki-ta on the 0.1 s sub-grid"""
    for i, (k, gg) in enumerate([('tin', -2), ('ka', -4), ('na', -3), ('ka', 0)]):
        bus.add(stroke(k, rr=seed + i), t0 + .1 * i, g + gg, pan=-.1 + .07 * i, room=room)


# ---- s4 --------------------------------------------------------------------------------------------------------------
def relay_thunk(seed=0):
    t = tt(.05)
    ring = (np.sin(TAU * 3400 * t) + .6 * np.sin(TAU * 5150 * t)) * np.exp(-t / .012)
    return peak1(layer((S.sub_boom(.9, 80, 40, seed), -4), (body(160, .35, .09), -1), (body(420, .08, .02), -8),
                       (tick(.006, 3000, 9000, .0015, seed), -5), (ring, -10),
                       (smp('frame_drum', 'HDrumL_HitMuted_v3', rr=seed, max_len=.6), -5)))


def power_down(dur=.5):
    t = tt(dur)
    fr = 1200 * (80 / 1200) ** ((t / dur) ** .7)
    ph = TAU * np.cumsum(fr) / SR
    x = (np.sin(ph) + .3 * np.sin(2 * ph) + .15 * np.sin(3 * ph)) * (1 - t / dur) ** 1.3
    zap = fft_filter(noise(dur, 41), 1000, 7000) * np.exp(-t / .02) * (np.sin(TAU * 100 * t) > 0)
    return fade(peak1(x + zap * .8), .001, .03)


def night_air(dur, seed=0):
    t = tt(dur)
    return fft_filter(pink(dur, seed), 120, 1500) * np.clip(t / .15, 0, 1) * np.clip((dur - t) / .5, 0, 1)


def cricket(seed=0):
    out = np.zeros(n_samples(.2))
    r = rng(seed)
    for i in range(3):
        d = .03
        t = tt(d)
        x = np.sin(TAU * 4500 * r.uniform(.99, 1.01) * t) * np.sin(np.pi * t / d) ** 2 * (1 + .5 * np.sin(TAU * 260 * t))
        k = int(i * .05 * SR)
        out[k:k + len(x)] += x
    return peak1(out)


def flame_whoomp(dur=.45, seed=0):
    t = tt(dur)
    e = np.clip(t / .09, 0, 1) ** 1.5 * np.exp(-np.maximum(t - .09, 0) / .12)
    nz = fft_filter(noise(dur, seed), 120, 1400)
    bod = np.sin(TAU * np.cumsum(glide(170, 95, dur, .25)) / SR)
    return fade(peak1((nz + .6 * bod) * e), .002, .05)


def ember_fizz(dur, f0=2000, f1=7000, seed=0):
    return fade(peak1(sweep_filter(S.sparkler(dur, seed), f0, f1, 1.5)), .02, .05)


def heartbeat(seed=0):
    return peak1(layer((S.dhol_boom(70, .6, seed), -3), (body(160, .25, .07), -3), (S.tabla_na(hz('D5'), .3, seed), -15),
                       (smp('darbuka', 'Darbuka_1_hit_vl1', rr=seed, max_len=.5), -5)))


def ghungroo(dur=.35, density=30, seed=0, real=-4):
    return peak1(layer((S.ghungroo(dur, density, seed), 0),
                       (smp('sleigh_bells', 'Sleighbells_Hit', rr=seed, max_len=dur + .25), real)))


def reverse_swell(dur=.6, seed=0):
    cym = smp('suspended_cymbal_1', 'hit_f1', max_len=1.4)[:, ::-1]
    cym = cym[:, -n_samples(dur):]
    cym = cym * np.clip(tt(dur) / dur, 0, 1) ** 1.5
    return peak1(layer((cym, 0), (S.riser(dur, 300, 7000, seed), -4)))


def whistle_fall(dur=.3):
    t = tt(dur)
    fr = 2400 * (900 / 2400) ** (t / dur) * (1 + .01 * np.sin(TAU * 11 * t))
    return fade(peak1(np.sin(TAU * np.cumsum(fr) / SR) * env_ar(dur, .02, .05)), .002, .02)


# ---- s5 / s6 ---------------------------------------------------------------------------------------------------------
def tape_stop(dur=.35):
    t = tt(dur)
    fr = 220 * (30 / 220) ** ((t / dur) ** .6)
    ph = TAU * np.cumsum(fr) / SR
    return peak1((np.sin(ph) + .5 * np.sin(2 * ph) + .25 * np.sin(3 * ph)) * np.exp(-t / .12))


def mega_stamp(seed=0):
    return peak1(layer(
        (S.sub_boom(1.3, 45, 30, seed), -13), (body(180, .45, .12, 1.3), 0), (body(hz('D3'), .4, .1), -2),
        (body(300, .15, .035, 1.1), -3),
        (S.dhol_boom(62, .8, seed), -13), (S.dhol_boom(68, .8, seed + 1), -13), (S.dhol_boom(76, .8, seed + 2), -14),
        (tape_stop(), -6), (smp('bass_drum_1', 'v7', rr=1, max_len=1.4), -8),
        (smp('frame_drum', 'HDrumL_Hit_v3', rr=1, max_len=1.4), 0), (smp('darbuka', 'Darbuka_1_hit_vl2', rr=1), 0),
        (smp('darbuka', 'Darbuka_2_hit_vl2', rr=1, max_len=.4), -6), (tick(.03, 2000, 6000, .006, seed), -5),
        (tick(.012, 2500, 4200, .003, seed + 1), -6),
        (smp('suspended_cymbal_1', 'hit_fff1', max_len=2.4, fade_out=.8), -13),
        (smp('gong_1', 'gong_f', max_len=2.2, fade_out=.9), -16)))


def burst(size=1.0, crackle_dur=1.2, seed=0):
    return peak1(layer((hpf(S.firework_burst(size, crackle_dur, seed), 90, .5), -2), (body(140, .35, .1), -3),
                       (body(260, .15, .04), -6), (tick(.03, 1200, 5000, .008, seed), -3)))


def city_echo(x, delay=.23, g=-10, lp=2500):
    """open-air slap-back off the buildings"""
    y = lpf(stereo(x), lp)
    return np.pad(y, ((0, 0), (n_samples(delay), 0))) * db(g)


def launch(dur=.6, f_end=2400, seed=0):
    return S.firework_launch(dur, f_end / 2.6, f_end, True, seed)


def launch_whistle(target, dur=.6, seed=0):
    t = tt(dur)
    fr = glide(target / 2.4, target, dur, dur * .78) * (1 + .004 * np.sin(TAU * 21 * t))
    tone = np.sin(TAU * np.cumsum(fr) / SR) * np.clip(t / .08, 0, 1)
    hiss = sweep_filter(noise(dur, seed), 2500, 6000, 2.0) * (.3 + .7 * t / dur)
    thump = fft_filter(noise(dur, seed + 1), hi=900) * np.exp(-t / .01)
    return fade(peak1(tone * .7 + hiss * .35 + thump * .6), .001, .03)


def clack_hit(seed=0):
    """18.400 CLACK: crisp wood + sub drop + body; metallic snap 1 frame later."""
    wood = gm(0, [(0.0, DRUM['claves'], .1, 120), (0.0, DRUM['hi_wood'], .1, 110)], 0.0, .4, drums=True)
    snap_t = tt(.04)
    snap = layer((smp('finger_cymbals', 'Fing', max_len=.35, fade_out=.2), 0),
                 (tick(.004, 4000, 10000, .001, seed), -4), ((np.sin(TAU * 2900 * snap_t) * np.exp(-snap_t / .01)), -8))
    return peak1(layer((peak1(wood), -1), (wood_clack(240, seed), -4), (S.sub_boom(.8, 70, 35, seed), -5),
                       (body(180, .3, .08), -2), (snap, -6, q(CUE['snap']) - CUE['clack'])))


# =====================================================================================================================
# DHOLAK / TABLA / DHOL STROKES (stereo, real darbuka samples layered with the synth tabla)
# =====================================================================================================================
_STROKES = {}


def stroke(kind, rr=0):
    key = (kind, rr % 4)
    if key in _STROKES:
        return _STROKES[key]
    r = rr % 2
    if kind == 'ge':        # bass, with the bayan glide
        x = layer((smp('darbuka', 'Darbuka_1_hit_vl2', rr=r, max_len=.7), 0), (S.tabla_ge(78, .6, 1.3, rr), -6),
                  (body(150, .2, .06), -8))
    elif kind == 'ge_s':
        x = layer((smp('darbuka', 'Darbuka_1_hit_vl1', rr=r, max_len=.6), 0), (S.tabla_ge(78, .5, 1.25, rr), -7))
    elif kind == 'na':      # open treble, rings on Sa
        x = layer((smp('darbuka', 'Darbuka_2_hit_vl2', rr=r, max_len=.5), 0),
                  (S.tabla_na(hz('D5'), .3, rr) * np.exp(-tt(.3) / .09), -11))
    elif kind == 'tin':     # closed treble
        x = layer((smp('darbuka', 'Darbuka_4_hit_vl2', rr=r, max_len=.35), -1), (S.tabla_tin(hz('D5') / 2, .25, rr), -9))
    elif kind == 'ka':      # flat slap
        x = layer((smp('darbuka', 'Darbuka_3_hit_vl2', rr=r, max_len=.3), 0), (S.tabla_ke(.12, rr), -8))
    elif kind == 'ghost':
        x = layer((smp('darbuka', 'Darbuka_5_hit_vl1', rr=r, max_len=.25), 0),)
    elif kind == 'dha':
        x = layer((stroke('ge', rr), 0), (stroke('na', rr), -1))
    elif kind == 'dhi':
        x = layer((stroke('ge', rr), 0), (stroke('tin', rr), -2))
    elif kind == 'dhol':    # dhol bass side (dagga): synth boom + real kick body + 150 Hz body + slap
        x = layer((S.dhol_boom(70, .6, rr), -5), (smp('bass_drum_1', 'v5', rr=r, max_len=.6), -7),
                  (body(150, .3, .07), -3), (tick(.012, 2200, 4500, .003, rr), -12))
    elif kind == 'tik':     # dhol treble stick
        x = layer((S.dhol_tik(.15, rr), 0),)
    elif kind == 'clap':
        x = layer((smp('claps', f'Clap_rr{1 + rr % 6}', max_len=.45), 0), (S.clap(.2, rr), -9))
    elif kind == 'manjira':
        x = layer((smp('finger_cymbals', 'Fing', max_len=.45, fade_out=.3), 0),)
    elif kind == 'shaker':
        x = layer((smp('shaker_small', ['Mid_ShakerHighFaster_Down', 'Mid_ShakerHighFaster_Up'][rr % 2], rr=rr // 2,
                       max_len=.2), 0),)
    else:
        raise KeyError(kind)
    _STROKES[key] = peak1(x)
    return _STROKES[key]


def keherwa_bar(bus, t0, energy=1, mutes=(), gdb=0.0, room=.07, hall=0.0, seed=0, clap=True):
    """one bar of keherwa on 8ths (dha ge na tin | na ka dhi na) + dhol, ghosts, shaker, claps, manjira, ghungroo."""
    def s(k):
        return q(t0 + S16 * k)

    def put(sig, k, g, pan=0.0):
        tk = s(k)
        if any(a - 1e-6 <= tk < b - 1e-6 for a, b in mutes):
            return
        bus.add(sig, tk, g + gdb, pan, room=room, hall=hall)

    for i, (bol, g) in enumerate([('dha', -5), ('ge', -11), ('na', -3), ('tin', -6), ('na', -3), ('ka', -5),
                                  ('dhi', -7), ('na', -4)]):
        put(stroke(bol, seed + i), 2 * i, g - 4, pan=-.12)
    for k in ((3, 7, 11, 15) if energy < 2 else (1, 3, 5, 7, 9, 11, 13, 15)):
        put(stroke('ghost', seed + k), k, -19 if energy < 2 else -17, pan=-.2)
    put(stroke('dhol', seed), 0, -3, pan=.08)
    put(stroke('dhol', seed + 1), 8, -6, pan=.08)
    for k in (2, 6, 10, 14):
        put(stroke('tik', seed + k), k, -15, pan=.25)
    if energy >= 2:
        for k in (13, 15):
            put(stroke('dhol', seed + k), k, -11, pan=.08)
        for k in (5, 9):
            put(stroke('tik', seed + k), k, -19, pan=.25)
    for k in range(0, 16, 2 if energy < 2 else 1):
        put(stroke('shaker', seed + k), k, (-21 if k % 4 == 0 else -18) + (1 if energy >= 2 else 0), pan=.3)
    if clap:
        for k in (4, 12):
            put(stroke('clap', seed + k), k, -12 if energy < 2 else -8, pan=-.05)
            put(stroke('manjira', seed + k), k, -21 if energy < 2 else -17, pan=-.35)
    put(ghungroo(.25, 25, seed), 14, -21 if energy < 2 else -17, pan=.35)


BASS_BAR = [(0, 'D2', .5, 104), (3, 'D3', .2, 84), (4, 'A2', .45, 96), (6, 'B2', .25, 86), (7, 'C#3', .25, 92)]


def bass_notes(t0, mutes=()):
    out = []
    for k8, nm, ln, v in BASS_BAR:
        t = q(t0 + E8 * k8)
        if not any(a - 1e-6 <= t < b - 1e-6 for a, b in mutes):
            out.append((t, nm, ln, v))
    return out


# =====================================================================================================================
# BUSES, REVERB, ENVELOPES
# =====================================================================================================================
TAIL = 3.0
NTOT = n_samples(DUR + TAIL)


class Bus:
    def __init__(self, name):
        self.name = name
        self.dry = np.zeros((2, NTOT))
        self.room = np.zeros((2, NTOT))
        self.hall = np.zeros((2, NTOT))
        self.events = []        # (t_start, t_end_active, label) for the SFX-density audit

    def add(self, sig, t, g=0.0, pan=0.0, room=0.0, hall=0.0, snap=True, label=''):
        t = q(t) if snap else float(t)
        x = pan_stereo(sig, pan) * db(g)
        a = int(round(t * SR))
        if a < 0:
            x, a = x[:, -a:], 0
        k = min(x.shape[1], NTOT - a)
        if k <= 0:
            return
        x = x[:, :k]
        self.dry[:, a:a + k] += x
        if room:
            self.room[:, a:a + k] += x * room
        if hall:
            self.hall[:, a:a + k] += x * hall
        if label:
            env = np.max(np.abs(x), axis=0)
            act = np.nonzero(env > env.max() * db(-20))[0]
            on = (act[0] / SR) if len(act) else 0.0          # intrinsic onset latency of the sound itself
            self.events.append((t, t + (act[-1] if len(act) else 0) / SR, label, on))


class Trim:
    """a scene fader in front of a bus: add() forwards with g + trim"""

    def __init__(self, bus, trim):
        self.bus, self.trim, self.name = bus, trim, bus.name

    def add(self, sig, t, g=0.0, *a, **kw):
        self.bus.add(sig, t, g + self.trim, *a, **kw)


def scene(B, key, a='a'):
    f = FADER[key]
    return (Trim(B['mus_' + a], f['mus']), Trim(B['drm_' + a], f['drm']), Trim(B['sfx'], f['sfx']),
            Trim(B['big'], f['big']))


IR_ROOM = S.make_ir(.9, seed=21, damp_hz=7000)     # tight room for the comedy (RT60 ~ 0.9 s)
IR_HALL = S.make_ir(2.8, seed=7, damp_hz=5200)     # open-air festive hall (RT60 ~ 3 s)


def reverb(send, ir, pre=0.0, gain=1.0):
    if not np.any(send):
        return np.zeros_like(send)
    y = np.vstack([S.fft_convolve(send[c], ir[c])[:NTOT] for c in range(2)])
    if pre:
        y = np.pad(y, ((0, 0), (n_samples(pre), 0)))[:, :NTOT]
    return bpf(y, 170, 9000) * gain


def peq(x, f0, gain_db, width_oct=1.0):
    """FFT bell EQ (log-frequency gaussian)"""
    N = 1 << int(np.ceil(np.log2(x.shape[-1])))
    f = np.fft.rfftfreq(N, 1 / SR)
    g = db(gain_db * np.exp(-.5 * ((np.log2(np.maximum(f, 1)) - np.log2(f0)) / (width_oct / 2.355)) ** 2))
    return np.vstack([np.fft.irfft(np.fft.rfft(c, N) * g, N)[:x.shape[-1]] for c in x])


def low_shelf(x, fc, gain_db):
    N = 1 << int(np.ceil(np.log2(x.shape[-1])))
    f = np.fft.rfftfreq(N, 1 / SR)
    g = db(gain_db / (1 + (f / fc) ** 2))
    return np.vstack([np.fft.irfft(np.fft.rfft(c, N) * g, N)[:x.shape[-1]] for c in x])


def env_db(points, n=NTOT):
    """piecewise-linear gain envelope from [(t, dB)] (held outside the range) -> linear multiplier"""
    ts = np.array([p[0] for p in points])
    ds = np.array([p[1] for p in points])
    t = np.arange(n) / SR
    return db(np.interp(t, ts, ds))


def duck_env(events, depth, attack=.012, hold=.22, release=.5, n=NTOT):
    t = np.arange(n) / SR
    d = np.zeros(n)
    for (t0, k) in events:
        dd = depth * k
        seg = np.where(t < t0 - attack, 0,
                       np.where(t < t0, -dd * (t - t0 + attack) / attack,
                                np.where(t < t0 + hold, -dd, -dd * np.clip(1 - (t - t0 - hold) / release, 0, 1))))
        d = np.minimum(d, seg)
    return db(d)


def gate_env(closings, n=NTOT):
    """closings: [(t_close, t_open or None, fade_close, fade_open)] -> 0..1 multiplier"""
    t = np.arange(n) / SR
    g = np.ones(n)
    for (tc, to, fc, fo) in closings:
        a = np.clip(1 - (t - tc) / fc, 0, 1)
        if to is not None:
            a = np.maximum(a, np.clip((t - to + fo) / fo, 0, 1))
        g = np.minimum(g, a)
    return g


# =====================================================================================================================
# THE SCORE, scene by scene
# =====================================================================================================================
def s1_hook(B):
    mus, drm, sfx, big = scene(B, 's1')
    # --- tubelight: hum follows the lamp intensity (dip/flicker), ducks under the stamp, fades 2.2-2.6
    hum = tubelight_hum(0.0, 2.7)
    lamp = [(0, 1.0), (.067, .35), (.133, .9), (.2, .4), (.267, 1.0), (.4, 1.0), (.42, .3), (.7, .32), (.75, .5),
            (2.2, .5), (2.6, 0.0)]
    lt = tt(2.7)
    hum *= np.interp(lt, [p[0] for p in lamp], [p[1] for p in lamp])
    sfx.add(hum, CUE['hum_in'], -27, room=.02)
    for i, tf in enumerate(CUE['flicker']):
        sfx.add(flicker_tink(i), tf, -21, pan=.15, room=.05, label='flicker')
    sfx.add(tzzt(), CUE['tzzt'], -24, pan=.15, room=.03)
    sfx.add(S.crackle(1.2, 25, seed=11), 0.0, -31, pan=-.3, room=.1)                       # distant crackle bed

    # --- shehnai pickup (mangal vadya), C#5 -> E5 -> D5 meend, then the flourish after the stamp
    pick = gm('shehnai', [(0.0, 'D5', .40, 104)], 0.0, 1.0, bend_range=2,
              bends=bend_path([(0.0, -1), (.10, -1), (.14, 2), (.235, 2), (.275, 0), (.40, 0)]),
              cc=ramp_cc(0, .33, 96, 124) + [(.36, 11, 90)])
    mus.add(peak1(pick), 0.0, -12, pan=.05, room=.16, snap=False)
    fl_t = CUE['ink']                                   # 0.433: one frame after the impact
    flour = gm('shehnai', [(fl_t, 'A5', .555, 108), (CUE['for_you'], 'D5', .62, 92)], fl_t, 1.4, bend_range=7,
               bends=bend_path([(fl_t, -3), (fl_t + .06, 0), (.78, 0), (.80, 2), (.835, 2), (.865, 0),
                                (.90, -1), (.935, -3), (.97, -5), (CUE['for_you'] - .001, -5), (CUE['for_you'], 0),
                                (1.6, 0)]),
               cc=ramp_cc(fl_t, .7, 110, 127) + ramp_cc(1.0, 1.62, 112, 30))
    mus.add(peak1(flour), fl_t, -13.5, pan=-.05, room=.18)

    # --- BOOKED stamp: the hero THUD
    big.add(whoosh(.167, 3000, 600, seed=2), CUE['stamp_drop'], -17, room=.05, label='stamp whoosh')
    big.add(stamp_thud('D3', hero=True, seed=0), CUE['stamp'], 0, room=.10, label='STAMP')
    sfx.add(ink_pops(), CUE['ink'], -25, room=.06, label='ink pops')
    sfx.add(flicker_tink(5), CUE['ink'] + 1 / FPS, -24, pan=.15)

    # --- glue: soft bowed strings (high-passed), 'for you' santoor + glock sparkle, ghungroo, diya flare
    # (carries on under the s2 headline and swells into the sitar hook at 3.400)
    glue = gm('slow_strings', [(.45, 'A3', 3.0, 64), (.45, 'D4', 3.0, 66), (.45, 'F#4', 3.0, 58), (1.0, 'A4', 2.45, 56)],
              .45, 3.6, cc=[(.45, 11, 40)] + ramp_cc(.45, 1.6, 40, 92) + ramp_cc(1.6, 2.6, 92, 60)
              + ramp_cc(2.6, 3.35, 60, 100))
    mus.add(hpf(peak1(glue), 160), .45, -19, room=.2)
    santoor_phrase(mus, [(CUE['for_you'], 'D5'), (1.1, 'E5'), (1.2, 'F#5')], -8, pans=[-.15, 0, .15], room=.2)
    mus.add(glock('F#6'), 1.2, -15, pan=.2, room=.2)
    mus.add(glock('A6'), CUE['aapke_liye'] + 1 / FPS * 5, -20, pan=.25, room=.2)
    sfx.add(pen_scratch(.467, 1), CUE['for_you'], -24, pan=.1, room=.03, label='pen')
    sfx.add(ghungroo(.25, 20, 1), CUE['aapke_liye'], -19, pan=-.2, room=.1, label='ghungroo')
    drm.add(stroke('tin', 1), CUE['diya_flare'], -14, pan=.05, room=.1)
    sfx.add(flame_flutter(.2, 3), CUE['diya_flare'], -20, room=.05, label='flame')

    # --- into the groove
    sfx.add(stereo(S.riser(.6, 250, 6000, seed=4)), CUE['riser_hook'], -15, room=.05, label='riser')
    drm.add(stroke('ge', 2), CUE['ge_pick'], -8, room=.06)
    drm.add(stroke('ka', 3), CUE['ke_pick'], -10, room=.06)


def santoor_phrase(bus, notes, g, pans=None, room=0.0, hall=0.0, synth_db=-6, dur=1.8, vel=100):
    """santoor = sampled hammered dulcimer (GM 15) + the synth double-course santoor, both on the same frames."""
    if not notes:
        return
    t0 = min(t for t, _ in notes)
    vels = [vel] * len(notes)
    part = gm('dulcimer', [(t, nm, dur, v) for (t, nm), v in zip(notes, vels)], t0, dur + .5)
    bus.add(peak1(part), t0, g, room=room, hall=hall)
    for i, (t, nm) in enumerate(notes):
        p = pans[i] if pans else 0.0
        bus.add(S.santoor(hz(nm), dur, seed=i + int(t * 100)), t, g + synth_db, pan=p, room=room, hall=hall)


def s2_city(B):
    mus, drm, sfx, big = scene(B, 's2')
    # --- stamp cascade climbing D, D#, E (two boards each, panned)
    for i, (t, root, pp) in enumerate(zip(CUE['cascade'], ['D3', 'D#3', 'E3'], [.3, .4, .3])):
        big.add(stamp_thud(root, seed=i + 1), t, -6, pan=-pp, room=.08, label=f'cascade {root}')
        big.add(stamp_thud(root, seed=i + 4), t + 1 / FPS, -8, pan=pp, room=.08)
    sfx.add(blip8([900, 1200, 1500]), CUE['led_flip'], -17, pan=.25, room=.05, label='LED flip blip')

    # --- sitar hook: Ni Re Ga Re Sa (C#4 E4 F#4 E4 D4) with small meends
    h = CUE['hook']
    tn = [h, h + E8, h + 2 * E8, h + 3 * E8, h + 4 * E8]
    nm = ['C#4', 'E4', 'F#4', 'E4', 'D4']
    notes = [(tn[i], nm[i], .9 if i < 4 else 1.6, [100, 96, 108, 94, 104][i]) for i in range(5)]
    bends = bend_path([(h, 0), (q(tn[1]) - .001, 0), (q(tn[1]), -2), (q(tn[1]) + .06, 0), (q(tn[2]) - .001, 0),
                       (q(tn[2]), -1), (q(tn[2]) + .05, 0), (q(tn[3]), 0), (q(tn[4]) - .001, 0), (q(tn[4]), 1),
                       (q(tn[4]) + .08, 0), (h + 2.6, 0)])
    sit = gm('sitar', notes, h, 2.6, bends=bends, bend_range=2)
    mus.add(peak1(sit), h, -7, pan=-.08, room=.14)

    # --- all six boards pulse: ghungroo shimmer + chime D6
    sfx.add(ghungroo(.4, 30, 2), CUE['boards_pulse'], -19, pan=.2, room=.1, label='ghungroo')
    mus.add(chime('D6'), CUE['boards_pulse'], -16, pan=.15, room=.15)
    sfx.add(whoosh(.267, 400, 3500, seed=6, p0=-.3, p1=.3), CUE['whip1'], -14, room=.04, label='whip')
    sfx.add(slat_clatter(), CUE['slats'], -16, room=.05, label='slats')


def stinger(bus, t, chord, seed=0, g=-7, room=.14):
    """punchline stinger: sitar strum (12 ms) + short string stab (pre-shifted for the bow latency)"""
    strum = gm('sitar', [(q(t) + .012 * i, nm, .7, 112 - 4 * i) for i, nm in enumerate(chord)], t, 1.2, snap=False)
    bus.add(peak1(strum), t, g, pan=-.1, room=room, snap=False)
    stab = gm('strings', [(t, nm, .16, 118) for nm in chord[1:]], t, .6)
    bus.add(hpf(peak1(stab), 180), q(t) - .02, g - 5, pan=.1, room=room, snap=False)


def s3_gags(B):
    mus, drm, sfx, big = scene(B, 's3')
    # ------------------------------------------------ groove: bars 2-5 (2.8-12.4) with comic breaks and fills
    bars = [beat(4), beat(8), beat(12), beat(16)]
    mutes = {0: [], 1: [(CUE['fill1'], beat(12))],                                   # safai: tirakita on beat 4
             2: [(CUE['crumble'], beat(16))],                                       # diet: break under the womp
             3: [(q(CUE['huh']), beat(20))]}                                        # van: 'huh?' stop, then fill
    for i, t0 in enumerate(bars):
        keherwa_bar(drm, t0, energy=1, mutes=mutes[i], seed=10 * i)
    tirakita(CUE['fill1'], drm, -6, seed=1)
    tirakita(CUE['fill2'], drm, -4, seed=2)
    bn = []
    for i, t0 in enumerate(bars):
        bn += bass_notes(t0, mutes[i])
    bass = gm('bass_finger', bn, bars[0], 10.0, volume=120)
    bass = np.tanh(peak1(bass) * 1.3)                        # harmonics so the line survives on phone speakers
    mus.add(bass, bars[0], -18, room=.03)

    # ------------------------------------------------ gag 1: safai (tri-vision)
    g1 = CUE['gag1']
    big.add(stereo(wood_clack(200, 7)), g1, -6, room=.06, label='slat landing')       # the flip IS the reveal
    stinger(mus, g1, ['D3', 'A3', 'D4', 'F#4', 'A4'], 1)
    for i, tj in enumerate(CUE['jhadu']):
        sfx.add(jhadu(.12, i), tj, -16, pan=-.3 + .5 * i, room=.05, label='jhadu')
    sfx.add(stereo(S.twinkle([hz('D6'), hz('E6'), hz('F#6')], step=.067, dur_each=1.0, seed=3)),
            CUE['dust_twinkle'], -17, pan=.2, room=.15, label='twinkle')
    # the hook climbs (Ni Re Ga) ... and its back gives out on the 'हाफ़' crack
    ht = [beat(9), beat(9) + E8, CUE['back_crack']]
    hook2 = gm('sitar', [(ht[0], 'C#5', .3, 96), (ht[1], 'E5', .3, 100), (ht[2], 'F#5', .8, 112)], ht[0], 1.6,
               bend_range=4, bends=bend_path([(ht[0], 0), (ht[2] + .05, 0), (ht[2] + .3, -4), (ht[2] + 1.2, -4)]))
    mus.add(peak1(hook2), ht[0], -10, pan=.12, room=.14)
    sfx.add(back_crack(4), CUE['back_crack'], -9, room=.05, label='back crack')
    sfx.add(whoosh(.267, 400, 3500, seed=8, p0=-.3, p1=.3), CUE['whip2'], -14, room=.04, label='whip')
    sfx.add(led_buzz(), CUE['led_boot'], -19, pan=.1, room=.03, label='LED buzz')

    # ------------------------------------------------ gag 2: diet (LED screen)
    for i, (tb, nm) in enumerate(zip(CUE['word_blips'], ['A5', 'D6', 'F#6'])):
        sfx.add(blip8([hz(nm)], dur=.05), tb, -15, pan=-.2 + .2 * i, room=.03, snap=False, label='blip')
    tadaa = gm('sitar', [(CUE['tadaa'], 'A4', .12, 112), (q(CUE['tadaa']) + .1, 'D5', 1.1, 120)], CUE['tadaa'], 1.6)
    mus.add(peak1(tadaa), CUE['tadaa'], -8, pan=-.05, room=.14)
    stab = gm('strings', [(q(CUE['tadaa']) + .1, nm, .2, 120) for nm in ['F#4', 'A4', 'D5']], CUE['tadaa'], .8)
    mus.add(hpf(peak1(stab), 180), q(CUE['tadaa']) - .02, -16, pan=.1, room=.14, snap=False)
    sfx.add(smp('tambourine_1', 'Tamb1_Hit_v2', max_len=.4), q(CUE['tadaa']) + .1, -20, pan=.3, room=.05, snap=False)
    r = rng(17)
    for i, (tk, nm) in enumerate(zip(CUE['kaju'], ['E5', 'F#5', 'A5', 'G#5', 'B5', 'C#6', 'A5', 'D6'])):
        sfx.add(kaju_tin(nm, i), tk, -12, pan=r.uniform(-.4, .4), room=.1, label='kaju')
    sfx.add(stereo(crumble(.3, 5)), CUE['crumble'], -13, pan=.1, room=.05, label='crumble')
    womp = gm(57, [(CUE['crumble'], 'D4', .34, 110)], CUE['crumble'], .8, bend_range=12,
              bends=bend_path([(CUE['crumble'], 0), (CUE['crumble'] + .05, 0), (CUE['crumble'] + .3, -12)]))
    mus.add(layer((peak1(womp), 0), (womp_synth(), -8)), CUE['crumble'], -9, pan=-.05, room=.1)
    sfx.add(whoosh(.267, 400, 3500, seed=9, p0=-.3, p1=.3), CUE['whip3'], -15, room=.04, label='whip')
    sfx.add(van_putter(CUE['squeak'] - CUE['whip3'] - .02, 6), CUE['whip3'], -13, pan=-.25, room=.04, label='van putter')
    sfx.add(brake_squeak(.06), CUE['squeak'], -20, pan=-.1, room=.04, label='brake')

    # ------------------------------------------------ gag 3: the LED van
    toks = gm('woodblock', [(t, nm, .1, 110) for t, nm in zip(CUE['boxes'], ['D5', 'E5', 'F#5'])], CUE['boxes'][0], .6)
    sfx.add(peak1(toks), CUE['boxes'][0], -11, pan=.15, room=.06, label='box toks')
    for tb in CUE['boxes']:
        sfx.add(body(210, .12, .03), tb, -17, pan=.15)
    sfx.add(boing(), CUE['boing'], -17, pan=-.1, room=.05, label='boing')
    for i, (th, nm) in enumerate(zip(CUE['horn'], ['D4', 'A4'])):
        sfx.add(horn_pom(nm), th, -11, pan=-.1, room=.08, label='horn')
    # the band answers the horn's D-A an octave up (call and response; the logo's first two notes, foreshadowed)
    ans = gm('sitar', [(beat(17) + E8, 'D5', .25, 104), (q(beat(17) + E8 + S16), 'A5', .4, 110)], beat(17) + E8, 1.2)
    mus.add(peak1(ans), beat(17) + E8, -10, pan=.15, room=.12)
    for i, (th, nm) in enumerate(zip(CUE['hops'], ['G#5', 'A5', 'B5', 'C#6'])):
        sfx.add(kaju_tin(nm, 20 + i), th, -12, pan=.1 + .1 * i, room=.1, label='hop')
    sfx.add(layer((S.pop(700, 1400, .09, 3), 0), (puff(.12, 4), -6)), CUE['mystery_box'], -13, pan=.3, room=.06,
            label='mystery pop')
    huh = gm('sitar', [(CUE['huh'], 'D4', .5, 104)], CUE['huh'], 1.0, bend_range=12,
             bends=bend_path([(CUE['huh'], 0), (CUE['huh'] + .04, 0), (q(11.867), 7), (12.1, 7)]))
    mus.add(peak1(huh), CUE['huh'], -10, pan=-.1, room=.12)
    sfx.add(whoosh(.267, 600, 4000, seed=10), CUE['whip_up'], -13, room=.03, label='whip up')


def s4_turn(B):
    mus, drm, sfx, big = scene(B, 's4', 'b')
    tn = CUE['turn']
    # --- every ad dies: relay thunk + zap/power-down whine; the music bus A is hard-gated at 12.400
    big.add(relay_thunk(1), tn, -1, room=.06, hall=.12, label='RELAY THUNK')
    sfx.add(power_down(.5), tn, -13, pan=.1, room=.05, hall=.1, label='power down')
    sfx.add(stereo(night_air(1.8, 3)), tn, -35, room=.0)
    sfx.add(cricket(1), CUE['cricket'][0], -24, pan=.2, hall=.25, label='cricket')
    sfx.add(stereo(S.match_strike(5)), CUE['match'], -13, pan=-.05, hall=.12, label='match')

    # --- the diya: whoomp, ember arcs to the red tower
    d = CUE['diya']
    sfx.add(flame_whoomp(.45, 6), d, -13, hall=.2, label='diya whoomp')
    sfx.add(ember_fizz(.3, 2000, 7000, 7), d, -22, pan=0, hall=.15, label='ember')
    santoor_phrase(mus, [(d, 'D4')], -12, hall=.35, synth_db=-5)

    # --- tanpura (Sa = D) + synth pad + bowed strings, all high-passed
    tan = S.tanpura(hz('D3'), 3.8, cycle=1.2, seed=5)
    mus.add(lpf(hpf(tan, 90), 2500), d, -18, hall=.3)
    pad = S.pad([hz('D3'), hz('A3'), hz('F#4'), hz('E5'), hz('G#4')], 3.2, bright=.35, seed=2)
    mus.add(hpf(pad, 150), d, -18, hall=.35)
    sn = [(d, 'D4', 1.84, 70), (d, 'A4', 1.84, 64), (CUE['rings'][1], 'F#4', 1.24, 60),
          (CUE['strings_on'], 'E5', .64, 56),
          (CUE['late_window'], 'D4', .9, 76), (CUE['late_window'], 'F#4', .9, 72), (CUE['late_window'], 'A4', .9, 72),
          (CUE['late_window'], 'C#5', .9, 70), (CUE['late_window'], 'E5', .9, 74)]
    strings = gm('slow_strings', sn, d, 3.2, cc=[(d, 11, 45)] + ramp_cc(d, 14.8, 45, 100) + ramp_cc(15.1, 15.95, 96, 127))
    mus.add(hpf(peak1(strings), 150), d, -13, hall=.35)

    # --- bansuri: Ni Re Ga .. Re .. (the late-latif pause) .. Sa lands with the late window
    fl = [(d, 'C#5', .3, 92), (CUE['rings'][0], 'E5', .3, 96), (CUE['rings'][1], 'F#5', .9, 104),
          (CUE['rings'][4], 'E5', .32, 96), (CUE['late_window'], 'D5', .9, 108)]
    fbend = bend_path([(d, 1), (d + .07, 0), (CUE['late_window'] - .001, 0),          # Sa->Ni kan; Ni->Sa meend
                       (CUE['late_window'], -1), (CUE['late_window'] + .09, 0), (16.0, 0)])
    fcc = [(d, 11, 70)] + ramp_cc(d, d + .25, 70, 110) + ramp_cc(13.6, 14.2, 100, 124) + ramp_cc(14.2, 14.5, 124, 100) \
        + ramp_cc(15.1, 15.95, 104, 127) + [(d, 1, 0)] + ramp_cc(13.85, 14.4, 0, 60, ctl=1) + [(14.5, 1, 0)] \
        + ramp_cc(15.4, 15.9, 0, 50, ctl=1)
    flute = gm('flute', fl, d, 3.2, bends=fbend, cc=fcc, bend_range=2)
    shaku = gm('shakuhachi', fl, d, 3.2, bends=fbend, cc=fcc, bend_range=2)
    mus.add(layer((peak1(flute), 0), (peak1(shaku), -9)), d, -16, pan=-.08, hall=.32)

    # --- the light spreads: rising Yaman santoor plings, one per ring, widening; bell on the red tower
    rings = CUE['rings']
    names = ['D5', 'E5', 'F#5', 'G#5', 'A5', 'B5']
    pans = [0, -.12, .18, -.24, .3, -.3]
    santoor_phrase(mus, list(zip(rings, names)), -9, pans=pans, hall=.3, dur=1.5)
    mus.add(layer((chime('D5'), 0), (S.bell(hz('D5'), 2.5, .5, 3), -6)), rings[0], -14, hall=.35)
    for i, t in enumerate(CUE['heartbeat']):
        drm.add(heartbeat(i), t, -14, pan=0, hall=.15, label='heartbeat')
    sfx.add(ghungroo(.3, 15, 3), rings[3], -24, pan=-.25, hall=.2, label='ghungroo grains')
    sfx.add(cricket(2), CUE['cricket'][1], -25, pan=.35, hall=.25, label='cricket (late window)')
    sfx.add(pan_sweep(ember_fizz(.267, 2500, 6500, 8), 0, .35), CUE['ember_hop'], -24, hall=.1, label='ember hop')
    # --- 15.100: the late window pops on, brightest: santoor C#6 + glock + chime + ghungroo flick
    lw = CUE['late_window']
    santoor_phrase(mus, [(lw, 'C#6')], -6, pans=[.35], hall=.3, synth_db=-4, vel=120)
    mus.add(glock('C#7'), lw, -13, pan=.35, hall=.3)
    mus.add(chime('C#6'), lw, -13, pan=.3, hall=.3)
    sfx.add(ghungroo(.3, 35, 4), lw, -15, pan=.35, hall=.2, label='ghungroo flick')
    santoor_phrase(mus, [(rings[-1] + .6, 'D6')], -9, pans=[0], hall=.3)                  # 15.400 octave complete

    # --- into the stamp
    sfx.add(reverse_swell(.6, 9), CUE['riser_turn'], -12, hall=.1, label='reverse swell')
    sfx.add(whistle_fall(.3), CUE['whistle_fall'], -20, pan=.1, hall=.15, label='falling whistle')


def s5_fully_booked(B):
    mus, drm, sfx, big = scene(B, 's5', 'b')
    mg = CUE['mega']
    big.add(mega_stamp(2), mg, 0, room=.05, hall=.12, label='MEGA STAMP')
    sfx.add(whoosh(.4, 2500, 500, seed=12), mg + .033, -22, hall=.15)                    # shockwave ring

    # --- full groove, double energy (bar 7 to the tihai)
    keherwa_bar(drm, mg, energy=2, mutes=[(CUE['tihai'], beat(30))], gdb=1, room=.05, hall=.06, seed=40)
    bn = bass_notes(mg, [(CUE['tihai'], beat(30))])
    # tihai bass walks A, B, C# to land D on the clack
    th = CUE['tihai']
    ph_t = [th, th + .4, th + .8]
    for k, nm in enumerate(['A2', 'B2', 'C#3']):
        bn += [(ph_t[k], nm, .12, 110), (ph_t[k] + .2, nm, .12, 110)]
    bn += [(CUE['clack'], 'D2', .9, 120)]
    bass = np.tanh(peak1(gm('bass_finger', bn, mg, 3.2, volume=120)) * 1.3)
    mus.add(bass, mg, -17, hall=.04)

    # --- the hook returns an octave up: sitar + shehnai unison (baraat brightness)
    h = [mg, mg + E8, mg + 2 * E8, mg + 3 * E8, mg + 4 * E8]
    hn = ['C#5', 'E5', 'F#5', 'E5', 'D5']
    notes = [(h[i], hn[i], .32 if i < 4 else .55, [112, 106, 116, 104, 118][i]) for i in range(5)]
    sit = gm('sitar', notes, mg, 1.8)
    mus.add(peak1(sit), mg, -7, pan=-.1, hall=.18)
    she = gm('shehnai', notes, mg, 1.8, cc=[(mg, 11, 110)])
    mus.add(peak1(she), mg, -15, pan=.12, hall=.2)

    # --- strings + choir lift
    st = gm('strings', [(mg, n, 1.38, 96) for n in ['D3', 'A3', 'D4', 'F#4', 'A4']], mg, 2.0,
            cc=[(mg, 11, 90)] + ramp_cc(mg, 17.35, 90, 124))
    mus.add(hpf(peak1(st), 150), mg - .02, -13, hall=.25, snap=False)
    ch = gm('choir', [(mg, n, 1.38, 92) for n in ['D4', 'A4', 'D5', 'F#5']], mg, 2.0,
            cc=[(mg, 11, 70)] + ramp_cc(mg, 16.9, 70, 120))
    mus.add(hpf(peak1(ch), 180), mg - .03, -16, hall=.3, snap=False)

    # --- tihai (17.400 -> 18.400): dha ti dha x3, tutti; stabs walk A4, B4, C#5 to land D5 on the CLACK
    tw = gm('tremolo_strings' if 'tremolo_strings' in GM else 44, [(17.8, 'D4', .6, 90), (17.8, 'A4', .6, 86)],
            17.8, 1.0, cc=[(17.8, 11, 50)] + ramp_cc(17.8, 18.38, 50, 127))
    mus.add(hpf(peak1(tw), 160), 17.8, -18, hall=.2)
    for k in range(3):
        p0 = q(th + .4 * k)
        for j, (bol, gg) in enumerate([('dha', 0), ('tin', -5), ('dha', 0)]):
            tt_ = q(p0 + .1 * j)
            drm.add(stroke(bol, 50 + 3 * k + j), tt_, -5 + gg + k, pan=-.1, hall=.08)
            if bol == 'dha':
                drm.add(stroke('dhol', k + j), tt_, -7 + k, pan=.08, hall=.06)
                drm.add(stroke('clap', k + j), tt_, -12 + k, pan=-.05, hall=.08)
        stab = gm('strings', [(p0, nm, .09, 120) for nm in [['F#4', 'A4'], ['G#4', 'B4'], ['A4', 'C#5']][k]]
                  + [(q(p0 + .2), nm, .09, 120) for nm in [['F#4', 'A4'], ['G#4', 'B4'], ['A4', 'C#5']][k]], p0, .6)
        mus.add(hpf(peak1(stab), 180), p0 - .02, -14 + k, hall=.18, snap=False)
        sst = gm('sitar', [(p0, ['A4', 'B4', 'C#5'][k], .2, 116), (q(p0 + .2), ['A4', 'B4', 'C#5'][k], .2, 120)], p0, .8)
        mus.add(peak1(sst), p0, -12 + k, pan=-.1, hall=.15)
    # sitar tremolo on D4 for the trembling light-strings (32nds into the snap)
    trem = gm('sitar', [(q(18.2) + .05 * i, 'D4', .06, 70 + 12 * i) for i in range(4)], 18.2, .6, snap=False)
    mus.add(peak1(trem), 18.2, -15, pan=.15, hall=.12)

    # --- fireworks on the beat: launches in pairs, bursts with crackle tails + city slap-back
    r = rng(23)
    lp = [(-.4, .4), (-.3, .3), (-.45, .45), (-.2, .2)]
    flights = [.5, .5, .9, .9]
    targets = [['A5', 'D6'], ['F#5', 'A5'], ['D6', 'E6'], ['A5', 'F#6']]
    for i, t in enumerate(CUE['rockets']):
        for j in range(2):
            sfx.add(stereo(launch(flights[i], hz(targets[i][j]) * 2, seed=30 + 2 * i + j)), t, -19, pan=lp[i][j],
                    hall=.15, label='rocket' if j == 0 else '')
    bp = [(-.35, .35), (-.4, .4), (-.3, .3), (-.25, .25)]
    for i, t in enumerate(CUE['bursts']):
        for j in range(2):
            dly = 0 if i in (0, 2) else r.uniform(.03, .06) * j
            size, cd = (1.0, 1.2) if i < 2 else (1.1, 1.6)
            b = burst(size, cd, seed=60 + 2 * i + j)
            big.add(b, q(t) + dly, -5 - 2 * j, pan=bp[i][j], hall=.2, snap=False, label='burst' if j == 0 else '')
            sfx.add(city_echo(b, .21 + .05 * j), q(t) + dly, -15, pan=-bp[i][j], snap=False)
    sfx.add(ghungroo(.4, 35, 5), CUE['bursts'][0], -18, pan=.2, hall=.15)
    for i, (t, p) in enumerate(zip(CUE['phuljhadi'], [-.3, 0, .3])):
        sfx.add(S.sparkler(.6, seed=70 + i), t, -21, pan=p, hall=.12, label='phuljhadi')
    sfx.add(whoosh(.4, 300, 5000, seed=13), CUE['whoosh_up'], -17, hall=.1, label='whoosh up')


def sonic_logo(bus, t0, g=0.0, hall=.3, big=False):
    """D5-A5-D6, 4 frames apart: santoor + sitar pluck + hand-chime; temple bell doubles the A (the red pillar)."""
    ts = [q(t0), q(t0 + LOGO_STEP), q(t0 + 2 * LOGO_STEP)]
    ns = ['D5', 'A5', 'D6']
    pans = [-.3, 0, .3]
    santoor_phrase(bus, list(zip(ts, ns)), g - 2, pans=pans, hall=hall, synth_db=-3, vel=118, dur=2.2)
    sit = gm('sitar', [(t, n, 1.4, 118) for t, n in zip(ts, ns)], ts[0], 2.0)
    bus.add(peak1(sit), ts[0], g - 6, pan=-.05, hall=hall)
    for t, n, p in zip(ts, ns, pans):
        bus.add(chime(n), t, g - 7, pan=p, hall=hall)
    bus.add(layer((S.bell(hz('A5'), 2.6, .6, 5), 0), (smp('hand_bells_nepalese', 'HB_1', semis=12 * np.log2(hz('A5') / 1099)), -7)),
            ts[1], g - 6, pan=0, hall=hall)
    bus.add(glock('D7'), ts[2], g - 14, pan=.2, hall=hall)
    if big:   # the snap: weight under the D, an open D-A string swell on the D'
        lo = gm('strings', [(ts[0], 'D3', 1.2, 110), (ts[0], 'D4', 1.2, 104), (ts[2], 'A4', 1.0, 96),
                            (ts[2], 'D5', 1.0, 96)], ts[0], 1.6, cc=[(ts[0], 11, 120)] + ramp_cc(ts[0] + .2, ts[0] + 1.2, 120, 70))
        bus.add(hpf(peak1(lo), 140), ts[0] - .02, g - 9, hall=hall, snap=False)
        tim = gm('timpani', [(ts[0], 'D2', .8, 120)], ts[0], 1.2)
        bus.add(peak1(tim), ts[0], g - 10, hall=hall * .5)
    return ts


def s6_mark(B):
    mus, drm, sfx, big = scene(B, 's6', 'b')
    ck = CUE['clack']
    big.add(clack_hit(3), ck, -2, room=.04, hall=.1, label='CLACK')
    sonic_logo(mus, CUE['logo1'], g=-5, hall=.3, big=True)
    # --- tanpura + pad return (soft), they carry to the end card
    tan = S.tanpura(hz('D3'), 5.4, cycle=1.2, seed=8)
    mus.add(hpf(tan, 90), CUE['pad_back'], -20, hall=.3)
    pad = S.pad([hz('D3'), hz('A3'), hz('D4'), hz('A4')], 2.4, bright=.3, seed=4)
    mus.add(hpf(pad, 150), CUE['pad_back'], -26, hall=.3)
    # --- three launch whistles glide up to the logo chord D5 / A5 / D6
    for i, (nm, p, gg) in enumerate([('D5', -.5, -22), ('A5', 0, -19), ('D6', .5, -22)]):
        sfx.add(launch_whistle(hz(nm), .6, seed=80 + i), CUE['launch3'], gg, pan=p, hall=.2, label='launch' if i == 0 else '')
    # --- TRIPLE BURST + wordless choir/strings lift + groove back for two beats through an opening low-pass
    tb = CUE['triple']
    for i, p in enumerate([-.5, 0, .5]):
        b = burst(1.3, 1.4, seed=90 + i)
        big.add(b, tb, -6 - (0 if i == 1 else 1.5), pan=p, hall=.22, label='TRIPLE BURST' if i == 0 else '')
        sfx.add(city_echo(b, .2 + .04 * i), tb, -15, pan=-p)
    sfx.add(S.crackle(1.4, 50, seed=95), tb + .35, -22, pan=.2, hall=.2)
    sfx.add(ghungroo(.45, 35, 6), tb, -18, pan=-.2, hall=.15)
    ch = gm('choir', [(tb, n, 1.2, 88) for n in ['D4', 'A4', 'D5', 'E5']], tb, 1.8, cc=[(tb, 11, 50)] + ramp_cc(tb, 20.75, 50, 118))
    mus.add(hpf(peak1(ch), 180), tb - .03, -15, hall=.3, snap=False)
    st = gm('strings', [(tb, n, 1.2, 90) for n in ['D3', 'A3', 'E4', 'F#4', 'A4']], tb, 1.8,
            cc=[(tb, 11, 60)] + ramp_cc(tb, 20.75, 60, 120))
    mus.add(hpf(peak1(st), 150), tb - .02, -15, hall=.28, snap=False)
    tmp = Bus('tmp')
    keherwa_bar(tmp, beat(30), energy=2, mutes=[(beat(30), tb)], room=0, hall=0, seed=70)
    seg = tmp.dry[:, n_samples(tb):n_samples(tb + 1.8)]
    seg = lp_sweep(seg, 800, 12000, 1.2)
    drm.add(seg, tb, 0, hall=.06)
    bn = [(tb, 'D2', .5, 110), (q(tb + E8 * 2), 'A2', .4, 100), (q(tb + E8 * 3), 'C#3', .25, 100)]
    bass = np.tanh(peak1(gm('bass_finger', bn, tb, 1.4, volume=120)) * 1.3)
    mus.add(lpf(bass, 2500), tb, -18, hall=.04)
    sfx.add(whoosh(.6, 200, 1500, seed=14), CUE['low_whoosh'], -19, hall=.15, label='low whoosh')
    # --- toran unfurls centre -> sides: 12 tiny ghungroo ticks
    for i in range(12):
        t = CUE['toran'] + i * .433 / 11
        p = (-1) ** i * (.05 + .45 * i / 11)
        sfx.add(smp('sleigh_bells', 'Sleighbells_Hit', rr=i, max_len=.18, fade_out=.1), t, -27 + i * .3, pan=p,
                hall=.15, snap=False, label='toran' if i == 0 else '')


def s7_endcard(B):
    mus, drm, sfx, big = scene(B, 's7', 'b')
    lg = CUE['logo2']
    drm.add(stroke('dhol', 99), lg, -5, hall=.1)                          # the final dhol DHA (groove ends here)
    drm.add(stroke('dha', 98), lg, -7, hall=.1)
    sonic_logo(mus, lg, g=-6, hall=.32)
    # --- warm resolution: Dmaj9(#11) pad, strings, soft oohs
    pc = CUE['pad_chord']
    pad = S.pad([hz('D3'), hz('A3'), hz('E4'), hz('F#4'), hz('G#4')], 3.0, bright=.3, seed=6)
    mus.add(hpf(pad, 150), pc, -24, hall=.35)
    sl = gm('slow_strings', [(pc, n, 2.4, 70) for n in ['D4', 'A4', 'E5', 'F#5']], pc, 3.2,
            cc=[(pc, 11, 40)] + ramp_cc(pc, 22.6, 40, 96) + ramp_cc(22.6, 23.9, 110, 30))
    mus.add(hpf(peak1(sl), 150), pc, -17, hall=.35)
    oo = gm('voice_oohs', [(pc, n, 2.2, 64) for n in ['A4', 'D5', 'F#5']], pc, 3.0,
            cc=[(pc, 11, 30)] + ramp_cc(pc, 22.6, 30, 90) + ramp_cc(22.6, 23.6, 100, 20))
    mus.add(hpf(peak1(oo), 200), pc, -22, hall=.35)
    sfx.add(pen_scratch(.367, 2), CUE['pen'], -23, pan=.15, hall=.05, label='pen')
    drm.add(stroke('na', 97), CUE['fwd_label'], -15, hall=.12)

    # --- ticker: rising santoor per name + typing ticks (~40 chars/s)
    tnames = ['E5', 'F#5', 'G#5', 'A5']
    santoor_phrase(mus, list(zip(CUE['ticker'], tnames)), -12, pans=[-.2, -.05, .1, .25], hall=.3, dur=1.4)
    for k, (t, nch) in enumerate(zip(CUE['ticker'], CUE['ticker_chars'])):
        for c in range(nch):
            sfx.add(S.ui_tap(10 * k + c), q(t) + c * .025, -25, pan=.1, hall=.05, snap=False,
                    label='typing' if c == 0 else '')
    # --- soft tihai landing on 'Sabko!' (dha tin dha x3 on the 0.1 s grid, crescendo)
    for k in range(3):
        p0 = q(CUE['tihai_end'] + .4 * k)
        for j, (bol, gg) in enumerate([('dha', 0), ('tin', -5), ('dha', 0)]):
            t = q(p0 + .1 * j)
            drm.add(stroke(bol, 80 + 3 * k + j), t, -17 + 3 * k + gg, pan=-.1, hall=.12)
    sfx.add(pan_sweep(S.sparkler(.4, 15), -.4, .4), CUE['spark'], -21, hall=.1, label='phuljhadi spark')
    # --- 'Sabko!' : ghungroo flourish + dha + santoor D6 + a soft tutti D
    sb = CUE['sabko']
    sfx.add(ghungroo(.4, 45, 7), sb, -15, pan=.15, hall=.2, label='Sabko ghungroo')
    drm.add(stroke('dhol', 77), sb, -9, hall=.12)
    santoor_phrase(mus, [(sb, 'D6')], -8, pans=[.1], hall=.3, synth_db=-4, vel=118, dur=2.0)
    mus.add(chime('D6'), sb, -13, pan=.1, hall=.3)
    tut = gm('strings', [(sb, n, .9, 96) for n in ['D3', 'A3', 'D4', 'F#4', 'A4']], sb, 2.0,
             cc=[(sb, 11, 100)] + ramp_cc(sb + .1, sb + 1.0, 100, 50))
    mus.add(hpf(peak1(tut), 150), sb - .02, -16, hall=.3, snap=False)
    # --- bar 10: the temple bell on D6, the music decays onto the tanpura, which fades out
    bl = CUE['bell']
    bell = layer((S.bell(hz('D6'), 3.0, .6, 9), 0),
                 (smp('hand_bells_nepalese', 'HB_1', semis=12 * np.log2(hz('D6') / 1099)), -4),
                 (chime('D6'), -6))
    mus.add(bell, bl, -9, hall=.45)
    sfx.add(smp('suspended_cymbal_1', 'hit_bell_pp1', max_len=1.2, fade_out=.6), bl, -26, pan=.2, hall=.3)
    # --- loop seam: the tubelight hum returns (phase-continuous with frame 0) + one faint tink
    hb = CUE['hum_back']
    hum = tubelight_hum(hb, DUR + .6 - hb) * np.clip(tt(DUR + .6 - hb) / .08, 0, 1)
    sfx.add(hum, hb, -27 + FADER['s1']['sfx'] - FADER['s7']['sfx'], room=.02)    # = the frame-0 hum level
    sfx.add(flicker_tink(9), q(hb + .1), -29, pan=.15)


# =====================================================================================================================
# MIX + MASTER
# =====================================================================================================================
def build():
    B = {k: Bus(k) for k in ('mus_a', 'drm_a', 'mus_b', 'drm_b', 'sfx', 'big')}
    for fn in (s1_hook, s2_city, s3_gags, s4_turn, s5_fully_booked, s6_mark, s7_endcard):
        t = time.time()
        fn(B)
        print(f'  {fn.__name__:16s} {time.time() - t:5.1f} s', flush=True)
    return B


def mixdown(B):
    out = {}
    for k, b in B.items():
        y = b.dry + reverb(b.room, IR_ROOM, 0.0, .85) + reverb(b.hall, IR_HALL, .02, .8)
        if k.startswith('drm'):
            y = peq(y, 380, -3.0, 1.2)                     # de-mud the dholak/dhol 300-450 Hz build-up
        if k != 'sfx':
            y = low_shelf(y, 90, -2.5)                     # phones can't play it; give the limiter's headroom to the mids
        out[k] = y
    tn = CUE['turn']
    a, z = CUE['late_pause']
    duck_m = duck_env(DUCK_MUS, 3.5)
    duck_d = duck_env(DUCK_DRM, 2.0)
    # A buses: all music hard-stops at the turn (10 ms), reverb tails included
    gA = gate_env([(tn, None, .01, .01)])
    out['mus_a'] *= gA * duck_m
    out['drm_a'] *= gA * duck_d
    # B buses: the late-latif half-beat of silence
    gB = gate_env([(a, z, .03, .012)])
    out['mus_b'] *= gB * duck_m
    out['drm_b'] *= gB * duck_d
    # tanpura fade at -6 dB/s from beat 39 is applied to the music-B bus tail
    tf = CUE['tanpura_fade']
    fadeB = env_db([(tf, 0.0), (DUR + .6, -6.0 * (DUR + .6 - tf))])
    out['mus_b'] *= fadeB
    out['drm_b'] *= fadeB
    return out


def master(out, ceiling_db=-1.0):
    total = sum(out.values())
    total = np.vstack([fft_filter(c, lo=32, hi=12500, width=.4) for c in total])     # sub rumble + >12 kHz roll-off
    mix = S.Mix(DUR + .6)                       # +0.6 s so Mix's built-in 0.5 s end fade misses the loop seam
    mix.add(total[:, :mix.n], 0.0)
    st = mix.render(reverb=0.0, lufs=-14.0, ceiling_db=ceiling_db, air_db=.5, warmth_db=.5)
    n = n_samples(DUR)
    st = st[:, :n].copy()
    f = n_samples(.03)
    st[:, -f:] *= np.linspace(1, 0, f)          # 24.400: 30 ms fade
    return st


def measure(st):
    import pyloudnorm as pyln
    from scipy.signal import resample_poly
    lufs = pyln.Meter(SR).integrated_loudness(st.T)
    tp = 20 * np.log10(np.max(np.abs(resample_poly(st, 4, 1, axis=1))) + 1e-12)
    pk = 20 * np.log10(np.max(np.abs(st)) + 1e-12)
    return lufs, pk, tp


def write_wav(st, path):
    r = rng(99)
    pcm = np.clip(st.T * 32767 + r.uniform(-.5, .5, st.T.shape), -32768, 32767).astype('<i2')
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    with wave.open(path, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


# =====================================================================================================================
# CHECKS (--check DIR): spectrogram, waveform, loudness timeline, per-section loudness, silence, SFX density
# =====================================================================================================================
def momentary(st, win=.4, hop=.05, phone=False):
    import pyloudnorm as pyln
    meter = pyln.Meter(SR, block_size=win)
    x = st
    if phone:   # crude phone-speaker model: nothing below ~180 Hz, little above 12 kHz
        x = np.vstack([fft_filter(c, lo=180, hi=12000, width=.5) for c in st])
    ts, ls = [], []
    w = n_samples(win)
    for i in range(0, x.shape[1] - w, n_samples(hop)):
        seg = x[:, i:i + w]
        val = meter.integrated_loudness(seg.T)
        ts.append((i + w / 2) / SR)
        ls.append(max(-70.0, val) if np.isfinite(val) else -70.0)
    return np.array(ts), np.array(ls)


def check(st, B, outdir, wav):
    import pyloudnorm as pyln
    os.makedirs(outdir, exist_ok=True)
    meter = pyln.Meter(SR)
    phone = np.vstack([fft_filter(c, lo=180, hi=12000, width=.5) for c in st])
    print('\nper-section loudness (integrated LUFS | phone-band LUFS | max momentary):')
    for name, a, b in SECTIONS:
        seg = st[:, n_samples(a):n_samples(b)]
        pseg = phone[:, n_samples(a):n_samples(b)]
        _, mm = momentary(seg)
        print(f'  {name:18s} {a:5.1f}-{b:4.1f}  {meter.integrated_loudness(seg.T):6.1f} | '
              f'{meter.integrated_loudness(pseg.T):6.1f} | {mm.max():6.1f}')
    # silence scan (100 ms RMS)
    w = n_samples(.1)
    quiet = []
    for i in range(0, st.shape[1] - w, w // 2):
        r = 20 * np.log10(np.sqrt(np.mean(st[:, i:i + w] ** 2)) + 1e-12)
        if r < -50:
            quiet.append((i / SR, r))
    mono = st.mean(0, keepdims=True).repeat(2, 0)
    print(f'mono fold-down: {meter.integrated_loudness(mono.T) - meter.integrated_loudness(st.T):+.2f} LU vs stereo; '
          f'L/R correlation {np.corrcoef(st[0], st[1])[0, 1]:.2f}')
    print('windows quieter than -50 dBFS RMS:', ', '.join(f'{t:.2f}s({r:.0f})' for t, r in quiet) or 'none')
    # SFX density in the gag section: max simultaneous SFX layers per beat
    ev = [e[:3] for k in ('sfx', 'big') for e in B[k].events if 4.8 <= e[0] < 12.4]
    print('distinct SFX layers sounding at once, max per beat (gag section):')
    line = []
    for n in range(7, 21):
        a, b = beat(n) - .3, beat(n) + .3
        mx, who = 0, ()
        for tt_ in np.arange(a, b, .01):
            act = sorted({lab for (s0, s1, lab) in ev if s0 <= tt_ < max(s1, s0 + .03)})
            if len(act) > mx:
                mx, who = len(act), act
        line.append(f'b{n}:{mx}' + (f'{list(who)}' if mx > 2 else ''))
    print('  ' + ' '.join(line))
    # ffmpeg pictures
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-lavfi',
                    'showspectrumpic=s=1800x700:mode=combined:color=intensity:scale=log:fscale=log:legend=1:start=20:stop=16000',
                    os.path.join(outdir, 'spectrogram.png')], check=False)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-lavfi',
                    'showwavespic=s=1800x360:split_channels=0:colors=0xF0B040', os.path.join(outdir, 'waveform.png')],
                   check=False)
    timeline_png(st, os.path.join(outdir, 'loudness.png'))
    for nm, a, d in (('hook', 0.0, 3.2), ('gags', 4.8, 7.8), ('turn', 12.2, 4.2), ('finale', 15.4, 5.6), ('end', 20.4, 4.0)):
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', str(a), '-t', str(d), '-i', wav, '-lavfi',
                        'showspectrumpic=s=1400x500:mode=combined:color=intensity:scale=log:fscale=log:legend=1:start=40:stop=12000',
                        os.path.join(outdir, f'spectrogram_{nm}.png')], check=False)
    sync_check(phone, B)
    # transient punch on a phone: 50 ms RMS peak in the phone band at each big hit, vs the 1 s of music before it
    print('phone-band punch (50 ms RMS peak dBFS | music bed in the 1 s before | margin):')
    w = n_samples(.05)
    for key in ('stamp', 'groove_in', 'gag1', 'gag2', 'gag3', 'turn', 'mega', 'clack', 'triple', 'logo2', 'sabko'):
        t = CUE[key]
        a = n_samples(t)
        hitv = max(np.sqrt(np.mean(phone[:, i:i + w] ** 2)) for i in range(a, a + n_samples(.15), w // 4))
        bed = np.sqrt(np.mean(phone[:, max(0, a - n_samples(1.0)):max(1, a - n_samples(.05))] ** 2))
        h, bb = 20 * np.log10(hitv + 1e-12), 20 * np.log10(bed + 1e-12)
        print(f'  {key:10s} {t:6.2f}s  {h:6.1f} | {bb:6.1f} | {h - bb:+5.1f}')


def sync_check(phone, B):
    """(1) every labelled hit must start sounding within 1 frame of its (frame-snapped) placement;
    (2) in the final mix, the steepest 2 ms rise within +-60 ms of each BIG cue must sit on its frame."""
    swells = ('whoosh', 'whip', 'riser', 'swell', 'putter', 'pen', 'ember', 'phuljhadi', 'spark', 'launch', 'rocket',
              'flame', 'night', 'whistle', 'ghungroo grains')
    late = [(lab, t, on) for b in B.values() for (t, _, lab, on) in b.events
            if on > 1 / FPS and not any(w in lab.lower() for w in swells)]
    n_ev = sum(len(b.events) for b in B.values())
    print(f'sync check (1): {n_ev} labelled events, all frame-snapped; sounds starting >1 frame after placement: '
          + (', '.join(f'{lab}@{t:.3f}(+{on * 1000:.0f} ms)' for lab, t, on in late) or 'none'))
    keys = ['stamp', 'groove_in', 'gag1', 'gag2', 'gag3', 'turn', 'mega', 'clack', 'triple', 'logo2', 'sabko']
    x = np.abs(phone).max(0)
    w = n_samples(.002)
    env = np.convolve(x, np.ones(w) / w, 'same')
    lg = 20 * np.log10(env + 1e-9)
    errs = []
    for k in keys:
        ts = CUE[k] if isinstance(CUE[k], list) else [CUE[k]]
        for t in ts:
            a, b = n_samples(q(t) - .045), n_samples(q(t) + .045)
            seg = lg[a:b]
            floor_, top = seg[:n_samples(.035)].min(), seg.max()
            i = int(np.argmax(seg > floor_ + .5 * (top - floor_)))     # first half-way (dB) crossing
            errs.append((k, q(t), (a + i) / SR - q(t)))
    bad = [(k, t, e) for k, t, e in errs if abs(e) > 1 / FPS]
    print(f'sync check (2): {len(errs)} big-hit onsets in the mix, max |offset| {max(abs(e) for _, _, e in errs) * 1000:.0f} ms, '
          f'median {np.median([abs(e) for _, _, e in errs]) * 1000:.0f} ms; more than 1 frame off: '
          + (', '.join(f'{k}@{t:.3f} ({e * 1000:+.0f} ms)' for k, t, e in bad) or 'none'))


def timeline_png(st, path):
    from PIL import Image, ImageDraw
    ts, full = momentary(st)
    _, ph = momentary(st, phone=True)
    W, H, L, R, T, Bm = 1800, 620, 60, 20, 40, 60
    im = Image.new('RGB', (W, H), (18, 16, 22))
    d = ImageDraw.Draw(im)

    def X(t):
        return L + (W - L - R) * t / DUR

    def Y(v):
        return T + (H - T - Bm) * (1 - (np.clip(v, -50, -4) + 50) / 46)

    for i, (name, a, b) in enumerate(SECTIONS):
        d.rectangle([X(a), T, X(b), H - Bm], fill=(28 + 10 * (i % 2), 26 + 8 * (i % 2), 36 + 10 * (i % 2)))
        d.text((X(a) + 3, T - 30 + 12 * (i % 2)), name, fill=(200, 200, 210))
    for v in range(-50, -3, 5):
        d.line([L, Y(v), W - R, Y(v)], fill=(55, 55, 65))
        d.text((8, Y(v) - 6), f'{v}', fill=(160, 160, 170))
    for n in range(0, 41):
        x = X(T0 + BEAT * n)
        d.line([x, H - Bm, x, H - Bm + (10 if n % 4 == 0 else 5)], fill=(150, 150, 160))
        if n % 4 == 0:
            d.text((x - 8, H - Bm + 12), f'{T0 + BEAT * n:.1f}', fill=(170, 170, 180))
    for key in ('stamp', 'groove_in', 'gag1', 'gag2', 'gag3', 'turn', 'diya', 'late_window', 'mega', 'clack', 'triple',
                'logo2', 'sabko', 'bell', 'hum_back'):
        x = X(CUE[key])
        d.line([x, T, x, H - Bm], fill=(120, 70, 70))
        d.text((x + 2, H - Bm - 14), key, fill=(230, 140, 140))
    for arr, col in ((full, (240, 180, 70)), (ph, (90, 200, 255))):
        pts = [(X(t), Y(v)) for t, v in zip(ts, arr)]
        d.line(pts, fill=col, width=2)
    d.text((W - 420, 8), 'momentary LUFS (400 ms): gold = full band, blue = phone band (180 Hz-12 kHz)',
           fill=(220, 220, 220))
    im.save(path)


# =====================================================================================================================
def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--out', default=os.path.join(HERE, '..', 'out', 'soundtrack.wav'))
    ap.add_argument('--check', default=None, help='directory for spectrogram/waveform/loudness PNGs + section report')
    ap.add_argument('--stems', default=None, help='also write each bus (pre-master) as a WAV into this directory')
    args = ap.parse_args()
    t0 = time.time()
    print('composing...')
    B = build()
    out = mixdown(B)
    if args.stems:
        os.makedirs(args.stems, exist_ok=True)
        ref = max(np.max(np.abs(sum(out.values()))), 1e-9)
        for k, y in out.items():
            write_wav(np.clip(y[:, :n_samples(DUR)] / ref * .5, -1, 1), os.path.join(args.stems, f'{k}.wav'))
    st = master(out, -1.0)
    lufs, pk, tp = measure(st)
    if tp > -1.0:                                # keep true peak under -1 dBTP for the AAC encode
        st = master(out, -1.0 - (tp + 1.0) - .15)
        lufs, pk, tp = measure(st)
    if abs(lufs + 14.0) > .1:                    # trim after the loop-seam cut (only ever a hair)
        st *= db(-14.0 - lufs)
        lufs, pk, tp = measure(st)
    write_wav(st, args.out)
    print(f"wrote {args.out}: {st.shape[1] / SR:.3f} s, 48 kHz stereo | integrated {lufs:.2f} LUFS | "
          f"sample peak {pk:.2f} dBFS | true peak {tp:.2f} dBTP | {time.time() - t0:.1f} s")
    if args.check:
        check(st, B, args.check, args.out)


if __name__ == '__main__':
    main()
