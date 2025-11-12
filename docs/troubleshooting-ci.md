# CI/CD Troubleshooting Guide

## Quick Checklist

Before diving into specific issues, verify:
- [ ] All required secrets are configured
- [ ] `.nvmrc` specifies correct Node version
- [ ] `docker` and `docker-compose` are available and running
- [ ] No uncommitted changes in `.github/workflows/`
- [ ] No recent breaking changes in dependencies

---

## Common Issues & Solutions

### ❌ "Incomplete OIDC Configuration" Error

**Where**: E2E tests fail during auth setup

**Full Error**:
```
Error: Incomplete OIDC config. Set NODE_ENV=test or provide AUTH_RUNNER_*
```

**Root Causes**:
1. Missing or incorrect `AUTH_RUNNER_*` secrets
2. Running E2E tests locally without Lando
3. NODE_ENV not set to "test" in test environments

**Solutions**:

**For local testing**:
```bash
# Set test mode before running tests
export NODE_ENV=test
yarn test:e2e

# Or use Lando (recommended)
lando start
docker compose run e2e-tests
```

**For CI/CD**:
1. Verify secrets in GitHub Actions settings:
   - `AUTH_RUNNER_CLIENT_SECRET`
   - `AUTH_RUNNER_CLIENT_ID`
   - `AUTH_RUNNER_ISSUER`

2. Check secret values are not expired
3. Ensure secrets have appropriate permissions in auth provider

**Prevention**:
- Add `NODE_ENV: test` to GitHub Actions workflows for test jobs
- Document secrets setup in onboarding docs

---

### ❌ E2E Tests Timeout (300s)

**Where**: E2E tests exceed 300-second limit

**Full Error**:
```
Error: Timeout waiting for service to be ready
```

**Root Causes**:
1. Lando services slow to start
2. Docker layer cache miss on first run
3. Limited system resources (CPU, memory)
4. Network connectivity issues

**Solutions**:

**Check service status**:
```bash
# See which services are running
lando status

# View logs for specific service
lando logs -s core
lando logs -s app
lando logs -s api

# Restart Lando
lando stop && lando start
```

**Increase timeout**:
In `.github/workflows/e2e-tests.yaml`:
```yaml
- name: Wait for services
  run: bash scripts/wait-for-services.sh
  timeout-minutes: 10  # Increase from 5
```

**Check disk/memory**:
```bash
# Linux/Mac
docker stats

# Windows
# Use Docker Desktop → Resources tab
```

**Warm up cache**:
```bash
# Rebuild Docker layers without cache
docker compose build --no-cache
lando start
```

**Prevention**:
- Run E2E tests locally before pushing
- Monitor CI/CD pipeline times for trends
- Add health check endpoints to services

---

### ❌ Unit Tests Fail with Module Not Found

**Where**: Unit tests during CI, but pass locally

**Full Error**:
```
Error: Cannot find module 'path/to/module'
```

**Root Causes**:
1. Different Node versions (18 vs 20)
2. Incomplete yarn install
3. Platform-specific path issues (Windows vs Linux)
4. Missing build step

**Solutions**:

**Check Node version**:
```bash
# Verify .nvmrc
cat .nvmrc

# Check CI uses same version
node --version
nvm use  # If available
```

**Verify dependencies**:
```bash
# Clear cache and reinstall
rm -rf node_modules yarn.lock
yarn install

# Run tests locally
yarn test
```

**Check for build issues**:
```bash
# Some tests may require build output
yarn build
yarn test
```

**Windows-specific**:
- Convert line endings: `git config --global core.autocrlf true`
- Use forward slashes in imports: `import x from './path/to/file'`
- Check PATH environment variable

**Prevention**:
- Test locally with `node --version` that matches `.nvmrc`
- Add pre-commit hook to prevent uncommitted node_modules issues

---

### ❌ Docker Build Fails with "Layer Too Large"

**Where**: docker-build.yaml workflow

**Full Error**:
```
Error: Layer size exceeds maximum allowed
```

**Root Causes**:
1. Large files in `.dockerignore` exceptions
2. Build context includes unnecessary files
3. Previous layers not cached properly

