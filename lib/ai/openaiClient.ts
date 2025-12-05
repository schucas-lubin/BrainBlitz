import OpenAI from 'openai';

/**
 * OpenAI client for AI services.
 * All operations using this client should be server-side only.
 * 
 * Lazy initialization to avoid errors if API key is not set at module load time.
 */
let _openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!_openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'OPENAI_API_KEY is not set. Please set it in your .env.local file.'
      );
    }
    _openai = new OpenAI({
      apiKey,
    });
  }
  return _openai;
}

// Export openai object with lazy initialization
export const openai = {
  get chat() {
    return getOpenAIClient().chat;
  },
} as OpenAI;

