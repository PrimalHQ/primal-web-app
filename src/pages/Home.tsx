import { Component, createEffect, createResource, createSignal, For, Match, on, onCleanup, onMount, Show, Switch } from 'solid-js';
import Post from '../components/Post/Post';
import styles from './Home.module.scss';
import { useFeedContext } from '../contexts/FeedContext';
import { Portal } from 'solid-js/web';
import TrendingPost from '../components/TrendingPost/TrendingPost';
import HomeHeader from '../components/HomeHeader/HomeHeader';

const Home: Component = () => {

  const context = useFeedContext();

  const [mounted, setMounted] = createSignal(false);

  let observer: IntersectionObserver | undefined;

  onMount(async () => {
    // Temporary fix for Portal rendering on initial load.
    setMounted(true);

    observer = new IntersectionObserver(entries => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          context?.actions?.loadNextPage();
        }
      });
    });

    const pag = document.getElementById('pagination_trigger');

    pag && observer && observer.observe(pag);
  });

  onCleanup(() => {
    const pag = document.getElementById('pagination_trigger');

    pag && observer?.unobserve(pag);
  });

  return (
    <div class={styles.homeContent}>
      <Switch>
        <Match when={mounted()}>
          <Portal
            mount={document.getElementById("central_header") as Node}
          >
            <HomeHeader />
          </Portal>
          <Portal
            ref={<div id="portal_div"></div> as HTMLDivElement}
            mount={document.getElementById("right_sidebar") as Node}
          >
            <TrendingPost />
          </Portal>
        </Match>
      </Switch>

      <Show
        when={context?.data?.posts && context.data.posts.length > 0}
        fallback={<div>Loading...</div>}
      >
        <For each={context?.data?.posts} >
          {(post) => {
            return <Post
              post={post}
            />
          }
          }
        </For>
      </Show>
      <div id="pagination_trigger" class={styles.paginate}>Pagination</div>
    </div>
  )
}

export default Home;
