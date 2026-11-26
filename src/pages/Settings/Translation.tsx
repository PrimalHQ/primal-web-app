import { A } from '@solidjs/router';
import { Component, Show, createSignal } from 'solid-js';
import { useIntl } from '@cookbook/solid-intl';
import PageCaption from '../../components/PageCaption/PageCaption';
import PageTitle from '../../components/PageTitle/PageTitle';
import ButtonPrimary from '../../components/Buttons/ButtonPrimary';
import ButtonLink from '../../components/Buttons/ButtonLink';
import { actions as tActions, settings as tSettings } from '../../translations';
import {
  clearTranslationSettings,
  defaultTargetLanguage,
  getTranslationSettings,
  saveTranslationSettings,
} from '../../lib/translation';
import styles from './Settings.module.scss';

const Translation: Component = () => {

  const intl = useIntl();
  const initial = getTranslationSettings();

  const [endpoint, setEndpoint] = createSignal(initial.endpoint);
  const [apiKey, setApiKey] = createSignal(initial.apiKey);
  const [targetLanguage, setTargetLanguage] = createSignal(initial.targetLanguage || defaultTargetLanguage());
  const [invalidEndpoint, setInvalidEndpoint] = createSignal(false);
  const [saved, setSaved] = createSignal(false);

  const validateEndpoint = () => {
    const value = endpoint().trim();

    if (!value) return true;

    try {
      const url = new URL(value);
      return ['https:', 'http:'].includes(url.protocol);
    }
    catch {
      return false;
    }
  };

  const save = () => {
    if (!validateEndpoint()) {
      setInvalidEndpoint(true);
      setSaved(false);
      return;
    }

    saveTranslationSettings({
      endpoint: endpoint(),
      apiKey: apiKey(),
      targetLanguage: targetLanguage(),
    });
    setInvalidEndpoint(false);
    setSaved(true);
  };

  const clear = () => {
    clearTranslationSettings();
    setEndpoint('');
    setApiKey('');
    setTargetLanguage(defaultTargetLanguage());
    setInvalidEndpoint(false);
    setSaved(false);
  };

  return (
    <div>
      <PageTitle title={`${intl.formatMessage(tSettings.translation.title)} ${intl.formatMessage(tSettings.title)}`} />

      <PageCaption>
        <A href='/settings'>{intl.formatMessage(tSettings.index.title)}</A>:&nbsp;
        <div>{intl.formatMessage(tSettings.translation.title)}</div>
      </PageCaption>

      <div class={styles.settingsContent}>
        <div class={styles.bigCaption}>
          {intl.formatMessage(tSettings.translation.provider)}
        </div>

        <div class={styles.settingsDescription}>
          {intl.formatMessage(tSettings.translation.description)}
        </div>

        <div style="height: 20px"></div>

        <div class={styles.settingsCaption}>
          {intl.formatMessage(tSettings.translation.endpoint)}
        </div>

        <div class={styles.nwcInput}>
          <input
            class="large"
            type="text"
            value={endpoint()}
            placeholder={intl.formatMessage(tSettings.translation.endpointPlaceholder)}
            onInput={event => {
              setEndpoint(event.currentTarget.value);
              setInvalidEndpoint(false);
              setSaved(false);
            }}
          />
        </div>

        <Show when={invalidEndpoint()}>
          <div class={styles.invalidInput}>
            {intl.formatMessage(tSettings.translation.invalidEndpoint)}
          </div>
        </Show>

        <div style="height: 24px"></div>

        <div class={styles.settingsCaption}>
          {intl.formatMessage(tSettings.translation.apiKey)}
        </div>

        <div class={styles.nwcInput}>
          <input
            class="large"
            type="password"
            value={apiKey()}
            placeholder={intl.formatMessage(tSettings.translation.apiKeyPlaceholder)}
            onInput={event => {
              setApiKey(event.currentTarget.value);
              setSaved(false);
            }}
          />
        </div>

        <div style="height: 24px"></div>

        <div class={styles.settingsCaption}>
          {intl.formatMessage(tSettings.translation.targetLanguage)}
        </div>

        <div class={styles.nwcInput}>
          <input
            class="large"
            type="text"
            value={targetLanguage()}
            placeholder={defaultTargetLanguage()}
            maxlength={8}
            onInput={event => {
              setTargetLanguage(event.currentTarget.value);
              setSaved(false);
            }}
          />
        </div>

        <Show when={saved()}>
          <div class={styles.settingsDescription}>
            {intl.formatMessage(tSettings.translation.saved)}
          </div>
        </Show>

        <div style="height: 24px"></div>

        <ButtonPrimary onClick={save}>
          {intl.formatMessage(tActions.save)}
        </ButtonPrimary>

        <div style="height: 16px"></div>

        <ButtonLink onClick={clear}>
          {intl.formatMessage(tSettings.translation.clear)}
        </ButtonLink>
      </div>
    </div>
  );
};

export default Translation;
