import 'dotenv/config';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { getOpenAIApiKey } from '../config/apiKey.js';

// API key will be fetched dynamically
let apiKeyPromise: Promise<string> | null = null;

// these are you're allowed models
type OpenAIModel = 'gpt-5' | 'gpt-4o' | 'gpt-4o-mini' | 'gpt-3.5-turbo' | 'text-embedding-3-small';

async function getApiKey(): Promise<string> {
  if (!apiKeyPromise) {
    apiKeyPromise = getOpenAIApiKey();
  }
  return apiKeyPromise;
}

export interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
  model?: OpenAIModel;
}

/**
 * Generate text using OpenAI GPT model
 */
export async function generateLLMText(prompt: string, options?: LLMOptions): Promise<string> {
  try {
    // Get API key dynamically
    const apiKey = await getApiKey();
    
    // Create OpenAI provider with the fetched API key
    const provider = openai({
      apiKey: apiKey
    });

    const { text } = await generateText({
      prompt,
      model: provider(options?.model || 'gpt-4o-mini'),
      temperature: options?.temperature ?? 1,
      maxTokens: options?.maxTokens,
    });

    return text;
  } catch (error) {
    console.error('LLM text generation error:', error);
    throw error;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  // Testing OpenAI - pnpm tsx src/ai/index.ts
  const result = await generateLLMText('What is the capital of France?');
  console.log('OpenAI - result', result);
}
