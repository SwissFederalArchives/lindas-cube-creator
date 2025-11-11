#!/bin/bash
set -e

IMAGE_TAG="${1:-lindas-cube-creator-cli:test-build}"

echo "🧪 Running CLI smoke tests for ${IMAGE_TAG}..."

# Test 1: Check CLI help
if ! docker run --rm ${IMAGE_TAG} --help > /dev/null 2>&1; then
  echo "❌ CLI help command failed"
  exit 1
fi
echo "✅ CLI help works"

# Test 2: Check CLI version
OUTPUT=$(docker run --rm ${IMAGE_TAG} --version 2>&1 || true)
if [[ -z "$OUTPUT" ]]; then
  echo "⚠️  Warning: CLI version command didn't produce output"
else
  echo "✅ CLI version: $OUTPUT"
fi

echo "🎉 All CLI smoke tests passed!"
