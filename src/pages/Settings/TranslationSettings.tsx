import { useIntl } from '@cookbook/solid-intl';
import { Component, createSignal, For, Show } from 'solid-js';
import {
  DEFAULT_TRANSLATION_PREFS,
  loadTranslationPreferences,
  normalizeTranslationEndpoint,
  noteTranslationCache,
  saveTranslationPreferences,
  SUPPORTED_TRANSLATION_LANGUAGES,
} from '../../lib/noteTranslation';
import { noteTranslation as t } from '../../translations';

import styles from './Settings.module.scss';

const TranslationSettings: Component = () => {
  const intl = useIntl();
  const initial = loadTranslationPreferences();

  const [targetLanguage, setTargetLanguage] = createSignal(initial.targetLanguage);
  const [endpoint, setEndpoint] = createSignal(initial.endpoint);
  const [apiKey, setApiKey] = createSignal(initial.apiKey);
  const [statusMessage, setStatusMessage] = createSignal('');
  const [hasError, setHasError] = createSignal(false);

  const onSave = (e: Event) => {
    e.preventDefault();
    const rawEndpoint = endpoint().trim();

    if (rawEndpoint && !normalizeTranslationEndpoint(rawEndpoint)) {
      setHasError(true);
      setStatusMessage(intl.formatMessage(t.invalidEndpoint));
      return;
    }

    saveTranslationPreferences({
      endpoint: rawEndpoint,
      apiKey: apiKey().trim(),
      targetLanguage: targetLanguage(),
    });
    noteTranslationCache.clear();
    setHasError(false);
    setStatusMessage(intl.formatMessage(t.settingsSaved));
  };

  const onReset = () => {
    setTargetLanguage(DEFAULT_TRANSLATION_PREFS.targetLanguage);
    setEndpoint(DEFAULT_TRANSLATION_PREFS.endpoint);
    setApiKey(DEFAULT_TRANSLATION_PREFS.apiKey);
    saveTranslationPreferences(DEFAULT_TRANSLATION_PREFS);
    noteTranslationCache.clear();
    setHasError(false);
    setStatusMessage(intl.formatMessage(t.settingsCleared));
  };

  return (
    <form class={styles.settingsContent} onSubmit={onSave}>
      <div class={styles.settingsCaption}>
        {intl.formatMessage(t.settingsTitle)}
      </div>
      <div class={styles.settingsDescription}>
        {intl.formatMessage(t.settingsDescription)}
      </div>

      <div style={{ display: 'flex', 'flex-direction': 'column', gap: '12px', 'margin-top': '16px', 'max-width': '480px' }}>
        <label class={styles.label} for="note-translation-language">
          {intl.formatMessage(t.targetLanguageLabel)}
        </label>
        <select
          id="note-translation-language"
          value={targetLanguage()}
          onChange={(e) => setTargetLanguage(e.currentTarget.value)}
          style={{
            padding: '10px 12px',
            'border-radius': '8px',
            border: '1px solid var(--devider)',
            'background-color': 'var(--background-input)',
            color: 'var(--text-primary)',
            'font-size': '14px',
          }}
        >
          <For each={SUPPORTED_TRANSLATION_LANGUAGES}>
            {(lang) => <option value={lang.code}>{lang.label}</option>}
          </For>
        </select>

        <label class={styles.label} for="note-translation-endpoint">
          {intl.formatMessage(t.endpointLabel)}
        </label>
        <input
          id="note-translation-endpoint"
          type="url"
          value={endpoint()}
          onInput={(e) => setEndpoint(e.currentTarget.value)}
          placeholder="https://libretranslate.example.com"
          style={{
            padding: '10px 12px',
            'border-radius': '8px',
            border: '1px solid var(--devider)',
            'background-color': 'var(--background-input)',
            color: 'var(--text-primary)',
            'font-size': '14px',
          }}
        />

        <label class={styles.label} for="note-translation-api-key">
          {intl.formatMessage(t.apiKeyLabel)}
        </label>
        <input
          id="note-translation-api-key"
          type="password"
          autocomplete="off"
          value={apiKey()}
          onInput={(e) => setApiKey(e.currentTarget.value)}
          placeholder={intl.formatMessage(t.apiKeyPlaceholder)}
          style={{
            padding: '10px 12px',
            'border-radius': '8px',
            border: '1px solid var(--devider)',
            'background-color': 'var(--background-input)',
            color: 'var(--text-primary)',
            'font-size': '14px',
          }}
        />

        <div style={{ display: 'flex', gap: '12px', 'align-items': 'center', 'margin-top': '4px' }}>
          <button
            type="submit"
            style={{
              padding: '8px 16px',
              'border-radius': '9999px',
              border: 'none',
              'background-color': 'var(--accent)',
              color: '#ffffff',
              'font-size': '14px',
              'font-weight': 600,
              cursor: 'pointer',
            }}
          >
            {intl.formatMessage(t.saveSettings)}
          </button>
          <button
            type="button"
            onClick={onReset}
            style={{
              padding: '8px 14px',
              'border-radius': '9999px',
              border: '1px solid var(--devider)',
              background: 'none',
              color: 'var(--text-secondary)',
              'font-size': '14px',
              cursor: 'pointer',
            }}
          >
            {intl.formatMessage(t.clearSettings)}
          </button>
        </div>

        <Show when={statusMessage()}>
          <div
            role="status"
            style={{
              'font-size': '13px',
              color: hasError() ? 'var(--warning-bright)' : 'var(--text-secondary)',
            }}
          >
            {statusMessage()}
          </div>
        </Show>
      </div>
    </form>
  );
};

export default TranslationSettings;
