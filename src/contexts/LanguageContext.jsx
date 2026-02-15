// src/contexts/LanguageContext.jsx
import React, { createContext, useState, useContext, useCallback } from 'react';
import translations from '../i18n/translations';

const LanguageContext = createContext();

export const languages = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'sq', name: 'Shqip', flag: '🇦🇱' },
  { code: 'rs', name: 'Srpski', flag: '🇷🇸' },
  { code: 'mk', name: 'Македонски', flag: '🇲🇰' }
];

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('sq'); // Default Shqip

  const t = useCallback((key, params = {}) => {
    try {
      let text = translations[language]?.[key] || translations.en[key] || key;
      
      // Replace parameters
      Object.keys(params).forEach(param => {
        text = text.replace(`{${param}}`, params[param]);
      });
      
      return text;
    } catch (err) {
      console.warn('Translation error:', key);
      return key;
    }
  }, [language]);

  const changeLanguage = (langCode) => {
    if (translations[langCode]) {
      setLanguage(langCode);
      localStorage.setItem('preferred-language', langCode);
    }
  };

  // Load saved language
  React.useEffect(() => {
    const savedLang = localStorage.getItem('preferred-language');
    if (savedLang && translations[savedLang]) {
      setLanguage(savedLang);
    }
  }, []);

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t, languages }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};
