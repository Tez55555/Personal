"""Real recorded CC0 percussion & bells (VCSL, public domain) for layering with the synth/sampler.

    from samples import hit, list_samples
    list_samples('darbuka')                     # file names (stroke types, velocity layers vlN, round robins rrN)
    x = hit('darbuka', 'Darbuka_1_hit_vl2', rr=1)   # stereo (2, n) float at 48 kHz
    bell = hit('hand_bells_nepalese', 'HB_2', semis=-2)   # pitch-shift by resampling

Instruments: bass_drum_1, bell_tree, claps, darbuka (dholak/tabla-ish slaps), finger_cymbals (manjira), frame_drum (daf),
glockenspiel (pitched C5..C8), gong_1, hand_bells_nepalese (temple bells), hand_chimes (pitched), shaker_small,
sleigh_bells (ghungroo stand-in), suspended_cymbal_1 (swells/crash), tambourine_1.
Fetch them with tools/fetch-audio.sh if the folder is empty.
"""
import os
import wave
from functools import lru_cache

import numpy as np

SR = 48000
DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'samples')


def list_samples(inst):
    return sorted(f for f in os.listdir(os.path.join(DIR, inst)) if f.endswith('.wav'))


@lru_cache(maxsize=512)
def _load(path):
    with wave.open(path) as w:
        nch, sw, n, sr = w.getnchannels(), w.getsampwidth(), w.getnframes(), w.getframerate()
        raw = w.readframes(n)
    x = np.frombuffer(raw, dtype=np.int16).astype(np.float64) / 32768.0
    x = x.reshape(-1, nch).T
    if nch == 1:
        x = np.vstack([x, x])
    return x[:2]


def hit(inst, contains='', rr=0, semis=0.0, gain=1.0, max_len=None):
    """stereo sample whose filename contains `contains` (rr picks among matches, cycling). semis: pitch shift."""
    files = [f for f in list_samples(inst) if contains.lower() in f.lower()]
    if not files:
        raise FileNotFoundError(f'{inst}/{contains}* not found; options: {list_samples(inst)[:12]}')
    x = _load(os.path.join(DIR, inst, files[rr % len(files)]))
    if semis:
        r = 2 ** (semis / 12)
        n = int(x.shape[1] / r)
        src = np.arange(n) * r
        x = np.vstack([np.interp(src, np.arange(x.shape[1]), x[c]) for c in range(2)])
    if max_len:
        x = x[:, :int(max_len * SR)]
    return x * gain
