import React, { useState, useEffect } from 'react';

const SplashScreen: React.FC = () => {
  const [progress, setProgress] = useState(0);

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

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-[#041e11] via-[#051a13] to-[#040d0c] flex flex-col items-center justify-center text-white z-50">
      <div
        className={`w-24 h-24 mb-4 drop-shadow-[0_0_30px_#00FF88] transition-all duration-1000 ${
          progress >= 60 ? 'translate-y-[-20px] opacity-100' : 'translate-y-4 opacity-0'
        }`}
      >
        <img 
          src="/publiclogo.png" 
          alt="LYRA COIN" 
          className="w-full h-full object-contain rounded-full animate-pulse" 
          loading="lazy"
        />
      </div>
      <h2 className="text-lg font-semibold mb-6">Get ready, your LYRA journey begins now...</h2>
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