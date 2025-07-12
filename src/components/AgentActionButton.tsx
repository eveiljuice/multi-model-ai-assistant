import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Tooltip } from './Tooltip';
import { Agent } from '../types';
import { loggingService } from '../services/loggingService';
import * as LucideIcons from 'lucide-react';

interface AgentActionButtonProps {
  agent: Agent;
  action: string;
  description: string;
  outcome: string;
  onAction: (agent: Agent, action: string) => void;
  onInsertText?: (text: string) => void;
  disabled?: boolean;
  className?: string;
}

const AgentActionButton: React.FC<AgentActionButtonProps> = ({
  agent,
  action,
  description,
  outcome,
  onAction,
  onInsertText,
  disabled = false,
  className = ''
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Get agent-specific styling and configuration
  const getAgentConfig = (agentId: string) => {
    const configs = {
      '1': { // Prompt Polisher
        gradient: 'from-purple-600 via-violet-600 to-indigo-600',
        hoverGradient: 'from-purple-700 via-violet-700 to-indigo-700',
        icon: 'Wand2',
        accentColor: 'purple',
        pattern: 'sparkles'
      },
      '2': { // Competitor Analysis
        gradient: 'from-blue-600 via-cyan-600 to-teal-600',
        hoverGradient: 'from-blue-700 via-cyan-700 to-teal-700',
        icon: 'Search',
        accentColor: 'blue',
        pattern: 'radar'
      },
      '3': { // FAQ Generator
        gradient: 'from-green-600 via-emerald-600 to-teal-600',
        hoverGradient: 'from-green-700 via-emerald-700 to-teal-700',
        icon: 'HelpCircle',
        accentColor: 'green',
        pattern: 'questions'
      },
      '4': { // Problem → Insight
        gradient: 'from-orange-600 via-amber-600 to-yellow-600',
        hoverGradient: 'from-orange-700 via-amber-700 to-yellow-700',
        icon: 'Lightbulb',
        accentColor: 'orange',
        pattern: 'insights'
      },
      '5': { // Launch Checklist Generator
        gradient: 'from-red-600 via-pink-600 to-rose-600',
        hoverGradient: 'from-red-700 via-pink-700 to-rose-700',
        icon: 'ClipboardCheck',
        accentColor: 'red',
        pattern: 'checklist'
      },
      '6': { // WhatsApp Response Writer
        gradient: 'from-emerald-600 via-green-600 to-lime-600',
        hoverGradient: 'from-emerald-700 via-green-700 to-lime-700',
        icon: 'MessageCircle',
        accentColor: 'emerald',
        pattern: 'messages'
      },
      '7': { // AI → Human Rewriter
        gradient: 'from-indigo-600 via-blue-600 to-cyan-600',
        hoverGradient: 'from-indigo-700 via-blue-700 to-cyan-700',
        icon: 'UserCheck',
        accentColor: 'indigo',
        pattern: 'humanize'
      },
      '8': { // Humor Rewriter
        gradient: 'from-pink-600 via-rose-600 to-red-600',
        hoverGradient: 'from-pink-700 via-rose-700 to-red-700',
        icon: 'Smile',
        accentColor: 'pink',
        pattern: 'humor'
      }
    };
    return configs[agentId] || configs['1'];
  };

  const config = getAgentConfig(agent.id);
  const IconComponent = (LucideIcons as any)[config.icon] || LucideIcons.Wand2;

  const handleClick = async () => {
    if (disabled) return;

    try {
      setIsPressed(true);
      
      // Log button interaction
      await loggingService.logUserAction('personalized_agent_button_clicked', 'agent_interaction', {
        agentId: agent.id,
        agentName: agent.name,
        action: action,
        buttonType: 'personalized_action_button',
        timestamp: new Date().toISOString()
      });

      // Trigger agent-specific action
      if (onInsertText) {
        onInsertText(action);
      } else {
        onAction(agent, action);
      }

      // Visual feedback
      setTimeout(() => setIsPressed(false), 150);

    } catch (error) {
      console.error('Button interaction failed:', error);
      
      // Log error
      await loggingService.logError({
        errorType: 'agent_button_interaction_error',
        errorMessage: error instanceof Error ? error.message : 'Button interaction failed',
        component: 'AgentActionButton',
        additionalData: {
          agentId: agent.id,
          action: action
        },
        severity: 'medium'
      });

      setIsPressed(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick();
    }
  };

  // Generate unique pattern based on agent
  const getPatternSVG = (pattern: string) => {
    const patterns = {
      sparkles: (
        <svg className="absolute inset-0 w-full h-full opacity-10" viewBox="0 0 100 100">
          <defs>
            <pattern id="sparkles" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="5" cy="5" r="1" fill="white" opacity="0.3"/>
              <circle cx="15" cy="15" r="0.5" fill="white" opacity="0.5"/>
              <circle cx="10" cy="18" r="0.8" fill="white" opacity="0.4"/>
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#sparkles)"/>
        </svg>
      ),
      radar: (
        <svg className="absolute inset-0 w-full h-full opacity-8" viewBox="0 0 100 100">
          <defs>
            <pattern id="radar" x="0" y="0" width="25" height="25" patternUnits="userSpaceOnUse">
              <circle cx="12.5" cy="12.5" r="10" fill="none" stroke="white" strokeWidth="0.5" opacity="0.3"/>
              <circle cx="12.5" cy="12.5" r="5" fill="none" stroke="white" strokeWidth="0.5" opacity="0.5"/>
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#radar)"/>
        </svg>
      ),
      questions: (
        <svg className="absolute inset-0 w-full h-full opacity-8" viewBox="0 0 100 100">
          <text x="10" y="20" fontSize="12" fill="white" opacity="0.3">?</text>
          <text x="70" y="40" fontSize="8" fill="white" opacity="0.4">?</text>
          <text x="30" y="70" fontSize="10" fill="white" opacity="0.3">?</text>
          <text x="80" y="80" fontSize="6" fill="white" opacity="0.5">?</text>
        </svg>
      ),
      default: null
    };
    return patterns[pattern] || patterns.default;
  };

  const tooltipContent = `${description}\n\n💡 ${outcome}`;

  return (
    <Tooltip content={tooltipContent}>
      <motion.button
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        disabled={disabled}
        className={`
          relative overflow-hidden rounded-xl p-4 min-h-[100px] w-full
          focus:outline-none focus:ring-4 focus:ring-opacity-50
          transition-all duration-300 ease-out
          bg-gradient-to-br ${isHovered ? config.hoverGradient : config.gradient}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${className}
        `}
        style={{
          focusRingColor: `var(--color-${config.accentColor}-500)`
        }}
        whileHover={{ scale: disabled ? 1 : 1.02, y: -2 }}
        whileTap={{ scale: disabled ? 1 : 0.98 }}
        animate={{
          boxShadow: isPressed 
            ? `0 4px 20px rgba(0,0,0,0.3), inset 0 2px 4px rgba(0,0,0,0.2)`
            : isHovered 
            ? `0 8px 32px rgba(0,0,0,0.2), 0 4px 16px rgba(0,0,0,0.1)`
            : `0 4px 16px rgba(0,0,0,0.1)`
        }}
        transition={{ duration: 0.2 }}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={`${action} with ${agent.name}`}
        aria-describedby={`tooltip-${agent.id}-${action}`}
      >
        {/* Background Pattern */}
        {getPatternSVG(config.pattern)}
        
        {/* Dark overlay for better text contrast */}
        <div className="absolute inset-0 bg-black bg-opacity-20" />
        
        {/* Shine Effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 hover:opacity-10 transition-opacity duration-500 transform -skew-x-12 translate-x-[-100%] hover:translate-x-[100%]" />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col space-y-3">
          {/* Header with Icon and Action */}
          <div className="flex items-center space-x-3">
            <div className={`
              flex-shrink-0 w-10 h-10 rounded-lg bg-white bg-opacity-25 backdrop-blur-sm
              flex items-center justify-center border border-white border-opacity-20
              ${isPressed ? 'scale-95' : 'scale-100'}
              transition-transform duration-150
            `}>
              <IconComponent className="w-5 h-5 text-white drop-shadow-sm" />
            </div>
            
            <div className="flex-1 text-left">
              <div className="font-semibold text-base mb-1 text-white drop-shadow-sm">
                {action}
              </div>
              <div className="text-xs text-white text-opacity-90 drop-shadow-sm">
                with {agent.name}
              </div>
            </div>
            
            {/* Status Indicator */}
            <div className={`
              w-2 h-2 rounded-full border border-white border-opacity-50
              ${agent.isOnline ? 'bg-green-400' : 'bg-gray-300'}
              ${agent.isOnline && isHovered ? 'animate-pulse' : ''}
            `} />
          </div>

          {/* Description */}
          <div className="text-sm text-white text-opacity-95 drop-shadow-sm leading-relaxed">
            {description}
          </div>

          {/* Outcome Preview */}
          <div className="text-xs text-white text-opacity-80 drop-shadow-sm bg-white bg-opacity-10 rounded-lg p-2 border border-white border-opacity-20">
            💡 {outcome}
          </div>
        </div>
        
        {/* Loading State Overlay */}
        {isPressed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center backdrop-blur-sm"
          >
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </motion.div>
        )}
      </motion.button>
    </Tooltip>
  );
};

export default AgentActionButton;