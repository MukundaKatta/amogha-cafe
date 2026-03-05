#!/bin/sh
cd /Users/ubl/Projects/amogha-cafe
docker run --rm -v "$PWD":/app -w /app node:20 sh -c "npm install --ignore-scripts >/dev/null 2>&1 && npx vitest run 2>&1" > /Users/ubl/Projects/amogha-cafe/test-run.txt 2>&1
echo "EXIT=$?" >> /Users/ubl/Projects/amogha-cafe/test-run.txt
