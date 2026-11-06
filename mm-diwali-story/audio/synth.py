"""MM Diwali Story: numpy-only synthesis toolkit (no samples, no licences).

All instruments return mono float64 arrays at SR. Place them with Mix.add(sig, t, gain, pan, send).
Everything is deterministic: pass `seed` for anything noisy.

    from synth import *
    mix = Mix(24.0)
    mix.add(tabla_na(midi_hz(74)), 1.00, gain=.5, pan=.2, send=.15)
    mix.add(firework_burst(seed=3), 5.2, gain=.9, pan=-.3, send=.5)
    mix.write('out/soundtrack.wav')
"""
import numpy as np
import wave

SR = 48000
TAU = 2 * np.pi


# ---------------------------------------------------------------- basics
def n_samples(dur):
    return max(1, int(round(dur * SR)))


def tt(dur):
    return np.arange(n_samples(dur)) / SR


def midi_hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def rng(seed):
    return np.random.default_rng(int(seed) & 0xFFFFFFFF)


def env_adsr(dur, a=.005, d=.1, s=.7, r=.2):
    n = n_samples(dur)
    t = tt(dur)
    e = np.ones(n) * s
    e[t < a] = t[t < a] / max(a, 1e-6)
    m = (t >= a) & (t < a + d)
    e[m] = 1 - (1 - s) * (t[m] - a) / max(d, 1e-6)
    rel = t > dur - r
    e[rel] *= np.clip((dur - t[rel]) / max(r, 1e-6), 0, 1)
    return e


def env_exp(dur, decay, attack=.002):
    """exponential decay (decay = seconds to fall to ~1/e)"""
    t = tt(dur)
    return np.minimum(1, t / max(attack, 1e-6)) * np.exp(-t / max(decay, 1e-6))


def fade(x, fin=.003, fout=.01):
    n = len(x)
    a, b = min(n, n_samples(fin)), min(n, n_samples(fout))
    y = x.copy()
    if a > 1:
        y[:a] *= np.linspace(0, 1, a)
    if b > 1:
        y[-b:] *= np.linspace(1, 0, b)
    return y


def fft_filter(x, lo=None, hi=None, width=.25):
    """smooth band filter in the frequency domain. lo/hi in Hz (None = open). width in octaves for the skirts."""
    n = len(x)
    N = 1 << int(np.ceil(np.log2(max(2, n))))
    X = np.fft.rfft(x, N)
    f = np.fft.rfftfreq(N, 1 / SR)
    m = np.ones_like(f)
    lf = np.log2(np.maximum(f, 1))
    if lo:
        m *= np.clip((lf - (np.log2(lo) - width)) / width, 0, 1)
    if hi:
        m *= np.clip(((np.log2(hi) + width) - lf) / width, 0, 1)
    return np.fft.irfft(X * m, N)[:n]


def sweep_filter(x, f_start, f_end, q_oct=1.0, frame=2048):
    """band-pass whose centre moves exponentially from f_start to f_end across the signal (STFT overlap-add)."""
    n = len(x)
    hop = frame // 4
    win = np.hanning(frame)
    out = np.zeros(n + frame)
    norm = np.zeros(n + frame)
    xp = np.concatenate([x, np.zeros(frame)])
    f = np.fft.rfftfreq(frame, 1 / SR)
    lf = np.log2(np.maximum(f, 1))
    for i in range(0, n, hop):
        p = i / max(1, n - 1)
        fc = f_start * (f_end / f_start) ** p
        m = np.exp(-0.5 * ((lf - np.log2(fc)) / (q_oct / 2)) ** 2)
        seg = xp[i:i + frame] * win
        out[i:i + frame] += np.fft.irfft(np.fft.rfft(seg) * m, frame) * win
        norm[i:i + frame] += win ** 2
    return out[:n] / np.maximum(norm[:n], 1e-3)


def noise(dur, seed=0):
    return rng(seed).uniform(-1, 1, n_samples(dur))


