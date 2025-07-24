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
  Loader2,
  Minimize2,
  Maximize2,
  Crown,
  AlertTriangle,
  CreditCard
} from 'lucide-react';
import { Agent, ChatMessage, AIModel, ChatSession } from '../types';
import { agentService } from '../services/agentService';
import { exportConversation } from '../utils/api';
import { copyToClipboard, generateId } from '../utils';
import { loggingService } from '../services/loggingService';
import { useAuth } from '../contexts/AuthContext';
import { useCredits } from '../contexts/CreditContext';
import { sanitizeInput } from '../utils/sanitization';
import MessageBubble from './MessageBubble';
import ActionButtons from './ActionButtons';
import PaywallModal from './credits/PaywallModal';
import AIModelSelector from './AIModelSelector';
import * as LucideIcons from 'lucide-react';

interface ChatWindowProps {
  selectedAgent: Agent | null;
  isOpen: boolean;
  onClose: () => void;
  onMinimize?: () => void;
}

type WindowState = 'normal' | 'minimized' | 'maximized';

const ChatWindow: React.FC<ChatWindowProps> = ({
  selectedAgent,
  isOpen,
  onClose,
  onMinimize
}) => {
  const { user } = useAuth();
  const { balance, checkCanUseAgent, refreshBalance, deductCredits, hasCredits, creditCount } = useCredits();
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedModel, setSelectedModel] = useState<AIModel>('gpt-4.1-turbo');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [windowState, setWindowState] = useState<WindowState>('normal');
  const [choiceHistory, setChoiceHistory] = useState<Array<{messageId: string, choice: string, index: number}>>([]);
  const [showPaywallModal, setShowPaywallModal] = useState(false);
  const [paywallRequiredCredits, setPaywallRequiredCredits] = useState(1);
  const [deductingCredits, setDeductingCredits] = useState(false);
  // Refs for DOM elements with improved null safety
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Input ref with enhanced focus management
  // Using null as initial value is correct for DOM element refs
  const inputRef = useRef<HTMLInputElement>(null);

  // Load chat history and selected model from localStorage
  useEffect(() => {
    if (selectedAgent && isOpen) {
      // Load saved model preference for this agent
      const savedModel = localStorage.getItem(`agent_model_${selectedAgent.id}`);
      if (savedModel && ['gpt-4.1-turbo', 'claude-sonnet-4-20250514', 'gemini-2.0-flash'].includes(savedModel)) {
        setSelectedModel(savedModel as AIModel);
      }

      const savedSession = localStorage.getItem(`chat_session_${selectedAgent.id}`);
      if (savedSession) {
        try {
          const parsedSession = JSON.parse(savedSession);
          // Convert timestamp strings back to Date objects
          parsedSession.messages = parsedSession.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }));
          parsedSession.startedAt = new Date(parsedSession.startedAt);
          parsedSession.lastActivity = new Date(parsedSession.lastActivity);
          
          // Update session model to current selected model
          parsedSession.model = savedModel || parsedSession.model || selectedModel;
          setCurrentSession(parsedSession);
        } catch (error) {
          console.error('Failed to load chat history:', error);
          createNewSession();
        }
      } else {
        createNewSession();
      }
    }
  }, [selectedAgent, isOpen]);

  // Save chat history to localStorage
  useEffect(() => {
    if (currentSession && selectedAgent) {
      localStorage.setItem(`chat_session_${selectedAgent.id}`, JSON.stringify(currentSession));
    }
  }, [currentSession, selectedAgent]);

  // Save selected model preference
  useEffect(() => {
    if (selectedAgent) {
      localStorage.setItem(`agent_model_${selectedAgent.id}`, selectedModel);
      
      // Update current session model
      if (currentSession) {
        setCurrentSession(prev => prev ? {
          ...prev,
          model: selectedModel
        } : null);
      }
    }
  }, [selectedModel, selectedAgent]);

  const createNewSession = () => {
    if (!selectedAgent) return;
    
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
        sessionId: newSession.id,
        selectedModel: selectedModel
      }
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentSession?.messages]);

  // Enhanced focus management with better conditions and error handling
  useEffect(() => {
    // Only attempt to focus if:
    // 1. Chat window is open
    // 2. Window is not minimized (user can't see input)  
    // 3. Input ref is available
    // 4. User has credits (input is enabled and usable)
    if (isOpen && 
        windowState !== 'minimized' && 
        inputRef.current && 
        !(user && (creditCount === null || creditCount < 1))) {
      
      try {
        // Use requestAnimationFrame to ensure DOM is ready
        // This prevents focus issues when component is still rendering
        requestAnimationFrame(() => {
          if (inputRef.current) {
            inputRef.current.focus();
          }
        });
      } catch (error) {
        // Gracefully handle any focus errors (e.g., input is no longer in DOM)
        console.warn('Failed to focus input:', error);
      }
    }
  }, [isOpen, windowState, user, creditCount]); // Added user and creditCount as dependencies

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Helper function for safe input focus
  // This can be called from event handlers when we need to manually focus input
  const focusInput = () => {
    // Only focus if input is available and enabled
    if (inputRef.current && 
        !(user && (creditCount === null || creditCount < 1))) {
      try {
        inputRef.current.focus();
      } catch (error) {
        console.warn('Failed to focus input programmatically:', error);
      }
    }
  };

  const handleMinimize = () => {
    if (onMinimize) {
      onMinimize();
      
      // Log minimize action
      loggingService.logUserAction('chat_minimized', 'chat_window', {
        agentId: selectedAgent?.id,
        sessionId: currentSession?.id
      });
    }
  };

  // New function to insert text into chat input
  const insertTextToInput = (text: string) => {
    setInputMessage(text);
    
    // Focus input after inserting text
    setTimeout(() => {
      focusInput();
    }, 50);
  };

  const handleChoiceSelect = async (choice: string, index: number, messageId?: string) => {
    if (!selectedAgent || !currentSession) return;

    // Log choice selection
    loggingService.logUserAction('choice_selected', 'chat_window', {
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

    // Insert choice text into input instead of sending immediately
    const choiceText = `[Choice ${index + 1}] ${choice}`;
    insertTextToInput(choiceText);
  };

  const sendUserMessage = async () => {
    if (!inputMessage.trim() || !selectedAgent || !currentSession || isTyping) return;

    // Sanitize user input
    const sanitizedMessage = sanitizeInput(inputMessage.trim());
    
    // Check if sanitized message is not empty
    if (sanitizedMessage.length === 0) {
      console.error('Your message contains invalid characters. Please revise your input.');
      return;
    }

    // CRITICAL: Check credits before processing message
    if (user) {
      const creditCheck = await checkCanUseAgent(selectedAgent.id);
      if (!creditCheck.canUse) {
        setPaywallRequiredCredits(creditCheck.required);
        setShowPaywallModal(true);
        return;
      }
    }

    const messageStartTime = Date.now();
    const userMessage: ChatMessage = {
      id: generateId(),
      content: sanitizedMessage,
      timestamp: new Date(),
      sender: 'user'
    };

    // Log user message
    loggingService.logChatMessage(selectedAgent.id, sanitizedMessage.length);
    loggingService.logUserAction('message_sent', 'chat_window', {
      agentId: selectedAgent.id,
      messageLength: sanitizedMessage.length,
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
      // CRITICAL: Deduct credits IMMEDIATELY when user clicks Send
      if (user) {
        setDeductingCredits(true);
        
        try {
          const deductionSuccess = await deductCredits(selectedAgent.id);
          setDeductingCredits(false);
          
          if (!deductionSuccess) {
            // If deduction fails, add error message to chat and stop processing
            console.error('Credit deduction failed for agent:', selectedAgent.id);
            
            const errorMessage: ChatMessage = {
              id: generateId(),
              content: `## Credit Deduction Failed 💳\n\nThere was an issue processing your credits for ${selectedAgent.name}. This could be due to:\n\n- Insufficient credit balance\n- Network connectivity issues\n- Temporary system maintenance\n\n**Please try:**\n1. Refreshing the page\n2. Checking your credit balance\n3. Contacting support if the issue persists\n\nYour message was not processed to avoid unexpected charges.`,
              timestamp: new Date(),
              sender: 'agent',
              agentId: selectedAgent.id
            };

            setCurrentSession(prev => prev ? {
              ...prev,
              messages: [...prev.messages, errorMessage],
              lastActivity: new Date()
            } : null);
            
            loggingService.logError({
              errorType: 'credit_deduction_failed_ui_detailed',
              errorMessage: 'Credit deduction failed at UI level with user feedback',
              component: 'ChatWindow.sendUserMessage',
              additionalData: { 
                agentId: selectedAgent.id,
                userId: user.id,
                sessionId: currentSession.id,
                messageLength: sanitizedMessage.length
              },
              severity: 'medium'
            });
            
            setIsTyping(false);
            return;
          }
        } catch (deductionError) {
          // Handle unexpected errors during credit deduction
          setDeductingCredits(false);
          
          console.error('Unexpected error during credit deduction:', deductionError);
          
          const errorMessage: ChatMessage = {
            id: generateId(),
            content: `## System Error 🔧\n\nAn unexpected error occurred while processing your request. Please try again in a few moments.\n\nIf this problem persists, please contact our support team.\n\n**Error Reference:** ${Date.now()}`,
            timestamp: new Date(),
            sender: 'agent',
            agentId: selectedAgent.id
          };

          setCurrentSession(prev => prev ? {
            ...prev,
            messages: [...prev.messages, errorMessage],
            lastActivity: new Date()
          } : null);
          
          loggingService.logError({
            errorType: 'credit_deduction_exception_ui',
            errorMessage: deductionError instanceof Error ? deductionError.message : 'Unexpected error during credit deduction',
            component: 'ChatWindow.sendUserMessage',
            additionalData: { 
              agentId: selectedAgent.id,
              userId: user.id,
              sessionId: currentSession.id,
              stackTrace: deductionError instanceof Error ? deductionError.stack : undefined
            },
            severity: 'high'
          });
          
          setIsTyping(false);
          return;
        }
      }

      // Use the agent service to generate AI-powered response
      const agentResponse = await agentService.generateAgentResponse(
        sanitizedMessage,
        selectedAgent,
        currentSession.messages,
        user?.id,
        true, // Skip credit deduction as we already deducted credits above
        currentSession.id, // Pass session ID for logging
        selectedModel // Use user-selected AI model
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
      console.error('Error sending message:', error);
      
      // Reset deducting state on error
      setDeductingCredits(false);
      
      // Log error
      loggingService.logError({
        errorType: 'message_send_error',
        errorMessage: error instanceof Error ? error.message : 'Failed to send message',
        component: 'ChatWindow.sendUserMessage',
        severity: 'medium'
      });

      // Add error message to chat
      const errorMessage: ChatMessage = {
        id: generateId(),
        content: 'I apologize, but I encountered an error while processing your message. Please try again.',
        timestamp: new Date(),
        sender: 'agent',
        agentId: selectedAgent.id
      };

      setCurrentSession(prev => prev ? {
        ...prev,
        messages: [...prev.messages, errorMessage],
        lastActivity: new Date()
      } : null);
    }

    setIsTyping(false);
  };

  const handleRateMessage = (messageId: string, rating: number) => {
    if (!currentSession) return;

    setCurrentSession(prev => prev ? {
      ...prev,
      messages: prev.messages.map(msg => 
        msg.id === messageId ? { ...msg, rating } : msg
      ),
      lastActivity: new Date()
    } : null);

    // Log rating
    loggingService.logUserAction('message_rated', 'chat_window', {
      messageId,
      rating,
      agentId: selectedAgent?.id,
      sessionId: currentSession.id
    });
  };

  const handleExport = async (format: 'pdf' | 'txt' | 'md') => {
    if (!currentSession || !selectedAgent) return;

    try {
      await exportConversation(currentSession.messages, format, {
        includeMetadata: true,
        includeRatings: true
      });
      
      // Log export
      loggingService.logUserAction('conversation_exported', 'chat_window', {
        format,
        agentId: selectedAgent.id,
        sessionId: currentSession.id,
        messageCount: currentSession.messages.length
      });
    } catch (error) {
      console.error('Export failed:', error);
      
      // Log export error
      loggingService.logError({
        errorType: 'export_error',
        errorMessage: error instanceof Error ? error.message : 'Export failed',
        component: 'ChatWindow.handleExport',
        severity: 'low'
      });
    }
  };

  const handleCopyConversation = async () => {
    if (!currentSession || !selectedAgent) return;

    try {
      const conversation = currentSession.messages
        .map(msg => `${msg.sender === 'user' ? 'You' : selectedAgent.name}: ${msg.content}`)
        .join('\n\n');
      
      await copyToClipboard(conversation);
      
      // Log copy action
      loggingService.logUserAction('conversation_copied', 'chat_window', {
        agentId: selectedAgent.id,
        sessionId: currentSession.id,
        messageCount: currentSession.messages.length
      });
    } catch (error) {
      console.error('Copy failed:', error);
      
      // Log copy error
      loggingService.logError({
        errorType: 'copy_error',
        errorMessage: error instanceof Error ? error.message : 'Copy failed',
        component: 'ChatWindow.handleCopyConversation',
        severity: 'low'
      });
    }
  };

  const clearChatHistory = () => {
    if (!selectedAgent) return;
    
    localStorage.removeItem(`chat_session_${selectedAgent.id}`);
    createNewSession();
    setShowExportMenu(false);
    
    // Log clear action
    loggingService.logUserAction('chat_history_cleared', 'chat_window', {
      agentId: selectedAgent.id,
      sessionId: currentSession?.id
    });
  };

  const handleQuickAction = async (action: string) => {
    if (!selectedAgent || !currentSession) return;

    // Log quick action
    loggingService.logUserAction('quick_action_used', 'chat_window', {
      action,
      agentId: selectedAgent.id,
      sessionId: currentSession.id
    });

    // Insert action text into input instead of sending immediately
    insertTextToInput(action);
  };

  const handleModelChange = (model: AIModel) => {
    setSelectedModel(model);
    setShowModelSelector(false);
    
    // Log model change
    loggingService.logUserAction('ai_model_changed', 'chat_interface', {
      agentId: selectedAgent?.id,
      previousModel: currentSession?.model,
      newModel: model,
      agentName: selectedAgent?.name
    });
  };

  const getIconComponent = (iconName: string) => {
    const iconKey = iconName.split('-').map((word, index) => 
      index === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join('');
    
    const IconComponent = (LucideIcons as any)[iconKey];
    return IconComponent || LucideIcons.User;
  };

  const getWindowClasses = () => {
    switch (windowState) {
      case 'minimized':
        return 'w-80 h-16';
      case 'maximized':
        return 'w-full h-full';
      default:
        return 'w-full max-w-4xl h-[80vh] max-h-[800px]';
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Paywall Modal */}
      <PaywallModal
        isOpen={showPaywallModal}
        onClose={() => setShowPaywallModal(false)}
        requiredCredits={paywallRequiredCredits}
        agentName={selectedAgent?.name}
      />

      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              onClose();
            }
          }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className={`bg-white rounded-xl shadow-2xl flex flex-col transition-all duration-300 ${getWindowClasses()}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 rounded-t-xl bg-gradient-to-r from-blue-50 to-purple-50">
              <div className="flex items-center space-x-3">
                {selectedAgent && (
                  <>
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        {(() => {
                          const IconComponent = getIconComponent(selectedAgent.avatar);
                          return <IconComponent className="w-5 h-5 text-white" />;
                        })()}
                      </div>
                      <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                        selectedAgent.isOnline ? 'bg-green-400' : 'bg-gray-400'
                      }`} />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold text-gray-900">{selectedAgent.name}</h3>
                      </div>
                      <p className="text-sm text-gray-500">{selectedAgent.role}</p>
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center space-x-2">
                {onMinimize && (
                  <button
                    onClick={handleMinimize}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-white/50 transition-colors"
                  >
                    <Minimize2 className="h-4 w-4" />
                  </button>
                )}
                
                {/* AI Model Selector */}
                <div className="relative">
                  <button
                    onClick={() => setShowModelSelector(!showModelSelector)}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-white/50 transition-colors"
                    title={`Current model: ${selectedModel}`}
                  >
                    <Settings className="h-4 w-4" />
                  </button>
                  
                  <AnimatePresence>
                    {showModelSelector && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -5 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -5 }}
                        className="absolute right-0 top-full mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 p-3 z-10"
                      >
                        <div className="mb-3">
                          <h4 className="text-sm font-medium text-gray-900 mb-2">Select AI Model</h4>
                          <p className="text-xs text-gray-500">Choose which AI model to use for this conversation</p>
                        </div>
                        
                        <div className="space-y-2">
                          {[
                            { value: 'gpt-4.1-turbo' as AIModel, label: 'GPT-4.1 Turbo', description: 'Most advanced reasoning and creativity' },
                            { value: 'claude-sonnet-4-20250514' as AIModel, label: 'Claude 4 Sonnet', description: 'Excellent for analysis and long-form content' },
                            { value: 'gemini-2.0-flash' as AIModel, label: 'Gemini 2.0 Flash', description: 'Great for multimodal tasks and coding' }
                          ].map((model) => (
                            <button
                              key={model.value}
                              onClick={() => handleModelChange(model.value)}
                              className={`w-full text-left p-2 rounded-md transition-colors ${
                                selectedModel === model.value
                                  ? 'bg-blue-50 border border-blue-200 text-blue-900'
                                  : 'hover:bg-gray-50 border border-transparent'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium text-sm">{model.label}</div>
                                  <div className="text-xs text-gray-500">{model.description}</div>
                                </div>
                                {selectedModel === model.value && (
                                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                        
                        <div className="mt-3 pt-2 border-t border-gray-100">
                          <div className="text-xs text-gray-500">
                            Current: <span className="font-medium text-gray-900">{selectedModel}</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                <div className="relative">
                  <button
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-white/50 transition-colors"
                  >
                    <MoreHorizontal className="h-4 w-4" />
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
                          onClick={() => {}}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <Share2 className="h-4 w-4 mr-3" />
                          Share Conversation
                        </button>
                        <hr className="my-1" />
                        <button
                          onClick={clearChatHistory}
                          className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          <X className="h-4 w-4 mr-3" />
                          Clear History
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                <button
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-white/50 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Content - Hidden when minimized */}
            {windowState !== 'minimized' && (
              <>
                {/* AI Model Info */}
                <div className="px-4 py-2 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">
                      Powered by <span className="font-medium text-blue-600">{selectedModel}</span> • {selectedAgent?.name} uses personalized responses
                    </span>
                    {selectedAgent && (
                      <span className="text-xs text-blue-600 font-medium">
                        {selectedAgent.responseTime} response time
                      </span>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-50 to-white">
                  {currentSession?.messages.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        {selectedAgent && (() => {
                          const IconComponent = getIconComponent(selectedAgent.avatar);
                          return <IconComponent className="w-8 h-8 text-white" />;
                        })()}
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Start a conversation with {selectedAgent?.name}
                      </h3>
                      <p className="text-gray-600 mb-6">
                        {selectedAgent?.description}
                      </p>
                                             {selectedAgent?.skills && selectedAgent.skills.length > 0 && (
                         <ActionButtons
                           onAction={handleQuickAction}
                           onInsertText={insertTextToInput}
                           actions={selectedAgent.skills.slice(0, 3)}
                           agent={selectedAgent}
                         />
                       )}
                    </div>
                  ) : (
                    <>
                                             {currentSession?.messages.map((message) => (
                         <MessageBubble
                           key={message.id}
                           message={message}
                           agent={selectedAgent}
                           onChoiceSelect={handleChoiceSelect}
                           onInsertText={insertTextToInput}
                           onRate={(rating) => handleRateMessage(message.id, rating)}
                         />
                       ))}
                      {isTyping && (
                        <div className="flex justify-start">
                          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                            <div className="flex items-center space-x-2">
                              <div className="flex space-x-1">
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                              </div>
                              <span className="text-sm text-gray-500">{selectedAgent?.name} is typing...</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 bg-white rounded-b-xl">
                  {/* Export Buttons Row - Only show if has messages */}
                  {currentSession && currentSession.messages.length > 0 && (
                    <div className="flex items-center justify-center space-x-3 mb-3 pb-3 border-b border-gray-100">
                      <button
                        onClick={handleCopyConversation}
                        className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Copy className="h-4 w-4" />
                        <span>Copy</span>
                      </button>
                      <button
                        onClick={() => handleExport('txt')}
                        className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <FileText className="h-4 w-4" />
                        <span>Export as Text</span>
                      </button>
                      <button
                        onClick={() => handleExport('md')}
                        className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Download className="h-4 w-4" />
                        <span>Export as Markdown</span>
                      </button>
                    </div>
                  )}

                  {/* Credit balance display for authenticated users */}
                  {user && balance && (
                    <div className="mb-3 p-3 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Crown className="h-4 w-4 text-blue-600" />
                          <span className="text-sm text-blue-800 font-medium">
                            Credits: {balance.balance}
                          </span>
                          {deductingCredits && (
                            <div className="flex items-center space-x-1">
                              <Loader2 className="h-3 w-3 animate-spin text-orange-500" />
                              <span className="text-xs text-orange-600 font-medium">Deducting...</span>
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-blue-600">
                          Credit-based messaging
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Input */}
                  {user && (creditCount === null || creditCount === 0) ? (
                    /* No Credits Warning */
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4 text-center">
                      <div className="flex items-center justify-center space-x-2 mb-2">
                        <AlertTriangle className="h-5 w-5 text-amber-600" />
                        <span className="font-semibold text-amber-800">No Credits Available</span>
                      </div>
                      <p className="text-sm text-amber-700 mb-3">
                        You need credits to continue chatting with AI agents.
                      </p>
                      <button
                        onClick={() => window.location.href = '/pricing'}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center justify-center space-x-2 w-full"
                      >
                        <CreditCard className="h-4 w-4" />
                        <span>Get More Credits</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex space-x-2">
                      <input
                        ref={inputRef}
                        type="text"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyDown={(e) => {
                          // Use keyDown instead of keyPress for better compatibility
                          // Handle Enter key with proper conditions
                          if (e.key === 'Enter' && 
                              !e.shiftKey && // Allow Shift+Enter for line breaks in future
                              !isTyping && 
                              inputMessage.trim() &&
                              !(user && (creditCount === null || creditCount < 1))) {
                            e.preventDefault(); // Prevent form submission if in a form
                            sendUserMessage();
                          }
                        }}
                        placeholder={
                          user && (creditCount === null || creditCount < 1) 
                            ? `Insufficient credits to message ${selectedAgent?.name}...`
                            : `Message ${selectedAgent?.name}...`
                        }
                        className={`flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:border-blue-500 transition-colors ${
                          user && (creditCount === null || creditCount < 1) 
                            ? 'border-amber-300 bg-amber-50 text-amber-700 focus:ring-amber-500' 
                            : 'border-gray-300 focus:ring-blue-500'
                        }`}
                        disabled={isTyping || Boolean(user && (creditCount === null || creditCount < 1))}
                      />
                      <button
                        onClick={() => {
                          if (user && (creditCount === null || creditCount < 1)) {
                            window.location.href = '/pricing';
                          } else {
                            sendUserMessage();
                          }
                        }}
                        disabled={(!inputMessage.trim() && user && (creditCount !== null && creditCount >= 1)) || isTyping || deductingCredits}
                                                  className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                            user && (creditCount === null || creditCount < 1)
                              ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white'
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                          }`}
                      >
                        {deductingCredits ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            <span className="hidden sm:inline">Deducting...</span>
                          </>
                        ) : isTyping ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : user && (creditCount === null || creditCount < 1) ? (
                          <>
                            <CreditCard className="h-5 w-5" />
                            <span className="hidden sm:inline">Get Credits</span>
                          </>
                        ) : (
                          <Send className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </>
  );
};

export default ChatWindow;