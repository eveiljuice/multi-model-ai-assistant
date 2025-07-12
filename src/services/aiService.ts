import { AI_PROVIDERS, SYSTEM_PROMPTS } from '../config/aiProviders';
import { AIResponse, ConversationMessage, QueryAnalysis, RateLimitTracker } from '../types/ai';
import { AIModel } from '../types';
import { loggingService } from './loggingService';
import { supabase } from './supabaseClient';

class AIService {
  private rateLimitTrackers: Map<string, RateLimitTracker> = new Map();
  private isInitialized = true; // Always initialized now since we use proxy
  private providerStatus: Map<string, { available: boolean; lastError?: string; lastCheck: number }> = new Map();

  constructor() {
    // Initialize rate limit trackers
    Object.keys(AI_PROVIDERS).forEach(provider => {
      this.rateLimitTrackers.set(provider, {
        provider,
        requests: [],
        tokens: [],
        lastReset: new Date()
      });
      
      // Initialize provider status
      this.providerStatus.set(provider, {
        available: true,
        lastCheck: Date.now()
      });
    });
  }

  private checkRateLimit(provider: string): boolean {
    const tracker = this.rateLimitTrackers.get(provider);
    if (!tracker) return false;

    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);

    // Clean old entries
    tracker.requests = tracker.requests.filter(time => time > oneMinuteAgo.getTime());
    tracker.tokens = tracker.tokens.filter(time => time > oneMinuteAgo.getTime());

