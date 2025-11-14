import axios from 'axios';

describe('API Entry Point E2E Tests', () => {
  const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
  const headers = {
    'x-user': 'john-doe',
    'x-permission': 'pipelines:read'
  };

  describe('Entry Point', () => {
    it('should return entry point with title', async () => {
      const response = await axios.get(`${BASE_URL}/api/`, { headers });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('title');
      expect(response.data.title).toBeTruthy();
    });

    it('should expose projects link', async () => {
      const response = await axios.get(`${BASE_URL}/api/`, { headers });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('projects');
      expect(response.data.projects).toHaveProperty('title');
      expect(response.data.projects).toHaveProperty('@type');
    });

    it('projects should be a collection', async () => {
      const response = await axios.get(`${BASE_URL}/api/`, { headers });

      expect(response.data.projects['@type']).toContain('Collection');
    });

    it('projects should have Create operation', async () => {
      const response = await axios.get(`${BASE_URL}/api/`, { headers });

      expect(response.data.projects).toHaveProperty('create');
      expect(response.data.projects.create).toHaveProperty('@type');
      expect(response.data.projects.create['@type']).toContain('CreateAction');
    });
  });

  describe('Cube Projects Collection', () => {
    it('should return cube-projects endpoint', async () => {
      const response = await axios.get(`${BASE_URL}/api/cube-projects`, { headers });

      expect(response.status).toBe(200);
    });

    it('should return collection with hydra:title', async () => {
      const response = await axios.get(`${BASE_URL}/api/cube-projects`, { headers });

      expect(response.data).toHaveProperty('title');
      expect(response.data.title).toBeTruthy();
    });

    it('should have @type Collection', async () => {
      const response = await axios.get(`${BASE_URL}/api/cube-projects`, { headers });

      expect(response.data).toHaveProperty('@type');
      expect(response.data['@type']).toContain('Collection');
    });
  });
});
