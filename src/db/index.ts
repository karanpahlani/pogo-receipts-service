import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from "pg";
import * as schema from './schemas.js';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable not set');
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 10,
  ssl: false,
});

export const db = drizzle(pool, { schema });
export * from './schemas.js';
