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
import Paginator from '../components/Paginator/Paginator';
import HomeSidebar from '../components/HomeSidebar/HomeSidebar';
import HomeHeaderPhone from '../components/HomeHeaderPhone/HomeHeaderPhone';
import Wormhole from '../components/Wormhole/Wormhole';
import { scrollWindowTo } from '../lib/scroll';
import StickySidebar from '../components/StickySidebar/StickySidebar';
import { useHomeContext } from '../contexts/HomeContext';
import { useIntl } from '@cookbook/solid-intl';
import { createStore } from 'solid-js/store';
import { PrimalUser } from '../types/primal';
import { branding } from '../translations';
import Search from '../components/Search/Search';
import { setIsHome } from '../components/Layout/Layout';
import PageTitle from '../components/PageTitle/PageTitle';
import { useAppContext } from '../contexts/AppContext';
import FeedNoteSkeleton from '../components/Skeleton/FeedNoteSkeleton';
import { Transition } from 'solid-transition-group';
import { isPhone } from '../utils';
import PageCaption from '../components/PageCaption/PageCaption';


const Home: Component = () => {

  const context = useHomeContext();
  const intl = useIntl();
  const app = useAppContext();

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
    if ((context?.futureNotes.length || 0) > 99 || app?.isInactive) {
      clearInterval(checkNewNotesTimer);
      return;
    }

    const spec = context?.selectedFeed?.spec || '';

    if (checkNewNotesTimer) {
      clearInterval(checkNewNotesTimer);
      setHasNewPosts(false);
      setNewNotesCount(0);
      setNewPostAuthors(() => []);
    }

    const timeout = 25_000 + Math.random() * 10_000;

    checkNewNotesTimer = setInterval(() => {
      context?.actions.checkForNewNotes(spec);
    }, timeout);
  });

  createEffect(() => {
    const count = context?.futureNotes.length || 0;
    if (count === 0) {
      return
    }

    if (!hasNewPosts()) {
      setHasNewPosts(true);
    }

    if (newPostAuthors.length < 3) {
      const users = context?.futureNotes.map(note => note.user) || [];

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
    if (newNotesCount() > 100 || app?.appState === 'waking') {
      context?.actions.getFirstPage();
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

      <Show when={!isPhone()}>
        <Wormhole
          to="search_section"
        >
          <Search />
        </Wormhole>

        <StickySidebar>
          <HomeSidebar />
        </StickySidebar>
      </Show>

      <div class={styles.normalCentralHeader}>
        <HomeHeader
          hasNewPosts={hasNewPosts}
          loadNewContent={loadNewContent}
          newPostCount={newPostCount}
          newPostAuthors={newPostAuthors}
        />
      </div>

      <Show when={isPhone()}>
        <PageCaption>
          <HomeHeaderPhone />
        </PageCaption>
      </Show>


      <div class={styles.homeFeed}>
        <Transition name="slide-fade">
          <Show
            when={context?.notes && context.notes.length > 0}
            fallback={
              <div>
                <For each={new Array(5)}>
                  {() => <FeedNoteSkeleton />}
                </For>
              </div>
            }
          >
            <div class={isPhone() ? styles.readsFeed : ''}>
              <For each={context?.notes} >
                {note => (
                  <div class="animated">
                    <Note
                      note={note}
                      shorten={true}
                      onRemove={(id: string) => {
                        context?.actions.removeEvent(id, 'notes');
                      }}
                    />
                  </div>
                )}
              </For>
            </div>
          </Show>
        </Transition>
      </div>

      <Switch>
        <Match
          when={!isPageLoading() && context?.notes && context?.notes.length === 0}
        >
          <div class={styles.noContent}>
          </div>
        </Match>
        <Match
          when={isPageLoading()}
        >
          <div class={styles.noContent}>
          </div>
        </Match>
      </Switch>
      <Paginator loadNextPage={context?.actions.fetchNextPage}/>
    </div>
  )
}

export default Home;
