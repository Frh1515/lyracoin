import React, { useState, useEffect } from 'react';
import { Trophy, Clock, Star, DollarSign } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTelegram } from '../context/TelegramContext';
import { getDailyTasks } from '../../lib/supabase/getDailyTasks';
import { getFixedTasks } from '../../lib/supabase/getFixedTasks';
import { claimFixedTask } from '../../lib/supabase/claimFixedTask';
import { claimDailyTask } from '../../lib/supabase/claimDailyTask';
import { getUserProfile } from '../../lib/supabase/getUserProfile';
import { getActivePaidTasksForDaily, recordTaskClickWithRewards } from '../../lib/supabase/taskConsumptionSystem';
import type { FixedTask, DailyTask, UserFixedTask, UserDailyTask } from '../../lib/supabase/types';
import type { PaidTask } from '../../lib/supabase/paidTasksSystem';
import PasswordInputModal from '../components/PasswordInputModal';
import TaskCompletionModal from '../components/TaskCompletionModal';
import PaidTaskCard from '../components/PaidTaskCard';

type Task = FixedTask | DailyTask;

const TasksPage: React.FC = () => {
  const { language } = useLanguage();
  const { user } = useTelegram();
  
  // Task states
  const [fixedTasks, setFixedTasks] = useState<Task[]>([]);
  const [dailyTasks, setDailyTasks] = useState<Task[]>([]);
  const [completedFixedTasks, setCompletedFixedTasks] = useState<Set<string>>(new Set());
  const [completedDailyTasks, setCompletedDailyTasks] = useState<Set<string>>(new Set());
  const [paidTasks, setPaidTasks] = useState<PaidTask[]>([]);
  const [completedPaidTasks, setCompletedPaidTasks] = useState<Set<string>>(new Set());
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [paidTasksLoaded, setPaidTasksLoaded] = useState(false);
  
  // Task interaction states
  const [taskStates, setTaskStates] = useState<{[key: string]: 'idle' | 'started' | 'ready' | 'completed'}>({});
  const [taskTimers, setTaskTimers] = useState<{[key: string]: number}>({});
  
  // Modal states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordModalTaskId, setPasswordModalTaskId] = useState<string>('');
  const [passwordModalTaskTitle, setPasswordModalTaskTitle] = useState<string>('');
  const [passwordModalTaskLink, setPasswordModalTaskLink] = useState<string>('');
  const [passwordModalTaskPlatform, setPasswordModalTaskPlatform] = useState<string>('');
  
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completionModalData, setCompletionModalData] = useState<{
    title: string;
    pointsEarned: number;
    minutesEarned: number;
  } | null>(null);

  // User profile state
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    if (user?.id) {
      loadTasks();
      loadUserProfile();
      loadPaidTasks();
    }
  }, [user]);

  const loadUserProfile = async () => {
    if (!user?.id) return;
    
    try {
      const { data: profileData, error: profileError } = await getUserProfile();
      if (profileError) throw profileError;
      setUserProfile(profileData);
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const loadTasks = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const [fixedTasksData, dailyTasksData] = await Promise.all([
        getFixedTasks(),
        getDailyTasks()
      ]);
      
      if (fixedTasksData.data) {
        setFixedTasks(fixedTasksData.data.tasks);
        setCompletedFixedTasks(new Set(fixedTasksData.data.completedTasks.map(t => t.fixed_task_id)));
      }
      
      if (dailyTasksData.data) {
        setDailyTasks(dailyTasksData.data.tasks);
        setCompletedDailyTasks(new Set(dailyTasksData.data.completedTasks.map(t => t.daily_task_id)));
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPaidTasks = async () => {
    if (!user?.id) return;
    
    try {
      const { data: paidTasksResult, error: paidTasksError } = await getActivePaidTasksForDaily();
      if (paidTasksError) throw paidTasksError;
      
      if (paidTasksResult) {
        setPaidTasks(paidTasksResult.tasks);
        setCompletedPaidTasks(new Set(paidTasksResult.completedTasks.map(t => t.task_id)));
      }
      setPaidTasksLoaded(true);
    } catch (error) {
      console.error('Error loading paid tasks:', error);
      setPaidTasksLoaded(true);
    }
  };

  const handlePaidTaskClick = async (taskId: string) => {
    if (!user?.id) return;
    
    try {
      const result = await recordTaskClickWithRewards(taskId);
      
      if (result.success) {
        // Update completed paid tasks
        setCompletedPaidTasks(prev => new Set([...prev, taskId]));
        
        // Show completion modal
        setCompletionModalData({
          title: result.taskTitle || 'Paid Task',
          pointsEarned: 0, // Paid tasks don't give points directly
          minutesEarned: result.minutesEarned || 0
        });
        setShowCompletionModal(true);
        
        // Reload user profile to update balance
        await loadUserProfile();
      }
    } catch (error) {
      console.error('Error handling paid task click:', error);
    }
  };

  const getPlatformConfig = (platform: string) => {
    const configs = {
      telegram: {
        icon: Trophy,
        bgColor: 'bg-blue-500',
        borderColor: 'border-blue-400',
        glow: 'shadow-blue-400/20',
        link: 'https://t.me/lyranetworkofficial'
      },
      youtube: {
        icon: Trophy,
        bgColor: 'bg-red-500',
        borderColor: 'border-red-400',
        glow: 'shadow-red-400/20',
        link: 'https://youtube.com/@lyranetworkofficial'
      },
      tiktok: {
        icon: Trophy,
        bgColor: 'bg-pink-500',
        borderColor: 'border-pink-400',
        glow: 'shadow-pink-400/20',
        link: 'https://tiktok.com/@lyranetworkofficial'
      },
      twitter: {
        icon: Trophy,
        bgColor: 'bg-sky-500',
        borderColor: 'border-sky-400',
        glow: 'shadow-sky-400/20',
        link: 'https://twitter.com/lyranetworkoff'
      },
      instagram: {
        icon: Trophy,
        bgColor: 'bg-purple-500',
        borderColor: 'border-purple-400',
        glow: 'shadow-purple-400/20',
        link: 'https://instagram.com/lyranetworkofficial'
      }
    };
    
    return configs[platform as keyof typeof configs] || configs.telegram;
  };

  const getLocalizedTaskContent = (task: Task) => {
    const localizedTasks: {[key: string]: {ar: {title: string, description: string}, en: {title: string, description: string}}} = {
      'telegram-join': {
        ar: { title: 'انضم إلى تيليجرام', description: 'انضم إلى قناة Lyra الرسمية على تيليجرام' },
        en: { title: 'Join Telegram', description: 'Join the official Lyra Telegram channel' }
      },
      'youtube-subscribe': {
        ar: { title: 'اشترك في يوتيوب', description: 'اشترك في قناة Lyra على يوتيوب وشاهد الفيديو للحصول على كلمة المرور' },
        en: { title: 'Subscribe YouTube', description: 'Subscribe to Lyra YouTube channel and watch the video for password' }
      },
      'tiktok-follow': {
        ar: { title: 'تابع على تيك توك', description: 'تابع حساب Lyra على تيك توك وشاهد الفيديو للحصول على كلمة المرور' },
        en: { title: 'Follow TikTok', description: 'Follow Lyra TikTok account and watch the video for password' }
      },
      'twitter-follow': {
        ar: { title: 'تابع على تويتر', description: 'تابع حساب Lyra على تويتر' },
        en: { title: 'Follow Twitter', description: 'Follow Lyra Twitter account' }
      },
      'instagram-follow': {
        ar: { title: 'تابع على إنستغرام', description: 'تابع حساب Lyra على إنستغرام' },
        en: { title: 'Follow Instagram', description: 'Follow Lyra Instagram account' }
      }
    };
    
    const taskConfig = localizedTasks[task.id] || {
      ar: { title: task.title, description: task.description },
      en: { title: task.title, description: task.description }
    };
    
    return taskConfig[language];
  };

  const getTaskButton = (taskId: string, taskType: 'fixed' | 'daily') => {
    const isCompleted = taskType === 'fixed' 
      ? completedFixedTasks.has(taskId)
      : completedDailyTasks.has(taskId);
    
    if (isCompleted) {
      return {
        text: language === 'ar' ? '✅ مكتمل' : '✅ Completed',
        className: 'bg-neonGreen/20 text-neonGreen cursor-not-allowed',
        disabled: true
      };
    }
    
    const currentState = taskStates[taskId] || 'idle';
    const timer = taskTimers[taskId] || 0;
    
    switch (currentState) {
      case 'idle':
        return {
          text: language === 'ar' ? 'ابدأ المهمة' : 'Start Task',
          className: 'bg-neonGreen hover:bg-neonGreen/80 text-black',
          disabled: false
        };
      case 'started':
        return {
          text: `${timer}s`,
          className: 'bg-yellow-500/20 text-yellow-400 cursor-not-allowed',
          disabled: true
        };
      case 'ready':
        const task = [...fixedTasks, ...dailyTasks].find(t => t.id === taskId);
        const isVideoTask = task?.platform === 'youtube' || task?.platform === 'tiktok';
        
        if (isVideoTask) {
          return {
            text: language === 'ar' ? 'أدخل كلمة المرور' : 'Enter Password',
            className: 'bg-blue-500 hover:bg-blue-600 text-white',
            disabled: false
          };
        } else {
          return {
            text: language === 'ar' ? 'مطالبة' : 'Claim',
            className: 'bg-neonGreen hover:bg-neonGreen/80 text-black',
            disabled: false
          };
        }
      default:
        return {
          text: language === 'ar' ? 'ابدأ المهمة' : 'Start Task',
          className: 'bg-neonGreen hover:bg-neonGreen/80 text-black',
          disabled: false
        };
    }
  };

  const handleStartTask = (taskId: string, taskType: 'fixed' | 'daily', link?: string) => {
    // Open the link
    if (link) {
      window.open(link, '_blank');
    }
    
    // Start countdown
    setTaskStates(prev => ({ ...prev, [taskId]: 'started' }));
    setTaskTimers(prev => ({ ...prev, [taskId]: 15 }));
    
    const countdown = setInterval(() => {
      setTaskTimers(prev => {
        const newTime = (prev[taskId] || 15) - 1;
        if (newTime <= 0) {
          clearInterval(countdown);
          setTaskStates(prevStates => ({ ...prevStates, [taskId]: 'ready' }));
          return { ...prev, [taskId]: 0 };
        }
        return { ...prev, [taskId]: newTime };
      });
    }, 1000);
  };

  const handleClaimTask = async (taskId: string, taskType: 'fixed' | 'daily') => {
    if (!user?.id) return;
    
    try {
      let result;
      if (taskType === 'fixed') {
        result = await claimFixedTask(taskId);
      } else {
        result = await claimDailyTask(taskId);
      }
      
      if (result.success) {
        // Update completed tasks
        if (taskType === 'fixed') {
          setCompletedFixedTasks(prev => new Set([...prev, taskId]));
        } else {
          setCompletedDailyTasks(prev => new Set([...prev, taskId]));
        }
        
        // Reset task state
        setTaskStates(prev => ({ ...prev, [taskId]: 'completed' }));
        
        // Show completion modal
        const task = taskType === 'fixed' 
          ? fixedTasks.find(t => t.id === taskId)
          : dailyTasks.find(t => t.id === taskId);
        
        if (task) {
          const isVideoTask = task.platform === 'youtube' || task.platform === 'tiktok';
          const pointsReward = isVideoTask ? 20 : task.points_reward;
          const minutesReward = isVideoTask ? 100 : (taskType === 'fixed' ? 20 : 10);
          
          setCompletionModalData({
            title: getLocalizedTaskContent(task).title,
            pointsEarned: pointsReward,
            minutesEarned: minutesReward
          });
          setShowCompletionModal(true);
        }
        
        // Reload user profile
        await loadUserProfile();
      }
    } catch (error) {
      console.error('Error claiming task:', error);
    }
  };

  const handlePasswordSubmit = async (password: string) => {
    if (!user?.id || !passwordModalTaskId) return;
    
    try {
      // For now, accept any password for video tasks
      // In production, you'd validate against the actual password
      await handleClaimTask(passwordModalTaskId, 
        fixedTasks.find(t => t.id === passwordModalTaskId) ? 'fixed' : 'daily'
      );
      
      setShowPasswordModal(false);
      setPasswordModalTaskId('');
    } catch (error) {
      console.error('Error submitting password:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neonGreen mx-auto mb-4"></div>
          <p>{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 pb-20">
      {/* Header */}
      <div className="px-6 pt-8 pb-4">
        <h2 className="text-2xl font-bold text-white mb-2">
          {language === 'ar' ? '🎯 المهام' : '🎯 Tasks'}
        </h2>
        <p className="text-white/70 text-sm">
          {language === 'ar' 
            ? 'أكمل المهام لكسب النقاط والدقائق' 
            : 'Complete tasks to earn points and minutes'
          }
        </p>
      </div>

      {/* Fixed Tasks Section */}
      {fixedTasks.length > 0 && (
        <div className="px-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-5 h-5 text-yellow-400" />
            <h4 className="text-lg font-semibold text-yellow-400">
              {language === 'ar' ? '⭐ مهام ثابتة' : '⭐ Fixed Tasks'}
            </h4>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fixedTasks.map((task) => {
              const platformConfig = getPlatformConfig(task.platform);
              const buttonConfig = getTaskButton(task.id, 'fixed');
              const isCompleted = completedFixedTasks.has(task.id);
              const localizedContent = getLocalizedTaskContent(task);
              const isVideoTask = task.platform === 'youtube' || task.platform === 'tiktok';
              
              // Determine reward amount based on platform
              const pointsReward = isVideoTask ? 20 : task.points_reward;
              const minutesReward = isVideoTask ? 100 : 20;
              
              return (
                <div
                  key={task.id}
                  className={`p-4 backdrop-blur-sm border rounded-xl text-white transition-all duration-300 ${
                    isCompleted
                      ? `bg-neonGreen/10 ${platformConfig.borderColor} opacity-50` 
                      : `bg-black/40 ${platformConfig.borderColor} ${platformConfig.glow} hover:scale-105 hover:brightness-110`
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <platformConfig.icon className={`w-6 h-6 ${platformConfig.bgColor} rounded-lg p-1 text-white`} />
                    <h5 className="font-medium text-sm">{localizedContent.title}</h5>
                  </div>
                  
                  <p className="text-xs text-white/70 mb-3">
                    {localizedContent.description}
                    {isVideoTask && (
                      <span className="block mt-1 text-yellow-400">
                        {language === 'ar' 
                          ? '(كلمة المرور موجودة في الفيديو)'
                          : '(Password is in the video)'
                        }
                      </span>
                    )}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neonGreen">
                      +{pointsReward} {language === 'ar' ? 'نقطة' : 'points'} & +{minutesReward} {language === 'ar' ? 'دقيقة' : 'minutes'}
                    </span>
                    
                    <button
                      onClick={() => {
                        if (buttonConfig.text.includes('Start') || buttonConfig.text.includes('ابدأ')) {
                          handleStartTask(task.id, 'fixed', platformConfig.link);
                        } else if (buttonConfig.text.includes('Password') || buttonConfig.text.includes('كلمة المرور')) {
                          // Show password modal
                          setPasswordModalTaskId(task.id);
                          setPasswordModalTaskTitle(localizedContent.title);
                          setPasswordModalTaskLink(platformConfig.link || '');
                          setPasswordModalTaskPlatform(task.platform);
                          setShowPasswordModal(true);
                        } else if (buttonConfig.text.includes('Claim') || buttonConfig.text.includes('مطالبة')) {
                          handleClaimTask(task.id, 'fixed');
                        }
                      }}
                      disabled={buttonConfig.disabled}
                      className={`px-3 py-1.5 rounded-lg font-medium text-xs transition-all duration-300 ${buttonConfig.className}`}
                    >
                      {buttonConfig.text}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Daily Tasks Section */}
      {dailyTasks.length > 0 && (
        <div className="px-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-blue-400" />
            <h4 className="text-lg font-semibold text-blue-400">
              {language === 'ar' ? '📅 مهام يومية' : '📅 Daily Tasks'}
            </h4>
          </div>

          {/* Paid Tasks Section - Integrated with Daily Tasks */}
          {paidTasksLoaded && paidTasks.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-5 h-5 text-red-400" />
                <h4 className="text-lg font-semibold text-red-400">
                  {language === 'ar' ? '🔥 مهام مدفوعة' : '🔥 Paid Tasks'}
                </h4>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {paidTasks
                  .map((task) => (
                    <PaidTaskCard
                      key={task.id}
                      task={task}
                      isCompleted={completedPaidTasks.has(task.id)}
                      onTaskClick={handlePaidTaskClick}
                    />
                  ))}
              </div>
              
              <div className="bg-black/30 border border-red-400/30 rounded-lg p-3 mb-4">
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dailyTasks.map((task) => {
              const platformConfig = getPlatformConfig(task.platform);
              const buttonConfig = getTaskButton(task.id, 'daily');
              const isCompleted = completedDailyTasks.has(task.id);
              const localizedContent = getLocalizedTaskContent(task);
              const isVideoTask = task.platform === 'youtube' || task.platform === 'tiktok';
              
              // Determine reward amount based on platform
              const pointsReward = isVideoTask ? 20 : task.points_reward;
              const minutesReward = isVideoTask ? 100 : 10;
              
              return (
                <div
                  key={task.id}
                  className={`p-4 backdrop-blur-sm border rounded-xl text-white transition-all duration-300 ${
                    isCompleted
                      ? `bg-neonGreen/10 ${platformConfig.borderColor} opacity-50` 
                      : `bg-black/40 ${platformConfig.borderColor} ${platformConfig.glow} hover:scale-105 hover:brightness-110`
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <platformConfig.icon className={`w-6 h-6 ${platformConfig.bgColor} rounded-lg p-1 text-white`} />
                    <h5 className="font-medium text-sm">{localizedContent.title}</h5>
                  </div>
                  
                  <p className="text-xs text-white/70 mb-3">
                    {localizedContent.description}
                    {isVideoTask && (
                      <span className="block mt-1 text-yellow-400">
                        {language === 'ar' 
                          ? '(كلمة المرور موجودة في الفيديو)'
                          : '(Password is in the video)'
                        }
                      </span>
                    )}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neonGreen">
                      +{pointsReward} {language === 'ar' ? 'نقطة' : 'points'} & +{minutesReward} {language === 'ar' ? 'دقيقة' : 'minutes'}
                    </span>
                    
                    <button
                      onClick={() => {
                        if (buttonConfig.text.includes('Start') || buttonConfig.text.includes('ابدأ')) {
                          handleStartTask(task.id, 'daily', platformConfig.link);
                        } else if (buttonConfig.text.includes('Password') || buttonConfig.text.includes('كلمة المرور')) {
                          // Show password modal
                          setPasswordModalTaskId(task.id);
                          setPasswordModalTaskTitle(localizedContent.title);
                          setPasswordModalTaskLink(platformConfig.link || '');
                          setPasswordModalTaskPlatform(task.platform);
                          setShowPasswordModal(true);
                        } else if (buttonConfig.text.includes('Claim') || buttonConfig.text.includes('مطالبة')) {
                          handleClaimTask(task.id, 'daily');
                        }
                      }}
                      disabled={buttonConfig.disabled}
                      className={`px-3 py-1.5 rounded-lg font-medium text-xs transition-all duration-300 ${buttonConfig.className}`}
                    >
                      {buttonConfig.text}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-8 px-6">
        <div className="bg-black/40 backdrop-blur-sm border border-neonGreen/30 rounded-xl p-4">
          <h4 className="text-white font-semibold mb-2">
            {language === 'ar' ? 'ℹ️ كيفية إكمال المهام' : 'ℹ️ How to Complete Tasks'}
          </h4>
          <ul className="text-sm text-white/70 space-y-1">
            <li>
              {language === 'ar' 
                ? '1. اضغط على "ابدأ المهمة" لفتح الرابط وبدء العد التنازلي'
                : '1. Click "Start Task" to open the link and start the countdown'
              }
            </li>
            <li>
              {language === 'ar' 
                ? '2. لمهام اليوتيوب وتيك توك، ستحتاج إلى إدخال كلمة المرور من الفيديو'
                : '2. For YouTube and TikTok tasks, you\'ll need to enter the password from the video'
              }
            </li>
            <li>
              {language === 'ar' 
                ? '3. اضغط على "مطالبة" لاستلام النقاط والدقائق'
                : '3. Click "Claim" to receive points and minutes'
              }
            </li>
            <li>
              {language === 'ar' 
                ? '4. المهام الثابتة تعطي 20 نقطة + 20 دقيقة، المهام اليومية تعطي 10 نقاط + 10 دقائق'
                : '4. Fixed tasks give 20 points + 20 minutes, daily tasks give 10 points + 10 minutes'
              }
            </li>
            <li>
              {language === 'ar' 
                ? '5. التعدين: اضغط "تعدين" لبدء جلسة 6 ساعات، استلم المكافآت كل 24 ساعة'
                : '5. Mining: Click "Mine" to start 6-hour session, claim rewards every 24 hours'
              }
            </li>
          </ul>
        </div>
      </div>

      {/* Modals */}
      <PasswordInputModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onSubmit={handlePasswordSubmit}
        taskTitle={passwordModalTaskTitle}
        taskLink={passwordModalTaskLink}
        platform={passwordModalTaskPlatform}
      />

      <TaskCompletionModal
        isOpen={showCompletionModal}
        onClose={() => setShowCompletionModal(false)}
        data={completionModalData}
      />
    </div>
  );
};

export default TasksPage;