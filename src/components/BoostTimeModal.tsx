import React, { useState, useEffect } from 'react';
import { X, Zap, Clock, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTonWallet } from '@tonconnect/ui-react';

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
  const [remainingTime, setRemainingTime] = useState<string>('');

  const boostPackages: BoostPackage[] = [
    {
      id: 1,
      price: 20,
      multiplier: 2,
      hoursRewarded: 12,
      color: 'border-gray-600 bg-gray-600/20',
      glowColor: 'shadow-[0_0_15px_rgba(107,114,128,0.3)]'
    },
    {
      id: 2,
      price: 30,
      multiplier: 3,
      hoursRewarded: 18,
      color: 'border-gray-600 bg-gray-600/20',
      glowColor: 'shadow-[0_0_15px_rgba(107,114,128,0.3)]'
    },
    {
      id: 3,
      price: 40,
      multiplier: 4,
      hoursRewarded: 24,
      color: 'border-gray-600 bg-gray-600/20',
      glowColor: 'shadow-[0_0_15px_rgba(107,114,128,0.3)]'
    },
    {
      id: 4,
      price: 60,
      multiplier: 6,
      hoursRewarded: 36,
      color: 'border-gray-600 bg-gray-600/20',
      glowColor: 'shadow-[0_0_15px_rgba(107,114,128,0.3)]'
    },
    {
      id: 5,
      price: 100,
      multiplier: 10,
      hoursRewarded: 60,
      color: 'border-gray-600 bg-gray-600/20',
      glowColor: 'shadow-[0_0_15px_rgba(107,114,128,0.3)]'
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

  const getMultiplierColor = (multiplier: number) => {
    return 'text-gray-500';
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-darkGreen border-2 border-gray-600 rounded-xl p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto relative opacity-75">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/60 hover:text-white transition"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="text-center mb-6">
          <Zap className="w-12 h-12 text-gray-500 mx-auto mb-3" />
          <h2 className="text-2xl font-bold text-gray-400">
            {language === 'ar' ? 'مضاعفة وقت التعدين' : 'Boost Mining Time'}
          </h2>
          <p className="text-gray-500 text-sm mt-2">
            {language === 'ar' 
              ? 'قريباً - ضاعف مكافآت التعدين الخاصة بك'
              : 'Coming Soon - Multiply your mining rewards'
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
          </div>
        ) : (
          <>
            <div className="space-y-3 mb-6">
              {boostPackages.map((pkg) => (
                <div
                  key={pkg.id}
                  className={`p-4 rounded-lg border ${pkg.color} ${pkg.glowColor} cursor-not-allowed transition-all duration-200 opacity-50`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${pkg.color}`}>
                        <Zap className="w-5 h-5 text-gray-500" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-400">Boost ×{pkg.multiplier}</h3>
                        <p className="text-gray-500 text-xs">
                          {language === 'ar' 
                            ? `كل 6 ساعات تمنح ${pkg.hoursRewarded} ساعة`
                            : `Each 6 hours gives ${pkg.hoursRewarded} hours`
                          }
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-gray-400">{pkg.price} TON</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-gray-600/20 border border-gray-600/30 rounded-lg p-4 text-center mb-4">
              <Clock className="w-8 h-8 text-gray-500 mx-auto mb-2" />
              <h3 className="text-lg font-bold text-gray-400 mb-2">
                {language === 'ar' ? 'قريباً' : 'Coming Soon'}
              </h3>
              <p className="text-gray-500 text-sm">
                {language === 'ar' 
                  ? 'ميزة مضاعفة الوقت ستكون متاحة قريباً!'
                  : 'Time boost feature will be available soon!'
                }
              </p>
            </div>
          </>
        )}

        <button
          onClick={onClose}
          className="w-full bg-gray-600 text-gray-300 py-3 rounded-lg font-medium hover:bg-gray-700 transition duration-300"
        >
          {language === 'ar' ? 'إغلاق' : 'Close'}
        </button>
      </div>
    </div>
  );
};

export default BoostTimeModal;