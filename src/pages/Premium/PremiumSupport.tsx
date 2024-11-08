import { Component, Match, Switch } from 'solid-js';

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

import stars from '../../assets/images/5stars.svg';
import legend from '../../assets/images/legend.png';
import purpleCheck from '../../assets/icons/purple_check.svg';
import { appStoreLink, playstoreLink } from '../../constants';
import { A } from '@solidjs/router';
import ButtonLink from '../../components/Buttons/ButtonLink';


const PremiumSupport: Component<{
  onExtendPremium?: () => void,
}> = (props) => {
  const intl = useIntl()

  return (
    <div class={styles.supportLayout}>
      <div class={styles.supportContent}>
        <div class={styles.caption}>
          {intl.formatMessage(t.labels.supportCaption)}
        </div>

        <div class={styles.supportCard}>
          <img class={styles.starsImage} src={stars} />
          <div class={styles.title}>
            {intl.formatMessage(t.labels.leaveStars)}
          </div>
          <div class={styles.description}>
            {intl.formatMessage(t.labels.leaveStarsDescription)}
          </div>
          <div class={styles.actions}>
            <a
              href={appStoreLink}
              target='_blank'
            >
            {intl.formatMessage(t.actions.getIOS)}
            </a>
            <div class={styles.delimiter}></div>
            <a
              href={playstoreLink}
              target='_blank'
              class={styles.playstoreLink}
            >
            {intl.formatMessage(t.actions.getAndroid)}
            </a>
          </div>
        </div>
        <div class={styles.supportCard}>
        <img class={styles.purpleCheckImage} src={purpleCheck} />
          <div class={styles.title}>
            {intl.formatMessage(t.labels.extendSubscription)}
          </div>
          <div class={styles.description}>
            {intl.formatMessage(t.labels.extendSubscriptionDescription)}
          </div>
          <div class={styles.actions}>
            <ButtonLink
              onClick={props.onExtendPremium}
            >
              {intl.formatMessage(t.actions.extendPlan)}
            </ButtonLink>
          </div>
        </div>
        <div class={styles.supportCard}>
          <img class={styles.legendImage} src={legend} />
          <div class={styles.title}>
            {intl.formatMessage(t.labels.becomeLegend)}
          </div>
          <div class={styles.description}>
            {intl.formatMessage(t.labels.becomeLegendDescription)}
          </div>
          <div class={styles.actions}>
            <A
              href={`/premium/legend`}
            >
              {intl.formatMessage(t.actions.becomeLegend)}
            </A>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PremiumSupport;
