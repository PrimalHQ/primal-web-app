import { Component, Match, Switch } from 'solid-js';

import styles from './Premium.module.scss';
import { useIntl } from '@cookbook/solid-intl';
import { useNavigate } from '@solidjs/router';
import { PremiumStore } from './Premium';
import Avatar from '../../components/Avatar/Avatar';
import VerificationCheck from '../../components/VerificationCheck/VerificationCheck';
import { shortDate } from '../../lib/dates';
import { userName } from '../../stores/profile';
import { PrimalUser } from '../../types/primal';
import { LegendCustomizationConfig } from '../../lib/premium';


const PremiumUserInfo: Component<{
  data: PremiumStore,
  profile?: PrimalUser,
  legendConfig?: LegendCustomizationConfig | undefined,
}> = (props) => {
  const intl = useIntl()
  const navigate = useNavigate();

  const isExpired = () => {
    if (props.data.membershipStatus.tier === 'premium-legend') return false;

    const expiration = props.data.membershipStatus.expires_on || 0;
    const now = (new Date()).getTime() / 1_000;

    return now > expiration;
  }

  const isLegend = () => {
    return props.data.membershipStatus.tier === 'premium-legend';
  }

  const displayName = () => {
    if (props.data.name.length > 0) return props.data.name;

    return userName(props.profile);
  }

  return (
    <div class={styles.premiumProfileLayout}>
      <div class={styles.userInfo}>
        <Avatar user={props.profile} size="xl" legendConfig={props.legendConfig} />
        <div class={styles.userName}>
          {displayName()}
          <VerificationCheck
            user={props.profile}
            large={true}
            legendConfig={props.legendConfig}
          />
        </div>
      </div>

      <div class={styles.premiumActive}>
        <Switch
          fallback={
            <div class={styles.activePremium}>
              <div class={styles.caption}>{props.data.membershipStatus.cohort_1 || ''}</div>
              <div class={styles.date}>
                <div>{props.data.membershipStatus.cohort_2 || shortDate(props.data.membershipStatus.expires_on || 0)}</div>
              </div>
            </div>
          }
        >
          <Match when={isExpired()}>
            <div class={styles.expiredPremium}>
              <div class={styles.caption}>Expired</div>
              <div class={styles.date}><div>{shortDate(props.data.membershipStatus.expires_on || 0)}</div></div>
            </div>
          </Match>
          <Match when={isLegend()}>
            <div class={`${styles.legendPremium} ${styles[`legend_${props.legendConfig?.style}`]}`}>
              <div class={styles.caption}>{props.data.membershipStatus.cohort_1 || ''}</div>
              <div class={styles.date}>
                <div>{props.data.membershipStatus.cohort_2 || shortDate(props.data.membershipStatus.expires_on || 0)}</div>
              </div>
            </div>
          </Match>
        </Switch>
      </div>
    </div>
  );
}

export default PremiumUserInfo;
