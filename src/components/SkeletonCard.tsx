import React from 'react';

const SkeletonCard: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse h-[420px] flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between mb-4 h-16">
        <div className="flex items-center space-x-3 min-w-0 flex-1">
          <div className="w-12 h-12 bg-gray-300 rounded-full flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="h-4 bg-gray-300 rounded w-24 mb-2" />
            <div className="h-3 bg-gray-300 rounded w-20" />
          </div>
        </div>
        <div className="h-6 bg-gray-300 rounded w-16 flex-shrink-0" />
      </div>

      {/* Specialty */}
      <div className="mb-4 h-12">
        <div className="h-3 bg-gray-300 rounded w-full mb-2" />
        <div className="h-3 bg-gray-300 rounded w-3/4" />
      </div>

      {/* Description */}
      <div className="mb-4 h-16">
        <div className="space-y-2">
          <div className="h-3 bg-gray-300 rounded w-full" />
          <div className="h-3 bg-gray-300 rounded w-full" />
          <div className="h-3 bg-gray-300 rounded w-2/3" />
        </div>
      </div>

      {/* Rating */}
      <div className="flex items-center space-x-2 mb-4 h-5">
        <div className="flex space-x-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="w-4 h-4 bg-gray-300 rounded" />
          ))}
        </div>
        <div className="h-3 bg-gray-300 rounded w-16" />
      </div>

      {/* Skills */}
      <div className="mb-4 h-8">
        <div className="flex space-x-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-6 bg-gray-300 rounded-full w-16" />
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="flex justify-between mb-4 h-5">
        <div className="h-3 bg-gray-300 rounded w-20" />
        <div className="h-3 bg-gray-300 rounded w-16" />
      </div>

      {/* Spacer */}
      <div className="flex-1"></div>

      {/* Button */}
      <div className="h-10 bg-gray-300 rounded mt-auto" />
    </div>
  );
};

export default SkeletonCard;