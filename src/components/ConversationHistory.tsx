import React from 'react';
import { motion } from 'framer-motion';
import { Clock, User, Bot, Trash2 } from 'lucide-react';
import { ConversationMessage } from '../types/ai';

interface ConversationHistoryProps {
  messages: ConversationMessage[];
  onClearHistory: () => void;
}

const ConversationHistory: React.FC<ConversationHistoryProps> = ({
  messages,
  onClearHistory
}) => {
  if (messages.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Bot className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p>No conversation history yet.</p>
        <p className="text-sm">Start by asking a question above.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Conversation History</h3>
        <button
          onClick={onClearHistory}
          className="flex items-center space-x-1 px-3 py-1 text-sm text-red-600 hover:text-red-700 rounded-lg hover:bg-red-50 transition-colors"
        >
          <Trash2 className="h-4 w-4" />
          <span>Clear</span>
        </button>
      </div>

      <div className="space-y-4 max-h-96 overflow-y-auto">
        {messages.map((message, index) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white rounded-lg border border-gray-200 p-4"
          >
            <div className="flex items-start space-x-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                message.role === 'user' 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {message.role === 'user' ? (
                  <User className="h-4 w-4" />
                ) : (
                  <Bot className="h-4 w-4" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-sm font-medium text-gray-900">
                    {message.role === 'user' ? 'You' : 'AI Assistant'}
                  </span>
                  <div className="flex items-center space-x-1 text-xs text-gray-500">
                    <Clock className="h-3 w-3" />
                    <span>{message.timestamp.toLocaleTimeString()}</span>
                  </div>
                </div>
                
                <p className="text-sm text-gray-700 line-clamp-3">
                  {message.content}
                </p>

                {message.synthesized && (
                  <div className="mt-2 text-xs text-gray-500">
                    <span>Confidence: {(message.synthesized.confidence * 100).toFixed(1)}%</span>
                    {message.responses && (
                      <span className="ml-2">
                        • {message.responses.filter(r => !r.error).length} sources
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default ConversationHistory;