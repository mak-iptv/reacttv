// src/components/LanguageSelector.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useLanguage, languages } from '../contexts/LanguageContext';
import './LanguageSelector.css';

const LanguageSelector = ({ theme }) => {
  const { language, changeLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const currentLang = languages.find(l => l.code === language) || languages[0];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`language-selector theme-${theme}`} ref={dropdownRef}>
      <button 
        className="language-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Zgjidh gjuhën"
        title="Zgjidh gjuhën"
      >
        <span className="language-flag">{currentLang.flag}</span>
        <span className="language-code">{currentLang.code.toUpperCase()}</span>
        <span className="language-arrow">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="language-dropdown">
          {languages.map((lang) => (
            <button
              key={lang.code}
              className={`language-option ${lang.code === language ? 'active' : ''}`}
              onClick={() => {
                changeLanguage(lang.code);
                setIsOpen(false);
              }}
            >
              <span className="option-flag">{lang.flag}</span>
              <span className="option-name">{lang.name}</span>
              {lang.code === language && <span className="option-check">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;