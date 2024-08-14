import { A, useNavigate } from '@solidjs/router';
import { batch, Component, createEffect, createSignal, For, JSXElement, onMount, Show } from 'solid-js';
import { createStore } from 'solid-js/store';
import { Portal } from 'solid-js/web';
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
import { userName } from '../../stores/profile';
import { PrimalArticle, PrimalUser, ZapOption } from '../../types/primal';
import { uuidv4 } from '../../utils';
import Avatar from '../Avatar/Avatar';
import ButtonPrimary from '../Buttons/ButtonPrimary';
import ButtonSecondary from '../Buttons/ButtonSecondary';
import Loader from '../Loader/Loader';
import { Tier, TierCost } from '../SubscribeToAuthorModal/SubscribeToAuthorModal';
import VerificationCheck from '../VerificationCheck/VerificationCheck';

import styles from './AuthorSubscribe.module.scss';

const AuthoreSubscribe: Component<{
  id?: string,
  pubkey: string,
}> = (props) => {
  const account = useAccountContext();
  const app = useAppContext();
  const navigate = useNavigate();
  const settings = useSettingsContext();

  const [isFetching, setIsFetching] = createSignal(false);
  const [author, setAuthor] = createSignal<PrimalUser>();

  const getAuthorData = async (pubkey: string) => {
    if (!account?.publicKey || !pubkey) return;

    const subId = `reads_fpi_${APP_ID}`;

    setIsFetching(() => true);

    const profile = await fetchUserProfile(account.publicKey, pubkey, subId);

    setIsFetching(() => false);

    setAuthor(() => ({ ...profile }));
  };

  createEffect(() => {
    getAuthorData(props.pubkey);
  });

  const doSubscription = async (tier: Tier, cost: TierCost, exchangeRate?: Record<string, Record<string, number>>) => {
    const a = author();

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
      const isZapped = await zapSubscription(note, a, account.publicKey, account.activeRelays, exchangeRate);

      if (!isZapped) {
        unsubscribe(note.id);
      }
    }
  }

  const unsubscribe = async (eventId: string) => {
    const a = author();

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
    app?.actions.openAuthorSubscribeModal(author(), doSubscription);
  };

  return (
    <A href={`/p/${author()?.npub}`} class={styles.authorFeaturCard}>
      <Show when={author()?.picture}>
        <img class={styles.image} src={author()?.picture} />
      </Show>
      <div class={styles.userInfo}>
        <div class={styles.userBasicData}>
          <div class={styles.userName}>
            {userName(author())}
            <VerificationCheck user={author()} />
          </div>
          <div class={styles.nip05}>
            {author()?.nip05}
          </div>
        </div>
        <div class={styles.userAdditionalData}>
          <div class={styles.userAbout}>
            {author()?.about}
          </div>
          <Show when={author()?.userStats?.followers_count}>
            <div class={styles.userStats}>
              <div class={styles.number}>
                {humanizeNumber(author()?.userStats?.followers_count || 0)}
              </div>
              <div class={styles.unit}>
                followers
              </div>
            </div>
          </Show>
        </div>
      </div>
    </A>
  );
}

export default hookForDev(AuthoreSubscribe);
