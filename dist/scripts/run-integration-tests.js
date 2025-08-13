import { exec } from 'child_process';
import { promisify } from 'util';
import { Pool } from 'pg';
const execAsync = promisify(exec);
async function checkDatabaseConnection() {
    const DATABASE_URL = process.env.DATABASE_URL;
    if (!DATABASE_URL) {
        console.log('❌ DATABASE_URL not set');
        return false;
    }
    const pool = new Pool({ connectionString: DATABASE_URL, ssl: false });
    try {
        await pool.query('SELECT 1');
        console.log('✅ Database connection successful');
        await pool.end();
        return true;
    }
    catch (error) {
        console.log('❌ Database connection failed:', error.message);
        await pool.end();
        return false;
    }
}
async function runIntegrationTests() {
    console.log('🔍 Checking database connection...');
    const dbAvailable = await checkDatabaseConnection();
    if (!dbAvailable) {
        console.log('\n⚠️  Database not available. Skipping integration tests.');
        console.log('To run integration tests:');
        console.log('1. Start the database: docker-compose up -d postgres');
        console.log('2. Run migrations: npm run db:migrate');
        console.log('3. Run this script again');
        process.exit(0);
    }
    console.log('\n🧪 Running integration tests...');
    try {
        // Remove the integration test ignore patterns temporarily
        const { stdout, stderr } = await execAsync('npx jest src/__tests__/database.test.ts src/__tests__/integration.test.ts --testTimeout=30000', { env: { ...process.env, NODE_ENV: 'test' } });
        console.log(stdout);
        if (stderr) {
            console.error(stderr);
        }
        console.log('✅ Integration tests completed successfully!');
    }
    catch (error) {
        console.error('❌ Integration tests failed:');
        console.error(error.stdout || error.message);
        process.exit(1);
    }
}
if (require.main === module) {
    runIntegrationTests().catch(console.error);
}
export { runIntegrationTests, checkDatabaseConnection };
