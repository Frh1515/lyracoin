import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import BottomNavbar from './components/BottomNavbar';
import SplashScreen from './components/SplashScreen';
import FeaturedTelegramTask from './components/FeaturedTelegramTask';
import OnboardingTour from './components/OnboardingTour';
import { useOnboarding } from './hooks/useOnboarding';
import { LanguageProvider } from './context/LanguageContext';
import { TelegramProvider, useTelegram } from './context/TelegramContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import LanguageSelector from './components/LanguageSelector';
import { getUserProfile } from '../lib/supabase/getUserProfile';

// Lazy load pages for code splitting
const HomePage = lazy(() => import('./pages/HomePage'));
const TasksPage = lazy(() => import('./pages/TasksPage'));
const NewTaskPage = lazy(() => import('./pages/NewTaskPage'));
const PricesPage = lazy(() => import('./pages/PricesPage'));
const ReferralsPage = lazy(() => import('./pages/ReferralsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#041e11] via-[#051a13] to-[#040d0c]">
    <div className="text-neonGreen animate-pulse">Loading...</div>
  </div>
);

function AppContent() {
  const [showSplash, setShowSplash] = useState(true);
  const [showTelegramTask, setShowTelegramTask] = useState(false);
  const [userMinutes, setUserMinutes] = useState(0);
  const [userPoints, setUserPoints] = useState(0);
  const [userLevel, setUserLevel] = useState('bronze');
  const { user, isLoading, error, isDev, isAuthenticated } = useTelegram();
  const { isFirstVisit, completeOnboarding } = useOnboarding();

  // Fetch user profile and set initial data
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (isAuthenticated) {
        try {
          const { data } = await getUserProfile();
          if (data) {
            setUserMinutes(data.total_minutes);
            setUserPoints(data.points);
            setUserLevel(data.membership_level);
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

  // Function to update points when earned from tasks, games, or referrals
  const handlePointsEarned = (pointsEarned: number) => {
    setUserPoints(prev => {
      const newPoints = prev + pointsEarned;
      // Update level based on new points
      if (newPoints >= 1001) {
        setUserLevel('platinum');
      } else if (newPoints >= 501) {
        setUserLevel('gold');
      } else if (newPoints >= 201) {
        setUserLevel('silver');
      } else {
        setUserLevel('bronze');
      }
      return newPoints;
    });
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
      
      {/* Onboarding Tour */}
      {!showSplash && !showTelegramTask && (
        <OnboardingTour 
          isFirstVisit={isFirstVisit} 
          onComplete={completeOnboarding} 
        />
      )}
      
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={
            <HomePage 
              userMinutes={userMinutes} 
              userPoints={userPoints}
              userLevel={userLevel}
            />
          } />
          <Route path="/tasks" element={
            <ProtectedRoute>
              <TasksPage 
                onMinutesEarned={handleMinutesEarned}
                onPointsEarned={handlePointsEarned}
              />
            </ProtectedRoute>
          } />
          <Route path="/new-task" element={
            <ProtectedRoute>
              <NewTaskPage />
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
      </Suspense>
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