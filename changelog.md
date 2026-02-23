# Changelog

All notable changes to the lindas-cube-creator repository are documented in this file.

## 2026-02-23

### Fixed
- `packages/core/bootstrap.ts`: iterate over named graphs explicitly and issue one PUT
  per named graph instead of relying on `QuadStreamSeparator` auto-splitting a mixed
  quad stream. Guarantees each named graph is written with its own `?graph=<iri>`
  request regardless of quad ordering in the rdf-ext Dataset.

## 2026-02-17

### Changed
- Standardize Docker image tag naming across all 3 images (api, app, cli)
  - Replaced `zazuko/action-docker-meta@main` with `docker/metadata-action@v5`
  - CI on `master` push now produces `api-test_YYYY-MM-DD_HHmmss`, `app-test_YYYY-MM-DD_HHmmss`, `cli-test_YYYY-MM-DD_HHmmss` tags
  - Updated promote/rollback workflow to use app-prefixed test tags
  - Aligned with naming convention used across all LINDAS services

## 2026-02-16

### Fixed
- Fix yarn workspace version mismatches: align all inter-workspace dependency
  version specifiers to 4.2.0 (was using old pre-fork versions like 1.0.0, 0.2.1, etc.)
  which caused `yarn install --ci` to fail because the versions couldn't be resolved
  from the npm registry

## 2026-02-15

### Added
- Promote/rollback workflow (`promote.yaml`) via `workflow_dispatch`
  - Handles all 3 images (api, app, cli) in a single workflow run
  - Action dropdown: promote, rollback-test, rollback-int, rollback-prod
  - Promote: retags source image as `int_YYYY-MM-DD_HHMMSS` then `prod_YYYY-MM-DD_HHMMSS`
  - Rollback: retags a previous image with a new timestamp so Flux picks it up
  - Uses `docker buildx imagetools create` for zero-layer-pull retagging (no rebuild)

### Changed - README updates to eliminate Zazuko-specific references

- **README.md (root)**:
  - Added maintainer note indicating the repository is maintained by the Swiss Federal Archives as part of the LINDAS project
  - Replaced Zazuko-internal keycloak URL (`keycloak.zazukoians.org`) with a generic note pointing to the LINDAS OIDC provider
  - Updated workflow description from GitHub-Flow to trunk-based development with `main` branch
  - Removed hardcoded reference to `.github/workflows/releases.yaml` file path; replaced with generic "GitHub Actions" wording
  - Changed branch references from `master` to `main`
  - Fixed typo "respository" to "repository"

- **cli/README.md**:
  - Replaced all Docker image references from `zazuko/cube-creator-cli` to `ghcr.io/swissfederalarchives/lindas-cube-creator-cli` (4 occurrences on lines 8, 21, 39, 59)

- **apis/core/README.md**:
  - Updated Trifid URL from `zazuko.com/products/trifid/` to the LINDAS fork at `github.com/SwissFederalArchives/lindas-trifid/`
