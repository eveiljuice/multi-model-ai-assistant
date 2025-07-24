import React, { useState } from 'react';
import DirectAIService from '../services/directAiService';
import { Zap, AlertCircle, CheckCircle } from 'lucide-react';

const DirectAPITest: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [directAiService] = useState(() => new DirectAIService());

  const testDirectAPI = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await directAiService.processQuery(
        "Привет! Расскажи кратко о себе и какие у тебя возможности.",
        'claude',
        [],
        "Ты полезный AI-ассистент. Отвечай кратко и по делу на русском языке."
      );

      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setIsLoading(false);
    }
  };

  const testClaudeAPI = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await directAiService.processQuery(
        "Что такое искусственный интеллект? Дай краткий ответ.",
        'claude',
        [],
        "Ты полезный AI-ассистент. Отвечай кратко и по делу на русском языке."
      );

      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setIsLoading(false);
    }
  };

  const testGeminiAPI = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await directAiService.processQuery(
        "Расскажи о возможностях Gemini AI. Кратко.",
        'gemini',
        [],
        "Ты полезный AI-ассистент. Отвечай кратко и по делу на русском языке."
      );

      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="flex items-center space-x-3 mb-6">
        <Zap className="h-6 w-6 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-900">Direct API Test</h2>
      </div>
      
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-medium text-gray-900 mb-2">
          Direct API (Edge Functions)
        </h3>
        <p className="text-sm text-gray-600">
          Доступные провайдеры: {directAiService.getAvailableProviders().join(', ')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <button
          onClick={testDirectAPI}
          disabled={isLoading}
          className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Zap className="h-4 w-4" />
          <span>{isLoading ? 'Тестирую...' : 'Тест Claude'}</span>
        </button>
        
        <button
          onClick={testClaudeAPI}
          disabled={isLoading}
          className="flex items-center justify-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Zap className="h-4 w-4" />
          <span>{isLoading ? 'Тестирую...' : 'Тест Claude Direct'}</span>
        </button>
        
        <button
          onClick={testGeminiAPI}
          disabled={isLoading}
          className="flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Zap className="h-4 w-4" />
          <span>{isLoading ? 'Тестирую...' : 'Тест Gemini'}</span>
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <span className="text-red-700 font-medium">Ошибка:</span>
          </div>
          <p className="text-red-600 mt-1">{error}</p>
        </div>
      )}

      {result && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-2 mb-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-green-700 font-medium">Результат:</span>
          </div>
          <div className="space-y-2">
            <div className="text-sm text-gray-600">
              <strong>Провайдер:</strong> {result.provider} | <strong>Модель:</strong> {result.model}
            </div>
            <div className="text-sm text-gray-600">
              <strong>Токены:</strong> {result.tokens} | <strong>Время:</strong> {result.responseTime}ms
            </div>
            <div className="bg-white p-3 rounded border">
              <p className="text-gray-900">{result.content}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DirectAPITest; 