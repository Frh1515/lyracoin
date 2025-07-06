import React, { useState } from 'react';
import { X, Wallet, ArrowRightLeft, Clock, Zap, ExternalLink } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { WalletConnect } from './WalletConnect';
import { updateUserMinutes } from '../../lib/supabase/updateUserMinutes';
import toast from 'react-hot-toast';

interface ChargeBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  userMinutes: number;
  userLyraBalance: number;
  onMinutesConverted: (minutesConverted: number, lyraEarned: number) => void;
}

type ModalView = 'main' | 'ton-wallet' | 'minutes-exchange';

const ChargeBalanceModal: React.FC<ChargeBalanceModalProps> = ({
  isOpen,
  onClose,
  userMinutes,
  userLyraBalance,
  onMinutesConverted
}) => {
  const { language } = useLanguage();
  const [currentView, setCurrentView] = useState<ModalView>('main');
  const [minutesToConvert, setMinutesToConvert] = useState<number>(1000);
  const [isConverting, setIsConverting] = useState(false);

  if (!isOpen) return null;

  const maxConvertibleMinutes = Math.floor(userMinutes / 1000) * 1000;
  const lyraFromMinutes = Math.floor(minutesToConvert / 1000);

  const handleMinutesConversion = async () => {
    if (minutesToConvert < 1000) {
      toast.error(
        language === 'ar' 
          ? 'الحد الأدنى للتحويل هو 1000 دقيقة'
          : 'Minimum conversion is 1000 minutes'
      );
      return;
    }

    if (minutesToConvert > userMinutes) {
      toast.error(
        language === 'ar' 
          ? 'ليس لديك دقائق كافية'
          : 'Not enough minutes available'
      );
      return;
    }

    setIsConverting(true);
    
    try {
      // Deduct minutes from user balance
      const result = await updateUserMinutes(-minutesToConvert);
      
      if (result.success) {
        // Calculate LYRA earned
        const lyraEarned = Math.floor(minutesToConvert / 1000);
        
        // Update parent component
        onMinutesConverted(minutesToConvert, lyraEarned);
        
        toast.success(
          language === 'ar'
            ? `🎉 تم التحويل بنجاح! حصلت على ${lyraEarned} LYRA`
            : `🎉 Conversion successful! You earned ${lyraEarned} LYRA`,
          { 
            duration: 4000,
            style: {
              background: '#00FFAA',
              color: '#000',
              fontWeight: 'bold'
            }
          }
        );
        
        // Reset and close
        setMinutesToConvert(1000);
        setCurrentView('main');
        onClose();
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error converting minutes:', error);
      toast.error(
        language === 'ar' 
          ? 'فشل في تحويل الدقائق'
          : 'Failed to convert minutes'
      );
    } finally {
      setIsConverting(false);
    }
  };

  const renderMainView = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-neonGreen rounded-full flex items-center justify-center mx-auto mb-4">
          <Wallet className="w-8 h-8 text-black" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          {language === 'ar' ? 'شحن رصيد LYRA' : 'Charge LYRA Balance'}
        </h2>
        <p className="text-white/60">
          {language === 'ar' 
            ? 'اختر طريقة شحن الرصيد'
            : 'Choose your charging method'
          }
        </p>
      </div>

      <div className="space-y-4">
        {/* TON Wallet Option */}
        <button
          onClick={() => setCurrentView('ton-wallet')}
          className="w-full p-6 bg-black/40 border border-blue-500/30 rounded-xl hover:scale-105 transition duration-300 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-semibold text-white">
                {language === 'ar' ? 'شحن باستخدام TON' : 'Charge with TON'}
              </h3>
              <p className="text-white/60 text-sm">
                {language === 'ar' 
                  ? 'استخدم محفظة TON لشراء عملة LYRA'
                  : 'Use TON wallet to buy LYRA coins'
                }
              </p>
            </div>
            <ExternalLink className="w-5 h-5 text-blue-500 ml-auto" />
          </div>
        </button>

        {/* Minutes Exchange Option */}
        <button
          onClick={() => setCurrentView('minutes-exchange')}
          className="w-full p-6 bg-black/40 border border-yellow-400/30 rounded-xl hover:scale-105 transition duration-300 shadow-[0_0_15px_rgba(255,204,21,0.3)]"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center">
              <ArrowRightLeft className="w-6 h-6 text-black" />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-semibold text-white">
                {language === 'ar' ? 'تحويل الدقائق إلى LYRA' : 'Convert Minutes to LYRA'}
              </h3>
              <p className="text-white/60 text-sm">
                {language === 'ar' 
                  ? `لديك ${userMinutes.toLocaleString()} دقيقة متاحة`
                  : `You have ${userMinutes.toLocaleString()} minutes available`
                }
              </p>
            </div>
            <ArrowRightLeft className="w-5 h-5 text-yellow-400 ml-auto" />
          </div>
        </button>
      </div>
    </div>
  );

  const renderTonWalletView = () => (
    <div className="space-y-6">
      <div className="text-center">
        <button
          onClick={() => setCurrentView('main')}
          className="absolute top-4 left-4 text-white/60 hover:text-white transition"
        >
          ← {language === 'ar' ? 'العودة' : 'Back'}
        </button>
        
        <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <Wallet className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          {language === 'ar' ? 'شحن باستخدام TON' : 'Charge with TON'}
        </h2>
        <p className="text-white/60">
          {language === 'ar' 
            ? 'اربط محفظتك لشراء عملة LYRA'
            : 'Connect your wallet to buy LYRA coins'
          }
        </p>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-4 h-4 text-blue-500" />
          <span className="text-blue-500 font-medium text-sm">
            {language === 'ar' ? 'سعر الصرف' : 'Exchange Rate'}
          </span>
        </div>
        <p className="text-white text-center text-lg font-bold">
          1 TON = 100 LYRA
        </p>
      </div>

      <WalletConnect />
      
      <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-lg p-4">
        <p className="text-yellow-400 text-sm text-center">
          {language === 'ar' 
            ? 'ميزة الشراء بـ TON ستكون متاحة قريباً'
            : 'TON purchase feature coming soon'
          }
        </p>
      </div>
    </div>
  );

  const renderMinutesExchangeView = () => (
    <div className="space-y-6">
      <div className="text-center">
        <button
          onClick={() => setCurrentView('main')}
          className="absolute top-4 left-4 text-white/60 hover:text-white transition"
        >
          ← {language === 'ar' ? 'العودة' : 'Back'}
        </button>
        
        <div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-4">
          <ArrowRightLeft className="w-8 h-8 text-black" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          {language === 'ar' ? 'تحويل الدقائق' : 'Convert Minutes'}
        </h2>
        <p className="text-white/60">
          {language === 'ar' 
            ? 'حول دقائقك إلى عملة LYRA'
            : 'Convert your minutes to LYRA coins'
          }
        </p>
      </div>

      {/* Current Balance */}
      <div className="bg-black/40 border border-white/10 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-white/70">
            {language === 'ar' ? 'رصيدك الحالي:' : 'Your current balance:'}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-yellow-400" />
            <span className="text-yellow-400 font-bold">
              {userMinutes.toLocaleString()} {language === 'ar' ? 'دقيقة' : 'minutes'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-neonGreen rounded-full"></div>
            <span className="text-neonGreen font-bold">
              {userLyraBalance.toLocaleString()} LYRA
            </span>
          </div>
        </div>
      </div>

      {/* Exchange Rate */}
      <div className="bg-neonGreen/10 border border-neonGreen/30 rounded-lg p-4">
        <div className="text-center">
          <h3 className="text-neonGreen font-bold mb-2">
            {language === 'ar' ? 'سعر التحويل' : 'Exchange Rate'}
          </h3>
          <p className="text-white text-lg">
            1000 {language === 'ar' ? 'دقيقة' : 'minutes'} = 1 LYRA
          </p>
        </div>
      </div>

      {/* Conversion Input */}
      <div className="space-y-4">
        <div>
          <label className="block text-white/70 text-sm font-medium mb-2">
            {language === 'ar' ? 'عدد الدقائق للتحويل' : 'Minutes to convert'}
          </label>
          <input
            type="number"
            value={minutesToConvert}
            onChange={(e) => setMinutesToConvert(Number(e.target.value))}
            min="1000"
            max={userMinutes}
            step="1000"
            className="w-full bg-black/30 border border-white/20 rounded-lg px-4 py-3 text-white focus:border-neonGreen focus:outline-none transition"
            placeholder="1000"
          />
          <p className="text-white/50 text-xs mt-1">
            {language === 'ar' 
              ? `الحد الأدنى: 1000 دقيقة • الحد الأقصى: ${maxConvertibleMinutes.toLocaleString()} دقيقة`
              : `Minimum: 1000 minutes • Maximum: ${maxConvertibleMinutes.toLocaleString()} minutes`
            }
          </p>
        </div>

        {/* Conversion Preview */}
        <div className="bg-black/40 border border-neonGreen/30 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="text-center">
              <p className="text-white/70 text-sm">
                {language === 'ar' ? 'ستحول' : 'You will convert'}
              </p>
              <p className="text-yellow-400 font-bold">
                {minutesToConvert.toLocaleString()} {language === 'ar' ? 'دقيقة' : 'minutes'}
              </p>
            </div>
            
            <ArrowRightLeft className="w-6 h-6 text-neonGreen" />
            
            <div className="text-center">
              <p className="text-white/70 text-sm">
                {language === 'ar' ? 'ستحصل على' : 'You will get'}
              </p>
              <p className="text-neonGreen font-bold">
                {lyraFromMinutes} LYRA
              </p>
            </div>
          </div>
        </div>

        {/* Convert Button */}
        <button
          onClick={handleMinutesConversion}
          disabled={isConverting || minutesToConvert < 1000 || minutesToConvert > userMinutes}
          className="w-full bg-neonGreen text-black font-bold py-3 rounded-lg hover:brightness-110 transition duration-300 shadow-glow disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isConverting 
            ? (language === 'ar' ? 'جاري التحويل...' : 'Converting...')
            : (language === 'ar' ? 'تحويل الآن' : 'Convert Now')
          }
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-darkGreen border-2 border-neonGreen rounded-xl p-6 w-full max-w-md relative shadow-[0_0_15px_rgba(0,255,136,0.3)] max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/60 hover:text-white transition z-10"
        >
          <X className="w-6 h-6" />
        </button>

        {currentView === 'main' && renderMainView()}
        {currentView === 'ton-wallet' && renderTonWalletView()}
        {currentView === 'minutes-exchange' && renderMinutesExchangeView()}
      </div>
    </div>
  );
};

export default ChargeBalanceModal;