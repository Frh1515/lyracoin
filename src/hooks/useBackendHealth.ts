import { useState, useEffect, useCallback } from 'react';
import { checkBackendHealth, pingBackend } from '../utils/api';

interface HealthData {
  status: string;
  timestamp: string;
  uptime: number;
}

export function useBackendHealth() {
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkHealth = useCallback(async () => {
    setIsChecking(true);
    setError(null);
    
    try {
      console.log('🔍 Checking backend health...');
      
      // First try the health endpoint
      const healthResponse = await checkBackendHealth();
      
      if (healthResponse.success && healthResponse.data) {
        console.log('✅ Backend health check successful:', healthResponse.data);
        setIsHealthy(true);
        setHealthData(healthResponse.data);
        setLastChecked(new Date());
      } else {
        // If health check fails, try ping as fallback
        console.log('⚠️ Health check failed, trying ping...');
        const pingResponse = await pingBackend();
        
        if (pingResponse.success) {
          console.log('✅ Backend ping successful');
          setIsHealthy(true);
          setHealthData({
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: 0
          });
          setLastChecked(new Date());
        } else {
          throw new Error(pingResponse.error || 'Both health and ping failed');
        }
      }
    } catch (err) {
      console.error('❌ Backend connectivity failed:', err);
      setIsHealthy(false);
      setHealthData(null);
      setError(err instanceof Error ? err.message : 'Backend connection failed');
      setLastChecked(new Date());
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    // Initial health check
    checkHealth();
    
    // Check health every 30 seconds
    const interval = setInterval(checkHealth, 30000);
    
    return () => clearInterval(interval);
  }, [checkHealth]);

  // Manual refresh function
  const refresh = useCallback(() => {
    checkHealth();
  }, [checkHealth]);

  return { 
    isHealthy, 
    isChecking, 
    error, 
    healthData, 
    lastChecked, 
    refresh 
  };
}