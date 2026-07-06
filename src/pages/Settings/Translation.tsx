import { Component, createMemo, createSignal, Show } from 'solid-js';
import styles from './Settings.module.scss';

import { useIntl } from '@cookbook/solid-intl';
import { settings as t, noteTranslation as tTr } from '../../translations';
import PageCaption from '../../components/PageCaption/PageCaption';
import { A } from '@solidjs/router';
import PageTitle from '../../components/PageTitle/PageTitle';
import ButtonSecondary from '../../components/Buttons/ButtonSecondary';
import {
  loadTranslationSettings,
  saveTranslationSettings,
  TranslationSettings,
} from '../../lib/translationSettings';
import { DEFAULT_TRANSLATE_TARGET } from '../../lib/translation';

const Translation: Component = () => {
  const intl = useIntl();

  const [cfg, setCfg] = createSignal<TranslationSettings>(loadTranslationSettings());

  const update = (patch: Partial<TranslationSettings>) => {
    setCfg((prev) => ({ ...prev, ...patch }));
  };

  const onSave = () => {
    saveTranslationSettings(cfg());
  };

  return (
    <>
      <PageTitle title={intl.formatMessage(tTr.settingsTitle)} />

      <PageCaption>
        <A href='/settings' >{intl.formatMessage(t.index.title)}</A>:&nbsp;
        <div>{intl.formatMessage(tTr.settingsTitle)}</div>
      </PageCaption>

      <div class={styles.settingsContent}>
        <div class={styles.bigCaption}>
          {intl.formatMessage(tTr.settingsTitle)}
        </div>

        <label class={styles.settingsCaption}>
          <input
            type='checkbox'
            checked={cfg().enabled}
            onChange={(e) => update({ enabled: e.currentTarget.checked })}
            style={{ 'margin-right': '8px', 'vertical-align': 'middle' }}
          />
          {intl.formatMessage(tTr.settingsEnabled)}
        </label>

        <div class={`${styles.settingsCaption} ${styles.secondCaption}`}>
          {intl.formatMessage(tTr.settingsEndpoint)}
        </div>
        <input
          type='text'
          class={styles.relayInput}
          style={{ width: '100%', padding: '8px', 'border-radius': '4px' }}
          value={cfg().endpoint}
          placeholder='https://libretranslate.com'
          onInput={(e) => update({ endpoint: e.currentTarget.value })}
        />

        <div class={`${styles.settingsCaption} ${styles.secondCaption}`}>
          {intl.formatMessage(tTr.settingsApiKey)}
        </div>
        <input
          type='password'
          style={{ width: '100%', padding: '8px', 'border-radius': '4px' }}
          value={cfg().apiKey}
          placeholder=''
          onInput={(e) => update({ apiKey: e.currentTarget.value })}
        />

        <div class={`${styles.settingsCaption} ${styles.secondCaption}`}>
          {intl.formatMessage(tTr.settingsTargetLang)}
        </div>
        <input
          type='text'
          style={{ width: '100px', padding: '8px', 'border-radius': '4px' }}
          value={cfg().targetLang}
          placeholder={DEFAULT_TRANSLATE_TARGET()}
          onInput={(e) => update({ targetLang: e.currentTarget.value.toLowerCase().trim() })}
        />

        <div class={styles.moderationDescription} style={{ 'margin-top': '12px' }}>
          {intl.formatMessage(tTr.settingsHelp)}
        </div>

        <div style={{ 'margin-top': '16px' }}>
          <ButtonSecondary onClick={onSave} shrink={false}>
            {intl.formatMessage(t.save)}
          </ButtonSecondary>
        </div>
      </div>
    </>
  );
};

export default Translation;
