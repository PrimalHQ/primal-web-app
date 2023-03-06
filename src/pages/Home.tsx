import { Component, createEffect, createResource, createSignal, For, Match, on, onCleanup, onMount, Show, Switch } from 'solid-js';
import Post from '../components/Post/Post';
import styles from './Home.module.scss';
import { APP_ID, useFeedContext } from '../contexts/FeedContext';
import { Portal } from 'solid-js/web';
import TrendingPost from '../components/TrendingPost/TrendingPost';
import HomeHeader from '../components/HomeHeader/HomeHeader';
import { isConnected, socket } from '../sockets';
import { convertToPosts, getFeed, getTrending, sortByRecency, sortByScore24h } from '../lib/feed';
import { NostrEOSE, NostrEvent, NostrEventContent, NostrPostContent, NostrStatsContent, NostrUserContent, TrendingNotesStore } from '../types/primal';
import Loader from '../components/Loader/Loader';
import { createStore } from 'solid-js/store';
import Paginator from '../components/Paginator/Paginator';
import TrendingNotes from '../components/TrendingNotes/TrendingNotes';
import { proccessUserProfile } from '../stores/profile';
import Branding from '../components/Branding/Branding';
import { getLikes } from '../lib/posts';

const Home: Component = () => {

  const context = useFeedContext();

  const [mounted, setMounted] = createSignal(false);

  onMount(async () => {

    setTimeout(() => {
      // Temporary fix for Portal rendering on initial load.
      setMounted(true);

      window.scrollTo({
        top: context?.data.scrollTop,
        left: 0,
        // @ts-expect-error https://github.com/microsoft/TypeScript-DOM-lib-generator/issues/5
        behavior: 'instant',
      });
    }, 0);
  });

  const isPageLoading = () => context?.data.isFetching;

  return (
    <div class={styles.homeContent}>
      <Show when={mounted()}>
        <Portal
          mount={document.getElementById("branding_holder") as Node}
        >
          <Branding small={false} isHome={true} />
        </Portal>

        <div id="central_header">
          <HomeHeader />
        </div>
        <Portal
          mount={document.getElementById("right_sidebar") as Node}
        >
          <TrendingNotes />
        </Portal>

        <Show
          when={context?.data?.posts && context.data.posts.length > 0}
        >
          <For each={context?.data?.posts} >
            {(post) => {
              return <Post
                post={post}
                liked={context?.likes.includes(post.post.id)}
              />
            }}
          </For>
        </Show>

        <Switch>
          <Match
            when={!isPageLoading() && context?.data?.posts && context.data.posts.length === 0}
          >
            <div class={styles.noContent}>
              <Loader />
            </div>
          </Match>
          <Match
            when={!isPageLoading()}
          >
            <div class={styles.endOfContent}>
              You reached the end. You are a quick reader.
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
      </Show>
      <Paginator loadNextPage={context?.actions?.loadNextPage}/>
    </div>
  )
}

export default Home;
