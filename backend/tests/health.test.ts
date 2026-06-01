import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../src/app.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;

beforeAll(async () => {
  process.env.DATABASE_URL = 'postgresql://fitsocial:fitsocial@localhost:5432/fitsocial';
  process.env.JWT_ACCESS_SECRET = 'test-access-secret-1234567890';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-1234567890';
  app = await buildApp();
});

afterAll(async () => {
  await app.close();
});

describe('GET /api/v1/health', () => {
  it('should return 200 with status ok', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/health',
    });

    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.body) as { success: boolean; data: { status: string } };
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('ok');
  });
});
