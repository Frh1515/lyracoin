import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { getReferralStats, type ReferralStats } from '../../lib/supabase/getReferralStats';
import { claimReferralReward } from '../../lib/supabase/claimReferralReward';
import { supabase } from '../../lib/supabase/client';
import { Share2, X } from 'lucide-react';
import toast from 'react-hot-toast';

const ReferralsPage: React.FC = () => {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const { language } = useLanguage();
  const referralLink = 'https://t.me/LyraCoinBot';

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error(language === 'ar' ? 'يرجى تسجيل الدخول أولاً' : 'Please login first');
        return;
      }

      const { data, error } = await getReferralStats(user.id);
      if (error) {
        toast.error(language === 'ar' ? 'فشل تحميل الإحصائيات' : 'Failed to load statistics');
      } else if (data) {
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error(language === 'ar' ? 'حدث خطأ' : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async (referralId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error(language === 'ar' ? 'يرجى تسجيل الدخول أولاً' : 'Please login first');
        return;
      }

      const result = await claimReferralReward(referralId, user.id);
      if (result.success) {
        toast.success(
          language === 'ar'
            ? `تم إضافة ${result.minutes_earned} دقيقة إلى رصيدك!`
            : `+${result.minutes_earned} minutes added to your balance!`
        );
        fetchStats();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error claiming reward:', error);
      toast.error(language === 'ar' ? 'فشل المطالبة بالمكافأة' : 'Failed to claim reward');
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'platinum': return 'bg-gradient-to-r from-purple-400 to-purple-600';
      case 'gold': return 'bg-gradient-to-r from-yellow-400 to-yellow-600';
      case 'silver': return 'bg-gradient-to-r from-gray-300 to-gray-500';
      default: return 'bg-gradient-to-r from-amber-700 to-amber-900';
    }
  };

  const shareMessage = language === 'ar'
    ? `انضم الآن وساعدني في الكسب! 🪙 أنا فقط من سيحصل على النقاط عند تسجيلك 😉\n${referralLink}`
    : `Join now and help me earn! 🪙 Only I get points for your signup 😉\n${referralLink}`;

  const ShareModal = () => (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-darkGreen border border-neonGreen/30 rounded-xl p-6 w-full max-w-md relative">
        <button
          onClick={() => setShowShareModal(false)}
          className="absolute top-4 right-4 text-white/60 hover:text-white"
        >
          <X className="w-6 h-6" />
        </button>

        <h3 className="text-xl font-bold text-white mb-6">
          {language === 'ar' ? 'مشاركة الرابط' : 'Share Link'}
        </h3>

        <div className="space-y-4">
          <div className="bg-black/30 p-4 rounded-lg text-white/80 text-sm">
            {shareMessage}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <a
              href={`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(shareMessage)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-[#0088cc] text-white py-3 px-4 rounded-lg font-medium hover:brightness-110 transition"
            >
              Telegram
            </a>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(shareMessage)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-[#25D366] text-white py-3 px-4 rounded-lg font-medium hover:brightness-110 transition"
            >
              WhatsApp
            </a>
          </div>

          <button
            onClick={() => {
              navigator.clipboard.writeText(shareMessage);
              toast.success(language === 'ar' ? 'تم النسخ!' : 'Copied!');
            }}
            className="w-full bg-white/10 text-white py-3 rounded-lg font-medium hover:bg-white/20 transition"
          >
            {language === 'ar' ? 'نسخ الرسالة' : 'Copy Message'}
          </button>
        </div>
      </div>
    </div>
  );

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
    <div className="min-h-screen pb-24 bg-gradient-to-b from-[#041e11] via-[#051a13] to-[#040d0c] px-4 py-8">
      {showShareModal && <ShareModal />}
      
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">
            {language === 'ar' ? 'نظام الإحالة' : 'Referral System'}
          </h1>
          <button
            onClick={() => setShowShareModal(true)}
            className="flex items-center gap-2 bg-neonGreen text-black px-4 py-2 rounded-lg font-medium hover:brightness-110 transition"
          >
            <Share2 className="w-4 h-4" />
            {language === 'ar' ? 'مشاركة' : 'Share'}
          </button>
        </div>

        {/* Tier Badge */}
        {stats && (
          <div className={`mb-8 p-4 rounded-xl text-center ${getTierColor(stats.referral_tier)}`}>
            <h2 className="text-xl font-bold text-white">
              {language === 'ar' ? `مستوى ${stats.referral_tier}` : `${stats.referral_tier.charAt(0).toUpperCase() + stats.referral_tier.slice(1)} Tier`}
            </h2>
          </div>
        )}

        {/* Referral Link */}
        <div className="bg-white/5 border border-neonGreen/30 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">
            {language === 'ar' ? 'رابط الإحالة الخاص بك' : 'Your Referral Link'}
          </h2>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={referralLink}
              readOnly
              className="flex-1 bg-black/30 border border-white/10 rounded px-4 py-2 text-white text-sm"
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(referralLink);
                toast.success(
                  language === 'ar' ? 'تم نسخ الرابط!' : 'Link copied!'
                );
              }}
              className="bg-neonGreen text-black px-6 py-2 rounded font-semibold hover:brightness-110 transition"
            >
              {language === 'ar' ? 'نسخ' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="bg-white/5 border border-neonGreen/30 rounded-xl p-4 text-center">
            <h3 className="text-sm text-white/70">
              {language === 'ar' ? 'إجمالي الإحالات' : 'Total Referrals'}
            </h3>
            <p className="text-2xl font-bold text-neonGreen">{stats?.total_referrals || 0}</p>
          </div>
          <div className="bg-white/5 border border-neonGreen/30 rounded-xl p-4 text-center">
            <h3 className="text-sm text-white/70">
              {language === 'ar' ? 'الدقائق المكتسبة' : 'Minutes Earned'}
            </h3>
            <p className="text-2xl font-bold text-neonGreen">{stats?.total_minutes_earned || 0}</p>
          </div>
          <div className="bg-white/5 border border-neonGreen/30 rounded-xl p-4 text-center">
            <h3 className="text-sm text-white/70">
              {language === 'ar' ? 'الإحالات المؤكدة' : 'Verified Referrals'}
            </h3>
            <p className="text-2xl font-bold text-neonGreen">{stats?.verified_referrals || 0}</p>
          </div>
          <div className="bg-white/5 border border-neonGreen/30 rounded-xl p-4 text-center">
            <h3 className="text-sm text-white/70">
              {language === 'ar' ? 'الإحالات المعلقة' : 'Pending Referrals'}
            </h3>
            <p className="text-2xl font-bold text-neonGreen">{stats?.pending_referrals || 0}</p>
          </div>
        </div>

        {/* Tier Progress */}
        <div className="bg-white/5 border border-neonGreen/30 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            {language === 'ar' ? 'التقدم نحو المستوى التالي' : 'Next Tier Progress'}
          </h2>
          <div className="space-y-8">
            {['bronze', 'silver', 'gold', 'platinum'].map((tier, index) => {
              const isCurrentTier = stats?.referral_tier === tier;
              const isUnlocked = ['bronze', 'silver', 'gold', 'platinum'].indexOf(stats?.referral_tier || '') >= index;
              
              return (
                <div key={tier} className="relative">
                  <div className={`h-2 rounded-full ${isUnlocked ? getTierColor(tier) : 'bg-white/10'}`} />
                  <span className={`absolute -top-6 ${isCurrentTier ? 'text-neonGreen' : 'text-white/50'}`}>
                    {tier.charAt(0).toUpperCase() + tier.slice(1)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReferralsPage;