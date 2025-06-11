/// <reference types="vite/client" />
/// <reference types="@types/telegram-web-app" />

interface Window {
  Telegram?: {
    WebApp: TelegramWebApp;
  };
}