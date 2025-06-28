import React, { useState } from 'react';
import { TonConnectButton, useTonWallet } from '@tonconnect/ui-react';
import PresalePurchaseModal from './PresalePurchaseModal';
import { useLanguage } from '../context/LanguageContext';

export function WalletConnect() {
  const wallet = useTonWallet();
  const [showPresaleModal, setShowPresaleModal] = useState(false);
  const { language } = useLanguage();

  const handleWalletConnected = () => {
    if (wallet) {
      setShowPresaleModal(true);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <TonConnectButton className="scale-110 drop-shadow-[0_0_20px_#00FF88] hover:scale-125 transition" />
      
      {wallet && (
        <button
          disabled={true}
          className="bg-gray-600 text-gray-300 font-bold py-3 px-6 rounded-lg cursor-not-allowed opacity-60 transition duration-300"
        >
          🪙 {language === 'ar' ? 'شراء LYRA COIN' : 'Buy LYRA COIN'} 
          <span className="ml-2 px-2 py-0.5 bg-yellow-400/20 text-yellow-400 text-xs rounded-full border border-yellow-400/30">
            {language === 'ar' ? 'قريباً =' : '= Soon'}
          </span>
        </button>
      )}

      <PresalePurchaseModal
        isOpen={showPresaleModal}
        onClose={() => setShowPresaleModal(false)}
        walletAddress={wallet?.account?.address || ''}
      />
    </div>
  );
}