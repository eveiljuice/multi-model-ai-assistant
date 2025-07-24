import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Download,
  Copy,
  Star,
  MoreHorizontal,
  X,
  MessageSquare,
  Settings,
  FileText,
  Share2,
  Loader2
} from 'lucide-react';
import { Agent, ChatMessage, AIModel, ChatSession } from '../types';
import { agentService } from '../services/agentService';
import { exportConversation } from '../utils/api';
import { copyToClipboard, generateId } from '../utils';
import { loggingService } from '../services/loggingService';
import MessageBubble from './MessageBubble';
import ActionButtons from './ActionButtons';

interface ChatInterfaceProps {
  selectedAgent: Agent | null;
  isOpen: boolean;
  onClose: () => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  selectedAgent,
  isOpen,
  onClose
}) => {
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedModel, setSelectedModel] = useState<AIModel>('gpt-4.1-turbo');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [choiceHistory, setChoiceHistory] = useState<Array<{messageId: string, choice: string, index: number}>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectedAgent && (!currentSession || currentSession.agentId !== selectedAgent.id)) {
      const newSession: ChatSession = {
        id: generateId(),
        agentId: selectedAgent.id,
        messages: [],
        model: selectedModel,
        startedAt: new Date(),
        lastActivity: new Date()
      };
      setCurrentSession(newSession);
      setChoiceHistory([]);
      
      // Log new chat session
      loggingService.logActivity({
        eventType: 'chat_session_started',
        eventCategory: 'communication',
        eventData: {
          agentId: selectedAgent.id,
          agentName: selectedAgent.name,
          sessionId: newSession.id
        }
      });
    }
  }, [selectedAgent, selectedModel]);

  useEffect(() => {
    scrollToBottom();
  }, [currentSession?.messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleChoiceSelect = async (choice: string, index: number, messageId?: string) => {
    if (!selectedAgent || !currentSession || isTyping) return;

    // Log choice selection
    loggingService.logUserAction('choice_selected', 'chat_interface', {
      choice,
      index,
      messageId,
      agentId: selectedAgent.id,
      sessionId: currentSession.id
    });

    // Add choice to history
    if (messageId) {
      setChoiceHistory(prev => [...prev, { messageId, choice, index }]);
    }

    // Create user message with the selected choice
    const userMessage: ChatMessage = {
      id: generateId(),
      content: `[Выбор ${index + 1}] ${choice}`,
      timestamp: new Date(),
      sender: 'user'
    };

    setCurrentSession(prev => prev ? {
      ...prev,
      messages: [...prev.messages, userMessage],
      lastActivity: new Date()
    } : null);

    setIsTyping(true);

    try {
      // Generate agent response based on the choice
      const contextMessage = `Пользователь выбрал вариант ${index + 1}: "${choice}". Продолжите диалог, предоставив подробный ответ и при необходимости новые варианты выбора в формате [Вариант 1], [Вариант 2], [Вариант 3].`;
      
      const agentResponse = await agentService.generateAgentResponse(
        contextMessage,
        selectedAgent,
        currentSession.messages,
        undefined, // userId
        false, // skipCreditDeduction
        currentSession.id // sessionId
      );
      
      setCurrentSession(prev => prev ? {
        ...prev,
        messages: [...prev.messages, agentResponse],
        lastActivity: new Date()
      } : null);

      // Log successful agent response
      loggingService.logActivity({
        eventType: 'choice_response_received',
        eventCategory: 'communication',
        eventData: {
          agentId: selectedAgent.id,
          choiceIndex: index,
          responseLength: agentResponse.content.length,
          sessionId: currentSession.id
        }
      });
      
    } catch (error) {
      console.error('Failed to process choice:', error);
      
      // Log error
      loggingService.logError({
        errorType: 'choice_response_error',
        errorMessage: error instanceof Error ? error.message : 'Failed to process choice',
        errorStack: error instanceof Error ? error.stack : undefined,
        component: 'ChatInterface.handleChoiceSelect',
        additionalData: {
          agentId: selectedAgent.id,
          choice,
          index,
          sessionId: currentSession.id
        },
        severity: 'medium'
      });
      
      // Add error message
      const errorMessage: ChatMessage = {
        id: generateId(),
        content: `## Техническая проблема

Возникла проблема при обработке вашего выбора. Пожалуйста, попробуйте еще раз.

**Если проблема повторяется:**
- Обновите страницу
- Попробуйте другой вариант
- Напишите сообщение вручную

Извините за неудобства! 🔧`,
        timestamp: new Date(),
        sender: 'agent',
        agentId: selectedAgent.id
      };
      
      setCurrentSession(prev => prev ? {
        ...prev,
        messages: [...prev.messages, errorMessage],
        lastActivity: new Date()
      } : null);
    } finally {
      setIsTyping(false);
    }
  };

  const sendUserMessage = async () => {
    if (!inputMessage.trim() || !selectedAgent || !currentSession || isTyping) return;

    const messageStartTime = Date.now();
    const userMessage: ChatMessage = {
      id: generateId(),
      content: inputMessage,
      timestamp: new Date(),
      sender: 'user'
    };

    // Log user message
    loggingService.logChatMessage(selectedAgent.id, inputMessage.length);
    loggingService.logUserAction('message_sent', 'chat_interface', {
      agentId: selectedAgent.id,
      messageLength: inputMessage.length,
      sessionId: currentSession.id
    });

    setCurrentSession(prev => prev ? {
      ...prev,
      messages: [...prev.messages, userMessage],
      lastActivity: new Date()
    } : null);

    setInputMessage('');
    setIsTyping(true);

    try {
      // Use the agent service to generate AI-powered response
      const agentResponse = await agentService.generateAgentResponse(
        inputMessage,
        selectedAgent,
        currentSession.messages,
        undefined, // userId
        false, // skipCreditDeduction
        currentSession.id // sessionId
      );
      
      const responseTime = Date.now() - messageStartTime;
      
      setCurrentSession(prev => prev ? {
        ...prev,
        messages: [...prev.messages, agentResponse],
        lastActivity: new Date()
      } : null);

      // Log successful agent response
      loggingService.logActivity({
        eventType: 'agent_response_received',
        eventCategory: 'communication',
        eventData: {
          agentId: selectedAgent.id,
          responseTime,
          responseLength: agentResponse.content.length,
          sessionId: currentSession.id
        }
      });
      
    } catch (error) {
      console.error('Failed to send message:', error);
      
      // Log error
      loggingService.logError({
        errorType: 'agent_response_error',
        errorMessage: error instanceof Error ? error.message : 'Failed to get agent response',
        errorStack: error instanceof Error ? error.stack : undefined,
        component: 'ChatInterface.sendUserMessage',
        additionalData: {
          agentId: selectedAgent.id,
          messageLength: inputMessage.length,
          sessionId: currentSession.id
        },
        severity: 'medium'
      });
      
      // Add error message
      const errorMessage: ChatMessage = {
        id: generateId(),
        content: `## Technical Difficulty

I'm experiencing some technical issues right now. Please try again in a moment.

**If the problem persists:**
- Check your internet connection
- Refresh the page
- Try a different question

I apologize for the inconvenience! 🔧`,
        timestamp: new Date(),
        sender: 'agent',
        agentId: selectedAgent.id
      };
      
      setCurrentSession(prev => prev ? {
        ...prev,
        messages: [...prev.messages, errorMessage],
        lastActivity: new Date()
      } : null);
    } finally {
      setIsTyping(false);
    }
  };

  const handleRateMessage = (messageId: string, rating: number) => {
    if (!currentSession) return;

    setCurrentSession(prev => prev ? {
      ...prev,
      messages: prev.messages.map(msg =>
        msg.id === messageId ? { ...msg, rating } : msg
      )
    } : null);

    // Log message rating
    loggingService.logUserAction('message_rated', 'chat_interface', {
      messageId,
      rating,
      agentId: selectedAgent?.id,
      sessionId: currentSession.id
    });
  };

  const handleExport = async (format: 'pdf' | 'txt' | 'md') => {
    if (!currentSession) return;

    try {
      loggingService.logUserAction('conversation_export_started', 'chat_interface', {
        format,
        messageCount: currentSession.messages.length,
        agentId: selectedAgent?.id
      });

      const content = await exportConversation(currentSession.messages, format, {
        includeMetadata: true,
        includeRatings: true
      });

      const blob = new Blob([content], {
        type: format === 'pdf' ? 'application/pdf' : 'text/plain'
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat-${selectedAgent?.name}-${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setShowExportMenu(false);

      // Log successful export
      loggingService.logFeatureUsage('conversation_export', {
        format,
        messageCount: currentSession.messages.length,
        agentId: selectedAgent?.id
      });
      
    } catch (error) {
      console.error('Export failed:', error);
      
      loggingService.logError({
        errorType: 'conversation_export_error',
        errorMessage: error instanceof Error ? error.message : 'Export failed',
        component: 'ChatInterface.handleExport',
        additionalData: {
          format,
          messageCount: currentSession.messages.length,
          agentId: selectedAgent?.id
        },
        severity: 'low'
      });
    }
  };

  const handleCopyConversation = async () => {
    if (!currentSession) return;

    const content = currentSession.messages
      .map(msg => `${msg.sender === 'user' ? 'You' : selectedAgent?.name}: ${msg.content}`)
      .join('\n\n');

    const success = await copyToClipboard(content);
    if (success) {
      loggingService.logUserAction('conversation_copied', 'chat_interface', {
        messageCount: currentSession.messages.length,
        agentId: selectedAgent?.id
      });
    }
  };

  const quickActions = [
    'Ask Question',
    'Solve Problem',
    'Analyze Data',
    'Generate Content',
    'Provide Feedback'
  ];

  const handleQuickAction = async (action: string) => {
    if (!selectedAgent) return;
    
    loggingService.logUserAction('quick_action_selected', 'chat_interface', {
      action,
      agentId: selectedAgent.id
    });
    
    const prompt = await agentService.generateQuickResponse(action, selectedAgent);
    setInputMessage(prompt);
    inputRef.current?.focus();
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      className="fixed right-0 top-0 h-full w-full md:w-[500px] bg-white border-l border-gray-200 shadow-xl z-50 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center space-x-3">
          {selectedAgent && (
            <>
              <div className="relative">
                <img
                  src={selectedAgent.avatar}
                  alt={selectedAgent.name}
                  className="w-10 h-10 rounded-full"
                />
                <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                  selectedAgent.isOnline ? 'bg-green-400' : 'bg-gray-400'
                }`} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{selectedAgent.name}</h3>
                <p className="text-sm text-gray-500">{selectedAgent.role}</p>
              </div>
            </>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
            
            <AnimatePresence>
              {showExportMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -5 }}
                  className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10"
                >
                  <button
                    onClick={handleCopyConversation}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Copy className="h-4 w-4 mr-3" />
                    Copy Conversation
                  </button>
                  <button
                    onClick={() => handleExport('txt')}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <FileText className="h-4 w-4 mr-3" />
                    Export as Text
                  </button>
                  <button
                    onClick={() => handleExport('md')}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Download className="h-4 w-4 mr-3" />
                    Export as Markdown
                  </button>
                  <button
                    onClick={() => {}}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Share2 className="h-4 w-4 mr-3" />
                    Share Conversation
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* AI Model Info */}
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600">
            Powered by AI • {selectedAgent?.name} uses personalized responses
          </span>
          {selectedAgent && (
            <span className="text-xs text-blue-600 font-medium">
              {selectedAgent.responseTime} response time
            </span>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {currentSession?.messages.length === 0 && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Start a conversation with {selectedAgent?.name}
            </h3>
            <p className="text-gray-500 mb-6 text-sm">
              {selectedAgent?.specialty}
            </p>
            <ActionButtons 
              actions={quickActions} 
              onAction={handleQuickAction}
              agent={selectedAgent}
            />
          </div>
        )}

        <AnimatePresence>
          {currentSession?.messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              agent={selectedAgent}
              onRate={(rating) => handleRateMessage(message.id, rating)}
              onChoiceSelect={(choice, index) => handleChoiceSelect(choice, index, message.id)}
            />
          ))}
        </AnimatePresence>

        {isTyping && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
          >
            <div className="flex items-center space-x-3">
              <img
                src={selectedAgent?.avatar}
                alt={selectedAgent?.name}
                className="w-8 h-8 rounded-full"
              />
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                <span className="text-sm text-gray-600">{selectedAgent?.name} is thinking...</span>
              </div>
            </div>
          </motion.div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="flex space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendUserMessage()}
            placeholder={`Message ${selectedAgent?.name}...`}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isTyping}
          />
          <button
            onClick={sendUserMessage}
            disabled={!inputMessage.trim() || isTyping}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
          >
            {isTyping ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default ChatInterface;