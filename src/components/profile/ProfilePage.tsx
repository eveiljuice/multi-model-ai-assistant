import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Mail, 
  Save, 
  Loader2, 
  Shield,
  Bell,
  Download,
  Trash2,
  ArrowLeft
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabaseClient';
import { loggingService } from '../../services/loggingService';

type TabType = 'profile' | 'activity' | 'security';

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  preferences: {
    theme?: 'light' | 'dark' | 'auto';
    language?: string;
    notifications?: {
      email: boolean;
      push: boolean;
    };
  };
  created_at: string;
  updated_at: string;
}

interface ActivityLog {
  id: string;
  event_type: string;
  event_category: string;
  event_data: any;
  created_at: string;
}

const ProfilePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as TabType) || 'profile';
  
  const { user, updateProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Profile data
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [fullName, setFullName] = useState('');
  
  // Activity data
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);

  // Update URL when tab changes
  useEffect(() => {
    setSearchParams({ tab: activeTab }, { replace: true });
  }, [activeTab, setSearchParams]);

  useEffect(() => {
    if (user) {
      loadProfile();
      if (activeTab === 'activity') {
        loadActivityLogs();
      }
    }
  }, [user, activeTab]);

  const loadProfile = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setProfile(data);
      setFullName(data.full_name || '');
      
    } catch (error) {
      console.error('Failed to load profile:', error);
      setError('Failed to load profile data');
      
      loggingService.logError({
        errorType: 'profile_load_error',
        errorMessage: error instanceof Error ? error.message : 'Failed to load profile',
        component: 'ProfilePage.loadProfile',
        severity: 'medium'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadActivityLogs = async () => {
    if (!user) return;
    
    setActivityLoading(true);
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setActivityLogs(data || []);
      
    } catch (error) {
      console.error('Failed to load activity logs:', error);
      loggingService.logError({
        errorType: 'activity_logs_load_error',
        errorMessage: error instanceof Error ? error.message : 'Failed to load activity logs',
        component: 'ProfilePage.loadActivityLogs',
        severity: 'low'
      });
    } finally {
      setActivityLoading(false);
    }
  };

  const saveProfile = async () => {
    if (!user || !profile) return;
    
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      const updates = {
        full_name: fullName.trim() || null,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      // Update auth metadata
      await updateProfile({
        data: {
          full_name: fullName.trim() || null
        }
      });

      setSuccess('Profile updated successfully!');
      
      loggingService.logActivity({
        eventType: 'profile_updated',
        eventCategory: 'profile',
        eventData: {
          updatedFields: Object.keys(updates)
        }
      });
      
      setTimeout(() => setSuccess(''), 3000);
      
    } catch (error) {
      console.error('Failed to save profile:', error);
      setError('Failed to save profile changes');
      
      loggingService.logError({
        errorType: 'profile_save_error',
        errorMessage: error instanceof Error ? error.message : 'Failed to save profile',
        component: 'ProfilePage.saveProfile',
        severity: 'medium'
      });
    } finally {
      setSaving(false);
    }
  };

  const exportData = async () => {
    if (!user) return;
    
    try {
      const userData = {
        profile,
        activityLogs: activityLogs.slice(0, 100),
        exportedAt: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(userData, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `donein5-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      loggingService.logActivity({
        eventType: 'data_exported',
        eventCategory: 'profile',
        eventData: {
          recordCount: activityLogs.length
        }
      });
      
      setSuccess('Data exported successfully!');
      setTimeout(() => setSuccess(''), 3000);
      
    } catch (error) {
      console.error('Failed to export data:', error);
      setError('Failed to export data');
    }
  };

  const deleteAccount = async () => {
    if (!user) return;
    
    const confirmed = window.confirm(
      'Are you sure you want to delete your account? This action cannot be undone.'
    );
    
    if (!confirmed) return;
    
    try {
      loggingService.logActivity({
        eventType: 'account_deletion_requested',
        eventCategory: 'profile',
        eventData: {
          userId: user.id
        }
      });
      
      setError('Account deletion is not yet implemented. Please contact support.');
      
    } catch (error) {
      console.error('Failed to delete account:', error);
      setError('Failed to delete account');
    }
  };

  const formatEventType = (eventType: string) => {
    return eventType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getEventIcon = (eventType: string) => {
    if (eventType.includes('signin') || eventType.includes('login')) return '🔐';
    if (eventType.includes('signup') || eventType.includes('register')) return '👤';
    if (eventType.includes('chat') || eventType.includes('message')) return '💬';
    if (eventType.includes('agent')) return '🤖';
    if (eventType.includes('search')) return '🔍';
    if (eventType.includes('export')) return '📥';
    if (eventType.includes('profile')) return '⚙️';
    return '📝';
  };

  const tabs = [
    { id: 'profile', label: 'Profile Settings', icon: User },
    { id: 'activity', label: 'Activity History', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield }
  ];

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600 mb-6">Please sign in to access your profile.</p>
          <Link
            to="/"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Homepage
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Marketplace
          </Link>
          
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {fullName ? fullName.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
              <p className="text-gray-600">Manage your account and preferences</p>
            </div>
          </div>
        </div>

        {/* Content Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Tabs */}
          <div className="border-b border-gray-200 bg-gray-50">
            <div className="flex space-x-1 px-6">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabType)}
                    className={`flex items-center space-x-2 px-6 py-4 text-sm font-medium rounded-t-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Error/Success Messages */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-6"
              >
                {error}
              </motion.div>
            )}

            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm mb-6"
              >
                {success}
              </motion.div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : (
              <AnimatePresence mode="wait">
                {/* Profile Tab */}
                {activeTab === 'profile' && (
                  <motion.div
                    key="profile"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-8"
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Profile Avatar */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900">Profile Avatar</h3>
                        <div className="flex items-center space-x-4">
                          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                            {fullName ? fullName.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Your avatar is automatically generated from your initials</p>
                          </div>
                        </div>
                      </div>

                      {/* Basic Info */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Full Name
                          </label>
                          <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            placeholder="Enter your full name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Email Address
                          </label>
                          <input
                            type="email"
                            value={user?.email || ''}
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                          />
                          <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                        </div>
                      </div>
                    </div>

                    {/* Account Stats */}
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Statistics</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {profile?.created_at ? Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 0}
                          </div>
                          <div className="text-sm text-gray-600">Days Active</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">{activityLogs.length}</div>
                          <div className="text-sm text-gray-600">Activities</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">
                            {activityLogs.filter(log => log.event_type.includes('chat')).length}
                          </div>
                          <div className="text-sm text-gray-600">Chats</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-orange-600">Free</div>
                          <div className="text-sm text-gray-600">Plan</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={saveProfile}
                        disabled={saving}
                        className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Activity Tab */}
                {activeTab === 'activity' && (
                  <motion.div
                    key="activity"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
                      <button
                        onClick={loadActivityLogs}
                        disabled={activityLoading}
                        className="flex items-center space-x-2 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        {activityLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
                        <span>Refresh</span>
                      </button>
                    </div>

                    {activityLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                      </div>
                    ) : activityLogs.length > 0 ? (
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {activityLogs.map((log) => (
                          <div key={log.id} className="bg-gray-50 rounded-lg p-4">
                            <div className="flex items-start space-x-3">
                              <div className="text-2xl">{getEventIcon(log.event_type)}</div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-sm font-medium text-gray-900">
                                    {formatEventType(log.event_type)}
                                  </h4>
                                  <span className="text-xs text-gray-500">
                                    {new Date(log.created_at).toLocaleDateString()} {new Date(log.created_at).toLocaleTimeString()}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600 capitalize">{log.event_category}</p>
                                {log.event_data && Object.keys(log.event_data).length > 0 && (
                                  <div className="mt-2 text-xs text-gray-500">
                                    {Object.entries(log.event_data).slice(0, 3).map(([key, value]) => (
                                      <div key={key}>
                                        <span className="font-medium">{key}:</span> {String(value).slice(0, 50)}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No activity logs found</p>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Security Tab */}
                {activeTab === 'security' && (
                  <motion.div
                    key="security"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    {/* Data Export */}
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Export</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Download a copy of your data including profile information and activity logs.
                      </p>
                      <button
                        onClick={exportData}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Download className="h-4 w-4" />
                        <span>Export My Data</span>
                      </button>
                    </div>

                    {/* Account Deletion */}
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-red-900 mb-4">Danger Zone</h3>
                      <p className="text-sm text-red-700 mb-4">
                        Once you delete your account, there is no going back. Please be certain.
                      </p>
                      <button
                        onClick={deleteAccount}
                        className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Delete Account</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage; 