def pink(dur, seed=0):
    w = rng(seed).normal(0, 1, n_samples(dur))
    N = 1 << int(np.ceil(np.log2(len(w))))
    X = np.fft.rfft(w, N)
    f = np.fft.rfftfreq(N, 1 / SR)
    X /= np.sqrt(np.maximum(f, 20))
    y = np.fft.irfft(X, N)[:len(w)]
    return y / (np.max(np.abs(y)) + 1e-9)


def normalize(x, peak=1.0):
    m = np.max(np.abs(x)) + 1e-12
    return x * (peak / m)


def osc_phase(freq, dur):
    """phase for a (possibly time-varying) frequency array or scalar"""
    n = n_samples(dur)
    f = np.broadcast_to(np.asarray(freq, dtype=float), (n,)) if np.ndim(freq) else np.full(n, float(freq))
    return TAU * np.cumsum(f) / SR


def glide(f0, f1, dur, t_glide=None, curve='exp'):
    """frequency trajectory from f0 to f1 over t_glide seconds (then hold)"""
    t = tt(dur)
    tg = t_glide if t_glide else dur
    p = np.clip(t / tg, 0, 1)
    if curve == 'exp':
        return f0 * (f1 / f0) ** p
    return f0 + (f1 - f0) * p


# ---------------------------------------------------------------- strings (additive physical-ish plucks)
def pluck(freq, dur=1.6, bright=.6, decay=1.1, pos=.18, inharm=.00015, buzz=0.0, f_end=None, glide_t=.12, seed=0):
    """plucked string. buzz>0 adds sitar jawari shimmer; f_end gives a meend (glide)."""
    t = tt(dur)
    n = len(t)
    K = int(min(40, 15000 / freq))
    out = np.zeros(n)
    fr = glide(freq, f_end, dur, glide_t) if f_end else np.full(n, float(freq))
    base_phase = TAU * np.cumsum(fr) / SR
    r = rng(seed)
    for k in range(1, K + 1):
        stretch = np.sqrt(1 + inharm * k * k)
        amp = abs(np.sin(np.pi * k * pos)) / (k ** (1.6 - bright))
        dk = decay / (1 + .28 * (k - 1) * (1.2 - bright))
        e = np.exp(-t / dk)
        if buzz > 0 and k > 2:  # jawari: upper partials bloom then fade
            e = e * (1 + buzz * 3.0 * (t / (t + .05)) * np.exp(-t / (dk * .8)) * (k / K))
        out += amp * np.sin(base_phase * k * stretch + r.uniform(0, TAU)) * e
    att = np.exp(-t / .004) * r.uniform(-1, 1, n) * .25 * bright
    out += fft_filter(att, lo=1500)
    if buzz > 0:
        out = np.tanh(out * (1 + 2 * buzz)) / np.tanh(1 + 2 * buzz)
    return fade(normalize(out, .9), .001, .05)


def sitar(freq, dur=1.8, f_end=None, seed=0):
    return pluck(freq, dur, bright=.85, decay=1.4, pos=.08, inharm=.0004, buzz=.55, f_end=f_end, seed=seed)


def santoor(freq, dur=1.6, seed=0):
    a = pluck(freq * 2 ** (3 / 1200), dur, bright=.95, decay=1.3, pos=.12, seed=seed)
    b = pluck(freq * 2 ** (-3 / 1200), dur, bright=.9, decay=1.2, pos=.14, seed=seed + 1)
    return normalize(a + b, .9)


def tanpura(freq_sa, dur, cycle=1.25, seed=0):
    """drone: Pa(low) Sa Sa Sa(low) plucked in a cycle, long rich decays."""
    out = np.zeros(n_samples(dur) + SR * 4)
    seq = [freq_sa * 1.5 / 2, freq_sa, freq_sa, freq_sa / 2]
    i, t0 = 0, 0.0
    while t0 < dur:
        s = pluck(seq[i % 4], 4.0, bright=.55, decay=2.6, pos=.11, buzz=.35, seed=seed + i)
        a = int(t0 * SR)
        out[a:a + len(s)] += s * (.8 if i % 4 else 1.0)
        t0 += cycle
        i += 1
    return fade(out[:n_samples(dur)] / 2.2, .4, .8)


