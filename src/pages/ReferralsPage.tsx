import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { getReferralStatsSecure, type ReferralStatsSecure } from '../../lib/supabase/getReferralStatsSecure';
import { claimReferralRewardSecure } from '../../lib/supabase/claimReferralRewardSecure';
import { generateReferralCode } from '../../lib/supabase/generateReferralCode';
import { reactivateReferralRewards, checkReferralRewardsStatus } from '../../lib/supabase/reactivateReferralRewards';
import { Share2, X, Gift, Copy, ExternalLink, Trophy, RefreshCw, CheckCircle, User, Calendar, Award } from 'lucide-react';
import toast from 'react-hot-toast';

interface ReferralPageProps {
  onMinutesEarned?: (minutes: number) => void;
  onPointsEarned?: (points: number) => void;
}

const ReferralsPage: React.FC<ReferralPageProps> = ({ onMinutesEarned, onPointsEarned }) => {
  const [stats, setStats] = useState<ReferralStatsSecure | null>(null);
  const [loading, setLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [claimingReward, setClaimingReward] = useState<string | null>(null);
  const [referralLink, setReferralLink] = useState<string>('');
  const [loadingReferralLink, setLoadingReferralLink] = useState(true);
  const [isReactivating, setIsReactivating] = useState(false);
  const [showReactivateButton, setShowReactivateButton] = useState(false);
  const { language } = useLanguage();

  useEffect(() => {
    fetchStats();
    fetchReferralLink();
    checkReactivationNeeded();
  }, []);

  const checkReactivationNeeded = async () => {
    try {
      const result = await checkReferralRewardsStatus();
      if (result.success && result.data) {
        // Show reactivate button if there are verified referrals that might need rewards
        setShowReactivateButton(result.data.verified_referrals > 0);
      }
    } catch (error) {
      console.error('Error checking reactivation status:', error);
    }
  };

  const fetchStats = async () => {
    try {
      setLoading(true);
      console.log('🔄 Fetching referral stats...');
      
      const { data, error } = await getReferralStatsSecure();
      
      if (error) {
        console.error('❌ Error fetching stats:', error);
        toast.error(
          language === 'ar' 
            ? `فشل تحميل الإحصائيات: ${error.message}` 
            : `Failed to load statistics: ${error.message}`
        );
      } else if (data) {
        console.log('✅ Stats loaded successfully:', data);
        setStats(data);
      } else {
        console.warn('⚠️ No stats data returned');
        toast.warning(
          language === 'ar' 
            ? 'لا توجد بيانات إحصائية' 
            : 'No statistics data available'
        );
      }
    } catch (error) {
      console.error('❌ Unexpected error fetching stats:', error);
      toast.error(
        language === 'ar' 
          ? 'حدث خطأ غير متوقع' 
          : 'An unexpected error occurred'
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchReferralLink = async () => {
    try {
      setLoadingReferralLink(true);
      const { success, referralCode: code, referralLink: link, error } = await generateReferralCode();
      
      if (success && link) {
        console.log('✅ Generated referral link:', link);
        setReferralLink(link);
      } else {
        console.error('Error generating referral link:', error);
        toast.error(
          language === 'ar' 
            ? 'فشل في إنشاء رابط الإحالة' 
            : 'Failed to generate referral link'
        );
      }
    } catch (error) {
      console.error('Error fetching referral link:', error);
    } finally {
      setLoadingReferralLink(false);
    }
  };

  const handleReactivateRewards = async () => {
    setIsReactivating(true);
    try {
      const result = await reactivateReferralRewards();
      
      if (result.success) {
        toast.success(
          language === 'ar'
            ? `🎉 تم تفعيل نظام المكافآت! تمت معالجة ${result.users_processed} مستخدم ومنح ${result.total_points_awarded} نقطة`
            : `🎉 Rewards system activated! Processed ${result.users_processed} users and awarded ${result.total_points_awarded} points`,
          { 
            duration: 5000,
            style: {
              background: '#00FFAA',
              color: '#000',
              fontWeight: 'bold'
            }
          }
        );
        
        // Refresh stats after reactivation
        await fetchStats();
        setShowReactivateButton(false);
      } else {
        toast.error(
          language === 'ar'
            ? `فشل تفعيل النظام: ${result.message}`
            : `Failed to activate system: ${result.message}`
        );
      }
    } catch (error) {
      console.error('Error reactivating rewards:', error);
      toast.error(
        language === 'ar' 
          ? 'حدث خطأ أثناء تفعيل النظام'
          : 'Error activating rewards system'
      );
    } finally {
      setIsReactivating(false);
    }
  };

  const handleClaim = async (referralId: string) => {
    try {
      setClaimingReward(referralId);
      
      console.log('🔄 Claiming referral reward for ID:', referralId);
      
      const result = await claimReferralRewardSecure(referralId);
      
      console.log('📊 Claim result:', result);
      
      if (result.success) {
        toast.success(
          language === 'ar'
            ? `🎉 تم إضافة ${result.minutesEarned} دقيقة إلى رصيدك!`
            : `🎉 +${result.minutesEarned} minutes added to your balance!`,
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
        if (onMinutesEarned && result.minutesEarned) {
          onMinutesEarned(result.minutesEarned);
        }
        
        // Refresh data
        fetchStats();
      } else {
        console.error('❌ Error claiming reward:', result.message);
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error claiming reward:', error);
      toast.error(language === 'ar' ? 'فشل المطالبة بالمكافأة' : 'Failed to claim reward');
    } finally {
      setClaimingReward(null);
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

  const getLevelIcon = (tier: string) => {
    switch (tier) {
      case 'platinum': return '💎';
      case 'gold': return '🥇';
      case 'silver': return '🥈';
      default: return '🥉';
    }
  };

  // Calculate level progress percentage (matching HomePage)
  const getLevelProgress = (totalReferrals: number) => {
    if (totalReferrals >= 50) return 100; // Platinum
    if (totalReferrals >= 25) return Math.min(((totalReferrals - 25) / 25) * 100 + 75, 100); // Gold range
    if (totalReferrals >= 10) return Math.min(((totalReferrals - 10) / 15) * 100 + 50, 75); // Silver range
    return Math.min((totalReferrals / 10) * 50, 50); // Bronze range
  };

  const shareMessage = language === 'ar'
    ? `🚀 انضم إلى LYRA COIN وساعدني في كسب المكافآت!\n💰 ستحصل على مكافآت عند التسجيل وأنا أيضاً!\n🔗 ${referralLink}`
    : `🚀 Join LYRA COIN and help me earn rewards!\n💰 You'll get rewards for signing up and so will I!\n🔗 ${referralLink}`;

  const copyToClipboard = (text: string, successMessage: string) => {
    navigator.clipboard.writeText(text);
    toast.success(successMessage);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'text-green-400 bg-green-400/20';
      case 'pending': return 'text-yellow-400 bg-yellow-400/20';
      case 'rejected': return 'text-red-400 bg-red-400/20';
      default: return 'text-gray-400 bg-gray-400/20';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'verified': return language === 'ar' ? 'مؤكدة' : 'Verified';
      case 'pending': return language === 'ar' ? 'معلقة' : 'Pending';
      case 'rejected': return language === 'ar' ? 'مرفوضة' : 'Rejected';
      default: return status;
    }
  };

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
          {language === 'ar' ? 'مشاركة رابط الإحالة' : 'Share Referral Link'}
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
              <ExternalLink className="w-4 h-4" />
              Telegram
            </a>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(shareMessage)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-[#25D366] text-white py-3 px-4 rounded-lg font-medium hover:brightness-110 transition"
            >
              <ExternalLink className="w-4 h-4" />
              WhatsApp
            </a>
          </div>

          <button
            onClick={() => copyToClipboard(shareMessage, language === 'ar' ? 'تم نسخ الرسالة!' : 'Message copied!')}
            className="w-full bg-white/10 text-white py-3 rounded-lg font-medium hover:bg-white/20 transition flex items-center justify-center gap-2"
          >
            <Copy className="w-4 h-4" />
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

        {/* Reactivate Rewards Button */}
        {showReactivateButton && (
          <div className="bg-yellow-400/20 border border-yellow-400/30 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <RefreshCw className="w-5 h-5 text-yellow-400" />
              <h3 className="text-lg font-semibold text-yellow-400">
                {language === 'ar' ? 'تفعيل نظام المكافآت' : 'Activate Rewards System'}
              </h3>
            </div>
            <p className="text-white/80 text-sm mb-4">
              {language === 'ar' 
                ? 'يبدو أن لديك إحالات لم تحصل على مكافآتها بعد. اضغط لتفعيل النظام وحساب المكافآت المستحقة.'
                : 'It looks like you have referrals that haven\'t received their rewards yet. Click to activate the system and calculate due rewards.'
              }
            </p>
            <button
              onClick={handleReactivateRewards}
              disabled={isReactivating}
              className="w-full bg-yellow-400 text-black py-3 rounded-lg font-semibold hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isReactivating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  {language === 'ar' ? 'جاري التفعيل...' : 'Activating...'}
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  {language === 'ar' ? 'تفعيل نظام المكافآت' : 'Activate Rewards System'}
                </>
              )}
            </button>
          </div>
        )}

        {/* Tier Badge with Progress */}
        {stats && (
          <div className="bg-black/40 backdrop-blur-sm border border-neonGreen/30 rounded-xl p-6 text-white shadow-[0_0_15px_rgba(0,255,136,0.3)] mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Trophy className="w-6 h-6 text-neonGreen" />
                <h2 className="text-xl font-semibold">
                  {language === 'ar' ? 'مستوى الإحالة' : 'Referral Level'}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{getLevelIcon(stats.referral_tier)}</span>
                <span className={`text-lg font-bold capitalize`}>
                  {stats.referral_tier}
                </span>
              </div>
            </div>

            {/* Level Progress - Matching HomePage */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-white/60 mb-1">
                <span>Bronze (0-9)</span>
                <span>Silver (10-24)</span>
                <span>Gold (25-49)</span>
                <span>Platinum (50+)</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2">
                <div 
                  className="bg-neonGreen h-2 rounded-full transition-all duration-500"
                  style={{ 
                    width: `${getLevelProgress(stats.total_referrals)}%` 
                  }}
                />
              </div>
            </div>

            <div className="mt-4 p-3 bg-neonGreen/10 border border-neonGreen/30 rounded-lg">
              <p className="text-center text-neonGreen font-bold text-sm">
                {language === 'ar' 
                  ? `${stats.total_referrals} إحالة من أصل ${stats.referral_tier === 'platinum' ? '50+' : stats.referral_tier === 'gold' ? '50' : stats.referral_tier === 'silver' ? '25' : '10'} للمستوى التالي`
                  : `${stats.total_referrals} referrals of ${stats.referral_tier === 'platinum' ? '50+' : stats.referral_tier === 'gold' ? '50' : stats.referral_tier === 'silver' ? '25' : '10'} for next level`}
              </p>
            </div>
          </div>
        )}

        {/* Unclaimed Rewards Section */}
        {stats && stats.unclaimed_referrals && stats.unclaimed_referrals.length > 0 && (
          <div className="bg-white/5 border border-neonGreen/30 rounded-xl p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Gift className="w-6 h-6 text-neonGreen" />
              <h2 className="text-lg font-semibold text-white">
                {language === 'ar' ? 'مكافآت غير مطالب بها' : 'Unclaimed Rewards'}
              </h2>
            </div>
            
            <div className="space-y-3">
              {stats.unclaimed_referrals.map((referral) => (
                <div key={referral.id} className="bg-black/30 rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">
                      {language === 'ar' ? 'إحالة مؤكدة' : 'Verified Referral'}
                    </p>
                    <p className="text-white/60 text-sm">
                      {language === 'ar' ? 'المكافأة: 60 دقيقة' : 'Reward: 60 minutes'}
                    </p>
                    <p className="text-white/40 text-xs">
                      {formatDate(referral.created_at)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleClaim(referral.id)}
                    disabled={claimingReward === referral.id}
                    className="bg-neonGreen text-black px-4 py-2 rounded-lg font-medium hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {claimingReward === referral.id
                      ? (language === 'ar' ? 'جاري المطالبة...' : 'Claiming...')
                      : (language === 'ar' ? 'مطالبة' : 'Claim')
                    }
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Referrals History */}
        {stats && stats.all_referrals && stats.all_referrals.length > 0 && (
          <div className="bg-white/5 border border-neonGreen/30 rounded-xl p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <User className="w-6 h-6 text-neonGreen" />
              <h2 className="text-lg font-semibold text-white">
                {language === 'ar' ? 'سجل الإحالات' : 'Referral History'}
              </h2>
            </div>
            
            <div className="space-y-3">
              {stats.all_referrals.map((referral) => (
                <div key={referral.id} className="bg-black/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-neonGreen/20 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-neonGreen" />
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">
                          {referral.referred_username}
                        </p>
                        <p className="text-white/40 text-xs">
                          ID: {referral.referred_id}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(referral.status)}`}>
                        {getStatusText(referral.status)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-white/60">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(referral.created_at)}
                    </div>
                    <div className="flex items-center gap-4">
                      {referral.points_awarded > 0 && (
                        <div className="flex items-center gap-1">
                          <Award className="w-3 h-3 text-yellow-400" />
                          <span className="text-yellow-400">+{referral.points_awarded} نقاط</span>
                        </div>
                      )}
                      {referral.minutes_available > 0 && (
                        <div className="flex items-center gap-1">
                          <Gift className="w-3 h-3 text-neonGreen" />
                          <span className="text-neonGreen">
                            {referral.reward_claimed 
                              ? (language === 'ar' ? 'تم الاستلام' : 'Claimed')
                              : `+${referral.minutes_available} ${language === 'ar' ? 'دقيقة' : 'min'}`
                            }
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Referral Link */}
        <div className="bg-white/5 border border-neonGreen/30 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">
            {language === 'ar' ? 'رابط الإحالة الخاص بك' : 'Your Referral Link'}
          </h2>
          {loadingReferralLink ? (
            <div className="animate-pulse bg-black/30 h-10 rounded"></div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={referralLink}
                readOnly
                className="flex-1 bg-black/30 border border-white/10 rounded px-4 py-2 text-white text-sm"
              />
              <button
                onClick={() => copyToClipboard(referralLink, language === 'ar' ? 'تم نسخ الرابط!' : 'Link copied!')}
                className="bg-neonGreen text-black px-6 py-2 rounded font-semibold hover:brightness-110 transition flex items-center justify-center gap-2"
              >
                <Copy className="w-4 h-4" />
                {language === 'ar' ? 'نسخ' : 'Copy'}
              </button>
            </div>
          )}
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
            <div className="flex items-center justify-center gap-2">
              <p className="text-2xl font-bold text-neonGreen">{stats?.total_minutes_earned || 0}</p>
              <span className="px-2 py-0.5 bg-yellow-400/20 text-yellow-400 text-xs rounded-full border border-yellow-400/30">
                {language === 'ar' ? 'قريباً =' : '= Soon'}
              </span>
            </div>
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

        {/* How it Works */}
        <div className="bg-white/5 border border-neonGreen/30 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            {language === 'ar' ? 'كيف يعمل النظام' : 'How It Works'}
          </h2>
          <div className="space-y-3 text-sm text-white/80">
            <div className="flex items-start gap-3">
              <span className="text-neonGreen font-bold">1.</span>
              <p>
                {language === 'ar' 
                  ? 'شارك رابط الإحالة الخاص بك مع الأصدقاء'
                  : 'Share your unique referral link with friends'
                }
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-neonGreen font-bold">2.</span>
              <p>
                {language === 'ar' 
                  ? 'عندما ينضم صديق باستخدام رابطك، تحصل على 30 نقطة فوراً'
                  : 'When a friend joins using your link, you get 30 points instantly'
                }
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-neonGreen font-bold">3.</span>
              <p>
                {language === 'ar' 
                  ? 'اضغط على "مطالبة" لكسب 60 دقيقة إضافية لكل إحالة مؤكدة'
                  : 'Click "Claim" to earn 60 additional minutes for each verified referral'
                }
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-neonGreen font-bold">4.</span>
              <p>
                {language === 'ar' 
                  ? 'كلما زادت إحالاتك، ارتقيت في المستويات وحصلت على مكافآت أكبر'
                  : 'The more referrals you get, the higher your tier and bigger rewards'
                }
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-yellow-400 font-bold">💡</span>
              <p className="text-yellow-400">
                {language === 'ar' 
                  ? 'جديد: النظام الآن يمنح المكافآت تلقائياً! 30 نقطة فورية + 60 دقيقة عند المطالبة'
                  : 'New: System now awards rewards automatically! 30 instant points + 60 minutes when claimed'
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReferralsPage;