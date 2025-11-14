#!/bin/bash
# Simple shell script for smoke tests
set -e

echo "🧪 Running smoke tests..."

# API Smoke Test
echo "Testing API..."
if curl -f http://localhost:3000/api/ > /dev/null 2>&1; then
  echo "✅ API is responding"
else
  echo "❌ API health check failed"
  exit 1
fi

# App Smoke Test
echo "Testing App..."
if curl -f http://localhost:8080/ > /dev/null 2>&1; then
  echo "✅ App is responding"
else
  echo "❌ App health check failed"
  exit 1
fi

# App Route Test
echo "Testing App route..."
if curl -f http://localhost:8080/app/ > /dev/null 2>&1; then
  echo "✅ App route is accessible"
else
  echo "❌ App route check failed"
  exit 1
fi

# Fuseki Test
echo "Testing Fuseki..."
if curl -f http://localhost:3030/$/ping > /dev/null 2>&1; then
  echo "✅ Fuseki is responding"
else
  echo "❌ Fuseki health check failed"
  exit 1
fi

# MinIO Test
echo "Testing MinIO..."
if curl -f http://localhost:9000/minio/health/live > /dev/null 2>&1; then
  echo "✅ MinIO is responding"
else
  echo "❌ MinIO health check failed"
  exit 1
fi

echo "🎉 All smoke tests passed!"
