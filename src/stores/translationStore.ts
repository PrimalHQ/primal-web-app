import { createStore } from 'solid-js/store';
import {
  loadTranslationSettings,
  saveTranslationSettings,
  TranslationSettings,
} from '../lib/noteTranslation';

export const [translationStore, updateTranslationStore] =
  createStore<TranslationSettings>(loadTranslationSettings());

export const setTranslationSettings = (settings: Partial<TranslationSettings>) => {
  updateTranslationStore(() => ({ ...settings }));

  saveTranslationSettings({ ...translationStore });
};
