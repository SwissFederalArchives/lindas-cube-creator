# Removed Files

This directory contains files that have been replaced or are no longer needed but are kept for reference.

## Workflows (Moved 2025-01-11)

The following workflow files were consolidated into a single unified `docker-build.yaml` workflow:

- `docker-app.yaml` - Replaced by unified docker-build.yaml
- `docker-api.yaml` - Replaced by unified docker-build.yaml
- `docker-cli.yaml` - Replaced by unified docker-build.yaml

### Reason for Consolidation

The three separate Docker workflows had duplicate logic and were hard to maintain. The new unified workflow:
- Uses matrix strategy to build all components
- Has consistent tagging logic across all components
- Supports version-based tags (test-1.15.3) instead of timestamps
- Includes smoke testing before pushing images
- Implements automated rollback support with "previous" tags
- Reduces code duplication

### Migration Notes

If you need to reference the old workflow logic, the files are preserved here.
