import { Component, Show, createSignal } from 'solid-js';
import styles from './Settings.module.scss';

import { useIntl } from '@cookbook/solid-intl';
import { settings as t, actions as tActions } from '../../translations';
import PageCaption from '../../components/PageCaption/PageCaption';
import { A } from '@solidjs/router';
import ButtonPrimary from '../../components/Buttons/ButtonPrimary';
import { useToastContext } from "../../components/Toaster/Toaster";
import { accountStore, updateAccountStore, saveTranslationSettings } from '../../stores/accountStore';
import { translationService } from '../../services/translation/translationService';

const Translation: Component = () => {
  const intl = useIntl();
  const toast = useToastContext();

  // Local signals seeded from the store so the form is controlled.
  // The store was populated at startup by initTranslationSettings().
  const [provider, setProvider] = createSignal(accountStore.translationProvider || 'mymemory');
  const [apiKey, setApiKey] = createSignal(accountStore.translationApiKey || '');
  const [libreUrl, setLibreUrl] = createSignal(accountStore.translationLibreUrl || 'https://translate.terraprint.co');
  const [preferredLanguage, setPreferredLanguage] = createSignal(accountStore.preferredLanguage || 'en');

  const handleSave = (e: Event) => {
    e.preventDefault();

    updateAccountStore({
      translationProvider: provider(),
      translationApiKey: apiKey(),
      translationLibreUrl: libreUrl(),
      preferredLanguage: preferredLanguage(),
    });

    // Keep the singleton translation service in sync with the new store values
    translationService.updateSettings({
      provider: provider(),
      apiKey: apiKey(),
      libreUrl: libreUrl(),
      preferredLanguage: preferredLanguage(),
    });

    saveTranslationSettings();

    toast?.sendSuccess(intl.formatMessage(t.translation.saveSuccess));
  };

  return (
    <div>
      <PageCaption title={intl.formatMessage(t.translation.title)} />
      <form onSubmit={handleSave} class={styles.settingsForm}>
        <div class={styles.settingsField}>
          <label>{intl.formatMessage(t.translation.provider)}</label>
          <select
            name="provider"
            value={provider()}
            onChange={(e) => setProvider(e.currentTarget.value as 'mymemory' | 'libretranslate' | 'deepl')}
          >
            <option value="mymemory">MyMemory (free, no API key)</option>
            <option value="libretranslate">LibreTranslate</option>
            <option value="deepl">DeepL</option>
          </select>
        </div>

        <div class={styles.settingsField}>
          <label>{intl.formatMessage(t.translation.apiKey)}</label>
          <input
            name="apiKey"
            type="password"
            value={apiKey()}
            onInput={(e) => setApiKey(e.currentTarget.value)}
          />
        </div>

        <Show when={provider() === 'libretranslate'}>
          <div class={styles.settingsField}>
            <label>{intl.formatMessage(t.translation.libreUrl)}</label>
            <input
              name="libreUrl"
              type="text"
              value={libreUrl()}
              onInput={(e) => setLibreUrl(e.currentTarget.value)}
            />
          </div>
        </Show>

        <div class={styles.settingsField}>
          <label>{intl.formatMessage(t.translation.preferredLanguage)}</label>
          <select
            name="preferredLanguage"
            value={preferredLanguage()}
            onChange={(e) => setPreferredLanguage(e.currentTarget.value)}
          >
            <option value="en">English</option>
            <option value="fa">Persian (Farsi)</option>
            <option value="ar">Arabic</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
            <option value="tr">Turkish</option>
            <option value="ru">Russian</option>
          </select>
        </div>

        <div class={styles.settingsField}>
          <ButtonPrimary type="submit" value={intl.formatMessage(tActions.save)}>
            {intl.formatMessage(tActions.save)}
          </ButtonPrimary>
        </div>
      </form>
    </div>
  );
};

export default Translation;
