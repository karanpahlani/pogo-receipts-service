// Simple setup file for Jest tests
// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://postgres:password@localhost:5444/pogo_data_test';
process.env.PORT = '7647';
process.env.OPENAI_API_KEY = 'test-key';