**Solutions**:

**Review `.dockerignore`**:
```bash
# Check what's included in build context
git status --ignored

# Compare with .dockerignore
cat .dockerignore
```

**Clean up**:
```bash
# Remove large files from repo
git rm --cached large-file.bin
echo "large-file.bin" >> .gitignore

# Update .dockerignore
cat >> .dockerignore << EOF
*.log
coverage/
node_modules/
.env*
.cache/
EOF
```

**Rebuild without cache**:
```bash
docker build --no-cache -t test:latest .
```

**Prevention**:
- Regularly audit build context size
- Add files to `.dockerignore` before committing
- Review PRs for accidental large file uploads

---

### ❌ Lint Failures: "Unexpected Token" or Parse Errors

**Where**: CI lint job fails, but passes locally

**Full Error**:
```
ParserError: Unexpected token at line X
```

**Root Causes**:
1. TypeScript version mismatch
2. JSX/TSX file not recognized
3. Corrupted node_modules
4. ESLint configuration issue

**Solutions**:

**Check TypeScript version**:
```bash
# Compare local vs CI version
yarn ls typescript

# Ensure package.json has strict version
cat package.json | grep typescript
```

**Verify ESLint config**:
```bash
# Run lint with verbose output
yarn lint --debug

# Check which files are linted
yarn lint --print-config .src/app.ts
```

**Clear cache**:
```bash
# Remove ESLint cache
rm -rf .eslintcache

# Reinstall dependencies
rm -rf node_modules
yarn install

# Run lint again
yarn lint
```

**Check file extensions**:
```bash
# Verify .vue and .tsx files are recognized
ls -la src/components/*.{ts,tsx,vue}

# Check ESLint overrides in .eslintrc.json
cat .eslintrc.json | grep -A5 "overrides"
```

**Prevention**:
- Test lint locally before pushing
- Keep TypeScript and ESLint versions pinned
- Document any custom ESLint plugins

---

### ❌ Secret Reference Error in Workflows

**Where**: Build, test, or deploy workflows fail

**Full Error**:
```
Error: Unrecognized named-value: 'secrets.AUTH_RUNNER_CLIENT_SECRET'
```

**Root Causes**:
1. Secret name typo
2. Secret not available in current scope (org vs repo)
3. YAML syntax error in secret reference

**Solutions**:

**Verify secret names**:
```bash
# List all secrets in GitHub Actions
# Settings → Secrets and variables → Actions
# Check exact names match workflow references
```

**Check YAML syntax**:
```yaml
# Correct:
env:
  CLIENT_SECRET: ${{ secrets.AUTH_RUNNER_CLIENT_SECRET }}

# Incorrect:
env:
  CLIENT_SECRET: ${{ secrets.AUTH_RUNNER_CLIENT_SECRET }  # Missing }
```

**Scope verification**:
```yaml
# For organization secrets
env:
  SECRET: ${{ secrets.ORG_SECRET }}  # Available to all workflows

# For repository secrets
env:
  SECRET: ${{ secrets.REPO_SECRET }}  # Only for this repo
```

**Validate workflow file**:
```bash
# Use GitHub's workflow validation
# Push to a branch and check Actions tab for errors

# Or validate locally (requires act CLI)
act --list
```

**Prevention**:
- Use workflow_call for reusable workflows with explicit secret passing
- Document all required secrets in README
- Test workflow syntax before merging

---

### ❌ Flaky E2E Tests (Intermittent Failures)

**Where**: E2E tests pass sometimes, fail other times

**Common Symptoms**:
- Tests pass locally, fail in CI
- Tests fail on first run, pass on retry
- Timeouts on slow CI runners
- Race conditions in async operations

**Solutions**:

**Add explicit waits**:
```javascript
// Before:
const element = page.querySelector('button');
element.click();

// After:
await page.waitForSelector('button');
await page.click('button');
await page.waitForNavigation(); // Wait for navigation after click
```

**Use retry logic**:
```yaml
# In e2e-tests.yaml
- name: Run E2E tests
  uses: playwright/test-action@v3
  with:
    command: npm run test:e2e
    project: chromium
    # Add retry config in playwright.config.ts
```

