import axios from 'axios';
import { spawn } from 'child_process';
import puppeteer, { Browser } from 'puppeteer';

describe('App Smoke Tests', () => {
  const IMAGE_TAG = process.env.APP_IMAGE_TAG || 'lindas-cube-creator-app:test-build';
  const PORT = 8081;
  const BASE_URL = `http://localhost:${PORT}`;
  let containerId: string | null = null;
  let browser: Browser | null = null;

  beforeAll(async () => {
    console.log(`🧪 Starting App container: ${IMAGE_TAG}`);

    // Start container
    const result = await new Promise<string>((resolve, reject) => {
      const dockerRun = spawn('docker', [
        'run',
        '-d',
        '-e', 'AUTH_ISSUER=https://example.com/auth',
        '-e', 'AUTH_CLIENT_ID=example-client-id',
        '-p', `${PORT}:80`,
        IMAGE_TAG
      ]);

      let output = '';
      let error = '';

      dockerRun.stdout.on('data', (data) => {
        output += data.toString();
      });

      dockerRun.stderr.on('data', (data) => {
        error += data.toString();
      });

      dockerRun.on('close', (code) => {
        if (code === 0) {
          resolve(output.trim());
        } else {
          reject(new Error(`Failed to start container: ${error}`));
        }
      });
    });

    containerId = result;
    console.log(`✅ Container started: ${containerId}`);

    // Wait for App to be ready
    console.log('⏳ Waiting for App to be ready...');
    const maxAttempts = 30;
    let attempt = 0;

    while (attempt < maxAttempts) {
      try {
        await axios.get(`${BASE_URL}/`, { timeout: 2000 });
        console.log('✅ App is responding');
        break;
      } catch (error) {
        attempt++;
        if (attempt >= maxAttempts) {
          throw new Error('App failed to start within timeout period');
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Launch browser for testing
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }, 120000);

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
    if (containerId) {
      console.log('🧹 Cleaning up container...');
      await new Promise<void>((resolve) => {
        const dockerStop = spawn('docker', ['stop', containerId!]);
        dockerStop.on('close', () => {
          const dockerRm = spawn('docker', ['rm', containerId!]);
          dockerRm.on('close', () => resolve());
        });
      });
      console.log('✅ Cleanup complete');
    }
  });

  describe('HTTP Endpoints', () => {
    it('should serve index.html on root path', async () => {
      const response = await axios.get(`${BASE_URL}/`);
      expect(response.status).toBe(200);
      expect(response.data).toContain('app');
    });

    it('should serve app route', async () => {
      const response = await axios.get(`${BASE_URL}/app/`);
      expect(response.status).toBe(200);
    });
  });

  describe('UI Functionality', () => {
    it('should load the application page', async () => {
      if (!browser) {
        throw new Error('Browser not initialized');
      }

      const page = await browser.newPage();
      const response = await page.goto(`${BASE_URL}/app/`, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      expect(response?.status()).toBe(200);
      await page.close();
    });

    it('should render main app content', async () => {
      if (!browser) {
        throw new Error('Browser not initialized');
      }

      const page = await browser.newPage();
      await page.goto(`${BASE_URL}/app/`, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Check if some content is rendered (actual checks would depend on the app structure)
      const title = await page.title();
      expect(title).toBeTruthy();

      await page.close();
    });
  });
});
