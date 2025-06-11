import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Pencil, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { updateUserProfile } from '../../lib/supabase/updateUserProfile';
import { updatePreferredExchange } from '../../lib/supabase/updatePreferredExchange';
import { getUserProfile, type UserProfile } from '../../lib/supabase/getUserProfile';
import { supabase } from '../../lib/supabase/client';

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
  const [retryCount, setRetryCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setError(language === 'ar' ? 'يرجى تسجيل الدخول أولاً' : 'Please login first');
          return;
        }

        const { data, error } = await getUserProfile(user.id);
        
        if (error) {
          throw error;
        }

        if (!data && retryCount < 3) {
          // If no data found, retry up to 3 times
          setRetryCount(prev => prev + 1);
          setTimeout(fetchProfile, 1000);
          return;
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

    fetchProfile();
  }, [language, retryCount]);

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const result = await updateUserProfile(user.id, {
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

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64Image = e.target?.result as string;
      setIsUpdating(true);
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const result = await updateUserProfile(user.id, {
          profile_image: base64Image
        });

        if (result.success) {
          setProfile(prev => prev ? { ...prev, profileImage: base64Image } : null);
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
    reader.readAsDataURL(file);
  };

  const handlePreferredExchange = async (exchangeId: string) => {
    if (!profile) return;
    
    setIsUpdating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const result = await updatePreferredExchange(user.id, exchangeId);
      
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#041e11] via-[#051a13] to-[#040d0c]">
        <div className="text-white">
          {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#041e11] via-[#051a13] to-[#040d0c]">
        <div className="text-red-500">
          {error}
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
                src={`https://t.me/i/userpic/320/${profile.username || 'default'}.jpg`}
                alt="profile"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y';
                }}
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-xs">
                  {language === 'ar' ? 'تغيير الصورة' : 'Change Photo'}
                </span>
              </div>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
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
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </>
            )}
          </div>

          <p className="text-sm text-white/50">@{profile.username || 'unnamed'}</p>
          <span className="inline-block mt-2 text-sm bg-neonGreen/20 text-neonGreen px-2 py-1 rounded-full">
            {language === 'ar' ? `المستوى ${profile.level}` : `Level ${profile.level}`}
          </span>
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
          <ul className="space-y-4 text-sm text-white">
            <li className="flex justify-between items-center py-2 border-b border-white/10">
              <span>{language === 'ar' ? 'النقاط' : 'Points'}</span>
              <span className="text-neonGreen font-medium">{profile.points}</span>
            </li>
            <li className="flex justify-between items-center py-2 border-b border-white/10">
              <span>{language === 'ar' ? 'الدقائق المكتسبة' : 'Minutes Earned'}</span>
              <span className="text-neonGreen font-medium">{profile.total_minutes}</span>
            </li>
            <li className="flex justify-between items-center py-2">
              <span>{language === 'ar' ? 'الإحالات' : 'Referrals'}</span>
              <span className="text-neonGreen font-medium">{profile.referral_count}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;