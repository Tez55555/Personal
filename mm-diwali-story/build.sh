#!/usr/bin/env bash
# Build one version of the film:
#   CUT  (language)  hi = Hindi-first original | en = all English | mix = English-led with small Hindi lines
#   EDIT (edit list) full | main | short        (scenes/cuts.json)
#   LITE=1           less brand (no MM plates / van logo / MEDIA PARTNER)
#   NAME             output base name (default derived from the options)
# Renders frames (motion blur + finishing pass) -> mezzanine H.264, synthesizes the soundtrack, applies the same edit
# to the audio, and muxes a share-ready MP4 (H.264 High 4.2, BT.709, ~6 Mbps peak, AAC 192k, +faststart) + poster.
set -euo pipefail
cd "$(dirname "$0")"
CUT=${CUT:-hi}; EDIT=${EDIT:-full}; LITE=${LITE:-0}
SUF=""
[ "$CUT" = "en" ] && SUF="$SUF-EN"
[ "$CUT" = "mix" ] && SUF="$SUF-EN-HI"
[ "$EDIT" = "main" ] && SUF="$SUF-Main"
[ "$EDIT" = "short" ] && SUF="$SUF-Short"
NAME=${NAME:-MM-Diwali-Story$SUF}
OUT=out/$NAME.mp4
MASTER=out/master_$NAME.mp4
LITEFLAG=""; [ "$LITE" = "1" ] && LITEFLAG="--lite"
mkdir -p out
tools/fetch-audio.sh
if [ "${SKIP_VIDEO:-0}" != "1" ]; then
  node render/render.js --lang "$CUT" --cut "$EDIT" $LITEFLAG --video "$MASTER" --workers "${WORKERS:-3}" --crf "${CRF:-13}" --preset "${PRESET:-medium}"
fi
python3 audio/compose.py --out out/soundtrack.wav
AUDIO=out/soundtrack.wav
if [ "$EDIT" != "full" ]; then python3 audio/cut.py --in out/soundtrack.wav --cut "$EDIT" --out "out/soundtrack_$EDIT.wav"; AUDIO="out/soundtrack_$EDIT.wav"; fi
DUR=$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$MASTER")
ffmpeg -y -loglevel error -i "$MASTER" -i "$AUDIO" \
  -map 0:v:0 -map 1:a:0 \
  -c:v libx264 -preset slow -tune film -crf 18 -maxrate 6M -bufsize 12M -profile:v high -level 4.2 -pix_fmt yuv420p \
  -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv \
  -x264-params "aq-mode=3:deblock=-1,-1" -r 30 -g 60 \
  -c:a aac -b:a 192k -ar 48000 -ac 2 \
  -t "$DUR" -movflags +faststart \
  -metadata title="Happy Diwali · शुभ दीपावली — MM Advertising" "$OUT"
# poster / thumbnail: the end-card hold, 1 s before the end
PT=$(python3 -c "print(round(max(0, $DUR - 1.0), 2))")
node render/render.js --lang "$CUT" --cut "$EDIT" $LITEFLAG --stills "$PT" --scale 1 --outdir "out/poster_$NAME" >/dev/null
cp "out/poster_$NAME/frame_$(printf '%.2f' "$PT").png" "out/$NAME-poster.png"
ffprobe -v error -show_entries format=duration,size,bit_rate:stream=codec_name,profile,width,height,pix_fmt,r_frame_rate -of compact "$OUT"
echo "built $OUT"
