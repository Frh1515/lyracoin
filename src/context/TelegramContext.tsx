import React, { createContext, useContext, useEffect, useState } from 'react';
import { registerUser } from '../../lib/supabase/registerUser';
import toast from 'react-hot-toast';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

interface TelegramContextType {
  user: TelegramUser | null;
  isLoading: boolean;
  error: string | null;
  isDev: boolean;
  isAuthenticated: boolean;
}

const TelegramContext = createContext<TelegramContextType | undefined>(undefined);

// Mock user for development
const mockUser: TelegramUser = {
  id: 12345,
  first_name: 'Dev',
  username: 'dev_user',
  language_code: 'en'
};

export function TelegramProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDev, setIsDev] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const initTelegram = async () => {
      try {
        // Check if running in Telegram WebApp
        const webApp = window.Telegram?.WebApp;
        const telegramUser = webApp?.initDataUnsafe?.user;

        // Debug log
        console.log('Telegram WebApp initialization:', {
          webApp: !!webApp,
          user: telegramUser,
          platform: webApp?.platform,
          isDev: import.meta.env.DEV
        });

        // Allow development mode without Telegram WebApp
        if (import.meta.env.DEV && (!webApp || !telegramUser?.id)) {
          console.log('Running in development mode with mock user');
          const { success, user: registeredUser, error: registerError } = await registerUser(
            mockUser.id.toString(),
            mockUser.username
          );

          if (!success || registerError) {
            console.error('Dev mode registration failed:', registerError);
            throw new Error(registerError?.message || 'Failed to register mock user');
          }

          setUser(mockUser);
          setIsDev(true);
          setIsAuthenticated(true);
          setError(null);
          setIsLoading(false);
          return;
        }

        // Enforce strict Telegram WebApp initialization in production
        if (!webApp || !telegramUser?.id) {
          throw new Error('Telegram WebApp not initialized correctly. Please open from Telegram bot button.');
        }

        // Initialize Telegram WebApp
        webApp.ready();
        webApp.expand();

        // Register user with Supabase using string ID
        const { success, user: registeredUser, error: registerError } = await registerUser(
          telegramUser.id.toString(),
          telegramUser.username
        );

        if (!success || registerError) {
          console.error('Registration failed:', registerError);
          throw new Error(registerError?.message || 'Failed to register user');
        }

        console.log('User registered successfully:', registeredUser);

        // Update context state
        setUser(telegramUser);
        setIsDev(false);
        setIsAuthenticated(true);
        setError(null);

      } catch (err) {
        console.error('Telegram initialization error:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize Telegram WebApp');
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    initTelegram();
  }, []);

  return (
    <TelegramContext.Provider value={{ user, isLoading, error, isDev, isAuthenticated }}>
      {children}
    </TelegramContext.Provider>
  );
}

export function useTelegram() {
  const context = useContext(TelegramContext);
  if (context === undefined) {
    throw new Error('useTelegram must be used within a TelegramProvider');
  }
  return context;
}