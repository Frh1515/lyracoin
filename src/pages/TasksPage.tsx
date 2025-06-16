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
  const [startingTasks, setStartingTasks] = useState<Set<string>>(new Set());
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

  const handleStartTask = (taskId: string, taskType: 'daily' | 'fixed') => {
    setStartingTasks(prev => new Set([...prev, taskId]));
    
    // After 30 seconds, change to claim button
    setTimeout(() => {
      setStartingTasks(prev => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });
    }, 30000);
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

        toast.success(
          language === 'ar'
            ? `🎉 تم إكمال المهمة! +${result.pointsEarned} نقطة`
            : `🎉 Task completed! +${result.pointsEarned} points`,
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
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error recording game session:', error);
      toast.error(
        language === 'ar' ? 'فشل في تسجيل جلسة اللعب' : 'Failed to record game session'
      );
    }
  };

  const handleGameClose = () => {
    setShowCryptoCandyCrushGame(false);
  };

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

  const getTaskButton = (taskId: string, taskType: 'daily' | 'fixed') => {
    const isCompleted = taskType === 'daily' 
      ? completedDailyTasks.has(taskId) 
      : completedFixedTasks.has(taskId);
    const isClaiming = claimingTasks.has(taskId);
    const isStarting = startingTasks.has(taskId);

    if (isCompleted) {
      return {
        text: language === 'ar' ? '✓ مكتمل' : '✓ Completed',
        className: 'bg-gray-600 text-gray-300 cursor-not-allowed opacity-75',
        disabled: true
      };
    }

    if (isClaiming) {
      return {
        text: language === 'ar' ? 'جاري...' : 'Claiming...',
        className: 'bg-neonGreen/50 text-black cursor-not-allowed',
        disabled: true
      };
    }

    if (isStarting) {
      return {
        text: language === 'ar' ? 'ابدأ المهمة' : 'Start Task',
        className: 'bg-neonGreen text-black cursor-not-allowed',
        disabled: true
      };
    }

    // Check if task was started (30 seconds passed)
    const wasStarted = !startingTasks.has(taskId) && !isCompleted;
    
    return {
      text: wasStarted ? (language === 'ar' ? 'مطالبة' : 'Claim') : (language === 'ar' ? 'ابدأ المهمة' : 'Start Task'),
      className: 'bg-neonGreen text-black hover:brightness-110',
      disabled: false
    };
  };

  return (
    <div className="min-h-screen pb-24 bg-gradient-to-b from-[#041e11] via-[#051a13] to-[#040d0c]">
      {/* Crypto Candy Crush Game Modal */}
      {showCryptoCandyCrushGame && (
        <CryptoCandyCrushGame 
          onClose={handleGameClose} 
          onMinutesEarned={onMinutesEarned}
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
                ? `${gameSessionsRemaining} جلسات متبقية اليوم`
                : `${gameSessionsRemaining} sessions remaining today`
              }
            </span>
          </div>
          
          <p className="text-sm text-white/90 mb-2">
            {language === 'ar' ? 'العب لعبة تجميع العملات الرقمية واكسب النقاط والدقائق!' : 'Play Crypto Match Game and earn points and minutes!'}
          </p>
          <p className="text-xs text-white/60 mb-4">
            {language === 'ar' 
              ? 'اسحب وأفلت لتجميع 3 أو أكثر من نفس العملة • 20 نقطة لكل جلسة • حد أقصى 3 جلسات يومياً • مدة الجلسة: دقيقتان'
              : 'Drag & drop to match 3+ same cryptos • 20 points per session • Max 3 sessions daily • Session duration: 2 minutes'
            }
          </p>
          
          <button
            onClick={handleGameStart}
            disabled={gameSessionsRemaining <= 0}
            className={`w-full py-3 rounded-lg font-semibold text-center transition ${
              gameSessionsRemaining > 0
                ? 'bg-neonGreen text-black hover:brightness-110'
                : 'bg-gray-600 text-gray-300 cursor-not-allowed'
            }`}
          >
            {gameSessionsRemaining > 0
              ? (language === 'ar' ? 'ابدأ اللعب' : 'Start Playing')
              : (language === 'ar' ? 'تم استنفاد الجلسات اليومية' : 'Daily Sessions Exhausted')
            }
          </button>
        </div>
      </div>

      {/* Fixed Tasks Section (moved from home page) */}
      {tasksLoaded && fixedTasks.length > 0 && (
        <div className="px-6 mb-8">
          <h3 className="text-xl font-bold text-white mb-6">
            {language === 'ar' ? '⭐ المهام الثابتة' : '⭐ Fixed Tasks'}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fixedTasks.map((task, index) => {
              const platform = platforms[index % platforms.length];
              const buttonConfig = getTaskButton(task.id, 'fixed');
              
              return (
                <div
                  key={task.id}
                  className={`p-4 backdrop-blur-sm border rounded-xl text-white transition-all duration-300 ${
                    completedFixedTasks.has(task.id)
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
                      +{task.points_reward} {language === 'ar' ? 'نقطة' : 'points'}
                    </span>
                    
                    <button
                      onClick={() => {
                        if (buttonConfig.text.includes('Start') || buttonConfig.text.includes('ابدأ')) {
                          handleStartTask(task.id, 'fixed');
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
                      +{task.points_reward} {language === 'ar' ? 'نقطة' : 'points'}
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
                ? '• النقاط منفصلة عن الدقائق ولا تتداخل معها'
                : '• Points are separate from minutes and do not interfere with them'
              }
            </li>
            <li>
              {language === 'ar' 
                ? '• النقاط تحدد مستواك فقط (برونزي، فضي، ذهبي، بلاتيني)'
                : '• Points only determine your level (Bronze, Silver, Gold, Platinum)'
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
                ? '• يمكنك لعب 3 جلسات ألعاب يومياً كحد أقصى، مدة كل جلسة دقيقتان'
                : '• You can play maximum 3 game sessions daily, each session lasts 2 minutes'
              }
            </li>
            <li>
              {language === 'ar' 
                ? '• انقر "ابدأ المهمة" ثم انتظر 30 ثانية لتظهر "مطالبة"'
                : '• Click "Start Task" then wait 30 seconds for "Claim" to appear'
              }
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TasksPage;