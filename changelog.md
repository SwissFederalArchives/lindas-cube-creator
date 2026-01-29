# Changelog

## 2026-01-29 - Fetch SHACL shapes from GitHub instead of cube.link

### Problem
The `cube.link` domain is no longer available. The cube-creator CLI previously fetched SHACL validation shapes from `https://cube.link/v0.2.2/shape/...` during the publishing pipeline, causing publish failures.

### Solution
Updated shape entry-point files to fetch validation shapes at runtime from the `lindas-cube-link` GitHub repository via raw content URLs (`https://raw.githubusercontent.com/SwissFederalArchives/lindas-cube-link/main/validation/...`). This keeps shapes in a single source of truth (the cube-link repo) while allowing dynamic updates without rebuilding cube-creator.

Also removed the `replaceShapesVersion` pipeline step, since shapes are no longer fetched from `cube.link/latest/` and rewritten to a specific version.

### Changes

- **Modified** shape entry-point files to use GitHub raw URLs (pinned to `main` branch):
  - `cli/shapes-default.ttl`
  - `cli/shapes-visualize.ttl`
  - `cli/shapes-opendataswiss.ttl`
  - `cli/shapes-all.ttl`

- **Simplified** `cli/pipelines/publish.ttl`:
  - Removed `<#replace>` step (was calling `replaceShapesVersion`)
  - Removed `shapesVersion` variable

- **Removed** `cli/lib/replaceShapesVersion.ts`

- **Updated** `cli/lib/variables.ts`: removed `shapesVersion` field
