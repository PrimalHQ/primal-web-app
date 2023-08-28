import { Component, createEffect, createMemo, For, onCleanup, Show } from 'solid-js';
import Note from '../components/Note/Note';
import styles from './Thread.module.scss';
import { useNavigate, useParams } from '@solidjs/router';
import { PrimalNote, SendNoteResult } from '../types/primal';
import NotePrimary from '../components/Note/NotePrimary/NotePrimary';
import PeopleList from '../components/PeopleList/PeopleList';
import PageNav from '../components/PageNav/PageNav';
import ReplyToNote from '../components/ReplyToNote/ReplyToNote';

import { nip19 } from 'nostr-tools';
import { useThreadContext } from '../contexts/ThreadContext';
import Wormhole from '../components/Wormhole/Wormhole';
import { useAccountContext } from '../contexts/AccountContext';
import { sortByRecency } from '../stores/note';
import { scrollWindowTo } from '../lib/scroll';
import { useIntl } from '@cookbook/solid-intl';
import Search from '../components/Search/Search';
import { thread as t } from '../translations';


const Thread: Component = () => {
  const account = useAccountContext();
  const params = useParams();
  const intl = useIntl();
  const navigate = useNavigate();

  const postId = () => {
    if (params.postId.startsWith('note')) {
      return params.postId;
    }

    return nip19.noteEncode(params.postId);
  };

  const threadContext = useThreadContext();

  const primaryNote = createMemo(() => {

    let note = threadContext?.notes.find(n => n.post.noteId === postId());

    // Return the note if found
    if (note) {
      return note;
    }

    // Since there is no note see if this is a repost
    note = threadContext?.notes.find(n => n.repost?.note.noteId === postId());

    // If reposted note found redirect to it's thread
    note && navigate(`/e/${note?.post.noteId}`)

    return note;
  });

  const parentNotes = () => {
    const note = primaryNote();

    if (!note) {
      return [];
    }

    return sortByRecency(
      threadContext?.notes.filter(n =>
        n.post.id !== note.post.id && n.post.created_at <= note.post.created_at,
      ) || [],
      true,
    );
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
    threadContext?.actions.fetchNotes(postId());
  });

  let observer: IntersectionObserver | undefined;

  createEffect(() => {
    if (primaryNote() && !threadContext?.isFetching) {
      const pn = document.getElementById('primary_note');

      if (!pn) {
        return;
      }

      observer = new IntersectionObserver(entries => {
        const rect = pn.getBoundingClientRect();
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            scrollWindowTo(rect.top);
          }
          observer?.unobserve(pn);
        });
      });

      observer?.observe(pn);
    }
  });

  onCleanup(() => {
    const pn = document.getElementById('primary_note');

    pn && observer?.unobserve(pn);
  });

  const onNotePosted = (result: SendNoteResult) => {
    threadContext?.actions.fetchNotes(postId());
  };

  return (
    <div>
      <Wormhole to='branding_holder'>
        <PageNav />
      </Wormhole>

      <Wormhole
        to="search_section"
      >
        <Search />
      </Wormhole>

      <Wormhole to='right_sidebar'>
        <PeopleList
          people={people()}
          label={intl.formatMessage(t.sidebar)}
        />
      </Wormhole>

      <Show when={account?.isKeyLookupDone}>
        <Show
          when={!isFetching()}
        >
          <For each={parentNotes()}>
            {note =>
              <div class={styles.threadList}>
                <Note note={note} />
              </div>
            }
          </For>
        </Show>

        <Show when={primaryNote()}>
          <div id="primary_note" class={styles.threadList}>
            <NotePrimary
              note={primaryNote() as PrimalNote}
            />
            <Show when={account?.hasPublicKey()}>
              <ReplyToNote
                note={primaryNote() as PrimalNote}
                onNotePosted={onNotePosted}
              />
            </Show>
          </div>
        </Show>

        <div class={styles.repliesHolder}>
            <For each={replyNotes()}>
              {note =>
                <div class={styles.threadList}>
                  <Note note={note} />
                </div>
              }
            </For>
        </div>
      </Show>

    </div>
  )
}

export default Thread;
