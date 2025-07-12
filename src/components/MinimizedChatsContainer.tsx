import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MinimizedChatIcon from './MinimizedChatIcon';
import { Agent } from '../types';

interface MinimizedChat {
  agent: Agent;
  hasUnreadMessages: boolean;
  messageCount: number;
}

interface MinimizedChatsContainerProps {
  minimizedChats: MinimizedChat[];
  onRestoreChat: (agentId: string) => void;
  onCloseChat: (agentId: string) => void;
}

const MinimizedChatsContainer: React.FC<MinimizedChatsContainerProps> = ({
  minimizedChats,
  onRestoreChat,
  onCloseChat
}) => {
  if (minimizedChats.length === 0) return null;

  return (
    <div className="flex items-center">
      {/* Minimized Chats */}
      <div className="flex items-center space-x-3">
        <AnimatePresence mode="popLayout">
          {minimizedChats.map((chat, index) => (
            <motion.div
              key={chat.agent.id}
              layout
              initial={{ x: 30, opacity: 0, scale: 0.8 }}
              animate={{ 
                x: 0, 
                opacity: 1,
                scale: 1,
                transition: { 
                  delay: index * 0.1,
                  type: "spring",
                  stiffness: 400,
                  damping: 25
                }
              }}
              exit={{ 
                x: 30, 
                opacity: 0,
                scale: 0.8,
                transition: { 
                  duration: 0.2,
                  ease: "easeInOut"
                }
              }}
            >
              <MinimizedChatIcon
                agent={chat.agent}
                hasUnreadMessages={chat.hasUnreadMessages}
                messageCount={chat.messageCount}
                onClick={() => onRestoreChat(chat.agent.id)}
                onClose={() => onCloseChat(chat.agent.id)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      
      {/* Separator line when there are minimized chats */}
      <motion.div
        initial={{ opacity: 0, scaleY: 0 }}
        animate={{ opacity: 1, scaleY: 1 }}
        exit={{ opacity: 0, scaleY: 0 }}
        className="w-px h-8 bg-gray-300 ml-4 mr-2"
      />
    </div>
  );
};

export default MinimizedChatsContainer;