import { supabase, isSupabaseConfigured } from './supabaseClient';
import { sanitizeForLogging } from '../utils/sanitization';

export interface ActivityLog {
  userId?: string;
  sessionId: string;
  eventType: string;
  eventCategory: string;
  eventData?: Record<string, any>;
  userAgent?: string;
  ipAddress?: string;
  url?: string;
  referrer?: string;
}

export interface ErrorLog {
  userId?: string;
  sessionId: string;
  errorType: string;
  errorMessage: string;
  errorStack?: string;
  component?: string;
  url?: string;
  userAgent?: string;
  additionalData?: Record<string, any>;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

export interface PerformanceLog {
  userId?: string;
  sessionId: string;
  metricName: string;
  metricValue: number;
  url?: string;
  userAgent?: string;
  additionalData?: Record<string, any>;
}

class LoggingService {
  private sessionId: string;
  private isEnabled: boolean;
  private currentUserId: string | null = null;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.isEnabled = isSupabaseConfigured();
    
    if (!this.isEnabled) {
      console.warn('Logging service disabled: Supabase not configured');
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Set current user ID for logging
  setUserId(userId: string | null) {
    this.currentUserId = userId;
  }

  // Get current user ID
  getCurrentUserId(): string | null {
    return this.currentUserId;
  }

  private getBaseLogData() {
    return {
      session_id: this.sessionId,
      user_agent: navigator.userAgent,
      url: window.location.href,
      user_id: this.currentUserId,
    };
  }

  private getActivityLogData() {
    return {
      ...this.getBaseLogData(),
      referrer: document.referrer || undefined,
    };
  }

  async logActivity(activityData: Omit<ActivityLog, 'sessionId' | 'userAgent' | 'url' | 'referrer' | 'userId'>): Promise<void> {
    if (!this.isEnabled || !supabase) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('Activity logging skipped: Service not available');
      }
      return;
    }

    try {
      const logData = {
        ...this.getActivityLogData(),
        event_type: activityData.eventType,
        event_category: activityData.eventCategory,
        event_data: sanitizeForLogging(activityData.eventData || {}),
        ip_address: activityData.ipAddress,
      };

      const { error } = await supabase
        .from('activity_logs')
        .insert([logData]);

      if (error) {
        console.error('Failed to log activity:', error);
      }
    } catch (error) {
      console.error('Failed to log activity:', error);
      // Don't throw the error to prevent breaking the main application flow
    }
  }

