import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCredits } from '../../contexts/CreditContext';
import { useAuth } from '../../contexts/AuthContext';

const CreditRedirectHandler: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasCredits, loading } = useCredits();

  useEffect(() => {
    if (!loading && user && hasCredits) {
      // Check if there's a saved redirect destination
      const savedRedirect = sessionStorage.getItem('creditGateRedirect');
      
      if (savedRedirect) {
        // Clear the saved redirect
        sessionStorage.removeItem('creditGateRedirect');
        
        // Redirect to the original destination
        navigate(savedRedirect, { replace: true });
      }
      // Убрали автоматический редирект на главную - пользователь может оставаться на pricing
    }
  }, [loading, user, hasCredits, navigate]);

  // This component doesn't render anything, it's just for handling redirects
  return null;
};

export default CreditRedirectHandler; 