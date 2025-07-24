import React from 'react';
import { Settings } from 'lucide-react';
import { AIModel } from '../types';

interface AIModelSelectorProps {
  selectedModel: AIModel;
  onModelChange: (model: AIModel) => void;
}

const AIModelSelector: React.FC<AIModelSelectorProps> = ({
  selectedModel,
  onModelChange
}) => {
  const models: { value: AIModel; label: string; description: string }[] = [
    {
      value: 'gpt-4.1-turbo',
      label: 'GPT-4.1 Turbo',
      description: 'Most advanced reasoning and creativity'
    },
    {
      value: 'claude-sonnet-4-20250514',
      label: 'Claude 4 Sonnet',
      description: 'Excellent for analysis and long-form content'
    },
    {
      value: 'gemini-2.0-flash',
      label: 'Gemini 2.0 Flash',
      description: 'Great for multimodal tasks and coding'
    }
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2 text-sm font-medium text-gray-700">
        <Settings className="h-4 w-4" />
        <span>AI Model</span>
      </div>
      <select
        value={selectedModel}
        onChange={(e) => onModelChange(e.target.value as AIModel)}
        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white"
      >
        {models.map((model) => (
          <option key={model.value} value={model.value}>
            {model.label} - {model.description}
          </option>
        ))}
      </select>
    </div>
  );
};

export default AIModelSelector;