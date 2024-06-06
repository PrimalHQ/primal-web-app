import { A, useNavigate } from '@solidjs/router';
import { batch, Component, createEffect, createSignal, For, JSXElement, onMount, Show } from 'solid-js';
import { createStore } from 'solid-js/store';
import { Portal } from 'solid-js/web';
import { APP_ID } from '../../App';
import { useAccountContext } from '../../contexts/AccountContext';
import { CustomZapInfo, useAppContext } from '../../contexts/AppContext';
import { useThreadContext } from '../../contexts/ThreadContext';
import { fetchUserProfile } from '../../handleNotes';
import { date, shortDate } from '../../lib/dates';
import { hookForDev } from '../../lib/devTools';
import { userName } from '../../stores/profile';
import { PrimalArticle, PrimalUser, ZapOption } from '../../types/primal';
import { uuidv4 } from '../../utils';
import Avatar from '../Avatar/Avatar';
import ButtonPrimary from '../Buttons/ButtonPrimary';
import ButtonSecondary from '../Buttons/ButtonSecondary';
import Loader from '../Loader/Loader';
import { NoteReactionsState } from '../Note/Note';
import NoteContextTrigger from '../Note/NoteContextTrigger';
import ArticleFooter from '../Note/NoteFooter/ArticleFooter';
import NoteFooter from '../Note/NoteFooter/NoteFooter';
import NoteTopZaps from '../Note/NoteTopZaps';
import NoteTopZapsCompact from '../Note/NoteTopZapsCompact';
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

  const openSubscribe = () => {
    app?.actions.openAuthorSubscribeModal(author());
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
            <ButtonSecondary onClick={() => navigate(`/p/${author()?.npub}`)}>
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
