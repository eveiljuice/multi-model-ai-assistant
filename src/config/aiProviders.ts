import { AIProvider } from '../types/ai';

export const AI_PROVIDERS: Record<string, AIProvider> = {
  openai: {
    name: 'OpenAI',
    model: 'gpt-4.1-turbo',
    apiKey: 'backend-only',
    temperature: 0.7,
    maxTokens: 2000,
    rateLimit: {
      requestsPerMinute: 60,
      tokensPerMinute: 90000
    }
  },
  anthropic: {
    name: 'Anthropic',
    model: 'claude-sonnet-4-20250514',
    apiKey: 'backend-only',
    temperature: 0.7,
    maxTokens: 2000,
    rateLimit: {
      requestsPerMinute: 50,
      tokensPerMinute: 40000
    }
  },
  gemini: {
    name: 'Google Gemini',
    model: 'gemini-2.0-flash',
    apiKey: 'backend-only',
    temperature: 0.7,
    maxTokens: 2000,
    rateLimit: {
      requestsPerMinute: 60,
      tokensPerMinute: 32000
    }
  }
};

export const SYSTEM_PROMPTS = {
  default: `You are a helpful AI assistant. Provide accurate, comprehensive, and well-structured responses. Include relevant examples and explanations when appropriate.`,
  
  analysis: `You are an expert analyst. Break down complex problems systematically, provide evidence-based insights, and structure your response with clear headings and bullet points.`,
  
  coding: `You are a senior software engineer. Provide clean, well-commented code examples with explanations. Include best practices and potential pitfalls to avoid.`,
  
  creative: `You are a creative assistant. Generate original, engaging content while maintaining accuracy and relevance to the user's request.`
};