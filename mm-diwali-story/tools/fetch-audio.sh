#!/usr/bin/env bash
# Fetch audio assets that are kept out of git:
#  - GeneralUser GS soundfont (free for commercial music; audio/sf/GeneralUser-GS-LICENSE.txt)
#  - VCSL CC0 percussion/bell samples (public domain; audio/samples/LICENSE.txt)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
"$ROOT/tools/fetch-soundfont.sh"
DST="$ROOT/audio/samples"
if [ -d "$DST/darbuka" ]; then exit 0; fi
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
git clone -q --filter=blob:none --no-checkout --depth 1 https://github.com/sgossner/VCSL "$tmp/v"
cd "$tmp/v" && git sparse-checkout init --no-cone
for d in "Idiophones/Struck Idiophones/"{"Hand Bells, Nepalese","Finger Cymbals","Sleigh Bells","Claps","Shaker, Small","Tambourine 1","Gong 1","Bell Tree","Hand Chimes","Glockenspiel","Suspended Cymbal 1"} "Membranophones/Struck Membranophones/"{"Darbuka","Frame Drum","Bass Drum 1"}; do echo "/$d/" >> .git/info/sparse-checkout; done
git checkout -q HEAD
find . -name "*.wav" -not -path "*/Legacy/*" | while IFS= read -r f; do
  inst=$(echo "$f" | awk -F/ '{print $4}' | tr 'A-Z ,' 'a-z__' | sed 's/__*/_/g'); mkdir -p "$DST/$inst"
  ffmpeg -nostdin -loglevel error -y -i "$f" -ar 48000 -c:a pcm_s16le -af "silenceremove=stop_periods=-1:stop_duration=0.6:stop_threshold=-70dB,atrim=0:6" "$DST/$inst/$(basename "$f")"
done
