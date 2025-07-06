import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { recordTaskClick } from '../../lib/supabase/taskConsumptionSystem';
import { supabase } from '../lib/supabase/client';
import toast from 'react-hot-toast';

interface PaidTask {
  id: string;
  title: string;
  description: string;
  link: string;
  platform: string;
  totalClicks: number;
  completedClicks: number;
  targetCommunity: string;
  pricePaid: number;
  lyraPerClick: number;
  status: string;
  createdAt: string;
}

interface PaidTaskCardProps {
  task: PaidTask;
  isCompleted: boolean;
  onTaskClick: () => void;
}

const PaidTaskCard: React.FC<PaidTaskCardProps> = ({ 
  task, 
  isCompleted,
  onTaskClick
}) => {
  const { language } = useLanguage();
  const [isClicking, setIsClicking] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [hasWaited, setHasWaited] = useState(false);

  const getPlatformInfo = (platform: string, link: string) => {
    const domain = link.toLowerCase();
    
    if (domain.includes('facebook.com')) {
      return { title: 'Facebook', icon: '📘', color: 'border-blue-500 bg-blue-500/10' };
    } else if (domain.includes('instagram.com')) {
      return { title: 'Instagram', icon: '📷', color: 'border-pink-500 bg-pink-500/10' };
    } else if (domain.includes('twitter.com') || domain.includes('x.com')) {
      return { title: 'Twitter', icon: '🐦', color: 'border-sky-400 bg-sky-400/10' };
    } else if (domain.includes('tiktok.com')) {
      return { title: 'TikTok', icon: '🎵', color: 'border-pink-600 bg-pink-600/10' };
    } else if (domain.includes('youtube.com')) {
      return { title: 'YouTube', icon: '📺', color: 'border-red-500 bg-red-500/10' };
    } else if (domain.includes('telegram.org') || domain.includes('t.me')) {
      return { title: 'Telegram', icon: '✈️', color: 'border-cyan-400 bg-cyan-400/10' };
    } else {
      return { title: 'LYRA Task', icon: '🎯', color: 'border-neonGreen bg-neonGreen/10' };
    }
  };

  const handleStartTask = () => {
    // Open the task link in a new tab
    window.open(task.link, '_blank', 'noopener,noreferrer');
    
    // Start the timer
    setStartTime(Date.now());
    
    // Reset the hasWaited flag
    setHasWaited(false);
    
    // Set a timeout to enable claiming after 30 seconds
    setTimeout(() => {
      setHasWaited(true);
    }, 30000);
    
    toast.info(
      language === 'ar' 
        ? 'تم فتح الرابط. انتظر 30 ثانية قبل المطالبة بالمكافأة'
        : 'Link opened. Wait 30 seconds before claiming reward',
      { duration: 5000 }
    );
  };

  const handleClaimTask = async () => {
    if (!hasWaited) {
      toast.error(
        language === 'ar' 
          ? 'يجب الانتظار 30 ثانية قبل المطالبة'
          : 'You must wait 30 seconds before claiming',
        { duration: 3000 }
      );
      return;
    }
    
    setIsClicking(true);
    
    try {
      // Get current authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error('User not authenticated');
      }

      // Get user's telegram_id
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('telegram_id')
        .eq('supabase_auth_id', user.id)
        .single();

      if (userError || !userData) {
        throw new Error('User not found');
      }
      
      // Record the click
      const result = await recordTaskClick(task.id, userData.telegram_id);
      
      if (result.success) {
        // Notify parent component to refresh tasks
        onTaskClick();
        
        toast.success(
          language === 'ar'
            ? 'تم إكمال المهمة بنجاح!'
            : 'Task completed successfully!',
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
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error claiming task:', error);
      toast.error(
        language === 'ar' 
          ? `فشل في المطالبة: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`
          : `Claim failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setIsClicking(false);
      setStartTime(null);
      setHasWaited(false);
    }
  };

  const getButtonConfig = () => {
    if (isCompleted) {
      return {
        text: language === 'ar' ? '✓ مكتمل' : '✓ Completed',
        className: 'bg-gray-600 text-gray-300 cursor-not-allowed opacity-50',
        disabled: true,
        onClick: () => {}
      };
    }

    if (isClicking) {
      return {
        text: language === 'ar' ? 'جاري المطالبة...' : 'Claiming...',
        className: 'bg-neonGreen/50 text-black cursor-not-allowed',
        disabled: true,
        onClick: () => {}
      };
    }

    // If timer is running (within 30 seconds)
    if (startTime && !hasWaited) {
      return {
        text: language === 'ar' ? 'انتظر...' : 'Wait...',
        className: 'bg-yellow-400/50 text-black cursor-not-allowed',
        disabled: true,
        onClick: () => {}
      };
    }

    // If 30 seconds have passed
    if (startTime && hasWaited) {
      return {
        text: language === 'ar' ? 'مطالبة' : 'Claim',
        className: 'bg-neonGreen text-black hover:brightness-110 animate-pulse shadow-[0_0_15px_rgba(0,255,136,0.5)]',
        disabled: false,
        onClick: handleClaimTask
      };
    }

    // Default state - start task
    return {
      text: language === 'ar' ? 'ابدأ المهمة' : 'Start Task',
      className: 'bg-neonGreen text-black hover:brightness-110',
      disabled: false,
      onClick: handleStartTask
    };
  };

  const platformInfo = getPlatformInfo(task.platform, task.link);
  const buttonConfig = getButtonConfig();

  return (
    <div className={`p-4 backdrop-blur-sm border rounded-xl text-white transition-all duration-300 ${
      isCompleted
        ? `bg-neonGreen/10 ${platformInfo.color} opacity-50` 
        : `bg-black/40 ${platformInfo.color} hover:scale-105 hover:brightness-110`
    }`}>
      <div className="flex items-center gap-3 mb-3">
        <div className="text-2xl">{platformInfo.icon}</div>
        <h5 className="font-medium text-sm">{task.title}</h5>
      </div>
      
      <p className="text-xs text-white/70 mb-3 line-clamp-2">
        {task.description || (language === 'ar' 
          ? 'انقر للمشاركة والتفاعل مع المحتوى'
          : 'Click to engage and interact with content'
        )}
      </p>
      
      <div className="flex items-center justify-between">
        <span className="text-xs text-neonGreen">
          +10 {language === 'ar' ? 'نقطة' : 'points'} & +10 {language === 'ar' ? 'دقيقة' : 'minutes'}
        </span>
        
        <button
          onClick={buttonConfig.onClick}
          disabled={buttonConfig.disabled}
          className={`px-3 py-1.5 rounded-lg font-medium text-xs transition-all duration-300 ${buttonConfig.className}`}
        >
          {buttonConfig.text}
        </button>
      </div>
    </div>
  );
};

export default PaidTaskCard;