#!/usr/bin/env bash
# Pipeline HLS — AfriWonder CDC.
# Usage: ./convert-to-hls.sh <input.mp4> <output_dir>
# Produit: <output_dir>/master.m3u8 et segments .ts (3 qualités: 360p, 480p, 720p).

set -e
INPUT="${1:?Usage: $0 <input.mp4> <output_dir>}"
OUTDIR="${2:?Usage: $0 <input.mp4> <output_dir>}"
mkdir -p "$OUTDIR"

ffmpeg -y -i "$INPUT" \
  -filter_complex '[0:v]split=3[v1][v2][v3];[v1]scale=640:360[v1o];[v2]scale=842:480[v2o];[v3]scale=1280:720[v3o]' \
  -map '[v1o]' -b:v:0 800k \
  -map '[v2o]' -b:v:1 1400k \
  -map '[v3o]' -b:v:2 2800k \
  -map a:0? -c:a aac -b:a 128k \
  -f hls -hls_time 4 -hls_playlist_type vod \
  -hls_segment_filename "$OUTDIR/seg_%v_%03d.ts" \
  -master_pl_name master.m3u8 \
  -var_stream_map 'v:0 v:1 v:2' \
  "$OUTDIR/out_%v.m3u8"

echo "HLS generated in $OUTDIR (master.m3u8)"
test -f "$OUTDIR/master.m3u8"
