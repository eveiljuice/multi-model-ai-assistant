import React, { useState } from 'react';
import { Search, Menu, Bell, User, MessageSquare, Filter, LogIn, Lightbulb, CreditCard, MoreHorizontal, ChevronDown } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import MinimizedChatsContainer from './MinimizedChatsContainer';
import AuthModal from './auth/AuthModal';
import SuggestIdeaModal from './SuggestIdeaModal';
import SearchBarWithCategories from './SearchBarWithCategories';
import UserMenu from './auth/UserMenu';
import { useAuth } from '../contexts/AuthContext';
import { useCredits } from '../contexts/CreditContext';
import { Agent, SearchFilters } from '../types';

interface Tab {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
}

interface MinimizedChat {
  agent: Agent;
  hasUnreadMessages: boolean;
  messageCount: number;
  minimizedAt: Date;
  lastMessageTime?: Date;
}

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onChatToggle: () => void;
  isChatOpen: boolean;
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabs: Tab[];
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  minimizedChats?: MinimizedChat[];
  onRestoreChat?: (agentId: string) => void;
  onCloseMinimizedChat?: (agentId: string) => void;
}

// Compact credit balance component specifically for header
const HeaderCreditBalance: React.FC = () => {
  const { balance, loading } = useCredits();

  if (loading || !balance) {
    return (
      <div className="flex items-center gap-2 px-2 py-1 bg-gray-100 rounded-lg animate-pulse">
        <div className="w-4 h-4 bg-gray-300 rounded-full" />
        <div className="w-8 h-3 bg-gray-300 rounded" />
      </div>
    );
  }

  const isLowBalance = balance.balance < 20;
  const balanceColor = balance.balance >= 100 ? 'text-green-600' :
    balance.balance >= 20 ? 'text-blue-600' : 'text-amber-600';
  const bgColor = balance.balance >= 100 ? 'bg-green-50 border-green-200' :
    balance.balance >= 20 ? 'bg-blue-50 border-blue-200' : 'bg-amber-50 border-amber-200';

  return (
    <Link to="/pricing" className="group">
      <div className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg transition-all duration-200 
                      hover:shadow-sm group-hover:scale-105 ${bgColor}`}>
        <CreditCard className={`h-4 w-4 ${balanceColor}`} />
        <span className={`text-sm font-semibold ${balanceColor}`}>
          {balance.balance}
        </span>
        {isLowBalance && (
          <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
        )}
      </div>
    </Link>
  );
};



// Overflow Menu for additional actions
const HeaderOverflowMenu: React.FC<{
  onSuggestIdea: () => void;
  isMainPage: boolean;
  activeTab: string;
}> = ({ onSuggestIdea, isMainPage, activeTab }) => {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    {
      id: 'pricing',
      label: 'Pricing',
      icon: CreditCard,
      onClick: () => {
        window.location.href = '/pricing';
        setIsOpen(false);
      }
    },
    {
      id: 'suggest-idea',
      label: 'Suggest Idea',
      icon: Lightbulb,
      onClick: () => {
        onSuggestIdea();
        setIsOpen(false);
      }
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
      onClick: () => setIsOpen(false)
    }
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 
                   rounded-lg transition-all duration-200"
        title="More options"
      >
        <MoreHorizontal className="h-5 w-5" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-30"
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -5 }}
              className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg 
                         border border-gray-200 py-2 z-40"
            >
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={item.onClick}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 
                             hover:bg-gray-50 transition-colors"
                  >
                    <Icon className="h-4 w-4 mr-3 text-gray-400" />
                    {item.label}
                  </button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  onChatToggle,
  isChatOpen,
  activeTab,
  onTabChange,
  tabs,
  filters,
  onFiltersChange,
  minimizedChats = [],
  onRestoreChat = () => { },
  onCloseMinimizedChat = () => { }
}) => {
  const { user } = useAuth();
  const location = useLocation();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSuggestIdeaModalOpen, setIsSuggestIdeaModalOpen] = useState(false);

  const isMainPage = location.pathname === '/';
  const isPricingPage = location.pathname === '/pricing';

  return (
    <>
      {/* 
        FIX: Increased z-index to z-50 to prevent conflicts 
        with modal windows and dropdown menus
      */}
      <header className="bg-white/95 backdrop-blur-lg border-b border-gray-200/50 
                         sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* 
            FIX: Simplified grid structure with consistent gap values
            - Removed conflicting classes
            - Standardized spacing (gap-4 everywhere)
            - Fixed responsive behavior logic
          */}
          <div className="grid items-center min-h-16 gap-4 grid-cols-[auto_1fr_auto]">

            {/* 
              FIX: Logo section with fixed width to prevent layout shift
            */}
            <div className="flex items-center min-w-fit gap-6">
              <Link to="/" className="flex items-center group">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 
                              rounded-xl flex items-center justify-center shadow-lg ring-2 ring-blue-100/50 
                              group-hover:ring-blue-200 transition-all duration-300 group-hover:scale-105">
                  <span className="text-white font-bold text-sm drop-shadow-sm">D5</span>
                </div>
                <span className="ml-3 text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 
                               bg-clip-text text-transparent whitespace-nowrap hidden sm:inline-block">
                  Donein5 [BETA]
                </span>
              </Link>

              {/* Pricing Button */}
              <Link
                to="/pricing"
                className="hidden md:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 
                          text-white rounded-lg font-medium transition-all duration-200 hover:from-blue-700 
                          hover:to-purple-700 hover:shadow-md hover:scale-105 shadow-sm"
              >
                <CreditCard className="h-4 w-4" />
                <span>Pricing</span>
              </Link>
            </div>

            {/* 
              FIX: Central navigation with overflow handling
              - Simplified show/hide logic
              - Removed complex nested logic
            */}
            <div className="hidden md:flex items-center justify-center">
              {isMainPage ? (
                <nav className="flex items-center gap-2">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm 
                                  transition-all duration-200 whitespace-nowrap ${activeTab === tab.id
                            ? 'bg-blue-100 text-blue-700 font-medium shadow-sm'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                          }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="hidden lg:inline">{tab.label}</span>
                      </button>
                    );
                  })}
                </nav>
              ) : (
                <nav className="flex items-center gap-6">
                  <Link
                    to="/"
                    className="text-gray-600 hover:text-gray-900 font-medium transition-colors 
                             px-3 py-2 rounded-lg hover:bg-gray-50"
                  >
                    Marketplace
                  </Link>
                  <Link
                    to="/pricing"
                    className={`font-medium transition-colors px-3 py-2 rounded-lg hover:bg-gray-50 ${isPricingPage
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-gray-900'
                      }`}
                  >
                    Pricing
                  </Link>
                </nav>
              )}
            </div>

            {/* 
              FIX: Right section with priority element display
              - Removed clutter
              - Added overflow menu for additional actions
              - Consistent gap values
            */}
            <div className="flex items-center gap-3 min-w-fit">

              {/* FIX: Compact credit balance only for authenticated users */}
              {user && <HeaderCreditBalance />}

              {/* 
                FIX: Main actions with simplified visibility logic
                - Removed complex breakpoint conditions
                - Grouped related actions
              */}
              <div className="flex items-center gap-2">

                {/* Minimized chats - simplified logic */}
                {isMainPage && activeTab === 'marketplace' && (
                  <MinimizedChatsContainer
                    minimizedChats={minimizedChats}
                    onRestoreChat={onRestoreChat}
                    onCloseChat={onCloseMinimizedChat}
                  />
                )}

                {/* Chat toggle */}
                {isMainPage && activeTab === 'marketplace' && !isChatOpen && minimizedChats.length === 0 && (
                  <button
                    onClick={onChatToggle}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 
                             rounded-lg transition-all duration-200"
                    title="Start new chat"
                  >
                    <MessageSquare className="h-5 w-5" />
                  </button>
                )}

                {/* FIX: Overflow menu for additional actions */}
                <div className="block">
                  <HeaderOverflowMenu
                    onSuggestIdea={() => setIsSuggestIdeaModalOpen(true)}
                    isMainPage={isMainPage}
                    activeTab={activeTab}
                  />
                </div>

                {/* User menu or auth button */}
                {user ? (
                  <UserMenu />
                ) : (
                  <button
                    onClick={() => setIsAuthModalOpen(true)}
                    className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 
                             text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-indigo-700 
                             transition-all duration-200 font-medium shadow-sm hover:shadow-md text-sm"
                  >
                    <LogIn className="h-4 w-4" />
                    <span className="hidden sm:inline">Sign In</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 
            FIX: Mobile navigation in separate container
            - Removed code duplication
            - Improved overflow handling
          */}
          {isMainPage && (
            <div className="md:hidden border-t border-gray-200/50 py-3">
              <div className="flex justify-center overflow-x-auto">
                <div className="flex items-center gap-2 px-2 min-w-fit">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm 
                                  transition-all duration-200 whitespace-nowrap ${activeTab === tab.id
                            ? 'bg-blue-100 text-blue-700 font-medium shadow-sm'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                          }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 
            FIX: Search bar with categories instead of old search bar
          */}
          {isMainPage && activeTab === 'marketplace' && (
            <SearchBarWithCategories
              searchQuery={searchQuery}
              onSearchChange={onSearchChange}
              filters={filters}
              onFiltersChange={onFiltersChange}
            />
          )}
        </div>
      </header>

      {/* Modal windows */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode="signin"
      />

      <SuggestIdeaModal
        isOpen={isSuggestIdeaModalOpen}
        onClose={() => setIsSuggestIdeaModalOpen(false)}
      />
    </>
  );
};

export default Header;