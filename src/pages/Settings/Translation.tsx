import { Component, For } from 'solid-js';
import { useIntl } from '@cookbook/solid-intl';
import { A } from '@solidjs/router';
import PageCaption from '../../components/PageCaption/PageCaption';
import PageTitle from '../../components/PageTitle/PageTitle';
import CheckBox from '../../components/Checkbox/CheckBox';
import {
  normalizeLibreTranslateBaseUrl,
  saveTranslationSettings,
  translationSettings,
  TranslationProvider,
} from '../../lib/translation';
import { settings as t } from '../../translations';
import styles from './Settings.module.scss';

const LANGS = [
  'en', 'es', 'fr', 'de', 'pt', 'it', 'nl', 'pl', 'ru', 'uk', 'ja', 'zh', 'ko',
  'ar', 'hi', 'tr', 'sv', 'no', 'da', 'fi', 'cs', 'ro', 'hu',
];

const TranslationSettingsPage: Component = () => {
  const intl = useIntl();

  return (
    <div>
      <PageTitle
        title={`${intl.formatMessage(t.translation.title)} ${intl.formatMessage(t.title)}`}
      />

      <PageCaption>
        <A href="/settings">{intl.formatMessage(t.index.title)}</A>:&nbsp;
        <div>{intl.formatMessage(t.translation.title)}</div>
      </PageCaption>

      <div class={styles.settingsContent}>
        <div class={styles.settingsCaption}>
          {intl.formatMessage(t.translation.caption)}
        </div>

        <div style={{ 'margin-bottom': '16px' }}>
          <CheckBox
            checked={translationSettings.enabled}
            onChange={(checked) => saveTranslationSettings({ enabled: checked })}
          >
            <div class={styles.appearanceCheckLabel}>
              {intl.formatMessage(t.translation.enable)}
            </div>
          </CheckBox>
        </div>

        <label class={styles.settingsCaption} for="translation-provider">
          {intl.formatMessage(t.translation.provider)}
        </label>
        <select
          id="translation-provider"
          value={translationSettings.provider}
          onChange={(e) =>
            saveTranslationSettings({
              provider: e.currentTarget.value as TranslationProvider,
            })
          }
          style={{
            width: '100%',
            'max-width': '420px',
            'margin-bottom': '16px',
            padding: '8px',
          }}
        >
          <option value="libretranslate">LibreTranslate (self-hostable)</option>
          <option value="google">Google Cloud Translation (API key)</option>
          <option value="deepl">DeepL (pro or free :fx API key)</option>
        </select>

        <label class={styles.settingsCaption} for="translation-target">
          {intl.formatMessage(t.translation.targetLanguage)}
        </label>
        <select
          id="translation-target"
          value={translationSettings.targetLanguage.split('-')[0]}
          onChange={(e) =>
            saveTranslationSettings({ targetLanguage: e.currentTarget.value })
          }
          style={{
            width: '100%',
            'max-width': '420px',
            'margin-bottom': '16px',
            padding: '8px',
          }}
        >
          <For each={LANGS}>
            {(code) => <option value={code}>{code}</option>}
          </For>
        </select>

        <label class={styles.settingsCaption} for="translation-url">
          {intl.formatMessage(t.translation.libreUrl)}
        </label>
        <input
          id="translation-url"
          type="url"
          value={translationSettings.libreTranslateUrl}
          onInput={(e) =>
            saveTranslationSettings({ libreTranslateUrl: e.currentTarget.value })
          }
          onBlur={(e) => {
            const normalized = normalizeLibreTranslateBaseUrl(
              e.currentTarget.value,
            );
            if (normalized && normalized !== translationSettings.libreTranslateUrl) {
              saveTranslationSettings({ libreTranslateUrl: normalized });
            }
          }}
          placeholder="https://libretranslate.com"
          style={{
            width: '100%',
            'max-width': '420px',
            'margin-bottom': '16px',
            padding: '8px',
          }}
        />

        <label class={styles.settingsCaption} for="translation-key">
          {intl.formatMessage(t.translation.apiKey)}
        </label>
        <input
          id="translation-key"
          type="password"
          value={translationSettings.apiKey}
          onInput={(e) =>
            saveTranslationSettings({ apiKey: e.currentTarget.value })
          }
          autocomplete="off"
          style={{
            width: '100%',
            'max-width': '420px',
            'margin-bottom': '16px',
            padding: '8px',
          }}
        />

        <p class={styles.webVersion} style={{ opacity: 0.7, 'font-size': '13px' }}>
          {intl.formatMessage(t.translation.privacyNote)}
        </p>
      </div>
    </div>
  );
};

export default TranslationSettingsPage;
