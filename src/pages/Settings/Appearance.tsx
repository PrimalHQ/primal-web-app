import { Component, Show } from 'solid-js';
import styles from './Settings.module.scss';

import ThemeChooser from '../../components/ThemeChooser/ThemeChooser';
import { useIntl } from '@cookbook/solid-intl';
import { settings as t } from '../../translations';
import PageCaption from '../../components/PageCaption/PageCaption';
import { A } from '@solidjs/router';
import PageTitle from '../../components/PageTitle/PageTitle';
import CheckBox from '../../components/Checkbox/CheckBox';
import { useSettingsContext } from '../../contexts/SettingsContext';
import { useSparkWallet } from '../../contexts/SparkWalletContext';

const Appearance: Component = () => {

  const settings = useSettingsContext();
  const sparkWallet = useSparkWallet();
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

        <Show when={sparkWallet?.store.isEnabled}>
          <div class={styles.appearanceSection}>
            <div class={styles.appearanceSectionTitle}>Zap Animations</div>
            <div class={styles.appearanceDescription}>
              Lightning flash animation when sending or receiving zaps (Breez Spark wallet only)
            </div>

            <Show when={settings?.isAnimated}>
              <div class={styles.zapAnimationOptions}>
              <div class={styles.optionGroup}>
                <label class={styles.optionLabel}>Trigger for incoming:</label>
                <select
                  class={styles.selectInput}
                  value={settings?.zapAnimations.triggerMode}
                  onChange={(e) => {
                    settings?.actions.setZapAnimationSettings({
                      ...settings.zapAnimations,
                      triggerMode: e.currentTarget.value as 'all' | 'min',
                    });
                  }}
                >
                  <option value="all">All amounts</option>
                  <option value="min">Above minimum amount</option>
                </select>
              </div>

              <Show when={settings?.zapAnimations.triggerMode === 'min'}>
                <div class={styles.optionGroup}>
                  <label class={styles.optionLabel}>Minimum amount (sats):</label>
                  <input
                    type="number"
                    class={styles.numberInput}
                    value={settings?.zapAnimations.minAmount}
                    min="1"
                    step="100"
                    onChange={(e) => {
                      settings?.actions.setZapAnimationSettings({
                        ...settings.zapAnimations,
                        minAmount: parseInt(e.currentTarget.value) || 1000,
                      });
                    }}
                  />
                </div>
              </Show>

              <div class={styles.optionGroup}>
                <label class={styles.optionLabel}>Show animations for:</label>
                <select
                  class={styles.selectInput}
                  value={settings?.zapAnimations.direction}
                  onChange={(e) => {
                    settings?.actions.setZapAnimationSettings({
                      ...settings.zapAnimations,
                      direction: e.currentTarget.value as 'both' | 'incoming',
                    });
                  }}
                >
                  <option value="both">Sent and received zaps</option>
                  <option value="incoming">Only received zaps</option>
                </select>
              </div>
            </div>
          </Show>

          <Show when={!settings?.isAnimated}>
            <div class={styles.appearanceNote}>
              Enable "Show Animations" above to configure zap animations
            </div>
          </Show>
        </div>
      </Show>
      </div>
    </div>
  )
}

export default Appearance;
