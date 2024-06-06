import { useIntl } from '@cookbook/solid-intl';
// @ts-ignore
import { decode } from 'light-bolt11-decoder';
import { Component, createEffect, For, Show } from 'solid-js';
import { createStore, reconcile } from 'solid-js/store';
import { emptyInvoice, Kind } from '../../constants';
import { date, dateFuture } from '../../lib/dates';
import { hookForDev } from '../../lib/devTools';
import { humanizeNumber } from '../../lib/stats';
import { cashuInvoice } from '../../translations';
import { LnbcInvoice, NostrTier, PrimalUser } from '../../types/primal';
import ButtonPrimary from '../Buttons/ButtonPrimary';
import Modal from '../Modal/Modal';
import QrCode from '../QrCode/QrCode';
import { getDecodedToken, Token } from "@cashu/cashu-ts";

import styles from './SubscribeToAuthorModal.module.scss';
import { userName } from '../../stores/profile';
import Avatar from '../Avatar/Avatar';
import VerificationCheck from '../VerificationCheck/VerificationCheck';
import { APP_ID } from '../../App';
import { subsTo } from '../../sockets';
import { getAuthorSubscriptionTiers } from '../../lib/feed';
import ButtonSecondary from '../Buttons/ButtonSecondary';

export type Tier = {
  title: string,
  content: string,
  id: string,
  perks: string[],
  costs: { amount: string, unit: string, duration: string}[],
  client: string,
  event: NostrTier,
};

export type TierStore = {
  tiers: Tier[],
  selectedTier: Tier | undefined,
}

export const payUnits = ['sats', 'msats', ''];

const SubscribeToAuthorModal: Component<{
  id?: string,
  author: PrimalUser | undefined,
  onClose: () => void,
  onSubscribe: (tier: Tier) => void,
}> = (props) => {

  const [store, updateStore] = createStore<TierStore>({
    tiers: [],
    selectedTier: undefined,
  })

  createEffect(() => {
    const author = props.author;

    if (author) {
      getTiers(author);
    }
  });

  const getTiers = (author: PrimalUser) => {
    if (!author) return;

    const subId = `subscription_tiers_${APP_ID}`;

    let tiers: Tier[] = [];

    const unsub = subsTo(subId, {
      onEvent: (_, content) => {
        if (content.kind === Kind.TierList) {
          return;
        }

        if (content.kind === Kind.Tier) {
          const t = content as NostrTier;

          const tier = {
            title: (t.tags?.find((t: string[]) => t[0] === 'title') || [])[1] || t.content || '',
            id: t.id || '',
            content: t.content || '',
            perks: t.tags?.filter((t: string[]) => t[0] === 'perk').map((t: string[]) => t[1]) || [],
            costs: t.tags?.filter((t: string[]) => t[0] === 'amount').map((t: string[]) => ({ amount: t[1], unit: t[2], duration: t[3]})) || [],
            client: (t.tags?.find((t: string[]) => t[0] === 'client') || [])[1] || t.content || '',
            event: t,
          }

          tiers.push(tier)

          return;
        }
      },
      onEose: () => {
        unsub();
        updateStore('tiers', () => [...tiers]);
        updateStore('selectedTier', () => ( tiers.length > 0 ? { ...tiers[0]} : undefined))
      },
    })

    getAuthorSubscriptionTiers(author.pubkey, subId)
  }

  const selectTier = (tier: Tier) => {
    updateStore('selectedTier', () => ({ ...tier }));
  }

  const isSelectedTier = (tier: Tier) => tier.id === store.selectedTier?.id;


  // const costForTier = (tier: Tier) => {
  //   const costs = tier.costs.filter(c => payUnits.includes(c.unit));

  //   costs.reduce((acc, c) => {
  //     return
  //   }, [])
  // }

  return (
    <Modal open={props.author !== undefined} onClose={props.onClose}>
      <div id={props.id} class={styles.subscribeToAuthor}>
        <div class={styles.header}>
          <div class={styles.userInfo}>
            <Avatar user={props.author} />
            <div class={styles.userData}>
              <div class={styles.userName}>
                {userName(props.author)}
                <VerificationCheck user={props.author} />
              </div>
              <div class={styles.nip05}>
                {props.author?.nip05}
              </div>
            </div>
          </div>
          <button class={styles.close} onClick={props.onClose}>
          </button>
        </div>

        <div class={styles.body}>
          <div class={styles.tiers}>
            <For each={store.tiers}>
              {tier => (
                <button
                  class={`${styles.tier} ${isSelectedTier(tier) ? styles.selected : ''}`}
                  onClick={() => selectTier(tier)}
                >
                  <div class={styles.title}>{tier.title}</div>
                  <div class={styles.cost}>
                    <div class={styles.amount}>
                      {tier.costs[0].amount} {tier.costs[0].unit}
                    </div>
                    <div class={styles.duration}>
                      {tier.costs[0].duration}
                    </div>
                  </div>
                  <div class={styles.content}>
                    {tier.content}
                  </div>
                  <div class={styles.perks}>
                    <For each={tier.perks}>
                      {perk => (
                        <div class={styles.perk}>
                          <div class={styles.checkIcon}></div>
                          <div class={styles.text}>{perk}</div>
                        </div>
                      )}
                    </For>
                  </div>

                </button>
              )}
            </For>

          </div>
        </div>

        <div class={styles.footer}>
          <div class={styles.payAction}>
            <ButtonSecondary
              light={true}
              onClick={props.onClose}
            >
              cancel
            </ButtonSecondary>
          </div>

          <div class={styles.payAction}>
            <ButtonPrimary
              onClick={() => store.selectedTier && props.onSubscribe(store.selectedTier)}
            >
              subscribe
            </ButtonPrimary>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default hookForDev(SubscribeToAuthorModal);
