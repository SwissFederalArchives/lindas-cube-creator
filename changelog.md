# Changelog

All notable changes to the lindas-cube-creator repository are documented in this file.

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

## 2026-02-03 - Add deploy/promote workflows

### Added
- **deploy-int.yaml**: Manual workflow to promote images to INT environment by retagging as `int-latest` with `int-previous` backup
- **deploy-prod.yaml**: Manual workflow to promote images to PROD environment with `environment: production` protection gate
- Both workflows support deploying individual components (app/api/cli) or all at once
- Rollback workflow already existed for all environments

## 2026-01-30 - Bundle cube.link validation shapes locally

### Problem
The `cube.link` domain is no longer available. The cube-creator CLI previously fetched SHACL validation shapes from `https://cube.link/v0.2.2/shape/...` during the publishing pipeline, causing publish failures.

An attempt to use GitHub raw content URLs failed because `raw.githubusercontent.com` serves files with `Content-Type: text/plain`, which the RDF parser (`rdf-transform-graph-imports`) rejects with "unknown content type: text/plain" -- it expects `text/turtle`.

### Solution
Bundle validation shapes from `lindas-cube-link` directly into `cli/validation/` within the cube-creator repository. Shape entry-point files use local relative paths. The `replaceShapesVersion` pipeline step is removed since shapes are no longer fetched from remote URLs.

To update shapes, copy new versions from the `lindas-cube-link` repo into `cli/validation/` and rebuild the Docker image.

### Changes

- **Added** `cli/validation/` directory with shapes from `lindas-cube-link`:
  - `basic-cube-constraint.ttl`, `basic-cube-constraint-ml.ttl`
  - `datacatalog-constraint.ttl`
  - `profile-opendataswiss.ttl`, `profile-opendataswiss-lindas.ttl`
  - `profile-visualize.ttl`
  - `standalone-constraint-constraint.ttl`, `standalone-cube-constraint.ttl`
  - `shared/data-kind.ttl`

- **Modified** shape entry-point files to use local paths (`./validation/...`)

- **Simplified** `cli/pipelines/publish.ttl`: removed `<#replace>` step and `shapesVersion` variable

- **Removed** `cli/lib/replaceShapesVersion.ts`

- **Updated** `cli/lib/variables.ts`: removed `shapesVersion` field

- **Updated** `cli.Dockerfile`: added `COPY ./cli/validation ./cli/validation/`
