import React from 'react';
import { Activity, AlertTriangle, CheckCircle } from 'lucide-react';

interface RateLimitStatusProps {
  status: Record<string, any>;
}

const RateLimitStatus: React.FC<RateLimitStatusProps> = ({ status }) => {
  const getStatusColor = (used: number, limit: number) => {
    const percentage = (used / limit) * 100;
    if (percentage >= 90) return 'text-red-600 bg-red-100';
    if (percentage >= 70) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  const getStatusIcon = (used: number, limit: number) => {
    const percentage = (used / limit) * 100;
    if (percentage >= 90) return <AlertTriangle className="h-4 w-4" />;
    if (percentage >= 70) return <Activity className="h-4 w-4" />;
    return <CheckCircle className="h-4 w-4" />;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">API Rate Limits</h3>
      
      <div className="space-y-4">
        {Object.entries(status).map(([provider, data]: [string, any]) => (
          <div key={provider} className="space-y-2">
            <h4 className="font-medium text-gray-700 capitalize">{provider}</h4>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Requests */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Requests</span>
                  <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(data.requests.used, data.requests.limit)}`}>
                    {getStatusIcon(data.requests.used, data.requests.limit)}
                    <span>{data.requests.used}/{data.requests.limit}</span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      (data.requests.used / data.requests.limit) >= 0.9 
                        ? 'bg-red-500' 
                        : (data.requests.used / data.requests.limit) >= 0.7 
                        ? 'bg-yellow-500' 
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min((data.requests.used / data.requests.limit) * 100, 100)}%` }}
                  />
                </div>
              </div>

              {/* Tokens */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Tokens</span>
                  <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(data.tokens.used, data.tokens.limit)}`}>
                    {getStatusIcon(data.tokens.used, data.tokens.limit)}
                    <span>{data.tokens.used.toLocaleString()}/{data.tokens.limit.toLocaleString()}</span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      (data.tokens.used / data.tokens.limit) >= 0.9 
                        ? 'bg-red-500' 
                        : (data.tokens.used / data.tokens.limit) >= 0.7 
                        ? 'bg-yellow-500' 
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min((data.tokens.used / data.tokens.limit) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500">
        <p>Rate limits reset every minute. High usage may result in temporary throttling.</p>
      </div>
    </div>
  );
};

export default RateLimitStatus;