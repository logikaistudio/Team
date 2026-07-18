import request from 'supertest';
import jwt from 'jsonwebtoken';
import { config } from '../src/config';

const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockEnsureDefaultStatusId = jest.fn();

jest.mock('../src/repositories/project.repository', () => ({
  ProjectRepository: jest.fn().mockImplementation(() => ({
    create: mockCreate,
    update: mockUpdate,
    ensureDefaultStatusId: mockEnsureDefaultStatusId,
  })),
}));

import { app } from '../src/index';

function signToken() {
  return jwt.sign(
    {
      id: 'user-test',
      tenantId: 'tenant-test',
      name: 'Tester',
      email: 'tester@example.com',
      roles: ['super_admin'],
      permissions: ['*'],
    },
    config.jwt.secret
  );
}

describe('Project API Regression Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates project with minimal payload by filling server defaults', async () => {
    mockEnsureDefaultStatusId.mockResolvedValue('11111111-1111-4111-8111-111111111111');
    mockCreate.mockResolvedValue({
      id: '22222222-2222-4222-8222-222222222222',
      name: 'Project A',
      code: 'PA-01',
      location: 'Jakarta',
      budget: 0,
      currency: 'IDR',
      description: '',
    });

    const res = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${signToken()}`)
      .send({
        name: 'Project A',
        code: 'PA-01',
        location: 'Jakarta',
        budget: 0,
        currency: 'IDR',
        description: '',
      });

    expect(res.statusCode).toBe(201);
    expect(mockEnsureDefaultStatusId).toHaveBeenCalledWith('tenant-test');
    expect(mockCreate).toHaveBeenCalledWith(
      'tenant-test',
      expect.objectContaining({
        name: 'Project A',
        code: 'PA-01',
        statusId: '11111111-1111-4111-8111-111111111111',
      })
    );

    const payload = mockCreate.mock.calls[0][1];
    expect(payload.startDate).toBeInstanceOf(Date);
    expect(payload.endDate).toBeInstanceOf(Date);
  });

  it('updates project with partial payload', async () => {
    mockUpdate.mockResolvedValue({
      id: '33333333-3333-4333-8333-333333333333',
      name: 'Renamed Project',
      code: 'PA-01',
    });

    const res = await request(app)
      .put('/api/projects/33333333-3333-4333-8333-333333333333')
      .set('Authorization', `Bearer ${signToken()}`)
      .send({ name: 'Renamed Project' });

    expect(res.statusCode).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      'tenant-test',
      '33333333-3333-4333-8333-333333333333',
      expect.objectContaining({ name: 'Renamed Project' })
    );
  });
});
