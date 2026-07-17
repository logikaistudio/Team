import request from 'supertest';
import { app } from '../src/index';

describe('Core Application API Tests', () => {
  it('should return UP for server health-check', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body.status).toEqual('UP');
  });

  it('should enforce Bearer token verification on project APIs', async () => {
    const res = await request(app).get('/api/projects');
    expect(res.statusCode).toEqual(401);
  });
});
