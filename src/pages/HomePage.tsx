import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Share2, Award, Wallet, Twitter, Users, Star, Trophy } from 'lucide-react';
import { FaTelegram } from 'react-icons/fa6';
import { useLanguage } from '../context/LanguageContext';
import { WalletConnect } from '../components/WalletConnect';
import { getFixedTasks } from '../../lib/supabase/getFixedTasks';
import { claimFixedTask } from '../../lib/supabase/claimFixedTask';
import toast from 'react-hot-toast';

interface HomePageProps {
  userMinutes?: number;
  userPoints?: number;
  userLevel?: string;
}

const HomePage: React.FC<HomePageProps> = ({ 
  userMinutes = 0, 
  userPoints = 0, 
  userLevel = 'bronze' 
}) => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [fixedTasks, setFixedTasks] = useState<any[]>([]);
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
  const [claimingTasks, setClaimingTasks] = useState<Set<string>>(new Set());
  const [tasksLoaded, setTasksLoaded] = useState(false);

  // Load fixed tasks when component mounts
  React.useEffect(() => {
    const loadFixedTasks = async () => {
      try {
        const { data, error } = await getFixedTasks();
        if (error) {
          console.error('Error loading fixed tasks:', error);
          return;
        }
        
        if (data) {
          setFixedTasks(data.tasks);
          const completed = new Set(data.completedTasks.map(ct => ct.fixed_task_id));
          setCompletedTasks(completed);
        }
        setTasksLoaded(true);
      } catch (error) {
        console.error('Error loading fixed tasks:', error);
        setTasksLoaded(true);
      }
    };

    loadFixedTasks();
  }, []);

  const handleClaimTask = async (taskId: string) => {
    if (claimingTasks.has(taskId) || completedTasks.has(taskId)) return;

    setClaimingTasks(prev => new Set([...prev, taskId]));

    try {
      const result = await claimFixedTask(taskId);
      
      if (result.success) {
        setCompletedTasks(prev => new Set([...prev, taskId]));
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

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'platinum': return 'text-purple-400';
      case 'gold': return 'text-yellow-400';
      case 'silver': return 'text-gray-300';
      default: return 'text-yellow-600';
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'platinum': return '💎';
      case 'gold': return '🥇';
      case 'silver': return '🥈';
      default: return '🥉';
    }
  };

  const description = {
    en: [
      'LYRA Coin – Smart funding for Syria\'s reconstruction through blockchain.',
      'We use blockchain technology to track funds and ensure full transparency.',
      'Direct humanitarian funding reaches service projects with no middlemen or corruption.',
      'Every transaction is verifiable, preventing fraud and mismanagement.'
    ],
    ar: [
      'LYRA Coin – تمويل ذكي لإعادة إعمار سوريا عبر تقنية البلوكشين.',
      'نستخدم تقنية البلوكشين لتتبع الأموال وضمان الشفافية الكاملة.',
      'يصل التمويل الإنساني المباشر إلى المشاريع الخدمية دون وسطاء أو فساد.',
      'كل معاملة قابلة للتحقق، مما يمنع الاحتيال وسوء الإدارة.'
    ]
  };

  const promotionalText = {
    en: [
      'LYRA COIN – Your golden opportunity to invest in the promising cryptocurrency!',
      'Be among the first owners and benefit from the exclusive founding price before the official launch.',
      'Pre-sale is limited and quantities are running out fast.',
      'Don\'t miss this unique opportunity to be part of the digital future.',
      'Secure your investment now at the best price!'
    ],
    ar: [
      'LYRA COIN – فرصتك الذهبية للاستثمار في العملة الرقمية الواعدة!',
      'كن من أوائل المالكين واستفد من السعر التأسيسي الحصري قبل الإطلاق الرسمي.',
      'البيع المسبق محدود والكميات تنتهي بسرعة.',
      'لا تفوت هذه الفرصة الفريدة لتكون جزءاً من المستقبل الرقمي.',
      'احجز استثمارك الآن بأفضل سعر!'
    ]
  };

  return (
    <div className="min-h-screen pb-24 bg-gradient-to-b from-[#041e11] via-[#051a13] to-[#040d0c] px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Logo and Description */}
        <div className="text-center">
          <img
            src="/publiclogo.png"
            alt="LYRA COIN"
            className="w-24 h-24 mx-auto mb-6 drop-shadow-[0_0_30px_#00FF88] animate-float"
          />
          <div className="space-y-4 text-white">
            {description[language === 'ar' ? 'ar' : 'en'].map((line, index) => (
              <p
                key={index}
                className={`${index === 0 ? 'text-xl font-bold mb-6' : 'text-sm text-white/80'}`}
              >
                {line}
              </p>
            ))}
          </div>
        </div>

        {/* Level and Points Card */}
        <div className="bg-black/40 backdrop-blur-sm border border-neonGreen/30 rounded-xl p-6 text-white shadow-[0_0_15px_rgba(0,255,136,0.3)]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Trophy className="w-6 h-6 text-neonGreen" />
              <h2 className="text-xl font-semibold">
                {language === 'ar' ? 'مستواك ونقاطك' : 'Your Level & Points'}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{getLevelIcon(userLevel)}</span>
              <span className={`text-lg font-bold capitalize ${getLevelColor(userLevel)}`}>
                {userLevel}
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-neonGreen">{userPoints}</div>
              <p className="text-sm text-white/60">
                {language === 'ar' ? 'النقاط' : 'Points'}
              </p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-neonGreen">{userMinutes}</div>
              <p className="text-sm text-white/60">
                {language === 'ar' ? 'الدقائق' : 'Minutes'}
              </p>
            </div>
          </div>

          {/* Level Progress */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-white/60 mb-1">
              <span>Bronze (0-200)</span>
              <span>Silver (201-500)</span>
              <span>Gold (501-1000)</span>
              <span>Platinum (1001+)</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2">
              <div 
                className="bg-neonGreen h-2 rounded-full transition-all duration-500"
                style={{ 
                  width: `${Math.min((userPoints / 1001) * 100, 100)}%` 
                }}
              />
            </div>
          </div>

          <div className="mt-4 p-3 bg-neonGreen/10 border border-neonGreen/30 rounded-lg">
            <p className="text-center text-neonGreen font-bold text-sm">
              {language === 'ar' 
                ? 'اجمع النقاط لترقية مستواك واكسب المزيد من المكافآت!'
                : 'Collect points to upgrade your level and earn more rewards!'}
            </p>
          </div>
        </div>

        {/* Wallet Connect */}
        <div className="bg-black/40 backdrop-blur-sm border border-neonGreen/30 rounded-xl p-6 text-white shadow-[0_0_15px_rgba(0,255,136,0.3)]">
          <div className="flex items-center gap-3 mb-4">
            <Wallet className="w-6 h-6 text-neonGreen" />
            <h2 className="text-xl font-semibold">
              {language === 'ar' ? 'محفظة TON' : 'TON Wallet'}
            </h2>
          </div>
          
          {/* Promotional Text */}
          <div className="mb-6 space-y-3">
            {promotionalText[language === 'ar' ? 'ar' : 'en'].map((line, index) => (
              <p
                key={index}
                className={`${
                  index === 0 
                    ? 'text-lg font-bold text-neonGreen' 
                    : index === promotionalText[language === 'ar' ? 'ar' : 'en'].length - 1
                    ? 'text-base font-semibold text-yellow-400'
                    : 'text-sm text-white/90'
                }`}
              >
                {line}
              </p>
            ))}
          </div>
          
          <WalletConnect />
        </div>

        {/* Fixed Tasks Section */}
        {tasksLoaded && fixedTasks.length > 0 && (
          <div className="bg-black/40 backdrop-blur-sm border border-neonGreen/30 rounded-xl p-6 text-white shadow-[0_0_15px_rgba(0,255,136,0.3)]">
            <div className="flex items-center gap-3 mb-4">
              <Star className="w-6 h-6 text-neonGreen" />
              <h2 className="text-xl font-semibold">
                {language === 'ar' ? 'المهام الثابتة' : 'Fixed Tasks'}
              </h2>
            </div>
            
            <div className="space-y-3">
              {fixedTasks.map((task) => {
                const isCompleted = completedTasks.has(task.id);
                const isClaiming = claimingTasks.has(task.id);
                
                return (
                  <div 
                    key={task.id}
                    className={`p-4 rounded-lg border transition-all duration-300 ${
                      isCompleted 
                        ? 'bg-neonGreen/10 border-neonGreen/30 opacity-75' 
                        : 'bg-white/5 border-white/10 hover:border-neonGreen/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm">{task.title}</h3>
                        <p className="text-xs text-white/60 mt-1">{task.description}</p>
                        <p className="text-xs text-neonGreen mt-1">
                          +{task.points_reward} {language === 'ar' ? 'نقطة' : 'points'}
                        </p>
                      </div>
                      
                      <button
                        onClick={() => handleClaimTask(task.id)}
                        disabled={isCompleted || isClaiming}
                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300 ${
                          isCompleted
                            ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                            : isClaiming
                            ? 'bg-neonGreen/50 text-black cursor-not-allowed'
                            : 'bg-neonGreen text-black hover:brightness-110'
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

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => navigate('/tasks')}
            className="bg-black/40 backdrop-blur-sm border border-neonGreen/30 rounded-xl p-6 text-white hover:scale-105 transition duration-300 shadow-[0_0_15px_rgba(0,255,136,0.3)]"
          >
            <Award className="w-6 h-6 text-neonGreen mb-2" />
            <h3 className="font-semibold">
              {language === 'ar' ? 'المهام' : 'Tasks'}
            </h3>
            <p className="text-sm text-white/60 mt-1">
              {language === 'ar' ? 'اكسب النقاط والدقائق' : 'Earn points & minutes'}
            </p>
          </button>

          <button
            onClick={() => navigate('/referrals')}
            className="bg-black/40 backdrop-blur-sm border border-neonGreen/30 rounded-xl p-6 text-white hover:scale-105 transition duration-300 shadow-[0_0_15px_rgba(0,255,136,0.3)]"
          >
            <Share2 className="w-6 h-6 text-neonGreen mb-2" />
            <h3 className="font-semibold">
              {language === 'ar' ? 'الإحالات' : 'Referrals'}
            </h3>
            <p className="text-sm text-white/60 mt-1">
              {language === 'ar' ? 'شارك واربح' : 'Share and earn'}
            </p>
          </button>
        </div>

        {/* Join Our Community */}
        <div className="bg-black/40 backdrop-blur-sm border border-neonGreen/30 rounded-xl p-6 text-white shadow-[0_0_15px_rgba(0,255,136,0.3)]">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-6 h-6 text-neonGreen" />
            <h2 className="text-xl font-semibold">
              {language === 'ar' ? 'انضم إلى مجتمعنا' : 'Join Our Community'}
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <a
              href="https://t.me/LYRACoinBot"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-[#0088cc] text-white py-3 px-4 rounded-lg font-medium hover:brightness-110 transition"
            >
              <FaTelegram className="w-5 h-5" />
              Telegram
            </a>
            <a
              href="https://twitter.com/LYRACoin"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-black text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-900 transition"
            >
              <Twitter className="w-5 h-5" />
              Twitter
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;