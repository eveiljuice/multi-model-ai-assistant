import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../LoadingSpinner';
import CreditGate from './CreditGate';

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireAuth?: boolean;
  requireCredits?: boolean;
  requiredCredits?: number;
  allowZeroCredits?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  fallback,
  requireAuth = true,
  requireCredits = false,
  requiredCredits = 1,
  allowZeroCredits = false
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (requireAuth && !user) {
    return fallback || (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-xl">AC</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600 mb-6">Please sign in to access this feature.</p>
        </div>
      </div>
    );
  }

  // Wrap with credit gate if credits are required
  if (requireCredits && user) {
    return (
      <CreditGate 
        requiredCredits={requiredCredits}
        allowZeroCredits={allowZeroCredits}
      >
        {children}
      </CreditGate>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;