#!/bin/bash
set -e

IMAGE_TAG="${1:-lindas-cube-creator-app:test-build}"

echo "🧪 Running App smoke tests for ${IMAGE_TAG}..."

# Start container
CONTAINER_ID=$(docker run -d \
  -e AUTH_ISSUER=https://example.com/auth \
  -e AUTH_CLIENT_ID=example-client-id \
  -p 8080:80 \
  ${IMAGE_TAG})

printf "Container started: %s\n" "${CONTAINER_ID}"

# Wait for container to be ready
echo "Waiting for App to be ready..."
MAX_ATTEMPTS=30
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  if curl -f http://localhost:8080/ > /dev/null 2>&1; then
    echo "✅ App is responding"
    break
  fi
  ATTEMPT=$((ATTEMPT+1))
  echo "Attempt $ATTEMPT/$MAX_ATTEMPTS - waiting..."
  sleep 2
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
  echo "❌ App failed to start"
  docker logs $CONTAINER_ID
  docker stop $CONTAINER_ID
  docker rm $CONTAINER_ID
  exit 1
fi

# Run smoke tests
echo "Running smoke tests..."

# Test 1: Check index.html is served
RESPONSE=$(curl -s http://localhost:8080/)
if [[ ! "$RESPONSE" =~ "app" ]]; then
  echo "❌ Index.html not found or invalid"
  docker stop $CONTAINER_ID
  docker rm $CONTAINER_ID
  exit 1
fi
echo "✅ Index.html is served correctly"

# Test 2: Check static assets
if ! curl -f http://localhost:8080/app/ > /dev/null 2>&1; then
  echo "❌ App route not accessible"
  docker stop $CONTAINER_ID
  docker rm $CONTAINER_ID
  exit 1
fi
echo "✅ App route is accessible"

# Test 3: Check version is displayed (with lindas- prefix)
if [[ ! "$RESPONSE" =~ "lindas-" ]]; then
  echo "⚠️  Warning: 'lindas-' prefix not found in version"
fi

# Cleanup
docker stop $CONTAINER_ID
docker rm $CONTAINER_ID

echo "🎉 All App smoke tests passed!"
