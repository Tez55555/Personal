"""Apply an edit list (scenes/cuts.json) to the full soundtrack so a cut's audio matches its picture exactly.

    python3 audio/cut.py --in out/soundtrack.wav --cut short --out out/soundtrack_short.wav

Each join is an equal-power crossfade of the same length and position as the picture dissolve (centred on the join).
Joins are on the 100 BPM grid, so the groove stays in phase. The result is re-normalised to -14 LUFS / -1 dBFS.
"""
import argparse
import json
import os
import sys
import wave

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from synth import SR, peak_limit  # noqa: E402


def load(path):
    with wave.open(path) as w:
        n, ch, sr = w.getnframes(), w.getnchannels(), w.getframerate()
        x = np.frombuffer(w.readframes(n), dtype='<i2').astype(np.float64) / 32768.0
    assert sr == SR, sr
    return x.reshape(-1, ch).T


def save(path, st):
    rng = np.random.default_rng(7)
    pcm = np.clip(st.T * 32767 + rng.uniform(-.5, .5, st.T.shape), -32768, 32767).astype('<i2')
    with wave.open(path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--in', dest='inp', default='out/soundtrack.wav')
    ap.add_argument('--cut', required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--lufs', type=float, default=-14.0)
    a = ap.parse_args()
    root = os.path.dirname(HERE)
    spec = json.load(open(os.path.join(root, 'scenes', 'cuts.json')))[a.cut]
    src = load(a.inp)
    segs, X = spec['segs'], spec.get('xf', 0) / 30.0
    total = sum(b - s for s, b in segs)
    n_out = int(round(total * SR))
    out = np.zeros((2, n_out + SR))
    o = 0.0
    for k, (s, b) in enumerate(segs):
        pre = X / 2 if k > 0 else 0.0
        post = X / 2 if k < len(segs) - 1 else 0.0
        i0, i1 = int(round((s - pre) * SR)), int(round((b + post) * SR))
        piece = src[:, max(0, i0):min(src.shape[1], i1)].copy()
        m = piece.shape[1]
        env = np.ones(m)
        nx = int(round(X * SR))
        if pre > 0 and nx > 1:
            env[:nx] = np.sin(np.linspace(0, np.pi / 2, nx))
        if post > 0 and nx > 1:
            env[-nx:] *= np.cos(np.linspace(0, np.pi / 2, nx))
        if k == 0:  # soft start (the cut may begin mid-sound)
            f = int(.008 * SR); env[:f] *= np.linspace(0, 1, f)
        p0 = int(round((o - pre) * SR))
        out[:, p0:p0 + m] += piece * env
        o += b - s
    out = out[:, :n_out]
    try:
        import pyloudnorm as pyln
        meter = pyln.Meter(SR); g = 1.0
        for _ in range(4):
            y = peak_limit(out * g, 10 ** (-1.0 / 20))
            loud = meter.integrated_loudness(y.T)
            if abs(loud - a.lufs) < .15:
                break
            g *= 10 ** ((a.lufs - loud) / 20)
        out = y
    except ImportError:
        out = out / (np.max(np.abs(out)) + 1e-9) * 10 ** (-1 / 20)
    save(a.out, out)
    lufs = None
    try:
        import pyloudnorm as pyln
        lufs = round(float(pyln.Meter(SR).integrated_loudness(out.T)), 2)
    except ImportError:
        pass
    print(f'wrote {a.out}: cut {a.cut}, {n_out / SR:.3f} s, {lufs} LUFS, peak {20 * np.log10(np.max(np.abs(out)) + 1e-9):.2f} dBFS')


if __name__ == '__main__':
    main()