# ---------------------------------------------------------------- winds & pads
def flute(freq, dur, vib=5.4, vib_depth=.012, breath=.12, f_prev=None, seed=0):
    """bansuri-like: soft sine-rich tone, breath noise, delayed vibrato, optional slide in from f_prev."""
    t = tt(dur)
    fr = np.full(len(t), float(freq))
    if f_prev:
        fr = glide(f_prev, freq, dur, .07)
    vdepth = vib_depth * np.clip((t - .18) / .3, 0, 1)
    fr = fr * (1 + vdepth * np.sin(TAU * vib * t))
    ph = TAU * np.cumsum(fr) / SR
    tone = np.sin(ph) + .28 * np.sin(2 * ph + .3) + .1 * np.sin(3 * ph + .7) + .04 * np.sin(4 * ph)
    br = fft_filter(noise(dur, seed), lo=freq * .8, hi=freq * 4, width=.5) * breath
    e = env_adsr(dur, a=.06, d=.12, s=.85, r=min(.18, dur * .4))
    return fade((tone * .8 + br * 2.5) * e, .005, .02)


def shehnai(freq, dur, f_prev=None, seed=0):
    """reedy double-reed lead (festive, auspicious)."""
    t = tt(dur)
    fr = glide(f_prev, freq, dur, .06) if f_prev else np.full(len(t), float(freq))
    fr = fr * (1 + .01 * np.clip((t - .12) / .2, 0, 1) * np.sin(TAU * 6.2 * t))
    ph = TAU * np.cumsum(fr) / SR
    out = np.zeros(len(t))
    for k in range(1, 14):
        formant = np.exp(-0.5 * ((np.log2(k * freq) - np.log2(1400)) / .9) ** 2) + .25
        out += formant / k ** .55 * np.sin(k * ph)
    out = np.tanh(out * .7)
    e = env_adsr(dur, a=.04, d=.1, s=.8, r=min(.15, dur * .4))
    return fade(normalize(out, .8) * e, .004, .02)


def pad(freqs, dur, bright=.5, seed=0):
    """warm detuned chord pad (additive saws)."""
    t = tt(dur)
    out = np.zeros(len(t))
    r = rng(seed)
    for f in freqs:
        for det in (-7, 0, 6):
            ff = f * 2 ** (det / 1200)
            K = int(min(24, 4000 * (0.5 + bright) / ff))
            ph = TAU * ff * t + r.uniform(0, TAU)
            for k in range(1, K + 1):
                out += np.sin(k * ph) / k * (1 / (1 + (k * ff / (1800 * (0.4 + bright))) ** 2))
    e = env_adsr(dur, a=min(.8, dur * .3), d=.3, s=.85, r=min(1.0, dur * .3))
    return fade(normalize(out, .7) * e, .01, .05)


# ---------------------------------------------------------------- percussion
def tabla_na(freq=520, dur=.6, seed=0):
    """dayan 'na/ta': ringing harmonic stroke."""
    t = tt(dur)
    out = np.zeros(len(t))
    for k, (a, d) in enumerate([(1, .32), (.7, .22), (.45, .16), (.3, .11), (.2, .08)], start=1):
        out += a * np.sin(TAU * freq * k * t * (1 + .002 * k)) * np.exp(-t / d)
    click = fft_filter(noise(dur, seed), lo=2500) * np.exp(-t / .006) * .6
    return fade(normalize(out + click, .9), .0005, .03)


