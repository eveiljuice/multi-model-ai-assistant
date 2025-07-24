import { useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { sessionSecurity } from '../services/sessionSecurity';

export const useSessionValidation = () => {
  const { user, signOut } = useAuth();

  const validateSession = useCallback(async () => {
    if (!user) return;

    try {
      const isValid = await sessionSecurity.validateSession(user.id);
      
      if (!isValid) {
        console.warn('Session validation failed - signing out user');
        await signOut();
      }
    } catch (error) {
      console.error('Session validation error:', error);
      // In case of error, sign out as precaution
      await signOut();
    }
  }, [user, signOut]);

  // Validate session on mount and periodically
  useEffect(() => {
    if (user) {
      // Initial validation
      validateSession();

      // Set up periodic validation every 5 minutes
      const interval = setInterval(validateSession, 5 * 60 * 1000);
      
      return () => clearInterval(interval);
    }
  }, [user, validateSession]);

  // Validate session on focus
  useEffect(() => {
    const handleFocus = () => {
      if (user) {
        validateSession();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user, validateSession]);

  return { validateSession };
}; 