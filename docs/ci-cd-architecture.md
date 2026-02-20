# CI/CD Architecture

## Overview

This document describes the GitHub Actions CI/CD pipeline for the Lindas Cube Creator project. The system is designed to provide fast feedback, prevent bugs, and enable confident deployments through automated testing and quality gates.

## Workflow Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      Build and Test (Orchestration)             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                      │
│  │  Lint    │  │   Unit   │  │   E2E    │                      │
│  │          │  │  Tests   │  │  Tests   │                      │
│  └──────────┘  └──────────┘  └──────────┘                      │
│                                                                 │
│  ┌─────────────────────────────────────┐                       │
│  │    Status Check (all must pass)     │                       │
│  └─────────────────────────────────────┘                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
        │
        ├─ Triggers: Pull requests, push to develop/master
        └─ Required for: Merge to develop/master
```

## Workflows

### 1. **build-and-test.yaml** (Main CI Orchestration)
**Trigger**: PR opened/updated, push to develop/master

**Jobs**:
- **lint** - Runs ESLint on all TypeScript and Vue files
- **unit-tests** - Runs unit tests across Node 18 & 20
- **e2e-tests** - Runs end-to-end tests (Cypress & Hypertest)
- **all-checks** - Status gate that requires all jobs to pass

**Duration**: ~15-20 minutes
**Required Status Check**: Yes ✓

### 2. **e2e-tests.yaml** (End-to-End Tests)
**Trigger**: Called by build-and-test, also triggered on push to develop/master

**Jobs**:
- **api-tests** - Hypertest API integration tests
- **ui-tests** - Playwright UI tests (Chrome & Firefox)
- **smoke-tests** - Basic health checks for all services

**Duration**: ~15 minutes
**Coverage**: API endpoints, UI interactions, service health

### 3. **ci.yaml** (Legacy - Being Phased Out)
**Status**: Deprecated in favor of build-and-test.yaml

**Note**: Keep for backwards compatibility until all PRs updated

### 4. **pipeline.yaml** (Manual Pipeline Execution)
**Trigger**: Manual workflow dispatch

**Purpose**: Run transform and publish pipeline jobs on-demand

**Environment Variables**:
- `TRANSFORM_JOB`: Job URL for transform operation
- `PUBLISH_JOB`: Job URL for publish operation

### 5. **docker-build.yaml** (Docker Image Building)
**Trigger**: Tags matching `lindas-cube-creator-*`, manual dispatch

**Jobs**:
- **prepare** - Determine components and versions
- **build** - Build and push Docker images for app, api, cli

**Images**:
- `ghcr.io/{owner}/lindas-cube-creator-app:*`
- `ghcr.io/{owner}/lindas-cube-creator-api:*`
- `ghcr.io/{owner}/lindas-cube-creator-cli:*`

**Tagging Strategy**:
- Test: `test-{version}`, `test-latest`
- Integration: `int-{version}`, `int-latest`
- Production: `{version}`, `{major}.{minor}`, `{major}`, `latest`

### 6. **releases.yaml** (Release Management)
**Trigger**: Push to master

**Jobs**:
- **release** - Create/update release PR via Changesets
- **tags** - Create git tags for released versions

**Artifacts**: Automatic version bumps and changelog generation

### 7. **rollback.yaml** (Emergency Rollback)
**Trigger**: Manual workflow dispatch

**Purpose**: Quickly revert to previous Docker image version

## Required Secrets

| Secret | Purpose | Required |
|--------|---------|----------|
| `AUTH_RUNNER_CLIENT_SECRET` | OIDC authentication for CLI tests | ✓ |
| `AUTH_RUNNER_CLIENT_ID` | OIDC client ID | ✓ |
| `AUTH_RUNNER_ISSUER` | OIDC issuer URL | ✓ |
| `CODECOV_TOKEN` | Codecov coverage uploads | ✓ |
| `GH_APP_ID` | GitHub App ID for releases | ✓ |
| `GH_PRIVATE_KEY` | GitHub App private key | ✓ |
| `SENTRY_AUTH_TOKEN` | Sentry release tracking | ✗ |
| `SLACK_WEBHOOK_URL` | Slack notifications (future) | ✗ |

## Environment Configuration

### .nvmrc
Specifies Node.js version (currently 18)

### package.json scripts
- `yarn test` - Run all unit tests
- `yarn test:queries` - Run SPARQL query tests
- `yarn test:cli:*` - Run CLI-specific tests
- `yarn test:e2e` - Run E2E tests
- `yarn lint` - Run ESLint
- `yarn typecheck` - Run TypeScript type checking

## Performance Optimization

### Caching Strategy
- **Yarn cache**: Automatic via `actions/setup-node`
- **Docker layer cache**: GHA cache with `type=gha`
- **Lando cache**: Cached in setup-env action (~/.lando)

### Expected Times
- Lint: 2-3 minutes
- Unit tests: 8-12 minutes
- E2E tests: 12-18 minutes
- Docker build: 15-25 minutes (first run), 5-10 minutes (cached)

### Cache Hit Impact
- **Good**: 30-40% reduction in CI time
- **Excellent**: 50%+ reduction with warm caches

## Local Development

### Prerequisites
```bash
node --version  # Should be v18+
yarn --version  # Should be 1.22.19+
docker --version
docker-compose --version
```

### Running Tests Locally
```bash
# Unit tests
yarn test