def tabla_tin(freq=520, dur=.35, seed=0):
    t = tt(dur)
    out = np.sin(TAU * freq * 2 * t) * np.exp(-t / .07) + .4 * np.sin(TAU * freq * 3 * t) * np.exp(-t / .05)
    click = fft_filter(noise(dur, seed), lo=3000) * np.exp(-t / .004) * .5
    return fade(normalize(out + click, .7), .0005, .02)


def tabla_ge(freq=95, dur=.8, bend=1.35, seed=0):
    """bayan 'ge/ghe': deep boom with the characteristic upward glide."""
    t = tt(dur)
    fr = freq * (1 + (bend - 1) * (1 - np.exp(-t / .12)))
    ph = TAU * np.cumsum(fr) / SR
    out = np.sin(ph) * np.exp(-t / .38) + .25 * np.sin(2 * ph) * np.exp(-t / .2)
    thump = fft_filter(noise(dur, seed), hi=400) * np.exp(-t / .012) * .8
    return fade(normalize(out + thump, .95), .0008, .05)


def tabla_ke(dur=.12, seed=0):
    """bayan 'ke/kat': dry slap."""
    t = tt(dur)
    out = fft_filter(noise(dur, seed), lo=200, hi=2500) * np.exp(-t / .018) + np.sin(TAU * 160 * t) * np.exp(-t / .025)
    return fade(normalize(out, .8), .0005, .01)


def dhol_boom(freq=68, dur=.7, seed=0):
    t = tt(dur)
    fr = freq * (1 + .7 * np.exp(-t / .035))
    ph = TAU * np.cumsum(fr) / SR
    out = np.sin(ph) * np.exp(-t / .3) + .3 * np.sin(1.5 * ph) * np.exp(-t / .12)
    skin = fft_filter(noise(dur, seed), lo=60, hi=1200) * np.exp(-t / .03) * .5
    return fade(np.tanh(normalize(out + skin, 1.0) * 1.6) / np.tanh(1.6), .0005, .05)


def dhol_tik(dur=.15, seed=0):
    """thin-stick treble side 'tik'."""
    t = tt(dur)
    out = fft_filter(noise(dur, seed), lo=1800, hi=9000) * np.exp(-t / .012) + .6 * np.sin(TAU * 420 * t) * np.exp(-t / .03)
    return fade(normalize(out, .8), .0003, .01)


def clap(dur=.25, seed=0):
    t = tt(dur)
    out = np.zeros(len(t))
    for i, off in enumerate([0, .008, .017, .027]):
        m = t >= off
        out[m] += np.exp(-(t[m] - off) / (.006 if i < 3 else .07))
    out *= fft_filter(noise(dur, seed), lo=900, hi=5000)
    return fade(normalize(out, .8), .0003, .02)


def shaker(dur=.12, seed=0):
    t = tt(dur)
    e = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 2
    return fade(normalize(fft_filter(noise(dur, seed), lo=5000) * e, .5), .001, .01)


# ---------------------------------------------------------------- bells & shimmer
def bell(freq, dur=3.0, bright=.6, seed=0):
    """temple bell / ghanta (inharmonic partials, long ring with beating)."""
    t = tt(dur)
    out = np.zeros(len(t))
    partials = [(1, 1, 1.0), (2.0, .6, .8), (2.76, .5, .55), (5.40, .35 * bright, .35), (8.93, .25 * bright, .2), (13.34, .15 * bright, .12)]
    r = rng(seed)
    for ratio, a, d in partials:
        f = freq * ratio
        if f > 18000:
            continue
        beat = 1 + .08 * np.sin(TAU * r.uniform(.6, 2.2) * t)
        out += a * np.sin(TAU * f * t + r.uniform(0, TAU)) * np.exp(-t / (dur * d * .45)) * beat
    strike = fft_filter(noise(.05, seed), lo=3000) * np.exp(-tt(.05) / .004) * .4
    out[:len(strike)] += strike
    return fade(normalize(out, .9), .0005, .1)


