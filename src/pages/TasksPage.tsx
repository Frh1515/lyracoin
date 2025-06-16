import React, { useState, useEffect } from 'react';
import { FaYoutube, FaFacebook, FaTiktok, FaTelegram, FaInstagram, FaXTwitter } from 'react-icons/fa6';
import { Gamepad2, Award, CheckCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { getFixedTasks, type FixedTask } from '../../lib/supabase/getFixedTasks';
import { claimFixedTask } from '../../lib/supabase/claimFixedTask';
import { getAvailableTasks } from '../../lib/supabase/getAvailableTasks';
import { claimTask } from '../../lib/supabase/claimTask';
import { useTelegram } from '../context/TelegramContext';
import CryptoCandyCrushGame from '../components/CryptoCandyCrushGame';
import toast from 'react-hot-toast';

interface TasksPageProps {
  onMinutesEarned?: (minutes: number) => void;
  onPointsEarned?: (points: number) => void;
}

const TasksPage: React.FC<TasksPageProps> = ({ onMinutesEarned, onPointsEarned }) => {
  const [completedTasks, setCompletedTasks] = useState(4);
  const [showCryptoCandyCrushGame, setShowCryptoCandyCrushGame] = useState(false);
  const [fixedTasks, setFixedTasks] = useState<FixedTask[]>([]);
  const [completedFixedTasks, setCompletedFixedTasks] = useState<Set<string>>(new Set());
  const [dailyTasks, setDailyTasks] = useState<Record<string, any[]>>({});
  const [claimingTask, setClaimingTask] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const totalTasks = 10;
  const completionPercentage = Math.round((completedTasks / totalTasks) * 100);
  const { language } = useLanguage();
  const { user } = useTelegram();

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

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      
      // Fetch fixed tasks
      const { data: fixedTasksData, error: fixedTasksError } = await getFixedTasks();
      if (fixedTasksError) {
        console.error('Error fetching fixed tasks:', fixedTasksError);
      } else if (fixedTasksData) {
        setFixedTasks(fixedTasksData.availableTasks);
        setCompletedFixedTasks(new Set(fixedTasksData.completedTasks.map(t => t.fixed_task_id)));
      }

      // Fetch daily tasks if user is available
      if (user) {
        const { data: dailyTasksData, error: dailyTasksError } = await getAvailableTasks(user.id.toString());
        if (dailyTasksError) {
          console.error('Error fetching daily tasks:', dailyTasksError);
        } else if (dailyTasksData) {
          setDailyTasks(dailyTasksData);
        }
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimFixedTask = async (taskId: string) => {
    try {
      setClaimingTask(taskId);
      
      const result = await claimFixedTask(taskId);
      
      if (result.success) {
        toast.success(
          language === 'ar'
            ? `🎉 تم إكمال المهمة! +${result.pointsEarned} نقطة`
            : `🎉 Task completed! +${result.pointsEarned} points`,
          { 
            duration: 4000,
            style: {
              background: '#00FFAA',
              color: '#000',
              fontWeight: 'bold'
            }
          }
        );
        
        // Update UI
        setCompletedFixedTasks(prev => new Set([...prev, taskId]));
        setFixedTasks(prev => prev.filter(task => task.id !== taskId));
        
        // Notify parent component about points earned
        if (onPointsEarned && result.pointsEarned) {
          onPointsEarned(result.pointsEarned);
        }
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error claiming fixed task:', error);
      toast.error(language === 'ar' ? 'فشل في إكمال المهمة' : 'Failed to complete task');
    } finally {
      setClaimingTask(null);
    }
  };

  const handleClaimDailyTask = async (taskId: string) => {
    if (!user) return;
    
    try {
      setClaimingTask(taskId);
      
      const result = await claimTask(user.id.toString(), taskId);
      
      if (result.success) {
        toast.success(
          language === 'ar'
            ? `🎉 تم إكمال المهمة! +${result.minutes_earned} دقيقة`
            : `🎉 Task completed! +${result.minutes_earned} minutes`,
          { 
            duration: 4000,
            style: {
              background: '#00FFAA',
              color: '#000',
              fontWeight: 'bold'
            }
          }
        );
        
        // Update the homepage minutes display
        if (onMinutesEarned) {
          onMinutesEarned(result.minutes_earned);
        }
        
        // Refresh tasks
        fetchTasks();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error claiming daily task:', error);
      toast.error(language === 'ar' ? 'فشل في إكمال المهمة' : 'Failed to complete task');
    } finally {
      setClaimingTask(null);
    }
  };

  const handleGameClose = () => {
    setShowCryptoCandyCrushGame(false);
  };

  const getPlatformIcon = (platform: string) => {
    const platformData = platforms.find(p => 
      p.name.toLowerCase().includes(platform.toLowerCase()) ||
      platform.toLowerCase().includes(p.name.toLowerCase())
    );
    return platformData || platforms[0]; // Default to first platform if not found
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
    <div className="min-h-screen pb-24 bg-gradient-to-b from-[#041e11] via-[#051a13] to-[#040d0c]">
      {/* Crypto Candy Crush Game Modal */}
      {showCryptoCandyCrushGame && (
        <CryptoCandyCrushGame 
          onClose={handleGameClose} 
          onMinutesEarned={onMinutesEarned}
        />
      )}

      {/* Task Progress Section */}
      <div className="pt-8 px-4">
        <div className="relative w-full h-2 bg-white/20 rounded-full overflow-hidden">
          <div 
            className="h-full bg-neonGreen rounded-full transition-all duration-700 ease-in-out"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
        <p className="text-center text-white/80 mt-2 text-sm">
          {language === 'ar' 
            ? `إكمال المهام: ${completionPercentage}٪`
            : `Task Completion: ${completionPercentage}%`}
        </p>
      </div>

      {/* Crypto Games Card - Featured at the top */}
      <div className="mt-10 px-6">
        <div
          onClick={() => setShowCryptoCandyCrushGame(true)}
          className="p-6 bg-darkGreen backdrop-blur-sm border-2 border-neonGreen rounded-xl text-white 
            hover:scale-105 hover:brightness-110 transition duration-300 shadow-glow cursor-pointer mb-8 blockchain-background"
        >
          <div className="flex items-center gap-3 mb-4">
            <Gamepad2 className="w-7 h-7 text-neonGreen" />
            <h4 className="font-bold text-xl text-neonGreen">
              {language === 'ar' ? '🎮 ألعاب العملات الرقمية' : '🎮 Crypto Games'}
            </h4>
          </div>
          <p className="text-sm text-white/90 mb-2">
            {language === 'ar' ? 'العب لعبة تجميع العملات الرقمية واكسب الدقائق!' : 'Play Crypto Match Game and earn minutes!'}
          </p>
          <p className="text-xs text-white/60 mb-4">
            {language === 'ar' 
              ? 'اسحب وأفلت لتجميع 3 أو أكثر من نفس العملة • 1-3 دقائق لكل مجموعة'
              : 'Drag & drop to match 3+ same cryptos • 1-3 minutes per match'
            }
          </p>
          <div className="bg-neonGreen text-black px-4 py-2 rounded-lg font-semibold text-center hover:brightness-110 transition">
            {language === 'ar' ? 'ابدأ اللعب' : 'Start Playing'}
          </div>
        </div>
      </div>

      {/* Fixed Tasks Section */}
      {fixedTasks.length > 0 && (
        <div className="px-6 mb-8">
          <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Award className="w-6 h-6 text-neonGreen" />
            {language === 'ar' ? '🏆 المهام الثابتة (20 نقطة لكل مهمة)' : '🏆 Fixed Tasks (20 points each)'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fixedTasks.map((task) => {
              const platformData = getPlatformIcon(task.platform);
              const isCompleted = completedFixedTasks.has(task.id);
              const isClaiming = claimingTask === task.id;
              
              return (
                <div
                  key={task.id}
                  className={`p-6 bg-black/40 backdrop-blur-sm border rounded-xl text-white 
                    transition duration-300 ${platformData.borderColor} ${platformData.glow}
                    ${isCompleted ? 'opacity-75' : 'hover:scale-105 hover:brightness-110'}`}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <platformData.icon className={`w-6 h-6 ${platformData.bgColor} rounded-lg p-1 text-white`} />
                    <h5 className="font-medium">{task.title}</h5>
                    {isCompleted && <CheckCircle className="w-5 h-5 text-neonGreen ml-auto" />}
                  </div>
                  <p className="text-sm text-gray-300 mb-2">{task.description}</p>
                  <p className="text-sm text-neonGreen mb-4">
                    {language === 'ar' ? `المكافأة: +${task.points_reward} نقطة` : `Reward: +${task.points_reward} points`}
                  </p>
                  <button 
                    onClick={() => handleClaimFixedTask(task.id)}
                    disabled={isCompleted || isClaiming}
                    className={`w-full px-4 py-2.5 rounded-lg font-semibold text-white 
                      transition duration-300 ${
                        isCompleted 
                          ? 'bg-gray-600 cursor-not-allowed' 
                          : `${platformData.bgColor} hover:brightness-110`
                      }`}
                  >
                    {isClaiming 
                      ? (language === 'ar' ? 'جاري الإكمال...' : 'Completing...')
                      : isCompleted 
                      ? (language === 'ar' ? 'مكتملة' : 'Completed')
                      : (language === 'ar' ? 'إكمال المهمة' : 'Complete Task')
                    }
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Daily Tasks Section */}
      <div className="px-6">
        <h3 className="text-2xl font-bold text-white mb-8">
          {language === 'ar' ? '🎯 المهام اليومية (10 نقاط لكل مهمة)' : '🎯 Daily Tasks (10 points each)'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(dailyTasks).map(([platform, tasks]) => 
            tasks.map((task, index) => {
              const platformData = getPlatformIcon(platform);
              const isClaiming = claimingTask === task.id;
              
              return (
                <div
                  key={task.id}
                  className={`p-6 bg-black/40 backdrop-blur-sm border rounded-xl text-white 
                    hover:scale-105 hover:brightness-110 transition duration-300 ${platformData.borderColor} ${platformData.glow}`}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <platformData.icon className={`w-6 h-6 ${platformData.bgColor} rounded-lg p-1 text-white`} />
                    <h5 className="font-medium">
                      {language === 'ar' 
                        ? `مهمة ${platformData.name} #${index + 1}` 
                        : `${platformData.name} Task #${index + 1}`}
                    </h5>
                  </div>
                  <p className="text-sm text-gray-300 mb-2">{task.description}</p>
                  <p className="text-sm text-neonGreen mb-4">
                    {language === 'ar' ? `المكافأة: +${task.points_reward} نقاط` : `Reward: +${task.points_reward} points`}
                  </p>
                  <button 
                    onClick={() => handleClaimDailyTask(task.id)}
                    disabled={isClaiming}
                    className={`w-full px-4 py-2.5 rounded-lg font-semibold text-white 
                      transition duration-300 hover:brightness-110 ${platformData.bgColor}`}
                  >
                    {isClaiming 
                      ? (language === 'ar' ? 'جاري الإكمال...' : 'Completing...')
                      : (language === 'ar' ? 'إكمال المهمة' : 'Complete Task')
                    }
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default TasksPage;