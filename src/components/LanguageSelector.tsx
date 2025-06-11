import React, { useState } from 'react';
import { Globe } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const LanguageSelector: React.FC = () => {
  const [showDropdown, setShowDropdown] = useState(false);
  const { language, changeLanguage } = useLanguage();

  const handleLanguageChange = (lang: 'en' | 'ar') => {
    changeLanguage(lang);
    setShowDropdown(false);
  };

  return (
    <div className="fixed top-4 left-4 z-50">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="p-2 rounded-full bg-darkGreen/50 backdrop-blur-sm border border-neonGreen/30 text-white hover:scale-110 transition duration-300 shadow-glow"
      >
        <Globe className="w-5 h-5" />
      </button>
      
      {showDropdown && (
        <div className="absolute left-0 mt-2 w-32 bg-darkGreen/90 backdrop-blur-sm border border-neonGreen/30 rounded-lg shadow-glow">
          <button
            onClick={() => handleLanguageChange('en')}
            className={`w-full px-4 py-2 text-left hover:bg-neonGreen/10 text-white rounded-t-lg ${
              language === 'en' ? 'text-neonGreen' : ''
            }`}
          >
            English
          </button>
          <button
            onClick={() => handleLanguageChange('ar')}
            className={`w-full px-4 py-2 text-left hover:bg-neonGreen/10 text-white rounded-b-lg ${
              language === 'ar' ? 'text-neonGreen' : ''
            }`}
          >
            العربية
          </button>
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;