import React, { useState } from 'react';
import { X, Wallet, Clock } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface PresalePurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string;
}

const PresalePurchaseModal: React.FC<PresalePurchaseModalProps> = ({
  isOpen,
  onClose,
  walletAddress
}) => {
  const { language } = useLanguage();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-darkGreen border-2 border-gray-600 rounded-xl p-6 w-full max-w-md relative opacity-75">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/60 hover:text-white transition"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="text-center mb-6">
          {/* LYRA COIN Logo */}
          <img
            src="/publiclogo.png"
            alt="LYRA COIN"
            className="w-16 h-16 mx-auto mb-4 drop-shadow-[0_0_20px_#00FF88] animate-float grayscale"
          />
          <Wallet className="w-8 h-8 text-gray-500 mx-auto mb-3" />
          <h2 className="text-2xl font-bold text-gray-400">
            {language === 'ar' ? 'البيع المسبق' : 'Presale'}
          </h2>
        </div>

        <div className="bg-gray-600/20 border border-gray-600/30 rounded-lg p-6 text-center">
          <Clock className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-400 mb-2">
            {language === 'ar' ? 'قريباً' : 'Coming Soon'}
          </h3>
          <p className="text-gray-500 text-sm mb-4">
            {language === 'ar' 
              ? 'البيع المسبق لعملة LYRA COIN سيكون متاحاً قريباً. ترقبوا المزيد من التحديثات!'
              : 'LYRA COIN presale will be available soon. Stay tuned for more updates!'
            }
          </p>
          
          <div className="bg-black/30 rounded-lg p-4 mb-4">
            <p className="text-white/70 text-sm">
              {language === 'ar' ? 'محفظتك المتصلة:' : 'Your connected wallet:'}
            </p>
            <code className="text-white text-xs break-all">
              {walletAddress}
            </code>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-gray-600 text-gray-300 py-3 rounded-lg font-medium hover:bg-gray-700 transition duration-300 mt-4"
        >
          {language === 'ar' ? 'إغلاق' : 'Close'}
        </button>
      </div>
    </div>
  );
};

export default PresalePurchaseModal;