import { Component, createEffect, createResource, createSignal, For, Match, on, onMount, Switch } from 'solid-js';
import Post from '../components/Post/Post';
import styles from './Home.module.scss';
import { useFeedContext } from '../contexts/FeedContext';
import { Portal, untrack } from 'solid-js/web';
import FeedSelect from '../components/FeedSelect/FeedSelect';
import TrendingPost from '../components/TrendingPost/TrendingPost';

const Home: Component = () => {

  const context = useFeedContext();

  const [mounted, setMounted] = createSignal(false);

  onMount(async () => {
    // Temporary fix for Portal rendering on initial load.
    setMounted(true);
  });

  return (
    <div class={styles.homeContent}>
      <Switch>
        <Match when={mounted()}>
          <Portal
            mount={document.getElementById("subheader_center") as Node}
          >
            <FeedSelect />
          </Portal>

          <Portal
            mount={document.getElementById("right_sidebar") as Node}
          >
            <div class={styles.trendingBar}>
              <h4>Trending on Nostr</h4>
              <aside>
                <TrendingPost />
              </aside>
            </div>
          </Portal>
        </Match>
      </Switch>

      <For each={context?.data?.posts} >
        {(post) => {
          return <Post
            post={post}
          />
        }
        }
      </For>
    </div>
  )
}

export default Home;
