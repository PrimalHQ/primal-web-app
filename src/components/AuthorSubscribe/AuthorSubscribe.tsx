import { A, useNavigate } from '@solidjs/router';
import { batch, Component, createEffect, createSignal, For, JSXElement, onMount, Show } from 'solid-js';
import { createStore } from 'solid-js/store';
import { Portal } from 'solid-js/web';
import { APP_ID } from '../../App';
import { Kind } from '../../constants';
import { useAccountContext } from '../../contexts/AccountContext';
import { CustomZapInfo, useAppContext } from '../../contexts/AppContext';
import { useThreadContext } from '../../contexts/ThreadContext';
import { fetchUserProfile } from '../../handleNotes';
import { date, shortDate } from '../../lib/dates';
import { hookForDev } from '../../lib/devTools';
import { sendEvent } from '../../lib/notes';
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

  const [isFetching, setIsFetching] = createSignal(false);
  const [author, setAuthor] = createSignal<PrimalUser>();

  const getAuthorData = async () => {
    if (!account?.publicKey) return;

    const subId = `reads_fpi_${APP_ID}`;

    setIsFetching(() => true);

    const profile = await fetchUserProfile(account.publicKey, props.pubkey, subId);

    setIsFetching(() => false);

    setAuthor(() => ({ ...profile }));
  };

  onMount(() => {
    getAuthorData();
  });

  const doSubscription = async (tier: Tier, cost: TierCost) => {
    const a = author();

    if (!a || !account || !cost) return;

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

    const { success, note } = await sendEvent(subEvent, account.relays, account.relaySettings);

    if (success && note) {
      await zapSubscription(note, a, account.publicKey, account.relays);
    }
  }

  const openSubscribe = () => {
    app?.actions.openAuthorSubscribeModal(author(), doSubscription);
  };

  return (
    <div class={styles.featuredAuthor}>
      <Show
        when={!isFetching()}
        fallback={<Loader />}
      >
        <div class={styles.authorSubscribeCard}>
          <div class={styles.userInfo}>
            <Avatar user={author()} />
            <div class={styles.userData}>
              <div class={styles.userName}>
                {userName(author())}
                <VerificationCheck user={author()} />
              </div>
              <div class={styles.nip05}>
                {author()?.nip05}
              </div>
            </div>
          </div>
          <div class={styles.userPitch}>
            {author()?.about || ''}
          </div>
          <div class={styles.actions}>
            <ButtonSecondary
              light={true}
              onClick={() => navigate(`/p/${author()?.npub}`)}
            >
              view profile
            </ButtonSecondary>

            <ButtonPrimary onClick={openSubscribe}>
              subscribe
            </ButtonPrimary>
          </div>
        </div>
      </Show>
    </div>
  );
}

export default hookForDev(AuthoreSubscribe);
