import { Component, For } from 'solid-js';
import styles from './Settings.module.scss';

import { useIntl } from '@cookbook/solid-intl';
import { settings as t } from '../../translations';
import PageCaption from '../../components/PageCaption/PageCaption';
import { A } from '@solidjs/router';
import PageTitle from '../../components/PageTitle/PageTitle';
import CheckBox from '../../components/Checkbox/CheckBox';
import { useTranslationContext } from '../../contexts/TranslationContext';

const Translation: Component = () => {
  const translation = useTranslationContext();
  const intl = useIntl();

  const handleLanguageChange = (e: Event) => {
    const target = e.target as HTMLSelectElement;
    translation?.actions.setTargetLanguage(target.value);
  };

  return (
    <div>
      <PageTitle title={`${intl.formatMessage(t.translation.title)} ${intl.formatMessage(t.title)}`} />

      <PageCaption>
        <A href='/settings'>{intl.formatMessage(t.index.title)}</A>:&nbsp;
        <div>{intl.formatMessage(t.translation.title)}</div>
      </PageCaption>

      <div class={styles.settingsContent}>
        <div class={styles.settingsCaption}>
          {intl.formatMessage(t.translation.caption)}
        </div>

        <div class={styles.settingsContentItem}>
          <CheckBox
            checked={translation?.translationEnabled ?? true}
            onChange={(checked) => translation?.actions.setTranslationEnabled(checked)}
          >
            <div class={styles.checkboxLabel}>
              {intl.formatMessage(t.translation.enableTranslation)}
            </div>
          </CheckBox>
        </div>

        <div class={styles.settingsContentItem}>
          <div class={styles.inputLabel}>
            {intl.formatMessage(t.translation.targetLanguageLabel)}
          </div>
          <select
            class={styles.languageSelect}
            value={translation?.targetLanguage || 'en'}
            onChange={handleLanguageChange}
            disabled={!translation?.translationEnabled}
          >
            <For each={translation?.supportedLanguages || []}>
              {(lang) => (
                <option value={lang.code}>{lang.name}</option>
              )}
            </For>
          </select>
        </div>

        <div class={styles.settingsDescription}>
          {intl.formatMessage(t.translation.description)}
        </div>
      </div>
    </div>
  );
};

export default Translation;
