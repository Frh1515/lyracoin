import React, { useState, useEffect } from 'react';
import { X, Wallet, ArrowRightLeft, Clock, Zap, ExternalLink, Copy, CheckCircle, AlertCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTonWallet } from '@tonconnect/ui-react';
import { WalletConnect } from './WalletConnect';
import { 
  getExchangeRates, 
  buyLyraWithTon, 
  verifyTonPaymentForLyra,
  convertMinutesToLyra,
  sellLyraForTon,
  simulateTonVerification
} from '../../lib/supabase/exchangeSystem';
import toast from 'react-hot-toast';

interface ExchangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userMinutes: number;
  userLyraBalance: number;
  onExchangeComplete: (
    type: 'buy' | 'sell' | 'convert', 
    amountIn: number, 
    currencyIn: string, 
    amountOut: number, 
    currencyOut: string
  ) => void;
}

type ExchangeView = 'main' | 'buy_lyra' | 'sell_lyra' | 'convert_minutes' | 'verification' | 'success' | 'failed';

// Admin wallet address for TON transactions
const ADMIN_WALLET_ADDRESS = "UQBvI0aFLnw2QbZgjMPCLRdtRHxhUyinQudg6sdiohIwg5jL";

const ExchangeModal: React.FC<ExchangeModalProps> = ({
  isOpen,
  onClose,
  userMinutes,
  userLyraBalance,
  onExchangeComplete
}) => {
  const { language } = useLanguage();
  const wallet = useTonWallet();
  const [currentView, setCurrentView] = useState<ExchangeView>('main');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Exchange rates
  const [exchangeRates, setExchangeRates] = useState({
    minutesToLyra: 1000, // 1000 minutes = 1 LYRA
    lyraToTon: 0.01,     // 1 LYRA = 0.01 TON
    tonToLyra: 100       // 1 TON = 100 LYRA
  });
  
  // Buy LYRA with TON
  const [tonAmount, setTonAmount] = useState<number>(1);
  const [lyraFromTon, setLyraFromTon] = useState<number>(100);
  const [transactionId, setTransactionId] = useState<string>('');
  const [transactionHash, setTransactionHash] = useState<string>('');
  const [timeRemaining, setTimeRemaining] = useState<number>(600); // 10 minutes
  
  // Convert minutes to LYRA
  const [minutesToConvert, setMinutesToConvert] = useState<number>(1000);
  const [lyraFromMinutes, setLyraFromMinutes] = useState<number>(1);
  
  // Sell LYRA for TON
  const [lyraToSell, setLyraToSell] = useState<number>(10);
  const [tonFromLyra, setTonFromLyra] = useState<number>(0.1);
  
  // Success state
  const [successDetails, setSuccessDetails] = useState<{
    type: 'buy' | 'sell' | 'convert';
    amountIn: number;
    currencyIn: string;
    amountOut: number;
    currencyOut: string;
  } | null>(null);

  // Load exchange rates
  useEffect(() => {
    if (isOpen) {
      loadExchangeRates();
    }
  }, [isOpen]);

  // Update calculated values when inputs change
  useEffect(() => {
    setLyraFromTon(tonAmount * exchangeRates.tonToLyra);
    setLyraFromMinutes(Math.floor(minutesToConvert / exchangeRates.minutesToLyra));
    setTonFromLyra(lyraToSell * exchangeRates.lyraToTon);
  }, [tonAmount, minutesToConvert, lyraToSell, exchangeRates]);

  // Countdown timer for TON transactions
  useEffect(() => {
    if (currentView === 'verification' && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setCurrentView('failed');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [currentView, timeRemaining]);

  const loadExchangeRates = async () => {
    try {
      const { success, rates } = await getExchangeRates();
      if (success) {
        setExchangeRates(rates);
      }
    } catch (error) {
      console.error('Error loading exchange rates:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(
      language === 'ar' ? 'تم نسخ العنوان!' : 'Address copied!',
      { duration: 2000 }
    );
  };

  // Buy LYRA with TON
  const handleBuyWithTon = async () => {
    if (!wallet) {
      toast.error(
        language === 'ar' ? 'يرجى توصيل محفظتك أولاً' : 'Please connect your wallet first'
      );
      return;
    }

    setIsProcessing(true);
    
    try {
      const result = await buyLyraWithTon(tonAmount, wallet.account.address);
      
      if (result.success) {
        setTransactionId(result.transactionId || '');
        setTimeRemaining(600); // Reset timer to 10 minutes
        setCurrentView('verification');
        
        toast.success(
          language === 'ar'
            ? 'تم بدء عملية الشراء. يرجى إكمال الدفع'
            : 'Purchase initiated. Please complete payment',
          { duration: 3000 }
        );
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error buying LYRA with TON:', error);
      toast.error(
        language === 'ar'
          ? `فشل الشراء: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`
          : `Purchase failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Verify TON payment
  const handleVerifyTonPayment = async () => {
    if (!transactionHash.trim()) {
      toast.error(
        language === 'ar' ? 'يرجى إدخال hash المعاملة' : 'Please enter transaction hash'
      );
      return;
    }

    setIsProcessing(true);
    
    try {
      // For demo purposes, we'll simulate verification
      const simulationResult = await simulateTonVerification(transactionHash);
      
      if (simulationResult.verified) {
        // If simulation is successful, call the actual verification
        const result = await verifyTonPaymentForLyra(transactionId, transactionHash);
        
        if (result.success) {
          setSuccessDetails({
            type: 'buy',
            amountIn: tonAmount,
            currencyIn: 'TON',
            amountOut: lyraFromTon,
            currencyOut: 'LYRA'
          });
          
          setCurrentView('success');
          
          // Notify parent component
          onExchangeComplete('buy', tonAmount, 'TON', lyraFromTon, 'LYRA');
          
          toast.success(
            language === 'ar'
              ? `🎉 تم الشراء بنجاح! حصلت على ${lyraFromTon} LYRA`
              : `🎉 Purchase successful! You got ${lyraFromTon} LYRA`,
            { 
              duration: 5000,
              style: {
                background: '#00FFAA',
                color: '#000',
                fontWeight: 'bold'
              }
            }
          );
        } else {
          throw new Error(result.message);
        }
      } else {
        throw new Error(
          language === 'ar'
            ? 'فشل التحقق من المعاملة. تأكد من صحة hash المعاملة'
            : 'Transaction verification failed. Please check the transaction hash'
        );
      }
    } catch (error) {
      console.error('Error verifying TON payment:', error);
      setCurrentView('failed');
      toast.error(
        language === 'ar'
          ? `فشل التحقق: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`
          : `Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Convert minutes to LYRA
  const handleConvertMinutes = async () => {
    if (minutesToConvert < 1000) {
      toast.error(
        language === 'ar' ? 'الحد الأدنى للتحويل هو 1000 دقيقة' : 'Minimum conversion is 1000 minutes'
      );
      return;
    }

    if (minutesToConvert % 1000 !== 0) {
      toast.error(
        language === 'ar' ? 'يجب أن تكون الدقائق من مضاعفات 1000' : 'Minutes must be in multiples of 1000'
      );
      return;
    }

    if (minutesToConvert > userMinutes) {
      toast.error(
        language === 'ar' ? 'ليس لديك دقائق كافية' : 'Not enough minutes available'
      );
      return;
    }

    setIsProcessing(true);
    
    try {
      const result = await convertMinutesToLyra(minutesToConvert);
      
      if (result.success) {
        setSuccessDetails({
          type: 'convert',
          amountIn: minutesToConvert,
          currencyIn: 'MINUTES',
          amountOut: result.lyraAmount || lyraFromMinutes,
          currencyOut: 'LYRA'
        });
        
        setCurrentView('success');
        
        // Notify parent component
        onExchangeComplete('convert', minutesToConvert, 'MINUTES', result.lyraAmount || lyraFromMinutes, 'LYRA');
        
        toast.success(
          language === 'ar'
            ? `🎉 تم التحويل بنجاح! حصلت على ${result.lyraAmount || lyraFromMinutes} LYRA`
            : `🎉 Conversion successful! You got ${result.lyraAmount || lyraFromMinutes} LYRA`,
          { 
            duration: 5000,
            style: {
              background: '#00FFAA',
              color: '#000',
              fontWeight: 'bold'
            }
          }
        );
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error converting minutes to LYRA:', error);
      toast.error(
        language === 'ar'
          ? `فشل التحويل: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`
          : `Conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Sell LYRA for TON
  const handleSellLyra = async () => {
    if (!wallet) {
      toast.error(
        language === 'ar' ? 'يرجى توصيل محفظتك أولاً' : 'Please connect your wallet first'
      );
      return;
    }

    if (lyraToSell < 10) {
      toast.error(
        language === 'ar' ? 'الحد الأدنى للبيع هو 10 LYRA' : 'Minimum sale is 10 LYRA'
      );
      return;
    }

    if (lyraToSell > userLyraBalance) {
      toast.error(
        language === 'ar' ? 'ليس لديك رصيد LYRA كافٍ' : 'Not enough LYRA balance'
      );
      return;
    }

    setIsProcessing(true);
    
    try {
      const result = await sellLyraForTon(lyraToSell, wallet.account.address);
      
      if (result.success) {
        setSuccessDetails({
          type: 'sell',
          amountIn: lyraToSell,
          currencyIn: 'LYRA',
          amountOut: result.tonAmount || tonFromLyra,
          currencyOut: 'TON'
        });
        
        setCurrentView('success');
        
        // Notify parent component
        onExchangeComplete('sell', lyraToSell, 'LYRA', result.tonAmount || tonFromLyra, 'TON');
        
        toast.success(
          language === 'ar'
            ? `🎉 تم البيع بنجاح! سيتم إرسال ${result.tonAmount || tonFromLyra} TON إلى محفظتك`
            : `🎉 Sale successful! ${result.tonAmount || tonFromLyra} TON will be sent to your wallet`,
          { 
            duration: 5000,
            style: {
              background: '#00FFAA',
              color: '#000',
              fontWeight: 'bold'
            }
          }
        );
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error selling LYRA for TON:', error);
      toast.error(
        language === 'ar'
          ? `فشل البيع: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`
          : `Sale failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Generate mock transaction hash for testing
  const generateMockTransactionHash = () => {
    const mockHash = `valid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setTransactionHash(mockHash);
    toast.info(
      language === 'ar'
        ? 'تم إنشاء hash تجريبي للاختبار'
        : 'Generated mock hash for testing',
      { duration: 2000 }
    );
  };

  if (!isOpen) return null;

  // Main view with exchange options
  const renderMainView = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-neonGreen rounded-full flex items-center justify-center mx-auto mb-4">
          <ArrowRightLeft className="w-8 h-8 text-black" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          {language === 'ar' ? 'تحويل العملات' : 'Currency Exchange'}
        </h2>
        <p className="text-white/60">
          {language === 'ar' 
            ? 'اختر طريقة التحويل'
            : 'Choose your exchange method'
          }
        </p>
      </div>

      <div className="space-y-4">
        {/* Buy LYRA with TON */}
        <button
          onClick={() => setCurrentView('buy_lyra')}
          className="w-full p-6 bg-black/40 border border-blue-500/30 rounded-xl hover:scale-105 transition duration-300 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-semibold text-white">
                {language === 'ar' ? 'شراء LYRA باستخدام TON' : 'Buy LYRA with TON'}
              </h3>
              <p className="text-white/60 text-sm">
                {language === 'ar' 
                  ? 'استخدم محفظة TON لشراء عملة LYRA'
                  : 'Use TON wallet to buy LYRA coins'
                }
              </p>
            </div>
            <ExternalLink className="w-5 h-5 text-blue-500 ml-auto" />
          </div>
        </button>

        {/* Convert Minutes to LYRA */}
        <button
          onClick={() => setCurrentView('convert_minutes')}
          className="w-full p-6 bg-black/40 border border-yellow-400/30 rounded-xl hover:scale-105 transition duration-300 shadow-[0_0_15px_rgba(255,204,21,0.3)]"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center">
              <Clock className="w-6 h-6 text-black" />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-semibold text-white">
                {language === 'ar' ? 'تحويل الدقائق إلى LYRA' : 'Convert Minutes to LYRA'}
              </h3>
              <p className="text-white/60 text-sm">
                {language === 'ar' 
                  ? `لديك ${userMinutes.toLocaleString()} دقيقة متاحة`
                  : `You have ${userMinutes.toLocaleString()} minutes available`
                }
              </p>
            </div>
            <ArrowRightLeft className="w-5 h-5 text-yellow-400 ml-auto" />
          </div>
        </button>

        {/* Sell LYRA for TON */}
        <button
          onClick={() => setCurrentView('sell_lyra')}
          className="w-full p-6 bg-black/40 border border-purple-500/30 rounded-xl hover:scale-105 transition duration-300 shadow-[0_0_15px_rgba(168,85,247,0.3)]"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-semibold text-white">
                {language === 'ar' ? 'بيع LYRA مقابل TON' : 'Sell LYRA for TON'}
              </h3>
              <p className="text-white/60 text-sm">
                {language === 'ar' 
                  ? `لديك ${userLyraBalance.toLocaleString()} LYRA متاحة`
                  : `You have ${userLyraBalance.toLocaleString()} LYRA available`
                }
              </p>
            </div>
            <ArrowRightLeft className="w-5 h-5 text-purple-500 ml-auto" />
          </div>
        </button>
      </div>

      {/* Exchange Rates */}
      <div className="bg-black/30 border border-white/10 rounded-lg p-4">
        <h3 className="text-white font-medium mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-neonGreen" />
          {language === 'ar' ? 'أسعار التحويل الثابتة' : 'Fixed Exchange Rates'}
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-white/70">1000 {language === 'ar' ? 'دقيقة' : 'Minutes'}</span>
            <span className="text-neonGreen font-medium">= 1 LYRA</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-white/70">1 LYRA</span>
            <span className="text-blue-400 font-medium">= 0.01 TON</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-white/70">1 TON</span>
            <span className="text-neonGreen font-medium">= 100 LYRA</span>
          </div>
        </div>
      </div>
    </div>
  );

  // Buy LYRA with TON view
  const renderBuyLyraView = () => (
    <div className="space-y-6">
      <div className="text-center">
        <button
          onClick={() => setCurrentView('main')}
          className="absolute top-4 left-4 text-white/60 hover:text-white transition"
        >
          ← {language === 'ar' ? 'العودة' : 'Back'}
        </button>
        
        <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <Wallet className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          {language === 'ar' ? 'شراء LYRA باستخدام TON' : 'Buy LYRA with TON'}
        </h2>
        <p className="text-white/60">
          {language === 'ar' 
            ? 'استخدم محفظة TON لشراء عملة LYRA'
            : 'Use TON wallet to buy LYRA coins'
          }
        </p>
      </div>

      {/* Wallet Connection Status */}
      {!wallet ? (
        <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-yellow-400" />
            <h4 className="text-yellow-400 font-medium">
              {language === 'ar' ? 'محفظة غير متصلة' : 'Wallet Not Connected'}
            </h4>
          </div>
          <p className="text-yellow-400 text-sm mb-4">
            {language === 'ar' 
              ? 'يرجى توصيل محفظة TON الخاصة بك أولاً'
              : 'Please connect your TON wallet first'
            }
          </p>
          <WalletConnect />
        </div>
      ) : (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <h4 className="text-green-400 font-medium">
              {language === 'ar' ? 'محفظة متصلة' : 'Wallet Connected'}
            </h4>
          </div>
          <p className="text-white/70 text-sm break-all">
            {wallet.account.address}
          </p>
        </div>
      )}

      {/* Exchange Rate */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-4 h-4 text-blue-500" />
          <span className="text-blue-500 font-medium text-sm">
            {language === 'ar' ? 'سعر الصرف' : 'Exchange Rate'}
          </span>
        </div>
        <p className="text-white text-center text-lg font-bold">
          1 TON = 100 LYRA
        </p>
      </div>

      {/* Amount Input */}
      <div>
        <label className="block text-white/70 text-sm font-medium mb-2">
          {language === 'ar' ? 'مبلغ TON' : 'TON Amount'}
        </label>
        <input
          type="number"
          value={tonAmount}
          onChange={(e) => {
            const value = parseFloat(e.target.value);
            if (!isNaN(value) && value >= 0) {
              setTonAmount(value);
            }
          }}
          min="0.1"
          step="0.1"
          className="w-full bg-black/30 border border-white/20 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none transition"
          placeholder="1.0"
        />
        <p className="text-white/50 text-xs mt-1">
          {language === 'ar' 
            ? 'الحد الأدنى: 0.1 TON'
            : 'Minimum: 0.1 TON'
          }
        </p>
      </div>

      {/* Conversion Preview */}
      <div className="bg-black/40 border border-neonGreen/30 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="text-center">
            <p className="text-white/70 text-sm">
              {language === 'ar' ? 'ستدفع' : 'You will pay'}
            </p>
            <p className="text-blue-500 font-bold">
              {tonAmount.toFixed(2)} TON
            </p>
          </div>
          
          <ArrowRightLeft className="w-6 h-6 text-neonGreen" />
          
          <div className="text-center">
            <p className="text-white/70 text-sm">
              {language === 'ar' ? 'ستحصل على' : 'You will get'}
            </p>
            <p className="text-neonGreen font-bold">
              {lyraFromTon.toFixed(0)} LYRA
            </p>
          </div>
        </div>
      </div>

      {/* Buy Button */}
      <button
        onClick={handleBuyWithTon}
        disabled={isProcessing || !wallet || tonAmount < 0.1}
        className="w-full bg-blue-500 text-white font-bold py-3 rounded-lg hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing ? (
          <div className="flex items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            {language === 'ar' ? 'جاري المعالجة...' : 'Processing...'}
          </div>
        ) : (
          language === 'ar' ? 'شراء LYRA' : 'Buy LYRA'
        )}
      </button>
    </div>
  );

  // Convert Minutes to LYRA view
  const renderConvertMinutesView = () => (
    <div className="space-y-6">
      <div className="text-center">
        <button
          onClick={() => setCurrentView('main')}
          className="absolute top-4 left-4 text-white/60 hover:text-white transition"
        >
          ← {language === 'ar' ? 'العودة' : 'Back'}
        </button>
        
        <div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock className="w-8 h-8 text-black" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          {language === 'ar' ? 'تحويل الدقائق إلى LYRA' : 'Convert Minutes to LYRA'}
        </h2>
        <p className="text-white/60">
          {language === 'ar' 
            ? 'حول دقائقك المكتسبة إلى عملة LYRA'
            : 'Convert your earned minutes to LYRA coins'
          }
        </p>
      </div>

      {/* Current Balance */}
      <div className="bg-black/40 border border-white/10 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-white/70">
            {language === 'ar' ? 'رصيدك الحالي:' : 'Your current balance:'}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-yellow-400" />
            <span className="text-yellow-400 font-bold">
              {userMinutes.toLocaleString()} {language === 'ar' ? 'دقيقة' : 'minutes'}
            </span>
          </div>
        </div>
      </div>

      {/* Exchange Rate */}
      <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-lg p-4">
        <div className="text-center">
          <h3 className="text-yellow-400 font-bold mb-2">
            {language === 'ar' ? 'سعر التحويل' : 'Exchange Rate'}
          </h3>
          <p className="text-white text-lg">
            1000 {language === 'ar' ? 'دقيقة' : 'minutes'} = 1 LYRA
          </p>
        </div>
      </div>

      {/* Conversion Input */}
      <div className="space-y-4">
        <div>
          <label className="block text-white/70 text-sm font-medium mb-2">
            {language === 'ar' ? 'عدد الدقائق للتحويل' : 'Minutes to convert'}
          </label>
          <input
            type="number"
            value={minutesToConvert}
            onChange={(e) => {
              const value = parseInt(e.target.value);
              if (!isNaN(value) && value >= 0) {
                setMinutesToConvert(value);
              }
            }}
            min="1000"
            max={userMinutes}
            step="1000"
            className="w-full bg-black/30 border border-white/20 rounded-lg px-4 py-3 text-white focus:border-yellow-400 focus:outline-none transition"
            placeholder="1000"
          />
          <p className="text-white/50 text-xs mt-1">
            {language === 'ar' 
              ? `الحد الأدنى: 1000 دقيقة • الحد الأقصى: ${userMinutes.toLocaleString()} دقيقة`
              : `Minimum: 1000 minutes • Maximum: ${userMinutes.toLocaleString()} minutes`
            }
          </p>
        </div>

        {/* Conversion Preview */}
        <div className="bg-black/40 border border-neonGreen/30 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="text-center">
              <p className="text-white/70 text-sm">
                {language === 'ar' ? 'ستحول' : 'You will convert'}
              </p>
              <p className="text-yellow-400 font-bold">
                {minutesToConvert.toLocaleString()} {language === 'ar' ? 'دقيقة' : 'minutes'}
              </p>
            </div>
            
            <ArrowRightLeft className="w-6 h-6 text-neonGreen" />
            
            <div className="text-center">
              <p className="text-white/70 text-sm">
                {language === 'ar' ? 'ستحصل على' : 'You will get'}
              </p>
              <p className="text-neonGreen font-bold">
                {lyraFromMinutes} LYRA
              </p>
            </div>
          </div>
        </div>

        {/* Convert Button */}
        <button
          onClick={handleConvertMinutes}
          disabled={isProcessing || minutesToConvert < 1000 || minutesToConvert > userMinutes || minutesToConvert % 1000 !== 0}
          className="w-full bg-yellow-400 text-black font-bold py-3 rounded-lg hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
              {language === 'ar' ? 'جاري التحويل...' : 'Converting...'}
            </div>
          ) : (
            language === 'ar' ? 'تحويل الآن' : 'Convert Now'
          )}
        </button>
      </div>
    </div>
  );

  // Sell LYRA for TON view
  const renderSellLyraView = () => (
    <div className="space-y-6">
      <div className="text-center">
        <button
          onClick={() => setCurrentView('main')}
          className="absolute top-4 left-4 text-white/60 hover:text-white transition"
        >
          ← {language === 'ar' ? 'العودة' : 'Back'}
        </button>
        
        <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <Zap className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          {language === 'ar' ? 'بيع LYRA مقابل TON' : 'Sell LYRA for TON'}
        </h2>
        <p className="text-white/60">
          {language === 'ar' 
            ? 'بيع عملة LYRA واستلم TON في محفظتك'
            : 'Sell LYRA coins and receive TON in your wallet'
          }
        </p>
      </div>

      {/* Wallet Connection Status */}
      {!wallet ? (
        <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-yellow-400" />
            <h4 className="text-yellow-400 font-medium">
              {language === 'ar' ? 'محفظة غير متصلة' : 'Wallet Not Connected'}
            </h4>
          </div>
          <p className="text-yellow-400 text-sm mb-4">
            {language === 'ar' 
              ? 'يرجى توصيل محفظة TON الخاصة بك أولاً'
              : 'Please connect your TON wallet first'
            }
          </p>
          <WalletConnect />
        </div>
      ) : (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <h4 className="text-green-400 font-medium">
              {language === 'ar' ? 'محفظة متصلة' : 'Wallet Connected'}
            </h4>
          </div>
          <p className="text-white/70 text-sm break-all">
            {wallet.account.address}
          </p>
        </div>
      )}

      {/* Current Balance */}
      <div className="bg-black/40 border border-white/10 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-white/70">
            {language === 'ar' ? 'رصيدك الحالي:' : 'Your current balance:'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-neonGreen rounded-full"></div>
          <span className="text-neonGreen font-bold">
            {userLyraBalance.toLocaleString()} LYRA
          </span>
        </div>
      </div>

      {/* Exchange Rate */}
      <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
        <div className="text-center">
          <h3 className="text-purple-500 font-bold mb-2">
            {language === 'ar' ? 'سعر التحويل' : 'Exchange Rate'}
          </h3>
          <p className="text-white text-lg">
            1 LYRA = 0.01 TON
          </p>
        </div>
      </div>

      {/* Amount Input */}
      <div>
        <label className="block text-white/70 text-sm font-medium mb-2">
          {language === 'ar' ? 'مبلغ LYRA للبيع' : 'LYRA Amount to Sell'}
        </label>
        <input
          type="number"
          value={lyraToSell}
          onChange={(e) => {
            const value = parseInt(e.target.value);
            if (!isNaN(value) && value >= 0) {
              setLyraToSell(value);
            }
          }}
          min="10"
          max={userLyraBalance}
          className="w-full bg-black/30 border border-white/20 rounded-lg px-4 py-3 text-white focus:border-purple-500 focus:outline-none transition"
          placeholder="10"
        />
        <p className="text-white/50 text-xs mt-1">
          {language === 'ar' 
            ? `الحد الأدنى: 10 LYRA • الحد الأقصى: ${userLyraBalance.toLocaleString()} LYRA`
            : `Minimum: 10 LYRA • Maximum: ${userLyraBalance.toLocaleString()} LYRA`
          }
        </p>
      </div>

      {/* Conversion Preview */}
      <div className="bg-black/40 border border-blue-500/30 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="text-center">
            <p className="text-white/70 text-sm">
              {language === 'ar' ? 'ستبيع' : 'You will sell'}
            </p>
            <p className="text-neonGreen font-bold">
              {lyraToSell.toLocaleString()} LYRA
            </p>
          </div>
          
          <ArrowRightLeft className="w-6 h-6 text-blue-500" />
          
          <div className="text-center">
            <p className="text-white/70 text-sm">
              {language === 'ar' ? 'ستحصل على' : 'You will get'}
            </p>
            <p className="text-blue-500 font-bold">
              {tonFromLyra.toFixed(4)} TON
            </p>
          </div>
        </div>
      </div>

      {/* Sell Button */}
      <button
        onClick={handleSellLyra}
        disabled={isProcessing || !wallet || lyraToSell < 10 || lyraToSell > userLyraBalance}
        className="w-full bg-purple-500 text-white font-bold py-3 rounded-lg hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing ? (
          <div className="flex items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            {language === 'ar' ? 'جاري المعالجة...' : 'Processing...'}
          </div>
        ) : (
          language === 'ar' ? 'بيع LYRA' : 'Sell LYRA'
        )}
      </button>
    </div>
  );

  // TON Payment Verification view
  const renderVerificationView = () => (
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
            <span className="text-blue-500 font-bold text-lg">{tonAmount} TON</span>
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
        onClick={handleVerifyTonPayment}
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

  // Success view
  const renderSuccessView = () => {
    if (!successDetails) return null;
    
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {language === 'ar' ? 'تمت العملية بنجاح!' : 'Transaction Successful!'}
          </h2>
          <p className="text-white/60">
            {language === 'ar' 
              ? 'تم تنفيذ عملية التحويل بنجاح'
              : 'Your exchange transaction was completed successfully'
            }
          </p>
        </div>

        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-500 mb-2">✅</div>
            <p className="text-green-400 font-medium">
              {successDetails.type === 'buy' && (
                language === 'ar'
                  ? `تم شراء ${successDetails.amountOut} LYRA بنجاح!`
                  : `Successfully purchased ${successDetails.amountOut} LYRA!`
              )}
              {successDetails.type === 'sell' && (
                language === 'ar'
                  ? `تم بيع ${successDetails.amountIn} LYRA بنجاح! سيتم إرسال ${successDetails.amountOut} TON إلى محفظتك`
                  : `Successfully sold ${successDetails.amountIn} LYRA! ${successDetails.amountOut} TON will be sent to your wallet`
              )}
              {successDetails.type === 'convert' && (
                language === 'ar'
                  ? `تم تحويل ${successDetails.amountIn} دقيقة إلى ${successDetails.amountOut} LYRA بنجاح!`
                  : `Successfully converted ${successDetails.amountIn} minutes to ${successDetails.amountOut} LYRA!`
              )}
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
  };

  // Failed view
  const renderFailedView = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          {language === 'ar' ? 'فشلت العملية' : 'Transaction Failed'}
        </h2>
        <p className="text-white/60">
          {language === 'ar' 
            ? 'لم نتمكن من إكمال عملية التحويل'
            : 'We could not complete your exchange transaction'
          }
        </p>
      </div>

      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
        <div className="text-center">
          <div className="text-3xl font-bold text-red-500 mb-2">❌</div>
          <p className="text-red-400 font-medium">
            {timeRemaining <= 0
              ? (language === 'ar' ? 'انتهت مهلة العملية (10 دقائق)' : 'Transaction timeout (10 minutes)')
              : (language === 'ar' ? 'فشل في التحقق من المعاملة' : 'Failed to verify transaction')
            }
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <button
          onClick={() => setCurrentView('main')}
          className="w-full bg-blue-500 text-white font-bold py-3 rounded-lg hover:brightness-110 transition"
        >
          {language === 'ar' ? 'العودة للصفحة الرئيسية' : 'Back to Main Menu'}
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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-darkGreen border-2 border-neonGreen rounded-xl p-6 w-full max-w-md relative shadow-[0_0_15px_rgba(0,255,136,0.3)] max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/60 hover:text-white transition z-10"
        >
          <X className="w-6 h-6" />
        </button>

        {currentView === 'main' && renderMainView()}
        {currentView === 'buy_lyra' && renderBuyLyraView()}
        {currentView === 'convert_minutes' && renderConvertMinutesView()}
        {currentView === 'sell_lyra' && renderSellLyraView()}
        {currentView === 'verification' && renderVerificationView()}
        {currentView === 'success' && renderSuccessView()}
        {currentView === 'failed' && renderFailedView()}
      </div>
    </div>
  );
};

export default ExchangeModal;