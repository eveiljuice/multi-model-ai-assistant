import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
  Copy,
  ThumbsUp,
  ThumbsDown,
  Share2,
  Download,
  Eye,
  EyeOff,
  Clock,
  Zap,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Wifi,
  WifiOff
} from 'lucide-react';
import { AIResponse, SynthesizedResponse } from '../types/ai';

interface ResponseDisplayProps {
  responses?: AIResponse[];
  synthesized?: SynthesizedResponse;
  isLoading?: boolean;
}

const ResponseDisplay: React.FC<ResponseDisplayProps> = ({
  responses = [],
  synthesized,
  isLoading = false
}) => {
  const [showAllResponses, setShowAllResponses] = useState(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const handleCopy = async (text: string, section: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-100';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getProviderIcon = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'openai':
        return '🤖';
      case 'anthropic':
        return '🧠';
      case 'google gemini':
        return '✨';
      default:
        return '🔮';
    }
  };

  const getProviderStatus = (response: AIResponse) => {
    if (!response) {
      return {
        icon: <AlertCircle className="h-4 w-4 text-gray-500" />,
        status: 'Unknown',
        color: 'text-gray-600 bg-gray-100'
      };
    }
    
    if (response.error) {
      return {
        icon: <WifiOff className="h-4 w-4 text-red-500" />,
        status: 'Error',
        color: 'text-red-600 bg-red-100'
      };
    }
    if (response.content && response.content.length > 0) {
      return {
        icon: <CheckCircle className="h-4 w-4 text-green-500" />,
        status: 'Success',
        color: 'text-green-600 bg-green-100'
      };
    }
    return {
      icon: <AlertCircle className="h-4 w-4 text-yellow-500" />,
      status: 'No Response',
      color: 'text-yellow-600 bg-yellow-100'
    };
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-gray-600">Processing your query across multiple AI models...</span>
          </div>
          
          <div className="space-y-4">
            {['OpenAI GPT-4', 'Anthropic Claude', 'Google Gemini'].map((provider, index) => (
              <motion.div
                key={provider}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.3 }}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-gray-600">Querying {provider}...</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Wifi className="h-4 w-4 text-blue-500 animate-pulse" />
                  <span className="text-xs text-gray-500">Connecting</span>
                </div>
              </motion.div>
            ))}
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center space-x-2 text-blue-700">
              <Zap className="h-4 w-4" />
              <span className="text-sm font-medium">AI models are analyzing your query...</span>
            </div>
            <p className="text-xs text-blue-600 mt-1">
              This may take a few seconds as we gather responses from multiple sources.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* No data fallback */}
      {!synthesized && (!responses || responses.length === 0) && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
          <div className="text-gray-500">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Response Available</h3>
            <p className="text-sm">Unable to generate response from AI providers.</p>
          </div>
        </div>
      )}
      {/* Synthesized Response */}
      {synthesized && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200"
        >
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Zap className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Synthesized Response</h3>
                  <p className="text-sm text-gray-500">{synthesized.reasoning || 'AI-generated response'}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${getConfidenceColor(synthesized.confidence || 0)}`}>
                  {((synthesized.confidence || 0) * 100).toFixed(1)}% confidence
                </div>
                
                <button
                  onClick={() => handleCopy(synthesized.content || '', 'synthesized')}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  {copiedSection === 'synthesized' ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown
                components={{
                  code({ node, inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    return !inline && match ? (
                      <SyntaxHighlighter
                        style={tomorrow}
                        language={match[1]}
                        PreTag="div"
                        {...props}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    ) : (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  }
                }}
              >
                {synthesized.content || 'No response available'}
              </ReactMarkdown>
            </div>

          {/* AI Model Sources */}
          {synthesized?.sources && synthesized.sources.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-700 mb-3">AI Model Sources:</h4>
              <div className="space-y-3">
                {synthesized.sources.map((source, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="text-sm font-medium text-gray-900">
                          {source.provider} ({source.model})
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {(source.confidence * 100).toFixed(1)}% confidence
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      {source.content}
                    </p>
                    <div className="text-xs text-gray-400 mt-1">
                      Tokens: {source.tokens || 0}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Summary Stats */}
              {synthesized.totalTokens && (
                <div className="mt-3 text-xs text-gray-500 flex items-center justify-between">
                  <span>Total tokens: {synthesized.totalTokens}</span>
                  <span>Models: {synthesized.providersUsed}</span>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 flex items-center justify-between pt-4 border-t border-gray-200">
            <div className="flex items-center space-x-2">
              <button className="flex items-center space-x-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100 transition-colors">
                <ThumbsUp className="h-4 w-4" />
                <span>Helpful</span>
              </button>
              <button className="flex items-center space-x-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100 transition-colors">
                <ThumbsDown className="h-4 w-4" />
                <span>Not helpful</span>
              </button>
            </div>
            
            <div className="flex items-center space-x-2">
              <button className="flex items-center space-x-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100 transition-colors">
                <Share2 className="h-4 w-4" />
                <span>Share</span>
              </button>
              <button className="flex items-center space-x-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100 transition-colors">
                <Download className="h-4 w-4" />
                <span>Export</span>
              </button>
            </div>
          </div>
        </div>
      </motion.div>
      )}

      {/* Provider Status Summary */}
      {responses && responses.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">AI Provider Status</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {responses.map((response, index) => {
              const status = getProviderStatus(response);
              return (
                <div key={`${response.provider}-${index}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                  <div className="flex items-center space-x-2">
                  <span className="text-lg">{getProviderIcon(response.provider || 'unknown')}</span>
                  <span className="text-sm font-medium text-gray-700">{response.provider || 'Unknown Provider'}</span>
                </div>
                  <div className="flex items-center space-x-2">
                    {status.icon}
                    <span className={`text-xs px-2 py-1 rounded-full ${status.color}`}>
                      {status.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Individual Responses Toggle */}
      {responses && responses.length > 0 && (
        <div className="flex items-center justify-center">
          <button
            onClick={() => setShowAllResponses(!showAllResponses)}
            className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            {showAllResponses ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            <span>{showAllResponses ? 'Hide' : 'Show'} individual responses</span>
          </button>
        </div>
      )}

      {/* Individual Responses */}
      <AnimatePresence>
        {showAllResponses && responses && responses.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            {responses.map((response, index) => (
              <motion.div
                key={`${response.provider}-${index}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-lg shadow-sm border border-gray-200"
              >
                <div className="p-6">
                  {/* Provider Header */}
                  <div className="flex items-center justify-between mb-4">
                                          <div className="flex items-center space-x-3">
                        <span className="text-2xl">{getProviderIcon(response.provider || 'unknown')}</span>
                        <div>
                          <h4 className="font-medium text-gray-900">{response.provider || 'Unknown Provider'}</h4>
                          <p className="text-sm text-gray-500">{response.model || 'Unknown Model'}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <Clock className="h-3 w-3" />
                          <span>{response.responseTime || 0}ms</span>
                        </div>
                        
                        {!response.error && (
                          <div className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(response.confidence || 0)}`}>
                            {((response.confidence || 0) * 100).toFixed(1)}%
                          </div>
                        )}

                        {response.error ? (
                          <div className="flex items-center space-x-1 text-red-500">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-xs">Error</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleCopy(response.content || '', `${response.provider || 'unknown'}-${index}`)}
                            className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100 transition-colors"
                          >
                            {copiedSection === `${response.provider || 'unknown'}-${index}` ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </button>
                        )}
                      </div>
                  </div>

                  {/* Content */}
                  {response.error ? (
                    <div className="flex items-start space-x-3 p-4 bg-red-50 rounded-lg">
                      <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                      <div>
                        <h5 className="text-sm font-medium text-red-800 mb-1">Connection Error</h5>
                        <p className="text-sm text-red-700">{response.error}</p>
                        <button className="flex items-center space-x-1 mt-2 text-xs text-red-600 hover:text-red-800">
                          <RefreshCw className="h-3 w-3" />
                          <span>Retry</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown
                        components={{
                          code({ node, inline, className, children, ...props }) {
                            const match = /language-(\w+)/.exec(className || '');
                            return !inline && match ? (
                              <SyntaxHighlighter
                                style={tomorrow}
                                language={match[1]}
                                PreTag="div"
                                {...props}
                              >
                                {String(children).replace(/\n$/, '')}
                              </SyntaxHighlighter>
                            ) : (
                              <code className={className} {...props}>
                                {children}
                              </code>
                            );
                          }
                        }}
                                              >
                          {response.content || 'No content available'}
                        </ReactMarkdown>
                      </div>
                    )}

                    {/* Metadata */}
                    {!response.error && (
                      <div className="mt-4 pt-3 border-t border-gray-200 text-xs text-gray-500">
                        <span>Tokens used: {(response.tokens || 0).toLocaleString()}</span>
                      </div>
                    )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ResponseDisplay;