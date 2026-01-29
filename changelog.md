# Changelog

## 2026-01-29 - Bundle cube.link validation shapes locally

### Problem
The `cube.link` domain is no longer available. The cube-creator CLI previously fetched SHACL validation shapes from `https://cube.link/v0.2.2/shape/...` during the publishing pipeline, causing publish failures. The GitLab CI pipeline had a workaround (`USE_LINDAS_SHAPES=true` + cloning `rareba/cube-link`) that also failed due to container permission issues.

### Solution
Copied all SHACL validation `.ttl` shapes from `lindas-cube-link/validation/` directly into `cli/validation/` within the cube-creator repository. Updated all shape entry-point files to use local relative paths instead of remote HTTP URLs. Removed the now-unnecessary `replaceShapesVersion` step from the publish pipeline.

### Changes

- **Added** `cli/validation/` directory with 9 TTL shape files copied from `lindas-cube-link`:
  - `basic-cube-constraint.ttl`
  - `basic-cube-constraint-ml.ttl`
  - `datacatalog-constraint.ttl`
  - `profile-opendataswiss.ttl`
  - `profile-opendataswiss-lindas.ttl`
  - `profile-visualize.ttl`
  - `standalone-constraint-constraint.ttl`
  - `standalone-cube-constraint.ttl`
  - `shared/data-kind.ttl`

- **Modified** shape entry-point files to use local paths:
  - `cli/shapes-visualize.ttl`: `<https://cube.link/latest/shape/profile-visualize>` -> `<./validation/profile-visualize>`
  - `cli/shapes-opendataswiss.ttl`: `<https://cube.link/latest/shape/profile-opendataswiss-lindas>` -> `<./validation/profile-opendataswiss-lindas>`
  - `cli/shapes-all.ttl`: both remote imports replaced with local paths
  - `cli/shapes-default.ttl`: `<https://cube.link/latest/shape/standalone-constraint-constraint>` -> `<./validation/standalone-constraint-constraint>`

- **Simplified** `cli/pipelines/publish.ttl`:
  - Removed `<#replace>` step from `<#loadCubeShapes>` step list
  - Removed `<#replace>` step definition (was calling `replaceShapesVersion`)
  - Removed `shapesVersion` variable declaration from `<#Main>`

- **Removed** `cli/lib/replaceShapesVersion.ts` (moved to `Removed/`)

- **Updated** `cli/lib/variables.ts`: removed `shapesVersion: string` from the Variables interface

- **Updated** `cli.Dockerfile`: added `COPY ./cli/validation ./cli/validation/` to include validation shapes in the Docker image

### Impact on GitLab CI
The `before_script` in the GitLab CI publish job (project 58 on gitlab.ldbar.ch) that clones `rareba/cube-link` and overwrites shape files is no longer necessary and can be simplified. The `USE_LINDAS_SHAPES`, `LINDAS_SHAPES_REPO`, and `LINDAS_SHAPES_BRANCH` environment variables are no longer needed.
