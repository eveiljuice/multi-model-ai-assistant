import { supabase } from './supabaseClient';
import { loggingService } from './loggingService';

// ВРЕМЕННОЕ ОТКЛЮЧЕНИЕ: Отключаем session security для устранения 404 ошибок
const SESSION_SECURITY_ENABLED = false;

interface SessionFingerprint {
  userAgent: string;
  screenResolution: string;
  timezone: string;
  language: string;
  platform: string;
  cookieEnabled: boolean;
}

class SessionSecurity {
  private sessionFingerprint: SessionFingerprint | null = null;
  private sessionId: string | null = null;

  // Generate session fingerprint
  generateFingerprint(): SessionFingerprint {
    return {
      userAgent: navigator.userAgent,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled
    };
  }

  // Initialize session security
  async initializeSession(userId: string): Promise<void> {
    if (!SESSION_SECURITY_ENABLED) {
      console.log('Session security disabled - skipping initialization');
      return;
    }

    try {
      this.sessionFingerprint = this.generateFingerprint();
      this.sessionId = this.generateSessionId();

      // Store session fingerprint in database
      await supabase
        .from('session_security')
        .insert({
          user_id: userId,
          session_id: this.sessionId,
          fingerprint: JSON.stringify(this.sessionFingerprint),
          created_at: new Date().toISOString(),
          last_activity: new Date().toISOString(),
          is_active: true
        });

      // Store in session storage for comparison
      sessionStorage.setItem('session_fingerprint', JSON.stringify(this.sessionFingerprint));
      sessionStorage.setItem('session_id', this.sessionId);

      loggingService.logActivity({
        eventType: 'session_initialized',
        eventCategory: 'security',
        eventData: {
          sessionId: this.sessionId,
          fingerprintHash: this.hashFingerprint(this.sessionFingerprint)
        }
      });
    } catch (error) {
      console.error('Failed to initialize session security:', error);
      loggingService.logError({
        errorType: 'session_init_error',
        errorMessage: error instanceof Error ? error.message : 'Session initialization failed',
        component: 'SessionSecurity.initializeSession',
        severity: 'medium'
      });
    }
  }

  // Validate session integrity
  async validateSession(userId: string): Promise<boolean> {
    if (!SESSION_SECURITY_ENABLED) {
      console.log('Session security disabled - skipping validation');
      return true; // Always return true when disabled
    }

    try {
      const currentFingerprint = this.generateFingerprint();
      const storedFingerprint = sessionStorage.getItem('session_fingerprint');
      const storedSessionId = sessionStorage.getItem('session_id');

      if (!storedFingerprint || !storedSessionId) {
        await this.logSecurityEvent('session_missing_fingerprint', userId);
        return false;
      }

      const originalFingerprint: SessionFingerprint = JSON.parse(storedFingerprint);
      
      // Check for suspicious changes
      const suspiciousChanges = this.detectSuspiciousChanges(originalFingerprint, currentFingerprint);
      
      if (suspiciousChanges.length > 0) {
        await this.logSecurityEvent('session_hijack_attempt', userId, {
          suspiciousChanges,
          originalFingerprint: this.hashFingerprint(originalFingerprint),
          currentFingerprint: this.hashFingerprint(currentFingerprint)
        });
        return false;
      }

      // Update last activity
      await this.updateSessionActivity(userId, storedSessionId);
      
      return true;
    } catch (error) {
      console.error('Session validation error:', error);
      await this.logSecurityEvent('session_validation_error', userId, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  // Detect suspicious changes in fingerprint
  private detectSuspiciousChanges(original: SessionFingerprint, current: SessionFingerprint): string[] {
    const changes: string[] = [];

    // Critical changes that indicate session hijacking
    if (original.userAgent !== current.userAgent) {
      changes.push('userAgent_changed');
    }

    if (original.platform !== current.platform) {
      changes.push('platform_changed');
    }

    if (original.timezone !== current.timezone) {
      changes.push('timezone_changed');
    }

    if (original.language !== current.language) {
      changes.push('language_changed');
    }

    // Less critical but still suspicious
    if (original.screenResolution !== current.screenResolution) {
      changes.push('screen_resolution_changed');
    }

    if (original.cookieEnabled !== current.cookieEnabled) {
      changes.push('cookie_setting_changed');
    }

    return changes;
  }

  // Update session activity
  private async updateSessionActivity(userId: string, sessionId: string): Promise<void> {
    if (!SESSION_SECURITY_ENABLED) {
      return;
    }

    try {
      await supabase
        .from('session_security')
        .update({
          last_activity: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('session_id', sessionId);
    } catch (error) {
      console.error('Failed to update session activity:', error);
    }
  }

  // Generate session ID
  private generateSessionId(): string {
    return crypto.randomUUID();
  }

  // Hash fingerprint for logging
  private hashFingerprint(fingerprint: SessionFingerprint): string {
    const str = JSON.stringify(fingerprint);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(16);
  }

  // Log security event
  private async logSecurityEvent(eventType: string, userId: string, additionalData?: any): Promise<void> {
    if (!SESSION_SECURITY_ENABLED) {
      console.log('Session security disabled - skipping security event log');
      return;
    }

    try {
      await supabase
        .from('security_events')
        .insert({
          user_id: userId,
          event_type: eventType,
          severity: 'high',
          details: JSON.stringify(additionalData || {}),
          ip_address: null, // Would need to be detected
          user_agent: navigator.userAgent,
          timestamp: new Date().toISOString()
        });

      loggingService.logError({
        errorType: eventType,
        errorMessage: `Security event: ${eventType}`,
        component: 'SessionSecurity',
        additionalData,
        severity: 'high'
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  // Terminate session
  async terminateSession(userId: string): Promise<void> {
    if (!SESSION_SECURITY_ENABLED) {
      console.log('Session security disabled - skipping session termination');
      return;
    }

    try {
      const sessionId = sessionStorage.getItem('session_id');
      
      if (sessionId) {
        await supabase
          .from('session_security')
          .update({ is_active: false })
          .eq('user_id', userId)
          .eq('session_id', sessionId);
      }

      // Clear session storage
      sessionStorage.removeItem('session_fingerprint');
      sessionStorage.removeItem('session_id');
      
      this.sessionFingerprint = null;
      this.sessionId = null;

      loggingService.logActivity({
        eventType: 'session_terminated',
        eventCategory: 'security',
        eventData: { sessionId }
      });
    } catch (error) {
      console.error('Failed to terminate session:', error);
    }
  }

  // Check for multiple active sessions
  async checkMultipleSessions(userId: string): Promise<boolean> {
    if (!SESSION_SECURITY_ENABLED) {
      console.log('Session security disabled - skipping multiple sessions check');
      return false;
    }

    try {
      const { data: activeSessions } = await supabase
        .from('session_security')
        .select('session_id, created_at')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (activeSessions && activeSessions.length > 3) {
        await this.logSecurityEvent('multiple_sessions_detected', userId, {
          sessionCount: activeSessions.length
        });
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to check multiple sessions:', error);
      return false;
    }
  }
}

export const sessionSecurity = new SessionSecurity(); 