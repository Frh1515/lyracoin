import React, { useState } from 'react';
import { X, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTelegram } from '../context/TelegramContext';
import { useLanguage } from '../context/LanguageContext';
import { verifyPayment } from '../utils/api';

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
  const { language } = useLanguage();

  if (!isOpen) return null;

  const tonAmount = lyraAmount * 0.01;

  const handleConfirmPurchase = () => {
    if (lyraAmount < 1) {
      toast.error(language === 'ar' ? 'الحد الأدنى للشراء هو 1 LYRA COIN' : 'Minimum purchase is 1 LYRA COIN');
      return;
    }
    setShowPaymentStep(true);
  };

  const handlePaymentComplete = async () => {
    if (!user) {
      toast.error(language === 'ar' ? 'المستخدم غير مصادق عليه' : 'User not authenticated');
      return;
    }

    setIsProcessing(true);
    
    try {
      // Simulate transaction hash (in real implementation, this would come from TON Connect)
      const mockTransactionHash = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      console.log('🔄 Verifying payment with backend...');
      const result = await verifyPayment({
        wallet_address: walletAddress,
        lyra_amount: lyraAmount,
        transaction_hash: mockTransactionHash,
        telegram_id: user.id.toString()
      });

      if (result.success) {
        console.log('✅ Payment verified successfully');
        toast.success(
          language === 'ar' 
            ? `🎉 تم الشراء بنجاح!\n💰 ${lyraAmount} LYRA COIN\n💎 ${tonAmount} TON\n🔗 ${mockTransactionHash.substring(0, 10)}...`
            : `🎉 Purchase successful!\n💰 ${lyraAmount} LYRA COIN\n💎 ${tonAmount} TON\n🔗 ${mockTransactionHash.substring(0, 10)}...`,
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
        throw new Error(result.error || 'Payment verification failed');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(
        language === 'ar' 
          ? 'فشل الدفع. يرجى المحاولة مرة أخرى.' 
          : 'Payment failed. Please try again.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(language === 'ar' ? 'تم نسخ العنوان!' : 'Address copied to clipboard!');
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-darkGreen border-2 border-neonGreen rounded-xl p-6 w-full max-w-md relative shadow-glow">
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
            className="w-16 h-16 mx-auto mb-4 drop-shadow-[0_0_20px_#00FF88] animate-float"
          />
          <Wallet className="w-8 h-8 text-neonGreen mx-auto mb-3" />
          <h2 className="text-2xl font-bold text-white">
            {showPaymentStep 
              ? (language === 'ar' ? 'إكمال الدفع' : 'Complete Payment')
              : (language === 'ar' ? 'شراء LYRA COIN' : 'Purchase LYRA COIN')
            }
          </h2>
        </div>

        {!showPaymentStep ? (
          <div className="space-y-6">
            <div>
              <label className="block text-white/70 text-sm font-medium mb-2">
                {language === 'ar' ? 'كمية LYRA COIN' : 'LYRA COIN Amount'}
              </label>
              <input
                type="number"
                value={lyraAmount}
                onChange={(e) => setLyraAmount(Number(e.target.value))}
                min="1"
                className="w-full bg-black/30 border border-neonGreen/30 rounded-lg px-4 py-3 text-white focus:border-neonGreen focus:outline-none transition"
                placeholder={language === 'ar' ? 'أدخل الكمية' : 'Enter amount'}
              />
            </div>

            <div className="bg-black/30 rounded-lg p-4 border border-neonGreen/20">
              <div className="flex justify-between items-center mb-2">
                <span className="text-white/70">LYRA COIN:</span>
                <span className="text-white font-semibold">{lyraAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-white/70">{language === 'ar' ? 'السعر:' : 'Rate:'}</span>
                <span className="text-white">0.01 TON per LYRA</span>
              </div>
              <div className="border-t border-white/20 pt-2">
                <div className="flex justify-between items-center">
                  <span className="text-neonGreen font-semibold">{language === 'ar' ? 'المجموع:' : 'Total:'}</span>
                  <span className="text-neonGreen font-bold text-lg">{tonAmount.toFixed(4)} TON</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleConfirmPurchase}
              className="w-full bg-neonGreen text-black font-bold py-3 rounded-lg hover:brightness-110 transition duration-300 shadow-glow"
            >
              {language === 'ar' ? 'تأكيد الشراء' : 'Confirm Purchase'}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-white/70 mb-4">
                {language === 'ar' ? 'أرسل' : 'Send'} <span className="text-neonGreen font-bold">{tonAmount.toFixed(4)} TON</span> {language === 'ar' ? 'إلى:' : 'to:'}
              </p>
              
              <div className="bg-black/30 rounded-lg p-4 border border-neonGreen/20">
                <p className="text-white/70 text-sm mb-2">
                  {language === 'ar' ? 'عنوان محفظة البيع المسبق:' : 'Presale Wallet Address:'}
                </p>
                <div className="flex items-center gap-2">
                  <code className="text-white text-sm break-all flex-1">
                    {PRESALE_WALLET_ADDRESS}
                  </code>
                  <button
                    onClick={() => copyToClipboard(PRESALE_WALLET_ADDRESS)}
                    className="text-neonGreen hover:text-white transition text-sm"
                  >
                    {language === 'ar' ? 'نسخ' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <p className="text-red-400 text-sm">
                ⚠️ {language === 'ar' 
                  ? 'أكمل الدفع خلال 10 دقائق. بعد الإرسال، انقر على "تم الدفع" أدناه.'
                  : 'Complete payment within 10 minutes. After sending, click "Payment Complete" below.'
                }
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={handlePaymentComplete}
                disabled={isProcessing}
                className="w-full bg-neonGreen text-black font-bold py-3 rounded-lg hover:brightness-110 transition duration-300 shadow-glow disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing 
                  ? (language === 'ar' ? 'جاري المعالجة...' : 'Processing...')
                  : (language === 'ar' ? 'تم الدفع' : 'Payment Complete')
                }
              </button>
              
              <button
                onClick={() => setShowPaymentStep(false)}
                className="w-full bg-transparent border border-white/30 text-white/70 py-3 rounded-lg hover:bg-white/5 transition duration-300"
              >
                {language === 'ar' ? 'العودة للشراء' : 'Back to Purchase'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PresalePurchaseModal;