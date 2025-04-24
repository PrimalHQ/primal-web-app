import {
  Component,
  createEffect,
  createSignal,
  For,
  Match,
  on,
  onCleanup,
  onMount,
  Show,
  Switch
} from 'solid-js';
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
import { PrimalArticle, PrimalUser } from '../types/primal';
import Avatar from '../components/Avatar/Avatar';
import { userName } from '../stores/profile';
import { useAccountContext } from '../contexts/AccountContext';
import { reads, branding } from '../translations';
import Search from '../components/Search/Search';
import { setIsHome } from '../components/Layout/Layout';
import PageTitle from '../components/PageTitle/PageTitle';
import { useAppContext } from '../contexts/AppContext';
import { useReadsContext } from '../contexts/ReadsContext';
import ArticlePreview from '../components/ArticlePreview/ArticlePreview';
import PageCaption from '../components/PageCaption/PageCaption';
import ReadsSidebar from '../components/HomeSidebar/ReadsSidebar';
import ReedSelect from '../components/FeedSelect/ReedSelect';
import ReadsHeader from '../components/HomeHeader/ReadsHeader';
import { A, useNavigate, useParams } from '@solidjs/router';
import { APP_ID } from '../App';
import ButtonGhost from '../components/Buttons/ButtonGhost';
import ArticlePreviewSkeleton from '../components/Skeleton/ArticlePreviewSkeleton';
import { Transition } from 'solid-transition-group';
import { ToggleButton } from '@kobalte/core/toggle-button';
import { isDev, isPhone } from '../utils';
import ArticlePreviewPhone from '../components/ArticlePreview/ArticlePreviewPhone';
import ArticlePreviewPhoneSkeleton from '../components/Skeleton/ArticlePreviewPhoneSkeleton';


const Reads: Component = () => {

  const context = useReadsContext();
  const account = useAccountContext();
  const intl = useIntl();
  const app = useAppContext();
  const params = useParams();
  const navigate = useNavigate();

  const isPageLoading = () => context?.isFetching;

  let checkNewNotesTimer: number = 0;

  const [hasNewPosts, setHasNewPosts] = createSignal(false);
  const [newNotesCount, setNewNotesCount] = createSignal(0);
  const [newPostAuthors, setNewPostAuthors] = createStore<PrimalUser[]>([]);

  const newPostCount = () => newNotesCount() < 100 ? newNotesCount() : 100;

  onMount(() => {
    // setIsHome(true);
    scrollWindowTo(context?.scrollTop);
  });

  createEffect(() => {
    if ((context?.future.notes.length || 0) > 99 || app?.isInactive) {
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
        const isDuplicate = acc.find(u => u && u.pubkey === user.pubkey);
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

  createEffect(on(() => params.topic, (v, p) => {
    if (v && v.length > 0) {
      context?.actions.clearNotes();
      context?.actions.fetchNotes(`{\"kind\":\"reads\",\"topic\":\"${decodeURIComponent(params.topic)}\"}`);
      return;
    } else {
      if (p && p.length > 0) {
        context?.actions.refetchSelectedFeed();
      }
    }
  }));

  createEffect(on(() => account?.isKeyLookupDone, (v, p) => {

    if (v && v !== p && account?.publicKey && !params.topic) {
      const selected = context?.selectedFeed;;

      // context?.actions.resetSelectedFeed();
      if (selected) {
        // context?.actions.clearNotes();
        context?.actions.selectFeed({ ...selected });
      }
    }
  }));

  const onArticleRendered = (article: PrimalArticle, el: HTMLAnchorElement | undefined) => {
    context?.actions.setArticleHeight(article.naddr, el?.getBoundingClientRect().height || 0);
  };

  return (
    <div class={styles.homeContent}>
      <PageTitle title={intl.formatMessage(branding)} />
      <Wormhole
        to="search_section"
      >
        <Show when={!isPhone()}>
          <Search />
        </Show>
      </Wormhole>

      <PageCaption title={intl.formatMessage(reads.pageTitle)}>
        <Show
          when={params.topic}
          fallback={
            <div>
              <ReadsHeader
                hasNewPosts={hasNewPosts}
                loadNewContent={loadNewContent}
                newPostCount={newPostCount}
                newPostAuthors={newPostAuthors}
              />
            </div>
          }
        >
          <div class={styles.readsTopicHeader}>
            <div
              class={styles.backToReads}
            >
              topic:
            </div>
            <A
              class={styles.topicBubble}
              href={'/reads'}
              onClick={() => context?.actions.refetchSelectedFeed()}
            >
              <div>
                {decodeURIComponent(params.topic)}
              </div>

              <div class={styles.closeIcon}></div>
            </A>
          </div>
        </Show>
      </PageCaption>

      <Show when={!isPhone()}>
        <StickySidebar>
          <ReadsSidebar />
        </StickySidebar>
      </Show>

      <div class={styles.readsFeed}>
        <Transition name="slide-fade">
          <Show
            when={context?.notes && context.notes.length > 0}
            fallback={
              <div>
                <For each={new Array(5)}>
                  {() => isPhone() ?
                    <ArticlePreviewPhoneSkeleton /> :
                    <ArticlePreviewSkeleton />}
                </For>
              </div>
            }
          >
            <div class={styles.feed}>
              <Show
                when={!isPhone()}
                fallback={
                  <For each={context?.notes} >
                    {(note) => (
                      <div class="animated">
                        <ArticlePreviewPhone
                          article={note}
                          height={context?.articleHeights[note.naddr]}
                          onRender={onArticleRendered}
                          hideFooter={true}
                          onRemove={(id: string) => {
                            context?.actions.removeEvent(id);
                          }}
                        />
                      </div>
                    )}
                  </For>
                }
              >
                <For each={context?.notes} >
                  {(note) => (
                    <div class="animated">
                      <ArticlePreview
                        article={note}
                        height={context?.articleHeights[note.naddr]}
                        onRender={onArticleRendered}
                        onClick={navigate}
                        onRemove={(id: string) => {
                          context?.actions.removeEvent(id);
                        }}
                      />
                    </div>
                  )}
                </For>
              </Show>
            </div>
          </Show>
        </Transition>

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
        <Paginator loadNextPage={() => context?.actions.fetchNextPage(params.topic)}/>
      </div>
    </div>
  )
}

export default Reads;
