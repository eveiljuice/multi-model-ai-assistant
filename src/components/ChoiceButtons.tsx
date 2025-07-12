import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, MessageSquare } from 'lucide-react';

interface ChoiceButtonsProps {
  choices: string[];
  onChoiceSelect: (choice: string, index: number) => void;
  disabled?: boolean;
}

const ChoiceButtons: React.FC<ChoiceButtonsProps> = ({
  choices,
  onChoiceSelect,
  disabled = false
}) => {
  if (!choices || choices.length === 0) return null;

  return (
    <div className="space-y-2 mt-4">
      <div className="flex items-center space-x-2 text-sm text-gray-600 mb-3">
        <MessageSquare className="h-4 w-4" />
        <span>Click to insert into message:</span>
      </div>
      {choices.map((choice, index) => (
        <motion.button
          key={index}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          onClick={() => onChoiceSelect(choice, index)}
          disabled={disabled}
          className={`
            w-full text-left p-3 rounded-lg border transition-all duration-200
            ${disabled 
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200' 
              : 'bg-white text-gray-700 hover:bg-blue-50 hover:border-blue-300 border-gray-200 hover:shadow-sm'
            }
            flex items-center justify-between group
          `}
        >
          <span className="flex-1 text-sm">
            [{index + 1}] {choice}
          </span>
          <ChevronRight className={`h-4 w-4 transition-transform ${
            disabled ? 'text-gray-300' : 'text-gray-400 group-hover:text-blue-500 group-hover:translate-x-1'
          }`} />
        </motion.button>
      ))}
    </div>
  );
};

export default ChoiceButtons;