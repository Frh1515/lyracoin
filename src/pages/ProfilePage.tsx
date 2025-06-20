import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Pencil, Check, X, Upload, Trophy } from 'lucide-react';
import toast from 'react-hot-toast';
import { updateUserProfile } from '../../lib/supabase/updateUserProfile';
import { updatePreferredExchange } from '../../lib/supabase/updatePreferredExchange';
import { getUserProfile, type UserProfile } from '../../lib/supabase/getUserProfile';

interface Exchange {
  id: string;
  name: string;
  color: string;
  shadowColor: string;
  bgColor: string;
  logo: string;
}

const exchanges: Exchange[] = [
  {
    id: 'binance',
    name: 'Binance',
    color: 'border-yellow-400',
    shadowColor: '#F0B90B',
    bgColor: 'bg-yellow-400',
    logo: '/icons/binance.png'
  },
  {
    id: 'bybit',
    name: 'Bybit',
    color: 'border-yellow-300',
    shadowColor: '#FFD700',
    bgColor: 'bg-yellow-300',
    logo: '/icons/bybit.png'
  },
  {
    id: 'coinbase',
    name: 'Coinbase',
    color: 'border-blue-500',
    shadowColor: '#0052FF',
    bgColor: 'bg-blue-500',
    logo: '/icons/coinbase.png'
  },
  {
    id: 'kucoin',
    name: 'KuCoin',
    color: 'border-teal-400',
    shadowColor: '#26A17B',
    bgColor: 'bg-teal-400',
    logo: '/icons/kucoin.png'
  },
  {
    id: 'okx',
    name: 'OKX',
    color: 'border-gray-300',
    shadowColor: '#CCCCCC',
    bgColor: 'bg-gray-300',
    logo: '/icons/okx.png'
  }
];

