import 'dotenv/config';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  throw new Error(
    'OPENAI_API_KEY environment variable not set.\n**It should have been provided via a shared 1password link**'
  );
}

// these are you're allowed models
type OpenAIModel = 'gpt-5' | 'gpt-4o' | 'gpt-4o-mini' | 'gpt-3.5-turbo' | 'text-embedding-3-small';

// Configure OpenAI client
const model = openai('gpt-5');

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
    const { text } = await generateText({
      prompt,
      model: options?.model ? openai(options.model) : model,
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
