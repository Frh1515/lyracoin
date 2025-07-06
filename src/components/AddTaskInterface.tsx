import React, { useState } from 'react';
import { Check, X, Globe, Users, DollarSign, Link } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
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
    isLinkValid: false
  });
  const [isCreating, setIsCreating] = useState(false);

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
    const isValid = taskData.link.startsWith('https://') && taskData.link.length > 10;
    setTaskData(prev => ({ ...prev, isLinkValid: isValid }));
    
    if (isValid) {
      toast.success(
        language === 'ar' ? '✅ الرابط صحيح!' : '✅ Link is valid!',
        { duration: 2000 }
      );
    } else {
      toast.error(
        language === 'ar' ? '❌ الرابط يجب أن يبدأ بـ https://' : '❌ Link must start with https://',
        { duration: 2000 }
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
    return taskData.isLinkValid && taskData.clicks > 0 && taskData.community !== '';
  };

  const handleCreateTask = async () => {
    if (!canCreateTask()) {
      toast.error(
        language === 'ar' 
          ? 'يرجى إكمال جميع الحقول المطلوبة'
          : 'Please complete all required fields'
      );
      return;
    }

    const totalPrice = calculatePrice();
    
    if (userLyraBalance < totalPrice) {
      toast.error(
        language === 'ar' 
          ? 'الرصيد غير كافٍ، الرجاء شحن المحفظة'
          : 'Insufficient balance, please charge your wallet',
        { 
          duration: 4000,
          style: {
            background: '#FF6347',
            color: '#fff'
          }
        }
      );
      return;
    }

    setIsCreating(true);
    
    try {
      // Simulate task creation process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success(
        language === 'ar'
          ? `🎉 تم إنشاء المهمة بنجاح! تم خصم ${totalPrice} LYRA من رصيدك`
          : `🎉 Task created successfully! ${totalPrice} LYRA deducted from your balance`,
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
        isLinkValid: false
      });
      
      onTaskCreated();
      onClose();
    } catch (error) {
      toast.error(
        language === 'ar' 
          ? 'فشل في إنشاء المهمة'
          : 'Failed to create task'
      );
    } finally {
      setIsCreating(false);
    }
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
            {language === 'ar' ? 'رابط المهمة' : 'Task Link'}
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Link className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="url"
                value={taskData.link}
                onChange={(e) => setTaskData(prev => ({ ...prev, link: e.target.value, isLinkValid: false }))}
                className="w-full bg-black/30 border border-white/20 rounded-lg pl-10 pr-4 py-3 text-white focus:border-neonGreen focus:outline-none transition"
                placeholder="https://your-link.com"
              />
            </div>
            <button
              onClick={validateLink}
              disabled={!taskData.link}
              className="w-12 h-12 bg-neonGreen text-black rounded-lg hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <Check className="w-5 h-5" />
            </button>
            <button
              onClick={() => setTaskData(prev => ({ ...prev, link: '', isLinkValid: false }))}
              className="w-12 h-12 bg-red-500 text-white rounded-lg hover:brightness-110 transition flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {taskData.isLinkValid && (
            <p className="text-neonGreen text-xs mt-1 flex items-center gap-1">
              <Check className="w-3 h-3" />
              {language === 'ar' ? 'الرابط صحيح' : 'Link verified'}
            </p>
          )}
        </div>

        {/* Clicks Selection */}
        <div>
          <label className="block text-white/70 text-sm font-medium mb-2">
            {language === 'ar' ? 'عدد الكليكات المطلوبة' : 'Required Clicks'}
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
            <span className="text-red-400">*</span> {language === 'ar' ? 'الجمهور المستهدف' : 'Target Community'}
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
            <div className="text-3xl font-bold text-neonGreen drop-shadow-[0_0_10px_#00FF88]">
              {calculatePrice().toLocaleString()} LYRA COIN
            </div>
            <div className="text-white/60 text-xs mt-2">
              {language === 'ar' 
                ? `${taskData.clicks.toLocaleString()} كليكة ${taskData.community ? '× 2 (جمهور مستهدف)' : ''}`
                : `${taskData.clicks.toLocaleString()} clicks ${taskData.community ? '× 2 (targeted community)' : ''}`
              }
            </div>
          </div>
        </div>

        {/* Pricing Info */}
        <div className="bg-black/30 border border-white/10 rounded-lg p-4">
          <h4 className="text-white font-medium mb-2 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" />
            {language === 'ar' ? 'تفاصيل التسعير' : 'Pricing Details'}
          </h4>
          <div className="space-y-1 text-sm text-white/70">
            <p>• {language === 'ar' ? 'كل 500 كليكة = 100 LYRA' : 'Every 500 clicks = 100 LYRA'}</p>
            <p>• {language === 'ar' ? 'الجمهور المستهدف = ×2 السعر' : 'Targeted community = ×2 price'}</p>
            <p>• {language === 'ar' ? 'رصيدك الحالي:' : 'Your current balance:'} <span className="text-neonGreen font-bold">{userLyraBalance.toLocaleString()} LYRA</span></p>
          </div>
        </div>

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
              {language === 'ar' ? 'جاري الإنشاء...' : 'Creating...'}
            </>
          ) : (
            <>
              <DollarSign className="w-5 h-5" />
              {language === 'ar' ? 'شراء الخدمة' : 'BUY TASK'}
            </>
          )}
        </button>

        {/* Requirements Notice */}
        <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-lg p-3">
          <p className="text-yellow-400 text-xs text-center">
            {language === 'ar' 
              ? 'ملاحظة: المهمة لن تُنشر حتى يتم التحقق من الدفع الفعلي'
              : 'Note: Task will not be published until actual payment is verified'
            }
          </p>
        </div>
      </div>
    </div>
  );
};

export default AddTaskInterface;