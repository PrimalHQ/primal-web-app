import { Component, Match, Show, Switch } from 'solid-js';

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

import foreverPremium from '../../assets/images/forever.png';
import moreMediaSpace from '../../assets/images/media.png';
import customProfile from '../../assets/images/preston.png';
import heart from '../../assets/images/heart.png';

import { appStoreLink, playstoreLink } from '../../constants';
import { A, useNavigate } from '@solidjs/router';
import ButtonLink from '../../components/Buttons/ButtonLink';
import ButtonPremium from '../../components/Buttons/ButtonPremium';
import { PrimalUser } from '../../types/primal';


const PremiumLegend: Component<{
  onExtendPremium?: () => void,
  pubkey?: string | undefined,
  user?: PrimalUser | undefined,
  isOG?: boolean,
  onBecomeLegendAction?: () => void,
}> = (props) => {
  const intl = useIntl()
  const navigate = useNavigate();

  const isGuest = () => !props.pubkey;

  const hasNoMetadata = () => props.pubkey && !props.user;

  return (
    <div class={styles.legendLayout}>
      <Show when={props.isOG}>
        <div class={styles.legendExplanation}>
          {intl.formatMessage(t.labels.legendPageExplanation)}
        </div>
      </Show>

      <div class={styles.legendCaption}>
        {intl.formatMessage(t.labels.legendPageCaption)}
      </div>

      <div class={styles.legendPerks}>
        <div class={styles.legendPerk}>
          <img class={styles.foreverPremiumIcon} src={foreverPremium}></img>
          <div class={styles.perkInfo}>
            <div class={styles.perkTitle}>
            {intl.formatMessage(t.labels.foreverPremium)}
            </div>
            <div class={styles.perkDescription}>
              {intl.formatMessage(t.labels.foreverPremiumDescription)}
            </div>
          </div>
        </div>
        <div class={styles.legendPerk}>
          <img class={styles.privateBetaIcon} src={moreMediaSpace}></img>
          <div class={styles.perkInfo}>
            <div class={styles.perkTitle}>
              {intl.formatMessage(t.labels.moreMediaSpace)}
            </div>
            <div class={styles.perkDescription}>
              {intl.formatMessage(t.labels.moreMediaSpaceDescription)}
            </div>
          </div>
        </div>
        <div class={styles.legendPerk}>
          <img class={styles.customProfileIcon} src={customProfile}></img>
          <div class={styles.perkInfo}>
            <div class={styles.perkTitle}>
              {intl.formatMessage(t.labels.customLegendProfile)}
            </div>
            <div class={styles.perkDescription}>
              {intl.formatMessage(t.labels.customLegendDescription)}
            </div>
          </div>
        </div>
      </div>

      <div class={styles.gratitude}>
        <div class={styles.gratitudeTitle}>
          <img src={heart}></img> Our Eternal Gratitude <img src={heart}></img>
        </div>
        <div class={styles.gratitudeMessage}>
          We’ll never forget our biggest supporters. People like you will help Nostr succeed.
        </div>
      </div>

      <div class={styles.legendFooter}>
        <ButtonPremium
          onClick={props.onBecomeLegendAction}
        >
          <Switch>
            <Match when={isGuest()}>
              <>Create account</>
            </Match>
            <Match when={hasNoMetadata()}>
              <>Edit profile</>
            </Match>
            <Match when={true}>
              <>{intl.formatMessage(t.actions.becomeLegend)}</>
            </Match>
          </Switch>
        </ButtonPremium>
      </div>
    </div>
  );
}

export default PremiumLegend;
