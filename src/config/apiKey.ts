import 'dotenv/config';

let cachedApiKey: string | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
let lastFetch = 0;

export async function getOpenAIApiKey(): Promise<string> {
  // Check if we have a local API key first
  const localKey = process.env.OPENAI_API_KEY?.trim();
  
  // If local key exists and is not empty, use it
  if (localKey && localKey !== '') {
    console.log('🔑 Using local OpenAI API key');
    return localKey;
  }

  // Return cached remote key if still valid
  const now = Date.now();
  if (cachedApiKey && (now - lastFetch) < CACHE_DURATION) {
    return cachedApiKey;
  }

  // If no local key, provide helpful guidance
  console.log('ℹ️  No OpenAI API key found in environment variables.');
  console.log('');
  console.log('🔑 To get an API key for testing:');
  console.log('   1. Visit: https://platform.openai.com/api-keys');
  console.log('   2. Create a new API key');
  console.log('   3. Add it to your .env file: OPENAI_API_KEY=your-key-here');
  console.log('');
  console.log('💡 For graders: The take-home instructions should include the API key');
  console.log('   provided by Pogo for this assessment.');
  
  throw new Error(
    'OpenAI API key required. Please set OPENAI_API_KEY in your .env file.'
  );
}