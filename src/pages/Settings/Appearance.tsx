import { Component } from 'solid-js';
import styles from './Settings.module.scss';

import ThemeChooser from '../../components/ThemeChooser/ThemeChooser';
import { useIntl } from '@cookbook/solid-intl';
import { settings as t } from '../../translations';
import PageCaption from '../../components/PageCaption/PageCaption';
import { A } from '@solidjs/router';
import PageTitle from '../../components/PageTitle/PageTitle';
import CheckBox from '../../components/Checkbox/CheckBox';
import { useSettingsContext } from '../../contexts/SettingsContext';
import { TRANSLATABLE_LANGUAGES, getStoredTargetLanguage, setTargetLanguage } from '../../lib/translate';
import { For, createSignal } from 'solid-js';

const Appearance: Component = () => {

  const settings = useSettingsContext();
  const intl = useIntl();

  const [translationLanguage, setTranslationLanguage] = createSignal<string>(
    getStoredTargetLanguage(),
  );

  const onTranslationLanguageChange = (value: string) => {
    setTranslationLanguage(value);
    setTargetLanguage(value);
  };

  return (
    <div>
      <PageTitle title={`${intl.formatMessage(t.appearance.title)} ${intl.formatMessage(t.title)}`} />

      <PageCaption>
        <A href='/settings' >{intl.formatMessage(t.index.title)}</A>:&nbsp;
        <div>{intl.formatMessage(t.appearance.title)}</div>
      </PageCaption>

      <div class={styles.settingsContent}>
        <div class={styles.settingsCaption}>
          {intl.formatMessage(t.appearance.caption)}
        </div>

        <ThemeChooser />

        <div>
          <CheckBox
            checked={settings?.isAnimated !== undefined ? settings.isAnimated : true}
            onChange={settings?.actions.setAnimation}
          >
            <div class={styles.appearanceCheckLabel}>Show Animations</div>
          </CheckBox>
        </div>

        <div>
          <CheckBox
            checked={settings?.useSystemTheme !== undefined ? settings.useSystemTheme : false}
            onChange={settings?.actions.setUseSystemTheme}
          >
            <div class={styles.appearanceCheckLabel}>
              Automatically set Dark or Light mode based on your system settings
            </div>
          </CheckBox>
        </div>

        <div>
          <div class={styles.settingsCaption}>
            {intl.formatMessage(t.appearance.translation.caption)}
          </div>
          <select
            class={styles.languageSelect}
            value={translationLanguage()}
            onChange={(e) => onTranslationLanguageChange(e.currentTarget.value)}
          >
            <For each={Object.entries(TRANSLATABLE_LANGUAGES)}>
              {([value, label]) => <option value={value}>{label}</option>}
            </For>
          </select>
          <div class={styles.appearanceCheckLabel}>
            {intl.formatMessage(t.appearance.translation.hint)}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Appearance;
