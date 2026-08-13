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
import { useTranslatorContext } from '../../contexts/TranslatorContext';

const Appearance: Component = () => {

  const settings = useSettingsContext();
  const translator = useTranslatorContext();
  const intl = useIntl();

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

        <div class={styles.translationSettings}>
          <div class={styles.translationTitle}>Post translation language</div>
          <select
            class={styles.translationSelect}
            value={translator?.translationLanguage || 'en'}
            onChange={(event) => translator?.actions.setTranslationLanguage(event.currentTarget.value)}
          >
            <option value="en">English</option>
            <option value="es">Español</option>
            <option value="fr">Français</option>
            <option value="de">Deutsch</option>
            <option value="it">Italiano</option>
            <option value="pt">Português</option>
            <option value="ja">日本語</option>
            <option value="ko">한국어</option>
            <option value="zh">中文</option>
          </select>
          <div class={styles.settingsDescription}>
            Choose the language used when you translate a post from its context menu.
          </div>
        </div>

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
      </div>
    </div>
  )
}

export default Appearance;
