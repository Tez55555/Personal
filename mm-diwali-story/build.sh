#!/usr/bin/env bash
# Full build: render frames (motion blur + finishing pass) -> mezzanine H.264, synthesize the soundtrack,
# then a share-ready MP4 tuned for WhatsApp/Instagram forwarding (H.264 High 4.2, yuv420p, ~5-6 Mbps peak,
# AAC 192k 48 kHz stereo, +faststart) and a poster frame.
set -euo pipefail
cd "$(dirname "$0")"
OUT=${OUT:-out/MM-Diwali-Story.mp4}
mkdir -p out
tools/fetch-audio.sh
if [ "${SKIP_VIDEO:-0}" != "1" ]; then
  node render/render.js --video out/video_master.mp4 --workers "${WORKERS:-3}" --crf "${CRF:-13}" --preset "${PRESET:-medium}"
fi
python3 audio/compose.py --out out/soundtrack.wav
DUR=$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 out/video_master.mp4)
ffmpeg -y -loglevel error -i out/video_master.mp4 -i out/soundtrack.wav \
  -map 0:v:0 -map 1:a:0 \
  -c:v libx264 -preset slow -tune film -crf 18 -maxrate 6M -bufsize 12M -profile:v high -level 4.2 -pix_fmt yuv420p \
  -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv \
  -x264-params "aq-mode=3:deblock=-1,-1" -r 30 -g 60 \
  -c:a aac -b:a 192k -ar 48000 -ac 2 \
  -t "$DUR" -movflags +faststart \
  -metadata title="Happy Diwali · शुभ दीपावली — MM Advertising" "$OUT"
# poster / thumbnail: the end-card hold
node render/render.js --stills 23.4 --scale 1 --outdir out/poster >/dev/null && cp out/poster/frame_23.40.png out/MM-Diwali-Story-poster.png
ffprobe -v error -show_entries format=duration,size,bit_rate:stream=codec_name,profile,width,height,pix_fmt,r_frame_rate -of compact "$OUT"
echo "built $OUT"
