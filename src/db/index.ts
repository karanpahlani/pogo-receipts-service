import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from "pg";
import * as schema from './schemas.js';

const { Pool } = pkg;

let pool: typeof pkg.Pool;
let _db: ReturnType<typeof drizzle>;

function initializeDatabase() {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable not set');
  }

  pool = new Pool({
    connectionString: DATABASE_URL,
    max: 10,
    ssl: false,
  });

  _db = drizzle(pool, { schema });
}

// Initialize on module load
initializeDatabase();

export let db = _db;
export async function reinitializeDatabase() {
  if (pool) {
    await pool.end();
  }
  initializeDatabase();
  db = _db;
  return _db;
}

export * from './schemas.js';
