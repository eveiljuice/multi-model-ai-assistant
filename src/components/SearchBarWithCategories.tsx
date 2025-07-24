import React, { useState } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AgentCategory, SearchFilters } from '../types';

interface SearchBarWithCategoriesProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
}

const SearchBarWithCategories: React.FC<SearchBarWithCategoriesProps> = ({
  searchQuery,
  onSearchChange,
  filters,
  onFiltersChange
}) => {
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);

  const categories: (AgentCategory | 'All')[] = [
    'All', 'Development', 'Writing', 'Analysis', 'Creative', 'Business', 'Research'
  ];

  const handleCategoryChange = (category: AgentCategory | 'All') => {
    onFiltersChange({ ...filters, category });
    setIsCategoriesOpen(false);
  };

  const getCurrentCategoryLabel = () => {
    return filters.category === 'All' ? 'All Categories' : filters.category;
  };

  return (
    <div className="pb-4 pt-2">
      <div className="max-w-2xl mx-auto">
        {/* Search Bar with Category Button */}
        <div className="flex gap-2 items-center">
          {/* Search Bar */}
          <div className="relative group flex-1">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 
                               transition-colors duration-200" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="block w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl 
                       bg-white/90 backdrop-blur-sm placeholder-gray-500 text-gray-900
                       focus:outline-none focus:placeholder-gray-400 focus:ring-2 
                       focus:ring-blue-500/20 focus:border-blue-500 shadow-sm 
                       hover:shadow-md transition-all duration-200 text-base"
              placeholder="Search agents by name, skills, or specialization..."
            />
          </div>

          {/* Category Selector */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setIsCategoriesOpen(!isCategoriesOpen)}
              className="flex items-center gap-1.5 px-3 py-3 bg-white border border-gray-200 
                       rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 
                       shadow-sm hover:shadow-md focus:outline-none focus:ring-2 
                       focus:ring-blue-500/20 focus:border-blue-500 h-12"
              title="Select category"
            >
              <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                {filters.category === 'All' ? 'Category' : filters.category}
              </span>
              <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 
                                     ${isCategoriesOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Categories Dropdown */}
            <AnimatePresence>
              {isCategoriesOpen && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setIsCategoriesOpen(false)}
                  />
                  
                  {/* Dropdown Menu */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full mt-2 right-0 w-48 bg-white rounded-xl 
                             shadow-lg border border-gray-200 py-2 z-40 max-h-80 overflow-y-auto"
                  >
                    <div className="px-3 py-2 border-b border-gray-100">
                      <h4 className="text-sm font-medium text-gray-900">Select Category</h4>
                    </div>
                    
                    <div className="py-2">
                      {categories.map((category) => (
                        <button
                          key={category}
                          onClick={() => handleCategoryChange(category)}
                          className={`w-full text-left px-4 py-2 text-sm transition-colors 
                                   hover:bg-gray-50 flex items-center justify-between ${
                            filters.category === category 
                              ? 'bg-blue-50 text-blue-700 font-medium' 
                              : 'text-gray-700'
                          }`}
                        >
                          <span>{category}</span>
                          {filters.category === category && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full" />
                          )}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Active Category Display */}
        {filters.category !== 'All' && (
          <div className="mt-2 flex justify-start">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 
                          text-blue-700 text-sm rounded-full">
              <span>Category: {filters.category}</span>
              <button
                onClick={() => handleCategoryChange('All')}
                className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                title="Clear category filter"
              >
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchBarWithCategories; 