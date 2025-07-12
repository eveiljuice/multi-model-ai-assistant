import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Settings, History, BarChart3 } from 'lucide-react';
import { aiService } from '../services/aiService';
import { ConversationMessage, AIResponse } from '../types/ai';
import QueryInput from './QueryInput';
import ResponseDisplay from './ResponseDisplay';
import ConversationHistory from './ConversationHistory';
import RateLimitStatus from './RateLimitStatus';

const AIAssistant: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [currentResponses, setCurrentResponses] = useState<AIResponse[]>([]);
  const [currentSynthesized, setCurrentSynthesized] = useState<any>(null);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [rateLimitStatus, setRateLimitStatus] = useState<Record<string, any>>({});
  const [activeSubTab, setActiveSubTab] = useState<'chat' | 'history' | 'status'>('chat');

  useEffect(() => {
    // Update rate limit status periodically
    const interval = setInterval(() => {
      setRateLimitStatus(aiService.getRateLimitStatus());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleQuery = async (query: string) => {
    setIsLoading(true);
    setCurrentResponses([]);
    setCurrentSynthesized(null);

    // Add user message to history
    const userMessage: ConversationMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: query,
      timestamp: new Date()
    };

    setConversationHistory(prev => [...prev, userMessage]);

    try {
      const result = await aiService.processQuery(query, conversationHistory);
      
      setCurrentResponses(result.responses);
      setCurrentSynthesized(result.synthesized);

      // Add assistant response to history
      const assistantMessage: ConversationMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.synthesized.finalAnswer,
        timestamp: new Date(),
        responses: result.responses,
        synthesized: result.synthesized
      };

      setConversationHistory(prev => [...prev, assistantMessage]);
      
    } catch (error) {
      console.error('Query failed:', error);
      // Handle error state
      setCurrentResponses([]);
      setCurrentSynthesized({
        finalAnswer: 'I apologize, but I encountered an error processing your request. Please try again.',
        sources: [],
        confidence: 0,
        reasoning: 'Error occurred during processing',
        citations: []
      });
    } finally {
      setIsLoading(false);
      setRateLimitStatus(aiService.getRateLimitStatus());
    }
  };

  const clearHistory = () => {
    setConversationHistory([]);
    setCurrentResponses([]);
    setCurrentSynthesized(null);
  };

  const subTabs = [
    { id: 'chat', label: 'Chat', icon: Brain },
    { id: 'history', label: 'History', icon: History },
    { id: 'status', label: 'Status', icon: BarChart3 }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sub-navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Brain className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Multi-Model AI Assistant</h2>
                <p className="text-xs text-gray-500">Powered by OpenAI, Anthropic & Google Gemini</p>
              </div>
            </div>

            <nav className="flex space-x-1">
              {subTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveSubTab(tab.id as any)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeSubTab === tab.id
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          {activeSubTab === 'chat' && (
            <motion.div
              key="chat"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Welcome Message */}
              {conversationHistory.length === 0 && !isLoading && !currentSynthesized && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Brain className="h-8 w-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    Welcome to Multi-Model AI Assistant
                  </h2>
                  <p className="text-gray-600 max-w-2xl mx-auto mb-8">
                    Get comprehensive answers by leveraging multiple AI models simultaneously. 
                    Each query is processed through OpenAI GPT-4, Anthropic Claude, and Google Gemini 
                    to provide you with the most accurate and complete responses.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                    {[
                      {
                        title: 'Parallel Processing',
                        description: 'Queries multiple AI models simultaneously for comprehensive answers',
                        icon: '⚡'
                      },
                      {
                        title: 'Response Synthesis',
                        description: 'Combines and analyzes responses to provide the best answer',
                        icon: '🧠'
                      },
                      {
                        title: 'Source Attribution',
                        description: 'Shows which AI models contributed to each response',
                        icon: '📊'
                      }
                    ].map((feature, index) => (
                      <div key={index} className="bg-white rounded-lg p-6 border border-gray-200">
                        <div className="text-3xl mb-3">{feature.icon}</div>
                        <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
                        <p className="text-sm text-gray-600">{feature.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Response Display */}
              {(isLoading || currentSynthesized) && (
                <ResponseDisplay
                  responses={currentResponses}
                  synthesized={currentSynthesized}
                  isLoading={isLoading}
                />
              )}
            </motion.div>
          )}

          {activeSubTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <ConversationHistory
                messages={conversationHistory}
                onClearHistory={clearHistory}
              />
            </motion.div>
          )}

          {activeSubTab === 'status' && (
            <motion.div
              key="status"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <RateLimitStatus status={rateLimitStatus} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Query Input - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
        <QueryInput
          onSubmit={handleQuery}
          isLoading={isLoading}
          placeholder="Ask me anything... I'll consult multiple AI models for the best answer."
        />
      </div>

      {/* Bottom padding to account for fixed input */}
      <div className="h-32"></div>
    </div>
  );
};

export default AIAssistant;