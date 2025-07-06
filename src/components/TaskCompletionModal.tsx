import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Clock, Award } from 'lucide-react';
import Confetti from 'react-confetti';
import { useLanguage } from '../context/LanguageContext';

interface TaskCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskTitle: string;
  platform: string;
  totalClicks: number;
  lyraSpent: number;
}

const TaskCompletionModal: React.FC<TaskCompletionModalProps> = ({
  isOpen,
  onClose,
  taskTitle,
  platform,
  totalClicks,
  lyraSpent
}) => {
  const { language } = useLanguage();
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isOpen) return null;

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'facebook': return '📘';
      case 'instagram': return '📷';
      case 'twitter': return '🐦';
      case 'tiktok': return '🎵';
      case 'youtube': return '📺';
      case 'telegram': return '✈️';
      default: return '🎯';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Confetti
        width={windowSize.width}
        height={windowSize.height}
        recycle={false}
        numberOfPieces={200}
        gravity={0.2}
        colors={['#00ff88', '#00e078', '#ffffff', '#ffcc21', '#3b82f6']}
      />
      
      <div className="bg-darkGreen border-2 border-neonGreen rounded-xl p-6 w-full max-w-md relative shadow-[0_0_15px_rgba(0,255,136,0.3)]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/60 hover:text-white transition"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="text-center">
          <div className="w-20 h-20 bg-neonGreen rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-black" />
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-4">
            {language === 'ar' ? 'مهمة مكتملة! 🎉' : 'Task Completed! 🎉'}
          </h2>
          
          <div className="bg-black/30 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 justify-center mb-2">
              <span className="text-2xl">{getPlatformIcon(platform)}</span>
              <h3 className="text-lg font-semibold text-white">{taskTitle}</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="text-center">
                <Clock className="w-5 h-5 text-neonGreen mx-auto mb-1" />
                <p className="text-white/70 text-sm">
                  {language === 'ar' ? 'إجمالي الكليكات' : 'Total Clicks'}
                </p>
                <p className="text-neonGreen font-bold text-xl">
                  {totalClicks.toLocaleString()}
                </p>
              </div>
              
              <div className="text-center">
                <Award className="w-5 h-5 text-neonGreen mx-auto mb-1" />
                <p className="text-white/70 text-sm">
                  {language === 'ar' ? 'LYRA المستهلكة' : 'LYRA Spent'}
                </p>
                <p className="text-neonGreen font-bold text-xl">
                  {lyraSpent.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
          
          <p className="text-white/80 mb-6">
            {language === 'ar' 
              ? 'تم إكمال جميع الكليكات المطلوبة لهذه المهمة بنجاح!'
              : 'All required clicks for this task have been successfully completed!'}
          </p>
          
          <button
            onClick={onClose}
            className="w-full bg-neonGreen text-black font-bold py-3 rounded-lg hover:brightness-110 transition"
          >
            {language === 'ar' ? 'حسناً' : 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskCompletionModal;