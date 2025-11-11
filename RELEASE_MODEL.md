# Release Model Documentation

## Overview

This document describes the release and deployment model for lindas-cube-creator, which follows a test-int-prod progression with semantic versioning.

## Docker Image Naming Convention

### Development (develop branch)
Images are automatically built on every commit to `develop`:
```
ghcr.io/swissfederalarchives/lindas-cube-creator-app:test-1.15.0
ghcr.io/swissfederalarchives/lindas-cube-creator-app:test-latest
ghcr.io/swissfederalarchives/lindas-cube-creator-app:test-previous
```

### Integration (manual trigger)
Images can be manually built for integration testing:
```
ghcr.io/swissfederalarchives/lindas-cube-creator-app:int-1.15.0
ghcr.io/swissfederalarchives/lindas-cube-creator-app:int-latest
ghcr.io/swissfederalarchives/lindas-cube-creator-app:int-previous
```

### Production (master branch tags)
Images are built when version tags are created:
```
ghcr.io/swissfederalarchives/lindas-cube-creator-app:v1.15.0
ghcr.io/swissfederalarchives/lindas-cube-creator-app:1.15.0
ghcr.io/swissfederalarchives/lindas-cube-creator-app:1.15
ghcr.io/swissfederalarchives/lindas-cube-creator-app:1
ghcr.io/swissfederalarchives/lindas-cube-creator-app:latest
ghcr.io/swissfederalarchives/lindas-cube-creator-app:previous
```

## Components

The project consists of three Docker images:
- **app** - Frontend Vue.js application
- **api** - Backend API (Node.js/Express)
- **cli** - Command-line tools for data processing

## Workflows

### 1. Development Workflow

```
Developer → commit to develop
     ↓
E2E Tests run (API + UI + Smoke)
     ↓ (tests pass)
Docker images built with version-based tags
     ↓
Smoke tests run on each image
     ↓ (smoke tests pass)
Images pushed: test-{version}, test-latest
Previous test-latest → test-previous (rollback)
     ↓
Deploy to TEST environment
```

### 2. Release Workflow

```
Merge develop → master
     ↓
Developer: yarn changeset add
     ↓
Changesets creates Release PR
     ↓
Review & merge Release PR
     ↓
Changesets bumps versions in package.json
     ↓
Git tags created:
  - lindas-cube-creator-app/v{version}
  - lindas-cube-creator-api/v{version}
  - lindas-cube-creator-cli/v{version}
     ↓
Tags trigger docker-build workflow
     ↓
E2E tests run
     ↓ (tests pass)
Docker images built
     ↓
Smoke tests run
     ↓ (smoke tests pass)
Images pushed with semantic version tags
Previous latest → previous (rollback)
     ↓
Sentry releases created
     ↓
Deploy to PROD
```

### 3. Rollback Workflow

If an issue is detected in any environment:

```
Go to Actions → Rollback workflow
     ↓
Select environment (test/int/prod)
Select component (all/app/api/cli)
     ↓
Workflow:
  1. Pulls {env}-previous image
  2. Tags current {env}-latest as {env}-failed
  3. Promotes {env}-previous to {env}-latest
     ↓
Deployment system picks up latest tag
     ↓
System rolled back
```

## Testing Strategy

### 1. E2E Tests (Required before deployment)
- **API E2E** (Hypertest) - Tests API endpoints and workflows
- **UI E2E** (Playwright) - Tests user interface and interactions
- **Smoke Tests** - Quick validation that services start and respond

### 2. Smoke Tests (Required before pushing images)
Each component has smoke tests that verify:
- Container starts successfully
- Health checks pass
- Basic functionality works
- Version display is correct (for app)

### 3. Local Testing

```bash
# Run all tests
./test-local.sh

# Skip specific tests
./test-local.sh --skip-build --skip-e2e

# Manual testing
cd e2e-ui
yarn test:ui  # Interactive mode
```

## Version Display

The UI displays the version with "lindas-" prefix:
```
version lindas-1.15.0 (3c09e97)
```

This is configured in `ui/vue.config.js`.

## Git Tags

Tags follow the pattern: `lindas-cube-creator-{component}/v{version}`

Examples:
- `lindas-cube-creator-app/v1.15.0`
- `lindas-cube-creator-api/v2.4.2`
- `lindas-cube-creator-cli/v4.1.1`

## Changesets

Version management uses [changesets](https://github.com/changesets/changesets).

### Creating a changeset

```bash
# Add a changeset
yarn changeset add

# Answer prompts:
# - Which packages changed?
# - What kind of change? (patch/minor/major)
# - Describe the changes

# Commit the changeset
git add .changeset/
git commit -m "chore: add changeset for feature X"
```

### Publishing versions

Changesets workflow automatically:
1. Creates a Release PR when changesets are detected
2. Bumps versions when Release PR is merged
3. Updates CHANGELOG.md
4. Creates git tags
5. Triggers Docker builds

## Environment Configuration

### TEST
- Deploys automatically from `develop` branch
- Uses `test-latest` image tag
- For rapid iteration and testing

### INT (Optional)
- Manual deployment trigger
- Uses `int-latest` image tag
- For pre-production validation

### PROD
- Deploys from semantic version tags
- Uses `latest` or specific version tags
- For stable releases

## Rollback Tags

Each environment maintains three tag versions:
- `{env}-latest` - Current active version
- `{env}-previous` - Last known good version (automatic rollback target)
- `{env}-failed` - Failed version (for investigation)

## Best Practices

1. **Always test locally** before pushing to develop
2. **Write changesets** for every user-facing change
3. **Use rollback** if issues are detected quickly
4. **Monitor Sentry** for errors after deployment
5. **Keep docker-compose.e2e.yml** up to date with production config
6. **Run E2E tests** before creating release PR

## Troubleshooting

### Build failures
- Check smoke test output in GitHub Actions
- Review Docker build logs
- Test locally with `./test-local.sh`

### E2E test failures
- Check test reports in GitHub Actions artifacts
- Run locally with `yarn test:ui` for interactive debugging
- Review service logs in docker-compose

### Rollback not working
- Verify `previous` tag exists: `docker manifest inspect ghcr.io/...:{env}-previous`
- Check GitHub Actions rollback workflow logs
- Manually tag if needed

### Version not displayed correctly
- Verify `ui/vue.config.js` has "lindas-" prefix
- Rebuild app image
- Check `VUE_APP_VERSION` env var in container

## References

- [Changesets Documentation](https://github.com/changesets/changesets)
- [Docker Multi-stage Builds](https://docs.docker.com/develop/develop-images/multistage-build/)
- [Playwright Testing](https://playwright.dev/)
- [GitHub Actions](https://docs.github.com/en/actions)
