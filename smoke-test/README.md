# Smoke Tests

Simple shell script-based smoke tests for Docker images.

## Test Script

`smoke-tests.sh` - Tests that Docker containers are running and responding correctly:

- ✅ API health check (http://localhost:3000/api/)
- ✅ App health check (http://localhost:8080/)
- ✅ App route check (http://localhost:8080/app/)
- ✅ Fuseki health check (http://localhost:3030/$/ping)
- ✅ MinIO health check (http://localhost:9000/minio/health/live)

## Usage

Run locally:
```bash
cd smoke-test
./smoke-tests.sh
```

## CI/CD

This script is integrated into the main CI pipeline (.github/workflows/ci.yaml) and runs automatically after Docker services are started.

## Why Shell Scripts?

Simple, fast, and reliable:
- No dependency management issues
- No Node.js/npm installation needed
- Direct curl commands for HTTP testing
- Easy to debug and understand
- Industry-standard approach for container health checks
