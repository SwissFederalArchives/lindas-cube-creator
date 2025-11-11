# Smoke Tests

This directory contains smoke tests for Docker images before they are pushed to the registry.

## Purpose

Smoke tests verify that Docker images are functional and can start successfully. They run immediately after building images and before pushing them.

## Tests

### API Smoke Test (`api-smoke.sh`)
- Starts the API container
- Verifies the API responds to health checks
- Validates response headers
- Cleans up container

### App Smoke Test (`app-smoke.sh`)
- Starts the App container
- Verifies index.html is served
- Checks that app routes are accessible
- Validates version display includes "lindas-" prefix
- Cleans up container

### CLI Smoke Test (`cli-smoke.sh`)
- Verifies CLI help command works
- Checks CLI version command

## Usage

```bash
# Run individual smoke test
./smoke-tests/api-smoke.sh lindas-cube-creator-api:test-build
./smoke-tests/app-smoke.sh lindas-cube-creator-app:test-build
./smoke-tests/cli-smoke.sh lindas-cube-creator-cli:test-build

# Or use default tag
./smoke-tests/api-smoke.sh
```

## Notes

- Tests expect Docker to be running
- Tests use specific ports (3001 for API, 8080 for App)
- All tests clean up after themselves
- Exit code 0 = success, non-zero = failure
