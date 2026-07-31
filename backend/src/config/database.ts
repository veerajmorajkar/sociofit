import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { env } from './env.js';
import * as schema from '../db/schema.js';

const isLocalDb = /@(localhost|127\.0\.0\.1)(:|\/)/.test(env.DATABASE_URL);

const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  min: 2,
  max: 10,
  ssl: env.NODE_ENV === 'production' && !isLocalDb ? { rejectUnauthorized: false } : undefined,
});

export const db = drizzle(pool, { schema });
export { pool };
