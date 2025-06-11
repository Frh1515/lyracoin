import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import HomePage from './pages/HomePage';
import TasksPage from './pages/TasksPage';
import PricesPage from './pages/PricesPage';
import ReferralsPage from './pages/ReferralsPage';
import ProfilePage from './pages/ProfilePage';
import BottomNavbar from './components/BottomNavbar';
import SplashScreen from './components/SplashScreen';
import FeaturedTelegramTask from './components/FeaturedTelegramTask';
import { LanguageProvider } from './context/LanguageContext';
import { TelegramProvider, useTelegram } from './context/TelegramContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import LanguageSelector from './components/LanguageSelector';

function AppContent() {
  const [showSplash, setShowSplash] = useState(true);
  const [showTelegramTask, setShowTelegramTask] = useState(false);
  const [userMinutes, setUserMinutes] = useState(0);
  const { user, isLoading, error, isDev } = useTelegram();

  useEffect(() => {
    const splashTimer = setTimeout(() => {
      setShowSplash(false);
      setShowTelegramTask(true);
    }, 5000);

    return () => clearTimeout(splashTimer);
  }, []);

  const handleTelegramTaskClose = () => {
    setShowTelegramTask(false);
  };

  const handleTelegramReward = () => {
    setUserMinutes(prev => prev + 60);
    handleTelegramTaskClose();
  };

  if (isLoading) {
    return <SplashScreen />;
  }

  if (error && !isDev) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#041e11] via-[#051a13] to-[#040d0c]">
        <div className="bg-red-500/10 border border-red-500 rounded-lg p-6 text-center">
          <p className="text-red-500">{error}</p>
          <p className="text-sm text-white/60 mt-2">
            Please open this app from the Telegram bot: {' '}
            <a 
              href="https://t.me/LyraCoinBot"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neonGreen hover:underline"
            >
              @LyraCoinBot
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-center" />
      <LanguageSelector />
      {showSplash && <SplashScreen />}
      {!showSplash && showTelegramTask && (
        <FeaturedTelegramTask 
          onClose={handleTelegramTaskClose}
          onReward={handleTelegramReward}
        />
      )}
      <Routes>
        <Route path="/" element={<HomePage userMinutes={userMinutes} />} />
        <Route path="/tasks" element={<ProtectedRoute><TasksPage /></ProtectedRoute>} />
        <Route path="/prices" element={<PricesPage />} />
        <Route path="/referrals" element={<ProtectedRoute><ReferralsPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      </Routes>
      <BottomNavbar />
    </>
  );
}

function App() {
  return (
    <TelegramProvider>
      <LanguageProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </LanguageProvider>
    </TelegramProvider>
  );
}

export default App;