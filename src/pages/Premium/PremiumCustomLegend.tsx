import { Component, createEffect, createSignal, Match, Show, Switch } from 'solid-js';

import styles from './Premium.module.scss';
import PageCaption from '../../components/PageCaption/PageCaption';
import PageTitle from '../../components/PageTitle/PageTitle';
import StickySidebar from '../../components/StickySidebar/StickySidebar';
import Wormhole from '../../components/Wormhole/Wormhole';
import Search from '../Search';
import PremiumSidebarActive from './PremiumSidebarActive';
import PremiumSidebarInactve from './PremiumSidebarInactive';
import { useIntl } from '@cookbook/solid-intl';
import { premium as t } from '../../translations';

import foreverPremium from '../../assets/images/premium_forever_small.png';
import privateBetaBuilds from '../../assets/images/private_beta_builds.png';
import customProfile from '../../assets/images/preston_small.png';
import heart from '../../assets/images/heart.png';

import { appStoreLink, playstoreLink } from '../../constants';
import { A, useNavigate } from '@solidjs/router';
import ButtonLink from '../../components/Buttons/ButtonLink';
import ButtonPremium from '../../components/Buttons/ButtonPremium';
import { PremiumStore } from './Premium';
import PremiumUserInfo from './PremiumUserInfo';
import { useAccountContext } from '../../contexts/AccountContext';
import ButtonPrimary from '../../components/Buttons/ButtonPrimary';
import { createStore } from 'solid-js/store';
import { LegendCustomizationConfig, LegendCustomizationStyle } from '../../lib/premium';
import CheckBox2 from '../../components/Checkbox/CheckBox2';
import { useAppContext } from '../../contexts/AppContext';
import ButtonSecondary from '../../components/Buttons/ButtonSecondary';
import { TextField } from '@kobalte/core/text-field';
import { useToastContext } from '../../components/Toaster/Toaster';

const legendStyles: LegendCustomizationStyle[] = [
  '',
  'GOLD',
  'AQUA',
  'SILVER',
  'PURPLE',
  'PURPLEHAZE',
  'TEAL',
  'BROWN',
  'BLUE',
  'SUNFIRE',
];

const PremiumCustomLegend: Component<{
  data: PremiumStore,
  onConfigSave?: (config: LegendCustomizationConfig) => void,
}> = (props) => {
  const intl = useIntl()
  const navigate = useNavigate();
  const account = useAccountContext();
  const app = useAppContext();
  const toast = useToastContext();

  const [editShoutout, setEditShoutout] = createSignal(false);
  const [shoutout, setShoutout] = createSignal('');
  const [isUnderReview, setIsUnderReview] = createSignal(false);

  const shoutoutCharLimit = 140;

  const [config, setConfig] = createStore<LegendCustomizationConfig>({
    style: '',
    custom_badge: true,
    avatar_glow: true,
    in_leaderboard: true,
    current_shoutout: '',
    edited_shoutout: '',
  });

  let shoutoutText: HTMLTextAreaElement | undefined;

  createEffect(() => {
    if (account?.isKeyLookupDone && account?.publicKey) {
      const cf = app?.legendCustomization[account.publicKey];

      setConfig(() => ({ ...cf }));
      setShoutout(() => config.current_shoutout || '');
    }
  });

  createEffect(() => {
    if (!account?.publicKey) return;
    const mi = props.data.membershipStatus.edited_shoutout;

    setIsUnderReview(() => mi !== undefined && mi.length > 0)
  });

  const styleOptions = () => {
    return legendStyles.map(style => {

      let klass = styles.legendStyleItem;

      if (config.style === style) {
        klass += ` ${styles.selected}`;
      }

      return <div
        class={klass}
        data-legend-style={style}
        onClick={() => setConfig('style', () => style)}
      >
        <div></div>
      </div>;
    })
  };

  return (
    <div class={styles.legendCustomizationLayout}>
      <PremiumUserInfo
        data={props.data}
        profile={account?.activeUser}
        legendConfig={config}
      />

      <Show when={props.data.membershipStatus.tier === 'premium-legend'}>

        <div class={styles.legendStylePicker}>
          {styleOptions()}
        </div>

        <div class={styles.legendStyleOptions}>
          <CheckBox2
            checked={config.custom_badge}
            onChange={(v: boolean) => setConfig('custom_badge', () => v)}
          >
            <div class={styles.optionLabel}>Custom badge</div>
          </CheckBox2>
          <CheckBox2
            checked={config.avatar_glow}
            onChange={(v: boolean) => setConfig('avatar_glow', () => v)}
          >
            <div class={styles.optionLabel}>Avatar Ring</div>
          </CheckBox2>
          <CheckBox2
            checked={config.in_leaderboard}
            onChange={(v: boolean) => setConfig('in_leaderboard', () => v)}
          >
            <div class={styles.optionLabel}>Appear in Leaderboard</div>
          </CheckBox2>
        </div>

        <div class={styles.legendStyleDescription}>
          <div class={styles.shoutoutTitle}>Legend Card Shoutout</div>
          <Show
            when={editShoutout()}
            fallback={
              <>
                <div class={styles.shoutoutPreview}>
                  <div>
                    {config.current_shoutout}
                  </div>

                  <ButtonLink onClick={() => setEditShoutout(true)}>
                    sugest edits
                  </ButtonLink>
                </div>
              </>
            }
          >
            <TextField
              class={styles.shoutoutTextField}
              value={shoutout()}
              onChange={(text) => {
                if (text.length > shoutoutCharLimit) return;
                setShoutout(() => text);
              }}
            >
             	<TextField.TextArea autoResize />
            </TextField>
            <div class={styles.shoutoutEditActions}>
              <div class={styles.shoutoutChars}>{shoutout().length}/{shoutoutCharLimit}</div>
              <div class={styles.shoutoutEditButtons}>
                <ButtonSecondary
                  onClick={() => {
                    setEditShoutout(false);
                    setShoutout(() => config.current_shoutout || '')
                  }}
                >
                  Cancel
                </ButtonSecondary>

                <ButtonPrimary
                  onClick={() => {
                    setEditShoutout(false);
                    setConfig('edited_shoutout', () => shoutout());
                    props.onConfigSave && props.onConfigSave(config);
                  }}
                >
                  Save
                </ButtonPrimary>
              </div>
            </div>
          </Show>
          <Show
            when={isUnderReview()}
          >
            <div class={styles.shoutoutReview}>
              Edit Under Review
            </div>
          </Show>

          <div class={styles.shoutoutDesc}>
            Legend cards contain a personalized shoutout from Primal to all our legends.
          </div>
        </div>


        <ButtonPrimary onClick={() => props.onConfigSave && props.onConfigSave(config)}>
          Apply Legendary Profile Customization
        </ButtonPrimary>
      </Show>
    </div>
  );
}

export default PremiumCustomLegend;
