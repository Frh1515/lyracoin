import React, { createContext, useContext, useEffect, useState } from 'react';
import { registerUser } from '../../lib/supabase/registerUser';
import { processReferral } from '../../lib/supabase/processReferral';
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
        // Wait for Telegram WebApp to be available
        await new Promise<void>(resolve => {
          if (window.Telegram?.WebApp) {
            resolve();
          } else {
            const checkTelegram = () => {
              if (window.Telegram?.WebApp) {
                resolve();
              } else {
                setTimeout(checkTelegram, 100);
              }
            };
            checkTelegram();
          }
        });

        const webApp = window.Telegram?.WebApp;
        const telegramUser = webApp?.initDataUnsafe?.user;
        const startParam = webApp?.initDataUnsafe?.start_param;

        console.log('Telegram WebApp initialization:', {
          webApp: !!webApp,
          user: telegramUser,
          startParam,
          platform: webApp?.platform,
          isDev: import.meta.env.DEV,
          initData: webApp?.initData
        });

        // Allow development mode without Telegram WebApp
        if (import.meta.env.DEV && (!webApp || !telegramUser?.id)) {
          console.log('Running in development mode with mock user');
          
          try {
            const { success, user: registeredUser, error: registerError } = await registerUser(
              mockUser.id.toString(),
              mockUser.username
            );

            if (!success || registerError) {
              console.error('Dev mode registration failed:', registerError);
              console.warn('Continuing with mock user despite registration error');
            } else {
              console.log('Dev user registered successfully:', registeredUser);
            }

            setUser(mockUser);
            setIsDev(true);
            setIsAuthenticated(true);
            setError(null);
            setIsLoading(false);
            return;
          } catch (devError) {
            console.error('Dev mode error:', devError);
            setUser(mockUser);
            setIsDev(true);
            setIsAuthenticated(true);
            setError(null);
            setIsLoading(false);
            return;
          }
        }

        // Check if we have valid Telegram data
        if (!webApp || !telegramUser?.id) {
          throw new Error('Telegram WebApp not initialized correctly. Please open from Telegram bot button.');
        }

        // Initialize Telegram WebApp
        webApp.ready();
        webApp.expand();
        
        // Set theme
        if (webApp.colorScheme === 'dark') {
          document.documentElement.classList.add('dark');
        }

        // Register user with Supabase using RPC function
        const { success, user: registeredUser, error: registerError } = await registerUser(
          telegramUser.id.toString(),
          telegramUser.username
        );

        if (!success || registerError) {
          console.error('Registration failed:', registerError);
          throw new Error(registerError?.message || 'Failed to register user');
        }

        console.log('User registered successfully:', registeredUser);

        // Handle referral if start parameter exists
        if (startParam) {
          console.log('Processing referral with start param:', startParam);
          
          try {
            const referralResult = await processReferral(
              startParam, // referrer's telegram_id
              telegramUser.id.toString() // referred user's telegram_id
            );

            if (referralResult.success) {
              toast.success(
                '🎉 Welcome! You\'ve been successfully referred!',
                { 
                  duration: 5000,
                  style: {
                    background: '#00FFAA',
                    color: '#000',
                    fontWeight: 'bold'
                  }
                }
              );
            } else {
              console.log('Referral processing result:', referralResult.message);
              // Don't show error toast for referral issues, just log them
            }
          } catch (referralError) {
            console.error('Error processing referral:', referralError);
            // Don't show error for referral processing failures
          }
        }

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