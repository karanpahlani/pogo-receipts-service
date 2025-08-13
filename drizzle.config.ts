import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schemas.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5444/pogo_data',
  },
});
