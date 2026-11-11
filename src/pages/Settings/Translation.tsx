import { Component, createSignal, For } from 'solid-js';
import styles from './Settings.module.scss';

import { useIntl } from '@cookbook/solid-intl';
import { settings as t } from '../../translations';
import PageCaption from '../../components/PageCaption/PageCaption';
import { A } from '@solidjs/router';
import PageTitle from '../../components/PageTitle/PageTitle';
import ButtonSecondary from '../../components/Buttons/ButtonSecondary';
import { useToastContext } from '../../components/Toaster/Toaster';
import {
  DEFAULT_TRANSLATE_ENDPOINT,
  TRANSLATION_LANGUAGES,
  getTranslationSettings,
  resetTranslationSettings,
  saveTranslationSettings,
} from '../../lib/translate';

const Translation: Component = () => {

  const intl = useIntl();
  const toaster = useToastContext();

  const initial = getTranslationSettings();

  const [targetLang, setTargetLang] = createSignal(initial.targetLang || '');
  const [endpoint, setEndpoint] = createSignal(initial.endpoint);
  const [apiKey, setApiKey] = createSignal(initial.apiKey || '');

  const onSave = () => {
    saveTranslationSettings({
      endpoint: endpoint().trim() || DEFAULT_TRANSLATE_ENDPOINT,
      apiKey: apiKey().trim() || undefined,
      targetLang: targetLang() || undefined,
    });
    toaster?.sendSuccess(intl.formatMessage(t.translation.saved));
  };

  const onReset = () => {
    resetTranslationSettings();
    setTargetLang('');
    setEndpoint(DEFAULT_TRANSLATE_ENDPOINT);
    setApiKey('');
    toaster?.sendSuccess(intl.formatMessage(t.translation.saved));
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
          {intl.formatMessage(t.translation.description)}
        </div>

        <div class={styles.label}>
          {intl.formatMessage(t.translation.targetLanguage)}
        </div>
        <div style="height: 8px"></div>
        <select
          value={targetLang()}
          onChange={(e) => setTargetLang(e.currentTarget.value)}
          style={{
            'width': '100%',
            'height': '36px',
            'border': 'none',
            'border-radius': '18px',
            'padding-inline': '12px',
            'font-size': '16px',
            'font-weight': '600',
            'color': 'var(--text-secondary)',
            'background-color': 'var(--background-input)',
          }}
        >
          <option value="">
            {intl.formatMessage(t.translation.followAppLanguage)}
          </option>
          <For each={TRANSLATION_LANGUAGES}>
            {(lang) => (
              <option value={lang.code}>{lang.name}</option>
            )}
          </For>
        </select>

        <div style="height: 24px"></div>

        <div class={styles.label}>
          {intl.formatMessage(t.translation.endpoint)}
        </div>
        <div style="height: 8px"></div>
        <div class={styles.relayInput}>
          <input
            type="text"
            class="noIcon"
            value={endpoint()}
            placeholder={DEFAULT_TRANSLATE_ENDPOINT}
            onInput={(e) => setEndpoint(e.currentTarget.value)}
          />
        </div>

        <div style="height: 24px"></div>

        <div class={styles.label}>
          {intl.formatMessage(t.translation.apiKey)}
        </div>
        <div class={styles.settingsDescription}>
          {intl.formatMessage(t.translation.apiKeyDesc)}
        </div>
        <div style="height: 8px"></div>
        <div class={styles.relayInput}>
          <input
            type="password"
            class="noIcon"
            value={apiKey()}
            onInput={(e) => setApiKey(e.currentTarget.value)}
          />
        </div>

        <div style="height: 28px"></div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <ButtonSecondary onClick={onSave}>
            {intl.formatMessage(t.translation.save)}
          </ButtonSecondary>
          <ButtonSecondary onClick={onReset}>
            {intl.formatMessage(t.translation.reset)}
          </ButtonSecondary>
        </div>
      </div>
    </div>
  )
}

export default Translation;
