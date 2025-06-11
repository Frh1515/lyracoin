import { TonConnectButton } from '@tonconnect/ui-react';

export function WalletConnect() {
  return (
    <div className="flex justify-center mt-4">
      <TonConnectButton className="scale-110 drop-shadow-[0_0_20px_#00FF88] hover:scale-125 transition" />
    </div>
  );
}