**Increase timeouts for CI**:
```javascript
// playwright.config.ts
const config = {
  timeout: process.env.CI ? 30000 : 10000,
  expect: {
    timeout: process.env.CI ? 5000 : 2000,
  },
};
```

**Isolate tests**:
```javascript
// Ensure tests don't depend on order
test.beforeEach(async ({ page }) => {
  // Reset state before each test
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
});
```

**Check for hidden dependencies**:
```bash
# Verify all services are healthy before running tests
docker compose ps
lando status

# Check network connectivity
ping google.com
curl https://api.example.com/health
```

**Prevention**:
- Run full test suite locally multiple times
- Monitor CI for patterns in failures
- Add CI-specific test tags for debugging
- Use test reports to identify slow/flaky tests

---

### ❌ "Permission Denied" in Workflows

**Where**: Any job that needs file/directory access

**Full Error**:
```
Error: Permission denied for path/to/file
```

**Root Causes**:
1. Incorrect file permissions in repo
2. Lando container permission mismatch
3. GitHub Actions runner permissions
4. Directory ownership issues

**Solutions**:

**Fix file permissions**:
```bash
# Make scripts executable
chmod +x scripts/*.sh

# Commit changes
git add scripts/*.sh
git commit -m "fix: make scripts executable"
```

**Lando permission fix**:
```bash
# Reset Lando ownership
lando destroy
lando start

# Or adjust permissions
sudo chown -R $USER ~/.lando
```

**GitHub Actions runner**:
```yaml
# Ensure working directory permissions
- name: Set permissions
  run: |
    chmod -R u+w .
    ls -la .github/workflows/

- name: Run tests
  run: yarn test
```

**Docker container permissions**:
```bash
# Check current user in container
docker run alpine:latest id

# Run with specific user
docker run --user 1000:1000 alpine:latest id
```

**Prevention**:
- Add `chmod +x scripts/*.sh` to git pre-commit hook
- Document permission requirements in setup guide
- Test workflows locally with Docker

---

## Debugging Workflow Failures

### Step 1: Check Workflow Logs

1. Go to GitHub repository → Actions tab
2. Click on failed workflow run
3. Expand job that failed
4. Read full log output

### Step 2: Reproduce Locally

```bash
# Clone same commit
git checkout <commit-hash>

# Install dependencies with same versions
rm -rf node_modules yarn.lock
yarn install

# Run same commands as CI
yarn lint
yarn test
docker compose run e2e-tests
```

### Step 3: Enable Debug Logging

```bash
# Set GitHub Actions debug logging
export ACTIONS_STEP_DEBUG=true

# Or enable in workflow YAML
env:
  ACTIONS_STEP_DEBUG: true
```

### Step 4: Check System Resources

```bash
# Memory usage
free -h          # Linux/Mac
Get-Process | Sort-Object -Descending PM | Select -First 5  # Windows

# Disk space
df -h            # Linux/Mac
dir C:\           # Windows

# CPU usage
top              # Linux/Mac (press q to exit)
Get-Counter 'Processor(_Total)\% Processor Time'  # Windows
```

### Step 5: Use Workflow Debugging

```yaml
# Add debug step to workflow
- name: Debug Information
  if: failure()
  run: |
    echo "Node version:"
    node --version
    echo "Yarn version:"
    yarn --version
    echo "Docker status:"
    docker ps
    echo "Environment:"
    env | grep -E '^(NODE|YARN|DOCKER)' | sort
```

---

## Getting Help

### Resources

- **GitHub Actions Docs**: https://docs.github.com/en/actions
- **Workflow Syntax**: https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions
- **Debugging Guide**: https://docs.github.com/en/actions/monitoring-and-troubleshooting-workflows

### Community

- Stack Overflow (tag: github-actions)
- GitHub Discussions in this repository
- Community Slack channels

### Reporting Issues

When reporting CI/CD issues, include:
1. GitHub Actions workflow run URL
2. Full error message and logs
3. Steps to reproduce locally
4. Environment details (OS, Node version, Docker version)
5. Recent changes or PRs that might be related
