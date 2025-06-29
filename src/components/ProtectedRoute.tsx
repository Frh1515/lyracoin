import React, { memo } from 'react';
import { Navigate } from 'react-router-dom';
import { useTelegram } from '../context/TelegramContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = memo(function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useTelegram();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#041e11] via-[#051a13] to-[#040d0c]">
        <div className="text-white animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
});