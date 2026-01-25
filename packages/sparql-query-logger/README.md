# SPARQL Query Logger

A reusable package for logging and profiling SPARQL queries executed through `sparql-http-client`. This package is designed to be independent of cube-creator and can be used in any Node.js application using SPARQL.

## Features

- **Automatic Query Logging**: Intercepts all SPARQL queries (SELECT, CONSTRUCT, ASK, UPDATE)
- **Separate Endpoints**: Tags logs by endpoint name (e.g., `cube-creator`, `lindas`)
- **Zero Configuration**: Works out of the box with sensible defaults

## Usage

### Configuration

Add to your `.local.env` or `.env` file:

```bash
# Enable SPARQL query logging
SPARQL_QUERY_LOG_ENABLED=true

```

### Integration Example

```typescript
import StreamClient from 'sparql-http-client'
import ParsingClient from 'sparql-http-client/ParsingClient'
import { QueryLogger } from '@cube-creator/sparql-query-logger'

// Create logger instance
const queryLogger = new QueryLogger({
  enabled: process.env.SPARQL_QUERY_LOG_ENABLED === 'true',
  endpointName: 'my-endpoint',
})

// Create your SPARQL clients
const rawStreamClient = new StreamClient({ endpointUrl: '...' })
const rawParsingClient = new ParsingClient({ endpointUrl: '...' })

// Wrap with logger
export const streamClient = queryLogger.wrapStreamClient(rawStreamClient)
export const parsingClient = queryLogger.wrapParsingClient(rawParsingClient)
```

### Cube Creator Integration

The logger is already integrated into cube-creator:
- **cube-creator endpoint**: Queries via `apis/core/lib/query-client.ts`
- **lindas endpoint**: Queries via `apis/shared-dimensions/lib/sparql.ts`

Simply enable it using the environment variables.

## Disabling Logging

Set `SPARQL_QUERY_LOG_ENABLED=false` or remove the variable entirely. When disabled, the logger becomes a transparent pass-through with negligible overhead.

## Notes

- The logger is safe for concurrent use (multiple queries can execute simultaneously)
- For stream-based results, result counts may not be available
- The package has no external dependencies beyond `sparql-http-client` and RDF libraries
