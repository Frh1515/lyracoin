import React, { useState, useEffect } from 'react';
import { X, Zap, Wallet, Clock, Check, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTonWallet } from '@tonconnect/ui-react';
import { purchaseBoost, getActiveBoost } from '../../lib/supabase/boostSystem';
import toast from 'react-hot-toast';

interface BoostTimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBoostPurchased: () => void;
  activeBoost: {
    multiplier: number;
    endTime: string;
    remainingHours: number;
  } | null;
}

interface BoostPackage {
  id: number;
  price: number;
  multiplier: number;
  hoursRewarded: number;
  color: string;
  glowColor: string;
}

const BoostTimeModal: React.FC<BoostTimeModalProps> = ({
  isOpen,
  onClose,
  onBoostPurchased,
  activeBoost
}) => {
  const { language } = useLanguage();
  const wallet = useTonWallet();
  const [selectedBoost, setSelectedBoost] = useState<BoostPackage | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [remainingTime, setRemainingTime] = useState<string>('');

  const boostPackages: BoostPackage[] = [
    {
      id: 1,
      price: 20,
      multiplier: 2,
      hoursRewarded: 12,
      color: 'border-blue-500 bg-blue-500/20',
      glowColor: 'shadow-[0_0_15px_rgba(59,130,246,0.5)]'
    },
    {
      id: 2,
      price: 30,
      multiplier: 3,
      hoursRewarded: 18,
      color: 'border-purple-500 bg-purple-500/20',
      glowColor: 'shadow-[0_0_15px_rgba(168,85,247,0.5)]'
    },
    {
      id: 3,
      price: 40,
      multiplier: 4,
      hoursRewarded: 24,
      color: 'border-pink-500 bg-pink-500/20',
      glowColor: 'shadow-[0_0_15px_rgba(236,72,153,0.5)]'
    },
    {
      id: 4,
      price: 60,
      multiplier: 6,
      hoursRewarded: 36,
      color: 'border-yellow-400 bg-yellow-400/20',
      glowColor: 'shadow-[0_0_15px_rgba(250,204,21,0.5)]'
    },
    {
      id: 5,
      price: 100,
      multiplier: 10,
      hoursRewarded: 60,
      color: 'border-red-500 bg-red-500/20',
      glowColor: 'shadow-[0_0_15px_rgba(239,68,68,0.5)]'
    }
  ];

  useEffect(() => {
    if (activeBoost && isOpen) {
      const updateRemainingTime = () => {
        const now = new Date();
        const endTime = new Date(activeBoost.endTime);
        const diffMs = endTime.getTime() - now.getTime();
        
        if (diffMs <= 0) {
          setRemainingTime('00:00:00');
          return;
        }
        
        const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const diffSecs = Math.floor((diffMs % (1000 * 60)) / 1000);
        
        setRemainingTime(
          `${diffHrs.toString().padStart(2, '0')}:${diffMins.toString().padStart(2, '0')}:${diffSecs.toString().padStart(2, '0')}`
        );
      };
      
      updateRemainingTime();
      const interval = setInterval(updateRemainingTime, 1000);
      
      return () => clearInterval(interval);
    }
  }, [activeBoost, isOpen]);

  if (!isOpen) return null;

  const handleBoostPurchase = async () => {
    if (!selectedBoost) {
      toast.error(
        language === 'ar' 
          ? 'يرجى اختيار باقة أولاً' 
          : 'Please select a package first'
      );
      return;
    }

    if (!wallet) {
      toast.error(
        language === 'ar' 
          ? 'يرجى توصيل محفظتك أولاً' 
          : 'Please connect your wallet first'
      );
      return;
    }

    setIsProcessing(true);
    try {
      // Check boost status with backend
      const statusResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/boost-status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        }
      });

      if (!statusResponse.ok) {
        throw new Error('Failed to check boost status');
      }

      // Simulate transaction hash (in real implementation, this would come from TON Connect)
      const mockTransactionHash = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const result = await purchaseBoost({
        multiplier: selectedBoost.multiplier,
        price: selectedBoost.price,
        transaction_hash: mockTransactionHash
      });
      
      if (result.success) {
        toast.success(
          language === 'ar'
            ? `🚀 تم شراء Boost ×${selectedBoost.multiplier} بنجاح!`
            : `🚀 Boost ×${selectedBoost.multiplier} purchased successfully!`,
          { 
            duration: 4000,
            style: {
              background: '#00FFAA',
              color: '#000',
              fontWeight: 'bold'
            }
          }
        );
        onBoostPurchased();
        onClose();
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error purchasing boost:', error);
      toast.error(
        language === 'ar'
          ? 'فشل في شراء الباقة. يرجى المحاولة مرة أخرى.'
          : 'Failed to purchase boost. Please try again.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const getMultiplierColor = (multiplier: number) => {
    switch (multiplier) {
      case 2: return 'text-blue-500';
      case 3: return 'text-purple-500';
      case 4: return 'text-pink-500';
      case 6: return 'text-yellow-400';
      case 10: return 'text-red-500';
      default: return 'text-neonGreen';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-darkGreen border-2 border-blue-500 rounded-xl p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto relative shadow-[0_0_15px_rgba(59,130,246,0.3)]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/60 hover:text-white transition"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="text-center mb-6">
          <Zap className="w-12 h-12 text-blue-500 mx-auto mb-3 drop-shadow-[0_0_20px_#1877F2]" />
          <h2 className="text-2xl font-bold text-white">
            {language === 'ar' ? 'مضاعفة وقت التعدين' : 'Boost Mining Time'}
          </h2>
          <p className="text-white/70 text-sm mt-2">
            {language === 'ar' 
              ? 'ضاعف مكافآت التعدين الخاصة بك لمدة 24 ساعة'
              : 'Multiply your mining rewards for 24 hours'
            }
          </p>
        </div>

        {activeBoost ? (
          <div className="bg-black/30 rounded-lg p-4 mb-6 border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Zap className={`w-5 h-5 ${getMultiplierColor(activeBoost.multiplier)}`} />
                <span className={`font-bold text-lg ${getMultiplierColor(activeBoost.multiplier)}`}>
                  Boost ×{activeBoost.multiplier}
                </span>
              </div>
              <div className="bg-black/50 px-3 py-1 rounded-full text-white/80 text-sm">
                {language === 'ar' ? 'نشط' : 'Active'}
              </div>
            </div>
            
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-white/60" />
              <span className="text-white/80 text-sm">
                {language === 'ar' ? 'ينتهي في:' : 'Expires in:'} 
                <span className="font-mono ml-2 text-white">{remainingTime}</span>
              </span>
            </div>
            
            <div className="bg-black/50 p-3 rounded-lg text-center mt-4">
              <p className="text-white/80 text-sm">
                {language === 'ar' 
                  ? 'لديك بالفعل باقة نشطة. انتظر حتى تنتهي لشراء باقة جديدة.'
                  : 'You already have an active boost. Wait until it expires to purchase a new one.'
                }
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-3 mb-6">
              {boostPackages.map((pkg) => (
                <div
                  key={pkg.id}
                  className={`p-4 rounded-lg border ${pkg.color} ${
                    selectedBoost?.id === pkg.id ? pkg.glowColor : ''
                  } cursor-pointer transition-all duration-200 ${
                    selectedBoost?.id === pkg.id ? 'scale-[1.02]' : 'hover:scale-[1.02]'
                  }`}
                  onClick={() => setSelectedBoost(pkg)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${pkg.color}`}>
                        <Zap className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white">Boost ×{pkg.multiplier}</h3>
                        <p className="text-white/60 text-xs">
                          {language === 'ar' 
                            ? `كل 6 ساعات تمنح ${pkg.hoursRewarded} ساعة`
                            : `Each 6 hours gives ${pkg.hoursRewarded} hours`
                          }
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-white">{pkg.price} TON</span>
                    </div>
                  </div>
                  
                  {selectedBoost?.id === pkg.id && (
                    <div className="mt-3 flex justify-end">
                      <div className="bg-black/30 px-3 py-1 rounded-full text-white/80 text-xs flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        {language === 'ar' ? 'تم الاختيار' : 'Selected'}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="space-y-4">
              {!wallet ? (
                <div className="bg-yellow-400/20 border border-yellow-400/30 rounded-lg p-4 text-center">
                  <AlertTriangle className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
                  <p className="text-yellow-400 text-sm">
                    {language === 'ar' 
                      ? 'يرجى توصيل محفظتك أولاً لشراء الباقة'
                      : 'Please connect your wallet first to purchase boost'
                    }
                  </p>
                </div>
              ) : (
                <button
                  onClick={handleBoostPurchase}
                  disabled={!selectedBoost || isProcessing}
                  className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition ${
                    selectedBoost 
                      ? selectedBoost.color.replace('bg-', 'bg-').replace('/20', '') + ' text-white hover:brightness-110'
                      : 'bg-gray-600 text-gray-300'
                  } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isProcessing ? (
                    <>
                      <Zap className="w-5 h-5 animate-spin" />
                      {language === 'ar' ? 'جاري المعالجة...' : 'Processing...'}
                    </>
                  ) : (
                    <>
                      <Wallet className="w-5 h-5" />
                      {language === 'ar' ? 'شراء الآن' : 'Purchase Now'}
                    </>
                  )}
                </button>
              )}
              
              <button
                onClick={onClose}
                className="w-full bg-transparent border border-white/30 text-white/70 py-3 rounded-lg hover:bg-white/5 transition"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BoostTimeModal;