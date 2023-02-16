import { Component, createEffect, createResource, createSignal, For, Match, on, onCleanup, onMount, Show, Switch } from 'solid-js';
import Post from '../components/Post/Post';
import styles from './Home.module.scss';
import { useFeedContext } from '../contexts/FeedContext';
import { Portal } from 'solid-js/web';
import TrendingPost from '../components/TrendingPost/TrendingPost';
import HomeHeader from '../components/HomeHeader/HomeHeader';

const Home: Component = () => {

  const context = useFeedContext();

  return (
    <div>
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
    </div>
  )
}

export default Home;
