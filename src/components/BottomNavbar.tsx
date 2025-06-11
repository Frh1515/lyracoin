import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, ListChecks, TrendingUp, Users, UserCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const BottomNavbar: React.FC = () => {
  const location = useLocation();
  const { language } = useLanguage();
  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: '/', icon: Home, label: language === 'ar' ? 'الرئيسية' : 'Home' },
    { path: '/tasks', icon: ListChecks, label: language === 'ar' ? 'المهام' : 'Tasks' },
    { path: '/prices', icon: TrendingUp, label: language === 'ar' ? 'الأسعار' : 'Prices' },
    { path: '/referrals', icon: Users, label: language === 'ar' ? 'الإحالات' : 'Referrals' },
    { path: '/profile', icon: UserCircle, label: language === 'ar' ? 'الملف' : 'Profile' }
  ];

  return (
    <nav className="fixed bottom-0 left-0 w-full bg-[#0b0f0d] border-t border-green-900 text-white h-16 flex justify-around items-center z-50">
      {navItems.map((item) => (
        <Link
          key={item.path}
          to={item.path}
          className={`flex flex-col items-center gap-0.5 hover:scale-105 transition ${
            isActive(item.path) ? 'text-neonGreen' : 'text-white'
          }`}
        >
          <item.icon className="w-5 h-5" />
          <span className="text-xs">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
};

export default BottomNavbar;