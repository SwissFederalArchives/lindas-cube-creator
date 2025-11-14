# Smoke Tests

Smoke tests verify that Docker images are functional and can start correctly. These tests are designed to be easy to run in GitHub Actions and provide better debugging than the previous shell script approach.

## Structure

```
smoke-test/
├── tests/
│   ├── api.test.ts      # API container smoke tests
│   ├── app.test.ts      # App container smoke tests
│   └── cli.test.ts      # CLI container smoke tests
├── package.json         # Dependencies and scripts
├── jest.config.js       # Jest configuration
├── tsconfig.json        # TypeScript configuration
└── README.md           # This file
```

## Tests

### API Tests (`api.test.ts`)
- ✅ Starts API container
- ✅ Verifies health endpoints respond
- ✅ Validates JSON responses
- ✅ Checks content-type headers
- ✅ Proper cleanup after tests

### App Tests (`app.test.ts`)
- ✅ Starts App container
- ✅ Verifies HTTP endpoints respond
- ✅ Uses Puppeteer to test UI rendering
- ✅ Checks application loads correctly
- ✅ Proper cleanup after tests

### CLI Tests (`cli.test.ts`)
- ✅ Tests CLI help command
- ✅ Tests CLI version command
- ✅ No container cleanup needed (--rm flag used)

## Installation

```bash
cd smoke-test
npm install
```

Or using yarn:
```bash
cd smoke-test
yarn install
```

## Usage

### Run all smoke tests
```bash
npm test
```

### Run specific test suite
```bash
npm run test:api      # Only API tests
npm run test:app      # Only App tests
npm run test:cli      # Only CLI tests
```

### Set custom image tags
```bash
API_IMAGE_TAG=my-api:tag npm run test:api
APP_IMAGE_TAG=my-app:tag npm run test:app
CLI_IMAGE_TAG=my-cli:tag npm run test:cli
```

## GitHub Actions Integration

These tests are designed to work seamlessly with GitHub Actions:

```yaml
- name: Run Smoke Tests
  run: |
    cd smoke-test
    npm install
    API_IMAGE_TAG=${{ env.API_TAG }} npm run test:api
    APP_IMAGE_TAG=${{ env.APP_TAG }} npm run test:app
    CLI_IMAGE_TAG=${{ env.CLI_TAG }} npm run test:cli
```

## Benefits Over Previous Approach

1. **Better Integration**: Jest provides rich test output and GitHub Actions integration
2. **Easier Debugging**: Full stack traces and detailed failure messages
3. **Parallel Execution**: Tests can run in parallel (when not using containers)
4. **Better Assertions**: Jest's expect() API vs bash conditionals
5. **Type Safety**: TypeScript support for better IDE integration
6. **CI Friendly**: Designed for GitHub Actions with proper timeout handling

## Timeout Configuration

- Each test suite has a 60-second timeout
- Overall suite timeout: 120 seconds
- Configurable via environment variables

## Container Cleanup

All tests properly clean up their containers:
- API and App tests: Stop and remove containers after tests
- CLI tests: Use `--rm` flag for automatic cleanup
