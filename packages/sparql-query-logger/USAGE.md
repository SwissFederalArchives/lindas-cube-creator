# Quick Start Guide

## Enable Query Logging

Edit your `.local.env`:
```bash
SPARQL_QUERY_LOG_ENABLED=true
```

## Start the Application

```bash
yarn dev:api
```

All SPARQL queries will now be automatically logged to stdout.

## Disable Logging

Set in `.local.env`:
```bash
SPARQL_QUERY_LOG_ENABLED=false
```

Or remove the environment variable entirely.