def chime(freq, dur=1.6, seed=0):
    """small bright glockenspiel/twinkle."""
    t = tt(dur)
    out = np.sin(TAU * freq * t) * np.exp(-t / .5) + .35 * np.sin(TAU * freq * 2.76 * t) * np.exp(-t / .18) + .15 * np.sin(TAU * freq * 5.4 * t) * np.exp(-t / .08)
    return fade(normalize(out, .8), .0005, .05)


def ghungroo(dur=.35, density=40, seed=0):
    """ankle-bell jingle: cluster of tiny metallic pings."""
    r = rng(seed)
    out = np.zeros(n_samples(dur) + SR)
    nb = max(3, int(density * dur))
    for i in range(nb):
        at = abs(r.normal(0, dur * .25))
        f = r.uniform(4200, 8800)
        d = r.uniform(.03, .09)
        tl = tt(d * 5)
        ping = (np.sin(TAU * f * tl) + .5 * np.sin(TAU * f * 1.48 * tl)) * np.exp(-tl / d) * r.uniform(.3, 1)
        a = int(at * SR)
        out[a:a + len(ping)] += ping
    return fade(normalize(out[:n_samples(dur + .3)], .7), .0005, .05)


def twinkle(freqs, step=.07, dur_each=1.2, seed=0):
    """quick ascending chime arpeggio."""
    total = step * len(freqs) + dur_each
    out = np.zeros(n_samples(total))
    for i, f in enumerate(freqs):
        c = chime(f, dur_each, seed + i) * (0.6 + 0.4 * i / max(1, len(freqs) - 1))
        a = int(i * step * SR)
        out[a:a + len(c)] += c[:len(out) - a]
    return normalize(out, .8)


# ---------------------------------------------------------------- SFX
def riser(dur=2.0, f0=250, f1=7000, seed=0):
    t = tt(dur)
    nz = sweep_filter(noise(dur, seed), f0, f1, q_oct=1.2)
    tone = np.sin(TAU * np.cumsum(glide(f0 / 2, f1 / 6, dur)) / SR) * .25
    trem = .75 + .25 * np.sin(TAU * np.cumsum(np.linspace(3, 18, len(t))) / SR)
    e = (t / dur) ** 2.2
    return fade(normalize(nz * 1.2 + tone, .9) * e * trem, .01, .02)


def whoosh(dur=.55, f0=400, f1=3500, seed=0):
    t = tt(dur)
    nz = sweep_filter(pink(dur, seed), f0, f1, q_oct=1.6)
    e = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.6
    return fade(normalize(nz, .9) * e, .002, .02)


def sub_boom(dur=1.4, f0=90, f1=34, seed=0):
    t = tt(dur)
    ph = TAU * np.cumsum(glide(f0, f1, dur, .35)) / SR
    out = np.sin(ph) * np.exp(-t / .55) + fft_filter(noise(dur, seed), hi=180) * np.exp(-t / .08) * .5
    return fade(normalize(out, 1.0), .001, .1)


def firework_launch(dur=1.0, f0=700, f1=2400, whistle=True, seed=0):
    """rocket going up: hiss + optional rising whistle."""
    t = tt(dur)
    hiss = sweep_filter(noise(dur, seed), 2500, 6000, q_oct=2.0) * (0.4 + .6 * t / dur)
    out = hiss * .6
    if whistle:
        f = glide(f0, f1, dur, dur, 'exp') * (1 + .004 * np.sin(TAU * 23 * t))
        out += np.sin(TAU * np.cumsum(f) / SR) * .45 * np.clip(t / .08, 0, 1)
    pop = np.exp(-t / .01) * fft_filter(noise(dur, seed + 1), hi=900) * .8
    return fade(normalize(out + pop, .85) * np.clip((dur - t) / .05, 0, 1), .001, .01)


