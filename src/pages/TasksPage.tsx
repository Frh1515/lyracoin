import React, { useState } from 'react';
import { FaYoutube, FaFacebook, FaTiktok, FaTelegram, FaInstagram, FaXTwitter } from 'react-icons/fa6';
import { Gamepad2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import CandyCrushGame from '../components/CandyCrushGame';

const TasksPage: React.FC = () => {
  const [completedTasks, setCompletedTasks] = useState(4);
  const [showCandyCrushGame, setShowCandyCrushGame] = useState(false);
  const totalTasks = 10;
  const completionPercentage = Math.round((completedTasks / totalTasks) * 100);
  const { language } = useLanguage();

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

  const handleGameClose = () => {
    setShowCandyCrushGame(false);
  };

  return (
    <div className="min-h-screen pb-24 bg-gradient-to-b from-[#041e11] via-[#051a13] to-[#040d0c]">
      {/* Candy Crush Game Modal */}
      {showCandyCrushGame && (
        <CandyCrushGame onClose={handleGameClose} />
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

      {/* Games Card - Featured at the top */}
      <div className="mt-10 px-6">
        <div
          onClick={() => setShowCandyCrushGame(true)}
          className="p-6 bg-darkGreenCustom backdrop-blur-sm border-2 border-neonGreenCustom rounded-xl text-white 
            hover:scale-105 hover:brightness-110 transition duration-300 shadow-glowCustom cursor-pointer mb-8"
        >
          <div className="flex items-center gap-3 mb-4">
            <Gamepad2 className="w-7 h-7 text-neonGreenCustom" />
            <h4 className="font-bold text-xl text-neonGreenCustom">
              {language === 'ar' ? '🎮 الألعاب' : '🎮 Games'}
            </h4>
          </div>
          <p className="text-sm text-lightGrayCustom mb-2">
            {language === 'ar' ? 'العب Candy Crush واكسب الدقائق!' : 'Play Candy Crush and earn minutes!'}
          </p>
          <p className="text-xs text-white/60 mb-4">
            {language === 'ar' 
              ? 'اجمع 3 أو أكثر من نفس اللون • 1-3 دقائق لكل مجموعة'
              : 'Match 3 or more same colors • 1-3 minutes per match'
            }
          </p>
          <div className="bg-neonGreenCustom text-black px-4 py-2 rounded-lg font-semibold text-center hover:brightness-110 transition">
            {language === 'ar' ? 'ابدأ اللعب' : 'Start Playing'}
          </div>
        </div>
      </div>

      {/* Social Media Tasks Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-6">
        {platforms.map((platform, index) => (
          <div
            key={index}
            className={`p-6 bg-black/40 backdrop-blur-sm border rounded-xl text-white 
              hover:scale-105 hover:brightness-110 transition duration-300 ${platform.borderColor} ${platform.glow}`}
          >
            <div className="flex items-center gap-3 mb-4">
              <platform.icon className={`w-7 h-7 ${platform.bgColor} rounded-lg p-1 text-white`} />
              <h4 className="font-bold text-lg">
                {language === 'ar' ? `مهمة ${platform.name}` : `${platform.name} Task`}
              </h4>
            </div>
            <p className="text-sm text-gray-300">
              {language === 'ar' ? 'المكافأة: +60 دقيقة' : 'Reward: +60 minutes'}
            </p>
            <button 
              className={`mt-4 w-full px-4 py-2.5 rounded-lg font-semibold text-white 
                transition duration-300 hover:brightness-110 ${platform.bgColor}`}
            >
              {language === 'ar' ? 'ابدأ المهمة' : 'Start Task'}
            </button>
          </div>
        ))}
      </div>

      {/* Daily Tasks Section */}
      <div className="mt-16 px-6">
        <h3 className="text-2xl font-bold text-white mb-8">
          {language === 'ar' ? '🎯 المهام اليومية' : '🎯 Daily Tasks'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(10)].map((_, index) => {
            const platform = platforms[index % platforms.length];
            return (
              <div
                key={index}
                className={`p-6 bg-black/40 backdrop-blur-sm border rounded-xl text-white 
                  hover:scale-105 hover:brightness-110 transition duration-300 ${platform.borderColor} ${platform.glow}`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <platform.icon className={`w-6 h-6 ${platform.bgColor} rounded-lg p-1 text-white`} />
                  <h5 className="font-medium">
                    {language === 'ar' 
                      ? `مهمة ${platform.name} #${index + 1}` 
                      : `${platform.name} Task #${index + 1}`}
                  </h5>
                </div>
                <p className="text-sm text-gray-300">
                  {language === 'ar' ? 'المكافأة: +20 دقيقة' : 'Reward: +20 minutes'}
                </p>
                <button 
                  className={`mt-4 w-full px-4 py-2.5 rounded-lg font-semibold text-white 
                    transition duration-300 hover:brightness-110 ${platform.bgColor}`}
                >
                  {language === 'ar' ? 'عرض التفاصيل' : 'View Details'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TasksPage;