import React, { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Share2, Award, Wallet, Twitter, Users, Star, Trophy, ArrowRightLeft } from 'lucide-react';
import { FaTelegram } from 'react-icons/fa6';
import { useLanguage } from '../context/LanguageContext';
import { WalletConnect } from '../components/WalletConnect';
import ExchangeModal from '../components/ExchangeModal';
import { useState, useEffect } from 'react';
import { getUserProfile } from '../../lib/supabase/getUserProfile';
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
  const [showExchangeModal, setShowExchangeModal] = useState(false);
  const { language } = useLanguage();
  const [logoError, setLogoError] = React.useState(false);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const { data, error } = await getUserProfile();
      
      if (error) {
        throw error;
      }

      if (data) {
        setProfile(data);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  const handleExchangeComplete = (
    type: 'buy' | 'sell' | 'convert', 
    amountIn: number, 
    currencyIn: string, 
    amountOut: number, 
    currencyOut: string
  ) => {
    // Update profile based on exchange type
    if (profile) {
      let updatedProfile = { ...profile };
      
      if (type === 'buy' && currencyOut === 'LYRA') {
        updatedProfile.lyra_balance += amountOut;
      } else if (type === 'sell' && currencyIn === 'LYRA') {
        updatedProfile.lyra_balance -= amountIn;
      } else if (type === 'convert') {
        if (currencyIn === 'MINUTES' && currencyOut === 'LYRA') {
          updatedProfile.total_minutes -= amountIn;
          updatedProfile.lyra_balance += amountOut;
        }
      }
      
      setProfile(updatedProfile);
    }
    
    // Close modal
    setShowExchangeModal(false);
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

  // Calculate level progress percentage (matching other pages)
  const getLevelProgress = (points: number) => {
    if (points >= 1001) return 100; // Platinum
    if (points >= 501) return Math.min(((points - 501) / 500) * 100 + 75, 100); // Gold range
    if (points >= 201) return Math.min(((points - 201) / 300) * 100 + 50, 75); // Silver range
    return Math.min((points / 200) * 50, 50); // Bronze range
  };

  const handleLogoError = () => {
    setLogoError(true);
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
          {!logoError ? (
            <img
              src="/publiclogo.png"
              alt="LYRA COIN"
              className="w-40 h-40 mx-auto mb-6 drop-shadow-[0_0_40px_#00FF88] animate-float rounded-full border-4 border-neonGreen/50 shadow-[0_0_20px_rgba(0,255,136,0.3)]"
              loading="lazy"
              width="160"
              height="160"
              onError={handleLogoError}
            />
          ) : (
            // Fallback logo using CSS and text
            <div className="w-40 h-40 mx-auto mb-6 bg-gradient-to-br from-[#00FF88] to-[#00e078] rounded-full flex items-center justify-center drop-shadow-[0_0_40px_#00FF88] animate-float border-4 border-neonGreen/50 shadow-[0_0_20px_rgba(0,255,136,0.3)]">
              <div className="text-center">
                <div className="text-black font-bold text-2xl leading-tight">LYRA</div>
                <div className="text-black font-bold text-lg">COIN</div>
              </div>
            </div>
          )}
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
        <div className="bg-black/40 backdrop-blur-sm border border-neonGreen/30 rounded-xl p-6 text-white shadow-[0_0_15px_rgba(0,255,136,0.3)] home-mining-card">
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
              <div className="text-2xl font-bold text-neonGreen flex items-center justify-center gap-2">
                {userMinutes}
                <span className="px-2 py-0.5 bg-yellow-400/20 text-yellow-400 text-xs rounded-full border border-yellow-400/30">
                  {language === 'ar' ? 'قريباً =' : '= Soon'}
                </span>
              </div>
              <p className="text-sm text-white/60">
                {language === 'ar' ? 'الدقائق' : 'Minutes'}
              </p>
            </div>
          </div>

          {/* Level Progress - Matching other pages */}
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
                  width: `${getLevelProgress(userPoints)}%` 
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

        {/* Exchange Button */}
        <div className="mb-8">
          <button
            onClick={() => setShowExchangeModal(true)}
            className="w-full p-6 bg-gradient-to-r from-neonGreen to-blue-500 border-2 border-neonGreen/50 rounded-xl text-white font-bold hover:scale-105 transition duration-300 shadow-[0_0_20px_rgba(0,255,136,0.5)] flex items-center justify-center gap-3"
          >
            <ArrowRightLeft className="w-8 h-8" />
            <span className="text-xl">
              {language === 'ar' ? 'تحويل العملات' : 'Exchange Currencies'}
            </span>
          </button>
        </div>

        {/* Exchange Rates */}
        <div className="bg-black/40 backdrop-blur-sm border border-neonGreen/30 rounded-xl p-6 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <ArrowRightLeft className="w-6 h-6 text-neonGreen" />
            <h3 className="text-xl font-semibold text-white">
              {language === 'ar' ? 'أسعار التحويل' : 'Exchange Rates'}
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-neonGreen/10 border border-neonGreen/30 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-neonGreen mb-2">1000</div>
              <p className="text-white/70 text-sm">
                {language === 'ar' ? 'دقيقة = 1 LYRA' : 'Minutes = 1 LYRA'}
              </p>
            </div>
            
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-500 mb-2">100</div>
              <p className="text-white/70 text-sm">
                {language === 'ar' ? 'LYRA = 1 TON' : 'LYRA = 1 TON'}
              </p>
            </div>
            
            <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-yellow-400 mb-2">0.01</div>
              <p className="text-white/70 text-sm">
                {language === 'ar' ? 'TON = 1 LYRA' : 'TON = 1 LYRA'}
              </p>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-white/5 border border-white/10 rounded-lg">
            <p className="text-center text-white/70 text-sm">
              {language === 'ar' 
                ? '⚠️ ملاحظة: أسعار التحويل ثابتة ولا تتغير'
                : '⚠️ Note: Exchange rates are fixed and do not change'
              }
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

        {/* Minutes Card with promotional text */}
        <div className="bg-black/40 backdrop-blur-sm border border-neonGreen/30 rounded-xl p-6 text-white shadow-[0_0_15px_rgba(0,255,136,0.3)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="w-6 h-6 text-neonGreen" />
              <h2 className="text-xl font-semibold">
                {language === 'ar' ? 'دقائقك' : 'Your Minutes'}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-neonGreen">{userMinutes}</span>
              <span className="px-2 py-0.5 bg-yellow-400/20 text-yellow-400 text-xs rounded-full border border-yellow-400/30">
                {language === 'ar' ? 'قريباً =' : '= Soon'}
              </span>
            </div>
          </div>
          <p className="mt-2 text-sm text-white/60">
            {language === 'ar' 
              ? 'اكسب المزيد من الدقائق عن طريق إكمال المهام ودعوة الأصدقاء'
              : 'Earn more minutes by completing tasks and inviting friends'}
          </p>
          
          {/* Promotional text for minutes section */}
          <div className="mt-4 p-3 bg-neonGreen/10 border border-neonGreen/30 rounded-lg">
            <p className="text-center text-neonGreen font-bold text-sm">
              {language === 'ar' 
                ? 'اجمع الدقائق وحولها إلى أموال حقيقية - اشتري LYRA COIN الآن!'
                : 'Collect minutes and turn them into real money - buy LYRA COIN now!'}
            </p>
          </div>
        </div>

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
            className="bg-black/40 backdrop-blur-sm border border-neonGreen/30 rounded-xl p-6 text-white hover:scale-105 transition duration-300 shadow-[0_0_15px_rgba(0,255,136,0.3)] referral-button"
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
      
      {/* Exchange Modal */}
      <ExchangeModal
        isOpen={showExchangeModal}
        onClose={() => setShowExchangeModal(false)}
        userMinutes={profile?.total_minutes || userMinutes || 0}
        userLyraBalance={profile?.lyra_balance || 0}
        onExchangeComplete={handleExchangeComplete}
      />
    </div>
  );
};

export default memo(HomePage);