const ProfilePage: React.FC = () => {
  const { language } = useLanguage();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [preferredExchange, setPreferredExchange] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data, error } = await getUserProfile();
      
      if (error) {
        throw error;
      }

      if (data) {
        setProfile(data);
        setNewUsername(data.username || '');
        setPreferredExchange(data.preferred_exchange || '');
      } else {
        setError(language === 'ar' ? 'لم يتم العثور على الملف الشخصي' : 'Profile not found');
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError(language === 'ar' ? 'فشل في تحميل الملف الشخصي' : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleNameEdit = async () => {
    if (!profile) return;
    
    if (!isEditingName) {
      setIsEditingName(true);
      return;
    }

    if (newUsername.trim() === profile.username) {
      setIsEditingName(false);
      return;
    }

    setIsUpdating(true);
    try {
      const result = await updateUserProfile({
        username: newUsername.trim()
      });

      if (result.success) {
        setProfile(prev => prev ? { ...prev, username: newUsername.trim() } : null);
        toast.success(language === 'ar' ? 'تم تحديث الاسم بنجاح' : 'Name updated successfully');
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      toast.error(language === 'ar' ? 'فشل تحديث الاسم' : 'Failed to update name');
      setNewUsername(profile.username || '');
    } finally {
      setIsUpdating(false);
      setIsEditingName(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!profile) return;
    
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error(language === 'ar' ? 'يرجى اختيار صورة صالحة' : 'Please select a valid image');
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error(language === 'ar' ? 'حجم الصورة كبير جداً (الحد الأقصى 5MB)' : 'Image size too large (max 5MB)');
      return;
    }

    setIsUpdating(true);
    
    try {
      const result = await updateUserProfile({
        profile_image: file
      });

      if (result.success && result.profile_image_url) {
        setProfile(prev => prev ? { ...prev, profile_image: result.profile_image_url! } : null);
        toast.success(
          language === 'ar' 
            ? 'تم تحديث الصورة الشخصية بنجاح' 
            : 'Profile picture updated successfully'
        );
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      toast.error(
        language === 'ar' 
          ? 'فشل تحديث الصورة الشخصية' 
          : 'Failed to update profile picture'
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePreferredExchange = async (exchangeId: string) => {
    if (!profile) return;
    
    setIsUpdating(true);
    try {
      const result = await updatePreferredExchange(exchangeId);
      
      if (result.success) {
        setPreferredExchange(exchangeId);
        toast.success(
          language === 'ar'
            ? 'تم تحديث المنصة المفضلة'
            : 'Preferred exchange updated'
        );
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      toast.error(
        language === 'ar'
          ? 'فشل تحديث المنصة المفضلة'
          : 'Failed to update preferred exchange'
      );
    } finally {
      setIsUpdating(false);
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

  // Calculate level progress percentage (matching HomePage and ReferralsPage)
  const getLevelProgress = (points: number) => {
    if (points >= 1001) return 100; // Platinum
    if (points >= 501) return Math.min(((points - 501) / 500) * 100 + 75, 100); // Gold range
    if (points >= 201) return Math.min(((points - 201) / 300) * 100 + 50, 75); // Silver range
    return Math.min((points / 200) * 50, 50); // Bronze range
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#041e11] via-[#051a13] to-[#040d0c]">
        <div className="text-white animate-pulse">
          {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#041e11] via-[#051a13] to-[#040d0c]">
        <div className="text-center">
          <div className="text-red-500 mb-4">{error}</div>
          <button
            onClick={fetchProfile}
            className="bg-neonGreen text-black px-4 py-2 rounded-lg font-medium hover:brightness-110 transition"
          >
            {language === 'ar' ? 'إعادة المحاولة' : 'Retry'}
          </button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#041e11] via-[#051a13] to-[#040d0c]">
        <div className="text-white">
          {language === 'ar' ? 'لم يتم العثور على الملف الشخصي' : 'Profile not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 bg-gradient-to-b from-[#041e11] via-[#051a13] to-[#040d0c] px-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Profile Info */}
        <div className="bg-black/40 backdrop-blur-sm p-6 rounded-xl mb-8 text-white text-center border border-neonGreen/30 shadow-[0_0_15px_rgba(0,255,136,0.3)]">
          <div 
            className="relative w-20 h-20 mx-auto mb-3 group cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="absolute inset-0 rounded-full overflow-hidden border-2 border-neonGreen shadow-[0_0_15px_rgba(0,255,136,0.3)]">
              <img
                src={profile.profile_image || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.username || 'User')}&background=00ff88&color=000&size=80`}
                alt="profile"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.username || 'User')}&background=00ff88&color=000&size=80`;
                }}
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Upload className="w-5 h-5" />
              </div>
            </div>
            {isUpdating && (
              <div className="absolute inset-0 rounded-full bg-black/70 flex items-center justify-center">
                <div className="animate-pulse text-xs">
                  {language === 'ar' ? 'جاري التحديث...' : 'Updating...'}
                </div>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
            disabled={isUpdating}
          />

          <div className="flex items-center justify-center gap-2">
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="bg-black/30 border border-neonGreen/30 rounded px-2 py-1 text-white text-center"
                  disabled={isUpdating}
                />
                <button
                  onClick={handleNameEdit}
                  disabled={isUpdating}
                  className="text-neonGreen hover:text-white transition"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setNewUsername(profile.username || '');
                    setIsEditingName(false);
                  }}
                  disabled={isUpdating}
                  className="text-red-500 hover:text-red-400 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-semibold">{profile.username || 'Unnamed User'}</h2>
                <button
                  onClick={() => setIsEditingName(true)}
                  className="text-white/50 hover:text-white transition"
                  disabled={isUpdating}
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </>
            )}
          </div>

          <p className="text-sm text-white/50">@{profile.username || 'unnamed'}</p>
          <div className="flex items-center justify-center gap-4 mt-2">
            <span className="inline-block text-sm bg-neonGreen/20 text-neonGreen px-2 py-1 rounded-full">
              {language === 'ar' ? `المستوى ${profile.level}` : `Level ${profile.level}`}
            </span>
            <span className={`inline-block text-sm px-2 py-1 rounded-full ${getLevelColor(profile.membership_level)} bg-opacity-20`}>
              {getLevelIcon(profile.membership_level)} {profile.membership_level.charAt(0).toUpperCase() + profile.membership_level.slice(1)}
            </span>
          </div>
        </div>

        {/* Level Progress Card - Matching other pages */}
        <div className="bg-black/40 backdrop-blur-sm border border-neonGreen/30 rounded-xl p-6 mb-8 text-white shadow-[0_0_15px_rgba(0,255,136,0.3)]">
          <div className="flex items-center gap-3 mb-4">
            <Trophy className="w-6 h-6 text-neonGreen" />
            <h2 className="text-lg font-semibold">
              {language === 'ar' ? 'تقدم المستوى' : 'Level Progress'}
            </h2>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-neonGreen">
                {profile.points} <span className="text-sm text-white/60">= ? Soon</span>
              </div>
              <p className="text-sm text-white/60">
                {language === 'ar' ? 'النقاط' : 'Points'}
              </p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-neonGreen">
                {profile.total_minutes} <span className="text-sm text-white/60">= ? Soon</span>
              </div>
              <p className="text-sm text-white/60">
                {language === 'ar' ? 'الدقائق' : 'Minutes'}
              </p>
            </div>
          </div>

          {/* Level Progress - Matching HomePage */}
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
                  width: `${getLevelProgress(profile.points)}%` 
                }}
              />
            </div>
          </div>

          <div className="mt-4 p-3 bg-neonGreen/10 border border-neonGreen/30 rounded-lg">
            <p className="text-center text-neonGreen font-bold text-sm">
              {language === 'ar' 
                ? `${profile.points} نقطة من أصل ${profile.membership_level === 'platinum' ? '1001+' : profile.membership_level === 'gold' ? '1001' : profile.membership_level === 'silver' ? '501' : '201'} للمستوى التالي`
                : `${profile.points} points of ${profile.membership_level === 'platinum' ? '1001+' : profile.membership_level === 'gold' ? '1001' : profile.membership_level === 'silver' ? '501' : '201'} for next level`}
            </p>
          </div>
        </div>

        {/* LYRA Balance */}
        <div className="bg-black/40 backdrop-blur-sm border border-neonGreen/30 rounded-xl p-6 mb-8 text-white shadow-[0_0_15px_rgba(0,255,136,0.3)]">
          <h2 className="text-lg font-semibold mb-4">
            {language === 'ar' ? 'رصيد LYRA COIN' : 'LYRA COIN Balance'}
          </h2>
          <div className="text-center">
            <div className="text-3xl font-bold text-neonGreen mb-2">
              {profile.lyra_balance.toLocaleString()} <span className="text-sm text-white/60">= ? Soon</span>
            </div>
            <p className="text-sm text-white/60">
              {language === 'ar' ? 'عملة LYRA' : 'LYRA Coins'}
            </p>
          </div>
        </div>

        {/* Exchange Cards */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white mb-6">
            {language === 'ar' ? 'منصات التداول' : 'Trading Platforms'}
          </h2>
          
          <div className="grid gap-4">
            {exchanges.map((exchange) => (
              <div
                key={exchange.id}
                className={`
                  p-6 bg-black/40 backdrop-blur-sm border rounded-xl text-white
                  transition-all duration-300 ease-in-out
                  ${exchange.color}
                  ${preferredExchange === exchange.id ? 'scale-[1.02]' : 'hover:scale-[1.02]'}
                  ${preferredExchange === exchange.id 
                    ? `shadow-[0_0_30px_${exchange.shadowColor}]` 
                    : `shadow-[0_0_15px_${exchange.shadowColor}] hover:shadow-[0_0_25px_${exchange.shadowColor}]`
                  }
                  ${preferredExchange && preferredExchange !== exchange.id ? 'opacity-75' : ''}
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 flex items-center justify-center rounded-full bg-black/30 ${preferredExchange === exchange.id ? 'animate-pulse' : ''}`}>
                      <img
                        src={exchange.logo}
                        alt={`${exchange.name} logo`}
                        className="w-12 h-12 object-contain"
                      />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{exchange.name}</h3>
                      <p className="text-sm text-gray-400">
                        {language === 'ar' ? 'منصة تداول' : 'Trading Platform'}
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handlePreferredExchange(exchange.id)}
                    disabled={isUpdating}
                    className={`
                      px-4 py-2 rounded-lg font-medium transition-all duration-300
                      ${preferredExchange === exchange.id
                        ? `border ${exchange.color} text-white hover:bg-white/10`
                        : `${exchange.bgColor} text-black hover:brightness-110`
                      }
                      ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}
                      hover:scale-105
                    `}
                  >
                    {preferredExchange === exchange.id
                      ? (language === 'ar' ? '⭐ المفضلة' : '⭐ Preferred')
                      : (language === 'ar' ? 'تعيين كمفضلة' : 'Set as Preferred')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="mt-8 bg-black/40 backdrop-blur-sm border border-neonGreen/30 rounded-xl p-6 shadow-[0_0_15px_rgba(0,255,136,0.3)]">
          <h2 className="text-lg font-semibold text-white mb-4">
            {language === 'ar' ? 'الإحصائيات' : 'Statistics'}
          </h2>
          <ul className="space-y-4 text-sm text-white">
            <li className="flex justify-between items-center py-2 border-b border-white/10">
              <span>{language === 'ar' ? 'النقاط' : 'Points'}</span>
              <span className="text-neonGreen font-medium">{profile.points.toLocaleString()}</span>
            </li>
            <li className="flex justify-between items-center py-2 border-b border-white/10">
              <span>{language === 'ar' ? 'الدقائق المكتسبة' : 'Minutes Earned'}</span>
              <span className="text-neonGreen font-medium">{profile.total_minutes.toLocaleString()}</span>
            </li>
            <li className="flex justify-between items-center py-2 border-b border-white/10">
              <span>{language === 'ar' ? 'الإحالات' : 'Referrals'}</span>
              <span className="text-neonGreen font-medium">{profile.referral_count}</span>
            </li>
            <li className="flex justify-between items-center py-2">
              <span>{language === 'ar' ? 'مستوى الإحالة' : 'Referral Tier'}</span>
              <span className="text-neonGreen font-medium capitalize">{profile.referral_tier}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;