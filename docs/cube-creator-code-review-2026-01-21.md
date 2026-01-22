# Cube Creator Code Review - 2026-01-21

## Summary

A comprehensive code review was performed on the cube-creator repository. Multiple critical bugs were identified and fixed, including a major corruption issue affecting 106+ files.

## Critical Issues Found and Fixed

### 1. Malformed clownface Imports (CRITICAL - 106 files)

**Issue**: Throughout the codebase, the `clownface` import statements and function calls were corrupted. The pattern `clownface` was incorrectly changed to `.clownface`.

**Examples of corruption**:
```typescript
// WRONG:
import.clownface from .clownface'
import.clownface, { GraphPointer } from .clownface'
return.clownface({ dataset })
const ptr = .clownface({ dataset })
Runner.clownface({ ... })

// CORRECT:
import clownface from 'clownface'
import clownface, { GraphPointer } from 'clownface'
return clownface({ dataset })
const ptr = clownface({ dataset })
Runner(clownface({ ... }))
```

**Files affected**: 106 files across all components (APIs, CLI, UI, packages)

**Fix applied**: Created and ran `fix-clownface-imports.js` script to systematically fix all patterns.

### 2. Array Bounds Check Missing in observations.ts

**File**: `apis/core/lib/handlers/observations.ts`
**Lines**: 54, 66

**Issue**: Code accessed array elements without checking if the array was empty, which would cause runtime crashes.

```typescript
// BEFORE (line 54):
const templatePointer = req.hydra.operation.out(hydraBox.variables).toArray()[0]

// AFTER:
const templatePointers = req.hydra.operation.out(hydraBox.variables).toArray()
if (!templatePointers.length) {
  return next(new error.InternalServerError('No template variables found for operation'))
}
const templatePointer = templatePointers[0]

// BEFORE (line 66):
res.setLink(collection.view[0].id.value, 'canonical')

// AFTER:
if (collection.view && collection.view.length > 0) {
  res.setLink(collection.view[0].id.value, 'canonical')
}
```

### 3. Missing Index Validation in Vuex Store

**File**: `ui/src/store/modules/project.ts`
**Line**: 354-355

**Issue**: `findIndex` result was used without checking for -1, which would corrupt array state.

```typescript
// BEFORE:
const index = storedTable.columnMappings.findIndex(({ id }) => id.equals(columnMapping.id))
storedTable.columnMappings[index] = serializedColumnMapping

// AFTER:
const index = storedTable.columnMappings.findIndex(({ id }) => id.equals(columnMapping.id))
if (index === -1) throw new Error(`Column mapping not found: ${columnMapping.id.value}`)
storedTable.columnMappings[index] = serializedColumnMapping
```

### 4. Request Cache Pollution in API

**File**: `ui/src/api/index.ts`
**Lines**: 60-80

**Issue**: Failed requests remained in the `pendingRequests` cache forever, causing subsequent requests to fail.

```typescript
// BEFORE:
const response = await request
pendingRequests.delete(url)
// If request throws, pendingRequests is never cleaned

// AFTER:
try {
  const response = await request
  // ... processing
  return resource
} finally {
  pendingRequests.delete(url)
}
```

### 5. Broken Two-Way Binding in CsvUploadForm

**File**: `ui/src/components/CsvUploadForm.vue`
**Line**: 13

**Issue**: URL input used one-way binding, so user input was never captured.

```vue
<!-- BEFORE: -->
<o-input :model-value="fileUrl" type="url" required />

<!-- AFTER: -->
<o-input v-model="fileUrl" type="url" required />
```

### 6. Memory Leak in SidePane Component

**File**: `ui/src/components/SidePane.vue`
**Lines**: 43-57

**Issue**: Event listeners for drag operations were never cleaned up if component unmounted during drag.

```typescript
// AFTER: Added cleanup in beforeUnmount lifecycle hook
beforeUnmount () {
  this.cleanupDragListeners()
}
```

## Infrastructure Updates

### 7. Node.js Version Update in Dockerfiles

**Files**: `api.Dockerfile`, `app.Dockerfile`, `app.Dockerfile.local`, `cli.Dockerfile`

**Issue**: Dockerfiles used Node.js 18, but `commander@14.0.2` dependency requires Node.js 20+.

**Fix**: Updated all Dockerfiles from `node:18.19.1-alpine3.19` to `node:20-alpine3.19`

## Remaining Issues

### TypeScript Compilation Error

The Docker build still fails due to a TypeScript compilation stack overflow error. This is caused by:
1. TypeScript version 4.5.0 being outdated
2. Incompatible type definitions in newer dependencies
3. Possible circular type references

**Recommended fix**: Upgrade TypeScript to version 5.x in `package.json`.

### Patch File Version Mismatch

The `@types/sparql-http-client` patch file is for version 2.2.8 but version 2.2.15 is installed. The patch needs to be regenerated.

## Files Modified

1. `apis/core/lib/handlers/observations.ts` - Array bounds checks
2. `apis/core/lib/handlers/csv-source.ts` - Function call syntax fix
3. `ui/src/store/modules/project.ts` - Index validation
4. `ui/src/api/index.ts` - Request cache cleanup
5. `ui/src/components/CsvUploadForm.vue` - v-model binding fix
6. `ui/src/components/SidePane.vue` - Memory leak fix
7. `api.Dockerfile` - Node.js version update
8. `app.Dockerfile` - Node.js version update
9. `app.Dockerfile.local` - Node.js version update
10. `cli.Dockerfile` - Node.js version update
11. 106 files with clownface import/function call fixes

## Testing Status

- Backend services (Fuseki, MinIO) start successfully via Docker
- Docker build for API fails due to TypeScript compilation issue
- Manual testing of CSV upload and cube transformation not completed due to build failure

## Recommendations

1. **Immediate**: Upgrade TypeScript to version 5.x
2. **Immediate**: Regenerate the `@types/sparql-http-client` patch file
3. **Short-term**: Add ESLint rules to catch similar import corruption issues
4. **Short-term**: Add unit tests for edge cases (empty arrays, missing data)
5. **Long-term**: Consider migrating from Vue 2 options API to Composition API for better TypeScript support
