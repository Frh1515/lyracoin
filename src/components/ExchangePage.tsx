import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Wallet, ArrowRightLeft, Clock, Zap, TrendingUp, History, CheckCircle, AlertCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { getUserProfile, type UserProfile } from '../../lib/supabase/getUserProfile';
import { getUserExchangeTransactions, type ExchangeTransaction } from '../../lib/supabase/exchangeSystem';
import ExchangeModal from './ExchangeModal';
import toast from 'react-hot-toast';

const ExchangePage: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showExchangeModal, setShowExchangeModal] = useState(false);
  const [transactions, setTransactions] = useState<ExchangeTransaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);

  useEffect(() => {
    fetchUserProfile();
    fetchTransactions();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const { data, error } = await getUserProfile();
      
      if (error) {
        throw error;
      }

      if (data) {
        setProfile(data);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      toast.error(
        language === 'ar' 
          ? 'فشل في تحميل بيانات المستخدم' 
          : 'Failed to load user data'
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      setLoadingTransactions(true);
      const { success, transactions } = await getUserExchangeTransactions();
      
      if (success) {
        setTransactions(transactions);
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
    } finally {
      setLoadingTransactions(false);
    }
  };

  const handleExchangeComplete = (
    type: 'buy' | 'sell' | 'convert', 
    amountIn: number, 
    currencyIn: string, 
    amountOut: number, 
    currencyOut: string
  ) => {
    // Update profile based on exchange type
    if (profile) {
      let updatedProfile = { ...profile };
      
      if (type === 'buy' && currencyOut === 'LYRA') {
        updatedProfile.lyra_balance += amountOut;
      } else if (type === 'sell' && currencyIn === 'LYRA') {
        updatedProfile.lyra_balance -= amountIn;
      } else if (type === 'convert') {
        if (currencyIn === 'MINUTES' && currencyOut === 'LYRA') {
          updatedProfile.total_minutes -= amountIn;
          updatedProfile.lyra_balance += amountOut;
        }
      }
      
      setProfile(updatedProfile);
    }
    
    // Refresh transactions
    fetchTransactions();
    
    // Close modal
    setShowExchangeModal(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400 bg-green-400/20 border-green-400/30';
      case 'pending': return 'text-yellow-400 bg-yellow-400/20 border-yellow-400/30';
      case 'failed': return 'text-red-400 bg-red-400/20 border-red-400/30';
      case 'expired': return 'text-gray-400 bg-gray-400/20 border-gray-400/30';
      default: return 'text-gray-400 bg-gray-400/20 border-gray-400/30';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return language === 'ar' ? 'مكتملة' : 'Completed';
      case 'pending': return language === 'ar' ? 'معلقة' : 'Pending';
      case 'failed': return language === 'ar' ? 'فشلت' : 'Failed';
      case 'expired': return language === 'ar' ? 'منتهية' : 'Expired';
      default: return status;
    }
  };

  const getTransactionTypeText = (type: string) => {
    switch (type) {
      case 'buy_with_ton': return language === 'ar' ? 'شراء LYRA بـ TON' : 'Buy LYRA with TON';
      case 'sell_for_ton': return language === 'ar' ? 'بيع LYRA مقابل TON' : 'Sell LYRA for TON';
      case 'convert_minutes': return language === 'ar' ? 'تحويل دقائق إلى LYRA' : 'Convert Minutes to LYRA';
      default: return type;
    }
  };

  const getCurrencyIcon = (currency: string) => {
    switch (currency) {
      case 'TON': return '💎';
      case 'LYRA': return '🪙';
      case 'MINUTES': return '⏱️';
      default: return '💰';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#041e11] via-[#051a13] to-[#040d0c]">
        <div className="text-white animate-pulse">
          {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#041e11] via-[#051a13] to-[#040d0c] text-white">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-black/80 backdrop-blur-sm border-b border-neonGreen/30">
        <div className="flex items-center justify-between p-4">
          {/* Back Button */}
          <button
            onClick={() => navigate('/new-task')}
            className="flex items-center gap-2 text-white/70 hover:text-white transition"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">
              {language === 'ar' ? 'العودة' : 'Back'}
            </span>
          </button>

          {/* LYRA Balance */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-black/40 px-3 py-2 rounded-lg border border-neonGreen/30">
              <div className="w-6 h-6 bg-neonGreen rounded-full flex items-center justify-center">
                <span className="text-black font-bold text-xs">L</span>
              </div>
              <span className="text-neonGreen font-bold">
                {profile?.lyra_balance?.toLocaleString() || 0}
              </span>
              <span className="text-white/60 text-xs">LYRA</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Page Title */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-neonGreen rounded-full flex items-center justify-center mx-auto mb-4">
              <ArrowRightLeft className="w-10 h-10 text-black" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              {language === 'ar' ? 'تحويل العملات' : 'Currency Exchange'}
            </h1>
            <p className="text-white/70">
              {language === 'ar' 
                ? 'شراء وبيع LYRA وتحويل الدقائق'
                : 'Buy and sell LYRA and convert minutes'
              }
            </p>
          </div>

          {/* Balance Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* LYRA Balance */}
            <div className="bg-black/40 backdrop-blur-sm border border-neonGreen/30 rounded-xl p-6 shadow-[0_0_15px_rgba(0,255,136,0.3)]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-neonGreen rounded-full flex items-center justify-center">
                  <span className="text-black font-bold">L</span>
                </div>
                <h3 className="text-lg font-semibold text-white">
                  {language === 'ar' ? 'رصيد LYRA' : 'LYRA Balance'}
                </h3>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-neonGreen mb-2">
                  {profile?.lyra_balance?.toLocaleString() || 0}
                </div>
                <p className="text-white/60 text-sm">
                  {language === 'ar' ? 'عملة LYRA' : 'LYRA Coins'}
                </p>
              </div>
            </div>

            {/* Minutes Balance */}
            <div className="bg-black/40 backdrop-blur-sm border border-yellow-400/30 rounded-xl p-6 shadow-[0_0_15px_rgba(255,204,21,0.3)]">
              <div className="flex items-center gap-3 mb-4">
                <Clock className="w-10 h-10 text-yellow-400" />
                <h3 className="text-lg font-semibold text-white">
                  {language === 'ar' ? 'رصيد الدقائق' : 'Minutes Balance'}
                </h3>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-400 mb-2">
                  {profile?.total_minutes?.toLocaleString() || 0}
                </div>
                <p className="text-white/60 text-sm">
                  {language === 'ar' ? 'دقيقة متاحة' : 'Available Minutes'}
                </p>
              </div>
            </div>

            {/* TON Wallet */}
            <div className="bg-black/40 backdrop-blur-sm border border-blue-500/30 rounded-xl p-6 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
              <div className="flex items-center gap-3 mb-4">
                <Wallet className="w-10 h-10 text-blue-500" />
                <h3 className="text-lg font-semibold text-white">
                  {language === 'ar' ? 'محفظة TON' : 'TON Wallet'}
                </h3>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-500 mb-2">
                  <span className="text-sm text-white/60">
                    {language === 'ar' ? 'متصل' : 'Connected'}
                  </span>
                </div>
                <p className="text-white/60 text-sm">
                  {language === 'ar' ? 'للشراء والبيع' : 'For buying and selling'}
                </p>
              </div>
            </div>
          </div>

          {/* Exchange Button */}
          <div className="mb-8">
            <button
              onClick={() => setShowExchangeModal(true)}
              className="w-full p-6 bg-gradient-to-r from-neonGreen to-blue-500 border-2 border-neonGreen/50 rounded-xl text-white font-bold hover:scale-105 transition duration-300 shadow-[0_0_20px_rgba(0,255,136,0.5)] flex items-center justify-center gap-3"
            >
              <ArrowRightLeft className="w-8 h-8" />
              <span className="text-xl">
                {language === 'ar' ? 'تحويل العملات' : 'Exchange Currencies'}
              </span>
            </button>
          </div>

          {/* Exchange Rates */}
          <div className="bg-black/40 backdrop-blur-sm border border-neonGreen/30 rounded-xl p-6 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="w-6 h-6 text-neonGreen" />
              <h3 className="text-xl font-semibold text-white">
                {language === 'ar' ? 'أسعار التحويل' : 'Exchange Rates'}
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-neonGreen/10 border border-neonGreen/30 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-neonGreen mb-2">1000</div>
                <p className="text-white/70 text-sm">
                  {language === 'ar' ? 'دقيقة = 1 LYRA' : 'Minutes = 1 LYRA'}
                </p>
              </div>
              
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-500 mb-2">100</div>
                <p className="text-white/70 text-sm">
                  {language === 'ar' ? 'LYRA = 1 TON' : 'LYRA = 1 TON'}
                </p>
              </div>
              
              <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-yellow-400 mb-2">0.01</div>
                <p className="text-white/70 text-sm">
                  {language === 'ar' ? 'TON = 1 LYRA' : 'TON = 1 LYRA'}
                </p>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-white/5 border border-white/10 rounded-lg">
              <p className="text-center text-white/70 text-sm">
                {language === 'ar' 
                  ? '⚠️ ملاحظة: أسعار التحويل ثابتة ولا تتغير'
                  : '⚠️ Note: Exchange rates are fixed and do not change'
                }
              </p>
            </div>
          </div>

          {/* Transaction History */}
          <div className="bg-black/40 backdrop-blur-sm border border-neonGreen/30 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <History className="w-6 h-6 text-neonGreen" />
              <h3 className="text-xl font-semibold text-white">
                {language === 'ar' ? 'سجل المعاملات' : 'Transaction History'}
              </h3>
            </div>
            
            {loadingTransactions ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-2 border-neonGreen border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-white/70">
                  {language === 'ar' ? 'جاري تحميل المعاملات...' : 'Loading transactions...'}
                </p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8 bg-black/20 rounded-lg border border-white/10">
                <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <History className="w-8 h-8 text-white/40" />
                </div>
                <h4 className="text-lg font-medium text-white mb-2">
                  {language === 'ar' ? 'لا توجد معاملات' : 'No Transactions'}
                </h4>
                <p className="text-white/60 text-sm">
                  {language === 'ar' 
                    ? 'لم تقم بأي عمليات تحويل بعد'
                    : 'You haven\'t made any exchanges yet'
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {transactions.map((tx) => (
                  <div 
                    key={tx.id} 
                    className="bg-black/30 border border-white/10 rounded-lg p-4 hover:border-neonGreen/30 transition-all duration-300"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          tx.transactionType === 'buy_with_ton' 
                            ? 'bg-blue-500/20 text-blue-500' 
                            : tx.transactionType === 'sell_for_ton'
                            ? 'bg-purple-500/20 text-purple-500'
                            : 'bg-yellow-400/20 text-yellow-400'
                        }`}>
                          {tx.transactionType === 'buy_with_ton' 
                            ? <Wallet className="w-4 h-4" />
                            : tx.transactionType === 'sell_for_ton'
                            ? <Zap className="w-4 h-4" />
                            : <Clock className="w-4 h-4" />
                          }
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {getTransactionTypeText(tx.transactionType)}
                          </p>
                          <p className="text-white/50 text-xs">
                            {formatDate(tx.createdAt)}
                          </p>
                        </div>
                      </div>
                      
                      <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(tx.status)}`}>
                        {getStatusText(tx.status)}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <span className="text-lg">{getCurrencyIcon(tx.currencyIn)}</span>
                        <span className="text-white/80">
                          {tx.amountIn.toLocaleString()} {tx.currencyIn}
                        </span>
                      </div>
                      
                      <ArrowRightLeft className="w-4 h-4 text-white/40 mx-2" />
                      
                      <div className="flex items-center gap-1">
                        <span className="text-lg">{getCurrencyIcon(tx.currencyOut)}</span>
                        <span className={`${tx.status === 'completed' ? 'text-neonGreen font-medium' : 'text-white/80'}`}>
                          {tx.amountOut.toLocaleString()} {tx.currencyOut}
                        </span>
                      </div>
                    </div>
                    
                    {tx.transactionHash && (
                      <div className="mt-2 pt-2 border-t border-white/10">
                        <p className="text-white/50 text-xs">
                          {language === 'ar' ? 'Hash المعاملة:' : 'Transaction Hash:'} 
                          <span className="text-blue-400 ml-1 break-all">{tx.transactionHash.substring(0, 20)}...</span>
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* How It Works */}
          <div className="mt-8 bg-black/40 backdrop-blur-sm border border-neonGreen/30 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              {language === 'ar' ? 'كيف يعمل نظام التحويل' : 'How Exchange Works'}
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-neonGreen rounded-full flex items-center justify-center text-black font-bold text-sm">1</div>
                <p className="text-white/80 text-sm">
                  {language === 'ar' 
                    ? 'شراء LYRA باستخدام TON: اربط محفظتك وأرسل TON للحصول على LYRA (1 TON = 100 LYRA)'
                    : 'Buy LYRA with TON: Connect your wallet and send TON to get LYRA (1 TON = 100 LYRA)'
                  }
                </p>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-neonGreen rounded-full flex items-center justify-center text-black font-bold text-sm">2</div>
                <p className="text-white/80 text-sm">
                  {language === 'ar' 
                    ? 'تحويل الدقائق إلى LYRA: حول دقائقك المكتسبة إلى عملة LYRA (1000 دقيقة = 1 LYRA)'
                    : 'Convert Minutes to LYRA: Convert your earned minutes to LYRA coins (1000 minutes = 1 LYRA)'
                  }
                </p>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-neonGreen rounded-full flex items-center justify-center text-black font-bold text-sm">3</div>
                <p className="text-white/80 text-sm">
                  {language === 'ar' 
                    ? 'بيع LYRA مقابل TON: بيع عملة LYRA واستلم TON في محفظتك (1 LYRA = 0.01 TON)'
                    : 'Sell LYRA for TON: Sell LYRA coins and receive TON in your wallet (1 LYRA = 0.01 TON)'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Exchange Modal */}
      <ExchangeModal
        isOpen={showExchangeModal}
        onClose={() => setShowExchangeModal(false)}
        userMinutes={profile?.total_minutes || 0}
        userLyraBalance={profile?.lyra_balance || 0}
        onExchangeComplete={handleExchangeComplete}
      />
    </div>
  );
};

export default ExchangePage;