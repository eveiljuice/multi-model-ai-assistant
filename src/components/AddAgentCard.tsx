import React from 'react';
import { Plus } from 'lucide-react';

interface AddAgentCardProps {
  onSuggestIdea: () => void;
}

const AddAgentCard: React.FC<AddAgentCardProps> = ({ onSuggestIdea }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border-2 border-dashed border-gray-300 hover:border-gray-400 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group h-[495px] flex flex-col backdrop-blur-sm">
      <div className="p-6 flex-1 flex flex-col items-center justify-center">
        {/* Plus Icon */}
        <div className="mb-6 transform transition-all duration-300 group-hover:scale-110">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center shadow-lg ring-2 ring-gray-100 group-hover:ring-gray-200 transition-all duration-300">
            <Plus className="w-10 h-10 text-gray-400 group-hover:text-gray-600 transition-colors duration-300" />
          </div>
        </div>

        {/* Main Text */}
        <div className="text-center mb-6 space-y-2">
          <h3 className="text-lg font-semibold text-gray-600 group-hover:text-gray-800 transition-colors duration-300">
            Suggest New Agent
          </h3>
          <p className="text-sm text-gray-500 group-hover:text-gray-600 transition-colors duration-300 max-w-[200px] leading-relaxed">
            Propose an idea for a new AI agent or specialization
          </p>
        </div>

        {/* Features list */}
        <div className="text-center space-y-2 mb-8">
          <div className="flex items-center justify-center space-x-2 text-xs text-gray-400">
            <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
            <span>Personalized agent</span>
          </div>
          <div className="flex items-center justify-center space-x-2 text-xs text-gray-400">
            <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
            <span>Unique specialization</span>
          </div>
          <div className="flex items-center justify-center space-x-2 text-xs text-gray-400">
            <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
            <span>Fast implementation</span>
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1"></div>

        {/* Action Button */}
        <button
          onClick={() => {
            // Add click animation
            const button = document.activeElement as HTMLElement;
            if (button) {
              button.style.transform = 'scale(0.95)';
              setTimeout(() => {
                button.style.transform = 'scale(1)';
              }, 150);
            }
            onSuggestIdea();
          }}
          className="w-full px-4 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center space-x-2 mt-auto shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] ring-1 bg-gradient-to-r from-gray-500 via-gray-600 to-gray-700 hover:from-gray-600 hover:via-gray-700 hover:to-gray-800 text-white ring-gray-500/20"
        >
          <Plus className="h-4 w-4" />
          <span>Suggest Idea</span>
        </button>
      </div>
    </div>
  );
};

export default AddAgentCard; 