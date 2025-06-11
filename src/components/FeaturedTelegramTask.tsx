import React, { useEffect } from 'react';
import { FaTelegram } from 'react-icons/fa6';

interface FeaturedTelegramTaskProps {
  onClose: () => void;
  onReward: () => void;
}

const FeaturedTelegramTask: React.FC<FeaturedTelegramTaskProps> = ({ onClose, onReward }) => {
  useEffect(() => {
    const timeout = setTimeout(() => {
      onClose();
    }, 60000); // Auto-close after 60 seconds

    return () => clearTimeout(timeout);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0d1f16] p-6 rounded-xl w-full max-w-sm border border-cyan-400 drop-shadow-[0_0_15px_#00FFFF] relative text-white text-center">
        <img src="/publiclogo.png" alt="LYRA COIN" className="w-16 h-16 mx-auto mb-4 drop-shadow-[0_0_20px_cyan]" />
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