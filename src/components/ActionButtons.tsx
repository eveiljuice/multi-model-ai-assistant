import React from 'react';
import { motion } from 'framer-motion';
import { Agent } from '../types';
import AgentActionButton from './AgentActionButton';

interface ActionButtonsProps {
  actions: string[];
  onAction: (action: string) => void;
  onInsertText?: (text: string) => void;
  agent?: Agent;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({ actions, onAction, onInsertText, agent }) => {
  if (!agent) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-white text-2xl">🤖</span>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Select an agent to begin
        </h3>
        <p className="text-gray-600 text-sm">
          Personalized buttons will appear after selecting an agent
        </p>
      </div>
    );
  }

  // Define personalized actions for each agent with descriptions (максимум 3 кнопки)
  const getAgentActions = (agentId: string): Array<{action: string, description: string, outcome: string}> => {
    const actionMap: Record<string, Array<{action: string, description: string, outcome: string}>> = {
      '1': [ // Prompt Polisher - 3 кнопки
        {
          action: 'Optimize My Prompt',
          description: 'Transform your rough prompt into a professional AI instruction',
          outcome: 'Get an improved version with explanations of what makes it better'
        },
        {
          action: 'Prompt Health Check',
          description: 'Analyze your existing prompt for effectiveness',
          outcome: 'Receive detailed feedback and improvement suggestions'
        },
        {
          action: 'Create Custom Prompt',
          description: 'Build a new prompt from scratch for your specific needs',
          outcome: 'Get a tailored prompt with usage guidelines'
        }
      ],
      '2': [ // Competitor Analysis - 3 кнопки
        {
          action: 'Analyze Competitor Website',
          description: 'Deep dive into a competitor\'s online presence and strategy',
          outcome: 'Receive comprehensive analysis with strengths, weaknesses, and opportunities'
        },
        {
          action: 'Social Media Audit',
          description: 'Examine competitor\'s social media strategy and content',
          outcome: 'Get insights on their content strategy and engagement tactics'
        },
        {
          action: 'Market Position Analysis',
          description: 'Understand how competitors position themselves in the market',
          outcome: 'Learn about their value propositions and target audience approach'
        }
      ],
      '3': [ // FAQ Generator - 3 кнопки
        {
          action: 'Generate Product FAQ',
          description: 'Create comprehensive FAQ section for your product or service',
          outcome: 'Get 10-15 relevant questions with detailed answers'
        },
        {
          action: 'Customer Support FAQ',
          description: 'Build FAQ for common customer service inquiries',
          outcome: 'Receive ready-to-use support questions and responses'
        },
        {
          action: 'Technical FAQ',
          description: 'Create FAQ for technical products or complex services',
          outcome: 'Get technical questions explained in simple terms'
        }
      ],
      '4': [ // Problem → Insight - 3 кнопки
        {
          action: 'Transform Pain Points',
          description: 'Convert customer problems into compelling value propositions',
          outcome: 'Get 3-5 powerful value statements with usage examples'
        },
        {
          action: 'Insight Discovery',
          description: 'Uncover hidden opportunities from customer feedback',
          outcome: 'Receive actionable insights and marketing angles'
        },
        {
          action: 'Value Proposition Builder',
          description: 'Create compelling value propositions from problem statements',
          outcome: 'Get structured value props ready for marketing materials'
        }
      ],
      '5': [ // Launch Checklist Generator - 3 кнопки
        {
          action: 'Product Launch Checklist',
          description: 'Create comprehensive checklist for product launches',
          outcome: 'Get detailed timeline with tasks, deadlines, and responsibilities'
        },
        {
          action: 'Marketing Campaign Checklist',
          description: 'Build checklist for marketing campaign execution',
          outcome: 'Receive step-by-step campaign launch guide'
        },
        {
          action: 'Event Launch Checklist',
          description: 'Generate checklist for event planning and execution',
          outcome: 'Get organized timeline from planning to post-event follow-up'
        }
      ],
      '6': [ // WhatsApp Response Writer - 3 кнопки
        {
          action: 'Craft Sales Response',
          description: 'Create persuasive responses for sales conversations',
          outcome: 'Get 2-3 response options with different approaches'
        },
        {
          action: 'Customer Service Reply',
          description: 'Generate professional customer service responses',
          outcome: 'Receive empathetic and solution-focused message options'
        },
        {
          action: 'Follow-up Message',
          description: 'Create effective follow-up messages for prospects',
          outcome: 'Get engaging follow-up sequences that drive action'
        }
      ],
      '7': [ // AI → Human Rewriter - 3 кнопки
        {
          action: 'Humanize AI Text',
          description: 'Transform robotic AI content into natural, human-like writing',
          outcome: 'Get rewritten text with personality and natural flow'
        },
        {
          action: 'Add Personality',
          description: 'Inject character and voice into bland content',
          outcome: 'Receive content with distinct personality and tone'
        },
        {
          action: 'Conversational Rewrite',
          description: 'Convert formal text into conversational, engaging content',
          outcome: 'Get approachable, friendly version of your content'
        }
      ],
      '8': [ // Humor Rewriter - 3 кнопки
        {
          action: 'Add Humor',
          description: 'Inject appropriate humor into serious or boring content',
          outcome: 'Get entertaining version while maintaining core message'
        },
        {
          action: 'Witty Rewrite',
          description: 'Transform content with clever wordplay and wit',
          outcome: 'Receive engaging, memorable version with smart humor'
        },
        {
          action: 'Lighten the Tone',
          description: 'Make heavy or formal content more approachable with light humor',
          outcome: 'Get balanced content that\'s informative yet entertaining'
        }
      ]
    };
    
    return actionMap[agentId] || [
      {
        action: 'Get Started',
        description: 'Begin working with this agent',
        outcome: 'Receive personalized assistance based on agent expertise'
      }
    ];
  };

  const handleAgentAction = (selectedAgent: Agent, action: string) => {
    if (onInsertText) {
      onInsertText(action);
    } else {
      onAction(action);
    }
  };

  const availableActions = getAgentActions(agent.id);

  return (
    <div className="space-y-4">
      {/* Agent Header */}
      <div className="text-center pb-4 border-b border-gray-200">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
          <span className="text-white font-semibold">
            {agent.name.charAt(0)}
          </span>
        </div>
        <h3 className="font-semibold text-gray-900 mb-1">
          {agent.name}
        </h3>
        <p className="text-sm text-gray-600 mb-2">
          {agent.role}
        </p>
        <p className="text-xs text-gray-500 line-clamp-2">
          {agent.specialty}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        {availableActions.map((actionItem, index) => (
          <motion.div
            key={actionItem.action}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <AgentActionButton
              agent={agent}
              action={actionItem.action}
              description={actionItem.description}
              outcome={actionItem.outcome}
              onAction={handleAgentAction}
              onInsertText={onInsertText}
              disabled={!agent.isOnline}
            />
          </motion.div>
        ))}
      </div>

      {/* Agent Status */}
      <div className="pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              agent.isOnline ? 'bg-green-400' : 'bg-gray-400'
            }`} />
            <span>{agent.isOnline ? 'Online' : 'Offline'}</span>
          </div>
          <div className="flex items-center space-x-4">
            <span>⭐ {agent.rating.toFixed(1)}</span>
            <span>{agent.responseTime}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActionButtons;