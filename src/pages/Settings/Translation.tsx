import { Component, createSignal, For, onMount, Show } from 'solid-js';
import { A } from '@solidjs/router';
import { useIntl } from '@cookbook/solid-intl';
import { settings as t } from '../../translations';
import PageCaption from '../../components/PageCaption/PageCaption';
import PageTitle from '../../components/PageTitle/PageTitle';
import ButtonPrimary from '../../components/Buttons/ButtonPrimary';
import ButtonSecondary from '../../components/Buttons/ButtonSecondary';
import ButtonLink from '../../components/Buttons/ButtonLink';
import { useToastContext } from '../../components/Toaster/Toaster';
import {
  getBrowserDefaultLanguage,
  isBrowserTranslatorAvailable,
  normalizeLibreTranslateBaseUrl,
  SUPPORTED_LANGUAGES,
  TranslationError,
  TranslationProvider,
} from '../../lib/translation';
import { formatLanguageName } from '../../lib/translationSanitizer';
import {
  clearTranslationCacheStore,
  refreshTranslationCacheCount,
  resetTranslationSettings,
  translationCacheCount,
  translationStore,
  updateTranslationSettings,
} from '../../stores/translationStore';

import settingsStyles from './Settings.module.scss';
import styles from './Translation.module.scss';

