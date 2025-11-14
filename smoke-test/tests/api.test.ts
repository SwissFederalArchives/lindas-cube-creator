import axios from 'axios';
import { spawn } from 'child_process';

describe('API Smoke Tests', () => {
  const IMAGE_TAG = process.env.API_IMAGE_TAG || 'lindas-cube-creator-api:test-build';
  const PORT = 3001;
  const BASE_URL = `http://localhost:${PORT}`;
  let containerId: string | null = null;

  beforeAll(async () => {
    console.log(`🧪 Starting API container: ${IMAGE_TAG}`);

    // Start container
    const result = await new Promise<string>((resolve, reject) => {
      const dockerRun = spawn('docker', [
        'run',
        '-d',
        '-e', 'NODE_ENV=production',
        '-e', 'SPARQL_ENDPOINT=http://example.com/sparql',
        '-e', 'S3_ENDPOINT=http://example.com:9000',
        '-e', 'S3_BUCKET=test',
        '-e', 'MANAGED_DIMENSIONS_GRAPH=http://example.com/managed-dimensions',
        '-e', 'MANAGED_DIMENSIONS_STORE_QUERY_ENDPOINT=http://example.com/sparql',
        '-p', `${PORT}:3000`,
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

    // Wait for API to be ready
    console.log('⏳ Waiting for API to be ready...');
    const maxAttempts = 30;
    let attempt = 0;

    while (attempt < maxAttempts) {
      try {
        await axios.get(`${BASE_URL}/api/`, { timeout: 2000 });
        console.log('✅ API is responding');
        break;
      } catch (error) {
        attempt++;
        if (attempt >= maxAttempts) {
          throw new Error('API failed to start within timeout period');
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }, 120000);

  afterAll(async () => {
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

  describe('Health Checks', () => {
    it('should respond to health check endpoint', async () => {
      const response = await axios.get(`${BASE_URL}/api/`);
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
    });

    it('should respond to cube-projects endpoint', async () => {
      const response = await axios.get(`${BASE_URL}/api/cube-projects`);
      expect(response.status).toBe(200);
    });
  });

  describe('Response Validation', () => {
    it('should return JSON content type', async () => {
      const response = await axios.get(`${BASE_URL}/api/`);
      const contentType = response.headers['content-type'];
      expect(contentType).toMatch(/application\/(json|ld\+json)/);
    });

    it('should return valid JSON response', async () => {
      const response = await axios.get(`${BASE_URL}/api/`);
      expect(typeof response.data).toBe('object');
      expect(response.data).not.toBeNull();
    });
  });
});
