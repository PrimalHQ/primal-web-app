import { Component, createEffect, createSignal, Match, onMount, Show, Switch } from 'solid-js';

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
import { PrimalUser } from '../../types/primal';
import Avatar from '../../components/Avatar/Avatar';
import { shortDate } from '../../lib/dates';
import { userName } from '../../stores/profile';
import { PremiumStore } from './Premium';
import TransactionAmount from '../../components/TransactionAmount/TransactionAmount';
import AdvancedSearchSlider from '../../components/AdvancedSearch/AdvancedSearchSlider';
import { subsTo, subTo } from '../../sockets';
import VerificationCheck from '../../components/VerificationCheck/VerificationCheck';


const PremiumBecomeLegend: Component<{
  data: PremiumStore,
  profile?: PrimalUser,
  onBuyLegend?: (amount: number) => void,
  getExchangeRate?: () => void,
}> = (props) => {
  const intl = useIntl()
  const navigate = useNavigate();

  const rate = () => (props.data.exchangeRateUSD || 1) / 100_000_000;
  const [amount, setAmount] = createSignal(0);

  const displayName = () => {
    if (props.data.name.length > 0) return props.data.name;

    return userName(props.profile);
  }

  createEffect(() => {
    if (props.data.isSocketOpen) {
      props.getExchangeRate && props.getExchangeRate()
    }
  });

  createEffect(() => {
    setAmount(() => 1_000 / rate());
  });


  const subscription = () => {
    const a = amount();

    return {
      amounts: {
        usd: Math.ceil(a * rate()),
        sats: Math.ceil(a),
      }
    }
  }

  const onSlide = (vals: number[]) => {
    let a = vals[0];

    if (a > 99_999_999) {
      a = 100_000_000;
    }

    setAmount(Math.floor(a));
  }

  return (
    <div class={styles.premiumBecomeLegend}>

      <div class={styles.userInfo}>
        <Avatar user={props.profile} size="xl" />
        <div class={styles.userName}>
          {displayName()}
          <VerificationCheck
            user={props.profile}
            large={true}
          />
        </div>
      </div>

      <div class={styles.premiumActive}>
        <div class={styles.activePremium}>
          <div class={styles.caption}>{'Primal Legend'}</div>
          <div class={styles.date}>
            <div>{`Class of ${(new Date()).getFullYear()}`}</div>
          </div>
        </div>
      </div>

      <TransactionAmount
        reverse={true}
        amountUSD={subscription().amounts.usd}
        amountBTC={subscription().amounts.sats / 100_000_000}
      />

      <div class={styles.legendarySliderHolder}>
        <AdvancedSearchSlider
          value={[amount()]}
          min={Math.floor(1_000 / rate())}
          // min={Math.floor(5 / rate())}
          max={100_000_000}
          onSlide={onSlide}
          hideInput={true}
          step={1}
        />
        <div class={styles.legendarySliderLimits}>
          <div>$1000</div>
          <div>1BTC</div>
        </div>

        <div class={styles.legendaryPay}>
          <ButtonPremium
            onClick={() => props.onBuyLegend && props.onBuyLegend(subscription().amounts.usd)}
          >
            {intl.formatMessage(t.actions.payNow)}
          </ButtonPremium>
        </div>
      </div>

    </div>
  );
}

export default PremiumBecomeLegend;
