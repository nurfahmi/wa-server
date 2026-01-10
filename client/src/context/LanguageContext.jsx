import { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../locales';

const LanguageContext = createContext();

// Get default language from environment or fallback to 'id'
const getDefaultLanguage = () => {
  // Check if there's a VITE_DEFAULT_LANGUAGE in import.meta.env
  const envLang = import.meta.env.VITE_DEFAULT_LANGUAGE;
  if (envLang && translations[envLang]) {
    return envLang;
  }
  
  // Check localStorage
  const savedLang = localStorage.getItem('language');
  if (savedLang && translations[savedLang]) {
    return savedLang;
  }
  
  // Default to Indonesian
  return 'id';
};

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(getDefaultLanguage);

  const changeLanguage = (lang) => {
    if (translations[lang]) {
      setLanguage(lang);
      localStorage.setItem('language', lang);
    }
  };

  const t = (key) => {
    const keys = key.split('.');
    let value = translations[language];
    
    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        return key; // Return key if translation not found
      }
    }
    
    return value || key;
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
