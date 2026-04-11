#!/bin/bash
# Convert all .mp3 files in the audio directories to .ogg (Vorbis)
# Requires: ffmpeg (brew install ffmpeg)

AUDIO_DIR="$(dirname "$0")/../public/game/audio"

for dir in "$AUDIO_DIR/sfx" "$AUDIO_DIR/bgm"; do
  if [ ! -d "$dir" ]; then
    echo "Skipping $dir (not found)"
    continue
  fi
  for f in "$dir"/*.mp3; do
    [ -f "$f" ] || continue
    out="${f%.mp3}.ogg"
    echo "Converting: $(basename "$f") → $(basename "$out")"
    ffmpeg -y -i "$f" -c:a libvorbis -q:a 4 "$out" 2>/dev/null
  done
  echo ""
done

echo "Done. You can now delete the .mp3 files if you want:"
echo "  rm $AUDIO_DIR/sfx/*.mp3 $AUDIO_DIR/bgm/*.mp3"
