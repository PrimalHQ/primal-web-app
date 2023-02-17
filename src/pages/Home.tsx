import { Component, createEffect, createResource, createSignal, For, Match, on, onCleanup, onMount, Show, Switch } from 'solid-js';
import Post from '../components/Post/Post';
import styles from './Home.module.scss';
import { useFeedContext } from '../contexts/FeedContext';
import { Portal } from 'solid-js/web';
import TrendingPost from '../components/TrendingPost/TrendingPost';
import HomeHeader from '../components/HomeHeader/HomeHeader';
import { isConnected, socket } from '../sockets';
import { convertToPosts, getFeed, getTrending } from '../lib/feed';
import { NostrEOSE, NostrEvent, NostrPostContent, NostrStatsContent, NostrUserContent } from '../types/primal';
import Loader from '../components/Loader/Loader';
import { createStore } from 'solid-js/store';

const Home: Component = () => {

  const context = useFeedContext();

  const [mounted, setMounted] = createSignal(false);

  const [trendingPosts, setTrendingPosts] = createStore({
    messages: [],
    users: {},
    posts: [],
    postStats: {},
  });

  let observer: IntersectionObserver | undefined;

  const randomNumber = Math.floor(Math.random()*10000000000);
  const subid = String(randomNumber);

  onMount(async () => {

    setTimeout(() => {
      // Temporary fix for Portal rendering on initial load.
      setMounted(true);

      window.scrollTo({
        top: context?.data.scrollTop,
        left: 0,
        behavior: 'instant',
      });
    }, 0);

    observer = new IntersectionObserver(entries => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          context?.actions?.loadNextPage();
        }
      });
    });

    const pag = document.getElementById('pagination_trigger');

    pag && observer && observer.observe(pag);

    socket()?.addEventListener('error', onError);
    socket()?.addEventListener('message', onMessage);


  });

  onCleanup(() => {
    const pag = document.getElementById('pagination_trigger');

    pag && observer?.unobserve(pag);


    socket()?.removeEventListener('error', onError);
    socket()?.removeEventListener('message', onMessage);
  });

	createEffect(() => {
    if (isConnected()) {
      // const pubkey = context?.data?.selectedFeed?.hex || '';

      // context?.actions?.clearData();
      // getFeed(pubkey, subid);

      setTrendingPosts({
        messages: [],
        users: {},
        postStats: {},
      });
      getTrending(`trending_${subid}`);
		}
	});

  const onError = (error: Event) => {
    console.log("error: ", error);
  };

  const onMessage = (event: MessageEvent) => {
    const message: NostrEvent | NostrEOSE = JSON.parse(event.data);

    const [type, subId, content] = message;

    if (subId === `trending_${subid}`) {
      processTrendingPost(type, content);
      return;
    }


    if (type === 'EOSE') {
      const newPosts = convertToPosts(context?.page);
      context?.actions?.clearPage();
      context?.actions?.savePosts(newPosts);

      return;
    }

    context?.actions?.proccessEventContent(content, type);
  };


// PROCESSING TRENDS -------------------------------------
// TODO: Cleanup and refactor



  const proccessPost = (post: NostrPostContent) => {
    setTrendingPosts('messages', (msgs) => [ ...msgs, post]);
  };

  const proccessUser = (user: NostrUserContent) => {
    setTrendingPosts('users', (users) => ({ ...users, [user.pubkey]: user}))
  };

  const proccessStat = (stat: NostrStatsContent) => {
    const content = JSON.parse(stat.content);
    setTrendingPosts('postStats', (stats) => ({ ...stats, [content.event_id]: content }))
  };

  const processTrendingPost = (type, content) => {
    if (type === 'EOSE') {
      const newPosts = convertToPosts(trendingPosts);

      setTrendingPosts('posts', () => [...newPosts]);

      return;
    }

    if (type === 'EVENT') {
      if (content.kind === 0) {
        proccessUser(content);
      }
      if (content.kind === 1) {
        proccessPost(content);
      }
      if (content.kind === 10000100) {
        proccessStat(content);
      }
    }
  };


// ----------------------------------------------------------



  const isPageLoading = () => context?.data.isFetching

  return (
    <div class={styles.homeContent}>
      <Show when={mounted()}>
        <div id="central_header">
          <HomeHeader />
        </div>
        <Portal
          ref={<div id="portal_div"></div> as HTMLDivElement}
          mount={document.getElementById("right_sidebar") as Node}
        >
          <TrendingPost posts={trendingPosts.posts}/>
        </Portal>

        <Show
          when={context?.data?.posts && context.data.posts.length > 0}
        >
          <For each={context?.data?.posts} >
            {(post) => {
              return <Post
                post={post}
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
            <Loader />
          </Match>
        </Switch>
      </Show>
      <div id="pagination_trigger" class={styles.paginate}>
      </div>
    </div>
  )
}

export default Home;
