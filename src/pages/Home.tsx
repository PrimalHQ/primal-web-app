import {
  Component,
  createEffect,
  createReaction,
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
import Loader from '../components/Loader/Loader';
import Paginator from '../components/Paginator/Paginator';
import TrendingNotes from '../components/TrendingNotes/TrendingNotes';
import Branding from '../components/Branding/Branding';
import HomeHeaderPhone from '../components/HomeHeaderPhone/HomeHeaderPhone';
import { useHomeContext } from '../contexts/HomeContext';
import { isConnected, refreshSocketListeners, removeSocketListeners, socket } from '../sockets';
import { profile } from '../stores/profile';
import { NostrEvent, NostrEOSE } from '../types/primal';
import { APP_ID } from '../App';
import Wormhole from '../components/Wormhole/Wormhole';
import { scrollWindowTo } from '../lib/scroll';


const Home: Component = () => {

  const context = useHomeContext();

  const isPageLoading = () => context?.isFetching;

  const onPubKeyFound = createReaction(() => {
    context?.actions.selectFeed(context.availableFeeds[0]);
  });

  onMount(() => {
    scrollWindowTo(context?.scrollTop);

    if (!context?.selectedFeed) {
      context?.actions.selectFeed(context.availableFeeds[0]);
    }
    onPubKeyFound(() => profile.publicKey);

  });

  onCleanup(() => {
    removeSocketListeners(
      socket(),
      { message: onMessage, close: onSocketClose },
    );
  });

// EFFECTS --------------------------------------

  createEffect(() => {
    if (isConnected()) {
      refreshSocketListeners(
        socket(),
        { message: onMessage, close: onSocketClose },
      );
    }
  });

// SOCKET HANDLERS ------------------------------

  const onSocketClose = (closeEvent: CloseEvent) => {
    const webSocket = closeEvent.target as WebSocket;

    removeSocketListeners(
      webSocket,
      { message: onMessage, close: onSocketClose },
    );
  };

  const onMessage = (event: MessageEvent) => {
    const message: NostrEvent | NostrEOSE = JSON.parse(event.data);

    const [type, subId, content] = message;

    if (subId !== `home_feed_${APP_ID}`) {
      return;
    }

    if (type === 'EOSE') {
      context?.actions.savePage(context?.page);
      return;
    }

    if (type === 'EVENT') {
      context?.actions.updatePage(content);
      return;
    }
  };

// RENDER ---------------------------------------

  return (
    <div class={styles.homeContent}>
      <Wormhole
        to="branding_holder"
      >
        <Branding small={false} isHome={true} />
      </Wormhole>

      <div class={styles.normalCentralHeader}>
        <HomeHeader />
      </div>

      <div class={styles.phoneCentralHeader}>
        <HomeHeaderPhone />
      </div>

      <Wormhole
        to="right_sidebar"
      >
        <TrendingNotes />
      </Wormhole>

      <Show
        when={context?.notes && context.notes.length > 0}
      >
        <For each={context?.notes} >
          {note => <Note note={note} />}
        </For>
      </Show>

      <Switch>
        <Match
          when={!isPageLoading() && context?.notes && context?.notes.length === 0}
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
      <Paginator loadNextPage={context?.actions.fetchNextPage}/>
    </div>
  )
}

export default Home;
