import { Component, createSignal, For, Show } from 'solid-js';
import styles from './Settings.module.scss';

import { useIntl } from '@cookbook/solid-intl';
import { settings as t } from '../../translations';
import PageCaption from '../../components/PageCaption/PageCaption';
import { A } from '@solidjs/router';
import PageTitle from '../../components/PageTitle/PageTitle';
import CheckBox from '../../components/Checkbox/CheckBox';
import {
  browserLanguage,
  languageName,
  normalizeTranslationEndpoint,
  translationLanguages,
} from '../../lib/noteTranslation';
import { setTranslationSettings, translationStore } from '../../stores/translationStore';

const Translation: Component = () => {

  const intl = useIntl();

  const [invalidEndpoint, setInvalidEndpoint] = createSignal(false);

  const languages = () => translationLanguages.
    map(code => ({ code, name: languageName(code) })).
    sort((a, b) => a.name.localeCompare(b.name));

  const onEndpointChange = (value: string) => {
    const endpoint = value.trim();

    if (endpoint.length > 0 && normalizeTranslationEndpoint(endpoint).length === 0) {
      setInvalidEndpoint(true);
      return;
    }

    setInvalidEndpoint(false);
    setTranslationSettings({ endpoint });
  };

  const isMissingEndpoint = () =>
    translationStore.enabled &&
    !invalidEndpoint() &&
    normalizeTranslationEndpoint(translationStore.endpoint).length === 0;

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

        <CheckBox
          id="toggleTranslation"
          checked={translationStore.enabled}
          onChange={(enabled: boolean) => setTranslationSettings({ enabled })}
          label={intl.formatMessage(t.translation.enable)}
        />

        <div class={styles.moderationDescription}>
          {intl.formatMessage(t.translation.description)}
        </div>

        <div class={`${styles.settingsCaption} ${styles.secondCaption}`}>
          {intl.formatMessage(t.translation.language)}
        </div>

        <select
          class={styles.translationSelect}
          aria-label={intl.formatMessage(t.translation.language)}
          value={translationStore.targetLanguage}
          onChange={(e) => setTranslationSettings({ targetLanguage: e.currentTarget.value })}
        >
          <option value="">
            {intl.formatMessage(
              t.translation.browserLanguage,
              { language: languageName(browserLanguage()) },
            )}
          </option>
          <For each={languages()}>
            {language => (
              <option
                value={language.code}
                selected={language.code === translationStore.targetLanguage}
              >
                {language.name}
              </option>
            )}
          </For>
        </select>

        <div class={`${styles.settingsCaption} ${styles.secondCaption}`}>
          {intl.formatMessage(t.translation.service)}
        </div>

        <div class={styles.relayInput}>
          <div class={styles.webIcon}></div>
          <input
            type="url"
            autocomplete="off"
            spellcheck={false}
            aria-label={intl.formatMessage(t.translation.service)}
            placeholder={intl.formatMessage(t.translation.endpointPlaceholder)}
            value={translationStore.endpoint}
            onChange={(e) => onEndpointChange(e.currentTarget.value)}
          />
        </div>

        <Show when={invalidEndpoint()}>
          <div class={styles.invalidInput}>
            {intl.formatMessage(t.translation.invalidEndpoint)}
          </div>
        </Show>

        <Show when={isMissingEndpoint()}>
          <div class={styles.invalidInput}>
            {intl.formatMessage(t.translation.missingEndpoint)}
          </div>
        </Show>

        <div class={styles.moderationDescription}>
          {intl.formatMessage(t.translation.serviceDescription)}
        </div>

        <div class={`${styles.settingsCaption} ${styles.secondCaption}`}>
          {intl.formatMessage(t.translation.apiKey)}
        </div>

        <div class={styles.relayInput}>
          <input
            class={styles.translationKey}
            type="password"
            autocomplete="off"
            spellcheck={false}
            aria-label={intl.formatMessage(t.translation.apiKey)}
            placeholder={intl.formatMessage(t.translation.apiKeyPlaceholder)}
            value={translationStore.apiKey}
            onChange={(e) => setTranslationSettings({ apiKey: e.currentTarget.value.trim() })}
          />
        </div>

        <div class={styles.moderationDescription}>
          {intl.formatMessage(t.translation.apiKeyDescription)}
        </div>
      </div>
    </div>
  )
}

export default Translation;
