import { Component, createEffect, createResource, createSignal, For, Match, on, onMount, Switch } from 'solid-js';
import Post from '../components/Post/Post';
import styles from './Home.module.scss';
import { useFeedContext } from '../contexts/FeedContext';
import { Portal, untrack } from 'solid-js/web';
import FeedSelect from '../components/FeedSelect/FeedSelect';
import TrendingPost from '../components/TrendingPost/TrendingPost';
import Welcome from '../components/Welcome/Welcome';
import HomeHeader from '../components/HomeHeader/HomeHeader';

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
