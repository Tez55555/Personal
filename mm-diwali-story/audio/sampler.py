"""Sampled instruments via fluidsynth + GeneralUser GS (free for commercial music; see sf/GeneralUser-GS-LICENSE.txt).

    from sampler import render, GM, DRUM
    strings = render(GM['strings'], [(0.0, 62, 2.0, 90), (0.0, 66, 2.0, 80)], dur=4.0)   # -> stereo (2, n) float
    sitar   = render(GM['sitar'], notes, dur, bends=[(1.20, 0.0), (1.35, 2.0)])           # meend: bend in semitones
    claps   = render(0, [(t, DRUM['clap'], .1, 110) for t in beats], dur, drums=True)

Fluidsynth's own reverb/chorus are OFF: put stems through Mix(..., send=) for a shared space.
Notes: (start_s, midi_note, length_s, velocity 1-127). Bends: (time_s, semitones within +-bend_range).
CC: (time_s, controller, value) e.g. expression swells (11) or modwheel vibrato (1).
"""
import os
import subprocess
import tempfile
import wave

import mido
import numpy as np

SR = 48000
HERE = os.path.dirname(os.path.abspath(__file__))
SF2 = os.path.join(HERE, 'sf', 'GeneralUser-GS.sf2')

GM = {
    'piano': 0, 'celesta': 8, 'glock': 9, 'music_box': 10, 'vibes': 11, 'marimba': 12, 'tubular_bells': 14, 'dulcimer': 15,
    'nylon_guitar': 24, 'bass_finger': 33, 'synth_bass': 38, 'violin': 40, 'cello': 42, 'pizz': 45, 'harp': 46, 'timpani': 47,
    'strings': 48, 'slow_strings': 49, 'synth_strings': 50, 'choir': 52, 'voice_oohs': 53, 'orch_hit': 55, 'trumpet': 56,
    'french_horn': 60, 'brass': 61, 'flute': 73, 'recorder': 74, 'pan_flute': 75, 'bottle': 76, 'shakuhachi': 77, 'whistle': 78,
    'ocarina': 79, 'pad_warm': 89, 'pad_poly': 90, 'pad_choir': 91, 'pad_bowed': 92, 'pad_halo': 94, 'pad_sweep': 95,
    'fx_crystal': 98, 'fx_atmos': 99, 'fx_bright': 100, 'sitar': 104, 'banjo': 105, 'shamisen': 106, 'koto': 107, 'kalimba': 108,
    'bagpipe': 109, 'fiddle': 110, 'shehnai': 111, 'tinkle_bell': 112, 'agogo': 113, 'steel_drum': 114, 'woodblock': 115,
    'taiko': 116, 'melodic_tom': 117, 'synth_drum': 118, 'reverse_cymbal': 119,
}
DRUM = {  # GM percussion keys (channel 10)
    'kick': 36, 'side_stick': 37, 'snare': 38, 'clap': 39, 'low_tom': 45, 'mid_tom': 47, 'hi_tom': 50, 'crash': 49, 'ride': 51,
    'ride_bell': 53, 'tambourine': 54, 'splash': 55, 'cowbell': 56, 'crash2': 57, 'hi_bongo': 60, 'lo_bongo': 61,
    'mute_conga': 62, 'open_conga': 63, 'lo_conga': 64, 'hi_timbale': 65, 'lo_timbale': 66, 'hi_agogo': 67, 'lo_agogo': 68,
    'cabasa': 69, 'maracas': 70, 'short_whistle': 71, 'claves': 75, 'hi_wood': 76, 'lo_wood': 77, 'triangle_mute': 80,
    'triangle': 81, 'shaker': 82, 'jingle_bell': 83, 'bell_tree': 84, 'castanets': 85,
}
KITS = {'standard': 0, 'room': 8, 'power': 16, 'electronic': 24, 'jazz': 32, 'brush': 40, 'orchestra': 48, 'sfx': 56}

TPB = 960
TEMPO = 500000  # 120 bpm -> 1 s = 1920 ticks


def _ticks(t):
    return int(round(t * TPB * 1e6 / TEMPO))


def render(program, notes, dur, bends=None, cc=None, drums=False, kit='standard', bend_range=2, gain=1.0, volume=110, pan=64):
    """Render one instrument part to a stereo float array of exactly dur(+tail) seconds."""
    ch = 9 if drums else 0
    ev = []  # (time, order, msg)
    ev.append((0, 0, mido.Message('control_change', channel=ch, control=7, value=volume)))
    ev.append((0, 0, mido.Message('control_change', channel=ch, control=10, value=pan)))
    ev.append((0, 0, mido.Message('control_change', channel=ch, control=91, value=0)))
    ev.append((0, 0, mido.Message('control_change', channel=ch, control=93, value=0)))
    if drums:
        ev.append((0, 1, mido.Message('program_change', channel=ch, program=KITS.get(kit, 0))))
    else:
        ev.append((0, 1, mido.Message('program_change', channel=ch, program=int(program))))
        for c, v in ((101, 0), (100, 0), (6, int(bend_range)), (38, 0), (101, 127), (100, 127)):  # RPN pitch-bend range
            ev.append((0, 1, mido.Message('control_change', channel=ch, control=c, value=v)))
    for (t, n, ln, vel) in notes:
        ev.append((t, 3, mido.Message('note_on', channel=ch, note=int(n), velocity=int(max(1, min(127, vel))))))
        ev.append((t + ln, 2, mido.Message('note_off', channel=ch, note=int(n), velocity=0)))
    for (t, semis) in (bends or []):
        v = int(max(-8192, min(8191, round(semis / bend_range * 8192))))
        ev.append((t, 2, mido.Message('pitchwheel', channel=ch, pitch=v)))
    for (t, ctl, val) in (cc or []):
        ev.append((t, 2, mido.Message('control_change', channel=ch, control=int(ctl), value=int(val))))
    ev.sort(key=lambda e: (e[0], e[1]))
    mid = mido.MidiFile(ticks_per_beat=TPB)
    tr = mido.MidiTrack()
    mid.tracks.append(tr)
    tr.append(mido.MetaMessage('set_tempo', tempo=TEMPO, time=0))
    last = 0
    for (t, _, m) in ev:
        tk = _ticks(max(0, t))
        tr.append(m.copy(time=tk - last))
        last = tk
    end = _ticks(dur + 3.0)
    tr.append(mido.MetaMessage('end_of_track', time=max(0, end - last)))
    with tempfile.TemporaryDirectory() as d:
        mp, wp = os.path.join(d, 'p.mid'), os.path.join(d, 'p.wav')
        mid.save(mp)
        subprocess.run(['fluidsynth', '-ni', '-q', '-R', '0', '-C', '0', '-g', '0.8', '-r', str(SR), '-F', wp, SF2, mp],
                       check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        with wave.open(wp) as w:
            nch, sw, n = w.getnchannels(), w.getsampwidth(), w.getnframes()
            raw = w.readframes(n)
    dt = {2: np.int16, 4: np.int32}[sw]
    x = np.frombuffer(raw, dtype=dt).astype(np.float64) / float(np.iinfo(dt).max)
    x = x.reshape(-1, nch).T
    if nch == 1:
        x = np.vstack([x, x])
    want = int(round((dur + 3.0) * SR))
    if x.shape[1] < want:
        x = np.pad(x, ((0, 0), (0, want - x.shape[1])))
    return x[:, :want] * gain
