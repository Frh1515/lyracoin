import React, { useState, useEffect } from 'react';
import { FaYoutube, FaFacebook, FaTiktok, FaTelegram, FaInstagram, FaXTwitter } from 'react-icons/fa6';
import { Gamepad2, Clock, Pickaxe, Timer, Share2, Smartphone, Zap, Plus, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import CryptoCandyCrushGame from '../components/CryptoCandyCrushGame';
import PasswordInputModal from '../components/PasswordInputModal';
import BoostTimeModal from '../components/BoostTimeModal';
import { getDailyTasks } from '../../lib/supabase/getDailyTasks';
import { getFixedTasks } from '../../lib/supabase/getFixedTasks';
import { claimDailyTask } from '../../lib/supabase/claimDailyTask';
import { claimFixedTask } from '../../lib/supabase/claimFixedTask';
import { recordGameSession } from '../../lib/supabase/recordGameSession';
import { getMiningStatus, startOrResumeMining, claimDailyMiningReward } from '../../lib/supabase/mining';
import { getUserPaidTasks } from '../../lib/supabase/paidTasksSystem';
import { getActiveBoost, applyBoostToMining } from '../../lib/supabase/boostSystem';
import type { MiningStatus } from '../../lib/supabase/types';
import PaidTaskCard from '../components/PaidTaskCard';
import toast from 'react-hot-toast';

interface TasksPageProps {
  onMinutesEarned?: (minutes: number) => void;
  onPointsEarned?: (points: number) => void;
}

const TasksPage: React.FC<TasksPageProps> = ({ onMinutesEarned, onPointsEarned }) => {
  const [showCryptoCandyCrushGame, setShowCryptoCandyCrushGame] = useState(false);
  const navigate = useNavigate();
  const [dailyTasks, setDailyTasks] = useState<any[]>([]);
  const [fixedTasks, setFixedTasks] = useState<any[]>([]);
  const [completedDailyTasks, setCompletedDailyTasks] = useState<Set<string>>(new Set());
  const [completedFixedTasks, setCompletedFixedTasks] = useState<Set<string>>(new Set());
  const [claimingTasks, setClaimingTasks] = useState<Set<string>>(new Set());
  const [paidTasks, setPaidTasks] = useState<any[]>([]);
  const [completedPaidTasks, setCompletedPaidTasks] = useState<Set<string>>(new Set());
  const [paidTasksLoaded, setPaidTasksLoaded] = useState(false);
  const [taskTimers, setTaskTimers] = useState<Map<string, NodeJS.Timeout>>(new Map());
  const [taskStartedTimes, setTaskStartedTimes] = useState<Map<string, number>>(new Map());
  const [tasksLoaded, setTasksLoaded] = useState(false);
  const [gameSessionsRemaining, setGameSessionsRemaining] = useState(3);
  
  // Password modal states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordModalTaskId, setPasswordModalTaskId] = useState<string | null>(null);
  const [passwordModalTaskTitle, setPasswordModalTaskTitle] = useState<string>('');
  const [passwordModalTaskLink, setPasswordModalTaskLink] = useState<string>('');
  const [passwordModalTaskPlatform, setPasswordModalTaskPlatform] = useState<string>('');
  const [verifiedPasswords, setVerifiedPasswords] = useState<Set<string>>(new Set());
  
  // Mining states
  const [miningStatus, setMiningStatus] = useState<MiningStatus | null>(null);
  const [miningCountdown, setMiningCountdown] = useState<string>('');
  const [isMiningLoading, setIsMiningLoading] = useState(false);
  const [miningInterval, setMiningInterval] = useState<NodeJS.Timeout | null>(null);
  
  // Boost states
  const [showBoostModal, setShowBoostModal] = useState(false);
  const [activeBoost, setActiveBoost] = useState<{
    multiplier: number;
    endTime: string;
    remainingHours: number;
  } | null>(null);
  const [isBoostLoading, setIsBoostLoading] = useState(false);
  
  const { language } = useLanguage();

  // Platform configurations with updated links
  const platformConfigs: Record<string, any> = {
    'youtube': {
      icon: FaYoutube,
      borderColor: 'border-red-500',
      glow: 'drop-shadow-[0_0_20px_#FF0000]',
      bgColor: 'bg-red-500',
      link: 'https://youtube.com/shorts/9SWH3E8SIxo?si=q5YF3Vk1bwfWqlOM'
    },
    'facebook': {
      icon: FaFacebook,
      borderColor: 'border-blue-500',
      glow: 'drop-shadow-[0_0_20px_#1877F2]',
      bgColor: 'bg-blue-500',
      link: 'https://www.facebook.com/reel/1064630629067015'
    },
    'tiktok': {
      icon: FaTiktok,
      borderColor: 'border-pink-500',
      glow: 'drop-shadow-[0_0_20px_#FF0050]',
      bgColor: 'bg-pink-500',
      link: 'https://www.tiktok.com/@lyracoin/video/7521544869249043720'
    },
    'telegram': {
      icon: FaTelegram,
      borderColor: 'border-cyan-400',
      glow: 'drop-shadow-[0_0_20px_#0088cc]',
      bgColor: 'bg-cyan-400',
      link: 'https://t.me/LYRACOIN25'
    },
    'instagram': {
      icon: FaInstagram,
      borderColor: 'border-purple-500',
      glow: 'drop-shadow-[0_0_20px_#C13584]',
      bgColor: 'bg-purple-500',
      link: 'https://www.instagram.com/reel/DLgatRZNcJF/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA=='
    },
    'twitter': {
      icon: FaXTwitter,
      borderColor: 'border-sky-400',
      glow: 'drop-shadow-[0_0_20px_#1DA1F2]',
      bgColor: 'bg-sky-400',
      link: 'https://x.com/CoinLyra90781/status/1939493388232900942'
    },
    'app': {
      icon: Smartphone,
      borderColor: 'border-gray-500',
      glow: 'drop-shadow-[0_0_20px_#888888]',
      bgColor: 'bg-gray-500',
      link: ''
    },
    'social': {
      icon: Share2,
      borderColor: 'border-yellow-400',
      glow: 'drop-shadow-[0_0_20px_#FACC15]',
      bgColor: 'bg-yellow-400',
      link: ''
    }
  };

  // Load tasks when component mounts
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
          console.log('✅ Daily tasks loaded:', dailyData.tasks.length);
          setDailyTasks(dailyData.tasks);
          const completedDaily = new Set(dailyData.completedTasks.map(ct => ct.daily_task_id));
          setCompletedDailyTasks(completedDaily);
          console.log('✅ Completed daily tasks:', completedDaily.size);
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
          console.log('✅ Fixed tasks loaded:', fixedData.tasks.length);
          setFixedTasks(fixedData.tasks);
          const completedFixed = new Set(fixedData.completedTasks.map(ct => ct.fixed_task_id));
          setCompletedFixedTasks(completedFixed);
          console.log('✅ Completed fixed tasks:', completedFixed.size);
        }

        // Load paid tasks
        const { data: paidData, error: paidError } = await getUserPaidTasks();
        if (paidError) {
          console.error('Error loading paid tasks:', paidError);
          toast.error(
            language === 'ar' 
              ? 'فشل في تحميل المهام المدفوعة' 
              : 'Failed to load paid tasks'
          );
        } else if (paidData) {
          console.log('✅ Paid tasks loaded:', paidData.length);
          setPaidTasks(paidData);
          // For now, we don't have a way to track completed paid tasks per user
          // This would be implemented with a separate table in a real app
          setPaidTasksLoaded(true);
        }

        setTasksLoaded(true);
        console.log('✅ All tasks loaded successfully');
      } catch (error) {
        console.error('Error loading tasks:', error);
        toast.error(
          language === 'ar' 
            ? 'حدث خطأ في تحميل المهام' 
            : 'Error loading tasks'
        );
        setTasksLoaded(true);
      }
    };

    loadTasks();
  }, [language]);

  // Load mining status and active boost when component mounts
  useEffect(() => {
    const loadMiningStatus = async () => {
      try {
        const { data, error } = await getMiningStatus();
        if (error) {
          console.error('Error loading mining status:', error);
        } else if (data) {
          setMiningStatus(data);
        }
      } catch (error) {
        console.error('Error loading mining status:', error);
      }
    };

    const loadActiveBoost = async () => {
      try {
        const { data, error } = await getActiveBoost();
        if (error) {
          console.error('Error loading active boost:', error);
        } else if (data) {
          setActiveBoost({
            multiplier: data.multiplier,
            endTime: data.end_time,
            remainingHours: data.remainingHours
          });
        }
      } catch (error) {
        console.error('Error loading active boost:', error);
      }
    };

    loadMiningStatus();
    loadActiveBoost();
  }, []);

  // Update mining countdown every second
  useEffect(() => {
    if (miningStatus?.mining_active && miningStatus.countdown_remaining_minutes > 0) {
      const interval = setInterval(() => {
        const remainingMinutes = miningStatus.countdown_remaining_minutes;
        const currentTime = Date.now();
        const startTime = new Date(miningStatus.mining_start_time!).getTime();
        const elapsedMs = currentTime - startTime;
        const remainingMs = Math.max(0, (6 * 60 * 60 * 1000) - elapsedMs); // 6 hours in ms
        
        if (remainingMs <= 0) {
          setMiningCountdown('');
          // Refresh mining status
          refreshMiningStatus();
          clearInterval(interval);
        } else {
          const hours = Math.floor(remainingMs / (60 * 60 * 1000));
          const minutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
          const seconds = Math.floor((remainingMs % (60 * 1000)) / 1000);
          setMiningCountdown(`${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        }
      }, 1000);

      setMiningInterval(interval);
      return () => clearInterval(interval);
    } else {
      setMiningCountdown('');
      if (miningInterval) {
        clearInterval(miningInterval);
        setMiningInterval(null);
      }
    }
  }, [miningStatus]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      taskTimers.forEach(timer => clearTimeout(timer));
      if (miningInterval) {
        clearInterval(miningInterval);
      }
    };
  }, [taskTimers, miningInterval]);

  const refreshMiningStatus = async () => {
    try {
      const { data, error } = await getMiningStatus();
      if (error) {
        console.error('Error refreshing mining status:', error);
      } else if (data) {
        setMiningStatus(data);
      }
    } catch (error) {
      console.error('Error refreshing mining status:', error);
    }
  };

  const refreshActiveBoost = async () => {
    try {
      const { data, error } = await getActiveBoost();
      if (error) {
        console.error('Error refreshing active boost:', error);
      } else if (data) {
        setActiveBoost({
          multiplier: data.multiplier,
          endTime: data.end_time,
          remainingHours: data.remainingHours
        });
      } else {
        setActiveBoost(null);
      }
    } catch (error) {
      console.error('Error refreshing active boost:', error);
    }
  };

  const handleMineClick = async () => {
    setIsMiningLoading(true);
    try {
      const result = await startOrResumeMining();
      
      if (result.success) {
        toast.success(
          language === 'ar' 
            ? '🎯 بدأ التعدين! ستحصل على الدقائق كل 6 ساعات'
            : '🎯 Mining started! You will earn minutes every 6 hours',
          { 
            duration: 3000,
            style: {
              background: '#00FFAA',
              color: '#000',
              fontWeight: 'bold'
            }
          }
        );
        
        // Refresh mining status
        await refreshMiningStatus();
      } else {
        toast.error(
          language === 'ar' 
            ? `فشل بدء التعدين: ${result.message}`
            : `Failed to start mining: ${result.message}`
        );
      }
    } catch (error) {
      console.error('Error starting mining:', error);
      toast.error(
        language === 'ar' 
          ? 'حدث خطأ أثناء بدء التعدين'
          : 'Error starting mining'
      );
    } finally {
      setIsMiningLoading(false);
    }
  };

  const handleClaimClick = async () => {
    setIsMiningLoading(true);
    try {
      const result = await claimDailyMiningReward();
      
      if (result.success) {
        const boostMessage = result.boost_multiplier && result.boost_multiplier > 1
          ? (language === 'ar' 
              ? ` (مضاعفة ×${result.boost_multiplier})`
              : ` (boosted ×${result.boost_multiplier})`)
          : '';
          
        toast.success(
          language === 'ar' 
            ? `🎉 تم استلام المكافأة! +${result.minutes_claimed} دقيقة${boostMessage} و +${result.points_awarded} نقطة`
            : `🎉 Reward claimed! +${result.minutes_claimed} minutes${boostMessage} & +${result.points_awarded} points`,
          { 
            duration: 4000,
            style: {
              background: '#00FFAA',
              color: '#000',
              fontWeight: 'bold'
            }
          }
        );
        
        // Update parent component
        if (onMinutesEarned && result.minutes_claimed) {
          onMinutesEarned(result.minutes_claimed);
        }
        if (onPointsEarned && result.points_awarded) {
          onPointsEarned(result.points_awarded);
        }
        
        // Refresh mining status
        await refreshMiningStatus();
      } else {
        toast.error(
          language === 'ar' 
            ? `فشل استلام المكافأة: ${result.message}`
            : `Failed to claim reward: ${result.message}`
        );
      }
    } catch (error) {
      console.error('Error claiming mining reward:', error);
      toast.error(
        language === 'ar' 
          ? 'حدث خطأ أثناء استلام المكافأة'
          : 'Error claiming reward'
      );
    } finally {
      setIsMiningLoading(false);
    }
  };

  const handleBoostClick = async () => {
    // Disabled - just show toast about coming soon
    toast.info(
      language === 'ar' 
        ? 'ميزة مضاعفة الوقت ستكون متاحة قريباً!'
        : 'Boost Time feature coming soon!',
      { 
        duration: 3000,
        style: {
          background: '#3B82F6',
          color: '#fff'
        }
      }
    );
  };

  const handleBoostPurchased = async () => {
    // Refresh active boost after purchase
    await refreshActiveBoost();
    
    toast.success(
      language === 'ar'
        ? '🚀 تم تفعيل المضاعف! اضغط على زر "Boost Time" لاستخدامه'
        : '🚀 Boost activated! Click "Boost Time" to use it',
      { 
        duration: 5000,
        style: {
          background: '#00FFAA',
          color: '#000',
          fontWeight: 'bold'
        }
      }
    );
  };

  const getMiningButtonConfig = () => {
    if (!miningStatus) {
      return {
        text: language === 'ar' ? 'تعدين' : 'Mine',
        disabled: true,
        onClick: handleMineClick,
        className: 'bg-gray-600 text-gray-300 cursor-not-allowed'
      };
    }

    // Check if user can claim (24 hours passed and has accumulated minutes)
    if (miningStatus.can_claim && miningStatus.total_accumulated_minutes > 0) {
      return {
        text: language === 'ar' ? 'استلام' : 'Claim',
        disabled: isMiningLoading,
        onClick: handleClaimClick,
        className: 'bg-yellow-400 text-black hover:brightness-110 animate-pulse shadow-[0_0_15px_rgba(255,204,21,0.5)]'
      };
    }

    // If mining is active
    if (miningStatus.mining_active) {
      return {
        text: language === 'ar' ? 'جاري التعدين...' : 'Mining...',
        disabled: true,
        onClick: () => {},
        className: 'bg-neonGreen/50 text-black cursor-not-allowed'
      };
    }

    // Default mine button
    return {
      text: language === 'ar' ? 'تعدين' : 'Mine',
      disabled: isMiningLoading,
      onClick: handleMineClick,
      className: 'bg-neonGreen text-black hover:brightness-110'
    };
  };

  const getBoostButtonConfig = () => {
    // Always disabled with "Soon" indicator
    return {
      text: language === 'ar' ? 'مضاعفة الوقت' : 'Boost Time',
      disabled: true,
      className: 'bg-gray-600 text-gray-300 cursor-not-allowed opacity-60'
    };
  };

  const handleStartTask = (taskId: string, taskType: 'daily' | 'fixed', taskLink?: string) => {
    console.log('🔄 Starting task:', { taskId, taskType, taskLink });
    
    // Check if task is already completed
    const isCompleted = taskType === 'daily' 
      ? completedDailyTasks.has(taskId) 
      : completedFixedTasks.has(taskId);
    
    if (isCompleted) {
      toast.info(
        language === 'ar' ? 'تم إكمال هذه المهمة بالفعل' : 'This task is already completed'
      );
      return;
    }

    // Get task details
    const task = taskType === 'daily'
      ? dailyTasks.find(t => t.id === taskId)
      : fixedTasks.find(t => t.id === taskId);
    
    if (!task) {
      console.error('Task not found:', taskId);
      return;
    }

    // Check if this is a YouTube or TikTok daily task
    const isVideoTask = taskType === 'daily' && (task.platform === 'youtube' || task.platform === 'tiktok');

    // If there's a link, open it
    if (taskLink) {
      window.open(taskLink, '_blank');
    }

    const startTime = Date.now();
    setTaskStartedTimes(prev => new Map(prev.set(taskId, startTime)));
    
    // Start 30-second timer
    const timer = setTimeout(() => {
      setTaskTimers(prev => {
        const newMap = new Map(prev);
        newMap.delete(taskId);
        return newMap;
      });

      // If this is a YouTube or TikTok daily task, show password modal after 30 seconds
      if (isVideoTask) {
        // Get localized task title
        const localizedContent = getLocalizedTaskContent(task);
        
        setPasswordModalTaskId(taskId);
        setPasswordModalTaskTitle(localizedContent.title);
        setPasswordModalTaskLink(taskLink || '');
        setPasswordModalTaskPlatform(task.platform);
        setShowPasswordModal(true);
      }
    }, 30000);
    
    setTaskTimers(prev => new Map(prev.set(taskId, timer)));
  };

  const handlePasswordSubmit = (password: string) => {
    if (!passwordModalTaskId) return;
    
    // Check if password is correct
    if (password.trim().toUpperCase() === 'HOERLYRACOIN') {
      // Add task to verified passwords
      setVerifiedPasswords(prev => new Set([...prev, passwordModalTaskId]));
      
      // Close modal
      setShowPasswordModal(false);
      
      // Show success message
      toast.success(
        language === 'ar'
          ? 'كلمة المرور صحيحة! يمكنك الآن المطالبة بالمكافأة'
          : 'Correct password! You can now claim the reward',
        { 
          duration: 3000,
          style: {
            background: '#00FFAA',
            color: '#000',
            fontWeight: 'bold'
          }
        }
      );
    } else {
      // Show error message
      toast.error(
        language === 'ar'
          ? 'كلمة المرور غير صحيحة، حاول مرة أخرى'
          : 'Incorrect password, please try again',
        { 
          duration: 3000,
          style: {
            background: '#FF6347',
            color: '#fff'
          }
        }
      );
    }
  };

  const handleClaimTask = async (taskId: string, taskType: 'daily' | 'fixed') => {
    console.log('🔄 Attempting to claim task:', { taskId, taskType });
    
    if (claimingTasks.has(taskId)) {
      console.log('⚠️ Task already being claimed');
      return;
    }

    const isCompleted = taskType === 'daily' 
      ? completedDailyTasks.has(taskId) 
      : completedFixedTasks.has(taskId);
    
    if (isCompleted) {
      toast.info(
        language === 'ar' ? 'تم إكمال هذه المهمة بالفعل' : 'This task is already completed'
      );
      return;
    }

    // Get task details
    const task = taskType === 'daily'
      ? dailyTasks.find(t => t.id === taskId)
      : fixedTasks.find(t => t.id === taskId);
    
    if (!task) {
      console.error('Task not found:', taskId);
      return;
    }

    // Check if this is a YouTube or TikTok daily task that requires password verification
    const isVideoTask = taskType === 'daily' && (task.platform === 'youtube' || task.platform === 'tiktok');
    
    if (isVideoTask && !verifiedPasswords.has(taskId)) {
      // Get localized task title
      const localizedContent = getLocalizedTaskContent(task);
      const platformConfig = getPlatformConfig(task.platform);
      
      // Show password modal
      setPasswordModalTaskId(taskId);
      setPasswordModalTaskTitle(localizedContent.title);
      setPasswordModalTaskLink(platformConfig.link || '');
      setPasswordModalTaskPlatform(task.platform);
      setShowPasswordModal(true);
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
      console.log('📞 Calling claim function...');
      const result = taskType === 'daily' 
        ? await claimDailyTask(taskId)
        : await claimFixedTask(taskId);
      
      console.log('📊 Claim result:', result);
      
      if (result.success) {
        console.log('✅ Task claimed successfully');
        
        // Mark task as completed
        if (taskType === 'daily') {
          setCompletedDailyTasks(prev => new Set([...prev, taskId]));
        } else {
          setCompletedFixedTasks(prev => new Set([...prev, taskId]));
        }

        // Award points
        if (onPointsEarned && result.pointsEarned) {
          onPointsEarned(result.pointsEarned);
        }

        // Award minutes (20 minutes for fixed tasks, special for YouTube/TikTok)
        let minutesEarned = taskType === 'fixed' ? 20 : 10;
        
        // Special rewards for YouTube and TikTok daily tasks
        if (taskType === 'daily' && (task.platform === 'youtube' || task.platform === 'tiktok')) {
          minutesEarned = 100; // Increased to 100 minutes for YouTube and TikTok
        }
        
        if (onMinutesEarned) {
          onMinutesEarned(minutesEarned);
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

        // Remove from verified passwords if it was a video task
        if (isVideoTask) {
          setVerifiedPasswords(prev => {
            const newSet = new Set(prev);
            newSet.delete(taskId);
            return newSet;
          });
        }

        toast.success(
          language === 'ar'
            ? `🎉 تم إكمال المهمة! +${result.pointsEarned} نقطة و +${minutesEarned} دقيقة`
            : `🎉 Task completed! +${result.pointsEarned} points & +${minutesEarned} minutes`,
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
        console.error('❌ Task claim failed:', result.message);
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

  const handleGameStart = async () => {
    try {
      const result = await recordGameSession();
      
      if (result.success) {
        if (onPointsEarned && result.pointsEarned) {
          onPointsEarned(result.pointsEarned);
        }
        setGameSessionsRemaining(result.sessionsRemaining || 0);
        setShowCryptoCandyCrushGame(true);
        
        toast.success(
          language === 'ar'
            ? `🎮 جلسة لعب مسجلة! +${result.pointsEarned} نقطة`
            : `🎮 Game session recorded! +${result.pointsEarned} points`,
          { 
            duration: 3000,
            style: {
              background: '#00FFAA',
              color: '#000',
              fontWeight: 'bold'
            }
          }
        );
      } else {
        // Allow unlimited sessions but only count first 3
        setShowCryptoCandyCrushGame(true);
        toast.info(
          language === 'ar' 
            ? result.message 
            : result.message
        );
      }
    } catch (error) {
      console.error('Error recording game session:', error);
      // Still allow game to start
      setShowCryptoCandyCrushGame(true);
    }
  };

  const handleGameClose = () => {
    setShowCryptoCandyCrushGame(false);
  };

  // Helper function to get platform icon and styling based on platform name
  const getPlatformConfig = (platform: string) => {
    return platformConfigs[platform.toLowerCase()] || {
      icon: FaTelegram,
      borderColor: 'border-gray-500',
      glow: 'drop-shadow-[0_0_20px_#888888]',
      bgColor: 'bg-gray-500',
      link: ''
    };
  };

  // Function to get localized task title and description
  const getLocalizedTaskContent = (task: any) => {
    if (language === 'ar') {
      // For Arabic, use the Arabic part of the title/description if it exists
      const titleParts = task.title.split(' | ');
      const descParts = task.description.split(' | ');
      
      return {
        title: titleParts.length > 1 ? titleParts[0] : task.title,
        description: descParts.length > 1 ? descParts[0] : task.description
      };
    } else {
      // For English, use the English part if it exists, otherwise use the full text
      const titleParts = task.title.split(' | ');
      const descParts = task.description.split(' | ');
      
      return {
        title: titleParts.length > 1 ? titleParts[1] : task.title,
        description: descParts.length > 1 ? descParts[1] : task.description
      };
    }
  };

  // Function to handle paid task click
  const handlePaidTaskClick = () => {
    // Refresh paid tasks after a click
    const refreshPaidTasks = async () => {
      try {
        const { data, error } = await getUserPaidTasks();
        if (error) {
          console.error('Error refreshing paid tasks:', error);
        } else if (data) {
          setPaidTasks(data);
        }
      } catch (error) {
        console.error('Error refreshing paid tasks:', error);
      }
    };
    
    refreshPaidTasks();
  };

  // Get task button configuration based on task state
  const getTaskButton = (taskId: string, taskType: 'daily' | 'fixed') => {
    const isCompleted = taskType === 'daily' 
      ? completedDailyTasks.has(taskId) 
      : completedFixedTasks.has(taskId);
    
    const isClaiming = claimingTasks.has(taskId);
    const startTime = taskStartedTimes.get(taskId);
    const hasWaited = startTime && (Date.now() - startTime >= 30000);
    
    // Get task details
    const task = taskType === 'daily'
      ? dailyTasks.find(t => t.id === taskId)
      : fixedTasks.find(t => t.id === taskId);
    
    // Check if this is a YouTube or TikTok daily task that requires password verification
    const isVideoTask = task && taskType === 'daily' && (task.platform === 'youtube' || task.platform === 'tiktok');
    const isPasswordVerified = isVideoTask ? verifiedPasswords.has(taskId) : true;

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

    // If 30 seconds have passed but password not verified for video tasks
    if (startTime && hasWaited && isVideoTask && !isPasswordVerified) {
      return {
        text: language === 'ar' ? 'أدخل كلمة المرور' : 'Enter Password',
        className: 'bg-yellow-400 text-black hover:brightness-110',
        disabled: false,
        showGlow: false
      };
    }

    // If 30 seconds have passed and password verified (or not needed)
    if (startTime && hasWaited && isPasswordVerified) {
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
        <div className="text-white animate-pulse">
          {language === 'ar' ? 'جاري تحميل المهام...' : 'Loading tasks...'}
        </div>
      </div>
    );
  }

  const miningButtonConfig = getMiningButtonConfig();
  const boostButtonConfig = getBoostButtonConfig();

  const getBoostStatusColor = (multiplier: number) => {
    switch (multiplier) {
      case 2: return 'text-blue-500 bg-blue-500/20 border-blue-500/30';
      case 3: return 'text-purple-500 bg-purple-500/20 border-purple-500/30';
      case 4: return 'text-pink-500 bg-pink-500/20 border-pink-500/30';
      case 6: return 'text-yellow-400 bg-yellow-400/20 border-yellow-400/30';
      case 10: return 'text-red-500 bg-red-500/20 border-red-500/30';
      default: return 'text-neonGreen bg-neonGreen/20 border-neonGreen/30';
    }
  };

  return (
    <div className="min-h-screen pb-24 bg-gradient-to-b from-[#041e11] via-[#051a13] to-[#040d0c]">
      {/* Crypto Candy Crush Game Modal */}
      {showCryptoCandyCrushGame && (
        <CryptoCandyCrushGame 
          onClose={handleGameClose} 
          onMinutesEarned={onMinutesEarned}
          gameSessionsRemaining={gameSessionsRemaining}
        />
      )}

      {/* Password Input Modal */}
      <PasswordInputModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onSubmit={handlePasswordSubmit}
        taskTitle={passwordModalTaskTitle}
        taskLink={passwordModalTaskLink}
        platform={passwordModalTaskPlatform}
      />

      {/* Boost Time Modal */}
      <BoostTimeModal
        isOpen={showBoostModal}
        onClose={() => setShowBoostModal(false)}
        onBoostPurchased={handleBoostPurchased}
        activeBoost={activeBoost}
      />

      {/* Header */}
      <div className="pt-8 px-4 text-center">
        <h1 className="text-2xl font-bold text-white mb-4">
          {language === 'ar' ? '🎯 المهام' : '🎯 Tasks'}
        </h1>
        <p className="text-white/70 text-sm">
          {language === 'ar' 
            ? 'أكمل المهام واكسب النقاط والدقائق لترقية مستواك'
            : 'Complete tasks and earn points and minutes to upgrade your level'
          }
        </p>
      </div>

      {/* Earn Section - Mining Feature */}
      <div className="mt-10 px-6">
        <div className="p-6 bg-darkGreen backdrop-blur-sm border-2 border-yellow-400 rounded-xl text-white shadow-[0_0_15px_rgba(255,204,21,0.3)] mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Pickaxe className="w-7 h-7 text-yellow-400" />
              <h4 className="font-bold text-xl text-yellow-400">
                {language === 'ar' ? '⛏️ تعدين الدقائق' : '⛏️ Earn Minutes'}
              </h4>
            </div>
            
            {/* Boost Status Indicator */}
            {activeBoost && (
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${getBoostStatusColor(activeBoost.multiplier)}`}>
                <div className="flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  <span>
                    {language === 'ar' 
                      ? `مضاعف ×${activeBoost.multiplier} نشط`
                      : `Boost ×${activeBoost.multiplier} active`
                    }
                  </span>
                </div>
              </div>
            )}
          </div>
          
          {miningStatus && (
            <div className="flex items-center gap-2 mb-3">
              <Timer className="w-4 h-4 text-neonGreen" />
              <span className="text-sm text-neonGreen">
                {language === 'ar' 
                  ? `الدقائق المجمعة: ${miningStatus.total_accumulated_minutes}`
                  : `Accumulated Minutes: ${miningStatus.total_accumulated_minutes}`
                }
                <span className="ml-2 px-2 py-0.5 bg-yellow-400/20 text-yellow-400 text-xs rounded-full border border-yellow-400/30">
                  {language === 'ar' ? 'قريباً =' : '= Soon'}
                </span>
              </span>
            </div>
          )}
          
          <p className="text-sm text-white/90 mb-2">
            {language === 'ar' 
              ? 'اضغط على تعدين لبدء جلسة 6 ساعات. اجمع الدقائق واستلمها كل 24 ساعة!'
              : 'Click Mine to start a 6-hour session. Collect minutes and claim them every 24 hours!'
            }
          </p>
          
          {miningCountdown && (
            <div className="mb-4 p-3 bg-black/30 rounded-lg border border-neonGreen/30">
              <div className="flex items-center justify-center gap-2">
                <Clock className="w-5 h-5 text-neonGreen animate-pulse" />
                <span className="text-lg font-bold text-neonGreen font-mono">
                  {miningCountdown}
                </span>
              </div>
              <p className="text-xs text-center text-white/60 mt-1">
                {language === 'ar' ? 'الوقت المتبقي للجلسة' : 'Time remaining in session'}
              </p>
            </div>
          )}
          
          <div className="flex gap-2">
            <button
              onClick={miningButtonConfig.onClick}
              disabled={miningButtonConfig.disabled}
              className={`flex-1 py-3 rounded-lg font-semibold text-center transition ${miningButtonConfig.className} ${
                miningButtonConfig.disabled ? 'cursor-not-allowed opacity-50' : ''
              } mining-button`}
            >
              {miningButtonConfig.text}
            </button>
            
            <button
              disabled={true}
              className="py-3 px-4 rounded-lg font-semibold text-center transition bg-gray-600 text-gray-300 cursor-not-allowed opacity-60"
            >
              <div className="flex items-center gap-1">
                <Zap className="w-4 h-4" />
                {boostButtonConfig.text}
                <span className="ml-1 text-xs">
                  {language === 'ar' ? 'قريباً =' : '= Soon'}
                </span>
              </div>
            </button>
          </div>
          
          <div className="mt-3 text-xs text-center text-white/60">
            {language === 'ar' 
              ? 'جلسة واحدة = 6 ساعات • استلام كل 24 ساعة • 1 نقطة لكل 10 دقائق'
              : '1 session = 6 hours • Claim every 24 hours • 1 point per 10 minutes'
            }
          </div>
        </div>
      </div>

      {/* Crypto Games Card - Featured at the top */}
      <div className="px-6">
        <div className="p-6 bg-darkGreen backdrop-blur-sm border-2 border-neonGreen rounded-xl text-white shadow-glow mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Gamepad2 className="w-7 h-7 text-neonGreen" />
            <h4 className="font-bold text-xl text-neonGreen">
              {language === 'ar' ? '🎮 ألعاب العملات الرقمية' : '🎮 Crypto Games'}
            </h4>
          </div>
          
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-yellow-400" />
            <span className="text-sm text-yellow-400">
              {language === 'ar' 
                ? `${gameSessionsRemaining} جلسات متبقية اليوم (للنقاط)`
                : `${gameSessionsRemaining} sessions remaining today (for points)`
              }
            </span>
          </div>
          
          <p className="text-sm text-white/90 mb-2">
            {language === 'ar' ? 'العب لعبة تجميع العملات الرقمية واكسب النقاط والدقائق!' : 'Play Crypto Match Game and earn points and minutes!'}
          </p>
          <p className="text-xs text-white/60 mb-4">
            {language === 'ar' 
              ? 'انقر على خليتين متجاورتين لتبديلهما • 20 نقطة لأول 3 جلسات يومياً • دقائق لا محدودة • مدة الجلسة: دقيقتان'
              : 'Click two adjacent cells to swap • 20 points for first 3 daily sessions • Unlimited minutes • Session duration: 2 minutes'
            }
          </p>
          
          <button
            onClick={handleGameStart}
            className="w-full py-3 rounded-lg font-semibold text-center transition bg-neonGreen text-black hover:brightness-110"
          >
            {language === 'ar' ? 'ابدأ اللعب' : 'Start Playing'}
          </button>
        </div>
      </div>

      {/* NEW TASK Button */}
      <div className="px-6 mb-6">
        <button
          onClick={() => navigate('/new-task')}
          className="w-full p-4 bg-gradient-to-r from-purple-600 to-purple-800 border-2 border-purple-500 rounded-xl text-white font-bold hover:scale-105 transition duration-300 shadow-[0_0_15px_rgba(168,85,247,0.5)] flex items-center justify-center gap-3"
        >
          <Plus className="w-6 h-6" />
          <span className="text-lg">
            {language === 'ar' ? 'NEW TASK - إدارة LYRA COIN' : 'NEW TASK - LYRA COIN Management'}
          </span>
        </button>
      </div>

      {/* Fixed Tasks Section - Now using database data */}
      <div className="px-6 mb-8">
        <h3 className="text-xl font-bold text-white mb-6">
          {language === 'ar' ? '⭐ المهام الثابتة' : '⭐ Fixed Tasks'}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fixedTasks.map((task) => {
            const platformConfig = getPlatformConfig(task.platform);
            const buttonConfig = getTaskButton(task.id, 'fixed');
            const isCompleted = completedFixedTasks.has(task.id);
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
                </div>
                
                <p className="text-xs text-white/70 mb-3">{localizedContent.description}</p>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neonGreen">
                    +{task.points_reward} {language === 'ar' ? 'نقطة' : 'points'} & +20 {language === 'ar' ? 'دقيقة' : 'minutes'}
                  </span>
                  
                  <button
                    onClick={() => {
                      if (buttonConfig.text.includes('Start') || buttonConfig.text.includes('ابدأ')) {
                        handleStartTask(task.id, 'fixed', platformConfig.link);
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

      {/* Daily Tasks Section */}
      {tasksLoaded && dailyTasks.length > 0 && (
        <div className="px-6 daily-tasks-section">
          <h3 className="text-xl font-bold text-white mb-4">
            {language === 'ar' ? '📋 المهام اليومية' : '📋 Daily Tasks'}
          </h3>
          
          {/* Paid Tasks Section - Integrated with Daily Tasks */}
          {paidTasksLoaded && paidTasks.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="w-5 h-5 text-red-400" />
                <h4 className="text-lg font-semibold text-red-400">
                  {language === 'ar' ? '🔥 مهام مدفوعة' : '🔥 Paid Tasks'}
                </h4>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {paidTasks
                  .filter(task => task.status === 'active')
                  .map((task) => (
                    <PaidTaskCard
                      key={task.id}
                      task={task}
                      isCompleted={completedPaidTasks.has(task.id)}
                      onTaskClick={handlePaidTaskClick}
                    />
                  ))}
              </div>
              
              <div className="bg-black/30 border border-red-400/30 rounded-lg p-3 mb-6">
                <p className="text-center text-red-400 text-xs">
                  {language === 'ar' 
                    ? '🔥 المهام المدفوعة هي مهام أنشأها مستخدمون آخرون. أكملها للمساعدة في نمو مجتمع LYRA COIN!'
                    : '🔥 Paid tasks are created by other users. Complete them to help grow the LYRA COIN community!'
                  }
                </p>
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
    </div>
  );
};

export default TasksPage;