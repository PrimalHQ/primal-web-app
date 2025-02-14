import { useIntl } from '@cookbook/solid-intl';
import { Component, Match, Show, Switch } from 'solid-js';
import ButtonLink from '../../components/Buttons/ButtonLink';
import ButtonPremium from '../../components/Buttons/ButtonPremium';

import { premium as t } from '../../translations';

import styles from './Premium.module.scss';
import { PrimalUser } from '../../types/primal';


const PremiumHighlights: Component<{
  onStart?: () => void,
  onMore?: () => void,
  pubkey?: string | undefined,
  user?: PrimalUser | undefined,
  isOG?: boolean,
}> = (props) => {
  const intl = useIntl();

  const isGuest = () => !props.pubkey;

  const hasNoMetadata = () => props.pubkey && !props.user;

  return (
    <div class={styles.premiumHighlights}>
      <div class={styles.ogCaption}>
        The Primal OG tier was created to recognize those users who signed up to Primal Premium in the first year.
      </div>
      <div class={styles.premiumHighlightInfo}>
        <div class={styles.highlights}>
          <div class={styles.highlight}>
            <div class={styles.purpleCheckBig}></div>
            <div class={styles.perk}>
              <div class={styles.perkTitle}>
                Primal Name
              </div>
              <ul class={styles.perkItems}>
                <li>Verified nostr address</li>
                <li>Bitcoin lightning address</li>
                <li>VIP profile on primal.net</li>
              </ul>
            </div>
          </div>

          <div class={styles.highlight}>
            <div class={styles.purpleOstrich}></div>

            <div class={styles.perk}>
              <div class={styles.perkTitle}>
                Nostr Tools
              </div>
              <ul class={styles.perkItems}>
                <li>Media hosting</li>
                <li>Advanced search</li>
                <li>Premium paid relay</li>
                <li>Nostr account backup</li>
                <ButtonLink onClick={props.onMore}>Much more...</ButtonLink>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div class={styles.pricingSummary}>
        <div>
          <div class={styles.price}>$7/month</div>
          <div class={styles.duration}>3 months</div>
        </div>
        <div class={styles.or}>or</div>
        <div>
          <div class={styles.price}>$6/month</div>
          <div class={styles.duration}>12 months</div>
        </div>
      </div>

      <div class={styles.premiumStart}>
        <Switch>
          <Match when={isGuest()}>
            <>Start by creating your Primal account:</>
          </Match>
          <Match when={hasNoMetadata()}>
            <>Start by editing your profile:</>
          </Match>
          <Match when={true}>
            <>Start by reserving your Primal name:</>
          </Match>
        </Switch>
      </div>

      <ButtonPremium
        onClick={props.onStart}
      >
        <Switch>
          <Match when={isGuest()}>
            <>Create account</>
          </Match>
          <Match when={hasNoMetadata()}>
            <>Edit profile</>
          </Match>
          <Match when={true}>
            <>{intl.formatMessage(t.actions.start)}</>
          </Match>
        </Switch>
      </ButtonPremium>
    </div>
  );
}

export default PremiumHighlights;
