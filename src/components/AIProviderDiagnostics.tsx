import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Clock, RefreshCw, Settings, Wifi, WifiOff } from 'lucide-react';
import { aiService } from '../services/aiService';
import DirectAIService from '../services/directAiService';
import { supabase } from '../services/supabaseClient';

interface ProviderStatus {
  name: string;
  available: boolean;
  lastError?: string;
  responseTime?: number;
  rateLimit?: {
    current: number;
    limit: number;
    remaining: number;
  };
}

interface APIKeyStatus {
  provider: string;
  configured: boolean;
  keyPrefix?: string;
  error?: string;
}

interface ConnectionTestResult {
  provider: string;
  success: boolean;
  error?: string;
  responseTime?: number;
}

const AIProviderDiagnostics: React.FC = () => {
  const [providerStatuses, setProviderStatuses] = useState<ProviderStatus[]>([]);
  const [apiKeyStatuses, setApiKeyStatuses] = useState<APIKeyStatus[]>([]);
  const [connectionTests, setConnectionTests] = useState<ConnectionTestResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const directAiService = new DirectAIService();

  const checkProviderStatuses = async () => {
    try {
      const statuses = aiService.getProviderStatus();
      const rateLimits = aiService.getRateLimitStatus();
      
      const providerData: ProviderStatus[] = Object.entries(statuses).map(([provider, status]) => ({
        name: provider,
        available: status.available,
        lastError: status.lastError,
        rateLimit: rateLimits[provider]?.requests
      }));
      
      setProviderStatuses(providerData);
    } catch (error) {
      console.error('Failed to check provider statuses:', error);
    }
  };

  const checkAPIKeys = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-keys-check`);
      const data = await response.json();
      
      if (response.ok && data.api_keys) {
        setApiKeyStatuses(data.api_keys);
      }
    } catch (error) {
      console.error('Failed to check API keys:', error);
    }
  };

  const testConnections = async () => {
    setIsLoading(true);
    const results: ConnectionTestResult[] = [];
    
    try {
      // Test Claude
      const claudeResult = await directAiService.testConnection('claude');
      results.push({
        provider: 'claude',
        success: claudeResult.success,
        error: claudeResult.error,
        responseTime: claudeResult.responseTime
      });

      // Test Gemini
      const geminiResult = await directAiService.testConnection('gemini');
      results.push({
        provider: 'gemini',
        success: geminiResult.success,
        error: geminiResult.error,
        responseTime: geminiResult.responseTime
      });

      setConnectionTests(results);
    } catch (error) {
      console.error('Failed to test connections:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const runFullDiagnostics = async () => {
    setIsLoading(true);
    await Promise.all([
      checkProviderStatuses(),
      checkAPIKeys(),
      testConnections()
    ]);
    setLastUpdate(new Date());
    setIsLoading(false);
  };

  useEffect(() => {
    runFullDiagnostics();
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(runFullDiagnostics, 30000); // 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const getStatusIcon = (available: boolean, success?: boolean) => {
    if (success === true || available === true) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    } else if (success === false || available === false) {
      return <AlertCircle className="h-5 w-5 text-red-500" />;
    } else {
      return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (available: boolean, success?: boolean) => {
    if (success === true || available === true) {
      return 'bg-green-50 border-green-200';
    } else if (success === false || available === false) {
      return 'bg-red-50 border-red-200';
    } else {
      return 'bg-yellow-50 border-yellow-200';
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Provider Diagnostics</h1>
            <p className="text-gray-600 mt-1">Monitor and diagnose AI provider connections</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600">Auto-refresh:</label>
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  autoRefresh ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    autoRefresh ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            
            <button
              onClick={runFullDiagnostics}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Running...' : 'Run Diagnostics'}
            </button>
          </div>
        </div>
        
        {lastUpdate && (
          <p className="text-sm text-gray-500 mt-2">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </p>
        )}
      </div>

      {/* API Keys Status */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Settings className="h-5 w-5 mr-2" />
          API Keys Configuration
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {apiKeyStatuses.map((status) => (
            <div
              key={status.provider}
              className={`p-4 rounded-lg border ${getStatusColor(status.configured)}`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900 capitalize">{status.provider}</h3>
                {getStatusIcon(status.configured)}
              </div>
              
              {status.configured ? (
                <div className="mt-2">
                  <p className="text-sm text-green-700">✓ Configured</p>
                  {status.keyPrefix && (
                    <p className="text-xs text-gray-600 mt-1">Key: {status.keyPrefix}</p>
                  )}
                </div>
              ) : (
                <div className="mt-2">
                  <p className="text-sm text-red-700">✗ Not configured</p>
                  {status.error && (
                    <p className="text-xs text-red-600 mt-1">{status.error}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Provider Status */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Wifi className="h-5 w-5 mr-2" />
          Provider Status
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {providerStatuses.map((status) => (
            <div
              key={status.name}
              className={`p-4 rounded-lg border ${getStatusColor(status.available)}`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900 capitalize">{status.name}</h3>
                {getStatusIcon(status.available)}
              </div>
              
              <div className="mt-2">
                <p className={`text-sm ${status.available ? 'text-green-700' : 'text-red-700'}`}>
                  {status.available ? '✓ Available' : '✗ Unavailable'}
                </p>
                
                {status.lastError && (
                  <p className="text-xs text-red-600 mt-1">{status.lastError}</p>
                )}
                
                {status.rateLimit && (
                  <div className="mt-2 text-xs text-gray-600">
                    <p>Rate limit: {status.rateLimit.current}/{status.rateLimit.limit}</p>
                    <p>Remaining: {status.rateLimit.remaining}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Connection Tests */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <WifiOff className="h-5 w-5 mr-2" />
          Connection Tests
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {connectionTests.map((test) => (
            <div
              key={test.provider}
              className={`p-4 rounded-lg border ${getStatusColor(test.success, test.success)}`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900 capitalize">{test.provider}</h3>
                {getStatusIcon(test.success, test.success)}
              </div>
              
              <div className="mt-2">
                <p className={`text-sm ${test.success ? 'text-green-700' : 'text-red-700'}`}>
                  {test.success ? '✓ Connection successful' : '✗ Connection failed'}
                </p>
                
                {test.responseTime && (
                  <p className="text-xs text-gray-600 mt-1">
                    Response time: {test.responseTime}ms
                  </p>
                )}
                
                {test.error && (
                  <p className="text-xs text-red-600 mt-1">{test.error}</p>
                )}
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 text-center">
          <button
            onClick={testConnections}
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Test Connections
          </button>
        </div>
      </div>

      {/* Troubleshooting Guide */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-blue-900 mb-4">Troubleshooting Guide</h2>
        
        <div className="space-y-3 text-sm text-blue-800">
          <div>
            <strong>If API keys are not configured:</strong>
            <ul className="list-disc list-inside ml-4 mt-1">
              <li>Set API keys in Supabase Dashboard → Settings → Edge Functions → Environment Variables</li>
              <li>Required keys: OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY</li>
              <li>Restart edge functions after setting keys</li>
            </ul>
          </div>
          
          <div>
            <strong>If connections are failing:</strong>
            <ul className="list-disc list-inside ml-4 mt-1">
              <li>Check if you're authenticated (login required)</li>
              <li>Verify API keys are valid and have sufficient quota</li>
              <li>Check rate limits and wait if exceeded</li>
              <li>Contact support if issues persist</li>
            </ul>
          </div>
          
          <div>
            <strong>If providers are unavailable:</strong>
            <ul className="list-disc list-inside ml-4 mt-1">
              <li>Wait a few minutes and try again (temporary outages)</li>
              <li>Check provider status pages for known issues</li>
              <li>Clear browser cache and refresh the page</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIProviderDiagnostics; 