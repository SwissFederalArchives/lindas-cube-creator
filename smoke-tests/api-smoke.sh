#!/bin/bash
set -e

IMAGE_TAG="${1:-lindas-cube-creator-api:test-build}"

echo "🧪 Running API smoke tests for ${IMAGE_TAG}..."

# Start container
CONTAINER_ID=$(docker run -d \ \
  -e NODE_ENV=production \ \
  -e SPARQL_ENDPOINT=http://example.com/sparql \ \
  -e S3_ENDPOINT=http://example.com:9000 \ \
  -e S3_BUCKET=test \ \
  -e MANAGED_DIMENSIONS_GRAPH=http://example.com/managed-dimensions \ \
  -e MANAGED_DIMENSIONS_STORE_QUERY_ENDPOINT=http://example.com/sparql \
  -p 3001:3000 \ \
  ${IMAGE_TAG}) \
 \
echo "Container started: ${CONTAINER_ID}"

# Wait for container to be ready
echo "Waiting for API to be ready..."
MAX_ATTEMPTS=30
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  if curl -f http://localhost:3001/api/ > /dev/null 2>&1; then
    echo "✅ API is responding"
    break
  fi
  ATTEMPT=$((ATTEMPT+1))
  echo "Attempt $ATTEMPT/$MAX_ATTEMPTS - waiting..."
  sleep 2
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
  echo "❌ API failed to start"
  docker logs $CONTAINER_ID
  docker stop $CONTAINER_ID
  docker rm $CONTAINER_ID
  exit 1
fi

# Run smoke tests
echo "Running smoke tests..."

# Test 1: Health check
if ! curl -f http://localhost:3001/api/ > /dev/null 2>&1; then
  echo "❌ Health check failed"
  docker logs $CONTAINER_ID
  docker stop $CONTAINER_ID
  docker rm $CONTAINER_ID
  exit 1
fi
echo "✅ Health check passed"

# Test 2: Check response headers
CONTENT_TYPE=$(curl -s -I http://localhost:3001/api/ | grep -i content-type | awk '{print $2}')
if [[ ! "$CONTENT_TYPE" =~ "application/json" ]] && [[ ! "$CONTENT_TYPE" =~ "application/ld+json" ]]; then
  echo "❌ Unexpected content type: $CONTENT_TYPE"
  docker stop $CONTAINER_ID
  docker rm $CONTAINER_ID
  exit 1
fi
echo "✅ Content type is correct"

# Cleanup
docker stop $CONTAINER_ID
docker rm $CONTAINER_ID

echo "🎉 All API smoke tests passed!"
