import React, { useState, useEffect } from 'react';
import { FaYoutube, FaFacebook, FaTiktok, FaTelegram, FaInstagram, FaXTwitter } from 'react-icons/fa6';
import { Gamepad2, Clock } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import CryptoCandyCrushGame from '../components/CryptoCandyCrushGame';
import { getDailyTasks } from '../../lib/supabase/getDailyTasks';
import { claimDailyTask } from '../../lib/supabase/claimDailyTask';
import { recordGameSession } from '../../lib/supabase/recordGameSession';
import toast from 'react-hot-toast';

interface TasksPageProps {
  onMinutesEarned?: (minutes: number) => void;
  onPointsEarned?: (points: number) => void;
}

const TasksPage: React.FC<TasksPageProps> = ({ onMinutesEarned, onPointsEarned }) => {
  const [showCryptoCandyCrushGame, setShowCryptoCandyCrushGame] = useState(false);
  const [dailyTasks, setDailyTasks] = useState<any[]>([]);
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
  const [claimingTasks, setClaimingTasks] = useState<Set<string>>(new Set());
  const [tasksLoaded, setTasksLoaded] = useState(false);
  const [gameSessionsRemaining, setGameSessionsRemaining] = useState(3);
  const { language } = useLanguage();

  // Load daily tasks when component mounts
  useEffect(() => {
    const loadDailyTasks = async () => {
      try {
        const { data, error } = await getDailyTasks();
        if (error) {
          console.error('Error loading daily tasks:', error);
          return;
        }
        
        if (data) {
          setDailyTasks(data.tasks);
          const completed = new Set(data.completedTasks.map(ct => ct.daily_task_id));
          setCompletedTasks(completed);
        }
        setTasksLoaded(true);
      } catch (error) {
        console.error('Error loading daily tasks:', error);
        setTasksLoaded(true);
      }
    };

    loadDailyTasks();
  }, []);

  const handleClaimTask = async (taskId: string) => {
    if (claimingTasks.has(taskId) || completedTasks.has(taskId)) return;

    setClaimingTasks(prev => new Set([...prev, taskId]));

    try {
      const result = await claimDailyTask(taskId);
      
      if (result.success) {
        setCompletedTasks(prev => new Set([...prev, taskId]));
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
          {language === 'ar' ? '🎯 المهام اليومية' : '🎯 Daily Tasks'}
        </h1>
        <p className="text-white/70 text-sm">
          {language === 'ar' 
            ? 'أكمل المهام واكسب النقاط لترقية مستواك'
            : 'Complete tasks and earn points to upgrade your level'
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
              ? 'اسحب وأفلت لتجميع 3 أو أكثر من نفس العملة • 20 نقطة لكل جلسة • حد أقصى 3 جلسات يومياً'
              : 'Drag & drop to match 3+ same cryptos • 20 points per session • Max 3 sessions daily'
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

      {/* Daily Tasks Section */}
      {tasksLoaded && (
        <div className="px-6">
          <h3 className="text-xl font-bold text-white mb-6">
            {language === 'ar' ? '📋 المهام اليومية' : '📋 Daily Tasks'}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dailyTasks.map((task, index) => {
              const platform = platforms[index % platforms.length];
              const isCompleted = completedTasks.has(task.id);
              const isClaiming = claimingTasks.has(task.id);
              
              return (
                <div
                  key={task.id}
                  className={`p-4 backdrop-blur-sm border rounded-xl text-white transition-all duration-300 ${
                    isCompleted 
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
                      onClick={() => handleClaimTask(task.id)}
                      disabled={isCompleted || isClaiming}
                      className={`px-3 py-1.5 rounded-lg font-medium text-xs transition-all duration-300 ${
                        isCompleted
                          ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                          : isClaiming
                          ? 'bg-neonGreen/50 text-black cursor-not-allowed'
                          : `${platform.bgColor} text-white hover:brightness-110`
                      }`}
                    >
                      {isCompleted 
                        ? (language === 'ar' ? '✓ مكتمل' : '✓ Completed')
                        : isClaiming
                        ? (language === 'ar' ? 'جاري...' : 'Claiming...')
                        : (language === 'ar' ? 'مطالبة' : 'Claim')
                      }
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
                ? '• يمكنك لعب 3 جلسات ألعاب يومياً كحد أقصى'
                : '• You can play maximum 3 game sessions daily'
              }
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TasksPage;