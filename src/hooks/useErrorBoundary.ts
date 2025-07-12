import { useEffect } from 'react';
import { loggingService } from '../services/loggingService';

export const useErrorBoundary = () => {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      loggingService.logError({
        errorType: 'javascript_error',
        errorMessage: event.message,
        errorStack: event.error?.stack,
        component: 'global',
        url: event.filename,
        additionalData: {
          lineno: event.lineno,
          colno: event.colno
        },
        severity: 'high'
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      loggingService.logError({
        errorType: 'unhandled_promise_rejection',
        errorMessage: event.reason?.message || 'Unhandled promise rejection',
        errorStack: event.reason?.stack,
        component: 'global',
        additionalData: {
          reason: event.reason
        },
        severity: 'high'
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);
};