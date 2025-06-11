import { create } from 'zustand';

type Language = 'en' | 'es' | 'fr' | 'de' | 'ja';

interface LanguageState {
  language: Language;
  setLanguage: (language: Language) => void;
}

export const useLanguageStore = create<LanguageState>((set) => ({
  language: 'en',
  setLanguage: (language) => set({ language }),
}));