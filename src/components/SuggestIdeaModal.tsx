import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Lightbulb, 
  Send, 
  Loader2,
  User,
  Bot,
  Palette,
  Plug,
  HelpCircle,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabaseClient';
import { loggingService } from '../services/loggingService';

interface SuggestIdeaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type IdeaCategory = 'new_agent' | 'feature_improvement' | 'ui_enhancement' | 'integration' | 'other';
type Priority = 'low' | 'medium' | 'high' | 'urgent';

// Упрощаем интерфейс - убираем дублирующие поля
interface SubmissionResult {
  success: boolean;
  error?: string;
  ideaId?: string;
}

const SuggestIdeaModal: React.FC<SuggestIdeaModalProps> = ({
  isOpen,
  onClose
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<SubmissionResult | null>(null);
  const [error, setError] = useState('');
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<IdeaCategory>('new_agent');
  const [priority, setPriority] = useState<Priority>('medium');

  const categories = [
    {
      value: 'new_agent' as IdeaCategory,
      label: 'New Agent',
      description: 'Suggest a new AI agent with specific capabilities',
      icon: Bot
    },
    {
      value: 'feature_improvement' as IdeaCategory,
      label: 'Feature Improvement',
      description: 'Enhance existing features or agent capabilities',
      icon: Lightbulb
    },
    {
      value: 'ui_enhancement' as IdeaCategory,
      label: 'UI Enhancement',
      description: 'Improve user interface and user experience',
      icon: Palette
    },
    {
      value: 'integration' as IdeaCategory,
      label: 'Integration',
      description: 'Connect with external tools and services',
      icon: Plug
    },
    {
      value: 'other' as IdeaCategory,
      label: 'Other',
      description: 'Any other suggestions or feedback',
      icon: HelpCircle
    }
  ];

  const priorities = [
    { value: 'low' as Priority, label: 'Low', color: 'text-gray-600' },
    { value: 'medium' as Priority, label: 'Medium', color: 'text-blue-600' },
    { value: 'high' as Priority, label: 'High', color: 'text-orange-600' },
    { value: 'urgent' as Priority, label: 'Urgent', color: 'text-red-600' }
  ];

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory('new_agent');
    setPriority('medium');
    setError('');
    setSuccess(false);
    setSubmissionResult(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validateForm = () => {
    if (!title.trim()) {
      setError('Title is required');
      return false;
    }
    if (title.length < 5) {
      setError('Title must be at least 5 characters long');
      return false;
    }
    if (!description.trim()) {
      setError('Description is required');
      return false;
    }
    if (description.length < 20) {
      setError('Description must be at least 20 characters long');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    const ideaData = {
      title: title.trim(),
      description: description.trim(),
      category,
      priority,
      user_id: user?.id || null
    };

    try {
      console.log('Сохранение идеи в Supabase...');
      
      if (!supabase) {
        throw new Error('Supabase client not available');
      }
      
      const { data, error: supabaseError } = await supabase
        .from('idea_suggestions')
        .insert([ideaData])
        .select()
        .single();

      if (supabaseError) {
        throw supabaseError;
      }

      console.log('✅ Идея успешно сохранена:', data);

      // Отправляем Telegram уведомление прямо из frontend
      try {
        console.log('📱 Отправляем Telegram уведомление...');
        const telegramUrl = process.env.NODE_ENV === 'development' 
          ? 'http://localhost:3002/api/telegram/notify-idea'
          : '/api/telegram/notify-idea';
        
        const telegramResponse = await fetch(telegramUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            idea: data
          })
        });

        if (telegramResponse.ok) {
          console.log('✅ Telegram уведомление отправлено');
        } else {
          console.log('⚠️ Ошибка отправки Telegram уведомления:', telegramResponse.status);
        }
      } catch (telegramError) {
        console.log('⚠️ Не удалось отправить Telegram уведомление:', telegramError);
        // Не блокируем основной процесс если Telegram не работает
      }

      // Устанавливаем результат как успешный
      setSubmissionResult({
        success: true,
        ideaId: data.id
      });

      setSuccess(true);

      // Логируем успешную отправку
      loggingService.logActivity({
        eventType: 'idea_suggestion_submitted',
        eventCategory: 'community',
        eventData: {
          ideaId: data.id,
          category,
          priority,
          titleLength: title.length,
          descriptionLength: description.length,
          isAuthenticated: !!user
        }
      });

      // Автоматически закрываем модальное окно через 4 секунды
      setTimeout(() => {
        handleClose();
      }, 4000);

    } catch (error) {
      console.error('❌ Ошибка при отправке идеи:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      setError(`Не удалось отправить идею: ${errorMessage}`);
      
      setSubmissionResult({
        success: false,
        error: errorMessage
      });

      // Логируем ошибку
      loggingService.logError({
        errorType: 'idea_submission_error',
        errorMessage: errorMessage,
        component: 'SuggestIdeaModal.handleSubmit',
        additionalData: { ideaData },
        severity: 'high'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            handleClose();
          }
        }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <Lightbulb className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Suggest an Idea</h2>
                  <p className="text-blue-100">Help us improve Donein5 with your suggestions</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            {success ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-8"
              >
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Thank You for Your Suggestion!
                </h3>
                <p className="text-gray-600 mb-4">
                  Your idea has been successfully submitted.
                </p>

                {/* Submission Results */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-700">
                    💡 <strong>Success!</strong> Your idea has been saved and our team will be notified automatically via Telegram.
                  </p>
                </div>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Error Message */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm"
                  >
                    {error}
                  </motion.div>
                )}

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Idea Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="e.g., AI Agent for Code Review"
                    maxLength={100}
                    required
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    {title.length}/100 characters
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Category *
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {categories.map((cat) => {
                      const Icon = cat.icon;
                      return (
                        <label
                          key={cat.value}
                          className={`relative flex items-start p-4 border rounded-lg cursor-pointer transition-all ${
                            category === cat.value
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="category"
                            value={cat.value}
                            checked={category === cat.value}
                            onChange={(e) => setCategory(e.target.value as IdeaCategory)}
                            className="sr-only"
                          />
                          <Icon className={`h-5 w-5 mt-0.5 mr-3 ${
                            category === cat.value ? 'text-blue-600' : 'text-gray-400'
                          }`} />
                          <div>
                            <div className={`font-medium ${
                              category === cat.value ? 'text-blue-900' : 'text-gray-900'
                            }`}>
                              {cat.label}
                            </div>
                            <div className={`text-sm ${
                              category === cat.value ? 'text-blue-700' : 'text-gray-500'
                            }`}>
                              {cat.description}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority Level
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as Priority)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  >
                    {priorities.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Detailed Description *
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                    placeholder="Describe your idea in detail. What problem does it solve? How would it work? What benefits would it provide?"
                    maxLength={1000}
                    required
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    {description.length}/1000 characters (minimum 20)
                  </div>
                </div>

                {/* User Info */}
                {!user && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <User className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-yellow-800">Anonymous Submission</h4>
                        <p className="text-sm text-yellow-700 mt-1">
                          You're submitting anonymously. Consider signing in to track your suggestion's progress and receive updates.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Auto-notification Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Send className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-800">Automatic Notification</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        Your suggestion will be saved to our database and our development team will be notified automatically via Telegram.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-6 py-3 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !title.trim() || !description.trim()}
                    className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                    <span>{loading ? 'Submitting...' : 'Submit Idea'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SuggestIdeaModal;