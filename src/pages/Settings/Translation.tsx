import { Component, Show } from 'solid-js';
import { A } from '@solidjs/router';
import { useIntl } from '@cookbook/solid-intl';
import PageCaption from '../../components/PageCaption/PageCaption';
import PageTitle from '../../components/PageTitle/PageTitle';
import CheckBox from '../../components/Checkbox/CheckBox';
import { settings as t } from '../../translations';
import { saveTranslationSettings, translationSettings, TranslationProvider } from '../../lib/translation';
import styles from './Settings.module.scss';

const Translation: Component = () => {
  const intl = useIntl();

  return <div>
    <PageTitle title={`${intl.formatMessage(t.translation.title)} ${intl.formatMessage(t.title)}`} />
    <PageCaption>
      <A href="/settings">{intl.formatMessage(t.index.title)}</A>:&nbsp;
      <div>{intl.formatMessage(t.translation.title)}</div>
    </PageCaption>
    <div class={styles.settingsContent}>
      <div class={styles.settingsCaption}>{intl.formatMessage(t.translation.caption)}</div>
      <CheckBox checked={translationSettings.enabled} onChange={(enabled) => saveTranslationSettings({ enabled })}>
        <div class={styles.appearanceCheckLabel}>{intl.formatMessage(t.translation.enable)}</div>
      </CheckBox>
      <label class={styles.translationField}>
        <span>{intl.formatMessage(t.translation.provider)}</span>
        <select value={translationSettings.provider} onChange={(event) => saveTranslationSettings({ provider: event.currentTarget.value as TranslationProvider })}>
          <option value="libretranslate">LibreTranslate</option>
          <option value="google">Google Cloud Translation</option>
          <option value="deepl">DeepL</option>
        </select>
      </label>
      <Show when={translationSettings.provider === 'libretranslate'}>
        <label class={styles.translationField}>
          <span>{intl.formatMessage(t.translation.libreTranslateUrl)}</span>
          <input type="url" value={translationSettings.libreTranslateUrl} onChange={(event) => saveTranslationSettings({ libreTranslateUrl: event.currentTarget.value })} />
        </label>
      </Show>
      <Show when={translationSettings.provider !== 'libretranslate'}>
        <label class={styles.translationField}>
          <span>{intl.formatMessage(t.translation.apiKey)}</span>
          <input type="password" value={translationSettings.apiKey} onChange={(event) => saveTranslationSettings({ apiKey: event.currentTarget.value })} />
        </label>
      </Show>
      <label class={styles.translationField}>
        <span>{intl.formatMessage(t.translation.targetLanguage)}</span>
        <input type="text" value={translationSettings.targetLanguage} onChange={(event) => saveTranslationSettings({ targetLanguage: event.currentTarget.value })} />
      </label>
    </div>
  </div>;
};

export default Translation;
