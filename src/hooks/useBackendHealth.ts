import { useState, useEffect } from 'react';
import { checkBackendHealth } from '../utils/api';

export function useBackendHealth() {
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkHealth = async () => {
      setIsChecking(true);
      setError(null);
      
      try {
        const response = await checkBackendHealth();
        setIsHealthy(response.success);
        
        if (!response.success) {
          setError(response.error || 'Backend health check failed');
        }
      } catch (err) {
        setIsHealthy(false);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsChecking(false);
      }
    };

    checkHealth();
    
    // Check health every 30 seconds
    const interval = setInterval(checkHealth, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return { isHealthy, isChecking, error };
}