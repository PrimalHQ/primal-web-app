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

import foreverPremium from '../../assets/images/premium_forever_small.png';
import privateBetaBuilds from '../../assets/images/private_beta_builds.png';
import customProfile from '../../assets/images/preston_small.png';
import heart from '../../assets/images/heart.png';

import { appStoreLink, playstoreLink } from '../../constants';
import { A, useNavigate } from '@solidjs/router';
import ButtonLink from '../../components/Buttons/ButtonLink';
import ButtonPremium from '../../components/Buttons/ButtonPremium';
import { PremiumStore } from './Premium';
import Avatar from '../../components/Avatar/Avatar';
import VerificationCheck from '../../components/VerificationCheck/VerificationCheck';
import { shortDate } from '../../lib/dates';
import { userName } from '../../stores/profile';
import { PrimalUser } from '../../types/primal';


const PremiumUserInfo: Component<{
  data: PremiumStore,
  profile?: PrimalUser,

}> = (props) => {
  const intl = useIntl()
  const navigate = useNavigate();

  const isExpired = () => {
    if (props.data.membershipStatus.cohort_1 === 'Primal Legend') return false;

    const expiration = props.data.membershipStatus.expires_on || 0;
    const now = (new Date()).getTime() / 1_000;

    return now > expiration;
  }

  return (
    <div class={styles.premiumProfileLayout}>
      <div class={styles.userInfo}>
        <Avatar user={props.profile} size="xl" />
        <div class={styles.userName}>
          {userName(props.profile)}
          <VerificationCheck
            user={props.profile}
            large={true}
          />
        </div>
      </div>

      <div class={styles.premiumActive}>
        <Show
          when={isExpired()}
          fallback={
            <div class={styles.activePremium}>
              <div class={styles.caption}>{props.data.membershipStatus.cohort_1 || ''}</div>
              <div class={styles.date}>
                <div>{props.data.membershipStatus.cohort_2 || shortDate(props.data.membershipStatus.expires_on || 0)}</div>
              </div>
            </div>
          }
        >
          <div class={styles.expiredPremium}>
            <div class={styles.caption}>Expired</div>
            <div class={styles.date}><div>{shortDate(props.data.membershipStatus.expires_on || 0)}</div></div>
          </div>
        </Show>
      </div>
    </div>
  );
}

export default PremiumUserInfo;
