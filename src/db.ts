import 'dotenv/config';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL not set');
}

export const pool = new Pool({ connectionString });

export async function pingDb() {
  const r = await pool.query('select 1 as ok');
  return r.rows[0].ok === 1;
}