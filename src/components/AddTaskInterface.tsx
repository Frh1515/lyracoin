import React, { useState } from 'react';
import { Check, X, Globe, Users, DollarSign, Link, AlertCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { createPaidTask, type PaidTaskData } from '../../lib/supabase/paidTasksSystem';
import PaymentVerificationModal from './PaymentVerificationModal';
import toast from 'react-hot-toast';

interface AddTaskInterfaceProps {
  isVisible: boolean;
  onClose: () => void;
  userLyraBalance: number;
  onTaskCreated: () => void;
}

interface TaskData {
  link: string;
  clicks: number;
  community: string;
  isLinkValid: boolean;
  isLinkChecked: boolean;
}

const AddTaskInterface: React.FC<AddTaskInterfaceProps> = ({
  isVisible,
  onClose,
  userLyraBalance,
  onTaskCreated
}) => {
  const { language } = useLanguage();
  const [taskData, setTaskData] = useState<TaskData>({
    link: '',
    clicks: 500,
    community: '',
    isLinkValid: false,
    isLinkChecked: false
  });
  const [isCreating, setIsCreating] = useState(false);
  const [showInsufficientBalance, setShowInsufficientBalance] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentData, setPaymentData] = useState<{
    paymentId: string;
    paymentMethod: 'lyra' | 'ton';
    amount: number;
    currency: string;
  } | null>(null);

  const clickOptions = [500, 1000, 2000, 5000, 10000];
  const communities = [
    { code: 'AR', name: language === 'ar' ? 'عربي' : 'Arabic', flag: '🇸🇦' },
    { code: 'EN', name: language === 'ar' ? 'إنجليزي' : 'English', flag: '🇺🇸' },
    { code: 'RU', name: language === 'ar' ? 'روسي' : 'Russian', flag: '🇷🇺' },
    { code: 'FR', name: language === 'ar' ? 'فرنسي' : 'French', flag: '🇫🇷' },
    { code: 'FA', name: language === 'ar' ? 'فارسي' : 'Persian', flag: '🇮🇷' },
    { code: 'ID', name: language === 'ar' ? 'إندونيسي' : 'Indonesian', flag: '🇮🇩' },
    { code: 'ES', name: language === 'ar' ? 'إسباني' : 'Spanish', flag: '🇪🇸' },
    { code: 'UZ', name: language === 'ar' ? 'أوزبكي' : 'Uzbek', flag: '🇺🇿' }
  ];

  if (!isVisible) return null;

  const validateLink = () => {
    if (!taskData.link.trim()) {
      toast.error(
        language === 'ar' ? '❌ يرجى إدخال رابط أولاً' : '❌ Please enter a link first'
      );
      return;
    }

    const isValid = taskData.link.startsWith('https://') && taskData.link.length > 12;
    setTaskData(prev => ({ ...prev, isLinkValid: isValid, isLinkChecked: true }));
    
    if (isValid) {
      toast.success(
        language === 'ar' ? '✅ الرابط صحيح ومُفعّل!' : '✅ Link is valid and activated!',
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
      toast.error(
        language === 'ar' ? '❌ الرابط يجب أن يبدأ بـ https:// ويكون صحيحاً' : '❌ Link must start with https:// and be valid',
        { 
          duration: 3000,
          style: {
            background: '#FF6347',
            color: '#fff'
          }
        }
      );
    }
  };

  const calculatePrice = () => {
    // Base price: 500 clicks = 100 LYRA
    const basePrice = (taskData.clicks / 500) * 100;
    // Double price if community is selected
    const finalPrice = taskData.community ? basePrice * 2 : basePrice;
    return finalPrice;
  };

  const canCreateTask = () => {
    return taskData.isLinkValid && taskData.isLinkChecked && taskData.clicks > 0 && taskData.community !== '';
  };

  const handleCreateTask = async () => {
    if (!canCreateTask()) {
      let missingFields = [];
      if (!taskData.isLinkChecked || !taskData.isLinkValid) {
        missingFields.push(language === 'ar' ? 'التحقق من الرابط' : 'Link verification');
      }
      if (!taskData.community) {
        missingFields.push(language === 'ar' ? 'اختيار الجمهور' : 'Community selection');
      }
      
      toast.error(
        language === 'ar' 
          ? `يرجى إكمال: ${missingFields.join(' و ')}`
          : `Please complete: ${missingFields.join(' and ')}`
      );
      return;
    }

    const totalPrice = calculatePrice();
    
    // للدفع بـ LYRA، التحقق من الرصيد
    if (totalPrice > userLyraBalance) {
      setShowInsufficientBalance(true);
      toast.error(
        language === 'ar' 
          ? 'الرصيد غير كافٍ، الرجاء شحن المحفظة'
          : 'Insufficient balance, please charge your wallet',
        { 
          duration: 5000,
          style: {
            background: '#FF6347',
            color: '#fff',
            fontWeight: 'bold'
          }
        }
      );
      return;
    }

    setIsCreating(true);
    
    try {
      const taskPayload: PaidTaskData = {
        title: getPlatformTitle(taskData.link),
        description: getTaskDescription(taskData.link, taskData.clicks, taskData.community),
        link: taskData.link,
        platform: getPlatformFromLink(taskData.link),
        totalClicks: taskData.clicks,
        targetCommunity: taskData.community,
        price: totalPrice,
        paymentMethod: 'lyra' // افتراضياً LYRA، يمكن إضافة خيار للمستخدم لاحقاً
      };

      const result = await createPaidTask(taskPayload);
      
      if (result.success) {
        // إظهار نافذة التحقق من الدفع
        setPaymentData({
          paymentId: result.paymentId!,
          paymentMethod: 'lyra',
          amount: totalPrice,
          currency: 'LYRA'
        });
        setShowPaymentModal(true);
      } else {
        throw new Error(result.message);
      }
      
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error(
        language === 'ar' 
          ? `فشل في إنشاء المهمة: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`
          : `Failed to create task: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setIsCreating(false);
      setShowInsufficientBalance(false);
    }
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    setPaymentData(null);
    
    toast.success(
      language === 'ar'
        ? '🎉 تم إنشاء المهمة ونشرها بنجاح!'
        : '🎉 Task created and published successfully!',
      { 
        duration: 5000,
        style: {
          background: '#00FFAA',
          color: '#000',
          fontWeight: 'bold'
        }
      }
    );
    
    // Reset form
    setTaskData({
      link: '',
      clicks: 500,
      community: '',
      isLinkValid: false,
      isLinkChecked: false
    });
    
    onTaskCreated();
    onClose();
  };

  // Helper functions
  const getPlatformFromLink = (link: string): string => {
    const domain = link.toLowerCase();
    if (domain.includes('facebook.com')) return 'facebook';
    if (domain.includes('instagram.com')) return 'instagram';
    if (domain.includes('twitter.com') || domain.includes('x.com')) return 'twitter';
    if (domain.includes('tiktok.com')) return 'tiktok';
    if (domain.includes('youtube.com')) return 'youtube';
    if (domain.includes('telegram.org') || domain.includes('t.me')) return 'telegram';
    return 'website';
  };

  const getPlatformTitle = (link: string): string => {
    const platform = getPlatformFromLink(link);
    const titles: { [key: string]: string } = {
      facebook: 'Facebook Task',
      instagram: 'Instagram Task',
      twitter: 'Twitter Task',
      tiktok: 'TikTok Task',
      youtube: 'YouTube Task',
      telegram: 'Telegram Task',
      website: 'Website Task'
    };
    return titles[platform] || 'Custom Task';
  };

  const getTaskDescription = (link: string, clicks: number, community: string): string => {
    const platform = getPlatformFromLink(link);
    return `${platform.charAt(0).toUpperCase() + platform.slice(1)} engagement task for ${community} community - ${clicks} clicks required`;
  };

  return (
    <div className="bg-black/40 backdrop-blur-sm border border-neonGreen/30 rounded-xl p-6 mt-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <DollarSign className="w-6 h-6 text-neonGreen" />
          {language === 'ar' ? 'إنشاء مهمة جديدة' : 'Create New Task'}
        </h3>
        <button
          onClick={onClose}
          className="text-white/60 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-6">
        {/* Link Input */}
        <div>
          <label className="block text-white/70 text-sm font-medium mb-2">
            {language === 'ar' ? 'رابط المهمة *' : 'Task Link *'}
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Link className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="url"
                value={taskData.link}
                onChange={(e) => setTaskData(prev => ({ 
                  ...prev, 
                  link: e.target.value, 
                  isLinkValid: false, 
                  isLinkChecked: false 
                }))}
                className="w-full bg-black/30 border border-white/20 rounded-lg pl-10 pr-4 py-3 text-white focus:border-neonGreen focus:outline-none transition"
                placeholder="https://your-link.com"
                onPaste={(e) => {
                  // Allow paste functionality
                  setTimeout(() => {
                    const pastedValue = e.currentTarget.value;
                    setTaskData(prev => ({ 
                      ...prev, 
                      link: pastedValue, 
                      isLinkValid: false, 
                      isLinkChecked: false 
                    }));
                  }, 0);
                }}
              />
            </div>
            
            {/* Check Button */}
            <button
              onClick={validateLink}
              disabled={!taskData.link}
              className={`w-12 h-12 rounded-lg transition flex items-center justify-center ${
                taskData.isLinkValid 
                  ? 'bg-green-500 text-white' 
                  : 'bg-neonGreen text-black hover:brightness-110'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              title={language === 'ar' ? 'التحقق من الرابط' : 'Verify link'}
            >
              <Check className="w-5 h-5" />
            </button>
            
            {/* Clear Button */}
            <button
              onClick={() => setTaskData(prev => ({ 
                ...prev, 
                link: '', 
                isLinkValid: false, 
                isLinkChecked: false 
              }))}
              className="w-12 h-12 bg-red-500 text-white rounded-lg hover:brightness-110 transition flex items-center justify-center"
              title={language === 'ar' ? 'مسح الرابط' : 'Clear link'}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Link Status */}
          {taskData.isLinkValid && (
            <p className="text-neonGreen text-xs mt-1 flex items-center gap-1">
              <Check className="w-3 h-3" />
              {language === 'ar' ? 'الرابط صحيح ومُفعّل' : 'Link verified and activated'}
            </p>
          )}
          {taskData.isLinkChecked && !taskData.isLinkValid && (
            <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
              <X className="w-3 h-3" />
              {language === 'ar' ? 'الرابط غير صحيح' : 'Link is invalid'}
            </p>
          )}
        </div>

        {/* Clicks Selection */}
        <div>
          <label className="block text-white/70 text-sm font-medium mb-2">
            {language === 'ar' ? 'عدد الكليكات المطلوبة *' : 'Required Clicks *'}
          </label>
          <select
            value={taskData.clicks}
            onChange={(e) => setTaskData(prev => ({ ...prev, clicks: Number(e.target.value) }))}
            className="w-full bg-black/30 border border-white/20 rounded-lg px-4 py-3 text-white focus:border-neonGreen focus:outline-none transition"
          >
            {clickOptions.map(option => (
              <option key={option} value={option} className="bg-black text-white">
                {option.toLocaleString()} {language === 'ar' ? 'كليكة' : 'clicks'}
              </option>
            ))}
          </select>
        </div>

        {/* Community Selection */}
        <div>
          <label className="block text-white/70 text-sm font-medium mb-2">
            <span className="text-red-400">*</span> {language === 'ar' ? 'الجمهور المستهدف (إلزامي)' : 'Target Community (Required)'}
          </label>
          <select
            value={taskData.community}
            onChange={(e) => setTaskData(prev => ({ ...prev, community: e.target.value }))}
            className="w-full bg-black/30 border border-white/20 rounded-lg px-4 py-3 text-white focus:border-neonGreen focus:outline-none transition"
            required
          >
            <option value="" className="bg-black text-white">
              {language === 'ar' ? 'اختر الجمهور...' : 'Select community...'}
            </option>
            {communities.map(community => (
              <option key={community.code} value={community.code} className="bg-black text-white">
                {community.flag} {community.name} ({community.code})
              </option>
            ))}
          </select>
          <p className="text-white/50 text-xs mt-1">
            {language === 'ar' 
              ? 'اختيار الجمهور يضاعف السعر ×2 لضمان الاستهداف الدقيق'
              : 'Community selection doubles the price ×2 for precise targeting'
            }
          </p>
        </div>

        {/* Price Display */}
        <div className="bg-neonGreen/10 border border-neonGreen/30 rounded-lg p-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-neonGreen" />
              <span className="text-white/70 text-sm">
                {language === 'ar' ? 'السعر النهائي' : 'Final Price'}
              </span>
            </div>
            <div className={`text-3xl font-bold drop-shadow-[0_0_10px_#00FF88] ${
              calculatePrice() > userLyraBalance ? 'text-red-400' : 'text-neonGreen'
            }`}>
              {calculatePrice().toLocaleString()} LYRA COIN
            </div>
            <div className="text-white/60 text-xs mt-2">
              {language === 'ar' 
                ? `${taskData.clicks.toLocaleString()} كليكة ${taskData.community ? '× 2 (جمهور مستهدف)' : ''}`
                : `${taskData.clicks.toLocaleString()} clicks ${taskData.community ? '× 2 (targeted community)' : ''}`
              }
            </div>
            {calculatePrice() > userLyraBalance && (
              <div className="mt-2 p-2 bg-red-500/20 border border-red-500/30 rounded text-red-400 text-xs">
                {language === 'ar' 
                  ? `تحتاج ${(calculatePrice() - userLyraBalance).toLocaleString()} LYRA إضافية`
                  : `Need ${(calculatePrice() - userLyraBalance).toLocaleString()} more LYRA`
                }
              </div>
            )}
          </div>
        </div>

        {/* Pricing Info */}
        <div className="bg-black/30 border border-white/10 rounded-lg p-4">
          <h4 className="text-white font-medium mb-2 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" />
            {language === 'ar' ? 'تفاصيل التسعير' : 'Pricing Details'}
          </h4>
          <div className="space-y-1 text-sm text-white/70">
            <p>• {language === 'ar' ? 'السعر الأساسي: كل 500 كليكة = 100 LYRA' : 'Base price: Every 500 clicks = 100 LYRA'}</p>
            <p>• {language === 'ar' ? 'الجمهور المستهدف: مضاعفة السعر ×2' : 'Targeted community: Double price ×2'}</p>
            <p>• {language === 'ar' ? 'رصيدك الحالي:' : 'Your current balance:'} 
              <span className={`font-bold ml-1 ${userLyraBalance >= calculatePrice() ? 'text-neonGreen' : 'text-red-400'}`}>
                {userLyraBalance.toLocaleString()} LYRA
              </span>
            </p>
            <p>• {language === 'ar' ? 'الرصيد المتبقي بعد الشراء:' : 'Remaining balance after purchase:'} 
              <span className={`font-bold ml-1 ${(userLyraBalance - calculatePrice()) >= 0 ? 'text-neonGreen' : 'text-red-400'}`}>
                {(userLyraBalance - calculatePrice()).toLocaleString()} LYRA
              </span>
            </p>
          </div>
        </div>

        {/* Insufficient Balance Warning */}
        {showInsufficientBalance && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <h4 className="text-red-400 font-medium">
                {language === 'ar' ? 'الرصيد غير كافٍ' : 'Insufficient Balance'}
              </h4>
            </div>
            <p className="text-red-400 text-sm mb-3">
              {language === 'ar' 
                ? `تحتاج ${(calculatePrice() - userLyraBalance).toLocaleString()} LYRA إضافية لإنشاء هذه المهمة`
                : `You need ${(calculatePrice() - userLyraBalance).toLocaleString()} more LYRA to create this task`
              }
            </p>
            <div className="text-white/70 text-xs">
              <p>{language === 'ar' ? 'خيارات الشحن:' : 'Charging options:'}</p>
              <p>• {language === 'ar' ? 'تحويل الدقائق إلى LYRA (1000 دقيقة = 1 LYRA)' : 'Convert minutes to LYRA (1000 minutes = 1 LYRA)'}</p>
              <p>• {language === 'ar' ? 'شراء بعملة TON (1 TON = 100 LYRA)' : 'Purchase with TON (1 TON = 100 LYRA)'}</p>
            </div>
          </div>
        )}

        {/* Create Task Button */}
        <button
          onClick={handleCreateTask}
          disabled={!canCreateTask() || isCreating}
          className={`w-full py-4 rounded-lg font-bold text-lg transition duration-300 flex items-center justify-center gap-2 ${
            canCreateTask() && !isCreating
              ? 'bg-neonGreen text-black hover:brightness-110 shadow-[0_0_15px_rgba(0,255,136,0.5)]'
              : 'bg-gray-600 text-gray-300 cursor-not-allowed opacity-50'
          }`}
        >
          {isCreating ? (
            <>
              <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
              {language === 'ar' ? 'جاري إنشاء المهمة...' : 'Creating Task...'}
            </>
          ) : (
            <>
              <DollarSign className="w-5 h-5" />
              {language === 'ar' ? 'شراء الخدمة' : 'BUY TASK'} 
              {canCreateTask() && (
                <span className="text-sm opacity-80">
                  ({calculatePrice().toLocaleString()} LYRA)
                </span>
              )}
            </>
          )}
        </button>
      </div>

      {/* Payment Verification Modal */}
      {showPaymentModal && paymentData && (
        <PaymentVerificationModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setPaymentData(null);
          }}
          paymentId={paymentData.paymentId}
          paymentMethod={paymentData.paymentMethod}
          amount={paymentData.amount}
          currency={paymentData.currency}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
};

export default AddTaskInterface;