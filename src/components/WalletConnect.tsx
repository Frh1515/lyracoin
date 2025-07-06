import React, { useState, memo } from 'react';
import { TonConnectButton, useTonWallet } from '@tonconnect/ui-react';
import { useLanguage } from '../context/LanguageContext';

export const WalletConnect = memo(function WalletConnect() {
  const wallet = useTonWallet();
  const { language } = useLanguage();

  return (
    <div className="flex flex-col items-center gap-4">
      <TonConnectButton className="scale-110 drop-shadow-[0_0_20px_#00FF88] hover:scale-125 transition" />
    </div>
  );
});