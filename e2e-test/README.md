# E2E Tests

End-to-end tests for the Lindas Cube Creator application. These tests verify complete user workflows through both the API and UI.

## Structure

```
e2e-test/
├── tests/
│   ├── api/              # API E2E tests using Jest + Supertest
│   │   ├── entrypoint.test.ts
│   │   ├── jobs.test.ts
│   │   ├── csv-source.test.ts
│   │   └── ...
│   └── ui/               # UI E2E tests using Playwright
│       ├── app.test.ts
│       ├── project-creation.test.ts
│       ├── navigation.test.ts
│       └── ...
├── package.json          # Dependencies and scripts
├── jest.config.js        # Jest configuration
├── playwright.config.ts  # Playwright configuration
├── tsconfig.json         # TypeScript configuration
└── README.md            # This file
```

## API E2E Tests

### Technologies
- **Jest**: Test runner and assertion library
- **Supertest**: HTTP testing library
- **Axios**: HTTP client

### Test Coverage
- ✅ Entry Point verification
- ✅ Jobs operations (Transform, Publish, Import)
- ✅ CSV Source management (upload, get, update, delete)
- ✅ Cube Projects CRUD operations
- ✅ Column Mapping operations
- ✅ Dimension Mapping and Metadata

### Running API Tests
```bash
# Install dependencies
npm install

# Run all API tests
npm run test:api

# Run with coverage
npm run test:api -- --coverage
```

### Configuration
Set environment variables:
```bash
API_BASE_URL=http://localhost:3000 npm run test:api
```

## UI E2E Tests

### Technologies
- **Playwright**: Browser automation and testing
- **TypeScript**: Type safety

### Test Coverage
- ✅ Main application page loading
- ✅ Navigation between sections
- ✅ Project creation workflow
- ✅ Data upload interface
- ✅ Form validation
- ✅ Wizard step navigation

### Running UI Tests
```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install

# Run all UI tests
npm run test:ui

# Run in headed mode (see browser)
npm run test:ui -- --headed

# Run specific test file
npm run test:ui -- tests/ui/app.test.ts
```

### Configuration
Set environment variables:
```bash
APP_BASE_URL=http://localhost:8080/app npm run test:ui
```

## Installation

### For API Tests
```bash
cd e2e-test
npm install
```

### For UI Tests
```bash
cd e2e-test
npm install
npx playwright install
```

## Usage

### Run All Tests
```bash
npm test
```

### Run Tests Separately
```bash
npm run test:api      # API tests only
npm run test:ui       # UI tests only
```

### Watch Mode
```bash
npm run test:watch    # Runs tests in watch mode
```

## GitHub Actions Integration

These tests are designed for CI/CD:

```yaml
- name: Run E2E Tests
  run: |
    cd e2e-test
    npm install

    # Run API tests
    API_BASE_URL=http://localhost:3000 npm run test:api

    # Install Playwright for UI tests
    npx playwright install

    # Run UI tests
    APP_BASE_URL=http://localhost:8080/app npm run test:ui

    # Upload Playwright report
    if [ -d "playwright-report" ]; then
      actions/upload-artifact@v4 \
        name=playwright-report \
        path=playwright-report
    fi
```

## Benefits Over Previous Hydra Approach

1. **Standard Framework**: Uses Jest and Playwright (industry standards)
2. **Better Debugging**: Rich error messages, stack traces, screenshots, videos
3. **Easy to Debug**: Run tests locally with `--headed` flag
4. **Better CI Integration**: Artifacts, reporters, and GitHub Actions integration
5. **Type Safety**: Full TypeScript support
6. **Parallel Execution**: Can run tests in parallel (UI only)
7. **Modern APIs**: Better assertion library and test structure

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `API_BASE_URL` | API base URL for tests | `http://localhost:3000` |
| `APP_BASE_URL` | App base URL for tests | `http://localhost:8080/app` |

## Test Timeouts

- API Tests: 120 seconds per test
- UI Tests: 60 seconds default (configured in Playwright)

## Browser Support

Tests run on:
- Chromium (Chrome)
- Can be extended to Firefox and WebKit

## Troubleshooting

### UI Tests Not Running
```bash
# Install Playwright browsers
npx playwright install
```

### API Tests Timeout
Increase timeout:
```bash
API_BASE_URL=http://localhost:3000 npm run test:api -- --testTimeout=180000
```

### Port Already in Use
Change the base URL:
```bash
API_BASE_URL=http://localhost:3001 npm run test:api
```
