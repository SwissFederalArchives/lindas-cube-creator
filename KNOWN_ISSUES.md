# Known Issues

## Docker App Container Fails to Start Locally

**Status:** Pre-existing issue in develop branch

**Description:**
When building and running the app Docker image locally (on Windows), the container fails to start with:
```
/docker-entrypoint.sh: line 31: /docker-entrypoint.d/50-template-config.sh: not found
```

**Impact:**
- App Docker image cannot be tested locally with smoke tests
- Issue exists in both original and current code
- Likely affects Windows Docker builds specifically

**Root Cause:**
The `template-config.sh` file is not being found at runtime despite being copied to `/docker-entrypoint.d/`. This may be due to:
- File permissions not being preserved when using ADD in Dockerfile
- Path resolution issues on Windows Docker
- Missing directory in nginx base image

**Workaround:**
For local development and testing, use the `app.Dockerfile.local` file which works around this issue:

```bash
docker build -f app.Dockerfile.local -t lindas-cube-creator-app:local --build-arg COMMIT=local-test --build-arg PUBLIC_PATH=/app/ .
```

The local Dockerfile bypasses the docker-entrypoint.d mechanism and uses a simple startup script that:
1. Generates config.js from the template using envsubst
2. Starts nginx directly

This allows local smoke testing to pass successfully.

**Testing Results:**
- Issue confirmed in both Windows Docker Desktop and WSL2 Ubuntu Docker
- Production `app.Dockerfile` fails with entrypoint error
- Local `app.Dockerfile.local` works successfully
- All smoke tests pass with local Dockerfile

**Next Steps:**
1. Test the production Docker image build in GitHub Actions CI to verify if this issue occurs there
2. If GitHub Actions also has this issue, consider migrating production to use the local Dockerfile approach
3. Investigate why docker-entrypoint.d scripts are not executing properly

**Related Files:**
- `app.Dockerfile` (line 49) - Production version with issue
- `app.Dockerfile.local` - Working local version
- `nginx/template-config.sh` - Script that's not being found
- `smoke-tests/app-smoke.sh` - Detects this issue
- `test-local.sh` - Uses local Dockerfile for testing
