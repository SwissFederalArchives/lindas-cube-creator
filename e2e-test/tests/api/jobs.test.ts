import axios from 'axios';

describe('Jobs E2E Tests', () => {
  const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
  const headers = {
    'Content-Type': 'text/turtle',
    'x-user': 'john-doe',
    'x-permission': 'pipelines:read'
  };

  describe('Transform Job', () => {
    it('should create a transform job', async () => {
      const jobData = `
        PREFIX cc: <https://cube-creator.zazuko.com/vocab#>

        <> a cc:TransformJob .
      `;

      const response = await axios.post(
        `${BASE_URL}/api/cube-project/ubd/jobs`,
        jobData,
        { headers }
      );

      expect(response.status).toBe(201);
      expect(response.headers).toHaveProperty('location');
      expect(response.headers.location).toMatch(/\/jobs\//);
    });
  });

  describe('Publish Job', () => {
    it('should create a publish job', async () => {
      const jobData = `
        PREFIX cc: <https://cube-creator.zazuko.com/vocab#>

        <> a cc:PublishJob .
      `;

      const response = await axios.post(
        `${BASE_URL}/api/cube-project/ubd/jobs`,
        jobData,
        { headers }
      );

      expect(response.status).toBe(201);
      expect(response.headers).toHaveProperty('location');
      expect(response.headers.location).toMatch(/\/jobs\//);
    });
  });

  describe('Import Job', () => {
    it('should create an import job', async () => {
      const jobData = `
        PREFIX cc: <https://cube-creator.zazuko.com/vocab#>

        <> a cc:ImportJob .
      `;

      const response = await axios.post(
        `${BASE_URL}/api/cube-project/ubd/jobs`,
        jobData,
        { headers }
      );

      expect(response.status).toBe(201);
      expect(response.headers).toHaveProperty('location');
      expect(response.headers.location).toMatch(/\/jobs\//);
    });
  });
});
