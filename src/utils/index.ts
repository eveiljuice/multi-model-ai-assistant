export const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

export const getCategoryColor = (category: string): string => {
  const colors: Record<string, string> = {
    'Development': 'bg-blue-100 text-blue-800',
    'Writing': 'bg-green-100 text-green-800',
    'Analysis': 'bg-purple-100 text-purple-800',
    'Creative': 'bg-pink-100 text-pink-800',
    'Business': 'bg-orange-100 text-orange-800',
    'Research': 'bg-indigo-100 text-indigo-800'
  };
  return colors[category] || 'bg-gray-100 text-gray-800';
};

export const getExperienceBadgeColor = (level: string): string => {
  const colors: Record<string, string> = {
    'Beginner': 'bg-green-500',
    'Intermediate': 'bg-yellow-500',
    'Expert': 'bg-red-500'
  };
  return colors[level] || 'bg-gray-500';
};

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const generateId = (): string => {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    return false;
  }
};