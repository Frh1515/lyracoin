import { useState, useEffect } from 'react';

// Key for storing onboarding status in localStorage
const ONBOARDING_COMPLETED_KEY = 'lyra_onboarding_completed';

export function useOnboarding() {
  const [isFirstVisit, setIsFirstVisit] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check if the user has completed the onboarding
    const onboardingCompleted = localStorage.getItem(ONBOARDING_COMPLETED_KEY);
    
    // If onboarding hasn't been completed, mark as first visit
    setIsFirstVisit(onboardingCompleted !== 'true');
    setIsLoading(false);
  }, []);

  const completeOnboarding = () => {
    // Mark onboarding as completed
    localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
    setIsFirstVisit(false);
  };

  const resetOnboarding = () => {
    // Reset onboarding status (for testing)
    localStorage.removeItem(ONBOARDING_COMPLETED_KEY);
    setIsFirstVisit(true);
  };

  return {
    isFirstVisit,
    isLoading,
    completeOnboarding,
    resetOnboarding
  };
}