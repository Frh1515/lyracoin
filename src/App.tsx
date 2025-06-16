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
import { getUserProfile } from '../lib/supabase/getUserProfile';

function AppContent() {
  const [showSplash, setShowSplash] = useState(true);
  const [showTelegramTask, setShowTelegramTask] = useState(false);
  const [userMinutes, setUserMinutes] = useState(0);
  const [userPoints, setUserPoints] = useState(0);
  const { user, isLoading, error, isDev, isAuthenticated } = useTelegram();

  // Fetch user profile and set initial minutes and points
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (isAuthenticated) {
        try {
          const { data } = await getUserProfile();
          if (data) {
            setUserMinutes(data.total_minutes);
            setUserPoints(data.points);
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      }
    };

    fetchUserProfile();
  }, [isAuthenticated]);

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

  // Function to update minutes when earned from games or referrals
  const handleMinutesEarned = (minutesEarned: number) => {
    setUserMinutes(prev => prev + minutesEarned);
  };

  // Function to update points when earned from tasks or referrals
  const handlePointsEarned = (pointsEarned: number) => {
    setUserPoints(prev => prev + pointsEarned);
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
        <Route path="/" element={<HomePage userMinutes={userMinutes} userPoints={userPoints} />} />
        <Route path="/tasks" element={
          <ProtectedRoute>
            <TasksPage 
              onMinutesEarned={handleMinutesEarned} 
              onPointsEarned={handlePointsEarned}
            />
          </ProtectedRoute>
        } />
        <Route path="/prices" element={<PricesPage />} />
        <Route path="/referrals" element={
          <ProtectedRoute>
            <ReferralsPage 
              onMinutesEarned={handleMinutesEarned}
              onPointsEarned={handlePointsEarned}
            />
          </ProtectedRoute>
        } />
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