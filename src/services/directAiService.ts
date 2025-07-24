import { AIResponse, ConversationMessage } from '../types/ai';
import { AIModel } from '../types';
import { supabase } from './supabaseClient';
import { loggingService } from './loggingService';

interface DirectAIProviderConfig {
  name: string;
  model: string;
  temperature: number;
  maxTokens: number;
  retryAttempts: number;
  retryDelay: number;
}

interface AIProviderError {
  provider: string;
  error: string;
  statusCode?: number;
  retryable: boolean;
}

class DirectAIService {
  private providers: Record<string, DirectAIProviderConfig> = {
    claude: {
      name: 'Claude',
      model: 'claude-sonnet-4-20250514',
      temperature: 0.7,
      maxTokens: 4000,
      retryAttempts: 3,
      retryDelay: 1000
    },
    gemini: {
      name: 'Gemini',
      model: 'gemini-2.0-flash',
      temperature: 0.7,
      maxTokens: 4000,
      retryAttempts: 3,
      retryDelay: 1000
    }
  };

  private getProxyUrl(): string {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error('Supabase URL not configured in environment variables');
    }
    return `${supabaseUrl}/functions/v1/ai-proxy`;
  }

  private async getAuthToken(): Promise<string> {
    if (!supabase) {
      throw new Error('Supabase client not configured');
    }
    
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      loggingService.logError({
        errorType: 'auth_session_error',
        errorMessage: error.message,
        component: 'DirectAIService.getAuthToken',
        additionalData: { error },
        severity: 'high'
      });
      throw new Error(`Authentication session error: ${error.message}`);
    }
    
    if (!session?.access_token) {
      // Try to refresh the session
      const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError || !refreshedSession?.access_token) {
        throw new Error('User not authenticated - please login again');
      }
      
      return refreshedSession.access_token;
    }
    
    return session.access_token;
  }

  private async callAIProxyWithRetry(
    provider: 'anthropic' | 'gemini',
    query: string,
    context: ConversationMessage[],
    systemPrompt: string,
    agentId?: string
  ): Promise<AIResponse> {
    const config = this.providers[provider === 'anthropic' ? 'claude' : 'gemini'];
    const proxyUrl = this.getProxyUrl();
    
    let lastError: AIProviderError | null = null;
    
    for (let attempt = 1; attempt <= config.retryAttempts; attempt++) {
      try {
        loggingService.logActivity({
          eventType: 'ai_request_attempt',
          eventCategory: 'ai_service',
          eventData: {
            provider,
            attempt,
            agentId,
            queryLength: query.length,
            contextLength: context.length
          }
        });

        const authToken = await this.getAuthToken();
        
        const messages = [
          { role: 'system', content: systemPrompt },
          ...context.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          { role: 'user', content: query }
        ];

        const startTime = Date.now();
        const response = await fetch(proxyUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            provider,
            model: config.model,
            messages,
            temperature: config.temperature,
            max_tokens: config.maxTokens,
            agent_id: agentId
          })
        });

        const responseTime = Date.now() - startTime;

        if (!response.ok) {
          const errorText = await response.text();
          let errorData: any = {};
          
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { error: errorText };
          }

          const aiError: AIProviderError = {
            provider,
            error: errorData.error || `HTTP ${response.status}`,
            statusCode: response.status,
            retryable: this.isRetryableError(response.status, errorData.error)
          };

          // Enhanced error logging with request details
          loggingService.logError({
            errorType: 'ai_provider_error',
            errorMessage: `${provider} error (attempt ${attempt}): ${aiError.error}`,
            component: 'DirectAIService.callAIProxyWithRetry',
            additionalData: { 
              provider,
              attempt,
              statusCode: response.status,
              responseTime,
              retryable: aiError.retryable,
              requestData: {
                model: config.model,
                temperature: config.temperature,
                max_tokens: config.maxTokens,
                messagesCount: messages.length
              }
            },
            severity: attempt === config.retryAttempts ? 'high' : 'medium'
          });

          lastError = aiError;

          // Special handling for validation errors
          if (response.status === 400 && aiError.error.includes('max_tokens')) {
            throw new Error(`${provider} configuration error: ${aiError.error}. Please check service configuration.`);
          }

          // Don't retry non-retryable errors
          if (!aiError.retryable) {
            throw new Error(`${provider} API error: ${aiError.error}`);
          }

          // If this is the last attempt, throw the error
          if (attempt === config.retryAttempts) {
            throw new Error(`${provider} API failed after ${config.retryAttempts} attempts: ${aiError.error}`);
          }

          // Wait before retrying with exponential backoff
          const delay = config.retryDelay * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        const data = await response.json();
        
        let content = '';
        let tokens = 0;
        
        try {
          if (provider === 'anthropic') {
            if (!data.response?.content?.[0]?.text) {
              throw new Error('Invalid Anthropic response structure');
            }
            content = data.response.content[0].text;
            tokens = (data.response.usage?.input_tokens || 0) + (data.response.usage?.output_tokens || 0);
          } else if (provider === 'gemini') {
            if (!data.response?.candidates?.[0]?.content?.parts?.[0]?.text) {
              throw new Error('Invalid Gemini response structure');
            }
            content = data.response.candidates[0].content.parts[0].text;
            tokens = data.tokens_used || 0;
          }

          if (!content || content.trim().length === 0) {
            throw new Error(`Empty response content from ${provider}`);
          }

          loggingService.logActivity({
            eventType: 'ai_request_success',
            eventCategory: 'ai_service',
            eventData: {
              provider,
              attempt,
              responseTime,
              tokens,
              contentLength: content.length,
              agentId
            }
          });

          return {
            provider: config.name,
            model: config.model,
            content,
            confidence: 0.85,
            tokens,
            responseTime
          };
        } catch (parseError) {
          const error = parseError instanceof Error ? parseError.message : 'Response parsing failed';
          
          loggingService.logError({
            errorType: 'ai_response_parse_error',
            errorMessage: `Failed to parse ${provider} response: ${error}`,
            component: 'DirectAIService.callAIProxyWithRetry',
            additionalData: { 
              provider,
              attempt,
              responseData: data,
              parseError: error
            },
            severity: 'high'
          });

          if (attempt === config.retryAttempts) {
            throw new Error(`Failed to parse ${provider} response after ${config.retryAttempts} attempts: ${error}`);
          }

          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, config.retryDelay));
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        loggingService.logError({
          errorType: 'ai_request_network_error',
          errorMessage: `Network error calling ${provider} (attempt ${attempt}): ${errorMessage}`,
          component: 'DirectAIService.callAIProxyWithRetry',
          additionalData: { 
            provider,
            attempt,
            error: errorMessage
          },
          severity: attempt === config.retryAttempts ? 'critical' : 'high'
        });

        lastError = {
          provider,
          error: errorMessage,
          retryable: !errorMessage.includes('authentication') && !errorMessage.includes('API key')
        };

        if (attempt === config.retryAttempts) {
          throw error;
        }

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, config.retryDelay * attempt));
      }
    }

    throw new Error(`All retry attempts failed for ${provider}: ${lastError?.error || 'Unknown error'}`);
  }

  private isRetryableError(statusCode: number, errorMessage: string): boolean {
    // Don't retry authentication errors, API key errors, or client errors
    if (statusCode === 401 || statusCode === 403) return false;
    if (errorMessage.toLowerCase().includes('api key')) return false;
    if (errorMessage.toLowerCase().includes('authentication')) return false;
    if (errorMessage.toLowerCase().includes('authorization')) return false;
    
    // Retry rate limits, server errors, and network errors
    if (statusCode === 429) return true;
    if (statusCode >= 500) return true;
    
    return false;
  }

  private async callClaude(
    query: string,
    context: ConversationMessage[],
    systemPrompt: string,
    agentId?: string
  ): Promise<AIResponse> {
    return this.callAIProxyWithRetry('anthropic', query, context, systemPrompt, agentId);
  }

  private async callGemini(
    query: string,
    context: ConversationMessage[],
    systemPrompt: string,
    agentId?: string
  ): Promise<AIResponse> {
    return this.callAIProxyWithRetry('gemini', query, context, systemPrompt, agentId);
  }

  async processQuery(
    query: string,
    provider: 'claude' | 'gemini',
    context: ConversationMessage[] = [],
    systemPrompt = '',
    agentId?: string
  ): Promise<AIResponse> {
    try {
      loggingService.logActivity({
        eventType: 'ai_process_query_start',
        eventCategory: 'ai_service',
        eventData: {
          provider,
          queryLength: query.length,
          contextLength: context.length,
          agentId
        }
      });

      if (provider === 'claude') {
        return await this.callClaude(query, context, systemPrompt, agentId);
      } else if (provider === 'gemini') {
        return await this.callGemini(query, context, systemPrompt, agentId);
      }
      
      throw new Error(`Unsupported provider: ${provider}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      loggingService.logError({
        errorType: 'ai_process_query_error',
        errorMessage: `ProcessQuery failed for ${provider}: ${errorMessage}`,
        component: 'DirectAIService.processQuery',
        additionalData: { 
          provider,
          queryLength: query.length,
          agentId,
          error: errorMessage
        },
        severity: 'high'
      });

      // Fallback to other provider
      const fallbackProvider = provider === 'claude' ? 'gemini' : 'claude';
      try {
        loggingService.logActivity({
          eventType: 'ai_fallback_attempt',
          eventCategory: 'ai_service',
          eventData: {
            originalProvider: provider,
            fallbackProvider,
            agentId
          }
        });

        console.log(`Trying fallback: ${fallbackProvider}`);
        if (fallbackProvider === 'claude') {
          return await this.callClaude(query, context, systemPrompt, agentId);
        } else {
          return await this.callGemini(query, context, systemPrompt, agentId);
        }
      } catch (fallbackError) {
        const fallbackErrorMessage = fallbackError instanceof Error ? fallbackError.message : 'Unknown fallback error';
        
        loggingService.logError({
          errorType: 'ai_fallback_failed',
          errorMessage: `Both ${provider} and ${fallbackProvider} failed. Original: ${errorMessage}, Fallback: ${fallbackErrorMessage}`,
          component: 'DirectAIService.processQuery',
          additionalData: { 
            originalProvider: provider,
            fallbackProvider,
            originalError: errorMessage,
            fallbackError: fallbackErrorMessage,
            agentId
          },
          severity: 'critical'
        });

        throw new Error(`Both AI services failed - ${provider}: ${errorMessage}, ${fallbackProvider}: ${fallbackErrorMessage}`);
      }
    }
  }

  async processQueryWithPersonality(
    query: string,
    provider: 'claude' | 'gemini',
    context: ConversationMessage[] = [],
    personality: string,
    agentId?: string
  ): Promise<AIResponse> {
    const systemPrompt = `You are an AI assistant with the following personality: ${personality}. 
    Respond in character while being helpful and accurate. Keep responses concise unless asked for detail.`;
    
    return this.processQuery(query, provider, context, systemPrompt, agentId);
  }

  getAvailableProviders(): string[] {
    return Object.keys(this.providers);
  }

  async testConnection(provider: 'claude' | 'gemini'): Promise<{ success: boolean; error?: string; responseTime?: number }> {
    const startTime = Date.now();
    
    try {
      const response = await this.processQuery(
        'Hello, this is a test message.',
        provider,
        [],
        'You are a helpful assistant. Respond briefly to confirm you are working.',
        'test-connection'
      );
      
      const responseTime = Date.now() - startTime;
      
      loggingService.logActivity({
        eventType: 'ai_connection_test_success',
        eventCategory: 'ai_service',
        eventData: {
          provider,
          responseTime,
          contentLength: response.content.length
        }
      });

      return { success: true, responseTime };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      loggingService.logError({
        errorType: 'ai_connection_test_failed',
        errorMessage: `Connection test failed for ${provider}: ${errorMessage}`,
        component: 'DirectAIService.testConnection',
        additionalData: { 
          provider,
          responseTime,
          error: errorMessage
        },
        severity: 'high'
      });

      return { success: false, error: errorMessage, responseTime };
    }
  }

  async getModelsForProvider(provider: 'claude' | 'gemini'): Promise<AIModel[]> {
    const config = this.providers[provider === 'claude' ? 'claude' : 'gemini'];
    
    return [{
      id: config.model,
      name: config.name,
      description: `${config.name} model`,
      capabilities: ['text-generation', 'conversation'],
      maxTokens: config.maxTokens,
      costPer1k: 0.01
    }];
  }

  async estimateTokens(text: string): Promise<number> {
    // Simple token estimation (roughly 4 characters per token)
    return Math.ceil(text.length / 4);
  }

  async estimateCost(tokens: number): Promise<number> {
    return (tokens / 1000) * 0.01; // $0.01 per 1K tokens
  }
}

export default DirectAIService; 