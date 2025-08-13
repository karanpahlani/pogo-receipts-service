import 'dotenv/config';
import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable not set.\n**It should have been provided via a shared 1password link**');
}
// Configure OpenAI provider with API key
const openai = createOpenAI({
    apiKey: OPENAI_API_KEY,
});
/**
 * Generate text using OpenAI GPT model
 */
export async function generateLLMText(prompt, options) {
    try {
        const { text } = await generateText({
            prompt,
            model: openai(options?.model || 'gpt-4o-mini'),
            temperature: options?.temperature ?? 1,
            maxTokens: options?.maxTokens,
        });
        return text;
    }
    catch (error) {
        console.error('LLM text generation error:', error);
        throw error;
    }
}
