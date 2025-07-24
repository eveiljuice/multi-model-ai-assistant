import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';
import { loggingService } from '../services/loggingService';
import { sessionSecurity } from '../services/sessionSecurity';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, userData?: any) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updateProfile: (updates: any) => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          loggingService.logError({
            errorType: 'auth_session_error',
            errorMessage: error.message,
            component: 'AuthProvider',
            severity: 'medium'
          });
        } else {
          setSession(session);
          setUser(session?.user ?? null);
          
          // Set user ID in logging service
          if (session?.user) {
            loggingService.setUserId(session.user.id);
            
            // Initialize session security
            await sessionSecurity.initializeSession(session.user.id);
            
            loggingService.logActivity({
              eventType: 'user_session_restored',
              eventCategory: 'authentication',
              eventData: {
                userId: session.user.id,
                email: session.user.email
              }
            });
          }
        }
      } catch (error) {
        console.error('Failed to get initial session:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Update user ID in logging service
        loggingService.setUserId(session?.user?.id || null);

        // Log auth events
        loggingService.logActivity({
          eventType: `auth_${event}`,
          eventCategory: 'authentication',
          eventData: {
            userId: session?.user?.id,
            email: session?.user?.email,
            event
          }
        });

        if (event === 'SIGNED_IN' && session?.user) {
          // Initialize session security for new sign in
          await sessionSecurity.initializeSession(session.user.id);
          
          loggingService.logActivity({
            eventType: 'user_signed_in',
            eventCategory: 'authentication',
            eventData: {
              userId: session.user.id,
              email: session.user.email,
              provider: session.user.app_metadata?.provider || 'email'
            }
          });
        }

        if (event === 'SIGNED_OUT') {
          // Get user ID before session is cleared
          const userId = session?.user?.id;
          
          loggingService.logActivity({
            eventType: 'user_signed_out',
            eventCategory: 'authentication',
            eventData: {
              timestamp: new Date().toISOString()
            }
          });
          
          // Terminate session security
          if (userId) {
            await sessionSecurity.terminateSession(userId);
          }
          
          // Reset logging service session
          loggingService.resetSession();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, userData?: any) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData
        }
      });

      if (error) {
        loggingService.logError({
          errorType: 'auth_signup_error',
          errorMessage: error.message,
          component: 'AuthProvider.signUp',
          additionalData: { email },
          severity: 'medium'
        });
      } else if (data.user) {
        loggingService.logActivity({
          eventType: 'user_signup_attempt',
          eventCategory: 'authentication',
          eventData: {
            email,
            userId: data.user.id,
            needsConfirmation: !data.session
          }
        });
      }

      return { error };
    } catch (error) {
      const authError = error as AuthError;
      loggingService.logError({
        errorType: 'auth_signup_exception',
        errorMessage: authError.message,
        component: 'AuthProvider.signUp',
        severity: 'high'
      });
      return { error: authError };
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        loggingService.logError({
          errorType: 'auth_signin_error',
          errorMessage: error.message,
          component: 'AuthProvider.signIn',
          additionalData: { email },
          severity: 'medium'
        });
      } else if (data.user) {
        loggingService.logActivity({
          eventType: 'user_signin_success',
          eventCategory: 'authentication',
          eventData: {
            userId: data.user.id,
            email: data.user.email
          }
        });
      }

      return { error };
    } catch (error) {
      const authError = error as AuthError;
      loggingService.logError({
        errorType: 'auth_signin_exception',
        errorMessage: authError.message,
        component: 'AuthProvider.signIn',
        severity: 'high'
      });
      return { error: authError };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      
      const currentUserId = user?.id;
      
      const { error } = await supabase.auth.signOut();

      if (error) {
        loggingService.logError({
          errorType: 'auth_signout_error',
          errorMessage: error.message,
          component: 'AuthProvider.signOut',
          severity: 'medium'
        });
      } else {
        loggingService.logActivity({
          eventType: 'user_signout_success',
          eventCategory: 'authentication',
          eventData: {
            userId: currentUserId
          }
        });
      }

      return { error };
    } catch (error) {
      const authError = error as AuthError;
      loggingService.logError({
        errorType: 'auth_signout_exception',
        errorMessage: authError.message,
        component: 'AuthProvider.signOut',
        severity: 'high'
      });
      return { error: authError };
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) {
        loggingService.logError({
          errorType: 'auth_reset_password_error',
          errorMessage: error.message,
          component: 'AuthProvider.resetPassword',
          additionalData: { email },
          severity: 'medium'
        });
      } else {
        loggingService.logActivity({
          eventType: 'password_reset_requested',
          eventCategory: 'authentication',
          eventData: { email }
        });
      }

      return { error };
    } catch (error) {
      const authError = error as AuthError;
      loggingService.logError({
        errorType: 'auth_reset_password_exception',
        errorMessage: authError.message,
        component: 'AuthProvider.resetPassword',
        severity: 'high'
      });
      return { error: authError };
    }
  };

  const updateProfile = async (updates: any) => {
    try {
      const { error } = await supabase.auth.updateUser(updates);

      if (error) {
        loggingService.logError({
          errorType: 'auth_update_profile_error',
          errorMessage: error.message,
          component: 'AuthProvider.updateProfile',
          severity: 'medium'
        });
      } else {
        loggingService.logActivity({
          eventType: 'user_profile_updated',
          eventCategory: 'authentication',
          eventData: {
            userId: user?.id,
            updatedFields: Object.keys(updates)
          }
        });
      }

      return { error };
    } catch (error) {
      const authError = error as AuthError;
      loggingService.logError({
        errorType: 'auth_update_profile_exception',
        errorMessage: authError.message,
        component: 'AuthProvider.updateProfile',
        severity: 'high'
      });
      return { error: authError };
    }
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updateProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};