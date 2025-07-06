import React, { useState } from 'react';
import { X, Wallet, ArrowRightLeft, Clock, Zap, ExternalLink } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import ExchangeModal from './ExchangeModal';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

interface ChargeBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  userMinutes: number;
  userLyraBalance: number;
  onMinutesConverted: (minutesConverted: number, lyraEarned: number) => void;
}

type ModalView = 'main' | 'ton-wallet' | 'minutes-exchange';

const ChargeBalanceModal: React.FC<ChargeBalanceModalProps> = ({
  isOpen,
  onClose,
  userMinutes,
  userLyraBalance,
  onMinutesConverted
}) => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<ModalView>('main');
  const [showExchangeModal, setShowExchangeModal] = useState(false);

  if (!isOpen) return null;

  const handleExchangeComplete = (
    type: 'buy' | 'sell' | 'convert', 
    amountIn: number, 
    currencyIn: string, 
    amountOut: number, 
    currencyOut: string
  ) => {
    // Update parent component based on exchange type
    if (type === 'convert' && currencyIn === 'MINUTES' && currencyOut === 'LYRA') {
      onMinutesConverted(amountIn, amountOut);
    }
    
    // Close modals
    setShowExchangeModal(false);
    onClose();
  };

  const renderMainView = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-neonGreen rounded-full flex items-center justify-center mx-auto mb-4">
          <Wallet className="w-8 h-8 text-black" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          {language === 'ar' ? 'شحن رصيد LYRA' : 'Charge LYRA Balance'}
        </h2>
        <p className="text-white/60">
          {language === 'ar' 
            ? 'اختر طريقة شحن الرصيد'
            : 'Choose your charging method'
          }
        </p>
      </div>

      <div className="space-y-4">
        {/* TON Wallet Option */}
        <button 
          onClick={() => {
            onClose();
            setShowExchangeModal(true);
          }}
          className="w-full p-6 bg-black/40 border border-blue-500/30 rounded-xl hover:scale-105 transition duration-300 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-semibold text-white">
                {language === 'ar' ? 'شحن باستخدام TON' : 'Charge with TON'}
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

        {/* Minutes Exchange Option */}
        <button 
          onClick={() => {
            onClose();
            setShowExchangeModal(true);
          }}
          className="w-full p-6 bg-black/40 border border-yellow-400/30 rounded-xl hover:scale-105 transition duration-300 shadow-[0_0_15px_rgba(255,204,21,0.3)]"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center">
              <ArrowRightLeft className="w-6 h-6 text-black" />
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
        
        {/* Exchange Modal */}
        {showExchangeModal && (
          <ExchangeModal
            isOpen={showExchangeModal}
            onClose={() => setShowExchangeModal(false)}
            userMinutes={userMinutes}
            userLyraBalance={userLyraBalance}
            onExchangeComplete={handleExchangeComplete}
          />
        )}
      </div>
    </div>
  );
};

export default ChargeBalanceModal;