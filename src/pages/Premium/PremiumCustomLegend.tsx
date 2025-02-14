import { Component, createEffect, Match, Show, Switch } from 'solid-js';

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

  const [config, setConfig] = createStore<LegendCustomizationConfig>({
    style: '',
    custom_badge: true,
    avatar_glow: true,
  });

  createEffect(() => {
    if (account?.isKeyLookupDone && account?.publicKey) {
      const cf = app?.legendCustomization[account.publicKey];

      setConfig(() => ({ ...cf }));
    }
  })

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
        </div>

        <div class={styles.legendStyleDescription}>
          <div>Don’t want to stand out?</div>
          <div>
            If you disable the custom badge and avatar ring,
          </div>
          <div>
            your profile will look like any other profile on Primal.
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
