import { useIntl } from '@cookbook/solid-intl';

import { Component, createEffect, For, Show } from 'solid-js';
import { createStore } from 'solid-js/store';
import { Kind } from '../../constants';
import { hookForDev } from '../../lib/devTools';
import { NostrTier, PrimalUser } from '../../types/primal';
import ButtonPrimary from '../Buttons/ButtonPrimary';
import Modal from '../Modal/Modal';

import styles from './SubscribeToAuthorModal.module.scss';
import { userName } from '../../stores/profile';
import Avatar from '../Avatar/Avatar';
import VerificationCheck from '../VerificationCheck/VerificationCheck';
import { APP_ID } from '../../App';
import { subsTo, subTo } from '../../sockets';
import { getAuthorSubscriptionTiers } from '../../lib/feed';
import ButtonSecondary from '../Buttons/ButtonSecondary';
import { Select } from '@kobalte/core/select';
import Loader from '../Loader/Loader';
import { logInfo } from '../../lib/logger';
import { getExchangeRate, getMembershipStatus } from '../../lib/membership';
import { useAccountContext } from '../../contexts/AccountContext';
import AdvancedSearchDialog from '../AdvancedSearch/AdvancedSearchDialog';


export const satsInBTC = 100_000_000;

export type TierCost = {
  amount: string,
  unit: string,
  cadence: string,
  id: string,
}

export type Tier = {
  title: string,
  content: string,
  id: string,
  perks: string[],
  costs: TierCost[],
  activeCost: TierCost | undefined,
  client: string,
  event: NostrTier,
};

export type TierStore = {
  tiers: Tier[],
  selectedTier: Tier | undefined,
  selectedCost: TierCost | undefined,
  isFetchingTiers: boolean,
  exchangeRate: Record<string, Record<string, number>>,
}

export const payUnits = ['sats', 'sat', 'msat', 'msats', 'USD', 'usd', ''];

