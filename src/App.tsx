import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Brain, Search, Filter } from 'lucide-react';
import { AuthProvider } from './contexts/AuthContext';
import { CreditProvider } from './contexts/CreditContext';
import Header from './components/Header';
import AgentDirectory from './components/AgentDirectory';
import FilterPanel from './components/FilterPanel';
import ChatWindow from './components/ChatWindow';
import AIAssistant from './components/AIAssistant';
import PricingPage from './components/pricing/PricingPage';
import SuccessPage from './components/SuccessPage';
import Footer from './components/Footer';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { Agent, SearchFilters } from './types';
import { loggingService } from './services/loggingService';
import { useErrorBoundary } from './hooks/useErrorBoundary';
import { useMinimizedChats } from './hooks/useMinimizedChats';

function AppContent() {
  const [activeTab, setActiveTab] = useState<'marketplace' | 'ai-assistant'>('marketplace');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    category: 'All',
    experienceLevel: 'All',
    minRating: 0,
    sortBy: 'relevance'
  });
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isFilterPanelVisible, setIsFilterPanelVisible] = useState(false);

  // Minimized chats management
  const {
    minimizedChats,
    minimizeChat,
    restoreChat,
    closeMinimizedChat,
    updateUnreadMessages,
    markAsRead,
    addUnreadMessage,
    isMinimized,
    getMinimizedChat,
    getTotalUnreadCount,
    hasAnyUnread
  } = useMinimizedChats();

  // Initialize error boundary and logging
  useErrorBoundary();

  useEffect(() => {
    // Log page load
    loggingService.logPageView();
    loggingService.logPageLoadTime();

    // Log initial app state
    loggingService.logActivity({
      eventType: 'app_initialized',
      eventCategory: 'application',
      eventData: {
        activeTab,
        timestamp: new Date().toISOString()
      }
    });
  }, []);

  // Monitor for new messages in minimized chats
  useEffect(() => {
    const checkForNewMessages = () => {
      minimizedChats.forEach(chat => {
        try {
          const savedSession = localStorage.getItem(`chat_session_${chat.agent.id}`);
          if (savedSession) {
            const session = JSON.parse(savedSession);
            const messageCount = session.messages?.length || 0;
            const lastMessage = session.messages?.[messageCount - 1];
            
            // Check if there's a new agent message since minimization
            if (lastMessage && 
                lastMessage.sender === 'agent' && 
                new Date(lastMessage.timestamp) > chat.minimizedAt &&
                messageCount > chat.messageCount) {
              
              addUnreadMessage(chat.agent.id);
            }
          }
        } catch (error) {
          console.error('Error checking for new messages:', error);
        }
      });
    };

    // Check every 5 seconds for new messages
    const interval = setInterval(checkForNewMessages, 5000);
    return () => clearInterval(interval);
  }, [minimizedChats, addUnreadMessage]);

  const handleAgentSelect = (agent: Agent) => {
    // Check if this agent's chat is minimized
    if (isMinimized(agent.id)) {
      // Restore the minimized chat
      restoreChat(agent.id);
      setSelectedAgent(agent);
      setIsChatOpen(true);
      
      // Mark as read when restoring
      markAsRead(agent.id);
      
      loggingService.logUserAction('minimized_chat_restored', 'chat_management', {
        agentId: agent.id,
        agentName: agent.name
      });
    } else {
      // Open new chat
      setSelectedAgent(agent);
      setIsChatOpen(true);
      
      loggingService.logUserAction('agent_selected', 'agent_card', {
        agentId: agent.id,
        agentName: agent.name,
        agentCategory: agent.category
      });
    }
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setFilters(prev => ({ ...prev, query }));
    
    // Log search activity
    if (query.length > 0) {
      loggingService.logSearch(query, undefined, filters);
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as 'marketplace' | 'ai-assistant');
    
    // Log tab change
    loggingService.logUserAction('tab_changed', 'navigation', {
      fromTab: activeTab,
      toTab: tab
    });
    
    // Log page view for new tab
    loggingService.logPageView(`/${tab}`);
  };

  const handleChatToggle = () => {
    // Simple toggle - just opens a new chat selection
    setIsChatOpen(true);
    setSelectedAgent(null);
    
    // Log chat toggle
    loggingService.logUserAction('new_chat_opened', 'chat_interface', {
      hasMinimizedChats: minimizedChats.length > 0
    });
  };

  const handleChatClose = () => {
    setIsChatOpen(false);
    setSelectedAgent(null);
    
    // Log chat close
    loggingService.logUserAction('chat_closed', 'chat_window', {
      selectedAgent: selectedAgent?.id
    });
  };

  const handleChatMinimize = () => {
    if (selectedAgent) {
      minimizeChat(selectedAgent);
      setIsChatOpen(false);
      
      // Log minimize action
      loggingService.logUserAction('chat_minimized', 'chat_management', {
        agentId: selectedAgent.id,
        agentName: selectedAgent.name
      });
    }
  };

  const handleRestoreChat = (agentId: string) => {
    const minimizedChat = getMinimizedChat(agentId);
    if (minimizedChat) {
      restoreChat(agentId);
      setSelectedAgent(minimizedChat.agent);
      setIsChatOpen(true);
      
      // Mark as read when restoring
      markAsRead(agentId);
      
      loggingService.logUserAction('minimized_chat_restored', 'chat_management', {
        agentId,
        agentName: minimizedChat.agent.name
      });
    }
  };

  const handleCloseMinimizedChat = (agentId: string) => {
    const minimizedChat = getMinimizedChat(agentId);
    closeMinimizedChat(agentId);
    
    loggingService.logUserAction('minimized_chat_closed', 'chat_management', {
      agentId,
      agentName: minimizedChat?.agent.name
    });
  };

  const handleFiltersChange = (newFilters: SearchFilters) => {
    setFilters(newFilters);
    
    // Log filter changes
    loggingService.logUserAction('filters_changed', 'filter_panel', {
      filters: newFilters
    });
  };

  const handleFilterPanelToggle = () => {
    const newState = !isFilterPanelVisible;
    setIsFilterPanelVisible(newState);
    
    // Log filter panel toggle
    loggingService.logUserAction('filter_panel_toggled', 'filter_panel', {
      isVisible: newState
    });
  };

  const tabs = [
    { id: 'marketplace', label: 'Agent Marketplace', icon: Users },
    { id: 'ai-assistant', label: 'Multi-Model AI Assistant', icon: Brain }
  ];

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Header */}
        <Header
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          onChatToggle={handleChatToggle}
          isChatOpen={isChatOpen}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          tabs={tabs}
          onFilterToggle={activeTab === 'marketplace' ? handleFilterPanelToggle : undefined}
          isFilterPanelVisible={isFilterPanelVisible}
          minimizedChats={minimizedChats}
          onRestoreChat={handleRestoreChat}
          onCloseMinimizedChat={handleCloseMinimizedChat}
        />

        <div className="flex flex-1">
          {/* Filter Panel - Only show for marketplace */}
          {activeTab === 'marketplace' && (
            <AnimatePresence>
              {isFilterPanelVisible && (
                <motion.div
                  initial={{ x: -320, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -320, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="hidden lg:block w-80 flex-shrink-0"
                >
                  <FilterPanel
                    filters={filters}
                    onFiltersChange={handleFiltersChange}
                    isOpen={isFilterOpen}
                    onToggle={() => {
                      setIsFilterOpen(!isFilterOpen);
                      loggingService.logUserAction('filter_panel_toggled', 'filter_panel', {
                        isOpen: !isFilterOpen
                      });
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          )}

          {/* Main Content */}
          <motion.div 
            className="flex-1 min-w-0 flex flex-col"
            animate={{ 
              marginLeft: activeTab === 'marketplace' && isFilterPanelVisible ? 0 : 0 
            }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <div className="flex-1">
              <Routes>
                <Route path="/" element={
                  <ProtectedRoute requireCredits={false} allowZeroCredits={true}>
                    <AnimatePresence mode="wait">
                      {activeTab === 'marketplace' && (
                        <motion.div
                          key="marketplace"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ duration: 0.3 }}
                        >
                          <AgentDirectory
                            searchQuery={searchQuery}
                            filters={filters}
                            onAgentSelect={handleAgentSelect}
                          />
                        </motion.div>
                      )}

                      {activeTab === 'ai-assistant' && (
                        <motion.div
                          key="ai-assistant"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ duration: 0.3 }}
                        >
                          <ProtectedRoute requireCredits={true} requiredCredits={1}>
                            <AIAssistant />
                          </ProtectedRoute>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </ProtectedRoute>
                } />
                <Route path="/pricing" element={
                  <ProtectedRoute allowZeroCredits={true}>
                    <PricingPage />
                  </ProtectedRoute>
                } />
                <Route path="/success" element={
                  <ProtectedRoute allowZeroCredits={true}>
                    <SuccessPage />
                  </ProtectedRoute>
                } />
              </Routes>
            </div>

            {/* Footer */}
            <Footer />
          </motion.div>
        </div>

        {/* Chat Window - New dedicated modal */}
        <ChatWindow
          selectedAgent={selectedAgent}
          isOpen={isChatOpen}
          onClose={handleChatClose}
          onMinimize={handleChatMinimize}
        />

        {/* Mobile Filter Panel */}
        {activeTab === 'marketplace' && (
          <AnimatePresence>
            {isFilterOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="lg:hidden fixed inset-0 z-50 bg-black bg-opacity-50"
                onClick={() => {
                  setIsFilterOpen(false);
                  loggingService.logUserAction('mobile_filter_closed', 'filter_panel');
                }}
              >
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '-100%' }}
                  className="w-80 h-full bg-white"
                  onClick={(e) => e.stopPropagation()}
                >
                  <FilterPanel
                    filters={filters}
                    onFiltersChange={handleFiltersChange}
                    isOpen={isFilterOpen}
                    onToggle={() => {
                      setIsFilterOpen(false);
                      loggingService.logUserAction('mobile_filter_closed', 'filter_panel');
                    }}
                  />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <AuthProvider>
      <CreditProvider>
        <Router>
          <AppContent />
        </Router>
      </CreditProvider>
    </AuthProvider>
  );
}

export default App;