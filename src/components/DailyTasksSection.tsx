import React, { useState, useEffect } from 'react';
import { FaYoutube, FaFacebook, FaTiktok, FaTelegram, FaInstagram, FaXTwitter } from 'react-icons/fa6';
import { Share2, Smartphone, DollarSign } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import PaidTaskCard from './PaidTaskCard';
import { getUserPaidTasks } from '../../lib/supabase/paidTasksSystem';

interface DailyTasksSectionProps {
  dailyTasks: any[];
  completedDailyTasks: Set<string>;
  handleStartTask: (taskId: string, taskType: 'daily' | 'fixed', taskLink?: string) => void;
  handleClaimTask: (taskId: string, taskType: 'daily' | 'fixed') => void;
  getTaskButton: (taskId: string, taskType: 'daily' | 'fixed') => {
    text: string;
    className: string;
    disabled: boolean;
    showGlow: boolean;
  };
  getLocalizedTaskContent: (task: any) => {
    title: string;
    description: string;
  };
}

const DailyTasksSection: React.FC<DailyTasksSectionProps> = ({
  dailyTasks,
  completedDailyTasks,
  handleStartTask,
  handleClaimTask,
  getTaskButton,
  getLocalizedTaskContent
}) => {
  const { language } = useLanguage();
  const [paidTasks, setPaidTasks] = useState<any[]>([]);
  const [completedPaidTasks, setCompletedPaidTasks] = useState<Set<string>>(new Set());
  const [paidTasksLoaded, setPaidTasksLoaded] = useState(false);

  useEffect(() => {
    loadPaidTasks();
  }, []);

  const loadPaidTasks = async () => {
    try {
      const { data, error } = await getUserPaidTasks();
      
      if (error) {
        console.error('Error loading paid tasks:', error);
      } else if (data) {
        console.log('✅ Paid tasks loaded:', data.length);
        setPaidTasks(data.filter(task => task.status === 'active'));
        setPaidTasksLoaded(true);
      }
    } catch (error) {
      console.error('Error loading paid tasks:', error);
    }
  };

  // Helper function to get platform icon and styling based on platform name
  const getPlatformConfig = (platform: string) => {
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
    
    return platformConfigs[platform.toLowerCase()] || {
      icon: FaTelegram,
      borderColor: 'border-gray-500',
      glow: 'drop-shadow-[0_0_20px_#888888]',
      bgColor: 'bg-gray-500',
      link: ''
    };
  };

  const handlePaidTaskClick = () => {
    // Refresh paid tasks after a click
    loadPaidTasks();
  };

  return (
    <div className="daily-tasks-section">
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
                      // This would be handled in the parent component
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
  );
};

export default DailyTasksSection;