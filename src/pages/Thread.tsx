import { Component, createEffect, createSignal, For, Match, onCleanup, onMount, Show, Switch } from 'solid-js';
import Note from '../components/Note/Note';
import styles from './Thread.module.scss';
import { APP_ID, useFeedContext } from '../contexts/FeedContext';
import { Portal } from 'solid-js/web';
import { useParams } from '@solidjs/router';
import { getThread } from '../lib/feed';
import { convertToNotes, sortByRecency } from '../stores/note';
import { FeedPage, NostrEOSE, NostrEvent, NostrNoteContent, NostrStatsContent, NostrUserContent, PrimalNote, PrimalUser } from '../types/primal';
import { isConnected, socket } from '../sockets';
import { createStore } from 'solid-js/store';
import NotePrimary from '../components/Note/NotePrimary/NotePrimary';
import PeopleList from '../components/PeopleList/PeopleList';
import PageNav from '../components/PageNav/PageNav';
import ReplyToNote from '../components/ReplyToNote/ReplyToNote';

import Loader from '../components/Loader/Loader';
import { noteEncode } from 'nostr-tools/nip19';
import { likedNotes } from '../lib/notes';
import { hasPublicKey } from '../stores/profile';
import { Kind } from '../constants';
import { useThreadContext } from '../contexts/ThreadContext';
import { useHomeContext } from '../contexts/HomeContext';
import { useExploreContext } from '../contexts/ExploreContext';
import Wormhole from '../components/Wormhole/Wormhole';


const Thread: Component = () => {
  const params = useParams();

  const postId = () => {
    if (params.postId.startsWith('note')) {
      return params.postId;
    }

    return noteEncode(params.postId);
  };

  const homeContext = useHomeContext();
  const exploreContext = useExploreContext();
  const threadContext = useThreadContext();

  const threadContexts: Record<string, any> = {
    home: homeContext,
    explore: exploreContext,
    thread: threadContext,
  };

  const primaryNote = () => {
    const context = threadContexts[threadContext?.threadContext || 'thread'];

    return context?.notes.find((n: PrimalNote) => n.post.noteId === postId());
  };

  const parentNotes = () => {
    const note = primaryNote();

    if (!note) {
      return [];
    }

    return threadContext?.notes.filter(n =>
      n.post.id !== note.post.id && n.post.created_at <= note.post.created_at,
    ) || [];
  };

  const replyNotes = () => {
    const note = primaryNote();

    if (!note) {
      return [];
    }

    return threadContext?.notes.filter(n =>
      n.post.id !== note.post.id && n.post.created_at >= note.post.created_at,
    ) || [];
  };

  const people = () => threadContext?.users || [];
  const isFetching = () => threadContext?.isFetching;

  createEffect(() => {
    threadContext?.actions.fetchNotes(params.postId);
  });


  return (
    <div>
      <Wormhole to='branding_holder'>
        <PageNav />
      </Wormhole>

      <Wormhole to='right_sidebar'>
        <PeopleList people={people()} />
      </Wormhole>

      <Show
        when={!isFetching()}
      >
        <For each={parentNotes()}>
          {note =>
            <div class={styles.threadList}>
              <Note
                note={note}
              />
            </div>
          }
        </For>
      </Show>

      <Show when={primaryNote()}>
        <div id="primary_note" class={styles.threadList}>
          <NotePrimary
            note={primaryNote() as PrimalNote}
          />
          <Show when={hasPublicKey()}>
            <ReplyToNote note={primaryNote() as PrimalNote} />
          </Show>
        </div>
      </Show>

      <div class={styles.repliesHolder}>
        <Show
          when={!isFetching()}
          fallback={<div class={styles.noContent}><Loader /></div>}
        >
          <For each={replyNotes()}>
            {note =>
              <div class={styles.threadList}>
                <Note
                  note={note}
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
