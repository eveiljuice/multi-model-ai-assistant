import React, { useState } from 'react';
import { Play, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import DirectAIService from '../services/directAiService';
import { useAuth } from '../contexts/AuthContext';

interface TestResult {
  provider: string;
  status: 'idle' | 'testing' | 'success' | 'error';
  message?: string;
  responseTime?: number;
  error?: string;
}

const AITestPanel: React.FC = () => {
  const { user } = useAuth();
  const [testResults, setTestResults] = useState<TestResult[]>([
    { provider: 'claude', status: 'idle' },
    { provider: 'gemini', status: 'idle' }
  ]);
  const [isTestingAll, setIsTestingAll] = useState(false);
  const [testMessage, setTestMessage] = useState('Hello! This is a test message. Please respond briefly.');

  const directAiService = new DirectAIService();

  const updateTestResult = (provider: string, updates: Partial<TestResult>) => {
    setTestResults(prev => prev.map(result => 
      result.provider === provider 
        ? { ...result, ...updates }
        : result
    ));
  };

  const testSingleProvider = async (provider: 'claude' | 'gemini') => {
    if (!user) {
      updateTestResult(provider, { 
        status: 'error', 
        error: 'Please login to test AI providers' 
      });
      return;
    }

    updateTestResult(provider, { status: 'testing', error: undefined });
    const startTime = Date.now();

    try {
      const response = await directAiService.processQuery(
        testMessage,
        provider,
        [],
        'You are a helpful assistant. Respond briefly to confirm you are working.',
        'test-panel'
      );

      const responseTime = Date.now() - startTime;

      updateTestResult(provider, {
        status: 'success',
        message: response.content.substring(0, 100) + (response.content.length > 100 ? '...' : ''),
        responseTime
      });
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      updateTestResult(provider, {
        status: 'error',
        error: errorMessage,
        responseTime
      });
    }
  };

  const testAllProviders = async () => {
    if (!user) {
      alert('Please login to test AI providers');
      return;
    }

    setIsTestingAll(true);
    
    // Reset all results
    setTestResults(prev => prev.map(result => ({ 
      ...result, 
      status: 'idle' as const,
      message: undefined,
      error: undefined,
      responseTime: undefined
    })));

    // Test providers sequentially to avoid overwhelming the system
    for (const result of testResults) {
      await testSingleProvider(result.provider as 'claude' | 'gemini');
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    setIsTestingAll(false);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'testing':
        return <Clock className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'testing':
        return 'border-blue-200 bg-blue-50';
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  if (!user) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
          <p className="text-yellow-800">Please login to test AI providers</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">AI Provider Test Panel</h3>
          <p className="text-sm text-gray-600">Test AI providers directly from the interface</p>
        </div>
        
        <button
          onClick={testAllProviders}
          disabled={isTestingAll}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          <Play className={`h-4 w-4 mr-2 ${isTestingAll ? 'animate-pulse' : ''}`} />
          {isTestingAll ? 'Testing...' : 'Test All'}
        </button>
      </div>

      {/* Test Message Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Test Message
        </label>
        <textarea
          value={testMessage}
          onChange={(e) => setTestMessage(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          rows={2}
          placeholder="Enter a test message..."
        />
      </div>

      {/* Test Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {testResults.map((result) => (
          <div
            key={result.provider}
            className={`p-4 rounded-lg border ${getStatusColor(result.status)}`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <h4 className="font-medium text-gray-900 capitalize mr-2">
                  {result.provider}
                </h4>
                {getStatusIcon(result.status)}
              </div>
              
              <button
                onClick={() => testSingleProvider(result.provider as 'claude' | 'gemini')}
                disabled={result.status === 'testing' || isTestingAll}
                className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-100 rounded-full hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                Test
              </button>
            </div>

            {/* Status Display */}
            <div className="text-sm">
              {result.status === 'idle' && (
                <p className="text-gray-500">Ready to test</p>
              )}
              
              {result.status === 'testing' && (
                <p className="text-blue-600">Testing connection...</p>
              )}
              
              {result.status === 'success' && (
                <div>
                  <p className="text-green-600 font-medium mb-1">✓ Success</p>
                  {result.responseTime && (
                    <p className="text-gray-500 text-xs mb-2">
                      Response time: {result.responseTime}ms
                    </p>
                  )}
                  {result.message && (
                    <div className="bg-white p-2 rounded border text-gray-700 text-xs">
                      {result.message}
                    </div>
                  )}
                </div>
              )}
              
              {result.status === 'error' && (
                <div>
                  <p className="text-red-600 font-medium mb-1">✗ Error</p>
                  {result.responseTime && (
                    <p className="text-gray-500 text-xs mb-2">
                      Failed after: {result.responseTime}ms
                    </p>
                  )}
                  {result.error && (
                    <div className="bg-red-100 p-2 rounded border border-red-200 text-red-700 text-xs">
                      {result.error}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Instructions */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">How to use:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Enter a test message above</li>
          <li>• Click "Test All" to test all providers or "Test" for individual providers</li>
          <li>• Green = Success, Red = Error, Blue = Testing</li>
          <li>• Check response times and error messages for troubleshooting</li>
        </ul>
      </div>
    </div>
  );
};

export default AITestPanel; 