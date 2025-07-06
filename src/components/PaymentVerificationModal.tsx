import React, { useState, useEffect } from 'react';
import { X, Wallet, Clock, CheckCircle, AlertCircle, ExternalLink, Copy } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { WalletConnect } from './WalletConnect';
import { useTonWallet } from '@tonconnect/ui-react';
import { 
  processLyraPayment, 
  initiateTonVerification, 
  verifyTonTransaction,
  getPaymentStatus,
  simulateTonVerification
} from '../../lib/supabase/paidTasksSystem';
import toast from 'react-hot-toast';

interface PaymentVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentId: string;
  paymentMethod: 'lyra' | 'ton';
  amount: number;
  currency: string;
  onPaymentSuccess: () => void;
}

type PaymentStep = 'method_selection' | 'lyra_processing' | 'ton_connect' | 'ton_payment' | 'verification' | 'success' | 'failed';

const ADMIN_WALLET_ADDRESS = "UQBvI0aFLnw2QbZgjMPCLRdtRHxhUyinQudg6sdiohIwg5jL";

const PaymentVerificationModal: React.FC<PaymentVerificationModalProps> = ({
  isOpen,
  onClose,
  paymentId,
  paymentMethod,
  amount,
  currency,
  onPaymentSuccess
}) => {
  const { language } = useLanguage();
  const wallet = useTonWallet();
  const [currentStep, setCurrentStep] = useState<PaymentStep>('method_selection');
  const [isProcessing, setIsProcessing] = useState(false);
  const [transactionHash, setTransactionHash] = useState('');
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(600); // 10 minutes
  const [paymentExpired, setPaymentExpired] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    // تحديد الخطوة الأولى بناءً على طريقة الدفع
    if (paymentMethod === 'lyra') {
      setCurrentStep('lyra_processing');
    } else {
      setCurrentStep('ton_connect');
    }

    // بدء العد التنازلي
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          setPaymentExpired(true);
          setCurrentStep('failed');
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, paymentMethod]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleLyraPayment = async () => {
    setIsProcessing(true);
    try {
      const result = await processLyraPayment(paymentId);
      
      if (result.success) {
        setCurrentStep('success');
        toast.success(
          language === 'ar'
            ? '🎉 تم الدفع بنجاح! تم نشر مهمتك'
            : '🎉 Payment successful! Your task has been published',
          { 
            duration: 5000,
            style: {
              background: '#00FFAA',
              color: '#000',
              fontWeight: 'bold'
            }
          }
        );
        onPaymentSuccess();
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error processing LYRA payment:', error);
      setCurrentStep('failed');
      toast.error(
        language === 'ar'
          ? `فشل الدفع: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`
          : `Payment failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTonPaymentConfirmation = async () => {
    if (!transactionHash.trim()) {
      toast.error(
        language === 'ar' 
          ? 'يرجى إدخال hash المعاملة'
          : 'Please enter transaction hash'
      );
      return;
    }

    setIsProcessing(true);
    setCurrentStep('verification');

    try {
      // بدء التحقق من المعاملة
      const initiateResult = await initiateTonVerification(paymentId, transactionHash);
      
      if (!initiateResult.success) {
        throw new Error(initiateResult.message);
      }

      setVerificationId(initiateResult.verificationId || null);

      // محاكاة التحقق من البلوكشين
      toast.info(
        language === 'ar'
          ? 'جاري التحقق من المعاملة على البلوكشين...'
          : 'Verifying transaction on blockchain...',
        { duration: 3000 }
      );

      // انتظار قليل ثم التحقق
      setTimeout(async () => {
        try {
          if (initiateResult.verificationId) {
            const verifyResult = await verifyTonTransaction(
              initiateResult.verificationId,
              amount
            );

            if (verifyResult.success && verifyResult.verified) {
              setCurrentStep('success');
              toast.success(
                language === 'ar'
                  ? '🎉 تم التحقق من المعاملة بنجاح! تم نشر مهمتك'
                  : '🎉 Transaction verified successfully! Your task has been published',
                { 
                  duration: 5000,
                  style: {
                    background: '#00FFAA',
                    color: '#000',
                    fontWeight: 'bold'
                  }
                }
              );
              onPaymentSuccess();
            } else {
              throw new Error(verifyResult.message);
            }
          }
        } catch (verifyError) {
          console.error('Verification error:', verifyError);
          setCurrentStep('failed');
          toast.error(
            language === 'ar'
              ? 'فشل التحقق من المعاملة. تأكد من صحة hash المعاملة'
              : 'Transaction verification failed. Please check the transaction hash'
          );
        }
      }, 3000);

    } catch (error) {
      console.error('Error confirming TON payment:', error);
      setCurrentStep('failed');
      toast.error(
        language === 'ar'
          ? `فشل تأكيد الدفع: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`
          : `Payment confirmation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(
      language === 'ar' ? 'تم نسخ العنوان!' : 'Address copied!',
      { duration: 2000 }
    );
  };

  const generateMockTransactionHash = () => {
    // إنشاء hash وهمي للاختبار
    const mockHash = `verified_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setTransactionHash(mockHash);
    toast.info(
      language === 'ar'
        ? 'تم إنشاء hash تجريبي للاختبار'
        : 'Generated mock hash for testing',
      { duration: 2000 }
    );
  };

  if (!isOpen) return null;

  const renderMethodSelection = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-neonGreen rounded-full flex items-center justify-center mx-auto mb-4">
          <Wallet className="w-8 h-8 text-black" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          {language === 'ar' ? 'تأكيد الدفع' : 'Confirm Payment'}
        </h2>
        <p className="text-white/60">
          {language === 'ar' 
            ? `المبلغ: ${amount} ${currency}`
            : `Amount: ${amount} ${currency}`
          }
        </p>
      </div>

      <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-4 h-4 text-yellow-400" />
          <span className="text-yellow-400 font-medium">
            {language === 'ar' ? 'الوقت المتبقي' : 'Time Remaining'}
          </span>
        </div>
        <p className="text-white text-lg font-bold">
          {formatTime(timeRemaining)}
        </p>
      </div>
    </div>
  );

  const renderLyraProcessing = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-neonGreen rounded-full flex items-center justify-center mx-auto mb-4">
          <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center">
            <span className="text-neonGreen font-bold text-sm">L</span>
          </div>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          {language === 'ar' ? 'دفع بعملة LYRA' : 'LYRA Payment'}
        </h2>
        <p className="text-white/60">
          {language === 'ar' 
            ? `سيتم خصم ${amount} LYRA من رصيدك`
            : `${amount} LYRA will be deducted from your balance`
          }
        </p>
      </div>

      <div className="bg-neonGreen/10 border border-neonGreen/30 rounded-lg p-4">
        <div className="text-center">
          <div className="text-3xl font-bold text-neonGreen mb-2">
            {amount} LYRA
          </div>
          <p className="text-white/70 text-sm">
            {language === 'ar' ? 'المبلغ المطلوب' : 'Amount Required'}
          </p>
        </div>
      </div>

      <button
        onClick={handleLyraPayment}
        disabled={isProcessing}
        className="w-full bg-neonGreen text-black font-bold py-3 rounded-lg hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing ? (
          <div className="flex items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
            {language === 'ar' ? 'جاري المعالجة...' : 'Processing...'}
          </div>
        ) : (
          language === 'ar' ? 'تأكيد الدفع' : 'Confirm Payment'
        )}
      </button>
    </div>
  );

  const renderTonConnect = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <Wallet className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          {language === 'ar' ? 'ربط محفظة TON' : 'Connect TON Wallet'}
        </h2>
        <p className="text-white/60">
          {language === 'ar' 
            ? 'اربط محفظتك لإتمام الدفع'
            : 'Connect your wallet to complete payment'
          }
        </p>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <div className="text-center">
          <div className="text-3xl font-bold text-blue-500 mb-2">
            {amount} TON
          </div>
          <p className="text-white/70 text-sm">
            {language === 'ar' ? 'المبلغ المطلوب' : 'Amount Required'}
          </p>
        </div>
      </div>

      <WalletConnect />

      {wallet && (
        <button
          onClick={() => setCurrentStep('ton_payment')}
          className="w-full bg-blue-500 text-white font-bold py-3 rounded-lg hover:brightness-110 transition"
        >
          {language === 'ar' ? 'متابعة الدفع' : 'Continue Payment'}
        </button>
      )}
    </div>
  );

  const renderTonPayment = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <ExternalLink className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          {language === 'ar' ? 'إرسال الدفعة' : 'Send Payment'}
        </h2>
        <p className="text-white/60">
          {language === 'ar' 
            ? 'أرسل المبلغ إلى عنوان الإدارة'
            : 'Send the amount to admin address'
          }
        </p>
      </div>

      <div className="bg-black/30 border border-blue-500/30 rounded-lg p-4">
        <div className="mb-4">
          <label className="block text-white/70 text-sm font-medium mb-2">
            {language === 'ar' ? 'عنوان الإدارة:' : 'Admin Wallet Address:'}
          </label>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-black/50 border border-white/20 rounded px-3 py-2 text-white text-sm break-all">
              {ADMIN_WALLET_ADDRESS}
            </code>
            <button
              onClick={() => copyToClipboard(ADMIN_WALLET_ADDRESS)}
              className="bg-blue-500 text-white px-3 py-2 rounded hover:brightness-110 transition"
              title={language === 'ar' ? 'نسخ العنوان' : 'Copy address'}
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-white/70 text-sm font-medium mb-2">
            {language === 'ar' ? 'المبلغ:' : 'Amount:'}
          </label>
          <div className="bg-black/50 border border-white/20 rounded px-3 py-2">
            <span className="text-blue-500 font-bold text-lg">{amount} TON</span>
          </div>
        </div>
      </div>

      <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-lg p-4">
        <p className="text-yellow-400 text-sm">
          ⚠️ {language === 'ar' 
            ? 'بعد إرسال المبلغ، أدخل hash المعاملة أدناه للتحقق'
            : 'After sending the amount, enter the transaction hash below for verification'
          }
        </p>
      </div>

      <div>
        <label className="block text-white/70 text-sm font-medium mb-2">
          {language === 'ar' ? 'Hash المعاملة:' : 'Transaction Hash:'}
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={transactionHash}
            onChange={(e) => setTransactionHash(e.target.value)}
            className="flex-1 bg-black/30 border border-white/20 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none transition"
            placeholder={language === 'ar' ? 'أدخل hash المعاملة' : 'Enter transaction hash'}
          />
          <button
            onClick={generateMockTransactionHash}
            className="bg-gray-600 text-white px-4 py-3 rounded-lg hover:brightness-110 transition text-sm"
            title={language === 'ar' ? 'إنشاء hash تجريبي' : 'Generate test hash'}
          >
            Test
          </button>
        </div>
      </div>

      <button
        onClick={handleTonPaymentConfirmation}
        disabled={isProcessing || !transactionHash.trim()}
        className="w-full bg-blue-500 text-white font-bold py-3 rounded-lg hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing ? (
          <div className="flex items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            {language === 'ar' ? 'جاري التحقق...' : 'Verifying...'}
          </div>
        ) : (
          language === 'ar' ? 'تأكيد الدفع' : 'Confirm Payment'
        )}
      </button>
    </div>
  );

  const renderVerification = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-4">
          <div className="w-8 h-8 border-4 border-black/30 border-t-black rounded-full animate-spin"></div>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          {language === 'ar' ? 'جاري التحقق' : 'Verifying Payment'}
        </h2>
        <p className="text-white/60">
          {language === 'ar' 
            ? 'يتم التحقق من معاملتك على البلوكشين...'
            : 'Verifying your transaction on the blockchain...'
          }
        </p>
      </div>

      <div className="bg-black/30 border border-yellow-400/30 rounded-lg p-4">
        <div className="text-center">
          <p className="text-white/70 text-sm mb-2">
            {language === 'ar' ? 'Hash المعاملة:' : 'Transaction Hash:'}
          </p>
          <code className="text-yellow-400 text-sm break-all">
            {transactionHash}
          </code>
        </div>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <p className="text-blue-400 text-sm text-center">
          {language === 'ar' 
            ? 'قد يستغرق التحقق من المعاملة بضع دقائق...'
            : 'Transaction verification may take a few minutes...'
          }
        </p>
      </div>
    </div>
  );

  const renderSuccess = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          {language === 'ar' ? 'تم الدفع بنجاح!' : 'Payment Successful!'}
        </h2>
        <p className="text-white/60">
          {language === 'ar' 
            ? 'تم التحقق من دفعتك وتم نشر مهمتك'
            : 'Your payment has been verified and your task is now published'
          }
        </p>
      </div>

      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
        <div className="text-center">
          <div className="text-3xl font-bold text-green-500 mb-2">✅</div>
          <p className="text-green-400 font-medium">
            {language === 'ar' ? 'مهمتك نشطة الآن!' : 'Your task is now active!'}
          </p>
        </div>
      </div>

      <button
        onClick={onClose}
        className="w-full bg-green-500 text-white font-bold py-3 rounded-lg hover:brightness-110 transition"
      >
        {language === 'ar' ? 'إغلاق' : 'Close'}
      </button>
    </div>
  );

  const renderFailed = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          {language === 'ar' ? 'فشل الدفع' : 'Payment Failed'}
        </h2>
        <p className="text-white/60">
          {paymentExpired 
            ? (language === 'ar' ? 'انتهت صلاحية الدفع' : 'Payment has expired')
            : (language === 'ar' ? 'فشل في التحقق من الدفع' : 'Failed to verify payment')
          }
        </p>
      </div>

      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
        <div className="text-center">
          <div className="text-3xl font-bold text-red-500 mb-2">❌</div>
          <p className="text-red-400 font-medium">
            {paymentExpired 
              ? (language === 'ar' ? 'انتهت مهلة الدفع (10 دقائق)' : 'Payment timeout (10 minutes)')
              : (language === 'ar' ? 'تعذر التحقق من المعاملة' : 'Could not verify transaction')
            }
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <button
          onClick={() => {
            setCurrentStep('method_selection');
            setTimeRemaining(600);
            setPaymentExpired(false);
            setTransactionHash('');
          }}
          className="w-full bg-blue-500 text-white font-bold py-3 rounded-lg hover:brightness-110 transition"
        >
          {language === 'ar' ? 'إعادة المحاولة' : 'Try Again'}
        </button>
        
        <button
          onClick={onClose}
          className="w-full bg-transparent border border-white/30 text-white/70 py-3 rounded-lg hover:bg-white/5 transition"
        >
          {language === 'ar' ? 'إغلاق' : 'Close'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-darkGreen border-2 border-neonGreen rounded-xl p-6 w-full max-w-md relative shadow-[0_0_15px_rgba(0,255,136,0.3)] max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/60 hover:text-white transition z-10"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Timer Display */}
        {!paymentExpired && currentStep !== 'success' && currentStep !== 'failed' && (
          <div className="mb-4 text-center">
            <div className="inline-flex items-center gap-2 bg-yellow-400/20 border border-yellow-400/30 rounded-full px-3 py-1">
              <Clock className="w-4 h-4 text-yellow-400" />
              <span className="text-yellow-400 font-bold text-sm">
                {formatTime(timeRemaining)}
              </span>
            </div>
          </div>
        )}

        {currentStep === 'method_selection' && renderMethodSelection()}
        {currentStep === 'lyra_processing' && renderLyraProcessing()}
        {currentStep === 'ton_connect' && renderTonConnect()}
        {currentStep === 'ton_payment' && renderTonPayment()}
        {currentStep === 'verification' && renderVerification()}
        {currentStep === 'success' && renderSuccess()}
        {currentStep === 'failed' && renderFailed()}
      </div>
    </div>
  );
};

export default PaymentVerificationModal;