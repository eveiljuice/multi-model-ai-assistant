import { Agent, ChatMessage, AIModel } from '../types';
import { mockAgents } from '../data/mockAgents';

// Simulate API delays
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const searchAgents = async (query: string, filters: any): Promise<Agent[]> => {
  await delay(300); // Simulate debounced search
  
  let filteredAgents = [...mockAgents];
  
  if (query) {
    const searchQuery = query.toLowerCase();
    filteredAgents = filteredAgents.filter(agent =>
      agent.name.toLowerCase().includes(searchQuery) ||
      agent.specialty.toLowerCase().includes(searchQuery) ||
      agent.skills.some(skill => skill.toLowerCase().includes(searchQuery))
    );
  }
  
  if (filters.category && filters.category !== 'All') {
    filteredAgents = filteredAgents.filter(agent => agent.category === filters.category);
  }
  
  if (filters.experienceLevel && filters.experienceLevel !== 'All') {
    filteredAgents = filteredAgents.filter(agent => agent.experienceLevel === filters.experienceLevel);
  }
  
  if (filters.minRating > 0) {
    filteredAgents = filteredAgents.filter(agent => agent.rating >= filters.minRating);
  }
  
  // Sort results
  switch (filters.sortBy) {
    case 'rating':
      filteredAgents.sort((a, b) => b.rating - a.rating);
      break;
    case 'popularity':
      filteredAgents.sort((a, b) => b.totalInteractions - a.totalInteractions);
      break;
    default:
      break;
  }
  
  return filteredAgents;
};

export const sendMessage = async (
  content: string,
  agentId: string,
  model: AIModel
): Promise<ChatMessage> => {
  await delay(1000 + Math.random() * 2000); // Simulate response time
  
  const agent = mockAgents.find(a => a.id === agentId);
  const responses = [
    `Based on your question, I'd recommend focusing on the core principles first. Let me break this down for you...`,
    `That's an excellent question! From my experience, the best approach would be to...`,
    `I understand your concern. Here's how I would tackle this challenge...`,
    `Great point! Let me provide you with a comprehensive solution...`,
    `This is definitely something I can help you with. My recommendation would be...`
  ];
  
  const response: ChatMessage = {
    id: Date.now().toString(),
    content: responses[Math.floor(Math.random() * responses.length)] + ` [Response from ${agent?.name} using ${model}]`,
    timestamp: new Date(),
    sender: 'agent',
    agentId,
    model
  };
  
  return response;
};

export const exportConversation = async (
  messages: ChatMessage[],
  format: 'pdf' | 'txt' | 'md',
  options: any
): Promise<string> => {
  await delay(500);
  
  let content = '';
  
  if (format === 'md') {
    content = '# Conversation Export\n\n';
    messages.forEach(msg => {
      content += `**${msg.sender === 'user' ? 'You' : 'Agent'}** (${msg.timestamp.toLocaleString()})\n\n`;
      content += `${msg.content}\n\n`;
      if (msg.rating && options.includeRatings) {
        content += `*Rating: ${msg.rating}/5*\n\n`;
      }
      content += '---\n\n';
    });
  } else if (format === 'txt') {
    messages.forEach(msg => {
      content += `${msg.sender === 'user' ? 'You' : 'Agent'} (${msg.timestamp.toLocaleString()})\n`;
      content += `${msg.content}\n`;
      if (msg.rating && options.includeRatings) {
        content += `Rating: ${msg.rating}/5\n`;
      }
      content += '\n';
    });
  }
  
  return content;
};