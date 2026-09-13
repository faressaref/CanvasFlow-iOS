#!/bin/bash
set -e

ROOT="$CM_BUILD_DIR"
ICON_SRC="$ROOT/assets/CanvasFlow-AppIcon.svg"
ASSET_DIR="$ROOT/ios/App/App/Assets.xcassets/AppIcon.appiconset"
mkdir -p "$ASSET_DIR"

python3 -m pip install --quiet --disable-pip-version-check cairosvg
python3 - "$ICON_SRC" "$ASSET_DIR/AppIcon-1024.png" <<'PY'
import sys, cairosvg
cairosvg.svg2png(url=sys.argv[1], write_to=sys.argv[2], output_width=1024, output_height=1024)
PY

cat > "$ASSET_DIR/Contents.json" <<'JSON'
{
  "images": [
    {
      "filename": "AppIcon-1024.png",
      "idiom": "universal",
      "platform": "ios",
      "size": "1024x1024"
    }
  ],
  "info": {
    "author": "xcode",
    "version": 1
  }
}
JSON

echo "CanvasFlow: new app icon installed."
ls -lh "$ASSET_DIR/AppIcon-1024.png"
