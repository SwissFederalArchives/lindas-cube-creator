#!/bin/bash
set -e

echo "🚀 Local Testing Script for lindas-cube-creator"
echo "================================================"
echo ""

# Function to print section headers
section() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  $1"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
}

# Parse command line arguments
SKIP_BUILD=false
SKIP_SMOKE=false
SKIP_E2E=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-build)
      SKIP_BUILD=true
      shift
      ;;
    --skip-smoke)
      SKIP_SMOKE=true
      shift
      ;;
    --skip-e2e)
      SKIP_E2E=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: ./test-local.sh [--skip-build] [--skip-smoke] [--skip-e2e]"
      exit 1
      ;;
  esac
done

# Build Docker images
if [ "$SKIP_BUILD" = false ]; then
  section "1. Building Docker Images"

  echo "📦 Building API image..."
  docker build -f api.Dockerfile -t lindas-cube-creator-api:test-build --build-arg COMMIT=test .

  echo "📦 Building App image (using local Dockerfile)..."
  docker build -f app.Dockerfile.local -t lindas-cube-creator-app:test-build --build-arg COMMIT=test --build-arg PUBLIC_PATH=/app/ .

  echo "📦 Building CLI image..."
  docker build -f cli.Dockerfile -t lindas-cube-creator-cli:test-build --build-arg COMMIT=test .

  echo "✅ All images built successfully"
else
  echo "⏭️  Skipping build (--skip-build flag)"
fi

# Run smoke tests
if [ "$SKIP_SMOKE" = false ]; then
  section "2. Running Smoke Tests"

  echo "🧪 Testing API..."
  bash ./smoke-tests/api-smoke.sh lindas-cube-creator-api:test-build

  echo ""
  echo "🧪 Testing App..."
  bash ./smoke-tests/app-smoke.sh lindas-cube-creator-app:test-build

  echo ""
  echo "🧪 Testing CLI..."
  bash ./smoke-tests/cli-smoke.sh lindas-cube-creator-cli:test-build

  echo "✅ All smoke tests passed"
else
  echo "⏭️  Skipping smoke tests (--skip-smoke flag)"
fi

# Run E2E tests
if [ "$SKIP_E2E" = false ]; then
  section "3. Running E2E Tests"

  echo "📋 Note: This will start the full E2E environment with docker-compose"
  echo "Press Ctrl+C within 5 seconds to skip..."
  sleep 5

  echo "🚀 Starting E2E environment..."
  docker compose -f docker-compose.e2e.yml up -d

  echo "⏳ Waiting for services to be ready..."
  timeout 180 bash -c 'until curl -f http://localhost:3000/api/ > /dev/null 2>&1; do sleep 5; echo -n "."; done'
  echo ""
  echo "✅ API is ready"

  timeout 180 bash -c 'until curl -f http://localhost:8080/ > /dev/null 2>&1; do sleep 5; echo -n "."; done'
  echo ""
  echo "✅ App is ready"

  echo ""
  echo "🧪 Running API E2E tests (Hypertest)..."
  docker compose -f docker-compose.e2e.yml run --rm e2e-tests

  echo ""
  echo "🧪 Running UI E2E tests (Playwright)..."
  cd e2e-ui
  yarn install --frozen-lockfile
  yarn test
  cd ..

  echo ""
  echo "🛑 Stopping E2E environment..."
  docker compose -f docker-compose.e2e.yml down -v

  echo "✅ All E2E tests passed"
else
  echo "⏭️  Skipping E2E tests (--skip-e2e flag)"
fi

section "✅ All Tests Passed!"
echo "Your changes are ready to commit and push."
echo ""
echo "Next steps:"
echo "1. Review changes: git status"
echo "2. Commit changes: git add . && git commit"
echo "3. Push to develop: git push origin develop"
echo ""
