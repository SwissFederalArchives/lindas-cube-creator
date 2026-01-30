# Changelog

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
