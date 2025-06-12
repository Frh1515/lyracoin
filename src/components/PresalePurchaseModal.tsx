import React, { useState } from 'react';
import { X, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTelegram } from '../context/TelegramContext';

interface PresalePurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string;
}

const PRESALE_WALLET_ADDRESS = "UQBvI0aFLnw2QbZgjMPCLRdtRHxhUyinQudg6sdiohIwg5jL"; // Example TON wallet

const PresalePurchaseModal: React.FC<PresalePurchaseModalProps> = ({
  isOpen,
  onClose,
  walletAddress
}) => {
  const [lyraAmount, setLyraAmount] = useState<number>(100);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPaymentStep, setShowPaymentStep] = useState(false);
  const { user } = useTelegram();

  if (!isOpen) return null;

  const tonAmount = lyraAmount * 0.01;

  const handleConfirmPurchase = () => {
    if (lyraAmount < 1) {
      toast.error('Minimum purchase is 1 LYRA COIN');
      return;
    }
    setShowPaymentStep(true);
  };

  const handlePaymentComplete = async () => {
    if (!user) {
      toast.error('User not authenticated');
      return;
    }

    setIsProcessing(true);
    
    try {
      // Simulate transaction hash (in real implementation, this would come from TON Connect)
      const mockTransactionHash = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-presale-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          wallet_address: walletAddress,
          lyra_amount: lyraAmount,
          transaction_hash: mockTransactionHash,
          telegram_id: user.id.toString()
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success(
          `🎉 Purchase successful!\n💰 ${lyraAmount} LYRA COIN\n💎 ${tonAmount} TON\n🔗 ${mockTransactionHash.substring(0, 10)}...`,
          { 
            duration: 5000,
            style: {
              background: '#00FFAA',
              color: '#000',
              fontWeight: 'bold'
            }
          }
        );
        onClose();
      } else {
        throw new Error(result.error || 'Payment processing failed');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Address copied to clipboard!');
  };

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50 p-4">
      <div className="bg-darkGreenCustom border border-neonGreenCustom rounded-xl p-6 w-full max-w-md relative shadow-glowCustom">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-lightGrayCustom hover:text-white transition"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="text-center mb-6">
          <Wallet className="w-12 h-12 text-neonGreenCustom mx-auto mb-3" />
          <h2 className="text-2xl font-bold text-white">
            {showPaymentStep ? 'Complete Payment' : 'Purchase LYRA COIN'}
          </h2>
        </div>

        {!showPaymentStep ? (
          <div className="space-y-6">
            <div>
              <label className="block text-lightGrayCustom text-sm font-medium mb-2">
                LYRA COIN Amount
              </label>
              <input
                type="number"
                value={lyraAmount}
                onChange={(e) => setLyraAmount(Number(e.target.value))}
                min="1"
                className="w-full bg-black/30 border border-lightGrayCustom/30 rounded-lg px-4 py-3 text-white focus:border-neonGreenCustom focus:outline-none transition"
                placeholder="Enter amount"
              />
            </div>

            <div className="bg-black/30 rounded-lg p-4 border border-lightGrayCustom/20">
              <div className="flex justify-between items-center mb-2">
                <span className="text-lightGrayCustom">LYRA COIN:</span>
                <span className="text-white font-semibold">{lyraAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-lightGrayCustom">Rate:</span>
                <span className="text-white">0.01 TON per LYRA</span>
              </div>
              <div className="border-t border-lightGrayCustom/20 pt-2">
                <div className="flex justify-between items-center">
                  <span className="text-neonGreenCustom font-semibold">Total:</span>
                  <span className="text-neonGreenCustom font-bold text-lg">{tonAmount.toFixed(4)} TON</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleConfirmPurchase}
              className="w-full bg-neonGreenCustom text-black font-bold py-3 rounded-lg hover:brightness-110 transition duration-300 shadow-glowCustom"
            >
              Confirm Purchase
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-lightGrayCustom mb-4">
                Send <span className="text-neonGreenCustom font-bold">{tonAmount.toFixed(4)} TON</span> to:
              </p>
              
              <div className="bg-black/30 rounded-lg p-4 border border-lightGrayCustom/20">
                <p className="text-lightGrayCustom text-sm mb-2">Presale Wallet Address:</p>
                <div className="flex items-center gap-2">
                  <code className="text-white text-sm break-all flex-1">
                    {PRESALE_WALLET_ADDRESS}
                  </code>
                  <button
                    onClick={() => copyToClipboard(PRESALE_WALLET_ADDRESS)}
                    className="text-neonGreenCustom hover:text-white transition text-sm"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-lightRedCustom/10 border border-lightRedCustom/30 rounded-lg p-4">
              <p className="text-lightRedCustom text-sm">
                ⚠️ Complete payment within 10 minutes. After sending, click "Payment Complete" below.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={handlePaymentComplete}
                disabled={isProcessing}
                className="w-full bg-neonGreenCustom text-black font-bold py-3 rounded-lg hover:brightness-110 transition duration-300 shadow-glowCustom disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'Processing...' : 'Payment Complete'}
              </button>
              
              <button
                onClick={() => setShowPaymentStep(false)}
                className="w-full bg-transparent border border-lightGrayCustom/30 text-lightGrayCustom py-3 rounded-lg hover:bg-white/5 transition duration-300"
              >
                Back to Purchase
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PresalePurchaseModal;