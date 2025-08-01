import React, { useEffect, useState } from 'react';
import { FaTelegram } from 'react-icons/fa6';

interface FeaturedTelegramTaskProps {
  onClose: () => void;
  onReward: () => void;
}

const FeaturedTelegramTask: React.FC<FeaturedTelegramTaskProps> = ({ onClose, onReward }) => {
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      onClose();
    }, 60000); // Auto-close after 60 seconds

    return () => clearTimeout(timeout);
  }, [onClose]);

  const handleLogoError = () => {
    setLogoError(true);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0d1f16] p-6 rounded-xl w-full max-w-sm border border-cyan-400 drop-shadow-[0_0_15px_#00FFFF] relative text-white text-center">
        {!logoError ? (
          <img 
            src="/publiclogo.png" 
            alt="LYRA COIN" 
            className="w-20 h-20 mx-auto mb-4 drop-shadow-[0_0_25px_cyan] rounded-full border-2 border-cyan-400/50 shadow-[0_0_15px_rgba(0,255,255,0.3)]" 
            loading="lazy"
            width="80"
            height="80"
            onError={handleLogoError}
          />
        ) : (
          // Fallback logo using CSS and text
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-full flex items-center justify-center drop-shadow-[0_0_25px_cyan] border-2 border-cyan-400/50 shadow-[0_0_15px_rgba(0,255,255,0.3)]">
            <div className="text-center">
              <div className="text-black font-bold text-base leading-tight">LYRA</div>
              <div className="text-black font-bold text-sm">COIN</div>
            </div>
          </div>
        )}
        <h2 className="text-xl font-bold">📢 Join Our Telegram</h2>
        <p className="mt-2">Subscribe to our official channel and earn your first 60 minutes!</p>
        <div className="mt-6 flex flex-col gap-3">
          <a
            href="https://t.me/LYRACoinBot"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded bg-cyan-400 text-black font-semibold hover:brightness-110 transition"
            onClick={onReward}
          >
            <FaTelegram className="w-5 h-5" />
            Join Now
          </a>
          <button
            className="text-sm text-white/60 hover:text-white transition"
            onClick={onClose}
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}

export default FeaturedTelegramTask;