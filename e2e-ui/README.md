# E2E UI Tests (Playwright)

This directory contains end-to-end tests for the Cube Creator UI using Playwright.

## Setup

```bash
cd e2e-ui
yarn install
yarn install-browsers
```

## Running Tests

```bash
# Run all tests
yarn test

# Run with UI mode (interactive)
yarn test:ui

# Run in debug mode
yarn test:debug

# Run in headed mode (see browser)
yarn test:headed

# View last test report
yarn report
```

## Test Structure

- `smoke.spec.ts` - Basic smoke tests to verify app loads and critical features work
- `cube-creator.spec.ts` - Full E2E flows (currently placeholders)

## Environment Variables

- `BASE_URL` - Base URL for testing (default: http://localhost:3000/app/)
- `CI` - Set to true in CI environment for different retry/worker settings

## Local Development

The Playwright config will automatically start the docker-compose.e2e.yml stack when running locally. In CI, it expects the services to already be running.

## Writing Tests

Follow Playwright best practices:
- Use data-test-id attributes in the UI for reliable selectors
- Avoid brittle selectors like CSS classes
- Use page object model for complex flows
- Keep tests independent and idempotent
