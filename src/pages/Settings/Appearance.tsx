import { Component, createSignal, Show } from 'solid-js';
import styles from './Settings.module.scss';

import ThemeChooser from '../../components/ThemeChooser/ThemeChooser';
import { useIntl } from '@cookbook/solid-intl';
import { settings as t } from '../../translations';
import PageCaption from '../../components/PageCaption/PageCaption';
import { A } from '@solidjs/router';
import PageTitle from '../../components/PageTitle/PageTitle';
import CheckBox from '../../components/Checkbox/CheckBox';
import { useSettingsContext } from '../../contexts/SettingsContext';
import FullEmojiPicker from '../../components/FullEmojiPicker/FullEmojiPicker';

const Appearance: Component = () => {

  const settings = useSettingsContext();
  const intl = useIntl();

  const [showEmojiPicker, setShowEmojiPicker] = createSignal(false);
  let emojiButtonRef: HTMLButtonElement | undefined;

  const handleEmojiSelect = (emoji: string) => {
    settings?.actions.setDefaultReactionEmoji(emoji);
    setShowEmojiPicker(false);
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

        <div class={styles.settingsCaption} style="margin-top: 24px;">
          Reactions
        </div>

        <div>
          <CheckBox
            checked={settings?.oneClickReactions !== undefined ? settings.oneClickReactions : false}
            onChange={settings?.actions.setOneClickReactions}
          >
            <div class={styles.appearanceCheckLabel}>
              One-click reactions (quick tap sends default emoji, long-press opens picker)
            </div>
          </CheckBox>
        </div>

        <div class={styles.settingsCaption} style="margin-top: 16px;">
          Default reaction emoji
        </div>
        <div style="display: flex; align-items: center; gap: 12px; margin-top: 8px;">
          <button
            ref={emojiButtonRef}
            onClick={() => setShowEmojiPicker(true)}
            style="font-size: 32px; width: 80px; height: 60px; text-align: center; border: 1px solid var(--border-color); border-radius: 8px; padding: 8px; background: var(--background-input); cursor: pointer; transition: all 0.2s;"
            onMouseOver={(e) => e.currentTarget.style.background = 'var(--background-input-hover)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'var(--background-input)'}
          >
            {settings?.defaultReactionEmoji || '❤️'}
          </button>
          <div class={styles.appearanceCheckLabel}>
            Click to choose your default reaction emoji
          </div>
        </div>

        <Show when={showEmojiPicker()}>
          <FullEmojiPicker
            onSelect={handleEmojiSelect}
            onClose={() => setShowEmojiPicker(false)}
            anchorRef={emojiButtonRef}
          />
        </Show>
      </div>
    </div>
  )
}

export default Appearance;
