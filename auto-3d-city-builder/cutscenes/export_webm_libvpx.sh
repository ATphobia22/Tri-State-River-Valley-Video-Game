#!/usr/bin/env bash
# Twinmotion / Unreal / screen-capture → WebM (VP9 + Opus) via FFmpeg libvpx
# Native Bink remains a separate RAD tools step; this path is for browser cutscenes.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IN="${1:-}"
OUT="${2:-$ROOT/cutscenes/out/flythrough.webm}"
PRESET="${3:-web}"   # web | high | preview

if [[ -z "$IN" || ! -f "$IN" ]]; then
  echo "Usage: $0 <input.mp4|mov|mkv> [output.webm] [web|high|preview]"
  echo "Requires: ffmpeg built with --enable-libvpx --enable-libopus"
  exit 1
fi

mkdir -p "$(dirname "$OUT")"

case "$PRESET" in
  high)
    CRF=24; CPU=1; DEADLINE=good
    ;;
  preview)
    CRF=36; CPU=5; DEADLINE=realtime
    ;;
  web|*)
    CRF=30; CPU=2; DEADLINE=good
    ;;
esac

echo "libvpx-vp9 encode: preset=$PRESET crf=$CRF cpu-used=$CPU → $OUT"

ffmpeg -y -i "$IN" \
  -c:v libvpx-vp9 \
  -b:v 0 -crf "$CRF" \
  -deadline "$DEADLINE" \
  -cpu-used "$CPU" \
  -row-mt 1 \
  -tile-columns 2 \
  -frame-parallel 1 \
  -auto-alt-ref 1 \
  -lag-in-frames 16 \
  -pix_fmt yuv420p \
  -c:a libopus -b:a 128k \
  -movflags +faststart \
  "$OUT"

echo "Done: $OUT"
ls -lh "$OUT"
echo ""
echo "Native (Bink) path: encode master in RAD Video Tools → .bik for UE/native."
echo "  Web keeps WebM; do not replace surveyed world data with generative video."