const SubscribeToAuthorModal: Component<{
  id?: string,
  author: PrimalUser | undefined,
  onClose: () => void,
  onSubscribe: (tier: Tier, cost: TierCost, exchangeRate?: Record<string, Record<string, number>>) => void,
}> = (props) => {

  const account = useAccountContext();

  const [store, updateStore] = createStore<TierStore>({
    tiers: [],
    selectedTier: undefined,
    selectedCost: undefined,
    isFetchingTiers: false,
    exchangeRate: {},
  });

  let walletSocket: WebSocket | undefined;

  createEffect(() => {
    const author = props.author;

    if (author) {
      getTiers(author);
    }
  });

  createEffect(() => {
    if (props.author && (!walletSocket || walletSocket.readyState === WebSocket.CLOSED)) {
      openWalletSocket(() => {
        if (!walletSocket || walletSocket.readyState !== WebSocket.OPEN) return;

        const subId = `er_${APP_ID}`;

        const unsub = subTo(walletSocket, subId, (type, _, content) => {
          if (type === 'EVENT') {
            const response: { rate: string } = JSON.parse(content?.content || '{ "rate": 1 }');

            const BTCForTarget = parseFloat(response.rate) || 1;

            const satsToTarget = BTCForTarget / satsInBTC;
            const targetToBTC = 1 / BTCForTarget;
            const targetToSats = 1 / satsToTarget;

            updateStore('exchangeRate', () => ({
              USD: {
                sats: targetToSats,
                BTC: targetToBTC,
                USD: 1,
              },
              sats: {
                sats: 1,
                USD: satsToTarget,
                BTC: 1 / satsInBTC,
              },
              BTC: {
                sats: satsInBTC,
                USD: BTCForTarget,
                BTC: 1,
              }
            }));
          }

          if (type === 'EOSE') {
            unsub();
            walletSocket?.close();
          }
        });

        getExchangeRate(account?.publicKey, subId, "USD", walletSocket);
      });
    } else {
      walletSocket?.close();
    }
  })

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

          let costs = t.tags?.filter((t: string[]) => t[0] === 'amount').map((t: string[]) => (
            {
              amount: t[1],
              unit: t[2],
              cadence: t[3],
              id: `${t[1]}_${t[2]}_${t[3]}`
            })) || [];

          const tier = {
            title: (t.tags?.find((t: string[]) => t[0] === 'title') || [])[1] || t.content || '',
            id: t.id || '',
            content: t.content || '',
            perks: t.tags?.filter((t: string[]) => t[0] === 'perk').map((t: string[]) => t[1]) || [],
            costs,
            client: (t.tags?.find((t: string[]) => t[0] === 'client') || [])[1] || t.content || '',
            event: t,
            activeCost: costs[0],
          }

          tiers.push(tier)

          return;
        }
      },
      onEose: () => {
        unsub();
        updateStore('isFetchingTiers', () => false);
        updateStore('tiers', () => [...tiers]);
        const tier: Tier | undefined = tiers.length > 0 ? Object.assign(tiers[0]) : undefined;
        updateStore('selectedTier', () => tier ? ({ ...tier }) : undefined);
        updateStore('selectedCost', () => tier ? ({ ...tier?.costs[0] }) : undefined);
      },
    })

    updateStore('isFetchingTiers', () => true);
    getAuthorSubscriptionTiers(author.pubkey, subId)
  }

  const selectTier = (tier: Tier) => {
    if (tier.id !== store.selectedTier?.id) {
      updateStore('selectedTier', () => ({ ...tier }));
      updateStore('selectedCost', (sc) => ({ ...costOptions(tier)[0] }) );
    }
  }

  const isSelectedTier = (tier: Tier) => tier.id === store.selectedTier?.id;


  const costOptions = (tier: Tier) => {
    return tier.costs.filter(cost => payUnits.includes(cost.unit));
  }

  const displayCost = (cost: TierCost | undefined) => {
    let text = '';

    switch(cost?.unit) {
      case 'msat':
      case 'msats':
      case '':
        text = `${Math.ceil(parseInt(cost?.amount || '0') / 1_000)} sats`;
        break;
      case 'sats':
      case 'sat':
        text = `${cost.amount} sats`;
        break;
      case 'USD':
      case 'usd':
        text = `${cost.amount} USD`;
    }

    return text;
  };

  const openWalletSocket = (onOpen: () => void) => {
    walletSocket = new WebSocket('wss://wallet.primal.net/v1');

    walletSocket.addEventListener('close', () => {
      logInfo('WALLET SOCKET CLOSED');
    });

    walletSocket.addEventListener('open', () => {
      logInfo('WALLET SOCKET OPENED');
      onOpen();
    });
  }

  return (
    <AdvancedSearchDialog
      open={props.author !== undefined}
      setOpen={(isOpen: boolean) => !isOpen && props.onClose && props.onClose()}
      title={
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
      }
      triggerClass={styles.hidden}
    >
      <div id={props.id} class={styles.subscribeToAuthor}>
        <div class={styles.modalBody}>
          <div class={styles.tiers}>
            <Show
              when={!store.isFetchingTiers}
              fallback={<div><Loader/></div>}
            >
              <For
                each={store.tiers}
                fallback={
                  <div class={styles.noTiers}>
                    No compatible tiers found
                  </div>
                }
              >
                {(tier) => (
                  <button
                    class={`${styles.tier} ${isSelectedTier(tier) ? styles.selected : ''}`}
                    onClick={() => selectTier(tier)}
                  >
                    <div class={styles.tierTitle}>{tier.title}</div>

                    <Show
                      when={costOptions(tier).length > 1 && store.selectedTier?.id === tier.id}
                      fallback={<div class={styles.cost}>
                        <div class={styles.amount}>
                          {displayCost(costOptions(tier)[0])}
                        </div>
                        <div class={styles.duration}>
                          {costOptions(tier)[0].cadence}
                        </div>
                      </div>}
                    >
                      <Select
                        class={styles.selectCosts}
                        options={costOptions(tier)}
                        optionValue="id"
                        value={store.selectedCost}
                        onChange={(cost) => {
                          // updateStore('tiers', index(), 'activeCost', () => ({ ...cost }));
                          // updateStore('selectedTier', 'activeCost', () => ({ ...cost }));
                          updateStore('selectedCost', () => ({ ...cost }));
                        }}
                        itemComponent={props => (
                          <Select.Item item={props.item} class={styles.cost}>
                            <div class={styles.amount}>
                              {displayCost(props.item.rawValue)}
                            </div>
                            <div class={styles.duration}>
                              {props.item.rawValue.cadence}
                            </div>
                          </Select.Item>
                        )}
                      >
                        <Select.Trigger class={styles.selectTrigger}>
                          <Select.Value class={styles.selectValue}>
                            {state => {
                              const cost = state.selectedOption() as TierCost;

                              return (
                                <div class={styles.cost}>
                                  <div class={styles.amount}>
                                    {displayCost(cost)}
                                  </div>
                                  <div class={styles.duration}>
                                    <div>{cost?.cadence}</div>
                                    <div class={styles.chevIcon}></div>
                                  </div>
                                </div>
                              )

                            }}
                          </Select.Value>
                        </Select.Trigger>
                        <Select.Portal>
                          <Select.Content class={styles.selectContent}>
                            <Select.Listbox class={styles.selectListbox} />
                          </Select.Content>
                        </Select.Portal>
                      </Select>

                    </Show>

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
            </Show>

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

          <Show when={store.selectedTier}>
            <div class={styles.payAction}>
              <ButtonPrimary
                onClick={() => store.selectedTier && store.selectedCost && props.onSubscribe(store.selectedTier, store.selectedCost, store.exchangeRate)}
              >
                subscribe
              </ButtonPrimary>
            </div>
          </Show>
        </div>
      </div>
    </AdvancedSearchDialog>
  );
}

export default hookForDev(SubscribeToAuthorModal);
