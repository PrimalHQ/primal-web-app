import { Component, createEffect, createResource, createSignal, For, Match, on, onCleanup, onMount, Show, Switch } from 'solid-js';
import Post from '../components/Post/Post';
import styles from './Home.module.scss';
import { useFeedContext } from '../contexts/FeedContext';
import { Portal } from 'solid-js/web';
import TrendingPost from '../components/TrendingPost/TrendingPost';
import HomeHeader from '../components/HomeHeader/HomeHeader';
import { isConnected, socket } from '../sockets';
import { convertToPosts, getFeed } from '../lib/feed';
import { NostrEOSE, NostrEvent } from '../types/primal';

const Home: Component = () => {

  const context = useFeedContext();

  const [mounted, setMounted] = createSignal(false);

  let observer: IntersectionObserver | undefined;

  const randomNumber = Math.floor(Math.random()*10000000000);
  const subid = String(randomNumber);

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
      const pubkey = context?.data?.selectedFeed?.hex || '';

      context?.actions?.clearData();
      getFeed(pubkey, subid);
		}
	});

  const onError = (error: Event) => {
    console.log("error: ", error);
  };

  const onMessage = (event: MessageEvent) => {
    const message: NostrEvent | NostrEOSE = JSON.parse(event.data);

    const [type, subkey, content] = message;

    if (type === 'EOSE') {
      const newPosts = convertToPosts(context?.page);

      context?.actions?.clearPage();
      context?.actions?.savePosts(newPosts);

      return;
    }

    context?.actions?.proccessEventContent(content, type);
  };

  return (
    <div class={styles.homeContent}>
      <Switch>
        <Match when={mounted()}>
          <div id="central_header">
            <HomeHeader />
          </div>
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
      <div id="pagination_trigger" class={styles.paginate}>Loading...</div>
    </div>
  )
}

export default Home;
