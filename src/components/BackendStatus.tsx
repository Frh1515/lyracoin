import React from 'react';
import { useBackendHealth } from '../hooks/useBackendHealth';
import { useLanguage } from '../context/LanguageContext';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

const BackendStatus: React.FC = () => {
  const { isHealthy, isChecking, error } = useBackendHealth();
  const { language } = useLanguage();

  if (isChecking) {
    return (
      <div className="fixed top-16 left-4 z-40 bg-yellow-400/20 border border-yellow-400/30 rounded-lg p-2 flex items-center gap-2">
        <Clock className="w-4 h-4 text-yellow-400 animate-spin" />
        <span className="text-yellow-400 text-xs">
          {language === 'ar' ? 'فحص الاتصال...' : 'Checking connection...'}
        </span>
      </div>
    );
  }

  if (isHealthy === false) {
    return (
      <div className="fixed top-16 left-4 z-40 bg-red-500/20 border border-red-500/30 rounded-lg p-2 flex items-center gap-2">
        <XCircle className="w-4 h-4 text-red-400" />
        <span className="text-red-400 text-xs">
          {language === 'ar' ? 'خطأ في الاتصال' : 'Connection error'}
        </span>
      </div>
    );
  }

  if (isHealthy === true) {
    return (
      <div className="fixed top-16 left-4 z-40 bg-green-400/20 border border-green-400/30 rounded-lg p-2 flex items-center gap-2">
        <CheckCircle className="w-4 h-4 text-green-400" />
        <span className="text-green-400 text-xs">
          {language === 'ar' ? 'متصل' : 'Connected'}
        </span>
      </div>
    );
  }

  return null;
};

export default BackendStatus;