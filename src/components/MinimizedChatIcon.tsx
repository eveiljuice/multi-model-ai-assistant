import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Agent } from '../types';
import { Tooltip } from './Tooltip';

interface MinimizedChatIconProps {
  agent: Agent;
  onClick: () => void;
  onClose: () => void;
  hasUnreadMessages?: boolean;
  messageCount?: number;
}

const MinimizedChatIcon: React.FC<MinimizedChatIconProps> = ({
  agent,
  onClick,
  onClose,
  hasUnreadMessages = false,
  messageCount = 0
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const getIconComponent = (iconName: string) => {
    const iconKey = iconName.split('-').map((word, index) => 
      index === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join('');
    
    const IconComponent = (LucideIcons as any)[iconKey];
    return IconComponent || LucideIcons.User;
  };

  const IconComponent = getIconComponent(agent.avatar);

  return (
    <Tooltip content={`Chat with ${agent.name} is minimized here\nClick to restore • Right-click to close`}>
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.95 }}
        className="relative group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <button
          onClick={onClick}
          onContextMenu={(e) => {
            e.preventDefault();
            onClose();
          }}
          className={`
            relative w-12 h-12 rounded-full shadow-lg border-2 transition-all duration-300
            ${hasUnreadMessages 
              ? 'border-blue-400 bg-gradient-to-br from-blue-500 to-purple-600 shadow-blue-200' 
              : 'border-gray-300 bg-gradient-to-br from-blue-500 to-purple-600 hover:border-blue-400 hover:shadow-blue-200'
            }
            hover:shadow-xl transform focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          `}
          aria-label={`Restore chat with ${agent.name}`}
        >
          {/* Agent Icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <IconComponent className="w-5 h-5 text-white drop-shadow-sm" />
          </div>

          {/* Online Status Indicator */}
          <div className={`
            absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm
            ${agent.isOnline ? 'bg-green-400' : 'bg-gray-400'}
          `} />

          {/* Unread Message Badge */}
          {hasUnreadMessages && messageCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white shadow-sm px-1"
            >
              {messageCount > 99 ? '99+' : messageCount}
            </motion.div>
          )}

          {/* Chat Icon Overlay */}
          <div className="absolute -bottom-1 -left-1 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-md border border-gray-200">
            <MessageCircle className="w-2.5 h-2.5 text-blue-500" />
          </div>

          {/* Pulse Animation for Unread Messages */}
          {hasUnreadMessages && (
            <div className="absolute inset-0 rounded-full bg-blue-400 opacity-30 animate-ping" />
          )}
        </button>

        {/* Close Button (appears on hover) */}
        <AnimatePresence>
          {isHovered && (
            <motion.button
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              aria-label={`Close chat with ${agent.name}`}
            >
              <X className="w-3 h-3" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Typing Indicator (when agent is responding) */}
        {agent.isOnline && hasUnreadMessages && (
          <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
            <div className="flex space-x-1">
              <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
      </motion.div>
    </Tooltip>
  );
};

export default MinimizedChatIcon;