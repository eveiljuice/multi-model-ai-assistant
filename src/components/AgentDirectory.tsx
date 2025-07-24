import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Agent, SearchFilters } from '../types';
import { searchAgents } from '../utils/api';
import { debounce } from '../utils';
import { loggingService } from '../services/loggingService';
import AgentCard from './AgentCard';
import SkeletonCard from './SkeletonCard';
import AddAgentCard from './AddAgentCard';
import SuggestIdeaModal from './SuggestIdeaModal';

interface AgentDirectoryProps {
  searchQuery: string;
  filters: SearchFilters;
  onAgentSelect: (agent: Agent) => void;
}

const AgentDirectory: React.FC<AgentDirectoryProps> = ({
  searchQuery,
  filters,
  onAgentSelect
}) => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSuggestIdeaModalOpen, setIsSuggestIdeaModalOpen] = useState(false);

  const debouncedSearch = debounce(async (query: string, currentFilters: SearchFilters) => {
    const searchStartTime = Date.now();
    
    try {
      setLoading(true);
      setError(null);
      
      // Log search start
      loggingService.logActivity({
        eventType: 'agent_search_started',
        eventCategory: 'search',
        eventData: {
          query,
          filters: currentFilters
        }
      });
      
      const results = await searchAgents(query, currentFilters);
      const searchTime = Date.now() - searchStartTime;
      
      setAgents(results);
      
      // Log search completion
      loggingService.logSearch(query, results.length, currentFilters);
      loggingService.logAPIResponseTime('agent_search', searchTime, true);
      
    } catch (err) {
      const searchTime = Date.now() - searchStartTime;
      const errorMessage = 'Failed to load agents. Please try again.';
      
      setError(errorMessage);
      
      // Log search error
      loggingService.logError({
        errorType: 'agent_search_error',
        errorMessage: err instanceof Error ? err.message : errorMessage,
        errorStack: err instanceof Error ? err.stack : undefined,
        component: 'AgentDirectory',
        additionalData: {
          query,
          filters: currentFilters
        },
        severity: 'medium'
      });
      
      loggingService.logAPIResponseTime('agent_search', searchTime, false);
      
    } finally {
      setLoading(false);
    }
  }, 300);

  useEffect(() => {
    const searchFilters = { ...filters, query: searchQuery };
    debouncedSearch(searchQuery, searchFilters);
  }, [searchQuery, filters]);

  const handleRetry = () => {
    loggingService.logUserAction('search_retry', 'agent_directory');
    const searchFilters = { ...filters, query: searchQuery };
    debouncedSearch(searchQuery, searchFilters);
  };

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-red-500 text-lg mb-2">⚠️ {error}</div>
          <button
            onClick={handleRetry}
            className="text-blue-600 hover:text-blue-700 underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Results Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {searchQuery ? `Search results for "${searchQuery}"` : 'Available Agents'}
        </h2>
        <p className="text-gray-600 mt-1">
          {loading ? 'Searching...' : `Found ${agents.length} agent${agents.length === 1 ? '' : 's'}${agents.length > 0 ? ' + suggest new' : ''}`}
        </p>
      </div>

      {/* Agent Grid */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="agent-grid"
          >
            {Array.from({ length: 7 }).map((_, index) => (
              <SkeletonCard key={index} />
            ))}
            {/* Always show AddAgentCard last, even during loading */}
            <AddAgentCard onSuggestIdea={() => setIsSuggestIdeaModalOpen(true)} />
          </motion.div>
        ) : agents.length > 0 ? (
          <motion.div
            key="agents"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="agent-grid"
          >
            {agents.map((agent, index) => (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <AgentCard agent={agent} onSelect={onAgentSelect} />
              </motion.div>
            ))}
            
            {/* Always show AddAgentCard last */}
            <motion.div
              key="add-agent"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: agents.length * 0.1 }}
            >
              <AddAgentCard onSuggestIdea={() => setIsSuggestIdeaModalOpen(true)} />
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* No agents found message */}
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No agents found</h3>
              <p className="text-gray-600">
                Try adjusting your search parameters or filters to find the right agent.
              </p>
            </div>
            
            {/* Always show AddAgentCard even when no agents found */}
            <div className="agent-grid">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <AddAgentCard onSuggestIdea={() => setIsSuggestIdeaModalOpen(true)} />
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Suggest Idea Modal */}
      <SuggestIdeaModal
        isOpen={isSuggestIdeaModalOpen}
        onClose={() => setIsSuggestIdeaModalOpen(false)}
      />
    </div>
  );
};

export default AgentDirectory;