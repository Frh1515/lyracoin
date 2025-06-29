import React, { useState, useEffect, memo } from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

interface OnboardingTourProps {
  isFirstVisit: boolean;
  onComplete: () => void;
}

const OnboardingTour: React.FC<OnboardingTourProps> = ({ isFirstVisit, onComplete }) => {
  const [run, setRun] = useState(false);
  const { language } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    // Only start the tour if it's the user's first visit
    if (isFirstVisit) {
      // Small delay to ensure all elements are rendered
      const timer = setTimeout(() => {
        setRun(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [isFirstVisit]);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, index, type } = data;
    
    // Navigate to different pages based on the step
    if (type === 'step:before') {
      if (index === 0) {
        // First step - Navigate to home page
        navigate('/');
      } else if (index === 1) {
        // Second step - Navigate to tasks page for mining button
        navigate('/tasks');
      } else if (index === 2) {
        // Third step - Stay on tasks page for daily tasks
        navigate('/tasks');
      } else if (index === 3) {
        // Fourth step - Navigate to referrals page
        navigate('/referrals');
      }
    }

    // Tour is finished or skipped
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      setRun(false);
      onComplete();
    }
  };

  const steps: Step[] = [
    {
      target: '.home-mining-card',
      content: language === 'ar' 
        ? 'مرحباً بك في LYRA COIN! هنا يمكنك التعدين وكسب الدقائق والنقاط.'
        : 'Welcome to LYRA COIN! Here you can mine and earn minutes and points.',
      disableBeacon: true,
      placement: 'center',
      title: language === 'ar' ? 'مرحباً بك! 👋' : 'Welcome! 👋',
      styles: {
        options: {
          backgroundColor: '#0b0f0d',
          borderRadius: '8px',
          color: '#fff',
          mainColor: '#00ff88',
          textColor: '#fff',
          width: 300,
        },
        spotlight: {
          backgroundColor: 'rgba(0, 255, 136, 0.2)',
          boxShadow: '0 0 15px 5px rgba(0, 255, 136, 0.5)',
        },
        tooltipContainer: {
          textAlign: 'center',
        },
        tooltipTitle: {
          color: '#00ff88',
          fontSize: '18px',
          fontWeight: 'bold',
        },
        tooltipContent: {
          padding: '20px 10px',
          fontSize: '14px',
        },
        buttonNext: {
          backgroundColor: '#00ff88',
          color: '#000',
          fontSize: '14px',
          borderRadius: '4px',
          padding: '8px 16px',
        },
        buttonBack: {
          color: '#fff',
          marginRight: 10,
        },
      }
    },
    {
      target: '.mining-button',
      content: language === 'ar' 
        ? 'اضغط على زر "تعدين" لبدء جلسة تعدين لمدة 6 ساعات. يمكنك المطالبة بالمكافآت كل 24 ساعة!'
        : 'Click the "Mine" button to start a 6-hour mining session. You can claim rewards every 24 hours!',
      title: language === 'ar' ? 'التعدين اليومي ⛏️' : 'Daily Mining ⛏️',
      placement: 'bottom',
      styles: {
        options: {
          backgroundColor: '#0b0f0d',
          borderRadius: '8px',
          color: '#fff',
          mainColor: '#00ff88',
          textColor: '#fff',
          width: 300,
        },
        spotlight: {
          backgroundColor: 'rgba(0, 255, 136, 0.2)',
          boxShadow: '0 0 15px 5px rgba(0, 255, 136, 0.5)',
        },
      }
    },
    {
      target: '.daily-tasks-section',
      content: language === 'ar' 
        ? 'أكمل المهام اليومية لكسب المزيد من النقاط والدقائق. تتجدد المهام كل يوم!'
        : 'Complete daily tasks to earn more points and minutes. Tasks refresh every day!',
      title: language === 'ar' ? 'المهام اليومية 📋' : 'Daily Tasks 📋',
      placement: 'top',
      styles: {
        options: {
          backgroundColor: '#0b0f0d',
          borderRadius: '8px',
          color: '#fff',
          mainColor: '#00ff88',
          textColor: '#fff',
          width: 300,
        },
        spotlight: {
          backgroundColor: 'rgba(0, 255, 136, 0.2)',
          boxShadow: '0 0 15px 5px rgba(0, 255, 136, 0.5)',
        },
      }
    },
    {
      target: '.referral-button',
      content: language === 'ar' 
        ? 'شارك رابط الإحالة الخاص بك مع الأصدقاء واكسب 30 نقطة و60 دقيقة لكل إحالة ناجحة!'
        : 'Share your referral link with friends and earn 30 points and 60 minutes for each successful referral!',
      title: language === 'ar' ? 'نظام الإحالة 🔗' : 'Referral System 🔗',
      placement: 'top',
      styles: {
        options: {
          backgroundColor: '#0b0f0d',
          borderRadius: '8px',
          color: '#fff',
          mainColor: '#00ff88',
          textColor: '#fff',
          width: 300,
        },
        spotlight: {
          backgroundColor: 'rgba(0, 255, 136, 0.2)',
          boxShadow: '0 0 15px 5px rgba(0, 255, 136, 0.5)',
        },
      }
    }
  ];

  return (
    <Joyride
      callback={handleJoyrideCallback}
      continuous
      hideCloseButton
      run={run}
      scrollToFirstStep
      showProgress
      showSkipButton
      steps={steps}
      styles={{
        options: {
          zIndex: 10000,
          primaryColor: '#00ff88',
          arrowColor: '#0b0f0d',
        },
        buttonClose: {
          display: 'none',
        },
        buttonSkip: {
          color: 'rgba(255, 255, 255, 0.6)',
        },
      }}
      locale={{
        back: language === 'ar' ? 'السابق' : 'Back',
        close: language === 'ar' ? 'إغلاق' : 'Close',
        last: language === 'ar' ? 'إنهاء' : 'Finish',
        next: language === 'ar' ? 'التالي' : 'Next',
        skip: language === 'ar' ? 'تخطي' : 'Skip',
      }}
    />
  );
};

export default memo(OnboardingTour);