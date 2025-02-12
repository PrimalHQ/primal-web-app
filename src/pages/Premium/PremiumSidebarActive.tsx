import { useIntl } from '@cookbook/solid-intl';
import { Component, Show } from 'solid-js';
import ButtonLink from '../../components/Buttons/ButtonLink';
import { shortDate } from '../../lib/dates';

import { premium as t } from '../../translations';
import { formatStorage } from '../../utils';
import { PremiumStore } from './Premium';

import styles from './Premium.module.scss';


const PremiumSidebarActive: Component<{
  data: PremiumStore,
  onSidebarAction: (action: string) => void,
  onOpenFAQ?: () => void,
}> = (props) => {

  const isExpired = () => {
    if (props.data.membershipStatus.tier === 'premium-legend') return false;

    const expiration = props.data.membershipStatus.expires_on || 0;
    const now = (new Date()).getTime() / 1_000;

    return now > expiration;
  }

  const isLegend = () => {
    return props.data.membershipStatus.tier === 'premium-legend';
  }

  return (

    <div class={styles.premiumSidebar}>

      <div class={styles.premiumSidebarTitle}>
        Noszter Eszközök
      </div>

      <div class={styles.premiumSidebarDescription}>
        <ul>
          <li>
            <ButtonLink onClick={() => props.onSidebarAction('premiumRelay')}>
              Prémium Relé
            </ButtonLink>
          </li>
          <li>
            <ButtonLink onClick={() => props.onSidebarAction('mediaManagment')}>
              Média Kezelés
            </ButtonLink>
          </li>
          <li>
            <ButtonLink onClick={() => props.onSidebarAction('contactBackup')}>
              Kapcsolati Lista Biztonsági Mentése
            </ButtonLink>
          </li>
          <li>
            <ButtonLink onClick={() => props.onSidebarAction('contentBackup')}>
              Tartalom Biztonsági Mentése
            </ButtonLink>
          </li>
        </ul>
      </div>

      <div class={styles.premiumSidebarTitle}>
        Primal Fiók
      </div>

      <div class={styles.premiumSidebarDescription}>
        <ul>
          <li>
            <ButtonLink onClick={() => props.onSidebarAction('orderHistory')}>
              Rendelési előzmények
            </ButtonLink>
          </li>
          <Show when={!isLegend()}>
            <li>
              <ButtonLink onClick={() => props.onSidebarAction('extendSubscription')}>
                <Show
                  when={isExpired()}
                  fallback="Előfizetés meghosszabbítása"
                >
                  Előfizetés megújítása
                </Show>
              </ButtonLink>
            </li>
          </Show>
          <li>
            <ButtonLink onClick={() => props.onSidebarAction('changeName')}>
              Primal név megváltoztatása
            </ButtonLink>
          </li>
          <Show when={isLegend()}>
            <li>
              <ButtonLink onClick={() => props.onSidebarAction('customLegend')}>
                Legendás Profil Testreszabás
              </ButtonLink>
            </li>
          </Show>
            <Show when={!isExpired() && !isLegend()}>
              <li>
                <ButtonLink onClick={() => props.onSidebarAction('becomeLegend')}>
                  Legyél Legenda
                </ButtonLink>
              </li>
            </Show>
        </ul>
      </div>

      <div class={styles.premiumSidebarDescription}>
        Van kérdés?&nbsp;
        <ButtonLink onClick={props.onOpenFAQ}>Nézd meg a gyakori kérdéseket</ButtonLink>
      </div>
    </div>
  );
}

export default PremiumSidebarActive;
