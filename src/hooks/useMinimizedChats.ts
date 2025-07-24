import { useState, useCallback, useEffect } from 'react';
import { Agent } from '../types';

interface MinimizedChat {
  agent: Agent;
  hasUnreadMessages: boolean;
  messageCount: number;
  minimizedAt: Date;
  lastMessageTime?: Date;
}

const STORAGE_KEY = 'minimized_chats';

export const useMinimizedChats = () => {
  const [minimizedChats, setMinimizedChats] = useState<MinimizedChat[]>([]);

  // Load minimized chats from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Convert date strings back to Date objects
        const restored = parsed.map((chat: any) => ({
          ...chat,
          minimizedAt: new Date(chat.minimizedAt),
          lastMessageTime: chat.lastMessageTime ? new Date(chat.lastMessageTime) : undefined
        }));
        setMinimizedChats(restored);
      }
    } catch (error) {
      console.error('Failed to load minimized chats:', error);
    }
  }, []);

  // Save minimized chats to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(minimizedChats));
    } catch (error) {
      console.error('Failed to save minimized chats:', error);
    }
  }, [minimizedChats]);

  const minimizeChat = useCallback((agent: Agent) => {
    setMinimizedChats(prev => {
      // Check if chat is already minimized
      const existingIndex = prev.findIndex(chat => chat.agent.id === agent.id);
      
      if (existingIndex >= 0) {
        // Update existing minimized chat
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          agent,
          minimizedAt: new Date()
        };
        return updated;
      } else {
        // Add new minimized chat
        return [...prev, {
          agent,
          hasUnreadMessages: false,
          messageCount: 0,
          minimizedAt: new Date()
        }];
      }
    });
  }, []);

  const restoreChat = useCallback((agentId: string) => {
    setMinimizedChats(prev => {
      // Clear unread messages when restoring
      return prev.filter(chat => {
        if (chat.agent.id === agentId) {
          // Reset unread count when restoring
          return false;
        }
        return true;
      });
    });
  }, []);

  const closeMinimizedChat = useCallback((agentId: string) => {
    setMinimizedChats(prev => prev.filter(chat => chat.agent.id !== agentId));
    
    // Also clear the chat session from localStorage
    try {
      localStorage.removeItem(`chat_session_${agentId}`);
    } catch (error) {
      console.error('Failed to clear chat session:', error);
    }
  }, []);

  const updateUnreadMessages = useCallback((agentId: string, count: number, lastMessageTime?: Date) => {
    setMinimizedChats(prev => prev.map(chat => 
      chat.agent.id === agentId 
        ? { 
            ...chat, 
            hasUnreadMessages: count > 0, 
            messageCount: count,
            lastMessageTime: lastMessageTime || chat.lastMessageTime
          }
        : chat
    ));
  }, []);

  const markAsRead = useCallback((agentId: string) => {
    setMinimizedChats(prev => prev.map(chat => 
      chat.agent.id === agentId 
        ? { ...chat, hasUnreadMessages: false, messageCount: 0 }
        : chat
    ));
  }, []);

  const addUnreadMessage = useCallback((agentId: string) => {
    setMinimizedChats(prev => prev.map(chat => 
      chat.agent.id === agentId 
        ? { 
            ...chat, 
            hasUnreadMessages: true, 
            messageCount: chat.messageCount + 1,
            lastMessageTime: new Date()
          }
        : chat
    ));
  }, []);

  const isMinimized = useCallback((agentId: string) => {
    return minimizedChats.some(chat => chat.agent.id === agentId);
  }, [minimizedChats]);

  const getMinimizedChat = useCallback((agentId: string) => {
    return minimizedChats.find(chat => chat.agent.id === agentId);
  }, [minimizedChats]);

  const getTotalUnreadCount = useCallback(() => {
    return minimizedChats.reduce((total, chat) => total + chat.messageCount, 0);
  }, [minimizedChats]);

  const hasAnyUnread = useCallback(() => {
    return minimizedChats.some(chat => chat.hasUnreadMessages);
  }, [minimizedChats]);

  return {
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
  };
};