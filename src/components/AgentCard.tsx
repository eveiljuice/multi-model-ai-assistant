import React from 'react';
import { Star, MessageCircle, Clock, Globe, DollarSign } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Agent } from '../types';
import { formatNumber, getCategoryColor, getExperienceBadgeColor } from '../utils';
import { useCredits } from '../contexts/CreditContext';
import { useAuth } from '../contexts/AuthContext';

interface AgentCardProps {
  agent: Agent;
  onSelect: (agent: Agent) => void;
}

const AgentCard: React.FC<AgentCardProps> = ({ agent, onSelect }) => {
  const { user } = useAuth();
  const { checkCanUseAgent } = useCredits();
  const [creditStatus, setCreditStatus] = React.useState<{
    canUse: boolean;
    required: number;
    available: number;
  } | null>(null);
  const [isLoadingCredits, setIsLoadingCredits] = React.useState(false);

  // Check credit status when component mounts
  React.useEffect(() => {
    if (user) {
      const checkCredits = async () => {
        setIsLoadingCredits(true);
        try {
          const status = await checkCanUseAgent(agent.id);
          setCreditStatus(status);
        } finally {
          setIsLoadingCredits(false);
        }
      };
      checkCredits();
    } else {
      // Reset states when user logs out
      setCreditStatus(null);
      setIsLoadingCredits(false);
    }
  }, [user, agent.id, checkCanUseAgent]);

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Star key={i} className="h-4 w-4 fill-current text-yellow-400" />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <div key="half" className="relative">
          <Star className="h-4 w-4 text-gray-300" />
          <div className="absolute inset-0 overflow-hidden w-1/2">
            <Star className="h-4 w-4 fill-current text-yellow-400" />
          </div>
        </div>
      );
    }

    const remainingStars = 5 - Math.ceil(rating);
    for (let i = 0; i < remainingStars; i++) {
      stars.push(
        <Star key={`empty-${i}`} className="h-4 w-4 text-gray-300" />
      );
    }

    return stars;
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

  const IconComponent = getIconComponent(agent.avatar);

  // Get credit cost display
  const getCreditCost = () => {
    if (!creditStatus) return null;
    
    return (
      <div className="flex items-center space-x-1 text-xs">
        <DollarSign className="h-3 w-3 text-gray-500" />
        <span className={`${creditStatus.canUse ? 'text-gray-500' : 'text-red-500'}`}>
          {creditStatus.required} credit{creditStatus.required !== 1 ? 's' : ''}
        </span>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300 hover:border-blue-300 hover:-translate-y-1 group min-h-[480px] max-h-[520px] sm:min-h-[500px] sm:max-h-[540px] flex flex-col backdrop-blur-sm">
      <div className="p-4 sm:p-6 flex-1 flex flex-col overflow-hidden">
        {/* Header - Fixed height */}
        <div className="flex items-start justify-between mb-4 h-16">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <div className="relative flex-shrink-0">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 flex items-center justify-center shadow-lg ring-2 ring-blue-100 group-hover:ring-blue-200 transition-all duration-300">
                <IconComponent className="w-6 h-6 text-white drop-shadow-sm" />
              </div>
              <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm ${
                agent.isOnline ? 'bg-emerald-400' : 'bg-slate-400'
              }`} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold text-gray-900 group-hover:text-blue-600 truncate">
                {agent.name}
              </h3>
              <p className="text-sm text-gray-600 truncate">{agent.role}</p>
            </div>
          </div>
          <div className="flex flex-col items-end space-y-1 flex-shrink-0 ml-2">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold shadow-sm border transition-colors ${getCategoryColor(agent.category)}`}>
              {agent.category}
            </span>
            <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${getExperienceBadgeColor(agent.experienceLevel)}`} />
          </div>
        </div>

        {/* Credit Cost Badge - Show for authenticated users */}
        {user && (
          <div className="mb-3">
            {isLoadingCredits ? (
              <div className="flex items-center space-x-2 bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200 rounded-xl p-2.5 sm:p-3 shadow-sm">
                <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gray-100">
                  <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-gray-600"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-gray-800">
                    Checking credits...
                  </div>
                  <div className="text-xs text-gray-600 truncate">
                    Please wait while we verify your balance
                  </div>
                </div>
              </div>
            ) : creditStatus && (
              <div className={`flex items-center space-x-2 ${
                creditStatus.canUse 
                  ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200' 
                  : 'bg-gradient-to-r from-red-50 to-rose-50 border border-red-200'
              } rounded-xl p-2.5 sm:p-3 shadow-sm`}>
                <div className={`flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg ${
                  creditStatus.canUse ? 'bg-blue-100' : 'bg-red-100'
                }`}>
                  <DollarSign className={`h-3 w-3 sm:h-4 sm:w-4 ${
                    creditStatus.canUse ? 'text-blue-600' : 'text-red-600'
                  } flex-shrink-0`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-xs font-semibold ${
                    creditStatus.canUse ? 'text-blue-800' : 'text-red-800'
                  }`}>
                    {creditStatus.canUse 
                      ? `Costs ${creditStatus.required} credit${creditStatus.required !== 1 ? 's' : ''} per use` 
                      : `Requires ${creditStatus.required} credit${creditStatus.required !== 1 ? 's' : ''}`}
                  </div>
                  <div className={`text-xs ${
                    creditStatus.canUse ? 'text-blue-600' : 'text-red-600'
                  } truncate`}>
                    {creditStatus.canUse 
                      ? `You have ${creditStatus.available} credit${creditStatus.available !== 1 ? 's' : ''}` 
                      : `You only have ${creditStatus.available} credit${creditStatus.available !== 1 ? 's' : ''}`}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Specialty - Fixed height with overflow handling */}
        <div className="mb-3 h-12">
          <p className="text-gray-700 text-sm leading-relaxed line-clamp-2 overflow-hidden">
            {agent.specialty}
          </p>
        </div>

        {/* Description - Fixed height with overflow handling */}
        <div className="mb-3 h-14">
          <p className="text-gray-600 text-xs leading-relaxed line-clamp-3 overflow-hidden">
            {agent.description}
          </p>
        </div>

        {/* Rating - Fixed height */}
        <div className="flex items-center space-x-2 mb-3 h-5">
          <div className="flex items-center space-x-1">
            {renderStars(agent.rating)}
          </div>
          <span className="text-sm font-medium text-gray-900">
            {agent.rating.toFixed(1)}
          </span>
          <span className="text-sm text-gray-500">
            ({formatNumber(agent.totalInteractions)})
          </span>
        </div>

        {/* Skills - Fixed height with overflow handling */}
        <div className="mb-3 h-8">
          <div className="flex flex-wrap gap-1 overflow-hidden">
            {agent.skills.slice(0, 3).map((skill, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 truncate max-w-[80px]"
                title={skill}
              >
                {skill}
              </span>
            ))}
            {agent.skills.length > 3 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                +{agent.skills.length - 3}
              </span>
            )}
          </div>
        </div>



        {/* Spacer to push content to optimal position */}
        <div className="flex-1 min-h-0"></div>
        
        {/* Action Button - Positioned within card boundaries */}
        <div className="mt-auto pt-3 pb-1 sm:pt-4 sm:pb-2">
          <button
            onClick={() => {
              if (!user) {
                // If not authenticated, pass to parent (will show auth modal)
                onSelect(agent);
              } else if (user && !isLoadingCredits && creditStatus && !creditStatus.canUse) {
                // If insufficient credits, redirect to pricing
                window.location.href = '/pricing';
              } else {
                // If authenticated and has credits (or still loading), proceed to chat
                onSelect(agent);
              }
            }}
            className={`w-full px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] ring-1 text-sm sm:text-base ${
              // Show orange style only when we know for sure the user doesn't have enough credits
              user && !isLoadingCredits && creditStatus && !creditStatus.canUse
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white ring-amber-500/20'
                : 'bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-700 hover:via-blue-800 hover:to-indigo-800 text-white ring-blue-500/20'
            }`}
          >
                      {!user ? (
            <>
              <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>Open Chat</span>
            </>
          ) : user && !isLoadingCredits && creditStatus && !creditStatus.canUse ? (
            <>
              <DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>Get Credits</span>
            </>
          ) : (
            <>
              <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>Open Chat</span>
            </>
          )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgentCard;