#!/bin/sh
# Build POS web content for Capacitor
set -e

rm -rf pos-dist
mkdir -p pos-dist

# Copy POS files
cp pos/index.html pos-dist/index.html

# Copy shared assets
cp amogha-logo.png pos-dist/amogha-logo.png 2>/dev/null || true

# Fix asset paths: ../amogha-logo.png -> ./amogha-logo.png
sed -i.bak 's|\.\.\/amogha-logo\.png|./amogha-logo.png|g' pos-dist/index.html

# Clean up sed backup files
rm -f pos-dist/*.bak

echo "POS build complete → pos-dist/"
