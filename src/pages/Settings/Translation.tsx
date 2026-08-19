import { Component, createSignal } from 'solid-js';
import styles from './Settings.module.scss';

import { useIntl } from '@cookbook/solid-intl';
import { settings as t, noteTranslation as tTr } from '../../translations';
import PageCaption from '../../components/PageCaption/PageCaption';
import { A } from '@solidjs/router';
import PageTitle from '../../components/PageTitle/PageTitle';
import ButtonSecondary from '../../components/Buttons/ButtonSecondary';
import CheckBox from '../../components/Checkbox/CheckBox';
import { useToastContext } from '../../components/Toaster/Toaster';
import {
  loadTranslationSettings,
  saveTranslationSettings,
  TranslationSettings,
} from '../../lib/translationSettings';
import { DEFAULT_TRANSLATE_TARGET } from '../../lib/translation';

const Translation: Component = () => {
  const intl = useIntl();
  const toast = useToastContext();

  const [cfg, setCfg] = createSignal<TranslationSettings>(loadTranslationSettings());

  const update = (patch: Partial<TranslationSettings>) => {
    setCfg((prev) => ({ ...prev, ...patch }));
  };

  const onSave = () => {
    saveTranslationSettings(cfg());
    toast?.sendSuccess(intl.formatMessage(tTr.settingsSaved));
  };

  return (
    <div>
      <PageTitle title={`${intl.formatMessage(tTr.settingsTitle)} ${intl.formatMessage(t.title)}`} />

      <PageCaption>
        <A href='/settings' >{intl.formatMessage(t.index.title)}</A>:&nbsp;
        <div>{intl.formatMessage(tTr.settingsTitle)}</div>
      </PageCaption>

      <div class={styles.settingsContent}>
        <div class={styles.bigCaption}>
          {intl.formatMessage(tTr.settingsTitle)}
        </div>

        <div class={styles.settingsCaption}>
          <CheckBox
            checked={cfg().enabled}
            onChange={(checked: boolean) => update({ enabled: checked })}
            label={intl.formatMessage(tTr.settingsEnabled)}
          />
        </div>

        <div class={`${styles.settingsCaption} ${styles.secondCaption}`}>
          {intl.formatMessage(tTr.settingsEndpoint)}
        </div>
        <div class={styles.relayInput}>
          <input
            type='text'
            value={cfg().endpoint}
            placeholder='https://libretranslate.com'
            onInput={(e) => update({ endpoint: e.currentTarget.value })}
          />
        </div>

        <div class={`${styles.settingsCaption} ${styles.secondCaption}`}>
          {intl.formatMessage(tTr.settingsApiKey)}
        </div>
        <div class={styles.relayInput}>
          <input
            type='password'
            value={cfg().apiKey}
            placeholder=''
            onInput={(e) => update({ apiKey: e.currentTarget.value })}
          />
        </div>

        <div class={`${styles.settingsCaption} ${styles.secondCaption}`}>
          {intl.formatMessage(tTr.settingsTargetLang)}
        </div>
        <div class={styles.relayInput}>
          <input
            type='text'
            style={{ width: '100px' }}
            value={cfg().targetLang}
            placeholder={DEFAULT_TRANSLATE_TARGET()}
            onInput={(e) => update({ targetLang: e.currentTarget.value.toLowerCase().trim() })}
          />
        </div>

        <div class={styles.moderationDescription} style={{ 'margin-top': '12px' }}>
          {intl.formatMessage(tTr.settingsHelp)}
        </div>

        <div style={{ 'margin-top': '16px' }}>
          <ButtonSecondary onClick={onSave}>
            {intl.formatMessage(t.save)}
          </ButtonSecondary>
        </div>
      </div>
    </div>
  );
};

export default Translation;
