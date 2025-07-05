import React, { useState, useEffect } from 'react';

const SplashScreen: React.FC = () => {
  const [progress, setProgress] = useState(0);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        return prev + 2;
      });
    }, 100);

    return () => clearInterval(timer);
  }, []);

  const handleLogoError = () => {
    setLogoError(true);
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-[#041e11] via-[#051a13] to-[#040d0c] flex flex-col items-center justify-center text-white z-50">
      <div
        className={`w-48 h-48 mb-8 drop-shadow-[0_0_50px_#00FF88] transition-all duration-1000 ${
          progress >= 60 ? 'translate-y-[-20px] opacity-100' : 'translate-y-4 opacity-0'
        }`}
      >
        {!logoError ? (
          <img 
            src="/publiclogo.png" 
            alt="LYRA COIN" 
            className="w-full h-full object-contain rounded-full animate-pulse border-4 border-neonGreen/50 shadow-[0_0_30px_rgba(0,255,136,0.5)]" 
            loading="lazy"
            onError={handleLogoError}
          />
        ) : (
          // Fallback logo using CSS and text
          <div className="w-full h-full bg-gradient-to-br from-[#00FF88] to-[#00e078] rounded-full flex items-center justify-center animate-pulse border-4 border-neonGreen/50 shadow-[0_0_30px_rgba(0,255,136,0.5)]">
            <div className="text-center">
              <div className="text-black font-bold text-3xl leading-tight">LYRA</div>
              <div className="text-black font-bold text-xl">COIN</div>
            </div>
          </div>
        )}
      </div>
      <h2 className="text-xl font-semibold mb-8 text-center px-4">Get ready, your LYRA journey begins now...</h2>
      <div className="w-64 h-2 bg-white/20 rounded-full overflow-hidden">
        <div
          className="h-full bg-neonGreen transition-all duration-100 linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

export default SplashScreen;