#!/bin/bash
set -e

IMAGE_TAG=$1

echo "Setting up local environment for Lindas Cube Creator..."

# Clean up old environment
echo "Cleaning up old environment..."
docker-compose -f docker-compose.offline.yml down -v

# Set IMAGE_TAG environment variable if provided
if [ -n "$IMAGE_TAG" ]; then
    export IMAGE_TAG=$IMAGE_TAG
    echo "Using image tag: $IMAGE_TAG"
    # If image tag is provided, we pull images instead of building
    echo "Pulling and starting services..."
    docker-compose -f docker-compose.offline.yml up -d
else
    echo "No image tag provided. Building from source..."
    # If no image tag, we build
    docker-compose -f docker-compose.offline.yml up -d --build
fi

# Wait for API to be healthy
echo "Waiting for API to be ready..."
retries=60
while [ $retries -gt 0 ]; do
    id=$(docker-compose -f docker-compose.offline.yml ps -q api)
    if [ -n "$id" ]; then
        health=$(docker inspect --format='{{.State.Health.Status}}' $id)
        if [ "$health" == "healthy" ]; then
            echo "API is healthy."
            break
        fi
    fi
    sleep 5
    retries=$((retries-1))
    echo -n "."
done
echo ""

if [ $retries -eq 0 ]; then
    echo "API failed to become healthy."
    exit 1
fi

# Seed data
echo "Seeding sample data..."
docker-compose -f docker-compose.offline.yml exec -w /app -T api node /app/packages/testing/index.js -i ubd dimensions px-cube hierarchies

echo "Setup complete!"
echo "UI: http://localhost:8080"
echo "API: http://localhost:3000"
echo "Fuseki: http://localhost:3030"
echo "Minio: http://localhost:9000 (Console: http://localhost:9001)"