import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Share2, Award, Wallet, Twitter, Users, Star } from 'lucide-react';
import { FaTelegram } from 'react-icons/fa6';
import { useLanguage } from '../context/LanguageContext';
import { WalletConnect } from '../components/WalletConnect';

interface HomePageProps {
  userMinutes?: number;
  userPoints?: number;
}

const HomePage: React.FC<HomePageProps> = ({ userMinutes = 0, userPoints = 0 }) => {
  const navigate = useNavigate();
  const { language } = useLanguage();

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

  // Calculate user level based on points
  const getUserLevel = (points: number) => {
    if (points >= 1001) return { name: 'Platinum', color: 'text-purple-400', bgColor: 'bg-purple-500/20' };
    if (points >= 501) return { name: 'Gold', color: 'text-yellow-400', bgColor: 'bg-yellow-400/20' };
    if (points >= 201) return { name: 'Silver', color: 'text-gray-300', bgColor: 'bg-gray-300/20' };
    return { name: 'Bronze', color: 'text-amber-700', bgColor: 'bg-amber-700/20' };
  };

  const userLevel = getUserLevel(userPoints);

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

        {/* User Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Minutes Card */}
          <div className="bg-black/40 backdrop-blur-sm border border-neonGreen/30 rounded-xl p-6 text-white shadow-[0_0_15px_rgba(0,255,136,0.3)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="w-6 h-6 text-neonGreen" />
                <h2 className="text-lg font-semibold">
                  {language === 'ar' ? 'دقائقك' : 'Minutes'}
                </h2>
              </div>
              <span className="text-2xl font-bold text-neonGreen">{userMinutes}</span>
            </div>
            <p className="mt-2 text-sm text-white/60">
              {language === 'ar' 
                ? 'اكسب المزيد من الدقائق عن طريق إكمال المهام'
                : 'Earn more minutes by completing tasks'}
            </p>
          </div>

          {/* Points Card */}
          <div className="bg-black/40 backdrop-blur-sm border border-neonGreen/30 rounded-xl p-6 text-white shadow-[0_0_15px_rgba(0,255,136,0.3)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Star className="w-6 h-6 text-neonGreen" />
                <h2 className="text-lg font-semibold">
                  {language === 'ar' ? 'النقاط' : 'Points'}
                </h2>
              </div>
              <span className="text-2xl font-bold text-neonGreen">{userPoints}</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className={`inline-block text-sm px-2 py-1 rounded-full ${userLevel.bgColor} ${userLevel.color} font-semibold`}>
                {userLevel.name}
              </span>
              <span className="text-xs text-white/60">
                {language === 'ar' ? 'المستوى' : 'Level'}
              </span>
            </div>
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
              {language === 'ar' ? 'شارك واربح النقاط' : 'Share and earn points'}
            </p>
          </button>
        </div>

        {/* Level Progress Information */}
        <div className="bg-black/40 backdrop-blur-sm border border-neonGreen/30 rounded-xl p-6 text-white shadow-[0_0_15px_rgba(0,255,136,0.3)]">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-neonGreen" />
            {language === 'ar' ? 'نظام المستويات' : 'Level System'}
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-amber-700">Bronze:</span>
              <span className="text-white/70">0 - 200 {language === 'ar' ? 'نقطة' : 'points'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Silver:</span>
              <span className="text-white/70">201 - 500 {language === 'ar' ? 'نقطة' : 'points'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-yellow-400">Gold:</span>
              <span className="text-white/70">501 - 1000 {language === 'ar' ? 'نقطة' : 'points'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-purple-400">Platinum:</span>
              <span className="text-white/70">1001+ {language === 'ar' ? 'نقطة' : 'points'}</span>
            </div>
          </div>
        </div>

        {/* Join Our Community - Moved to bottom */}
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