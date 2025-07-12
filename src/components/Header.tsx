import React, { useState } from 'react';
import { Search, Menu, Bell, User, MessageSquare, Filter, SidebarOpen, SidebarClose, LogIn, Lightbulb, CreditCard, MoreHorizontal, ChevronDown } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import MinimizedChatsContainer from './MinimizedChatsContainer';
import AuthModal from './auth/AuthModal';
import SuggestIdeaModal from './SuggestIdeaModal';
import { useAuth } from '../contexts/AuthContext';
import { useCredits } from '../contexts/CreditContext';
import { Agent } from '../types';

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
  onFilterToggle?: () => void;
  isFilterPanelVisible?: boolean;
  minimizedChats?: MinimizedChat[];
  onRestoreChat?: (agentId: string) => void;
  onCloseMinimizedChat?: (agentId: string) => void;
}

// Компактный компонент кредитного баланса специально для header
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

// Компактный компонент пользовательского меню для header
const HeaderUserMenu: React.FC = () => {
  const { user, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  if (!user) return null;

  const initials = (user.user_metadata?.full_name || user.email?.split('@')[0] || 'U')
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 
                   transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 
                        rounded-full flex items-center justify-center text-white text-sm font-medium">
          {initials}
        </div>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 
                                ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop с правильным z-index */}
            <div
              className="fixed inset-0 z-30"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Menu с увеличенным z-index для корректного отображения над header */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -5 }}
              className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg 
                         border border-gray-200 py-2 z-40"
            >
              <div className="px-4 py-3 border-b border-gray-100">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {user.user_metadata?.full_name || user.email?.split('@')[0]}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {user.email}
                </div>
              </div>

              <div className="py-2">
                <Link
                  to="/profile"
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 
                           hover:bg-gray-50 transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  <User className="h-4 w-4 mr-3 text-gray-400" />
                  Profile
                </Link>

                <button
                  onClick={() => {
                    signOut();
                    setIsOpen(false);
                  }}
                  className="flex items-center w-full px-4 py-2 text-sm text-red-600 
                           hover:bg-red-50 transition-colors"
                >
                  <LogIn className="h-4 w-4 mr-3" />
                  Sign Out
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

// Overflow Menu для дополнительных действий
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
  onFilterToggle,
  isFilterPanelVisible = true,
  minimizedChats = [],
  onRestoreChat = () => {},
  onCloseMinimizedChat = () => {}
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
        ИСПРАВЛЕНИЕ: Увеличен z-index до z-50 для предотвращения конфликтов 
        с модальными окнами и dropdown меню
      */}
      <header className="bg-white/95 backdrop-blur-lg border-b border-gray-200/50 
                         sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* 
            ИСПРАВЛЕНИЕ: Упрощенная grid структура с консистентными gap значениями
            - Убраны конфликтующие классы
            - Стандартизированы отступы (gap-4 везде)
            - Исправлена логика responsive поведения
          */}
          <div className="grid items-center min-h-16 gap-4 grid-cols-[auto_1fr_auto]">
            
            {/* 
              ИСПРАВЛЕНИЕ: Лого секция с фиксированной шириной для предотвращения layout shift
            */}
            <div className="flex items-center min-w-fit gap-6">
              <Link to="/" className="flex items-center group">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 
                              rounded-xl flex items-center justify-center shadow-lg ring-2 ring-blue-100/50 
                              group-hover:ring-blue-200 transition-all duration-300 group-hover:scale-105">
                  <span className="text-white font-bold text-sm drop-shadow-sm">AC</span>
                </div>
                <span className="ml-3 text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 
                               bg-clip-text text-transparent whitespace-nowrap hidden sm:inline-block">
                  Agent Core [BETA]
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
              ИСПРАВЛЕНИЕ: Центральная навигация с overflow handling
              - Упрощена логика показа/скрытия
              - Убрана сложная nested логика
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
                                  transition-all duration-200 whitespace-nowrap ${
                          activeTab === tab.id 
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
                    className={`font-medium transition-colors px-3 py-2 rounded-lg hover:bg-gray-50 ${
                      isPricingPage 
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
              ИСПРАВЛЕНИЕ: Правая секция с приоритетным показом элементов
              - Убрана перегруженность
              - Добавлен overflow menu для дополнительных действий
              - Консистентные gap значения
            */}
            <div className="flex items-center gap-3 min-w-fit">
              
              {/* ИСПРАВЛЕНИЕ: Компактный кредитный баланс только для авторизованных пользователей */}
              {user && <HeaderCreditBalance />}

              {/* 
                ИСПРАВЛЕНИЕ: Основные действия с упрощенной логикой видимости
                - Убраны сложные breakpoint условия
                - Группировка связанных действий
              */}
              <div className="flex items-center gap-2">
                
                {/* Filter toggle - только на marketplace */}
                {isMainPage && activeTab === 'marketplace' && onFilterToggle && (
                  <button
                    onClick={onFilterToggle}
                    className={`p-2 rounded-lg transition-all duration-200 hidden lg:flex ${
                      isFilterPanelVisible
                        ? 'bg-blue-100 text-blue-600'
                        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                    }`}
                    title={isFilterPanelVisible ? 'Hide filters' : 'Show filters'}
                  >
                    {isFilterPanelVisible ? <SidebarClose className="h-5 w-5" /> : <SidebarOpen className="h-5 w-5" />}
                  </button>
                )}

                {/* Minimized chats - упрощенная логика */}
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

                {/* ИСПРАВЛЕНИЕ: Overflow menu для дополнительных действий */}
                <div className="block">
                  <HeaderOverflowMenu 
                    onSuggestIdea={() => setIsSuggestIdeaModalOpen(true)}
                    isMainPage={isMainPage}
                    activeTab={activeTab}
                  />
                </div>
                
                {/* User menu или auth button */}
                {user ? (
                  <HeaderUserMenu />
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
            ИСПРАВЛЕНИЕ: Мобильная навигация в отдельном контейнере
            - Убрано дублирование кода
            - Улучшен overflow handling
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
                                  transition-all duration-200 whitespace-nowrap ${
                          activeTab === tab.id 
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
            ИСПРАВЛЕНИЕ: Search bar с улучшенным дизайном и фокус состояниями
          */}
          {isMainPage && activeTab === 'marketplace' && (
            <div className="pb-4 pt-2">
              <div className="max-w-2xl mx-auto">
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 
                                     transition-colors duration-200" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="block w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl 
                             bg-white/90 backdrop-blur-sm placeholder-gray-500 text-gray-900
                             focus:outline-none focus:placeholder-gray-400 focus:ring-2 
                             focus:ring-blue-500/20 focus:border-blue-500 shadow-sm 
                             hover:shadow-md transition-all duration-200 text-base"
                    placeholder="Search agents by name, skills, or specialization..."
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Модальные окна */}
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