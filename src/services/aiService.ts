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

      // Enhanced auth token handling with retry
      let authToken: string;
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) {
            console.warn(`Auth session error (attempt ${retryCount + 1}):`, sessionError);
            // Try to refresh session
            const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
            
            if (refreshError || !refreshedSession?.access_token) {
              throw new Error('Authentication failed: Unable to refresh session');
            }
            
            authToken = refreshedSession.access_token;
            break;
          }
          
          if (!session?.access_token) {
            if (retryCount === maxRetries - 1) {
              throw new Error('No authentication token available after retries');
            }
            
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
            retryCount++;
            continue;
          }
          
          authToken = session.access_token;
          break;
        } catch (authError) {
          retryCount++;
          if (retryCount >= maxRetries) {
            throw new Error(`Authentication failed after ${maxRetries} attempts: ${authError.message}`);
          }
          
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
        }
      }

      // Call AI proxy function with enhanced error handling
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-proxy`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
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
      }).catch(fetchError => {
        // Enhanced CORS and network error handling
        console.error('Network/CORS error details:', {
          error: fetchError.message,
          provider,
          url: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-proxy`,
          name: fetchError.name,
          stack: fetchError.stack,
          currentOrigin: window.location.origin,
          timestamp: new Date().toISOString()
        });

        // Handle specific network errors
        if (fetchError.name === 'TypeError' && fetchError.message.includes('Failed to fetch')) {
          const origin = window.location.origin;
          const corsMessage = `CORS/Network error: Unable to connect to ${provider} service from ${origin}. 
          
Possible solutions:
1. Check if ${origin} is added to ALLOWED_ORIGINS in supabase/functions/_shared/cors.ts
2. Redeploy the ai-proxy function: npx supabase functions deploy ai-proxy
3. Check browser console for CORS errors
4. Verify Edge Function is running at: ${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-proxy

Please try again or contact support if the issue persists.`;
          
          throw new Error(corsMessage);
        }
        
        throw fetchError;
      });

      // Enhanced error handling
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        console.error(`${provider} API Error Details:`, {
          status: response.status,
          statusText: response.statusText,
          errorData,
          provider,
          headers: Object.fromEntries(response.headers.entries())
        });
        
        // Handle specific error types with better user messages
        if (response.status === 401) {
          throw new Error('Authentication failed: Please re-login to continue');
        } else if (response.status === 403) {
          // Handle 403 Forbidden errors (usually API key issues)
          const errorMsg = errorData.error || response.statusText;
          if (errorMsg.includes('Anthropic API error (403)')) {
            throw new Error(`${provider} API key is invalid or expired. Please check your API key configuration.`);
          } else {
            throw new Error(`Access forbidden: ${errorMsg}`);
          }
        } else if (response.status === 429) {
          throw new Error(`${provider} rate limit exceeded. Please try again in a few minutes.`);
        } else if (response.status === 503) {
          throw new Error(`${provider} service unavailable: ${errorData.error || 'Configuration issue'}`);
        } else if (response.status === 400) {
          throw new Error(`${provider} request error: ${errorData.error || 'Invalid request format'}`);
        } else if (response.status >= 500) {
          // Enhanced error message for 500 errors
          let serverError = errorData.error || response.statusText;
          if (errorData.details) {
            serverError += ` (Details: ${errorData.details})`;
          }
          throw new Error(`Server error: ${serverError}`);
        }
        
        throw new Error(errorData.error || `AI proxy error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const responseTime = Date.now() - startTime;
      
      // Enhanced content extraction with validation
      let content = '';
      let tokens = 0;
      
      try {
        switch (provider) {
          case 'openai':
            if (data.response?.choices?.[0]?.message?.content) {
              content = data.response.choices[0].message.content;
              tokens = data.response.usage?.total_tokens || 0;
            } else {
              throw new Error('Invalid OpenAI response format');
            }
            break;
            
          case 'anthropic':
            if (data.response?.content?.[0]?.text) {
              content = data.response.content[0].text;
              tokens = (data.response.usage?.input_tokens || 0) + (data.response.usage?.output_tokens || 0);
            } else {
              throw new Error('Invalid Anthropic response format');
            }
            break;
            
          case 'gemini':
            if (data.response?.candidates?.[0]?.content?.parts?.[0]?.text) {
              content = data.response.candidates[0].content.parts[0].text;
              tokens = data.tokens_used || 1;
            } else {
              throw new Error('Invalid Gemini response format');
            }
            break;
            
          default:
            throw new Error(`Unsupported provider: ${provider}`);
        }
        
        if (!content || content.trim().length === 0) {
          throw new Error(`Empty response from ${provider}`);
        }
      } catch (extractionError) {
        console.error(`Content extraction error for ${provider}:`, extractionError);
        console.error('Response data:', data);
        throw new Error(`Failed to extract content from ${provider} response: ${extractionError.message}`);
      }
      
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
      
      // Enhanced error categorization
      if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
        errorMessage = `${provider} rate limit exceeded`;
        this.updateProviderStatus(provider, false, 'Rate limit exceeded');
      } else if (errorMessage.includes('401') || errorMessage.includes('authentication') || errorMessage.includes('Authentication failed')) {
        errorMessage = `${provider} authentication failed - please re-login`;
        this.updateProviderStatus(provider, false, 'Authentication failed');
      } else if (errorMessage.includes('API key not configured')) {
        errorMessage = `${provider} API key not configured on server`;
        this.updateProviderStatus(provider, false, 'API key missing');
      } else if (errorMessage.includes('quota') || errorMessage.includes('billing')) {
        errorMessage = `${provider} quota exceeded - please check billing`;
        this.updateProviderStatus(provider, false, 'Quota exceeded');
      } else if (errorMessage.includes('Invalid') && errorMessage.includes('response format')) {
        errorMessage = `${provider} returned invalid response format`;
        this.updateProviderStatus(provider, false, 'Invalid response format');
      } else if (errorMessage.includes('Empty response')) {
        errorMessage = `${provider} returned empty response`;
        this.updateProviderStatus(provider, false, 'Empty response');
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
    preferredModel: AIModel = 'gpt-4.1-turbo',
    agentId?: string
  ): Promise<{ content: string; model: string; tokens: number; responseTime: number }> {
    const startTime = Date.now();

    // Map preferred model to provider
    const providerMap: Record<string, string> = {
      'gpt-4.1-turbo': 'openai',
      'claude-sonnet-4-20250514': 'anthropic',
      'gemini-2.0-flash': 'gemini'
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

    // ✅ НАСТОЯЩИЙ МУЛЬТИМОДАЛЬНЫЙ СИНТЕЗ
    const themes = this.extractCommonThemes(responses);
    const avgConfidence = responses.reduce((sum, r) => sum + r.confidence, 0) / responses.length;
    
    // Создаем комплексный синтезированный ответ
    const synthesizedContent = this.createSynthesizedResponse(responses, analysis);
    
    return {
      content: synthesizedContent,
      confidence: avgConfidence,
      consensus: themes.length > 0,
      themes: themes,
      analysis: analysis,
      sources: responses.map(r => ({
        provider: r.provider,
        model: r.model,
        content: r.content.substring(0, 300) + '...',
        confidence: r.confidence,
        tokens: r.tokens
      })),
      totalTokens: responses.reduce((sum, r) => sum + r.tokens, 0),
      providersUsed: responses.map(r => r.provider).join(', ')
    };
  }

  // ✅ НОВАЯ ФУНКЦИЯ: Создание настоящего синтезированного ответа
  private createSynthesizedResponse(responses: AIResponse[], analysis: QueryAnalysis): string {
    if (responses.length === 1) {
      return responses[0].content;
    }

    // Сортируем ответы по уверенности
    const sortedResponses = [...responses].sort((a, b) => b.confidence - a.confidence);
    
    let synthesizedContent = `# Комплексный анализ от ${responses.length} AI моделей\n\n`;
    
    // Проверяем консенсус между моделями
    const consensus = this.findConsensus(responses);
    if (consensus.length > 0) {
      synthesizedContent += `## ✅ Общие выводы всех моделей:\n\n`;
      consensus.forEach((point, index) => {
        synthesizedContent += `${index + 1}. ${point}\n`;
      });
      synthesizedContent += `\n`;
    }
    
    // Добавляем детальную информацию от лучшей модели
    const bestResponse = sortedResponses[0];
    synthesizedContent += `## 🎯 Детальный анализ (${bestResponse.provider}):\n\n`;
    synthesizedContent += `${bestResponse.content}\n\n`;
    
    // Добавляем дополнительные перспективы от других моделей
    if (sortedResponses.length > 1) {
      synthesizedContent += `## 🔍 Дополнительные перспективы:\n\n`;
      
      for (let i = 1; i < sortedResponses.length; i++) {
        const response = sortedResponses[i];
        synthesizedContent += `### ${response.provider} (${response.model}):\n`;
        
        // Извлекаем уникальные инсайты от этой модели
        const uniqueInsights = this.extractUniqueInsights(response.content, bestResponse.content);
        if (uniqueInsights.length > 0) {
          uniqueInsights.forEach(insight => {
            synthesizedContent += `- ${insight}\n`;
          });
        } else {
          // Если нет уникальных инсайтов, берем краткую выжимку
          const summary = response.content.split('\n')[0] || response.content.substring(0, 200);
          synthesizedContent += `- ${summary}${response.content.length > 200 ? '...' : ''}\n`;
        }
        synthesizedContent += `\n`;
      }
    }
    
    // Добавляем общую статистику
    synthesizedContent += `---\n\n`;
    synthesizedContent += `**Источники:** ${responses.map(r => r.provider).join(', ')}\n`;
    synthesizedContent += `**Средняя уверенность:** ${((responses.reduce((sum, r) => sum + r.confidence, 0) / responses.length) * 100).toFixed(1)}%\n`;
    synthesizedContent += `**Общий объем токенов:** ${responses.reduce((sum, r) => sum + r.tokens, 0)}\n`;
    
    return synthesizedContent;
  }

  // ✅ НОВАЯ ФУНКЦИЯ: Поиск консенсуса между моделями
  private findConsensus(responses: AIResponse[]): string[] {
    const consensusPoints: string[] = [];
    
    // Простой алгоритм поиска общих тем
    const allContents = responses.map(r => r.content.toLowerCase());
    
    // Ключевые фразы, которые могут указывать на консенсус (русские и английские)
    const keyPhrases = [
      // Русские фразы
      'важно',
      'необходимо',
      'рекомендую',
      'следует',
      'лучше',
      'эффективно',
      'полезно',
      'стоит',
      'можно',
      'нужно',
      // Английские фразы  
      'important',
      'necessary',
      'recommend',
      'should',
      'better',
      'effective',
      'useful',
      'worth',
      'can',
      'need',
      'must',
      'essential',
      'crucial',
      'best',
      'optimal'
    ];
    
    // Ищем предложения, содержащие ключевые фразы в нескольких ответах
    keyPhrases.forEach(phrase => {
      const matchingResponses = responses.filter(r => 
        r.content.toLowerCase().includes(phrase)
      );
      
      if (matchingResponses.length >= 2) {
        // Находим предложения с этой фразой
        matchingResponses.forEach(response => {
          const sentences = response.content.split(/[.!?]/).filter(s => s.trim().length > 20);
          const matchingSentence = sentences.find(s => 
            s.toLowerCase().includes(phrase)
          );
          
          if (matchingSentence && !consensusPoints.some(p => p.includes(phrase))) {
            consensusPoints.push(matchingSentence.trim());
          }
        });
      }
    });
    
    // Ограничиваем до 3 главных пунктов консенсуса
    return consensusPoints.slice(0, 3);
  }

  // ✅ НОВАЯ ФУНКЦИЯ: Извлечение уникальных инсайтов
  private extractUniqueInsights(currentContent: string, referenceContent: string): string[] {
    const insights: string[] = [];
    
    // Разбиваем на предложения
    const currentSentences = currentContent.split(/[.!?]/).filter(s => s.trim().length > 30);
    const referenceSentences = referenceContent.split(/[.!?]/).filter(s => s.trim().length > 30);
    
    // Ищем предложения, которых нет в референсном тексте
    currentSentences.forEach(sentence => {
      const isUnique = !referenceSentences.some(refSentence => 
        this.sentenceSimilarity(sentence.trim(), refSentence.trim()) > 0.7
      );
      
      if (isUnique && sentence.trim().length > 50) {
        insights.push(sentence.trim());
      }
    });
    
    // Ограничиваем до 3 уникальных инсайтов
    return insights.slice(0, 3);
  }

  // ✅ НОВАЯ ФУНКЦИЯ: Простая оценка схожести предложений
  private sentenceSimilarity(sentence1: string, sentence2: string): number {
    const words1 = sentence1.toLowerCase().split(/\W+/).filter(w => w.length > 3);
    const words2 = sentence2.toLowerCase().split(/\W+/).filter(w => w.length > 3);
    
    if (words1.length === 0 || words2.length === 0) return 0;
    
    const commonWords = words1.filter(word => words2.includes(word));
    return commonWords.length / Math.max(words1.length, words2.length);
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