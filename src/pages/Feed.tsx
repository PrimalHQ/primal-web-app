import { Component, createEffect, createResource, createSignal, For, Match, on, onCleanup, onMount, Show, Switch } from 'solid-js';
import styles from './Feed.module.scss';
import { APP_ID, useFeedContext } from '../contexts/FeedContext';
import { useParams } from '@solidjs/router';
import { isConnected, socket } from '../sockets';
import {
  getExploreFeed,
} from '../lib/feed';
import {
  convertToPosts,
  sortByRecency,
  sortByScore,
  sortByScore24h,
  sortByZapped,
} from '../stores/note';
import Note from '../components/Note/Note';
import { NostrEvent, NostrEOSE, NostrEventContent, NostrNoteContent, NostrStatsContent, NostrUserContent, TrendingNotesStore } from '../types/primal';
import { createStore } from 'solid-js/store';
import Loader from '../components/Loader/Loader';

const Feed: Component<{ scope: string, timeframe: string}> = () => {

  const context = useFeedContext();

  const params = useParams();

  const topic = `explore_feed_${params.scope}_${params.timeframe}_${APP_ID}`;

  const [notes, setNotes] = createStore<TrendingNotesStore>({
    users: {},
    messages: [],
    notes: [],
    postStats: {},
  });

  createEffect(() => {
    if (isConnected()) {
      socket()?.addEventListener('message', onMessage);
      socket()?.addEventListener('close', onSocketClose);

      context?.actions?.clearExploredNotes();

      getExploreFeed(
        context?.data.publicKey || '',
        topic,
        params.scope,
        params.timeframe,
        0,
        100,
      );
    }
  });

  onCleanup(() => {
    socket()?.removeEventListener('message', onMessage);
  });

  const onSocketClose = (closeEvent: CloseEvent) => {
    const webSocket = closeEvent.target as WebSocket;

    webSocket.removeEventListener('message', onMessage);
    webSocket.removeEventListener('close', onSocketClose);
  };

  const onMessage = (event: MessageEvent) => {
    const message: NostrEvent | NostrEOSE = JSON.parse(event.data);

    const [type, subId, content] = message;

    if (subId === topic) {
      processTrendingPost(type, content);
      return;
    }

  };


  // PROCESSING NOTES -------------------------------------
  // TODO: Cleanup and refactor

  const sortingPlan: Record<string, Function> = {
    trending: sortByScore24h,
    popular: sortByScore,
    latest: sortByRecency,
    mostzapped: sortByZapped,
  }


  const proccessPost = (post: NostrNoteContent) => {
    setNotes('messages', (msgs) => [ ...msgs, {...post}]);
  };

  const proccessUser = (user: NostrUserContent) => {
    setNotes('users', (users) => ({ ...users, [user.pubkey]: {...user}}))
  };

  const proccessStat = (stat: NostrStatsContent) => {
    const content = JSON.parse(stat.content);
    setNotes('postStats', (stats) => ({ ...stats, [content.event_id]: {...content} }))
  };

  const processTrendingPost = (type: string, content: NostrEventContent | undefined) => {

    if (type === 'EOSE') {
      const newPosts = sortingPlan[params.timeframe](convertToPosts({
        users: notes.users,
        messages: notes.messages,
        postStats: notes.postStats,
      }));

      context?.actions?.setExploredNotes(newPosts);

      return;
    }


    if (type === 'EVENT') {
      if (content && content.kind === 0) {
        proccessUser(content);
      }
      if (content && content.kind === 1) {
        proccessPost(content);
      }
      if (content && content.kind === 6) {
        proccessPost(content);
      }
      if (content && content.kind === 10000100) {
        proccessStat(content);
      }
    }
  };


// ----------------------------------------------------------


  return (
    <div class={styles.feedContent}>
      <Show
        when={context && context.data.exploredNotes.length > 0}
        fallback={<Loader />}
      >
        <For each={context?.data.exploredNotes} >
          {(note) => {
            return <Note
              note={note}
            />
          }}
        </For>
      </Show>
    </div>
  )
}

export default Feed;
