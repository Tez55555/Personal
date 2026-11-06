#!/usr/bin/env bash
# Full build: render frames -> H.264, synthesize soundtrack, mux into a share-ready MP4.
set -euo pipefail
cd "$(dirname "$0")"
OUT=${OUT:-out/MM-Diwali-Story.mp4}
mkdir -p out
node render/render.js --video out/video.mp4 --workers ${WORKERS:-3} --crf ${CRF:-17}
python3 audio/compose.py --out out/soundtrack.wav
DUR=$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 out/video.mp4)
ffmpeg -y -loglevel error -i out/video.mp4 -i out/soundtrack.wav \
  -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 192k -ar 48000 -ac 2 \
  -af "afade=t=out:st=$(python3 -c "print(max(0,$DUR-0.6))"):d=0.6" \
  -t "$DUR" -movflags +faststart "$OUT"
ffprobe -v error -show_entries format=duration,size:stream=codec_name,width,height -of compact "$OUT"
echo "built $OUT"
