import React, { useState, useEffect } from 'react';
import { FaYoutube, FaFacebook, FaTiktok, FaTelegram, FaInstagram, FaXTwitter } from 'react-icons/fa6';
import { Gamepad2, Clock } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import CryptoCandyCrushGame from '../components/CryptoCandyCrushGame';
import { getDailyTasks } from '../../lib/supabase/getDailyTasks';
import { getFixedTasks } from '../../lib/supabase/getFixedTasks';
import { claimDailyTask } from '../../lib/supabase/claimDailyTask';
import { claimFixedTask } from '../../lib/supabase/claimFixedTask';
import { recordGameSession } from '../../lib/supabase/recordGameSession';
import toast from 'react-hot-toast';

interface TasksPageProps {
  onMinutesEarned?: (minutes: number) => void;
  onPointsEarned?: (points: number) => void;
}

const TasksPage: React.FC<TasksPageProps> = ({ onMinutesEarned, onPointsEarned }) => {
  const [showCryptoCandyCrushGame, setShowCryptoCandyCrushGame] = useState(false);
  const [dailyTasks, setDailyTasks] = useState<any[]>([]);
  const [fixedTasks, setFixedTasks] = useState<any[]>([]);
  const [completedDailyTasks, setCompletedDailyTasks] = useState<Set<string>>(new Set());
  const [completedFixedTasks, setCompletedFixedTasks] = useState<Set<string>>(new Set());
  const [claimingTasks, setClaimingTasks] = useState<Set<string>>(new Set());
  const [taskTimers, setTaskTimers] = useState<Map<string, NodeJS.Timeout>>(new Map());
  const [taskStartedTimes, setTaskStartedTimes] = useState<Map<string, number>>(new Map());
  const [tasksLoaded, setTasksLoaded] = useState(false);
  const [gameSessionsRemaining, setGameSessionsRemaining] = useState(3);
  const { language } = useLanguage();

  // Load tasks when component mounts
  useEffect(() => {
    const loadTasks = async () => {
      try {
        // Load daily tasks
        const { data: dailyData, error: dailyError } = await getDailyTasks();
        if (dailyError) {
          console.error('Error loading daily tasks:', dailyError);
        } else if (dailyData) {
          setDailyTasks(dailyData.tasks);
          const completedDaily = new Set(dailyData.completedTasks.map(ct => ct.daily_task_id));
          setCompletedDailyTasks(completedDaily);
        }

        // Load fixed tasks
        const { data: fixedData, error: fixedError } = await getFixedTasks();
        if (fixedError) {
          console.error('Error loading fixed tasks:', fixedError);
        } else if (fixedData) {
          setFixedTasks(fixedData.tasks);
          const completedFixed = new Set(fixedData.completedTasks.map(ct => ct.fixed_task_id));
          setCompletedFixedTasks(completedFixed);
        }

        setTasksLoaded(true);
      } catch (error) {
        console.error('Error loading tasks:', error);
        setTasksLoaded(true);
      }
    };

    loadTasks();
  }, []);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      taskTimers.forEach(timer => clearTimeout(timer));
    };
  }, [taskTimers]);

  const handleStartTask = (taskId: string, taskType: 'daily' | 'fixed', taskLink?: string) => {
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
    }, 30000);
    
    setTaskTimers(prev => new Map(prev.set(taskId, timer)));
  };

  const handleClaimTask = async (taskId: string, taskType: 'daily' | 'fixed') => {
    if (claimingTasks.has(taskId)) return;

    const isCompleted = taskType === 'daily' 
      ? completedDailyTasks.has(taskId) 
      : completedFixedTasks.has(taskId);
    
    if (isCompleted) return;

    setClaimingTasks(prev => new Set([...prev, taskId]));

    try {
      const result = taskType === 'daily' 
        ? await claimDailyTask(taskId)
        : await claimFixedTask(taskId);
      
      if (result.success) {
        if (taskType === 'daily') {
          setCompletedDailyTasks(prev => new Set([...prev, taskId]));
        } else {
          setCompletedFixedTasks(prev => new Set([...prev, taskId]));
        }

        if (onPointsEarned && result.pointsEarned) {
          onPointsEarned(result.pointsEarned);
        }

        // Award minutes for tasks (20 minutes for fixed tasks, 10 minutes for daily tasks)
        const minutesEarned = taskType === 'fixed' ? 20 : 10;
        if (onMinutesEarned) {
          onMinutesEarned(minutesEarned);
        }

        toast.success(
          language === 'ar'
            ? `🎉 تم إكمال المهمة! +${result.pointsEarned} نقطة و +${minutesEarned} دقيقة`
            : `🎉 Task completed! +${result.pointsEarned} points & +${minutesEarned} minutes`,
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
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error claiming task:', error);
      toast.error(
        language === 'ar' ? 'فشل في إكمال المهمة' : 'Failed to complete task'
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
        toast.info(result.message);
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

  // Fixed tasks with social media links
  const fixedTasksWithLinks = [
    {
      id: 'youtube-follow',
      title: language === 'ar' ? 'تابع LYRA COIN على يوتيوب' : 'Follow LYRA COIN on YouTube',
      description: language === 'ar' ? 'اشترك في قناتنا الرسمية على يوتيوب' : 'Subscribe to our official YouTube channel',
      platform: 'youtube',
      icon: FaYoutube,
      link: 'https://www.youtube.com/@LYRACOIN',
      borderColor: 'border-red-500',
      glow: 'drop-shadow-[0_0_20px_#FF0000]',
      bgColor: 'bg-red-500',
      points_reward: 20
    },
    {
      id: 'facebook-follow',
      title: language === 'ar' ? 'تابع LYRA COIN على فيسبوك' : 'Follow LYRA COIN on Facebook',
      description: language === 'ar' ? 'تابع صفحتنا الرسمية على فيسبوك' : 'Follow our official Facebook page',
      platform: 'facebook',
      icon: FaFacebook,
      link: 'https://www.facebook.com/profile.php?id=61573828020012',
      borderColor: 'border-blue-500',
      glow: 'drop-shadow-[0_0_20px_#1877F2]',
      bgColor: 'bg-blue-500',
      points_reward: 20
    },
    {
      id: 'tiktok-follow',
      title: language === 'ar' ? 'تابع LYRA COIN على تيك توك' : 'Follow LYRA COIN on TikTok',
      description: language === 'ar' ? 'تابع حسابنا الرسمي على تيك توك' : 'Follow our official TikTok account',
      platform: 'tiktok',
      icon: FaTiktok,
      link: 'https://www.tiktok.com/@lyracoin',
      borderColor: 'border-pink-500',
      glow: 'drop-shadow-[0_0_20px_#FF0050]',
      bgColor: 'bg-pink-500',
      points_reward: 20
    },
    {
      id: 'telegram-join',
      title: language === 'ar' ? 'انضم إلى قناة LYRA COIN' : 'Join LYRA COIN Channel',
      description: language === 'ar' ? 'انضم إلى قناتنا الرسمية على تيليجرام' : 'Join our official Telegram channel',
      platform: 'telegram',
      icon: FaTelegram,
      link: 'https://t.me/LYRACOIN25',
      borderColor: 'border-cyan-400',
      glow: 'drop-shadow-[0_0_20px_#0088cc]',
      bgColor: 'bg-cyan-400',
      points_reward: 20
    },
    {
      id: 'instagram-follow',
      title: language === 'ar' ? 'تابع LYRA COIN على انستغرام' : 'Follow LYRA COIN on Instagram',
      description: language === 'ar' ? 'تابع حسابنا الرسمي على انستغرام' : 'Follow our official Instagram account',
      platform: 'instagram',
      icon: FaInstagram,
      link: 'https://www.instagram.com/lyracoin950/',
      borderColor: 'border-purple-500',
      glow: 'drop-shadow-[0_0_20px_#C13584]',
      bgColor: 'bg-purple-500',
      points_reward: 20
    },
    {
      id: 'twitter-follow',
      title: language === 'ar' ? 'تابع LYRA COIN على تويتر' : 'Follow LYRA COIN on Twitter',
      description: language === 'ar' ? 'تابع حسابنا الرسمي على تويتر' : 'Follow our official Twitter account',
      platform: 'twitter',
      icon: FaXTwitter,
      link: 'https://x.com/CoinLyra90781',
      borderColor: 'border-sky-400',
      glow: 'drop-shadow-[0_0_20px_#1DA1F2]',
      bgColor: 'bg-sky-400',
      points_reward: 20
    }
  ];

  const platforms = [
    { 
      name: language === 'ar' ? 'يوتيوب' : 'YouTube',
      icon: FaYoutube,
      borderColor: 'border-red-500',
      glow: 'drop-shadow-[0_0_20px_#FF0000]',
      bgColor: 'bg-red-500'
    },
    { 
      name: language === 'ar' ? 'فيسبوك' : 'Facebook',
      icon: FaFacebook,
      borderColor: 'border-blue-500',
      glow: 'drop-shadow-[0_0_20px_#1877F2]',
      bgColor: 'bg-blue-500'
    },
    { 
      name: language === 'ar' ? 'تيليجرام' : 'Telegram',
      icon: FaTelegram,
      borderColor: 'border-cyan-400',
      glow: 'drop-shadow-[0_0_20px_#0088cc]',
      bgColor: 'bg-cyan-400'
    },
    { 
      name: language === 'ar' ? 'تيك توك' : 'TikTok',
      icon: FaTiktok,
      borderColor: 'border-pink-500',
      glow: 'drop-shadow-[0_0_20px_#FF0050]',
      bgColor: 'bg-pink-500'
    },
    { 
      name: language === 'ar' ? 'انستغرام' : 'Instagram',
      icon: FaInstagram,
      borderColor: 'border-purple-500',
      glow: 'drop-shadow-[0_0_20px_#C13584]',
      bgColor: 'bg-purple-500'
    },
    { 
      name: language === 'ar' ? 'تويتر' : 'Twitter',
      icon: FaXTwitter,
      borderColor: 'border-sky-400',
      glow: 'drop-shadow-[0_0_20px_#1DA1F2]',
      bgColor: 'bg-sky-400'
    }
  ];

  const getTaskButton = (taskId: string, taskType: 'daily' | 'fixed', isFixedWithLink = false) => {
    const isCompleted = taskType === 'daily' 
      ? completedDailyTasks.has(taskId) 
      : completedFixedTasks.has(taskId);
    const isClaiming = claimingTasks.has(taskId);
    const hasTimer = taskTimers.has(taskId);
    const startTime = taskStartedTimes.get(taskId);
    const hasWaited = startTime && (Date.now() - startTime >= 30000);

    if (isCompleted) {
      return {
        text: language === 'ar' ? '✓ مكتمل' : '✓ Completed',
        className: 'bg-gray-600 text-gray-300 cursor-not-allowed opacity-75',
        disabled: true,
        showGlow: false
      };
    }

    if (isClaiming) {
      return {
        text: language === 'ar' ? 'جاري...' : 'Claiming...',
        className: 'bg-neonGreen/50 text-black cursor-not-allowed',
        disabled: true,
        showGlow: false
      };
    }

    if (hasTimer || (startTime && !hasWaited)) {
      return {
        text: language === 'ar' ? 'ابدأ المهمة' : 'Start Task',
        className: 'bg-neonGreen/50 text-black cursor-not-allowed',
        disabled: true,
        showGlow: false
      };
    }

    if (startTime && hasWaited) {
      return {
        text: language === 'ar' ? 'مطالبة' : 'Claim',
        className: 'bg-neonGreen text-black hover:brightness-110 animate-pulse shadow-[0_0_15px_rgba(0,255,136,0.5)]',
        disabled: false,
        showGlow: true
      };
    }

    return {
      text: language === 'ar' ? 'ابدأ المهمة' : 'Start Task',
      className: 'bg-neonGreen text-black hover:brightness-110',
      disabled: false,
      showGlow: false
    };
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

      {/* Crypto Games Card - Featured at the top */}
      <div className="mt-10 px-6">
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

      {/* Fixed Tasks Section (Social Media Links) */}
      <div className="px-6 mb-8">
        <h3 className="text-xl font-bold text-white mb-6">
          {language === 'ar' ? '⭐ المهام الثابتة' : '⭐ Fixed Tasks'}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fixedTasksWithLinks.map((task) => {
            const buttonConfig = getTaskButton(task.id, 'fixed', true);
            const isCompleted = completedFixedTasks.has(task.id);
            
            return (
              <div
                key={task.id}
                className={`p-4 backdrop-blur-sm border rounded-xl text-white transition-all duration-300 ${
                  isCompleted
                    ? `bg-neonGreen/10 ${task.borderColor} opacity-75` 
                    : `bg-black/40 ${task.borderColor} ${task.glow} hover:scale-105 hover:brightness-110`
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <task.icon className={`w-6 h-6 ${task.bgColor} rounded-lg p-1 text-white`} />
                  <h5 className="font-medium text-sm">{task.title}</h5>
                </div>
                
                <p className="text-xs text-white/70 mb-3">{task.description}</p>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neonGreen">
                    +{task.points_reward} {language === 'ar' ? 'نقطة' : 'points'} & +20 {language === 'ar' ? 'دقيقة' : 'minutes'}
                  </span>
                  
                  <button
                    onClick={() => {
                      if (buttonConfig.text.includes('Start') || buttonConfig.text.includes('ابدأ')) {
                        handleStartTask(task.id, 'fixed', task.link);
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
      {tasksLoaded && (
        <div className="px-6">
          <h3 className="text-xl font-bold text-white mb-6">
            {language === 'ar' ? '📋 المهام اليومية' : '📋 Daily Tasks'}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dailyTasks.map((task, index) => {
              const platform = platforms[index % platforms.length];
              const buttonConfig = getTaskButton(task.id, 'daily');
              
              return (
                <div
                  key={task.id}
                  className={`p-4 backdrop-blur-sm border rounded-xl text-white transition-all duration-300 ${
                    completedDailyTasks.has(task.id)
                      ? `bg-neonGreen/10 ${platform.borderColor} opacity-75` 
                      : `bg-black/40 ${platform.borderColor} ${platform.glow} hover:scale-105 hover:brightness-110`
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <platform.icon className={`w-6 h-6 ${platform.bgColor} rounded-lg p-1 text-white`} />
                    <h5 className="font-medium text-sm">{task.title}</h5>
                  </div>
                  
                  <p className="text-xs text-white/70 mb-3">{task.description}</p>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neonGreen">
                      +{task.points_reward} {language === 'ar' ? 'نقطة' : 'points'} & +10 {language === 'ar' ? 'دقيقة' : 'minutes'}
                    </span>
                    
                    <button
                      onClick={() => {
                        if (buttonConfig.text.includes('Start') || buttonConfig.text.includes('ابدأ')) {
                          handleStartTask(task.id, 'daily');
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
            {language === 'ar' ? 'ℹ️ معلومات مهمة' : 'ℹ️ Important Information'}
          </h4>
          <ul className="text-sm text-white/70 space-y-1">
            <li>
              {language === 'ar' 
                ? '• النقاط والدقائق منفصلة - النقاط تحدد المستوى، الدقائق للمكافآت'
                : '• Points and minutes are separate - points determine level, minutes for rewards'
              }
            </li>
            <li>
              {language === 'ar' 
                ? '• المهام اليومية تتجدد كل 24 ساعة'
                : '• Daily tasks reset every 24 hours'
              }
            </li>
            <li>
              {language === 'ar' 
                ? '• يمكنك لعب جلسات لا محدودة، لكن أول 3 جلسات فقط تعطي نقاط'
                : '• You can play unlimited sessions, but only first 3 daily sessions give points'
              }
            </li>
            <li>
              {language === 'ar' 
                ? '• انقر "ابدأ المهمة" ثم انتظر 30 ثانية لتظهر "مطالبة" مع تأثير بصري'
                : '• Click "Start Task" then wait 30 seconds for "Claim" to appear with visual effect'
              }
            </li>
            <li>
              {language === 'ar' 
                ? '• المهام الثابتة تعطي 20 نقطة + 20 دقيقة، المهام اليومية تعطي 10 نقاط + 10 دقائق'
                : '• Fixed tasks give 20 points + 20 minutes, daily tasks give 10 points + 10 minutes'
              }
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TasksPage;