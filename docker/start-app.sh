#!/bin/sh
set -eu

echo "Generating config.js from template..."
OUTPUT="$WEB_ROOT/config.js"
TEMPLATE="$WEB_ROOT/config.js.template"

if [ -f "$TEMPLATE" ]; then
  envsubst < "$TEMPLATE" > "$OUTPUT"
  echo "Config generated at $OUTPUT"
else
  echo "Warning: Template not found at $TEMPLATE"
fi
