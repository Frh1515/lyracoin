import React, { createContext, useContext, useEffect, useState } from 'react';
import { registerUser } from '../../lib/supabase/registerUser';
import { supabase } from '../../lib/supabase/client';
import { registerReferral } from '../../lib/supabase/registerReferral';
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
        console.log('🚀 بدء تهيئة Telegram WebApp...');
        
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

        console.log('📱 معلومات Telegram WebApp:', {
          webApp: !!webApp,
          user: telegramUser,
          startParam,
          platform: webApp?.platform,
          isDev: import.meta.env.DEV,
          initData: webApp?.initData,
          initDataUnsafe: webApp?.initDataUnsafe
        });

        // Enhanced logging for referral debugging
        if (startParam) {
          console.log('🔗 تم العثور على معامل الإحالة:', {
            startParam,
            type: typeof startParam,
            length: startParam.length,
            isValid: startParam.length > 0
          });
        } else {
          console.log('❌ لم يتم العثور على معامل الإحالة (startParam)');
        }

        // Get or create Supabase auth session with error handling
        const getSupabaseAuthId = async (): Promise<string | null> => {
          try {
            // First, check if there's an existing session
            const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
            
            if (sessionError) {
              console.error('Error getting session:', sessionError);
              throw sessionError;
            }

            if (sessionData?.session?.user?.id) {
              console.log('🔑 استخدام جلسة Supabase موجودة:', sessionData.session.user.id);
              return sessionData.session.user.id;
            }

            // If no session exists, create anonymous auth session
            console.log('🔐 إنشاء جلسة Supabase جديدة...');
            const { data: authData, error: authError } = await supabase.auth.signInAnonymously();

            if (authError || !authData.user) {
              console.error('Anonymous auth error:', authError);
              throw authError || new Error('Failed to authenticate anonymously');
            }

            console.log('✅ تم إنشاء جلسة Supabase جديدة:', authData.user.id);
            return authData.user.id;
          } catch (error) {
            console.error('❌ خطأ في الاتصال بـ Supabase:', error);
            
            // In development mode, return null to allow fallback behavior
            if (import.meta.env.DEV) {
              console.log('🔧 وضع التطوير: المتابعة بدون Supabase');
              return null;
            }
            
            throw error;
          }
        };

        // Allow development mode without Telegram WebApp
        if (import.meta.env.DEV && (!webApp || !telegramUser?.id)) {
          console.log('🔧 تشغيل في وضع التطوير مع مستخدم وهمي');
          
          try {
            const supabaseAuthId = await getSupabaseAuthId();
            
            // Only try to register if we have a valid Supabase connection
            if (supabaseAuthId) {
              const { success, user: registeredUser, error: registerError } = await registerUser(
                mockUser.id.toString(),
                supabaseAuthId,
                mockUser.username
              );

              if (!success || registerError) {
                console.error('❌ فشل تسجيل المستخدم الوهمي:', registerError);
                console.warn('⚠️ المتابعة مع المستخدم الوهمي رغم خطأ التسجيل');
              } else {
                console.log('✅ تم تسجيل المستخدم الوهمي بنجاح:', registeredUser);
              }
            } else {
              console.log('⚠️ لا يوجد اتصال بـ Supabase - المتابعة في وضع التطوير المحلي');
            }

            setUser(mockUser);
            setIsDev(true);
            setIsAuthenticated(true);
            setError(null);
            setIsLoading(false);
            return;
          } catch (devError) {
            console.error('❌ خطأ في وضع التطوير:', devError);
            // Even if there's an error, continue with mock user in dev mode
            console.log('🔧 المتابعة مع المستخدم الوهمي رغم الخطأ');
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

        console.log('👤 تسجيل المستخدم في Supabase...');
        
        // Get Supabase auth ID
        const supabaseAuthId = await getSupabaseAuthId();
        
        if (!supabaseAuthId) {
          throw new Error('Failed to get Supabase authentication ID');
        }
        
        // Register user with Supabase using RPC function
        const { success, user: registeredUser, error: registerError } = await registerUser(
          telegramUser.id.toString(),
          supabaseAuthId,
          telegramUser.username || null // Allow null username
        );

        if (!success || registerError) {
          console.error('❌ فشل التسجيل:', registerError);
          throw new Error(registerError?.message || 'Failed to register user');
        }

        console.log('✅ تم تسجيل المستخدم بنجاح:', registeredUser);

        // Handle referral if start parameter exists
        if (startParam) {
          console.log('🔄 معالجة الإحالة مع معامل البداية:', startParam);
          
          try {
            console.log('📞 استدعاء وظيفة processReferral مع:', {
              referrerTelegramId: startParam,
              referredId: telegramUser.id.toString() 
            });
            
            const referralResult = await processReferral(
              startParam, // referrer's telegram_id
              telegramUser.id.toString() // referred user's telegram_id 
            );

            console.log('📊 نتيجة معالجة الإحالة:', referralResult);

            if (referralResult.success) {
              console.log('🎉 تمت معالجة الإحالة بنجاح!');
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
              console.log('⚠️ نتيجة معالجة الإحالة:', referralResult.message);
              // Only show error for non-"already referred" cases
              if (!referralResult.message.includes('already referred')) {
                toast.error(
                  `Referral Error: ${referralResult.message}`,
                  { 
                    duration: 3000,
                    style: {
                      background: '#FF6347',
                      color: '#fff'
                    }
                  }
                );
              }
            }
          } catch (referralError) {
            console.error('❌ خطأ في معالجة الإحالة:', referralError);
            toast.error(
              `Referral Processing Error: ${referralError instanceof Error ? referralError.message : 'Unknown error'}`,
              { 
                duration: 3000,
                style: {
                  background: '#FF6347',
                  color: '#fff'
                }
              }
            );
          }
        } else {
          console.log('ℹ️ لا يوجد معامل إحالة - تسجيل عادي');
        }

        // Update context state
        setUser(telegramUser);
        setIsDev(false);
        setIsAuthenticated(true);
        setError(null);

      } catch (err) {
        console.error('❌ خطأ في تهيئة Telegram:', err);
        
        // In development mode, fallback to mock user even on errors
        if (import.meta.env.DEV) {
          console.log('🔧 خطأ في الإنتاج - التبديل إلى وضع التطوير');
          setUser(mockUser);
          setIsDev(true);
          setIsAuthenticated(true);
          setError(null);
        } else {
          setError(err instanceof Error ? err.message : 'Failed to initialize Telegram WebApp');
          setIsAuthenticated(false);
        }
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