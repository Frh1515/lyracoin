import React, { useState, useEffect, memo } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { CheckCircle, XCircle, Wifi, WifiOff, RefreshCw } from 'lucide-react';

const BackendStatus: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastChecked, setLastChecked] = useState<Date>(new Date());
  const { language } = useLanguage();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setLastChecked(new Date());
    };

    const handleOffline = () => {
      setIsOnline(false);
      setLastChecked(new Date());
    };

    // Listen for online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check connection periodically
    const interval = setInterval(() => {
      setIsOnline(navigator.onLine);
      setLastChecked(new Date());
    }, 30000); // Check every 30 seconds

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const refresh = () => {
    setIsOnline(navigator.onLine);
    setLastChecked(new Date());
  };

  // Show error state for offline
  if (!isOnline) {
    return (
      <div className="fixed top-16 left-4 z-40 bg-red-500/20 border border-red-500/30 rounded-lg p-2 max-w-xs">
        <div className="flex items-center gap-2 mb-1">
          <WifiOff className="w-4 h-4 text-red-400" />
          <span className="text-red-400 text-xs font-medium">
            {language === 'ar' ? 'لا يوجد اتصال بالإنترنت' : 'No Internet Connection'}
          </span>
          <button
            onClick={refresh}
            className="ml-auto text-red-400 hover:text-red-300 transition"
            aria-label="Refresh connection status"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
        <div className="text-red-300 text-xs opacity-80">
          {language === 'ar' 
            ? 'تحقق من اتصالك بالإنترنت وحاول مرة أخرى'
            : 'Check your internet connection and try again'
          }
        </div>
        <div className="text-red-300 text-xs opacity-60 mt-1">
          {language === 'ar' ? 'آخر فحص:' : 'Last check:'} {lastChecked.toLocaleTimeString()}
        </div>
      </div>
    );
  }

  // Show success state (auto-hide after 5 seconds)
  return (
    <div className="fixed top-16 left-4 z-40 bg-green-400/20 border border-green-400/30 rounded-lg p-2">
      <div className="flex items-center gap-2">
        <Wifi className="w-4 h-4 text-green-400" />
        <span className="text-green-400 text-xs">
          {language === 'ar' ? 'متصل بالإنترنت' : 'Connected to Internet'}
        </span>
        <button
          onClick={refresh}
          className="ml-2 text-green-400 hover:text-green-300 transition"
          aria-label="Refresh connection status"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

export default memo(BackendStatus);