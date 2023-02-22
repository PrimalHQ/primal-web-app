import { Component, createEffect, createResource, createSignal, For, Match, on, onCleanup, onMount, Show, Switch } from 'solid-js';
import styles from './Feed.module.scss';
import { APP_ID, useFeedContext } from '../contexts/FeedContext';
import { useParams } from '@solidjs/router';
import { isConnected, socket } from '../sockets';
import { convertToPosts, getExploreFeed, sortByRecency, sortByScore, sortByScore24h } from '../lib/feed';
import Post from '../components/Post/Post';
import { NostrEvent, NostrEOSE, NostrEventContent, NostrPostContent, NostrStatsContent, NostrUserContent, TrendingNotesStore } from '../types/primal';
import { createStore } from 'solid-js/store';

const Feed: Component = () => {

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

  onMount(async () => {
    socket()?.addEventListener('error', onError);
    socket()?.addEventListener('message', onMessage);
  });

  onCleanup(() => {
    socket()?.removeEventListener('error', onError);
    socket()?.removeEventListener('message', onMessage);
  });

  const onError = (error: Event) => {
    console.log("error: ", error);
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
  }


  const proccessPost = (post: NostrPostContent) => {
    console.log('PC: ', post);
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

      setNotes('notes', () => [...newPosts]);

      return;
    }


    if (type === 'EVENT') {
      if (content && content.kind === 0) {
        proccessUser(content);
      }
      if (content && content.kind === 1) {
        console.log('POSTS', content);
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
      <For each={notes.notes} >
        {(post) => {
          return <Post
            post={post}
          />
        }}
      </For>
    </div>
  )
}

export default Feed;
