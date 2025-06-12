import React, { useState } from 'react';
import { TonConnectButton, useTonWallet } from '@tonconnect/ui-react';
import PresalePurchaseModal from './PresalePurchaseModal';

export function WalletConnect() {
  const wallet = useTonWallet();
  const [showPresaleModal, setShowPresaleModal] = useState(false);

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
          onClick={handleWalletConnected}
          className="bg-neonGreenCustom text-white font-bold py-3 px-6 rounded-lg hover:brightness-110 transition duration-300 shadow-glowCustom"
        >
          🪙 Buy LYRA COIN
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