    const config = AI_PROVIDERS[provider];
    return tracker.requests.length < config.rateLimit.requestsPerMinute;
  }

  private updateRateLimit(provider: string, tokens: number): void {
    const tracker = this.rateLimitTrackers.get(provider);
    if (!tracker) return;

    const now = Date.now();
    tracker.requests.push(now);
    for (let i = 0; i < tokens; i++) {
      tracker.tokens.push(now);
    }
  }

  private updateProviderStatus(provider: string, available: boolean, error?: string): void {
    this.providerStatus.set(provider, {
      available,
      lastError: error,
      lastCheck: Date.now()
    });
  }

  private isProviderAvailable(provider: string): boolean {
    const status = this.providerStatus.get(provider);
    if (!status) return false;
    
    // Reset status after 5 minutes for quota errors
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    if (!status.available && status.lastCheck < fiveMinutesAgo) {
      status.available = true;
      status.lastError = undefined;
    }
    
    return status.available;
  }

  private analyzeQuery(query: string): QueryAnalysis {
    const codeKeywords = ['code', 'function', 'class', 'algorithm', 'programming', 'debug'];
    const reasoningKeywords = ['analyze', 'compare', 'explain', 'why', 'how', 'logic'];
    const creativeKeywords = ['create', 'write', 'story', 'poem', 'design', 'imagine'];

    const lowerQuery = query.toLowerCase();
    
    return {
      complexity: query.length > 200 ? 'complex' : query.length > 50 ? 'moderate' : 'simple',
      domain: this.extractDomains(lowerQuery),
      requiresCode: codeKeywords.some(keyword => lowerQuery.includes(keyword)),
      requiresReasoning: reasoningKeywords.some(keyword => lowerQuery.includes(keyword)),
      requiresCreativity: creativeKeywords.some(keyword => lowerQuery.includes(keyword))
    };
  }

  private extractDomains(query: string): string[] {
    const domains = [];
    const domainKeywords = {
      'technology': ['tech', 'software', 'programming', 'computer', 'ai', 'machine learning'],
      'science': ['science', 'research', 'experiment', 'theory', 'hypothesis'],
      'business': ['business', 'marketing', 'strategy', 'finance', 'management'],
      'creative': ['art', 'design', 'creative', 'writing', 'story', 'music'],
      'education': ['learn', 'teach', 'education', 'study', 'academic']
    };

    Object.entries(domainKeywords).forEach(([domain, keywords]) => {
      if (keywords.some(keyword => query.includes(keyword))) {
        domains.push(domain);
      }
    });

    return domains.length > 0 ? domains : ['general'];
  }

  private getSystemPrompt(analysis: QueryAnalysis): string {
    if (analysis.requiresCode) return SYSTEM_PROMPTS.coding;
    if (analysis.requiresReasoning) return SYSTEM_PROMPTS.analysis;
    if (analysis.requiresCreativity) return SYSTEM_PROMPTS.creative;
    return SYSTEM_PROMPTS.default;
  }

  private async callAIProxy(
    provider: string,
    query: string, 
    context: ConversationMessage[], 
    systemPrompt: string,
    agentId?: string
  ): Promise<AIResponse> {
    const startTime = Date.now();
    
    try {
      if (!this.isProviderAvailable(provider)) {
        throw new Error(`${provider} service not available`);
      }

      // Log AI query
      loggingService.logAIQuery(provider, AI_PROVIDERS[provider].model, query);

      if (!this.checkRateLimit(provider)) {
        throw new Error('Rate limit exceeded');
      }

      const messages = [
        { role: 'system', content: systemPrompt },
        ...context.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        { role: 'user', content: query }
      ];

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No authentication token available');
      }

      // Call AI proxy function
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-proxy`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider,
          model: AI_PROVIDERS[provider].model,
        messages,
          temperature: AI_PROVIDERS[provider].temperature,
          max_tokens: AI_PROVIDERS[provider].maxTokens,
          agent_id: agentId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `AI proxy error: ${response.status}`);
      }

      const data = await response.json();
      const responseTime = Date.now() - startTime;
      
      // Extract content based on provider
      let content = '';
      switch (provider) {
        case 'openai':
          content = data.response.choices[0]?.message?.content || '';
          break;
        case 'anthropic':
          content = data.response.content[0]?.text || '';
          break;
        case 'gemini':
          content = data.response.candidates[0]?.content?.parts[0]?.text || '';
          break;
      }

      const tokens = data.tokens_used || 0;
      
      this.updateRateLimit(provider, tokens);
      this.updateProviderStatus(provider, true);

      // Log successful response
      loggingService.logAIResponse(provider, true, undefined, tokens);
      loggingService.logAPIResponseTime(`${provider}_chat`, responseTime, true);

      return {
        provider: provider.charAt(0).toUpperCase() + provider.slice(1),
        model: AI_PROVIDERS[provider].model,
        content,
        confidence: this.calculateConfidence(content, provider),
        tokens,
        responseTime
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      let errorMessage = error instanceof Error ? error.message : 'Connection error';
      
      // Handle specific errors
      if (errorMessage.includes('429') || errorMessage.includes('quota')) {
        errorMessage = `${provider} quota exceeded - trying alternative providers`;
        this.updateProviderStatus(provider, false, 'Quota exceeded');
      } else if (errorMessage.includes('401') || errorMessage.includes('authentication')) {
        errorMessage = `${provider} authentication failed`;
        this.updateProviderStatus(provider, false, 'Authentication failed');
      } else if (errorMessage.includes('rate limit')) {
        errorMessage = `${provider} rate limit exceeded`;
        this.updateProviderStatus(provider, false, 'Rate limit exceeded');
      } else {
        this.updateProviderStatus(provider, false, errorMessage);
      }
      
      console.warn(`${provider} API Error:`, error);
      
      // Log failed response
      loggingService.logAIResponse(provider, false, errorMessage);
      loggingService.logAPIResponseTime(`${provider}_chat`, responseTime, false);

      throw new Error(errorMessage);
    }
  }

  private calculateConfidence(content: string, provider: string): number {
    if (!content || content.length < 10) return 0.1;
    
    // Base confidence based on provider reliability
    const baseConfidence = {
      'openai': 0.85,
      'anthropic': 0.80,
      'gemini': 0.75
    }[provider] || 0.70;
    
    // Adjust based on content characteristics
    let adjustment = 0;
    
    // Longer responses tend to be more comprehensive
    if (content.length > 500) adjustment += 0.05;
    
    // Responses with code or structured content
    if (content.includes('```') || content.includes('1.') || content.includes('•')) {
      adjustment += 0.05;
    }
    
    // Responses that seem uncertain
    if (content.toLowerCase().includes('i\'m not sure') || 
        content.toLowerCase().includes('uncertain') ||
        content.toLowerCase().includes('might be')) {
      adjustment -= 0.1;
    }
    
    return Math.min(0.95, Math.max(0.1, baseConfidence + adjustment));
  }

  private generateFallbackResponse(query: string, agentName?: string): string {
    const responses = [
      `I apologize, but I'm currently unable to process your request due to temporary service limitations. ${agentName ? `As ${agentName}, I` : 'I'} would normally help you with "${query.substring(0, 50)}${query.length > 50 ? '...' : ''}", but the AI services are temporarily unavailable.`,
      
      `${agentName ? `${agentName} is` : 'I am'} temporarily unable to respond to your query about "${query.substring(0, 50)}${query.length > 50 ? '...' : ''}". This is likely due to high demand or temporary service issues. Please try again in a few moments.`,
      
      `I understand you're asking about "${query.substring(0, 50)}${query.length > 50 ? '...' : ''}", but I'm currently experiencing connectivity issues with the AI services. ${agentName ? `${agentName} will` : 'I will'} be back to help you shortly.`,
      
      `Due to temporary technical difficulties, ${agentName || 'I'} cannot provide a detailed response to your query at this moment. Your question about "${query.substring(0, 50)}${query.length > 50 ? '...' : ''}" is important, and I encourage you to try again soon.`
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  }

  private getAvailableProviders(): string[] {
    return Object.keys(AI_PROVIDERS).filter(provider => this.isProviderAvailable(provider));
  }

  public async processQueryWithPersonality(
    query: string,
    context: ConversationMessage[],
    systemPrompt: string,
    preferredModel: AIModel = 'ChatGPT-4',
    agentId?: string
  ): Promise<{ content: string; model: string; tokens: number; responseTime: number }> {
    const startTime = Date.now();

    // Map preferred model to provider
    const providerMap: Record<string, string> = {
      'ChatGPT-4': 'openai',
      'Claude-3': 'anthropic',
      'Gemini-Pro': 'gemini'
    };
    
    const preferredProvider = providerMap[preferredModel] || 'openai';
    const availableProviders = this.getAvailableProviders();
    
    // Try preferred provider first, then fallback to others
    const providersToTry = [
      ...(availableProviders.includes(preferredProvider) ? [preferredProvider] : []),
      ...availableProviders.filter(p => p !== preferredProvider)
    ];

    if (providersToTry.length === 0) {
      // No providers available, return fallback
      return {
        content: this.generateFallbackResponse(query),
        model: 'Fallback',
        tokens: 0,
        responseTime: Date.now() - startTime
      };
    }

    // Try each provider in order
    for (const provider of providersToTry) {
      try {
        const response = await this.callAIProxy(provider, query, context, systemPrompt, agentId);
        
        return {
          content: response.content,
          model: `${response.provider} (${response.model})`,
          tokens: response.tokens,
          responseTime: response.responseTime
        };
      } catch (error) {
        console.warn(`Provider ${provider} failed:`, error);
        
        // If this was the last provider, return fallback
        if (provider === providersToTry[providersToTry.length - 1]) {
      return {
        content: this.generateFallbackResponse(query),
            model: 'Fallback',
        tokens: 0,
        responseTime: Date.now() - startTime
      };
    }

        // Otherwise, continue to next provider
        continue;
      }
    }

    // Shouldn't reach here, but just in case
    return {
      content: this.generateFallbackResponse(query),
      model: 'Fallback',
      tokens: 0,
      responseTime: Date.now() - startTime
    };
  }

  public async processQuery(
    query: string, 
    context: ConversationMessage[] = []
  ): Promise<{ responses: AIResponse[], synthesized: any }> {
    const analysis = this.analyzeQuery(query);
    const systemPrompt = this.getSystemPrompt(analysis);

    const availableProviders = this.getAvailableProviders();
    const responses: AIResponse[] = [];

    // Query multiple providers in parallel for comparison
    const promises = availableProviders.slice(0, 3).map(provider => 
      this.callAIProxy(provider, query, context, systemPrompt).catch(error => {
        console.warn(`Provider ${provider} failed:`, error);
        return null;
      })
    );

    const results = await Promise.all(promises);
    
    // Filter out failed responses
    results.forEach(response => {
      if (response) {
        responses.push(response);
      }
    });

    // If no responses, return fallback
    if (responses.length === 0) {
      responses.push({
        provider: 'Fallback',
        model: 'System',
        content: this.generateFallbackResponse(query),
        confidence: 0.1,
        tokens: 0,
        responseTime: 0
      });
    }

    const synthesized = this.synthesizeResponses(responses, analysis);

    return {
      responses,
      synthesized
    };
  }

  private synthesizeResponses(responses: AIResponse[], analysis: QueryAnalysis): any {
    if (responses.length === 0) {
      return {
        content: 'No responses available',
        confidence: 0,
        consensus: false,
        themes: [],
        analysis: analysis
      };
    }

    if (responses.length === 1) {
      return {
        content: responses[0].content,
        confidence: responses[0].confidence,
        consensus: true,
        themes: this.extractCommonThemes(responses),
        analysis: analysis,
        model: responses[0].model,
        provider: responses[0].provider
      };
    }

    // Multi-response synthesis
    const themes = this.extractCommonThemes(responses);
    const avgConfidence = responses.reduce((sum, r) => sum + r.confidence, 0) / responses.length;
    
    // Choose best response based on confidence and content length
    const bestResponse = responses.reduce((best, current) => {
      const currentScore = current.confidence * 0.7 + (current.content.length / 1000) * 0.3;
      const bestScore = best.confidence * 0.7 + (best.content.length / 1000) * 0.3;
      return currentScore > bestScore ? current : best;
    });

    return {
      content: bestResponse.content,
      confidence: avgConfidence,
      consensus: themes.length > 0,
      themes: themes,
      analysis: analysis,
      alternatives: responses.filter(r => r !== bestResponse).map(r => ({
        provider: r.provider,
        content: r.content.substring(0, 200) + '...',
        confidence: r.confidence
      })),
      model: bestResponse.model,
      provider: bestResponse.provider
    };
  }

  private extractCommonThemes(responses: AIResponse[]): string[] {
    // Simple theme extraction based on word frequency
    const words = responses
      .map(r => r.content.toLowerCase())
      .join(' ')
      .split(/\W+/)
      .filter(word => word.length > 4);
    
    const frequency: Record<string, number> = {};
    words.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });
    
    return Object.entries(frequency)
      .filter(([_, count]) => count >= 2)
      .sort(([_, a], [__, b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word);
  }

  public getRateLimitStatus(): Record<string, any> {
    const status: Record<string, any> = {};
    
    this.rateLimitTrackers.forEach((tracker, provider) => {
      const now = new Date();
      const oneMinuteAgo = new Date(now.getTime() - 60000);
      
      // Clean old entries
      tracker.requests = tracker.requests.filter(time => time > oneMinuteAgo.getTime());
      tracker.tokens = tracker.tokens.filter(time => time > oneMinuteAgo.getTime());
      
      const config = AI_PROVIDERS[provider];
      status[provider] = {
        requests: {
          current: tracker.requests.length,
          limit: config.rateLimit.requestsPerMinute,
          remaining: Math.max(0, config.rateLimit.requestsPerMinute - tracker.requests.length)
        },
        tokens: {
          current: tracker.tokens.length,
          limit: config.rateLimit.tokensPerMinute,
          remaining: Math.max(0, config.rateLimit.tokensPerMinute - tracker.tokens.length)
        },
        available: this.isProviderAvailable(provider),
        lastReset: tracker.lastReset
      };
    });
    
    return status;
  }

  public logAIQuery(provider: string, model: string, query: string): void {
    loggingService.logAIQuery(provider, model, query);
  }

  public logAIResponse(provider: string, success: boolean, error?: string, tokens?: number): void {
    loggingService.logAIResponse(provider, success, error, tokens);
  }

  public logFeatureUsage(feature: string, data: Record<string, any>): void {
    loggingService.logFeatureUsage(feature, data);
  }

  public getProviderStatus(): Record<string, { available: boolean; lastError?: string }> {
    const status: Record<string, { available: boolean; lastError?: string }> = {};
    
    this.providerStatus.forEach((value, key) => {
      status[key] = {
        available: value.available,
        lastError: value.lastError
      };
    });
    
    return status;
  }
}

export const aiService = new AIService();