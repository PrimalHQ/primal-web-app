import { A } from '@solidjs/router';
import { Component, Show } from 'solid-js';
import { Transition } from 'solid-transition-group';
import { Kind } from '../../constants';
import { useAppContext } from '../../contexts/AppContext';
import { hookForDev } from '../../lib/devTools';
import { sendEvent } from '../../lib/notes';
import { humanizeNumber } from '../../lib/stats';
import { zapSubscription } from '../../lib/zap';
import { nip05Verification, userName } from '../../stores/profile';
import { PrimalUser } from '../../types/primal';
import { isDev } from '../../utils';
import AuthorSubscribeSkeleton from '../Skeleton/AuthorSubscribeSkeleton';
import { Tier, TierCost } from '../SubscribeToAuthorModal/SubscribeToAuthorModal';
import VerificationCheck from '../VerificationCheck/VerificationCheck';

import styles from './AuthorSubscribe.module.scss';
import { accountStore } from '../../stores/accountStore';

const AuthorSubscribe: Component<{
  id?: string,
  author: PrimalUser | undefined,
}> = (props) => {
  const app = useAppContext();

  // const [isFetching, setIsFetching] = createSignal(false);
  // const [author, setAuthor] = createSignal<PrimalUser>();

  // const getAuthorData = async (pubkey: string) => {
  //   if (!account?.publicKey || !pubkey) return;

  //   const subId = `reads_fpi_${APP_ID}`;

  //   setIsFetching(() => true);

  //   const profile = await fetchUserProfile(account.publicKey, pubkey, subId);

  //   setIsFetching(() => false);

  //   setAuthor(() => ({ ...profile }));
  // };

  // createEffect(() => {
  //   getAuthorData(props.pubkey);
  // });

  const doSubscription = async (tier: Tier, cost: TierCost, exchangeRate?: Record<string, Record<string, number>>) => {
    const a = props.author;

    if (!a || !accountStore || !cost) return;

    if (cost.unit === 'USD' && (!exchangeRate || !exchangeRate['USD'])) return;

    const subEvent = {
      kind: Kind.Subscribe,
      content: '',
      created_at: Math.floor((new Date()).getTime() / 1_000),
      tags: [
        ['p', a.pubkey],
        ['e', tier.id],
        ['amount', cost.amount, cost.unit, cost.cadence],
        ['event', JSON.stringify(tier.event)],
        // Copy any zap splits
        ...(tier.event.tags?.filter(t => t[0] === 'zap') || []),
      ],
    }


    const { success, note } = await sendEvent(subEvent, accountStore.activeRelays, accountStore.relaySettings, accountStore.proxyThroughPrimal || false);

    if (success && note) {
      const isZapped = await zapSubscription(
        note,
        a,
        accountStore.publicKey,
        accountStore.activeRelays,
        exchangeRate,
        accountStore.activeNWC,
      );

      if (!isZapped) {
        unsubscribe(note.id);
      }
    }
  }

  const unsubscribe = async (eventId: string) => {
    const a = props.author;

    if (!a) return;

    const unsubEvent = {
      kind: Kind.Unsubscribe,
      content: '',
      created_at: Math.floor((new Date()).getTime() / 1_000),

      tags: [
        ['p', a.pubkey],
        ['e', eventId],
      ],
    };

    await sendEvent(unsubEvent, accountStore.activeRelays, accountStore.relaySettings, accountStore.proxyThroughPrimal || false);

  }

  const openSubscribe = () => {
    app?.actions.openAuthorSubscribeModal(props.author, doSubscription);
  };

  const shouldAnimate = () => isDev() && localStorage.getItem('animate') === 'true'

  return (
    <Transition name={shouldAnimate() ? 'slide-fade' : 'none'}>
      <Show
        when={props.author}
        fallback={<div><AuthorSubscribeSkeleton /></div>}
      >
        <A href={app?.actions.profileLink(props.author?.npub) || ''} class={styles.authorFeaturCard}>
          <Show when={props.author?.picture}>
            <div class={styles.imageHolder}>
              <img class={styles.image} src={props.author?.picture} />
            </div>
          </Show>
          <div class={styles.userInfo}>
            <div class={styles.userBasicData}>
              <div class={styles.userName}>
                {userName(props.author)}
                <VerificationCheck user={props.author} />
              </div>
              <Show when={props.author?.nip05}>
                <div class={styles.nip05}>
                  {nip05Verification(props.author)}
                </div>
              </Show>
            </div>
            <div class={styles.userAdditionalData}>
              <div class={`${styles.userAbout} ${!props.author?.nip05 ? styles.extended : ''}`}>
                {props.author?.about}
              </div>
              <Show when={props.author?.userStats?.followers_count}>
                <div class={styles.userStats}>
                  <div class={styles.number}>
                    {humanizeNumber(props.author?.userStats?.followers_count || 0)}
                  </div>
                  <div class={styles.unit}>
                    followers
                  </div>
                </div>
              </Show>
            </div>
          </div>
        </A>
      </Show>
    </Transition>
  );
}

export default hookForDev(AuthorSubscribe);
