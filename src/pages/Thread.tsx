import { Component, createEffect, createResource, createSignal, For, Index, Match, on, onCleanup, onMount, Show, Switch, useContext } from 'solid-js';
import Post from '../components/Post/Post';
import styles from './Thread.module.scss';
import { useFeedContext } from '../contexts/FeedContext';
import { Portal } from 'solid-js/web';
import TrendingPost from '../components/TrendingPost/TrendingPost';
import HomeHeader from '../components/HomeHeader/HomeHeader';
import { useParams } from '@solidjs/router';
import { convertToPosts, getThread, sortByRecency } from '../lib/feed';
import { FeedStore, NostrEOSE, NostrEvent, NostrPostContent, NostrStatsContent, NostrUserContent, PrimalPost } from '../types/primal';
import { isConnected, socket } from '../sockets';
import { createStore } from 'solid-js/store';
import PrimaryPost from '../components/PrimaryPost/PrimaryPost';
import PeopleList from '../components/PeopleList/PeopleList';


const Home: Component = () => {
  const params = useParams();

  const context = useFeedContext();

  const [mainPost, setMainPost] = createSignal<PrimalPost>();

  const [mounted, setMounted] = createSignal(false);

  const randomNumber = Math.floor(Math.random()*10000000000);
  const subid = String(randomNumber);

  const [posts, setPosts] = createStore([]);
  const [page, setPage] = createStore({
    users: {},
    messages: [],
    postStats: {},
  });

  const onError = (error: Event) => {
    console.log("error: ", error);
  };

  const proccessPost = (post: NostrPostContent) => {
    setPage('messages', (msgs) => [ ...msgs, post]);
  };

  const proccessUser = (user: NostrUserContent) => {
    setPage('users', (users ) => ({ ...users, [user.pubkey]: user}))
  };

  const proccessStat = (stat: NostrStatsContent) => {
    const content = JSON.parse(stat.content);
    setPage('postStats', (stats) => ({ ...stats, [content.event_id]: content }))
  };

  const onMessage = (event: MessageEvent) => {
    const message: NostrEvent | NostrEOSE = JSON.parse(event.data);

    const [type, subkey, content] = message;

    if (type === 'EOSE') {
      const newPosts = sortByRecency(convertToPosts(page), true);

      setPage({ users: {}, messages: [], postStats: {}});
      setPosts(newPosts);

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

  const unique = (value, index, self) => {
    return self.indexOf(value) === index
  }

  const people = () => posts.reduce((acc, p) => {
    const user = p.user;
    if (acc.find(u => user.pubkey === u.pubkey)) {
      return acc;
    }

    return [...acc, user];
  }, []);

  onMount(() => {
    // Temporary fix for Portal rendering on initial load.
    setMounted(true);

    socket()?.addEventListener('error', onError);
    socket()?.addEventListener('message', onMessage);
  });

  onCleanup(() => {
    socket()?.removeEventListener('error', onError);
    socket()?.removeEventListener('message', onMessage);
  });

  createEffect(() => {
    params.postId && getThread(params.postId, subid);
  });

	createEffect(() => {
    if (isConnected()) {
      getThread(params.postId, subid);
		}
	});

  return (
    <div>
      <Show
        when={posts && posts.length > 0}
        fallback={<div>Loading...</div>}
      >
        <Switch>
          <Match when={mounted()}>
            <Portal
              ref={<div id="portal_div"></div> as HTMLDivElement}
              mount={document.getElementById("right_sidebar") as Node}
            >
              <PeopleList people={people()} />
            </Portal>
          </Match>
        </Switch>
        <For each={posts}>
          {post =>
            <div class={styles.threadList}>
              <Switch>
                <Match when={post.post.id === params.postId}>
                  <PrimaryPost post={post}/>
                  <div class={styles.replyBox}>
                    <div class={styles.border}>
                      <input
                        type="text"
                        placeholder={`reply to ${post.user.name}`}
                      />
                    </div>
                  </div>
                </Match>
                <Match when={post.post.id !== params.postId}>
                  <Post post={post} />
                </Match>
              </Switch>
            </div>
          }
        </For>
      </Show>
    </div>
  )
}

export default Home;
