import React, { useState } from 'react';
import { X, Key, Check, AlertCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface PasswordInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (password: string) => void;
  taskTitle: string;
  taskLink: string;
  platform: string;
}

const PasswordInputModal: React.FC<PasswordInputModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  taskTitle,
  taskLink,
  platform
}) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { language } = useLanguage();

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError(language === 'ar' ? 'يرجى إدخال كلمة المرور' : 'Please enter the password');
      return;
    }
    
    onSubmit(password);
  };

  const getPlatformColor = () => {
    return platform === 'youtube' 
      ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]' 
      : 'border-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.3)]';
  };

  const getPlatformIcon = () => {
    return platform === 'youtube' 
      ? '/icons/youtube.png' 
      : '/icons/tiktok.png';
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`bg-darkGreen border-2 ${getPlatformColor()} rounded-xl p-6 w-full max-w-md relative`}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/60 hover:text-white transition"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-black/30 flex items-center justify-center">
            <Key className="w-8 h-8 text-yellow-400" />
          </div>
          <h2 className="text-xl font-bold text-white">
            {language === 'ar' ? 'أدخل كلمة المرور' : 'Enter Password'}
          </h2>
          <p className="text-white/60 text-sm mt-2">
            {language === 'ar' 
              ? 'كلمة المرور موجودة في الفيديو الذي شاهدته للتو'
              : 'The password is shown in the video you just watched'
            }
          </p>
        </div>

        <div className="bg-black/30 p-4 rounded-lg mb-4 text-sm text-white/70">
          <div className="flex items-center gap-2 mb-2">
            <img 
              src={getPlatformIcon()} 
              alt={platform} 
              className="w-5 h-5"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <span className="font-medium">{taskTitle}</span>
          </div>
          <div className="text-xs break-all">
            {language === 'ar' ? 'الرابط:' : 'Link:'} {taskLink}
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-white/70 text-sm font-medium mb-2">
              {language === 'ar' ? 'كلمة المرور' : 'Password'}
            </label>
            <input
              type="text"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              className="w-full bg-black/30 border border-white/20 rounded-lg px-4 py-3 text-white focus:border-neonGreen focus:outline-none transition"
              placeholder={language === 'ar' ? 'أدخل كلمة المرور: HOERLYRACOIN' : 'Enter password: HOERLYRACOIN'}
            />
          </div>

          <div className="bg-yellow-400/20 border border-yellow-400/30 rounded-lg p-3 mb-4">
            <p className="text-yellow-400 text-sm font-medium">
              {language === 'ar' 
                ? '💡 تلميح: كلمة المرور هي HOERLYRACOIN'
                : '💡 Hint: The password is HOERLYRACOIN'
              }
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              className="flex-1 bg-neonGreen text-black font-semibold py-3 rounded-lg hover:brightness-110 transition flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              {language === 'ar' ? 'تأكيد' : 'Confirm'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-transparent border border-white/30 text-white/70 py-3 rounded-lg hover:bg-white/5 transition"
            >
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PasswordInputModal;