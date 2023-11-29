import {
  Component,
  createEffect,
  createSignal,
  For,
  Match,
  onCleanup,
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
import { feedNewPosts, placeholders, branding } from '../translations';
import Search from '../components/Search/Search';
import { setIsHome } from '../components/Layout/Layout';
import PageTitle from '../components/PageTitle/PageTitle';


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


  onMount(() => {
    setIsHome(true);
    scrollWindowTo(context?.scrollTop);
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

  onCleanup(()=> {
    clearInterval(checkNewNotesTimer);
    setIsHome(false);
  });

  const loadNewContent = () => {
    if (newNotesCount() > 100) {
      location.reload();
      return;
    }
    context?.actions.loadFutureContent();
    scrollWindowTo(0, true);
    setHasNewPosts(false);
    setNewNotesCount(0);
    setNewPostAuthors(() => []);
  }

  return (
    <div class={styles.homeContent}>
      <PageTitle title={intl.formatMessage(branding)} />
      <Wormhole
        to="search_section"
      >
        <Search />
      </Wormhole>

      <div class={styles.normalCentralHeader}>
        <HomeHeader
          hasNewPosts={hasNewPosts}
          loadNewContent={loadNewContent}
          newPostCount={newPostCount}
          newPostAuthors={newPostAuthors}
        />
      </div>

      <div class={styles.phoneCentralHeader}>
        <HomeHeaderPhone />
      </div>

      <StickySidebar>
        <HomeSidebar />
      </StickySidebar>

      <Show
        when={context?.notes && context.notes.length > 0}
      >
        <div class={styles.feed}>
          <For each={context?.notes} >
            {note => <Note note={note} shorten={true} />}
          </For>
        </div>
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
