# Changelog

## 2026-03-06 - Replace bundled shapes with git submodule

### Problem
Bundling SHACL validation shapes directly in the cube-creator repository
created tight coupling: every shapes update required a cube-creator rebuild.
Shapes should be managed in the `lindas-cube-link` repository and referenced
dynamically so they can be updated independently.

### Solution
Replace the bundled `cli/validation/` directory with a git submodule pointing
to `SwissFederalArchives/lindas-cube-link`, pinned to tag `v0.2.4`. Shape
entry-point files now reference `./cube-link/validation/...` paths. To update
shapes, update the submodule pointer to a new tag or commit.

### Changes

- **Removed** bundled `cli/validation/` directory (9 .ttl files)
- **Added** `cli/cube-link` as a git submodule of `lindas-cube-link` at `v0.2.4`
- **Updated** `cli/shapes-*.ttl` to import from `./cube-link/validation/...`
- **Updated** `cli.Dockerfile` to copy from `cli/cube-link/validation/`
- **Updated** `.github/workflows/main.yaml` checkout steps with `submodules: true`

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
