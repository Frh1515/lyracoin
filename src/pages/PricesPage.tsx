import React, { useState, useEffect, useRef, memo } from 'react';
import { useLanguage } from '../context/LanguageContext';

interface Coin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
}

const PricesPage: React.FC = () => {
  const [coins, setCoins] = useState<Coin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const { language } = useLanguage();

  // Pull to refresh state
  const touchStartY = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchCoinData = async () => {
    try {
      const response = await fetch(
        'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=25&page=1&sparkline=false'
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }

      const data = await response.json();
      setCoins(data);
      setLastUpdated(new Date());
      setLoading(false);
      setIsRefreshing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Auto refresh every 30 seconds
  useEffect(() => {
    fetchCoinData();
    const interval = setInterval(fetchCoinData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Pull to refresh handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartY.current) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartY.current;

    if (diff > 40 && containerRef.current?.scrollTop === 0 && !isRefreshing) {
      setIsRefreshing(true);
      fetchCoinData();
    }
  };

  const handleTouchEnd = () => {
    touchStartY.current = null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#041e11] via-[#051a13] to-[#040d0c] flex items-center justify-center">
        <div className="text-center text-neonGreen">
          {language === 'ar' ? 'جارٍ تحميل الأسعار...' : 'Loading prices...'}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#041e11] via-[#051a13] to-[#040d0c] flex items-center justify-center">
        <div className="text-center text-red-500">
          {language === 'ar' 
            ? 'فشل في تحميل البيانات. يرجى المحاولة مرة أخرى لاحقاً.' 
            : 'Failed to load data. Please try again later.'}
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="min-h-screen bg-gradient-to-b from-[#041e11] via-[#051a13] to-[#040d0c] px-4 py-8 text-white overflow-y-auto"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {isRefreshing && (
        <div className="text-neonGreen text-center py-2 animate-pulse">
          {language === 'ar' ? 'جارٍ التحديث...' : 'Refreshing...'}
        </div>
      )}

      <h1 className="text-2xl font-bold mb-6 text-center drop-shadow-[0_0_10px_#00FF88]">
        {language === 'ar' ? '📊 أسعار أفضل 25 عملة مشفرة' : '📊 Top 25 Crypto Prices'}
      </h1>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-7xl mx-auto">
        {coins.map((coin) => (
          <div
            key={coin.id}
            className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4 hover:scale-[1.02] transition duration-300 hover:border-neonGreen/30 hover:drop-shadow-[0_0_10px_#00FF88]"
          >
            <img 
              src={coin.image} 
              alt={coin.name} 
              className="w-8 h-8"
              loading="lazy"
              width="32"
              height="32"
            />
            <div>
              <h2 className="font-semibold">
                {coin.name} ({coin.symbol.toUpperCase()})
              </h2>
              <p className="text-sm text-neonGreen">
                ${coin.current_price.toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-white/50 text-center mt-6">
        {language === 'ar' 
          ? `آخر تحديث: ${lastUpdated.toLocaleTimeString('ar-SA')}`
          : `Last updated: ${lastUpdated.toLocaleTimeString()}`}
      </p>
    </div>
  );
};

export default memo(PricesPage);