#!/usr/bin/env bash
# Convertit un MP4 en HLS multi-qualité (360p, 480p, 720p) — AfriWonder
# Usage: ./convert-to-hls.sh input.mp4 [output_dir]
# Si output_dir est omis, les fichiers sont créés à côté de input.mp4.

set -e
INPUT="$1"
OUTPUT_DIR="${2:-$(dirname "$INPUT")}"

if [ -z "$INPUT" ] || [ ! -f "$INPUT" ]; then
  echo "Usage: $0 input.mp4 [output_dir]"
  echo "  output_dir: dossier de sortie (défaut: même dossier que input)"
  exit 1
fi

mkdir -p "$OUTPUT_DIR"
cd "$OUTPUT_DIR"

# Base des noms de fichiers (sans chemin)
BASENAME=$(basename "$INPUT" .mp4)
# Chemins absolus pour FFmpeg
INPUT_ABS=$(cd "$(dirname "$INPUT")" && pwd)/$(basename "$INPUT")
OUT_ABS=$(pwd)

ffmpeg -i "$INPUT_ABS" \
  -filter_complex "[0:v]split=3[v1][v2][v3]" \
  -map "[v1]" -b:v:0 800k -s:v:0 640x360 \
  -map "[v2]" -b:v:1 1400k -s:v:1 842x480 \
  -map "[v3]" -b:v:2 2800k -s:v:2 1280x720 \
  -map a:0 -c:a aac -b:a 128k \
  -f hls \
  -hls_time 4 \
  -hls_playlist_type vod \
  -hls_segment_filename "${BASENAME}_%v_%03d.ts" \
  -master_pl_name "${BASENAME}_master.m3u8" \
  "${BASENAME}_%v.m3u8"

echo "Done. Master playlist: ${OUT_ABS}/${BASENAME}_master.m3u8"
echo "Upload this file and all .m3u8 /.ts to your CDN and set video.video_url to the master URL."
