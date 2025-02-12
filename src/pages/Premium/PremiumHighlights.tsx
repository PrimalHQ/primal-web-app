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
        A Primal OG szintet azért hozták létre, hogy elismerjék azokat a felhasználókat, akik az első években feliratkoztak a Primal Prémiumra.
      </div>
      <div class={styles.premiumHighlightInfo}>
        <div class={styles.highlights}>
          <div class={styles.highlight}>
            <div class={styles.purpleCheckBig}></div>
            <div class={styles.perk}>
              <div class={styles.perkTitle}>
                Primal Név
              </div>
              <ul class={styles.perkItems}>
                <li>Ellenőrzött Noszter cím</li>
                <li>Bitcoin lightning cím</li>
                <li>VIP profil a primal.net-en</li>
              </ul>
            </div>
          </div>

          <div class={styles.highlight}>
            <div class={styles.purpleOstrich}></div>

            <div class={styles.perk}>
              <div class={styles.perkTitle}>
                Noszter Eszközök
              </div>
              <ul class={styles.perkItems}>
                <li>Média hoszting</li>
                <li>Összetett keresés</li>
                <li>Prémium előfizetéses relé</li>
                <li>Noszter fiók biztonsági mentése</li>
                <ButtonLink onClick={props.onMore}>Sok más...</ButtonLink>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div class={styles.pricingSummary}>
        <div>
          <div class={styles.price}>$7/hónap</div>
          <div class={styles.duration}>3 hónap</div>
        </div>
        <div class={styles.or}>/</div>
        <div>
          <div class={styles.price}>$6/hónap</div>
          <div class={styles.duration}>12 hónap</div>
        </div>
      </div>

      <div class={styles.premiumStart}>
        <Switch>
          <Match when={isGuest()}>
            <>Kezdd a Primal fiókod létrehozásával:</>
          </Match>
          <Match when={hasNoMetadata()}>
            <>Kezdd a profilod szerkesztésével:</>
          </Match>
          <Match when={true}>
            <>Kezdd a Primal neved lefoglalásával:</>
          </Match>
        </Switch>
      </div>

      <ButtonPremium
        onClick={props.onStart}
      >
        <Switch>
          <Match when={isGuest()}>
            <>Fiók létrehozása</>
          </Match>
          <Match when={hasNoMetadata()}>
            <>Profil szerkesztése</>
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