def firework_burst(size=1.0, crackle_dur=1.4, seed=0):
    """BOOM + crack + rumble + trailing crackle."""
    dur = 2.4 + crackle_dur
    t = tt(dur)
    boom = sub_boom(dur, 75 * (1.2 - .2 * size), 32, seed)
    crack = fft_filter(noise(dur, seed + 2), lo=300) * np.exp(-t / .025) * 1.0
    rumble = fft_filter(noise(dur, seed + 3), hi=700) * np.exp(-t / .45) * .45
    out = boom * .9 * size + crack * .8 + rumble
    if crackle_dur > 0:
        c = crackle(crackle_dur, density=70, seed=seed + 4)
        a = int(.35 * SR)
        out[a:a + len(c)] += c[:len(out) - a] * .55
    return fade(normalize(out, 1.0), .0005, .2)


def crackle(dur=1.4, density=70, seed=0):
    """glittering crackle tail: random micro-bursts whose density decays."""
    r = rng(seed)
    n = n_samples(dur)
    out = np.zeros(n + 2000)
    nb = int(density * dur)
    for i in range(nb):
        at = r.uniform(0, 1) ** 1.6 * dur
        L = r.integers(60, 260)
        b = r.uniform(-1, 1, L) * np.exp(-np.arange(L) / (L / 4)) * r.uniform(.2, 1) * (1 - at / dur * .7)
        a = int(at * SR)
        out[a:a + L] += b
    return normalize(fft_filter(out[:n], lo=1800), .8)


