import {
  Component,
  createEffect,
  createMemo,
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
import { PrimalNote, PrimalUser } from '../types/primal';
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

  const isClient = typeof window !== 'undefined';

  const INITIAL_VISIBLE_COUNT = 5;
  const NOTE_PREFETCH_AHEAD = 4;

  const [visibleNoteIds, setVisibleNoteIds] = createSignal<Set<string>>(new Set());

  let noteObserver: IntersectionObserver | undefined;

  const markNoteVisible = (noteId?: string) => {
    if (!noteId) return;
    setVisibleNoteIds(prev => {
      if (prev.has(noteId)) {
        return prev;
      }
      const next = new Set(prev);
      next.add(noteId);
      return next;
    });
  };

  const isNoteVisible = (note: PrimalNote) => visibleNoteIds().has(note.post.id);

  const getNoteObserver = () => {
    if (!isClient) return undefined;

    if (!noteObserver) {
      noteObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          const target = entry.target as HTMLElement;
          const noteId = target.dataset.noteId;
          const indexAttr = target.dataset.index;

          if (entry.isIntersecting) {
            markNoteVisible(noteId);

            if (indexAttr && context?.notes) {
              const index = parseInt(indexAttr, 10);
              if (!Number.isNaN(index)) {
                for (let i = 1; i <= NOTE_PREFETCH_AHEAD; i++) {
                  const upcoming = context.notes[index + i];
                  if (upcoming) {
                    markNoteVisible(upcoming.post.id);
                  }
                }
              }
            }

            noteObserver?.unobserve(target);
          }
        });
      }, {
        rootMargin: '400px 0px 600px 0px',
        threshold: 0.1,
      });
    }

    return noteObserver;
  };

  const syncVisibleNotesWithContent = () => {
    const notes = context?.notes || [];
    const allowedIds = new Set(notes.map(n => n.post.id));

    setVisibleNoteIds(prev => {
      let changed = false;
      const next = new Set<string>();

      prev.forEach(id => {
        if (allowedIds.has(id)) {
          next.add(id);
        } else {
          changed = true;
        }
      });

      if (!changed && next.size === prev.size) {
        return prev;
      }

      return next;
    });

    for (let i = 0; i < Math.min(INITIAL_VISIBLE_COUNT, notes.length); i++) {
      markNoteVisible(notes[i].post.id);
    }
  };

  const isPageLoading = () => context?.isFetching;

  let checkNewNotesTimer: number = 0;

  const [hasNewPosts, setHasNewPosts] = createSignal(false);
  const [newNotesCount, setNewNotesCount] = createSignal(0);
  const [newPostAuthors, setNewPostAuthors] = createStore<PrimalUser[]>([]);


  const newPostCount = () => newNotesCount() < 100 ? newNotesCount() : 100;


  onMount(() => {
    setIsHome(true);
    scrollWindowTo(context?.scrollTop);
    syncVisibleNotesWithContent();
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
    noteObserver?.disconnect();
    noteObserver = undefined;
  });

  createEffect(() => {
    syncVisibleNotesWithContent();
  });

  const LazyNote: Component<{ note: PrimalNote, index: number }> = (props) => {
    const noteId = () => props.note.post.id;
    const isReady = createMemo(() => isNoteVisible(props.note));

    let container: HTMLDivElement | null = null;

    const observe = () => {
      if (!container || isReady()) return;
      const observer = getNoteObserver();
      if (!observer) {
        markNoteVisible(noteId());
        return;
      }
      observer.observe(container);
    };

    onMount(() => {
      if (!isClient) {
        markNoteVisible(noteId());
        return;
      }
      observe();
    });

    createEffect(() => {
      if (isReady() && container) {
        noteObserver?.unobserve(container);
      }
    });

    onCleanup(() => {
      if (container) {
        noteObserver?.unobserve(container);
      }
    });

    const assignRef = (el: HTMLDivElement) => {
      container = el;
      if (!container) return;
      container.dataset.index = props.index.toString();
      container.dataset.noteId = noteId();
    };

    createEffect(() => {
      if (!container) return;
      container.dataset.index = props.index.toString();
      container.dataset.noteId = noteId();
    });

    return (
      <div ref={assignRef} class="animated">
        <Show when={isReady()} fallback={<FeedNoteSkeleton />}>
          <Note
            note={props.note}
            shorten={true}
            priorityMedia={props.index === 0}
            onRemove={(id: string) => {
              context?.actions.removeEvent(id, 'notes');
            }}
          />
        </Show>
      </div>
    );
  };

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
              <For each={context?.notes}>
                {(note, index) => (
                  <LazyNote note={note} index={index()} />
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