const TranslationSettings: Component = () => {
  const intl = useIntl();
  const toaster = useToastContext();

  const [provider, setProvider] = createSignal<TranslationProvider>(
    translationStore.provider,
  );
  const [targetLanguage, setTargetLanguage] = createSignal<string>(
    translationStore.targetLanguage,
  );
  const [libreTranslateUrl, setLibreTranslateUrl] = createSignal<string>(
    translationStore.libreTranslateUrl,
  );
  const [libreTranslateApiKey, setLibreTranslateApiKey] = createSignal<string>(
    translationStore.libreTranslateApiKey,
  );
  const [googleApiKey, setGoogleApiKey] = createSignal<string>(
    translationStore.googleApiKey,
  );
  const [validationError, setValidationError] = createSignal<string>('');

  const browserSupported = isBrowserTranslatorAvailable();
  const browserDefaultLabel = () => {
    const code = getBrowserDefaultLanguage();
    return `${intl.formatMessage(t.translation.browserDefault)} (${formatLanguageName(code, intl.locale)})`;
  };

  onMount(() => {
    refreshTranslationCacheCount();
  });

  const handleSave = (e: Event) => {
    e.preventDefault();
    setValidationError('');

    const selectedProvider = provider();
    let normalizedLibreUrl = libreTranslateUrl().trim();

    if (selectedProvider === 'libretranslate') {
      try {
        normalizedLibreUrl = normalizeLibreTranslateBaseUrl(normalizedLibreUrl);
        setLibreTranslateUrl(normalizedLibreUrl);
      } catch (err) {
        if (err instanceof TranslationError) {
          setValidationError(err.message);
        } else {
          setValidationError(intl.formatMessage(t.translation.invalidEndpoint));
        }
        return;
      }
    }

    if (selectedProvider === 'google' && !googleApiKey().trim()) {
      setValidationError(intl.formatMessage(t.translation.missingGoogleKey));
      return;
    }

    updateTranslationSettings({
      provider: selectedProvider,
      targetLanguage: targetLanguage(),
      libreTranslateUrl: normalizedLibreUrl,
      libreTranslateApiKey: libreTranslateApiKey().trim(),
      googleApiKey: googleApiKey().trim(),
    });

    toaster?.sendSuccess(intl.formatMessage(t.translation.savedToast));
  };

  const handleReset = () => {
    resetTranslationSettings();
    setProvider('none');
    setTargetLanguage('auto');
    setLibreTranslateUrl('');
    setLibreTranslateApiKey('');
    setGoogleApiKey('');
    setValidationError('');
    toaster?.sendSuccess(intl.formatMessage(t.translation.resetToast));
  };

  const handleClearCache = () => {
    clearTranslationCacheStore();
    toaster?.sendSuccess(intl.formatMessage(t.translation.cacheClearedToast));
  };

  return (
    <>
      <PageTitle
        title={`${intl.formatMessage(t.translation.title)} ${intl.formatMessage(t.title)}`}
      />

      <PageCaption>
        <A href="/settings">{intl.formatMessage(t.index.title)}</A>:&nbsp;
        <div>{intl.formatMessage(t.translation.title)}</div>
      </PageCaption>

      <div class={settingsStyles.settingsContent}>
        <div class={settingsStyles.moderationDescription}>
          {intl.formatMessage(t.translation.description)}
        </div>

        <form onSubmit={handleSave}>
          <div class={styles.section}>
            <label class={styles.fieldLabel} for="translation-target-language">
              {intl.formatMessage(t.translation.targetLanguageLabel)}
            </label>
            <select
              id="translation-target-language"
              class={styles.selectInput}
              value={targetLanguage()}
              onChange={(e) => setTargetLanguage(e.currentTarget.value)}
            >
              <For each={SUPPORTED_LANGUAGES}>
                {(lang) => (
                  <option value={lang.code}>
                    {lang.code === 'auto' ? browserDefaultLabel() : lang.label}
                  </option>
                )}
              </For>
            </select>
            <div class={styles.helperText}>
              {intl.formatMessage(t.translation.targetLanguageHelp)}
            </div>
          </div>

          <div class={styles.section}>
            <div class={styles.fieldLabel}>
              {intl.formatMessage(t.translation.providerLabel)}
            </div>

            <div class={styles.providerList}>
              <label
                class={`${styles.providerOption} ${provider() === 'none' ? styles.selected : ''}`}
              >
                <input
                  type="radio"
                  name="translation-provider"
                  value="none"
                  checked={provider() === 'none'}
                  onChange={() => {
                    setProvider('none');
                    setValidationError('');
                  }}
                />
                <div class={styles.providerMeta}>
                  <div class={styles.providerTitle}>
                    {intl.formatMessage(t.translation.providerNoneTitle)}
                  </div>
                  <div class={styles.helperText}>
                    {intl.formatMessage(t.translation.providerNoneDesc)}
                  </div>
                </div>
              </label>

              <label
                class={`${styles.providerOption} ${provider() === 'browser' ? styles.selected : ''}`}
              >
                <input
                  type="radio"
                  name="translation-provider"
                  value="browser"
                  checked={provider() === 'browser'}
                  onChange={() => {
                    setProvider('browser');
                    setValidationError('');
                  }}
                />
                <div class={styles.providerMeta}>
                  <div class={styles.providerTitleRow}>
                    <span class={styles.providerTitle}>
                      {intl.formatMessage(t.translation.providerBrowserTitle)}
                    </span>
                    <span
                      class={
                        browserSupported
                          ? styles.badgeAvailable
                          : styles.badgeUnavailable
                      }
                    >
                      {browserSupported
                        ? intl.formatMessage(t.translation.browserAvailable)
                        : intl.formatMessage(t.translation.browserUnavailable)}
                    </span>
                  </div>
                  <div class={styles.helperText}>
                    {intl.formatMessage(t.translation.providerBrowserDesc)}
                  </div>
                </div>
              </label>

              <label
                class={`${styles.providerOption} ${provider() === 'libretranslate' ? styles.selected : ''}`}
              >
                <input
                  type="radio"
                  name="translation-provider"
                  value="libretranslate"
                  checked={provider() === 'libretranslate'}
                  onChange={() => {
                    setProvider('libretranslate');
                    setValidationError('');
                  }}
                />
                <div class={styles.providerMeta}>
                  <div class={styles.providerTitle}>
                    {intl.formatMessage(t.translation.providerLibreTitle)}
                  </div>
                  <div class={styles.helperText}>
                    {intl.formatMessage(t.translation.providerLibreDesc)}
                  </div>
                </div>
              </label>

              <label
                class={`${styles.providerOption} ${provider() === 'google' ? styles.selected : ''}`}
              >
                <input
                  type="radio"
                  name="translation-provider"
                  value="google"
                  checked={provider() === 'google'}
                  onChange={() => {
                    setProvider('google');
                    setValidationError('');
                  }}
                />
                <div class={styles.providerMeta}>
                  <div class={styles.providerTitle}>
                    {intl.formatMessage(t.translation.providerGoogleTitle)}
                  </div>
                  <div class={styles.helperText}>
                    {intl.formatMessage(t.translation.providerGoogleDesc)}
                  </div>
                </div>
              </label>
            </div>
          </div>

          <Show when={provider() === 'libretranslate'}>
            <div class={styles.section}>
              <label class={styles.fieldLabel} for="libretranslate-url">
                {intl.formatMessage(t.translation.libreUrlLabel)}
              </label>
              <input
                id="libretranslate-url"
                type="url"
                class={styles.textInput}
                value={libreTranslateUrl()}
                placeholder="https://translate.example.com"
                onInput={(e) => {
                  setLibreTranslateUrl(e.currentTarget.value);
                  setValidationError('');
                }}
              />
              <div class={styles.helperText}>
                {intl.formatMessage(t.translation.libreUrlHelp)}
              </div>

              <label class={styles.fieldLabel} for="libretranslate-api-key">
                {intl.formatMessage(t.translation.libreApiKeyLabel)}
              </label>
              <input
                id="libretranslate-api-key"
                type="password"
                autocomplete="off"
                class={styles.textInput}
                value={libreTranslateApiKey()}
                placeholder={intl.formatMessage(t.translation.apiKeyOptionalPlaceholder)}
                onInput={(e) => setLibreTranslateApiKey(e.currentTarget.value)}
              />
            </div>
          </Show>

          <Show when={provider() === 'google'}>
            <div class={styles.section}>
              <label class={styles.fieldLabel} for="google-translate-api-key">
                {intl.formatMessage(t.translation.googleApiKeyLabel)}
              </label>
              <input
                id="google-translate-api-key"
                type="password"
                autocomplete="off"
                class={styles.textInput}
                value={googleApiKey()}
                placeholder={intl.formatMessage(t.translation.googleApiKeyPlaceholder)}
                onInput={(e) => {
                  setGoogleApiKey(e.currentTarget.value);
                  setValidationError('');
                }}
              />
              <div class={styles.helperText}>
                {intl.formatMessage(t.translation.apiKeyLocalOnlyHelp)}
              </div>
            </div>
          </Show>

          <Show when={validationError()}>
            <div class={styles.section}>
              <div class={styles.errorBox}>{validationError()}</div>
            </div>
          </Show>

          <div class={styles.actionsRow}>
            <ButtonPrimary type="submit">
              {intl.formatMessage(t.translation.save)}
            </ButtonPrimary>
            <ButtonSecondary type="button" onClick={handleReset}>
              {intl.formatMessage(t.translation.reset)}
            </ButtonSecondary>
          </div>
        </form>

        <div class={styles.cacheRow}>
          <div>
            <div class={styles.fieldLabel}>
              {intl.formatMessage(t.translation.cacheTitle)}
            </div>
            <div class={styles.helperText}>
              {intl.formatMessage(t.translation.cacheCount, {
                count: translationCacheCount(),
              })}
            </div>
          </div>
          <ButtonLink
            onClick={handleClearCache}
            disabled={translationCacheCount() === 0}
          >
            {intl.formatMessage(t.translation.clearCache)}
          </ButtonLink>
        </div>
      </div>
    </>
  );
};

export default TranslationSettings;
