# Solution for #133: Translate post to user language

// File: backend/services/translationService.js
const { TranslationServiceClient } = require('@google-cloud/translate').v3;
const cache = new Map();

class TranslationService {
  constructor() {
    this.client = new TranslationServiceClient({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    });
    this.location = 'global';
  }

  async translate(text, targetLanguage) {
    if (!text || !targetLanguage) return text;

    const cacheKey = `${text}:${targetLanguage}`;
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey);
    }

    try {
      const request = {
        parent: `projects/${process.env.GOOGLE_CLOUD_PROJECT_ID}/locations/${this.location}`,
        contents: [text],
        mimeType: 'text/plain',
        targetLanguageCode: targetLanguage,
      };

      const [response] = await this.client.translateText(request);
      const translation = response.translations[0].translatedText;

      cache.set(cacheKey, translation);
      return translation;
    } catch (error) {
      console.error('Translation error:', error);
      throw new Error('Failed to translate text');
    }
  }
}

module.exports = new TranslationService();

// File: backend/routes/translate.js
const express = require('express');
const router = express.Router();
const translationService = require('../services/translationService');

router.post('/', async (req, res) => {
  try {
    const { text, targetLanguage } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid text' });
    }
    if (!targetLanguage || typeof targetLanguage !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid targetLanguage' });
    }

    const translated = await translationService.translate(text, targetLanguage);
    res.json({ translated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

// File: backend/app.js (partial - integration)
const express = require('express');
const app = express();
app.use(express.json());
app.use('/api/translate', require('./routes/translate'));
// ... rest of app

// File: frontend/hooks/useUserLanguage.js
import { useContext } from 'react';
import { UserPreferencesContext } from '../contexts/UserPreferencesContext';

export function useUserLanguage() {
  const { preferredLanguage } = useContext(UserPreferencesContext);
  // Fallback to browser language if not set
  const browserLang = navigator.language?.split('-')[0] || 'en';
  return preferredLanguage || browserLang;
}

// File: frontend/contexts/UserPreferencesContext.js
import React, { createContext, useState, useContext } from 'react';

export const UserPreferencesContext = createContext();

export function UserPreferencesProvider({ children }) {
  const [preferredLanguage, setPreferredLanguage] = useState(
    localStorage.getItem('preferredLanguage') || null
  );

  const updateLanguage = (lang) => {
    setPreferredLanguage(lang);
    localStorage.setItem('preferredLanguage', lang);
  };

  return (
    <UserPreferencesContext.Provider value={{ preferredLanguage, updateLanguage }}>
      {children}
    </UserPreferencesContext.Provider>
  );
}

// File: frontend/components/PostTranslator.jsx
import React, { useState } from 'react';
import { useUserLanguage } from '../hooks/useUserLanguage';
import axios from 'axios';

export function PostTranslator({ originalText, onTranslate }) {
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedText, setTranslatedText] = useState(null);
  const [error, setError] = useState(null);
  const targetLanguage = useUserLanguage();

  const handleTranslate = async () => {
    if (!originalText) return;
    if (translatedText) {
      // If already translated, reset to original (toggle)
      setTranslatedText(null);
      onTranslate?.(null);
      return;
    }

    setIsTranslating(true);
    setError(null);

    try {
      const response = await axios.post('/api/translate', {
        text: originalText,
        targetLanguage,
      });
      const translation = response.data.translated;
      setTranslatedText(translation);
      onTranslate?.(translation);
    } catch (err) {
      setError('Translation failed. Please try again.');
      console.error(err);
    } finally {
      setIsTranslating(false);
    }
  };

  // Only show button if target language is different from source language?
  // Could detect, but we assume user wants translation regardless.

  return (
    <div className="post-translator">
      {error && <div className="error">{error}</div>}
      <button
        onClick={handleTranslate}
        disabled={isTranslating}
        className="translate-btn"
      >
        {isTranslating ? 'Translating...' : translatedText ? 'Show original' : 'Translate to ' + targetLanguage.toUpperCase()}
      </button>
      {translatedText && (
        <div className="translated-content" style={{ marginTop: '8px', padding: '8px', background: '#f5f5f5', borderRadius: '4px' }}>
          {translatedText}
        </div>
      )}
    </div>
  );
}

// File: frontend/components/Post.jsx (example integration)
import React from 'react';
import { PostTranslator } from './PostTranslator';

export function Post({ content }) {
  const [displayContent, setDisplayContent] = useState(content);

  const handleTranslation = (translated) => {
    setDisplayContent(translated || content);
  };

  return (
    <div className="post">
      <div className="post-content">{displayContent}</div>
      <PostTranslator originalText={content} onTranslate={handleTranslation} />
    </div>
  );
}

// File: .env.example
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json

// File: package.json dependencies (example)
{
  "dependencies": {
    "@google-cloud/translate": "^7.0.0",
    "axios": "^1.6.0",
    "express": "^4.18.0",
    "react": "^18.0.0"
  }
}