# E2E tests with Lando
yarn seed-data
docker compose run e2e-tests

# Full test suite (matches CI)
yarn lint && yarn test && yarn test:e2e
```

### Lando Setup
```bash
lando start        # Start local environment
lando logs -s core # View service logs
lando stop         # Stop services
lando destroy      # Clean up everything
```

## Troubleshooting

### CI/CD Failures

#### "Incomplete OIDC config" error
**Cause**: Missing AUTH_RUNNER_* secrets
**Solution**: 
- Set NODE_ENV=test in test environments
- Secrets optional for unit tests, required for E2E

#### E2E timeout errors
**Cause**: Services not ready within 300s
**Solution**:
- Check Docker availability (`docker ps`)
- Increase timeout if services are slow to start
- Verify Lando is running: `lando status`

#### Docker build failures
**Cause**: Large build context
**Solution**:
- Review `.dockerignore` for unnecessary files
- Use `docker build --no-cache` to rebuild from scratch

#### Flaky tests
**Cause**: Race conditions in E2E tests
**Solution**:
- Playwright has automatic retry enabled (2 retries in CI)
- Add explicit waits for network requests
- Check for timing-dependent assertions

### Debugging Failed Workflows

1. **Check workflow logs**: GitHub Actions → Failed workflow → Job logs
2. **Run locally**: Reproduce the failure with same Node version
3. **Check secrets**: Ensure all required secrets are set
4. **Review changes**: Look for breaking changes in test code
5. **Environmental**: Check for OS-specific issues (Windows vs Linux)

## Quality Standards

### Code Coverage
- **Target**: 80% statement coverage
- **Minimum**: 75% (for pull requests)
- **Command**: `yarn coverage:report`

### Linting
- **Tool**: ESLint
- **Configuration**: `.eslintrc.json`
- **Scope**: All .ts, .vue, .tsx files

### Type Checking
- **Tool**: TypeScript
- **Configuration**: `tsconfig.json`
- **Command**: `yarn typecheck`

## Future Improvements

### Planned
- [ ] Security scanning with Trivy
- [ ] Dependency update management
- [ ] Performance benchmarking
- [ ] Build time tracking
- [ ] Flaky test detection

### Discussion Topics
- Node 20+ support timeline
- Playwright vs Cypress migration
- Cost optimization for GitHub Actions
- Parallel test execution improvements

## Related Documentation

- [Local Development Setup](./local-development.md)
- [Contributing Guidelines](../CONTRIBUTING.md)
- [Troubleshooting Guide](./troubleshooting-ci.md)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
