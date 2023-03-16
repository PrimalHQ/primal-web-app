import { Component, createEffect, createResource, createSignal, For, Index, Match, on, onCleanup, onMount, Show, Switch, useContext } from 'solid-js';
import Post from '../components/Post/Post';
import styles from './Thread.module.scss';
import { APP_ID, useFeedContext } from '../contexts/FeedContext';
import { Portal } from 'solid-js/web';
import TrendingPost from '../components/TrendingPost/TrendingPost';
import HomeHeader from '../components/HomeHeader/HomeHeader';
import { useParams } from '@solidjs/router';
import { convertToPosts, getThread, sortByRecency } from '../lib/feed';
import { FeedStore, NostrEOSE, NostrEvent, NostrPostContent, NostrStatsContent, NostrUserContent, PrimalNote } from '../types/primal';
import { isConnected, socket } from '../sockets';
import { createStore } from 'solid-js/store';
import PrimaryPost from '../components/PrimaryPost/PrimaryPost';
import PeopleList from '../components/PeopleList/PeopleList';
import PageNav from '../components/PageNav/PageNav';
import ReplyToNote from '../components/ReplyToNote/ReplyToNote';

import Loader from '../components/Loader/Loader';
import { noteEncode } from 'nostr-tools/nip19';
import { likedNotes } from '../lib/posts';


const Thread: Component = () => {
  const params = useParams();

  const postId = () => {
    if (params.postId.startsWith('note')) {
      return params.postId;
    }

    return noteEncode(params.postId);
  };

  const context = useFeedContext();

  const [mounted, setMounted] = createSignal(false);

  const [parentNotes, setParentNotes] = createStore<PrimalNote[]>([]);
  const [replies, setReplies] = createStore<PrimalNote[]>([]);
  const [primaryNote, setPrimaryNote] = createSignal<PrimalNote>();

  const [isFetching, setIsFetching] = createSignal(false);

  const [page, setPage] = createStore({
    users: {},
    messages: [],
    postStats: {},
  });

  const activeUser = () => context?.data.activeUser;

  const proccessPost = (post: NostrPostContent) => {
    setPage('messages', (msgs) => [ ...msgs, post]);
  };

  const proccessUser = (user: NostrUserCosetParentNotesntent) => {
    setPage('users', (users ) => ({ ...users, [user.pubkey]: user}))
  };

  const proccessStat = (stat: NostrStatsContent) => {
    const content = JSON.parse(stat.content);
    setPage('postStats', (stats) => ({ ...stats, [content.event_id]: content }))
  };

  const onMessage = (event: MessageEvent) => {
    const message: NostrEvent | NostrEOSE = JSON.parse(event.data);

    const [type, subkey, content] = message;

    if (subkey !== `thread_${postId()}_${APP_ID}`) {
      return;
    }

    if (type === 'EOSE') {
      const newPosts = sortByRecency(convertToPosts(page), true);

      setPage({ users: {}, messages: [], postStats: {}});

      context?.actions?.setThreadedNotes(newPosts);

      setIsFetching(false);

      return;
    }

    if (type === 'EVENT') {
      if (content.kind === 0) {
        proccessUser(content);
      }
      if (content.kind === 1) {
        proccessPost(content);
      }
      if (content.kind === 6) {
        proccessPost(content);
      }
      if (content.kind === 10000100) {
        proccessStat(content);
      }
    }
  };

  createEffect(() => {
    context?.data.threadedNotes.forEach((note) => {

      if (primaryNote() === undefined && note.post.noteId === postId()) {
        setPrimaryNote(() => ({ ...note }));
        return;
      }

      if (note.post.noteId === primaryNote()?.post.noteId) {
        return;
      }

      if (note.post.created_at < (primaryNote()?.post.created_at || 0)) {
        setParentNotes((parents) => [...parents, {...note}]);
        return;
      }

      if (note.post.created_at > (primaryNote()?.post.created_at || 0)) {
        setReplies((replies) => [...replies, {...note}]);
        return;
      }
    });
  });

  const unique = (value, index, self) => {
    return self.indexOf(value) === index
  }

  const posts = () => [ primaryNote(), ...parentNotes, ...replies];

  const people = () => posts().reduce((acc, p) => {
    const user = p?.user;
    if (user && acc.find(u => u && user.pubkey === u.pubkey)) {
      return acc;
    }

    return [...acc, user];
  }, []);

  createEffect(() => {
    if (postId() && postId() !== primaryNote()?.post.noteId) {
      let note = context?.data.posts.find(p => p.post.noteId === postId());

      if (!note) {
        note = context?.data.trendingNotes.notes.find(p => p.post.noteId === postId());
      }

      if (!note) {
        note = context?.data.exploredNotes.find(p => p.post.noteId === postId());
      }

      if (!note) {
        note = parentNotes.find(p => p.post.noteId === postId());
      }

      if (!note) {
        note = replies.find(p => p.post.noteId === postId());
      }

      if (note) {
        setPrimaryNote(note);
      }
    }
    else {
      setReplies(() => []);
      setParentNotes(() => []);
    }
  });

  onMount(() => {
    // Temporary fix for Portal rendering on initial load.
    setMounted(true);
  });

  onCleanup(() => {
    socket()?.removeEventListener('message', onMessage);
  });

	createEffect(() => {
    if (isConnected()) {
      socket()?.addEventListener('message', onMessage);
      if (postId()) {
        context?.actions?.clearThreadedNotes();
        setIsFetching(true);
        getThread(postId(), `thread_${postId()}_${APP_ID}`);

      }
		}
	});

  return (
    <div>
      <Switch>
        <Match when={mounted()}>
          <Portal
            mount={document.getElementById("branding_holder") as Node}
          >
            <PageNav />
          </Portal>

          <Portal
            mount={document.getElementById("right_sidebar") as Node}
          >
            <PeopleList people={people()} />
          </Portal>
        </Match>
      </Switch>

      <Show
        when={!isFetching()}
      >
        <For each={parentNotes}>
          {note =>
            <div class={styles.threadList}>
              <Post
                post={note}
                liked={likedNotes.includes(note.post.id)}
              />
            </div>
          }
        </For>
      </Show>

      <Show when={primaryNote()}>
        <div id="primary_note" class={styles.threadList}>
          <PrimaryPost
            post={primaryNote()}
            liked={likedNotes.includes(primaryNote()?.post.id)}
          />
          <Show when={activeUser()}>
            <ReplyToNote note={primaryNote()} />
          </Show>
        </div>
      </Show>

      <div class={styles.repliesHolder}>
        <Show
          when={!isFetching()}
          fallback={<div class={styles.noContent}><Loader /></div>}
        >
          <For each={replies}>
            {note =>
              <div class={styles.threadList}>
                <Post
                  post={note}
                  liked={likedNotes.includes(note.post.id)}
                />
              </div>
            }
          </For>
        </Show>
      </div>
    </div>
  )
}

export default Thread;
