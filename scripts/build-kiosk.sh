#!/bin/sh
# Build kiosk web content for Capacitor
set -e

rm -rf kiosk-dist
mkdir -p kiosk-dist

# Copy kiosk files
cp kiosk/index.html kiosk-dist/index.html
cp kiosk/sw.js kiosk-dist/sw.js
cp kiosk/manifest.json kiosk-dist/manifest.json

# Copy shared assets (kiosk references ../amogha-logo.png)
cp amogha-logo.png kiosk-dist/amogha-logo.png 2>/dev/null || true

# Fix asset paths: ../amogha-logo.png -> ./amogha-logo.png
sed -i.bak 's|\.\.\/amogha-logo\.png|./amogha-logo.png|g' kiosk-dist/index.html
sed -i.bak 's|\.\.\/amogha-logo\.png|./amogha-logo.png|g' kiosk-dist/manifest.json
sed -i.bak 's|\.\.\/amogha-logo\.png|./amogha-logo.png|g' kiosk-dist/sw.js

# Clean up sed backup files
rm -f kiosk-dist/*.bak

echo "Kiosk build complete → kiosk-dist/"
