import React, { useState } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { 
  Star, 
  Copy, 
  ThumbsUp, 
  ThumbsDown, 
  CheckCircle,
  Clock,
  Zap,
  MessageSquare
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { ChatMessage, Agent } from '../types';
import { copyToClipboard } from '../utils';
import ChoiceButtons from './ChoiceButtons';

interface MessageBubbleProps {
  message: ChatMessage;
  agent: Agent | null;
  onRate: (rating: number) => void;
  onChoiceSelect?: (choice: string, index: number) => void;
  onInsertText?: (text: string) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  message, 
  agent, 
  onRate, 
  onChoiceSelect,
  onInsertText 
}) => {
  const [showRating, setShowRating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const success = await copyToClipboard(message.content);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRate = (rating: number) => {
    onRate(rating);
    setShowRating(false);
  };

  const renderStars = () => {
    return Array.from({ length: 5 }, (_, i) => (
      <button
        key={i}
        onClick={() => handleRate(i + 1)}
        className={`w-4 h-4 ${
          message.rating && i < message.rating
            ? 'text-yellow-400 fill-current'
            : 'text-gray-300 hover:text-yellow-400'
        } transition-colors`}
      >
        <Star className="w-full h-full" />
      </button>
    ));
  };

  const getModelIcon = (model?: string) => {
    switch (model) {
      case 'gpt-4.1-turbo':
      case 'gpt-4-turbo':
        return '🤖';
      case 'claude-sonnet-4-20250514':
        return '🧠';
      case 'gemini-2.0-flash':
        return '✨';
      default:
        return '🔮';
    }
  };

  // Получаем иконку из lucide-react по имени
  const getIconComponent = (iconName: string) => {
    const iconKey = iconName.split('-').map((word, index) => 
      index === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join('');
    
    const IconComponent = (LucideIcons as any)[iconKey];
    return IconComponent || LucideIcons.User;
  };

  // Парсим варианты выбора из сообщения агента
  const parseChoices = (content: string): { cleanContent: string; choices: string[] } => {
    const choiceRegex = /\[([^\]]+)\]/g;
    const choices: string[] = [];
    let match;
    
    while ((match = choiceRegex.exec(content)) !== null) {
      choices.push(match[1]);
    }
    
    // Если найдены варианты выбора, удаляем их из основного текста
    if (choices.length > 0) {
      const cleanContent = content.replace(choiceRegex, '').trim();
      return { cleanContent, choices };
    }
    
    return { cleanContent: content, choices: [] };
  };

  const { cleanContent, choices } = message.sender === 'agent' ? parseChoices(message.content) : { cleanContent: message.content, choices: [] };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} mb-6`}
    >
      <div className={`max-w-4xl w-full ${message.sender === 'user' ? 'order-2' : 'order-1'}`}>
        {/* Agent messages with enhanced formatting */}
        {message.sender === 'agent' && agent && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    {(() => {
                      const IconComponent = getIconComponent(agent.avatar);
                      return <IconComponent className="w-5 h-5 text-white" />;
                    })()}
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                    agent.isOnline ? 'bg-green-400' : 'bg-gray-400'
                  }`} />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="font-medium text-gray-900">{agent.name}</h4>
                  </div>
                  <p className="text-sm text-gray-500">{agent.role}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <Clock className="h-3 w-3" />
                  <span>{message.timestamp.toLocaleTimeString()}</span>
                </div>
                
                {message.model && (
                  <div className="flex items-center space-x-1 px-2 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-700">
                    <span>{getModelIcon(message.model)}</span>
                    <span>AI-powered</span>
                  </div>
                )}

                <button
                  onClick={() => {
                    if (onInsertText) {
                      onInsertText("Can you repeat that information?");
                    } else {
                      handleCopy();
                    }
                  }}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100 transition-colors"
                  title={onInsertText ? "Ask to repeat" : "Copy message"}
                >
                  {copied ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Content with Markdown support */}
            <div className="p-4">
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown
                  components={{
                    code({ node, inline, className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || '');
                      return !inline && match ? (
                        <SyntaxHighlighter
                          style={tomorrow}
                          language={match[1]}
                          PreTag="div"
                          {...props}
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      ) : (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      );
                    }
                  }}
                >
                  {cleanContent}
                </ReactMarkdown>
              </div>

              {/* Choice Buttons */}
              {choices.length > 0 && (onChoiceSelect || onInsertText) && (
                <ChoiceButtons
                  choices={choices}
                  onChoiceSelect={onInsertText ? (choice, index) => onInsertText(`[Choice ${index + 1}] ${choice}`) : onChoiceSelect!}
                  disabled={false}
                />
              )}

              {/* Quick Reply Buttons - Show only if no choices and we have insert function */}
              {choices.length === 0 && onInsertText && message.sender === 'agent' && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center space-x-2 text-sm text-gray-600 mb-3">
                    <MessageSquare className="h-4 w-4" />
                    <span>Quick replies:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => onInsertText("Can you provide more details?")}
                      className="px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors border border-blue-200"
                    >
                      More details
                    </button>
                    <button
                      onClick={() => onInsertText("Can you give me an example?")}
                      className="px-3 py-2 text-sm bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors border border-green-200"
                    >
                      Give example
                    </button>
                    <button
                      onClick={() => onInsertText("Can you explain this differently?")}
                      className="px-3 py-2 text-sm bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors border border-purple-200"
                    >
                      Explain differently
                    </button>
                    <button
                      onClick={() => onInsertText("What's the next step?")}
                      className="px-3 py-2 text-sm bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors border border-orange-200"
                    >
                      Next step
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200 rounded-b-lg">
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => onInsertText ? onInsertText("This was helpful. Thank you!") : undefined}
                  className="flex items-center space-x-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <ThumbsUp className="h-4 w-4" />
                  <span>Helpful</span>
                </button>
                <button 
                  onClick={() => onInsertText ? onInsertText("This wasn't helpful. Could you please provide more specific information?") : undefined}
                  className="flex items-center space-x-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <ThumbsDown className="h-4 w-4" />
                  <span>Not helpful</span>
                </button>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    if (onInsertText) {
                      onInsertText("Please provide more information about this topic");
                    } else {
                      setShowRating(!showRating);
                    }
                  }}
                  className="flex items-center space-x-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <Star className="w-3 h-3" />
                  <span>{onInsertText ? "Follow up" : "Rate"}</span>
                </button>

                {/* Rating display/input - Only show when not using insert mode */}
                {!onInsertText && (showRating || message.rating) && (
                  <div className="flex items-center space-x-1">
                    {renderStars()}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* User messages */}
        {message.sender === 'user' && (
          <div className="flex justify-end">
            <div className="px-4 py-3 rounded-lg max-w-2xl bg-blue-600 text-white">
              <div className="prose prose-sm prose-invert max-w-none">
                <ReactMarkdown>
                  {message.content}
                </ReactMarkdown>
              </div>
              <div className="text-xs mt-2 text-right text-blue-200">
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default MessageBubble;