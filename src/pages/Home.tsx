import {
  Component,
  createEffect,
  createSignal,
  For,
  Match,
  onMount,
  Show,
  Switch
} from 'solid-js';
import Note from '../components/Note/Note';
import styles from './Home.module.scss';
import HomeHeader from '../components/HomeHeader/HomeHeader';
import Loader from '../components/Loader/Loader';
import Paginator from '../components/Paginator/Paginator';
import HomeSidebar from '../components/HomeSidebar/HomeSidebar';
import Branding from '../components/Branding/Branding';
import HomeHeaderPhone from '../components/HomeHeaderPhone/HomeHeaderPhone';
import Wormhole from '../components/Wormhole/Wormhole';
import { scrollWindowTo } from '../lib/scroll';
import StickySidebar from '../components/StickySidebar/StickySidebar';
import { useHomeContext } from '../contexts/HomeContext';
import { useIntl } from '@cookbook/solid-intl';
import { createStore } from 'solid-js/store';
import { PrimalUser } from '../types/primal';
import Avatar from '../components/Avatar/Avatar';
import { userName } from '../stores/profile';
import { useAccountContext } from '../contexts/AccountContext';


const Home: Component = () => {

  const context = useHomeContext();
  const account = useAccountContext();
  const intl = useIntl();

  const isPageLoading = () => context?.isFetching;

  let checkNewNotesTimer: number = 0;

  const [hasNewPosts, setHasNewPosts] = createSignal(false);
  const [newNotesCount, setNewNotesCount] = createSignal(0);
  const [newPostAuthors, setNewPostAuthors] = createStore<PrimalUser[]>([]);


  const newPostCount = () => newNotesCount() < 100 ? newNotesCount() : 100;

  // const onConnectionEstablished = createReaction(() => {
  //   context?.actions.selectFeed(settings?.availableFeeds[0]);
  // });


  // const onPubKeyFound = createReaction(() => {
  //   if (!isConnected()) {
  //     onConnectionEstablished(() => isConnected());
  //     return;
  //   }
  //   context?.actions.selectFeed(settings?.availableFeeds[0]);
  // });

  onMount(() => {
    scrollWindowTo(context?.scrollTop);

    // if (!context?.selectedFeed) {
    //   context?.actions.selectFeed(settings?.availableFeeds[0]);
    // }
    // onPubKeyFound(() => account?.publicKey);
  });

  createEffect(() => {
    const hex = context?.selectedFeed?.hex;

    if (checkNewNotesTimer) {
      clearInterval(checkNewNotesTimer);
      setHasNewPosts(false);
      setNewNotesCount(0);
      setNewPostAuthors(() => []);
    }

    const timeout = 25_000 + Math.random() * 10_000;
    checkNewNotesTimer = setInterval(() => {
      context?.actions.checkForNewNotes(hex);
    }, timeout);

  });

  createEffect(() => {
    const count = context?.future.notes.length || 0;
    if (count === 0) {
      return
    }

    if (!hasNewPosts()) {
      setHasNewPosts(true);
    }

    if (newPostAuthors.length < 3) {
      const users = context?.future.notes.map(note => note.user) || [];

      const uniqueUsers = users.reduce<PrimalUser[]>((acc, user) => {
        const isDuplicate = acc.find(u => u.pubkey === user.pubkey);
        return isDuplicate ?  acc : [ ...acc, user ];
      }, []).slice(0, 3);

      setNewPostAuthors(() => [...uniqueUsers]);
    }

    setNewNotesCount(count);


  });

  const loadNewContent = () => {
    if (newNotesCount() > 100) {
      location.reload();
    }
    context?.actions.loadFutureContent();
    scrollWindowTo(0, true);
    setHasNewPosts(false);
    setNewNotesCount(0);
    setNewPostAuthors(() => []);
  }

  return (
    <div class={styles.homeContent}>
      <Wormhole
        to="branding_holder"
      >
        <Branding small={false} isHome={true} />
      </Wormhole>

      <div class={styles.normalCentralHeader}>
        <HomeHeader />
      </div>

      <div class={styles.phoneCentralHeader}>
        <HomeHeaderPhone />
      </div>

      <Show when={
        hasNewPosts() &&
        (context?.scrollTop && context.scrollTop > 40) &&
        !account?.showNewNoteForm
      }>
        <div class={styles.newContentNotification}>
          <button
            onClick={loadNewContent}
          >
            <div class={styles.avatars}>
              <For each={newPostAuthors}>
                {(user) => (
                  <div
                    class={styles.avatar}
                    title={userName(user)}
                  >
                    <Avatar src={user.picture} size="xss" />
                  </div>
                )}
              </For>
            </div>
            <div class={styles.counter}>
              {intl.formatMessage({
                id: 'feed.newPosts',
                defaultMessage: `{number, plural,
                  =0 {}
                  one {# new post}
                  =100 {99+ new posts}
                  other {# new posts}}`,
                description: 'Label for a button to load new posts',
              }, {
                number: newPostCount(),
              })}
            </div>
          </button>
        </div>
      </Show>

      <StickySidebar>
        <HomeSidebar />
      </StickySidebar>

      <Show
        when={hasNewPosts() && (context?.scrollTop !== undefined && context.scrollTop <= 40)}
        fallback={<div class={styles.newContentItem}></div>}
      >
        <div class={styles.newContentItem}>
          <button
            onClick={loadNewContent}
          >
            <div class={styles.counter}>
              {intl.formatMessage({
                  id: 'feed.newPosts',
                  defaultMessage: `{number, plural,
                    =0 {}
                    one {# new post}
                    =100 {99+ new posts}
                    other {# new posts}}`,
                  description: 'Label for a button to load new posts',
                }, {
                  number: newPostCount(),
                })}
            </div>
          </button>
        </div>
      </Show>

      <Show
        when={context?.notes && context.notes.length > 0}
      >
        <For each={context?.notes} >
          {note => <Note note={note} />}
        </For>
      </Show>

      <Switch>
        <Match
          when={!isPageLoading() && context?.notes && context?.notes.length === 0}
        >
          <div class={styles.noContent}>
            <Loader />
          </div>
        </Match>
        <Match
          when={!isPageLoading()}
        >
          <div class={styles.endOfContent}>
            {intl.formatMessage({
              id: 'placeholders.endOfFeed',
              defaultMessage: 'Your reached the end. You are a quick reader',
              description: 'Message displayed when user reaches the end of the feed',
            })}
          </div>
        </Match>
        <Match
          when={isPageLoading()}
        >
          <div class={styles.noContent}>
            <Loader />
          </div>
        </Match>
      </Switch>
      <Paginator loadNextPage={context?.actions.fetchNextPage}/>
    </div>
  )
}

export default Home;
