import { spawn } from 'child_process';

describe('CLI Smoke Tests', () => {
  const IMAGE_TAG = process.env.CLI_IMAGE_TAG || 'lindas-cube-creator-cli:test-build';

  describe('CLI Commands', () => {
    it('should display help information', async () => {
      console.log('🧪 Testing CLI help command...');

      const result = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
        const dockerRun = spawn('docker', ['run', '--rm', IMAGE_TAG, '--help']);

        let stdout = '';
        let stderr = '';

        dockerRun.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        dockerRun.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        dockerRun.on('close', (code) => {
          resolve({ stdout, stderr });
        });

        dockerRun.on('error', (error) => {
          reject(error);
        });
      });

      expect(result.stdout).toContain('Usage');
      console.log('✅ CLI help command works');
    });

    it('should display version information', async () => {
      console.log('🧪 Testing CLI version command...');

      const result = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
        const dockerRun = spawn('docker', ['run', '--rm', IMAGE_TAG, '--version']);

        let stdout = '';
        let stderr = '';

        dockerRun.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        dockerRun.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        dockerRun.on('close', (code) => {
          resolve({ stdout, stderr });
        });

        dockerRun.on('error', (error) => {
          reject(error);
        });
      });

      // Version command should produce some output
      expect(result.stdout.length + result.stderr.length).toBeGreaterThan(0);
      console.log(`✅ CLI version: ${result.stdout || result.stderr}`);
    });
  });
});