def sparkler(dur=2.0, seed=0):
    t = tt(dur)
    r = rng(seed)
    base = fft_filter(noise(dur, seed), lo=3500) * (.35 + .25 * np.abs(np.sin(TAU * 2.3 * t)))
    flutter = np.repeat(r.uniform(.3, 1, n_samples(dur) // 400 + 2), 400)[:len(t)]
    out = base * flutter + crackle(dur, density=90, seed=seed + 1) * .35
    return fade(normalize(out, .8), .15, .25)


def flip_clack(seed=0):
    """mechanical tri-vision panel flip: whirr + clack."""
    d = .32
    t = tt(d)
    whirr = sweep_filter(noise(d, seed), 800, 2400, q_oct=1.5) * np.sin(np.pi * np.clip(t / .22, 0, 1)) * .5
    knock = np.zeros(len(t))
    k0 = int(.22 * SR)
    kt = tt(d - .22)
    knock[k0:] = (np.sin(TAU * 190 * kt) * np.exp(-kt / .02) + fft_filter(noise(d - .22, seed + 1), lo=1200, hi=4000) * np.exp(-kt / .008))
    return fade(normalize(whirr + knock, .9), .001, .01)


def pop(f0=900, f1=1500, dur=.09, seed=0):
    t = tt(dur)
    out = np.sin(TAU * np.cumsum(glide(f0, f1, dur, dur * .5)) / SR) * np.exp(-t / .025)
    return fade(normalize(out, .7), .0005, .01)


def ui_tap(seed=0):
    """soft phone-UI tap."""
    t = tt(.06)
    out = np.sin(TAU * 1800 * t) * np.exp(-t / .006) + fft_filter(noise(.06, seed), lo=3000) * np.exp(-t / .003) * .3
    return fade(normalize(out, .6), .0003, .01)


def match_strike(seed=0):
    """matchstick / diya lighting: scratch + flare + soft whump."""
    d = .9
    t = tt(d)
    scratch = fft_filter(noise(d, seed), lo=1500, hi=7000) * (np.clip(t / .02, 0, 1) * np.exp(-t / .09)) * .9
    flare = fft_filter(noise(d, seed + 1), lo=300, hi=3000) * np.exp(-((t - .12) / .12) ** 2) * .7
    whump = np.sin(TAU * np.cumsum(glide(160, 90, d, .2)) / SR) * np.exp(-np.maximum(t - .1, 0) / .2) * (t > .1) * .5
    return fade(normalize(scratch + flare + whump, .85), .001, .1)


# ---------------------------------------------------------------- mixing
def make_ir(seconds=1.9, seed=7, damp_hz=6000):
    r = rng(seed)
    n = n_samples(seconds)
    t = tt(seconds)
    irs = []
    for ch in range(2):
        x = r.normal(0, 1, n) * np.exp(-t / (seconds / 6.5))
        x = fft_filter(x, lo=120, hi=damp_hz)
        for i in range(6):  # sparse early reflections
            a = int(r.uniform(.008, .07) * SR)
            x[a] += r.uniform(.4, .9) * (1 if r.uniform() > .5 else -1) * 3
        x[:int(.006 * SR)] *= np.linspace(0, 1, int(.006 * SR))
        irs.append(x / np.sqrt(np.sum(x ** 2)))
    return irs


def fft_convolve(a, b):
    n = len(a) + len(b) - 1
    N = 1 << int(np.ceil(np.log2(n)))
    return np.fft.irfft(np.fft.rfft(a, N) * np.fft.rfft(b, N), N)[:n]


class Mix:
    """stereo bus with a reverb send. add(sig, t, gain, pan[-1..1], send[0..1])"""

    def __init__(self, dur, tail=3.0):
        self.dur = dur
        self.n = n_samples(dur + tail)
        self.L = np.zeros(self.n)
        self.R = np.zeros(self.n)
        self.sendL = np.zeros(self.n)
        self.sendR = np.zeros(self.n)

    def add(self, sig, t, gain=1.0, pan=0.0, send=0.0):
        if t < 0:
            sig = sig[int(-t * SR):]
            t = 0
        a = int(round(t * SR))
        if a >= self.n or len(sig) == 0:
            return
        sig = sig[:self.n - a] * gain
        th = (np.clip(pan, -1, 1) + 1) * np.pi / 4
        gl, gr = np.cos(th), np.sin(th)
        self.L[a:a + len(sig)] += sig * gl
        self.R[a:a + len(sig)] += sig * gr
        if send > 0:
            self.sendL[a:a + len(sig)] += sig * gl * send
            self.sendR[a:a + len(sig)] += sig * gr * send

    def render(self, reverb=.9, target_rms_db=-15.0, ceiling_db=-1.0):
        irL, irR = make_ir()
        wl = fft_convolve(self.sendL, irL)[:self.n]
        wr = fft_convolve(self.sendR, irR)[:self.n]
        L = self.L + wl * reverb
        R = self.R + wr * reverb
        L, R = fft_filter(L, lo=28), fft_filter(R, lo=28)
        # loudness-ish normalisation, then soft-knee limiting
        rms = np.sqrt(np.mean(np.concatenate([L, R]) ** 2)) + 1e-9
        g = 10 ** (target_rms_db / 20) / rms
        L, R = L * g, R * g
        ceil = 10 ** (ceiling_db / 20)
        drive = 1.0

        def lim(x):
            return np.tanh(x * drive / ceil) * ceil / np.tanh(drive) if drive != 1 else np.tanh(x / ceil) * ceil
        L, R = lim(L), lim(R)
        n = n_samples(self.dur)
        L, R = L[:n], R[:n]
        f = min(n, n_samples(.5))
        L[-f:] *= np.linspace(1, 0, f) ** 1.5
        R[-f:] *= np.linspace(1, 0, f) ** 1.5
        return np.stack([L, R])

    def write(self, path, **kw):
        st = self.render(**kw)
        r = rng(99)
        pcm = np.clip(st.T * 32767 + r.uniform(-.5, .5, st.T.shape), -32768, 32767).astype('<i2')
        with wave.open(path, 'wb') as w:
            w.setnchannels(2)
            w.setsampwidth(2)
            w.setframerate(SR)
            w.writeframes(pcm.tobytes())
        peak = 20 * np.log10(np.max(np.abs(st)) + 1e-9)
        rms = 20 * np.log10(np.sqrt(np.mean(st ** 2)) + 1e-9)
        return {'path': path, 'seconds': st.shape[1] / SR, 'peak_db': round(float(peak), 2), 'rms_db': round(float(rms), 2)}