  async logError(errorData: Omit<ErrorLog, 'sessionId' | 'userAgent' | 'url' | 'userId'>): Promise<void> {
    if (!this.isEnabled || !supabase) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('Error logging skipped: Service not available');
      }
      return;
    }

    try {
      const logData = {
        ...this.getBaseLogData(),
        error_type: errorData.errorType,
        error_message: errorData.errorMessage,
        error_stack: errorData.errorStack,
        component: errorData.component,
        additional_data: sanitizeForLogging(errorData.additionalData || {}),
        severity: errorData.severity || 'medium',
      };

      const { error } = await supabase
        .from('error_logs')
        .insert([logData]);

      if (error) {
        console.error('Failed to log error:', error);
      }
    } catch (error) {
      console.error('Failed to log error:', error);
      // Don't throw the error to prevent breaking the main application flow
    }
  }

  async logPerformance(performanceData: Omit<PerformanceLog, 'sessionId' | 'userAgent' | 'url' | 'userId'>): Promise<void> {
    if (!this.isEnabled || !supabase) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('Performance logging skipped: Service not available');
      }
      return;
    }

    try {
      const logData = {
        ...this.getBaseLogData(),
        metric_name: performanceData.metricName,
        metric_value: performanceData.metricValue,
        additional_data: performanceData.additionalData || {},
      };

      const { error } = await supabase
        .from('performance_logs')
        .insert([logData]);

      if (error) {
        console.error('Failed to log performance:', error);
      }
    } catch (error) {
      console.error('Failed to log performance:', error);
      // Don't throw the error to prevent breaking the main application flow
    }
  }

  // Utility methods for common logging scenarios
  async logPageView(path?: string, additionalData?: Record<string, any>): Promise<void> {
    await this.logActivity({
      eventType: 'page_view',
      eventCategory: 'navigation',
      eventData: {
        page: path || window.location.pathname,
        ...additionalData,
      },
    });
  }

  async logUserAction(action: string, category: string = 'user_interaction', additionalData?: Record<string, any>): Promise<void> {
    await this.logActivity({
      eventType: action,
      eventCategory: category,
      eventData: additionalData,
    });
  }

  async logComponentError(component: string, error: Error, additionalData?: Record<string, any>): Promise<void> {
    await this.logError({
      errorType: 'component_error',
      errorMessage: error.message,
      errorStack: error.stack,
      component,
      additionalData: additionalData,
      severity: 'medium',
    });
  }

  async logApiError(endpoint: string, error: Error, additionalData?: Record<string, any>): Promise<void> {
    await this.logError({
      errorType: 'api_error',
      errorMessage: error.message,
      errorStack: error.stack,
      component: `API: ${endpoint}`,
      additionalData: {
        endpoint,
        ...additionalData,
      },
      severity: 'high',
    });
  }

  async logSearch(query: string, resultCount?: number, filters?: Record<string, any>): Promise<void> {
    await this.logActivity({
      eventType: 'search_performed',
      eventCategory: 'search',
      eventData: {
        query,
        resultCount,
        filters,
      },
    });
  }

  // Chat logging method
  async logChatMessage(agentId: string, messageLength: number, additionalData?: Record<string, any>): Promise<void> {
    await this.logActivity({
      eventType: 'chat_message_sent',
      eventCategory: 'chat',
      eventData: {
        agentId,
        messageLength,
        ...additionalData,
      },
    });
  }

  // Performance logging helpers
  async logLoadTime(metric: string, duration: number, additionalData?: Record<string, any>): Promise<void> {
    await this.logPerformance({
      metricName: metric,
      metricValue: duration,
      additionalData: additionalData,
    });
  }

  // Add the missing methods that were being called
  async logPageLoadTime(): Promise<void> {
    if (typeof window !== 'undefined' && window.performance) {
      const loadTime = window.performance.timing.loadEventEnd - window.performance.timing.navigationStart;
      if (loadTime > 0) {
        await this.logLoadTime('page_load_time', loadTime);
      }
    }
  }

  async logAPIResponseTime(endpoint: string, duration: number, success: boolean, additionalData?: Record<string, any>): Promise<void> {
    await this.logLoadTime(`api_response_${endpoint}`, duration, {
      success,
      endpoint,
      ...additionalData,
    });
  }

  // AI-specific logging methods
  async logAIQuery(provider: string, model: string, query: string): Promise<void> {
    await this.logActivity({
      eventType: 'ai_query_sent',
      eventCategory: 'ai_interaction',
      eventData: {
        provider,
        model,
        queryLength: query.length,
        queryPreview: query.substring(0, 50) + (query.length > 50 ? '...' : '')
      }
    });
  }

  async logAIResponse(provider: string, success: boolean, error?: string, tokens?: number): Promise<void> {
    await this.logActivity({
      eventType: 'ai_response_received',
      eventCategory: 'ai_interaction',
      eventData: {
        provider,
        success,
        error,
        tokens
      }
    });
  }

  async logFeatureUsage(feature: string, data: Record<string, any>): Promise<void> {
    await this.logActivity({
      eventType: 'feature_used',
      eventCategory: 'feature_usage',
      eventData: {
        feature,
        ...data
      }
    });
  }

  // Session management
  getSessionId(): string {
    return this.sessionId;
  }

  isLoggingEnabled(): boolean {
    return this.isEnabled;
  }

  // Reset session (useful for logout)
  resetSession(): void {
    this.sessionId = this.generateSessionId();
    this.currentUserId = null;
  }
}

// Export a singleton instance
export const loggingService = new LoggingService();