import React from 'react';
import { useBackendHealth } from '../hooks/useBackendHealth';
import { useLanguage } from '../context/LanguageContext';
import { CheckCircle, XCircle, Clock, RefreshCw, Wifi, WifiOff } from 'lucide-react';

const BackendStatus: React.FC = () => {
  const { isHealthy, isChecking, error, healthData, lastChecked, refresh } = useBackendHealth();
  const { language } = useLanguage();

  // Don't show anything if we're still checking initially
  if (isChecking && isHealthy === null) {
    return (
      <div className="fixed top-16 left-4 z-40 bg-yellow-400/20 border border-yellow-400/30 rounded-lg p-2 flex items-center gap-2">
        <Clock className="w-4 h-4 text-yellow-400 animate-spin" />
        <span className="text-yellow-400 text-xs">
          {language === 'ar' ? 'فحص الاتصال...' : 'Checking connection...'}
        </span>
      </div>
    );
  }

  // Show error state
  if (isHealthy === false) {
    return (
      <div className="fixed top-16 left-4 z-40 bg-red-500/20 border border-red-500/30 rounded-lg p-2 max-w-xs">
        <div className="flex items-center gap-2 mb-1">
          <WifiOff className="w-4 h-4 text-red-400" />
          <span className="text-red-400 text-xs font-medium">
            {language === 'ar' ? 'خطأ في الاتصال' : 'Connection Error'}
          </span>
          <button
            onClick={refresh}
            className="ml-auto text-red-400 hover:text-red-300 transition"
            disabled={isChecking}
          >
            <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
          </button>
        </div>
        {error && (
          <div className="text-red-300 text-xs opacity-80 break-words">
            {error}
          </div>
        )}
        {lastChecked && (
          <div className="text-red-300 text-xs opacity-60 mt-1">
            {language === 'ar' ? 'آخر فحص:' : 'Last check:'} {lastChecked.toLocaleTimeString()}
          </div>
        )}
      </div>
    );
  }

  // Show success state (auto-hide after 5 seconds)
  if (isHealthy === true) {
    return (
      <div className="fixed top-16 left-4 z-40 bg-green-400/20 border border-green-400/30 rounded-lg p-2">
        <div className="flex items-center gap-2">
          <Wifi className="w-4 h-4 text-green-400" />
          <span className="text-green-400 text-xs">
            {language === 'ar' ? 'متصل' : 'Connected'}
          </span>
          {healthData && (
            <span className="text-green-300 text-xs opacity-80">
              ({healthData.status})
            </span>
          )}
          <button
            onClick={refresh}
            className="ml-2 text-green-400 hover:text-green-300 transition"
            disabled={isChecking}
          >
            <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default BackendStatus;