import axios from 'axios';

describe('CSV Source E2E Tests', () => {
  const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
  const headers = {
    'Content-Type': 'text/turtle',
    'x-user': 'john-doe',
    'x-permission': 'pipelines:read'
  };

  describe('Upload CSV Source', () => {
    it('should upload a CSV source', async () => {
      const csvData = `name,age
John,30
Jane,25`;

      const response = await axios.post(
        `${BASE_URL}/api/cube-project/ubd/csv-sources`,
        csvData,
        {
          headers: {
            ...headers,
            'Content-Type': 'text/csv',
            'Content-Disposition': 'attachment; filename="test.csv"'
          }
        }
      );

      expect(response.status).toBe(201);
    }, 30000);
  });

  describe('Get CSV Source', () => {
    it('should retrieve CSV source metadata', async () => {
      const response = await axios.get(
        `${BASE_URL}/api/cube-project/ubd/csv-sources`,
        { headers }
      );

      expect(response.status).toBe(200);
    });
  });

  describe('Update CSV Source', () => {
    it('should update CSV source', async () => {
      const updateData = `
        PREFIX cc: <https://cube-creator.zazuko.com/vocab#>

        <> cc:hasColumnMapping "updated-mapping" .
      `;

      const response = await axios.patch(
        `${BASE_URL}/api/cube-project/ubd/csv-sources/source-id`,
        updateData,
        { headers }
      );

      expect(response.status).toBe(200);
    });
  });

  describe('Delete CSV Source', () => {
    it('should delete CSV source', async () => {
      const response = await axios.delete(
        `${BASE_URL}/api/cube-project/ubd/csv-sources/source-id`,
        { headers }
      );

      expect(response.status).toBe(204);
    });
  });
});
