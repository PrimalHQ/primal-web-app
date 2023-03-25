import { Component, createEffect, For, Show } from 'solid-js';
import Note from '../components/Note/Note';
import styles from './Thread.module.scss';
import { useParams } from '@solidjs/router';
import { PrimalNote } from '../types/primal';
import NotePrimary from '../components/Note/NotePrimary/NotePrimary';
import PeopleList from '../components/PeopleList/PeopleList';
import PageNav from '../components/PageNav/PageNav';
import ReplyToNote from '../components/ReplyToNote/ReplyToNote';

import Loader from '../components/Loader/Loader';
import { noteEncode } from 'nostr-tools/nip19';
import { hasPublicKey } from '../stores/profile';
import { useThreadContext } from '../contexts/ThreadContext';
import Wormhole from '../components/Wormhole/Wormhole';


const Thread: Component = () => {
  const params = useParams();

  const postId = () => {
    if (params.postId.startsWith('note')) {
      return params.postId;
    }

    return noteEncode(params.postId);
  };

  const threadContext = useThreadContext();

  const primaryNote = () => {
    const savedNote = threadContext?.primaryNote;

    if (savedNote?.post.noteId === postId()) {
      return savedNote;
    }

    return threadContext?.notes.find(n => n.post.noteId === postId());
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
