import { A, useNavigate } from '@solidjs/router';
import { batch, Component, createEffect, createSignal, For, JSXElement, onMount, Show } from 'solid-js';
import { createStore } from 'solid-js/store';
import { Transition } from 'solid-transition-group';
import { APP_ID } from '../../App';
import { Kind } from '../../constants';
import { useAccountContext } from '../../contexts/AccountContext';
import { CustomZapInfo, useAppContext } from '../../contexts/AppContext';
import { useSettingsContext } from '../../contexts/SettingsContext';
import { useThreadContext } from '../../contexts/ThreadContext';
import { fetchUserProfile } from '../../handleNotes';
import { date, shortDate } from '../../lib/dates';
import { hookForDev } from '../../lib/devTools';
import { sendEvent } from '../../lib/notes';
import { humanizeNumber } from '../../lib/stats';
import { zapSubscription } from '../../lib/zap';
import { nip05Verification, userName } from '../../stores/profile';
import { PrimalArticle, PrimalUser, ZapOption } from '../../types/primal';
import { isDev, uuidv4 } from '../../utils';
import Avatar from '../Avatar/Avatar';
import ButtonPrimary from '../Buttons/ButtonPrimary';
import ButtonSecondary from '../Buttons/ButtonSecondary';
import Loader from '../Loader/Loader';
import AuthorSubscribeSkeleton from '../Skeleton/AuthorSubscribeSkeleton';
import { Tier, TierCost } from '../SubscribeToAuthorModal/SubscribeToAuthorModal';
import VerificationCheck from '../VerificationCheck/VerificationCheck';

import styles from './AuthorSubscribe.module.scss';

const AuthorSubscribe: Component<{
  id?: string,
  author: PrimalUser | undefined,
}> = (props) => {
  const account = useAccountContext();
  const app = useAppContext();
  const navigate = useNavigate();
  const settings = useSettingsContext();

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

    if (!a || !account || !cost) return;

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


    const { success, note } = await sendEvent(subEvent, account.activeRelays, account.relaySettings, account?.proxyThroughPrimal || false);

    if (success && note) {
      const isZapped = await zapSubscription(
        note,
        a,
        account.publicKey,
        account.activeRelays,
        exchangeRate,
        account.activeNWC,
      );

      if (!isZapped) {
        unsubscribe(note.id);
      }
    }
  }

  const unsubscribe = async (eventId: string) => {
    const a = props.author;

    if (!a || !account) return;

    const unsubEvent = {
      kind: Kind.Unsubscribe,
      content: '',
      created_at: Math.floor((new Date()).getTime() / 1_000),

      tags: [
        ['p', a.pubkey],
        ['e', eventId],
      ],
    };

    await sendEvent(unsubEvent, account.activeRelays, account.relaySettings, account?.proxyThroughPrimal || false);

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
