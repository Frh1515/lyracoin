import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Wallet, Zap, Clock, TrendingUp, List } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { getUserProfile, type UserProfile } from '../../lib/supabase/getUserProfile';
import { updateUserMinutes } from '../../lib/supabase/updateUserMinutes';
import ChargeBalanceModal from '../components/ChargeBalanceModal';
import AddTaskInterface from '../components/AddTaskInterface';
import MyTasksInterface from '../components/MyTasksInterface';
import toast from 'react-hot-toast';

const NewTaskPage: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showChargeModal, setShowChargeModal] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [hasCreatedTasks, setHasCreatedTasks] = useState(false);
  const [showMyTasks, setShowMyTasks] = useState(true); // Default to MY TASKS view

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const { data, error } = await getUserProfile();
      
      if (error) {
        throw error;
      }

      if (data) {
        setProfile(data);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      toast.error(
        language === 'ar' 
          ? 'فشل في تحميل بيانات المستخدم' 
          : 'Failed to load user data'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogoError = () => {
    setLogoError(true);
  };

  const handleMinutesConverted = (minutesConverted: number, lyraEarned: number) => {
    // Update local profile state
    if (profile) {
      setProfile(prev => prev ? {
        ...prev,
        total_minutes: prev.total_minutes - minutesConverted,
        lyra_balance: prev.lyra_balance + lyraEarned
      } : null);
    }
  };

  const handleTaskCreated = () => {
    setHasCreatedTasks(true);
    setShowAddTask(false); // Close the add task interface
    // Refresh user profile to update LYRA balance
    fetchUserProfile();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#041e11] via-[#051a13] to-[#040d0c]">
        <div className="text-white animate-pulse">
          {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#041e11] via-[#051a13] to-[#040d0c] text-white">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-black/80 backdrop-blur-sm border-b border-neonGreen/30">
        <div className="flex items-center justify-between p-4">
          {/* Back Button */}
          <button
            onClick={() => navigate('/tasks')}
            className="flex items-center gap-2 text-white/70 hover:text-white transition"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">
              {language === 'ar' ? 'العودة' : 'Back'}
            </span>
          </button>

          {/* LYRA Balance and Charge Button */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-black/40 px-3 py-2 rounded-lg border border-neonGreen/30">
              <div className="w-6 h-6 bg-neonGreen rounded-full flex items-center justify-center">
                <span className="text-black font-bold text-xs">L</span>
              </div>
              <span className="text-neonGreen font-bold">
                {profile?.lyra_balance?.toLocaleString() || 0}
              </span>
              <span className="text-white/60 text-xs">LYRA</span>
            </div>
            
            <button
              onClick={() => setShowChargeModal(true)}
              className="bg-neonGreen text-black px-4 py-2 rounded-lg font-medium hover:brightness-110 transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm">
                {language === 'ar' ? 'شحن الرصيد' : 'Charge Balance'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* LYRA COIN Logo and Welcome */}
          <div className="text-center mb-8">
            {!logoError ? (
              <img
                src="/publiclogo.png"
                alt="LYRA COIN"
                className="w-32 h-32 mx-auto mb-6 drop-shadow-[0_0_30px_#00FF88] animate-float rounded-full border-4 border-neonGreen/50 shadow-[0_0_20px_rgba(0,255,136,0.3)]"
                loading="lazy"
                width="128"
                height="128"
                onError={handleLogoError}
              />
            ) : (
              <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-[#00FF88] to-[#00e078] rounded-full flex items-center justify-center drop-shadow-[0_0_30px_#00FF88] animate-float border-4 border-neonGreen/50 shadow-[0_0_20px_rgba(0,255,136,0.3)]">
                <div className="text-center">
                  <div className="text-black font-bold text-xl leading-tight">LYRA</div>
                  <div className="text-black font-bold text-base">COIN</div>
                </div>
              </div>
            )}
            
            <h1 className="text-3xl font-bold text-white mb-2">
              {language === 'ar' ? 'مرحباً بك في LYRA COIN' : 'Welcome to LYRA COIN'}
            </h1>
            <p className="text-white/70">
              {language === 'ar' 
                ? 'إدارة مهامك المدفوعة وتحويل دقائقك إلى عملة LYRA'
                : 'Manage your paid tasks and convert minutes to LYRA coins'
              }
            </p>
          </div>

          {/* Balance Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* LYRA Balance Card */}
            <div className="bg-black/40 backdrop-blur-sm border border-neonGreen/30 rounded-xl p-6 shadow-[0_0_15px_rgba(0,255,136,0.3)]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-neonGreen rounded-full flex items-center justify-center">
                  <span className="text-black font-bold">L</span>
                </div>
                <h3 className="text-lg font-semibold text-white">
                  {language === 'ar' ? 'رصيد LYRA' : 'LYRA Balance'}
                </h3>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-neonGreen mb-2">
                  {profile?.lyra_balance?.toLocaleString() || 0}
                </div>
                <p className="text-white/60 text-sm">
                  {language === 'ar' ? 'عملة LYRA' : 'LYRA Coins'}
                </p>
              </div>
              
              <div className="mt-4 p-3 bg-neonGreen/10 border border-neonGreen/30 rounded-lg">
                <p className="text-center text-neonGreen font-medium text-sm">
                  {language === 'ar' 
                    ? 'استخدم LYRA لإنشاء مهام مدفوعة'
                    : 'Use LYRA to create paid tasks'
                  }
                </p>
              </div>
            </div>

            {/* Minutes Balance Card */}
            <div className="bg-black/40 backdrop-blur-sm border border-yellow-400/30 rounded-xl p-6 shadow-[0_0_15px_rgba(255,204,21,0.3)]">
              <div className="flex items-center gap-3 mb-4">
                <Clock className="w-10 h-10 text-yellow-400" />
                <h3 className="text-lg font-semibold text-white">
                  {language === 'ar' ? 'رصيد الدقائق' : 'Minutes Balance'}
                </h3>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-400 mb-2 flex items-center justify-center gap-2">
                  {profile?.total_minutes?.toLocaleString() || 0}
                  <span className="px-2 py-0.5 bg-yellow-400/20 text-yellow-400 text-xs rounded-full border border-yellow-400/30">
                    {language === 'ar' ? 'قريباً =' : '= Soon'}
                  </span>
                </div>
                <p className="text-white/60 text-sm">
                  {language === 'ar' ? 'دقيقة متاحة' : 'Available Minutes'}
                </p>
              </div>
              
              <div className="mt-4 p-3 bg-yellow-400/10 border border-yellow-400/30 rounded-lg">
                <p className="text-center text-yellow-400 font-medium text-sm">
                  {language === 'ar' 
                    ? 'حول دقائقك إلى عملة LYRA'
                    : 'Convert your minutes to LYRA'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Task Management Buttons */}
          <div className="flex gap-4 mb-8">
            <button
              onClick={() => {
                setShowAddTask(false);
                setShowMyTasks(true);
              }}
              className={`flex-1 py-3 px-6 rounded-lg font-semibold transition duration-300 flex items-center justify-center gap-2 ${
                !showAddTask && showMyTasks
                  ? 'bg-neonGreen text-black shadow-[0_0_15px_rgba(0,255,136,0.5)]'
                  : 'bg-black/40 border border-white/20 text-white hover:bg-white/5'
              }`}
            >
              <List className="w-5 h-5" />
              {language === 'ar' ? 'MY TASKS' : 'MY TASKS'}
            </button>
            
            <button
              onClick={() => {
                setShowAddTask(true);
                setShowMyTasks(false);
              }}
              className={`flex-1 py-3 px-6 rounded-lg font-semibold transition duration-300 flex items-center justify-center gap-2 ${
                showAddTask 
                  ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.5)]'
                  : 'bg-black/40 border border-purple-500/30 text-white hover:bg-purple-500/10'
              } ${hasCreatedTasks ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={hasCreatedTasks}
              title={hasCreatedTasks ? (language === 'ar' ? 'لقد أنشأت مهمة بالفعل' : 'You have already created a task') : ''}
            >
              <Plus className="w-5 h-5" />
              {language === 'ar' ? 'ADD TASK' : 'ADD TASK'}
              {hasCreatedTasks && (
                <span className="text-xs opacity-70">
                  ({language === 'ar' ? 'مُستخدم' : 'Used'})
                </span>
              )}
            </button>
          </div>

          {/* My Tasks Interface */}
          {!showAddTask && showMyTasks && (
            <MyTasksInterface
              isVisible={showMyTasks}
              userLyraBalance={profile?.lyra_balance || 0}
              onBalanceUpdate={fetchUserProfile}
            />
          )}

          {/* Add Task Interface */}
          {showAddTask && !hasCreatedTasks && (
            <AddTaskInterface
              isVisible={showAddTask}
              onClose={() => setShowAddTask(false)}
              userLyraBalance={profile?.lyra_balance || 0}
              onTaskCreated={handleTaskCreated}
            />
          )}

          {/* Task Created Message */}
          {showAddTask && hasCreatedTasks && (
            <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-6 mb-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-green-400 mb-2">
                  {language === 'ar' ? 'تم إنشاء المهمة بنجاح!' : 'Task Created Successfully!'}
                </h3>
                <p className="text-white/70 mb-4">
                  {language === 'ar' 
                    ? 'مهمتك في انتظار التحقق من الدفع قبل النشر في المهام اليومية'
                    : 'Your task is pending payment verification before being published in daily tasks'
                  }
                </p>
                <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-3">
                  <p className="text-blue-400 text-sm">
                    {language === 'ar' 
                      ? 'ℹ️ ستتمكن من إنشاء مهام إضافية بعد التحقق من هذه المهمة'
                      : 'ℹ️ You will be able to create additional tasks after this one is verified'
                    }
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          {!showAddTask && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Create Paid Task */}
            <div className="bg-black/40 backdrop-blur-sm border border-purple-500/30 rounded-xl p-6 shadow-[0_0_15px_rgba(168,85,247,0.3)] hover:scale-105 transition duration-300 cursor-pointer">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white">
                  {language === 'ar' ? 'إنشاء مهمة مدفوعة' : 'Create Paid Task'}
                </h3>
              </div>
              
              <p className="text-white/70 text-sm mb-4">
                {language === 'ar' 
                  ? 'أنشئ مهام مخصصة للمستخدمين مقابل عملة LYRA'
                  : 'Create custom tasks for users in exchange for LYRA coins'
                }
              </p>
              
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                <p className="text-purple-400 font-medium text-sm text-center">
                  {language === 'ar' ? 'قريباً...' : 'Coming Soon...'}
                </p>
              </div>
            </div>

            {/* Task Analytics */}
            <div className="bg-black/40 backdrop-blur-sm border border-blue-500/30 rounded-xl p-6 shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:scale-105 transition duration-300 cursor-pointer">
              <div className="flex items-center gap-3 mb-4">
                <TrendingUp className="w-10 h-10 text-blue-500" />
                <h3 className="text-lg font-semibold text-white">
                  {language === 'ar' ? 'إحصائيات المهام' : 'Task Analytics'}
                </h3>
              </div>
              
              <p className="text-white/70 text-sm mb-4">
                {language === 'ar' 
                  ? 'تتبع أداء مهامك وعائد الاستثمار'
                  : 'Track your task performance and ROI'
                }
              </p>
              
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                <p className="text-blue-400 font-medium text-sm text-center">
                  {language === 'ar' ? 'قريباً...' : 'Coming Soon...'}
                </p>
              </div>
            </div>
            </div>
          )}

          {/* Exchange Rate Info */}
          {!showAddTask && (
            <div className="bg-black/40 backdrop-blur-sm border border-neonGreen/30 rounded-xl p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Zap className="w-6 h-6 text-neonGreen" />
              <h3 className="text-lg font-semibold text-white">
                {language === 'ar' ? 'أسعار التحويل' : 'Exchange Rates'}
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-neonGreen/10 border border-neonGreen/30 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-neonGreen mb-2">1000</div>
                <p className="text-white/70 text-sm">
                  {language === 'ar' ? 'دقيقة = 1 LYRA' : 'Minutes = 1 LYRA'}
                </p>
              </div>
              
              <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-yellow-400 mb-2">0.01</div>
                <p className="text-white/70 text-sm">
                  {language === 'ar' ? 'TON = 1 LYRA' : 'TON = 1 LYRA'}
                </p>
              </div>
            </div>
            </div>
          )}

          {/* How It Works */}
          {!showAddTask && (
            <div className="bg-black/40 backdrop-blur-sm border border-neonGreen/30 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              {language === 'ar' ? 'كيف يعمل النظام' : 'How It Works'}
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-neonGreen rounded-full flex items-center justify-center text-black font-bold text-sm">1</div>
                <p className="text-white/80 text-sm">
                  {language === 'ar' 
                    ? 'احصل على عملة LYRA من خلال شحن الرصيد أو تحويل الدقائق'
                    : 'Get LYRA coins by charging balance or converting minutes'
                  }
                </p>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-neonGreen rounded-full flex items-center justify-center text-black font-bold text-sm">2</div>
                <p className="text-white/80 text-sm">
                  {language === 'ar' 
                    ? 'استخدم عملة LYRA لإنشاء مهام مدفوعة مخصصة'
                    : 'Use LYRA coins to create custom paid tasks'
                  }
                </p>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-neonGreen rounded-full flex items-center justify-center text-black font-bold text-sm">3</div>
                <p className="text-white/80 text-sm">
                  {language === 'ar' 
                    ? 'راقب أداء مهامك وتفاعل المستخدمين معها'
                    : 'Monitor your task performance and user engagement'
                  }
                </p>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-neonGreen rounded-full flex items-center justify-center text-black font-bold text-sm">4</div>
                <p className="text-white/80 text-sm">
                  {language === 'ar' 
                    ? 'احصل على عائد من استثمارك في المهام المدفوعة'
                    : 'Get returns on your investment in paid tasks'
                  }
                </p>
              </div>
            </div>
            </div>
          )}
        </div>
      </div>

      {/* Charge Balance Modal */}
      <ChargeBalanceModal
        isOpen={showChargeModal}
        onClose={() => setShowChargeModal(false)}
        userMinutes={profile?.total_minutes || 0}
        userLyraBalance={profile?.lyra_balance || 0}
        onMinutesConverted={handleMinutesConverted}
      />
    </div>
  );
};

export default NewTaskPage;