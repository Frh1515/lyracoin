import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Share2, Award, Wallet, Twitter, Users } from 'lucide-react';
import { FaTelegram } from 'react-icons/fa6';
import { useLanguage } from '../context/LanguageContext';
import { WalletConnect } from '../components/WalletConnect';

interface HomePageProps {
  userMinutes?: number;
}

const HomePage: React.FC<HomePageProps> = ({ userMinutes = 0 }) => {
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

        {/* Wallet Connect */}
        <div className="bg-black/40 backdrop-blur-sm border border-neonGreen/30 rounded-xl p-6 text-white shadow-[0_0_15px_rgba(0,255,136,0.3)]">
          <div className="flex items-center gap-3 mb-4">
            <Wallet className="w-6 h-6 text-neonGreen" />
            <h2 className="text-xl font-semibold">
              {language === 'ar' ? 'محفظة TON' : 'TON Wallet'}
            </h2>
          </div>
          <WalletConnect />
        </div>

        {/* Minutes Card */}
        <div className="bg-black/40 backdrop-blur-sm border border-neonGreen/30 rounded-xl p-6 text-white shadow-[0_0_15px_rgba(0,255,136,0.3)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="w-6 h-6 text-neonGreen" />
              <h2 className="text-xl font-semibold">
                {language === 'ar' ? 'دقائقك' : 'Your Minutes'}
              </h2>
            </div>
            <span className="text-2xl font-bold text-neonGreen">{userMinutes}</span>
          </div>
          <p className="mt-2 text-sm text-white/60">
            {language === 'ar' 
              ? 'اكسب المزيد من الدقائق عن طريق إكمال المهام ودعوة الأصدقاء'
              : 'Earn more minutes by completing tasks and inviting friends'}
          </p>
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
              {language === 'ar' ? 'اكسب المزيد من الدقائق' : 'Earn more minutes'}
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