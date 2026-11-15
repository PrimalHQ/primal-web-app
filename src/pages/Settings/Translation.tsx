import { Component, createSignal, For, Show } from 'solid-js';
import { useIntl } from '@cookbook/solid-intl';
import { A } from '@solidjs/router';

import styles from './Settings.module.scss';

import { settings as t } from '../../translations';
import PageCaption from '../../components/PageCaption/PageCaption';
import PageTitle from '../../components/PageTitle/PageTitle';
import CheckBox from '../../components/Checkbox/CheckBox';
import ButtonSecondary from '../../components/Buttons/ButtonSecondary';
import ButtonLink from '../../components/Buttons/ButtonLink';
import {
  clearTranslationCache,
  createTranslationProvider,
  normalizeTranslationEndpoint,
  translationCacheCount,
  translationSettings,
  TranslationSettings,
  updateTranslationSettings,
} from '../../lib/translation';

// Languages offered for the target selector. LibreTranslate instances may
// support a subset (or more); the endpoint is the final authority.
const TARGET_LANGUAGES = [
  'en', 'es', 'pt', 'fr', 'de', 'it', 'nl', 'pl', 'ru', 'uk', 'cs', 'sk',
  'hu', 'ro', 'bg', 'sr', 'hr', 'sv', 'no', 'da', 'fi', 'el', 'tr', 'ar',
  'he', 'hi', 'id', 'vi', 'th', 'ja', 'zh', 'ko',
];

const Translation: Component = () => {
  const intl = useIntl();

  const [invalidEndpoint, setInvalidEndpoint] = createSignal(false);
  const [testing, setTesting] = createSignal(false);
  const [testResult, setTestResult] = createSignal<'ok' | 'fail' | undefined>(undefined);
  const [testCount, setTestCount] = createSignal(0);
  const [cacheCount, setCacheCount] = createSignal(translationCacheCount());

  const languageName = (code: string) => {
    try {
      return new Intl.DisplayNames([intl.locale], { type: 'language' }).of(code) || code;
    } catch {
      return code;
    }
  };

  const onEndpointChange = (value: string) => {
    const trimmed = value.trim();

    if (trimmed.length === 0) {
      setInvalidEndpoint(false);
      updateTranslationSettings({ endpoint: '' });
      return;
    }

    const normalized = normalizeTranslationEndpoint(trimmed);
    setInvalidEndpoint(normalized.length === 0);
    if (normalized.length > 0) {
      updateTranslationSettings({ endpoint: normalized });
    }
  };

  const onTestConnection = async () => {
    setTesting(true);
    setTestResult(undefined);

    try {
      const provider = createTranslationProvider({ ...translationSettings });
      const languages = await provider.listLanguages();
      setTestCount(languages.length);
      setTestResult('ok');
    } catch {
      setTestResult('fail');
    } finally {
      setTesting(false);
    }
  };

  const onApiKeyInput = (value: string) => {
    const patch: Partial<TranslationSettings> = {};
    patch.apiKey = value;
    updateTranslationSettings(patch);
  };

  const onClearCache = () => {
    clearTranslationCache();
    setCacheCount(0);
  };

  return (
    <div>
      <PageTitle title={`${intl.formatMessage(t.translation.title)} ${intl.formatMessage(t.title)}`} />

      <PageCaption>
        <A href='/settings' >{intl.formatMessage(t.index.title)}</A>:&nbsp;
        <div>{intl.formatMessage(t.translation.title)}</div>
      </PageCaption>

      <div class={styles.settingsContent}>
        <div class={styles.settingsCaption}>
          {intl.formatMessage(t.translation.caption)}
        </div>

        <div class={styles.moderationDescription}>
          {intl.formatMessage(t.translation.description)}
        </div>

        <div style="height: 20px"></div>

        <div>
          <CheckBox
            checked={translationSettings.enabled}
            onChange={(checked: boolean) => updateTranslationSettings({ enabled: checked })}
          >
            <div class={styles.appearanceCheckLabel}>
              {intl.formatMessage(t.translation.enable)}
            </div>
          </CheckBox>
        </div>

        <Show when={translationSettings.enabled}>
          <div style="height: 28px"></div>

          <div class={`${styles.settingsCaption} ${styles.secondCaption}`}>
            {intl.formatMessage(t.translation.endpoint)}
          </div>

          <div class={styles.relayInput}>
            <div class={styles.webIcon}></div>
            <input
              type="text"
              value={translationSettings.endpoint}
              placeholder={intl.formatMessage(t.translation.endpointPlaceholder)}
              onChange={(e) => onEndpointChange(e.currentTarget.value)}
            />
          </div>

          <Show when={invalidEndpoint()}>
            <div class={styles.invalidInput}>
              {intl.formatMessage(t.translation.invalidEndpoint)}
            </div>
          </Show>

          <div class={styles.moderationDescription}>
            {intl.formatMessage(t.translation.endpointDescription)}
          </div>

          <div style="height: 20px"></div>

          <div class={`${styles.settingsCaption} ${styles.secondCaption}`}>
            {intl.formatMessage(t.translation.apiKey)}
          </div>

          <div class={styles.relayInput}>
            <div class={styles.webIcon}></div>
            <input
              type="password"
              value={translationSettings.apiKey}
              autocomplete="off"
              onChange={(e) => onApiKeyInput(e.currentTarget.value)}
            />
          </div>

          <div class={styles.moderationDescription}>
            {intl.formatMessage(t.translation.apiKeyDescription)}
          </div>

          <div style="height: 20px"></div>

          <div class={`${styles.settingsCaption} ${styles.secondCaption}`}>
            {intl.formatMessage(t.translation.targetLanguage)}
          </div>

          <div class={styles.relayInput}>
            <select
              value={translationSettings.targetLanguage}
              onChange={(e) => updateTranslationSettings({ targetLanguage: e.currentTarget.value })}
              style="font-size: 16px; font-weight: 600; line-height: 20px; height: 36px; border: none; border-radius: 18px; color: var(--text-secondary); background-color: var(--background-input); padding-inline: 16px; width: 100%;"
            >
              <option value="">
                {intl.formatMessage(t.translation.browserDefault)}
              </option>
              <For each={TARGET_LANGUAGES}>
                {(code) => <option value={code}>{languageName(code)}</option>}
              </For>
            </select>
          </div>

          <div class={styles.moderationDescription}>
            {intl.formatMessage(t.translation.targetLanguageDescription)}
          </div>

          <div style="height: 28px"></div>

          <div>
            <ButtonSecondary
              onClick={onTestConnection}
              disabled={testing() || !translationSettings.endpoint}
            >
              {testing()
                ? intl.formatMessage(t.translation.testing)
                : intl.formatMessage(t.translation.testConnection)}
            </ButtonSecondary>
          </div>

          <Show when={testResult() === 'ok'}>
            <div class={styles.moderationDescription}>
              {intl.formatMessage(t.translation.testSuccess, { count: testCount() })}
            </div>
          </Show>

          <Show when={testResult() === 'fail'}>
            <div class={styles.invalidInput}>
              {intl.formatMessage(t.translation.testFailed)}
            </div>
          </Show>

          <div style="height: 28px"></div>

          <div class={styles.moderationDescription}>
            {intl.formatMessage(t.translation.cache, { count: cacheCount() })}
          </div>

          <ButtonLink onClick={onClearCache}>
            {intl.formatMessage(t.translation.clearCache)}
          </ButtonLink>
        </Show>
      </div>
    </div>
  );
};

export default Translation;
