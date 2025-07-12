export interface AIProvider {
  name: string;
  model: string;
  apiKey: string;
  temperature: number;
  maxTokens: number;
  rateLimit: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
}

export interface AIResponse {
  provider?: string;
  model?: string;
  content?: string;
  confidence?: number;
  tokens?: number;
  responseTime?: number;
  error?: string;
}

export interface SynthesizedResponse {
  finalAnswer?: string;
  sources?: AIResponse[];
  confidence?: number;
  reasoning?: string;
  citations?: string[];
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  responses?: AIResponse[];
  synthesized?: SynthesizedResponse;
}

export interface RateLimitTracker {
  provider: string;
  requests: number[];
  tokens: number[];
  lastReset: Date;
}

export interface QueryAnalysis {
  complexity: 'simple' | 'moderate' | 'complex';
  domain: string[];
  requiresCode: boolean;
  requiresReasoning: boolean;
  requiresCreativity: boolean;
}