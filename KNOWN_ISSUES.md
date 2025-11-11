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
The smoke tests correctly identify this issue. In production/CI environments, the issue may not occur if:
- GitHub Actions preserves file permissions differently
- Linux Docker behaves differently than Windows Docker
- The file is deployed through a different mechanism

**Next Steps:**
1. Test the Docker image build in GitHub Actions CI
2. Compare behavior between Windows and Linux Docker
3. Consider alternative approaches:
   - Use COPY with --chmod flag (requires Docker 20.10+)
   - Create directory explicitly with RUN mkdir -p
   - Change approach to not rely on docker-entrypoint.d scripts

**Related Files:**
- `app.Dockerfile` (line 49)
- `nginx/template-config.sh`
- `smoke-tests/app-smoke.sh` (detects this issue)
