import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { getDailyTasks, getFixedTasks, recordTaskCompletion, getCompletedTasks, recordGameSession } from '../../lib/supabase/tasks';
import { getMiningStatus, startOrResumeMining, claimDailyMiningReward } from '../../lib/supabase/mining';
import { getActiveBoost, applyBoostToMining } from '../../lib/supabase/boostSystem';
import type { MiningStatus } from '../../lib/supabase/types';
import { getActivePaidTasksForDaily, recordTaskClickWithRewards, hasCompletedPaidTaskToday } from '../../lib/supabase/taskConsumptionSystem';
import toast from 'react-hot-toast';
import { 
  Youtube, 
  Instagram, 
  Twitter, 
  MessageCircle, 
  ExternalLink, 
  Clock, 
  CheckCircle, 
  Pickaxe,
  Gamepad2,
  DollarSign
} from 'lucide-react';

interface TasksPageProps {
  onPointsEarned?: (points: number) => void;
  onMinutesEarned?: (minutes: number) => void;
}

const TasksPage: React.FC<TasksPageProps> = ({ onPointsEarned, onMinutesEarned }) => {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'daily' | 'fixed' | 'mining'>('daily');
  const [tasksLoaded, setTasksLoaded] = useState(false);
  const [dailyTasks, setDailyTasks] = useState<any[]>([]);
  const [fixedTasks, setFixedTasks] = useState<any[]>([]);
  const [paidTasks, setPaidTasks] = useState<any[]>([]);
  const [completedDailyTasks, setCompletedDailyTasks] = useState<Set<string>>(new Set());
  const [completedFixedTasks, setCompletedFixedTasks] = useState<Set<string>>(new Set());
  const [completedPaidTasks, setCompletedPaidTasks] = useState<Set<string>>(new Set());
  const [claimingTasks, setClaimingTasks] = useState<Set<string>>(new Set());
  const [taskTimers, setTaskTimers] = useState<Map<string, NodeJS.Timeout>>(new Map());
  const [taskStartedTimes, setTaskStartedTimes] = useState<Map<string, number>>(new Map());
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordModalTaskId, setPasswordModalTaskId] = useState<string>('');
  const [passwordModalTaskTitle, setPasswordModalTaskTitle] = useState<string>('');
  const [passwordModalTaskLink, setPasswordModalTaskLink] = useState<string>('');
  const [passwordModalTaskPlatform, setPasswordModalTaskPlatform] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState('');
  const [miningStatus, setMiningStatus] = useState<MiningStatus | null>(null);
  const [miningLoading, setMiningLoading] = useState(false);
  const [paidTasksLoaded, setPaidTasksLoaded] = useState(false);

  // Load tasks on component mount
  useEffect(() => {
    const loadTasks = async () => {
      try {
        console.log('🔄 Loading all tasks...');
        
        // Load daily tasks
        const { data: dailyData, error: dailyError } = await getDailyTasks();
        if (dailyError) {
          console.error('Error loading daily tasks:', dailyError);
          toast.error(
            language === 'ar' 
              ? 'فشل في تحميل المهام اليومية' 
              : 'Failed to load daily tasks'
          );
        } else if (dailyData) {
          console.log('✅ Daily tasks loaded:', dailyData.length);
          setDailyTasks(dailyData);
        }

        // Load fixed tasks
        const { data: fixedData, error: fixedError } = await getFixedTasks();
        if (fixedError) {
          console.error('Error loading fixed tasks:', fixedError);
          toast.error(
            language === 'ar' 
              ? 'فشل في تحميل المهام الثابتة' 
              : 'Failed to load fixed tasks'
          );
        } else if (fixedData) {
          console.log('✅ Fixed tasks loaded:', fixedData.length);
          setFixedTasks(fixedData);
        }

        // Load completed tasks
        const { data: completedData, error: completedError } = await getCompletedTasks();
        if (completedError) {
          console.error('Error loading completed tasks:', completedError);
        } else if (completedData) {
          const completedDaily = new Set(
            completedData
              .filter(task => task.task_type === 'daily')
              .map(task => task.task_id)
          );
          const completedFixed = new Set(
            completedData
              .filter(task => task.task_type === 'fixed')
              .map(task => task.task_id)
          );
          
          setCompletedDailyTasks(completedDaily);
          setCompletedFixedTasks(completedFixed);
          console.log('✅ Completed daily tasks:', completedDaily.size);
          console.log('✅ Completed fixed tasks:', completedFixed.size);
        }

        // Load paid tasks for daily section
        const { data: paidData, error: paidError } = await getActivePaidTasksForDaily();
        if (paidError) {
          console.error('Error loading paid tasks:', paidError);
          toast.error(
            language === 'ar' 
              ? 'فشل في تحميل المهام المدفوعة' 
              : 'Failed to load paid tasks'
          );
        } else if (paidData) {
          console.log('✅ Paid tasks loaded:', paidData.tasks.length);
          setPaidTasks(paidData.tasks);
          const completedPaid = new Set(paidData.completedTasks);
          setCompletedPaidTasks(completedPaid);
          console.log('✅ Completed paid tasks:', completedPaid.size);
        }

        setTasksLoaded(true);
        console.log('✅ All tasks loaded successfully');
      } catch (error) {
        console.error('❌ Error loading tasks:', error);
        toast.error(
          language === 'ar' 
            ? 'حدث خطأ أثناء تحميل المهام' 
            : 'An error occurred while loading tasks'
        );
      }
    };

    loadTasks();
  }, [language]);

  // Load mining status
  useEffect(() => {
    const loadMiningStatus = async () => {
      try {
        const status = await getMiningStatus();
        setMiningStatus(status);
      } catch (error) {
        console.error('Error loading mining status:', error);
      }
    };

    if (activeTab === 'mining') {
      loadMiningStatus();
    }
  }, [activeTab]);

  const handleStartTask = (taskId: string, taskType: 'daily' | 'fixed', link?: string) => {
    console.log('🔄 Starting task:', { taskId, taskType, link });
    
    // Open the link if provided
    if (link) {
      window.open(link, '_blank');
    }
    
    // Start the 30-second timer
    const startTime = Date.now();
    setTaskStartedTimes(prev => new Map(prev.set(taskId, startTime)));
    
    const timer = setTimeout(() => {
      console.log('⏰ Timer completed for task:', taskId);
      // Timer will be cleared when task is claimed
    }, 30000);
    
    setTaskTimers(prev => new Map(prev.set(taskId, timer)));
    
    toast.success(
      language === 'ar' 
        ? 'تم بدء المهمة! انتظر 30 ثانية ثم اضغط مطالبة' 
        : 'Task started! Wait 30 seconds then click Claim',
      { duration: 3000 }
    );
  };

  const handleClaimTask = async (taskId: string, taskType: 'daily' | 'fixed') => {
    console.log('🔄 Attempting to claim task:', { taskId, taskType });
    
    if (claimingTasks.has(taskId)) {
      console.log('⚠️ Task already being claimed');
      return;
    }

    // Check if 30 seconds have passed
    const startTime = taskStartedTimes.get(taskId);
    if (!startTime || (Date.now() - startTime < 30000)) {
      toast.error(
        language === 'ar' 
          ? 'يجب انتظار 30 ثانية قبل المطالبة بالمهمة' 
          : 'You must wait 30 seconds before claiming the task'
      );
      return;
    }

    setClaimingTasks(prev => new Set([...prev, taskId]));

    try {
      console.log('📞 Calling recordTaskCompletion function...');
      const result = await recordTaskCompletion(taskId, taskType);
      
      console.log('📊 Completion result:', result);
      
      if (result.success) {
        console.log('✅ Task completed successfully');
        
        // Update completed tasks state
        if (taskType === 'daily') {
          setCompletedDailyTasks(prev => new Set([...prev, taskId]));
        } else {
          setCompletedFixedTasks(prev => new Set([...prev, taskId]));
        }

        // Award points and minutes
        if (onPointsEarned && result.pointsEarned) {
          onPointsEarned(result.pointsEarned);
        }

        if (onMinutesEarned && result.minutesEarned) {
          onMinutesEarned(result.minutesEarned);
        }

        // Clear the timer and start time for this task
        const timer = taskTimers.get(taskId);
        if (timer) {
          clearTimeout(timer);
          setTaskTimers(prev => {
            const newMap = new Map(prev);
            newMap.delete(taskId);
            return newMap;
          });
        }
        setTaskStartedTimes(prev => {
          const newMap = new Map(prev);
          newMap.delete(taskId);
          return newMap;
        });

        toast.success(
          language === 'ar'
            ? `🎉 تم إكمال المهمة! +${result.pointsEarned} نقطة و +${result.minutesEarned} دقيقة`
            : `🎉 Task completed! +${result.pointsEarned} points & +${result.minutesEarned} minutes`,
          { 
            duration: 4000,
            style: {
              background: '#00FFAA',
              color: '#000',
              fontWeight: 'bold'
            }
          }
        );
      } else {
        console.error('❌ Task completion failed:', result.message);
        toast.error(
          language === 'ar' 
            ? `فشل في المطالبة: ${result.message}` 
            : `Claim failed: ${result.message}`
        );
      }
    } catch (error) {
      console.error('❌ Error claiming task:', error);
      toast.error(
        language === 'ar' 
          ? 'حدث خطأ أثناء المطالبة بالمهمة. تأكد من اتصالك بالإنترنت وحاول مرة أخرى.' 
          : 'An error occurred while claiming the task. Check your internet connection and try again.'
      );
    } finally {
      setClaimingTasks(prev => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });
    }
  };

  // Handle paid task click
  const handlePaidTaskClick = async (taskId: string) => {
    console.log('🔄 Attempting to click paid task:', taskId);
    
    if (claimingTasks.has(taskId)) {
      console.log('⚠️ Task already being claimed');
      return;
    }

    const isCompleted = completedPaidTasks.has(taskId);
    
    if (isCompleted) {
      toast.info(
        language === 'ar' ? 'تم إكمال هذه المهمة بالفعل اليوم' : 'You have already completed this task today'
      );
      return;
    }

    // Get task details
    const task = paidTasks.find(t => t.id === taskId);
    
    if (!task) {
      console.error('Task not found:', taskId);
      return;
    }

    // Check if 30 seconds have passed
    const startTime = taskStartedTimes.get(taskId);
    if (!startTime || (Date.now() - startTime < 30000)) {
      toast.error(
        language === 'ar' 
          ? 'يجب انتظار 30 ثانية قبل المطالبة بالمهمة' 
          : 'You must wait 30 seconds before claiming the task'
      );
      return;
    }

    setClaimingTasks(prev => new Set([...prev, taskId]));

    try {
      console.log('📞 Calling recordTaskClickWithRewards function...');
      const result = await recordTaskClickWithRewards(taskId);
      
      console.log('📊 Click result:', result);
      
      if (result.success) {
        console.log('✅ Task clicked successfully');
        
        // Mark task as completed
        setCompletedPaidTasks(prev => new Set([...prev, taskId]));

        // Award points and minutes
        if (onPointsEarned && result.pointsEarned) {
          onPointsEarned(result.pointsEarned);
        }

        if (onMinutesEarned && result.minutesEarned) {
          onMinutesEarned(result.minutesEarned);
        }

        // Clear the timer and start time for this task
        const timer = taskTimers.get(taskId);
        if (timer) {
          clearTimeout(timer);
          setTaskTimers(prev => {
            const newMap = new Map(prev);
            newMap.delete(taskId);
            return newMap;
          });
        }
        setTaskStartedTimes(prev => {
          const newMap = new Map(prev);
          newMap.delete(taskId);
          return newMap;
        });

        toast.success(
          language === 'ar'
            ? `🎉 تم إكمال المهمة! +${result.pointsEarned} نقطة و +${result.minutesEarned} دقيقة`
            : `🎉 Task completed! +${result.pointsEarned} points & +${result.minutesEarned} minutes`,
          { 
            duration: 4000,
            style: {
              background: '#00FFAA',
              color: '#000',
              fontWeight: 'bold'
            }
          }
        );
      } else {
        console.error('❌ Task click failed:', result.message);
        toast.error(
          language === 'ar' 
            ? `فشل في المطالبة: ${result.message}` 
            : `Claim failed: ${result.message}`
        );
      }
    } catch (error) {
      console.error('❌ Error clicking paid task:', error);
      toast.error(
        language === 'ar' 
          ? 'حدث خطأ أثناء المطالبة بالمهمة. تأكد من اتصالك بالإنترنت وحاول مرة أخرى.' 
          : 'An error occurred while claiming the task. Check your internet connection and try again.'
      );
    } finally {
      setClaimingTasks(prev => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });
    }
  };

  const handleGameStart = async () => {
    try {
      const result = await recordGameSession();
      
      if (result.success) {
        // Award points and minutes
        if (onPointsEarned && result.pointsEarned) {
          onPointsEarned(result.pointsEarned);
        }

        if (onMinutesEarned && result.minutesEarned) {
          onMinutesEarned(result.minutesEarned);
        }

        toast.success(
          language === 'ar'
            ? `🎮 تم بدء اللعبة! +${result.pointsEarned} نقطة و +${result.minutesEarned} دقيقة`
            : `🎮 Game started! +${result.pointsEarned} points & +${result.minutesEarned} minutes`,
          { 
            duration: 4000,
            style: {
              background: '#00FFAA',
              color: '#000',
              fontWeight: 'bold'
            }
          }
        );

        // Open game in new tab
        window.open('https://t.me/hamster_kombat_bot/start?startapp=kentId6969392624', '_blank');
      } else {
        toast.error(
          language === 'ar' 
            ? `فشل في بدء اللعبة: ${result.message}` 
            : `Failed to start game: ${result.message}`
        );
      }
    } catch (error) {
      console.error('Error starting game:', error);
      toast.error(
        language === 'ar' 
          ? 'حدث خطأ أثناء بدء اللعبة' 
          : 'An error occurred while starting the game'
      );
    }
  };

  const handlePasswordSubmit = async () => {
    if (!passwordInput.trim()) {
      toast.error(
        language === 'ar' ? 'يرجى إدخال كلمة المرور' : 'Please enter the password'
      );
      return;
    }

    // For now, we'll accept any password and proceed with task completion
    setShowPasswordModal(false);
    
    // Start the task timer
    handleStartTask(passwordModalTaskId, 'daily', passwordModalTaskLink);
    
    // Reset modal state
    setPasswordInput('');
    setPasswordModalTaskId('');
    setPasswordModalTaskTitle('');
    setPasswordModalTaskLink('');
    setPasswordModalTaskPlatform('');
  };

  const handleMining = async () => {
    if (miningLoading) return;
    
    setMiningLoading(true);
    try {
      const result = await startOrResumeMining();
      
      if (result.success) {
        setMiningStatus(result.status);
        toast.success(
          language === 'ar' 
            ? 'تم بدء التعدين بنجاح!' 
            : 'Mining started successfully!'
        );
      } else {
        toast.error(
          language === 'ar' 
            ? `فشل في بدء التعدين: ${result.message}` 
            : `Failed to start mining: ${result.message}`
        );
      }
    } catch (error) {
      console.error('Error starting mining:', error);
      toast.error(
        language === 'ar' 
          ? 'حدث خطأ أثناء بدء التعدين' 
          : 'An error occurred while starting mining'
      );
    } finally {
      setMiningLoading(false);
    }
  };

  const handleClaimMining = async () => {
    if (miningLoading) return;
    
    setMiningLoading(true);
    try {
      const result = await claimDailyMiningReward();
      
      if (result.success) {
        setMiningStatus(result.status);
        
        // Award points and minutes
        if (onPointsEarned && result.pointsEarned) {
          onPointsEarned(result.pointsEarned);
        }

        if (onMinutesEarned && result.minutesEarned) {
          onMinutesEarned(result.minutesEarned);
        }

        toast.success(
          language === 'ar'
            ? `🎉 تم استلام مكافأة التعدين! +${result.pointsEarned} نقطة و +${result.minutesEarned} دقيقة`
            : `🎉 Mining reward claimed! +${result.pointsEarned} points & +${result.minutesEarned} minutes`,
          { 
            duration: 4000,
            style: {
              background: '#00FFAA',
              color: '#000',
              fontWeight: 'bold'
            }
          }
        );
      } else {
        toast.error(
          language === 'ar' 
            ? `فشل في استلام المكافأة: ${result.message}` 
            : `Failed to claim reward: ${result.message}`
        );
      }
    } catch (error) {
      console.error('Error claiming mining reward:', error);
      toast.error(
        language === 'ar' 
          ? 'حدث خطأ أثناء استلام المكافأة' 
          : 'An error occurred while claiming reward'
      );
    } finally {
      setMiningLoading(false);
    }
  };

  // Get platform configuration
  const getPlatformConfig = (platform: string) => {
    const configs = {
      youtube: {
        icon: Youtube,
        bgColor: 'bg-red-600',
        borderColor: 'border-red-400/30',
        glow: 'hover:shadow-[0_0_20px_rgba(239,68,68,0.3)]',
        link: 'https://youtube.com/@KENTCOIN'
      },
      instagram: {
        icon: Instagram,
        bgColor: 'bg-pink-600',
        borderColor: 'border-pink-400/30',
        glow: 'hover:shadow-[0_0_20px_rgba(236,72,153,0.3)]',
        link: 'https://instagram.com/kentcoin_official'
      },
      twitter: {
        icon: Twitter,
        bgColor: 'bg-blue-600',
        borderColor: 'border-blue-400/30',
        glow: 'hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]',
        link: 'https://twitter.com/kentcoin_x'
      },
      telegram: {
        icon: MessageCircle,
        bgColor: 'bg-blue-500',
        borderColor: 'border-blue-400/30',
        glow: 'hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]',
        link: 'https://t.me/kentcoin_channel'
      },
      tiktok: {
        icon: ExternalLink,
        bgColor: 'bg-black',
        borderColor: 'border-gray-400/30',
        glow: 'hover:shadow-[0_0_20px_rgba(156,163,175,0.3)]',
        link: 'https://tiktok.com/@kentcoin'
      }
    };

    return configs[platform as keyof typeof configs] || {
      icon: ExternalLink,
      bgColor: 'bg-gray-600',
      borderColor: 'border-gray-400/30',
      glow: 'hover:shadow-[0_0_20px_rgba(156,163,175,0.3)]',
      link: ''
    };
  };

  // Get localized task content
  const getLocalizedTaskContent = (task: any) => {
    if (language === 'ar') {
      return {
        title: task.title_ar || task.title,
        description: task.description_ar || task.description
      };
    }
    return {
      title: task.title,
      description: task.description
    };
  };

  // Get task button configuration based on task state
  const getTaskButton = (taskId: string, taskType: 'daily' | 'fixed') => {
    const isCompleted = taskType === 'daily' 
      ? completedDailyTasks.has(taskId)
      : completedFixedTasks.has(taskId);
    const isClaiming = claimingTasks.has(taskId);
    const startTime = taskStartedTimes.get(taskId);
    const hasWaited = startTime && (Date.now() - startTime >= 30000);
    
    if (isCompleted) {
      return {
        text: language === 'ar' ? '✓ مكتمل' : '✓ Completed',
        className: 'bg-gray-600 text-gray-300 cursor-not-allowed opacity-50',
        disabled: true,
        showGlow: false
      };
    }

    if (isClaiming) {
      return {
        text: language === 'ar' ? 'جاري المطالبة...' : 'Claiming...',
        className: 'bg-neonGreen/50 text-black cursor-not-allowed',
        disabled: true,
        showGlow: false
      };
    }

    // If timer is running (within 30 seconds)
    if (startTime && !hasWaited) {
      return {
        text: language === 'ar' ? 'انتظر...' : 'Wait...',
        className: 'bg-yellow-400/50 text-black cursor-not-allowed',
        disabled: true,
        showGlow: false
      };
    }

    // If 30 seconds have passed
    if (startTime && hasWaited) {
      return {
        text: language === 'ar' ? 'مطالبة' : 'Claim',
        className: 'bg-neonGreen text-black hover:brightness-110 animate-pulse shadow-[0_0_15px_rgba(0,255,136,0.5)]',
        disabled: false,
        showGlow: true
      };
    }

    // Default state - start task
    return {
      text: language === 'ar' ? 'ابدأ المهمة' : 'Start Task',
      className: 'bg-neonGreen text-black hover:brightness-110',
      disabled: false,
      showGlow: false
    };
  };

  // Get paid task button configuration based on task state
  const getPaidTaskButton = (taskId: string) => {
    const isCompleted = completedPaidTasks.has(taskId);
    const isClaiming = claimingTasks.has(taskId);
    const startTime = taskStartedTimes.get(taskId);
    const hasWaited = startTime && (Date.now() - startTime >= 30000);
    
    if (isCompleted) {
      return {
        text: language === 'ar' ? '✓ مكتمل' : '✓ Completed',
        className: 'bg-gray-600 text-gray-300 cursor-not-allowed opacity-50',
        disabled: true,
        showGlow: false
      };
    }

    if (isClaiming) {
      return {
        text: language === 'ar' ? 'جاري المطالبة...' : 'Claiming...',
        className: 'bg-neonGreen/50 text-black cursor-not-allowed',
        disabled: true,
        showGlow: false
      };
    }

    // If timer is running (within 30 seconds)
    if (startTime && !hasWaited) {
      return {
        text: language === 'ar' ? 'انتظر...' : 'Wait...',
        className: 'bg-yellow-400/50 text-black cursor-not-allowed',
        disabled: true,
        showGlow: false
      };
    }

    // If 30 seconds have passed
    if (startTime && hasWaited) {
      return {
        text: language === 'ar' ? 'مطالبة' : 'Claim',
        className: 'bg-neonGreen text-black hover:brightness-110 animate-pulse shadow-[0_0_15px_rgba(0,255,136,0.5)]',
        disabled: false,
        showGlow: true
      };
    }

    // Default state - start task
    return {
      text: language === 'ar' ? 'ابدأ المهمة' : 'Start Task',
      className: 'bg-neonGreen text-black hover:brightness-110',
      disabled: false,
      showGlow: false
    };
  };

  if (!tasksLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#041e11] via-[#051a13] to-[#040d0c]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neonGreen mx-auto mb-4"></div>
          <p className="text-white">
            {language === 'ar' ? 'جاري تحميل المهام...' : 'Loading tasks...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#041e11] via-[#051a13] to-[#040d0c] pb-20">
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <h2 className="text-2xl font-bold text-white mb-6">
          {language === 'ar' ? '📋 المهام' : '📋 Tasks'}
        </h2>
        
        {/* Tab Navigation */}
        <div className="flex bg-black/40 backdrop-blur-sm rounded-xl p-1 mb-6">
          <button
            onClick={() => setActiveTab('daily')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium text-sm transition-all duration-300 ${
              activeTab === 'daily'
                ? 'bg-neonGreen text-black shadow-[0_0_15px_rgba(0,255,136,0.3)]'
                : 'text-white/70 hover:text-white'
            }`}
          >
            {language === 'ar' ? 'يومية' : 'Daily'}
          </button>
          <button
            onClick={() => setActiveTab('fixed')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium text-sm transition-all duration-300 ${
              activeTab === 'fixed'
                ? 'bg-neonGreen text-black shadow-[0_0_15px_rgba(0,255,136,0.3)]'
                : 'text-white/70 hover:text-white'
            }`}
          >
            {language === 'ar' ? 'ثابتة' : 'Fixed'}
          </button>
          <button
            onClick={() => setActiveTab('mining')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium text-sm transition-all duration-300 ${
              activeTab === 'mining'
                ? 'bg-neonGreen text-black shadow-[0_0_15px_rgba(0,255,136,0.3)]'
                : 'text-white/70 hover:text-white'
            }`}
          >
            {language === 'ar' ? 'تعدين' : 'Mining'}
          </button>
        </div>
      </div>

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-black/90 border border-neonGreen/30 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-white font-semibold mb-4">
              {language === 'ar' ? 'أدخل كلمة المرور' : 'Enter Password'}
            </h3>
            <p className="text-white/70 text-sm mb-4">
              {passwordModalTaskTitle}
            </p>
            <p className="text-yellow-400 text-sm mb-4">
              {language === 'ar' 
                ? 'ستجد كلمة المرور في الفيديو. شاهد الفيديو كاملاً للحصول عليها.'
                : 'You will find the password in the video. Watch the full video to get it.'
              }
            </p>
            <input
              type="text"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder={language === 'ar' ? 'كلمة المرور...' : 'Password...'}
              className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 mb-4"
              onKeyPress={(e) => e.key === 'Enter' && handlePasswordSubmit()}
            />
            <div className="flex gap-3">
              <button
                onClick={handlePasswordSubmit}
                className="flex-1 bg-neonGreen text-black py-3 rounded-lg font-medium hover:brightness-110 transition-all duration-300"
              >
                {language === 'ar' ? 'تأكيد' : 'Confirm'}
              </button>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordInput('');
                  setPasswordModalTaskId('');
                  setPasswordModalTaskTitle('');
                  setPasswordModalTaskLink('');
                  setPasswordModalTaskPlatform('');
                }}
                className="flex-1 bg-red-600 text-white py-3 rounded-lg font-medium hover:brightness-110 transition-all duration-300"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mining Tab */}
      {activeTab === 'mining' && (
        <div className="px-6">
          <div className="bg-black/40 backdrop-blur-sm border border-neonGreen/30 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <Pickaxe className="w-6 h-6 text-neonGreen" />
              <h3 className="text-xl font-bold text-white">
                {language === 'ar' ? '⛏️ التعدين' : '⛏️ Mining'}
              </h3>
            </div>
            
            {miningStatus ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-black/30 rounded-lg p-3">
                    <p className="text-white/70 text-sm">
                      {language === 'ar' ? 'الحالة' : 'Status'}
                    </p>
                    <p className="text-neonGreen font-semibold">
                      {miningStatus.is_active 
                        ? (language === 'ar' ? 'نشط' : 'Active')
                        : (language === 'ar' ? 'غير نشط' : 'Inactive')
                      }
                    </p>
                  </div>
                  <div className="bg-black/30 rounded-lg p-3">
                    <p className="text-white/70 text-sm">
                      {language === 'ar' ? 'المعدل/ساعة' : 'Rate/Hour'}
                    </p>
                    <p className="text-neonGreen font-semibold">
                      {miningStatus.mining_rate} {language === 'ar' ? 'نقطة' : 'points'}
                    </p>
                  </div>
                </div>
                
                {miningStatus.can_claim_daily && (
                  <button
                    onClick={handleClaimMining}
                    disabled={miningLoading}
                    className="w-full bg-neonGreen text-black py-4 rounded-lg font-bold text-lg hover:brightness-110 transition-all duration-300 animate-pulse shadow-[0_0_20px_rgba(0,255,136,0.5)]"
                  >
                    {miningLoading 
                      ? (language === 'ar' ? 'جاري الاستلام...' : 'Claiming...')
                      : (language === 'ar' ? '🎁 استلام المكافأة اليومية' : '🎁 Claim Daily Reward')
                    }
                  </button>
                )}
                
                {!miningStatus.is_active && (
                  <button
                    onClick={handleMining}
                    disabled={miningLoading}
                    className="w-full bg-neonGreen text-black py-4 rounded-lg font-bold text-lg hover:brightness-110 transition-all duration-300"
                  >
                    {miningLoading 
                      ? (language === 'ar' ? 'جاري البدء...' : 'Starting...')
                      : (language === 'ar' ? '⛏️ بدء التعدين' : '⛏️ Start Mining')
                    }
                  </button>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neonGreen mx-auto mb-4"></div>
                <p className="text-white/70">
                  {language === 'ar' ? 'جاري تحميل حالة التعدين...' : 'Loading mining status...'}
                </p>
              </div>
            )}
          </div>
          
          {/* Game Section */}
          <div className="bg-black/40 backdrop-blur-sm border border-purple-400/30 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Gamepad2 className="w-6 h-6 text-purple-400" />
              <h3 className="text-xl font-bold text-white">
                {language === 'ar' ? '🎮 لعبة هامستر كومبات' : '🎮 Hamster Kombat Game'}
              </h3>
            </div>
            
            <p className="text-white/70 text-sm mb-4">
              {language === 'ar' 
                ? 'العب لعبة هامستر كومبات واحصل على نقاط ودقائق إضافية!'
                : 'Play Hamster Kombat game and earn extra points and minutes!'
              }
            </p>
            
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-neonGreen">
                +50 {language === 'ar' ? 'نقطة' : 'points'} & +50 {language === 'ar' ? 'دقيقة' : 'minutes'}
              </span>
            </div>
            
            <button
              onClick={handleGameStart}
              className="w-full bg-purple-600 text-white py-4 rounded-lg font-bold text-lg hover:brightness-110 transition-all duration-300 hover:shadow-[0_0_20px_rgba(147,51,234,0.5)]"
            >
              {language === 'ar' ? '🎮 ابدأ اللعب' : '🎮 Start Playing'}
            </button>
          </div>
        </div>
      )}

      {/* Paid Tasks Section */}
      {tasksLoaded && paidTasks.length > 0 && (
        <div className="px-6 mt-8">
          <h3 className="text-xl font-bold text-white mb-6">
            {language === 'ar' ? '💰 المهام المدفوعة' : '💰 Paid Tasks'}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {paidTasks.map((task) => {
              const platformConfig = getPlatformConfig(task.platform);
              const buttonConfig = getPaidTaskButton(task.id);
              const isCompleted = completedPaidTasks.has(task.id);
              
              // Format task title and description
              const localizedContent = getLocalizedTaskContent(task);
              
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
                    <span className="ml-auto px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded-full border border-purple-500/30">
                      {language === 'ar' ? 'مدفوعة' : 'Paid'}
                    </span>
                  </div>
                  
                  <p className="text-xs text-white/70 mb-3">{localizedContent.description}</p>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neonGreen">
                      +10 {language === 'ar' ? 'نقطة' : 'points'} & +10 {language === 'ar' ? 'دقيقة' : 'minutes'}
                    </span>
                    
                    <button
                      onClick={() => {
                        if (buttonConfig.text.includes('Start') || buttonConfig.text.includes('ابدأ')) {
                          handleStartTask(task.id, 'daily', task.link);
                        } else if (buttonConfig.text.includes('Claim') || buttonConfig.text.includes('مطالبة')) {
                          handlePaidTaskClick(task.id);
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
      {tasksLoaded && dailyTasks.length > 0 && (
        <div className="px-6 daily-tasks-section">
          <h3 className="text-xl font-bold text-white mb-6">
            {language === 'ar' ? '📅 المهام اليومية' : '📅 Daily Tasks'}
          </h3>

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

      {/* Fixed Tasks Section */}
      {activeTab === 'fixed' && tasksLoaded && fixedTasks.length > 0 && (
        <div className="px-6">
          <h3 className="text-xl font-bold text-white mb-6">
            {language === 'ar' ? '📌 المهام الثابتة' : '📌 Fixed Tasks'}
          </h3>
          
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
                : '4. Fixed tasks give 20 points + 20 minutes, daily and paid tasks give 10 points + 10 minutes'
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
    </div>
  );
};

export default TasksPage;