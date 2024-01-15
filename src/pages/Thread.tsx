import { Component, createEffect, createMemo, For, onCleanup, onMount, Show } from 'solid-js';
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
import { userName } from '../stores/profile';
import PageTitle from '../components/PageTitle/PageTitle';
import NavHeader from '../components/NavHeader/NavHeader';
import Loader from '../components/Loader/Loader';
import { isIOS } from '../components/BannerIOS/BannerIOS';


const Thread: Component = () => {
  const account = useAccountContext();
  const params = useParams();
  const intl = useIntl();
  const navigate = useNavigate();

  let repliesHolder: HTMLDivElement | undefined;

  let initialPostId = '';

  const postId = () => {
    if (params.postId.startsWith('note')) {
      return params.postId;
    }

    if (params.postId.startsWith('nevent')) {
      return nip19.noteEncode(nip19.decode(params.postId).data.id);
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
    const pid = postId();

    if (pid !== initialPostId) {
      threadContext?.actions.fetchNotes(pid);
      initialPostId = pid;
    }
  });

  let observer: IntersectionObserver | undefined;

  createEffect(() => {
    if (!primaryNote() || threadContext?.isFetching) return;

    const pn = document.getElementById('primary_note');

    if (!pn) return;

    setTimeout(() => {
      const threadHeader = 72;
      const iOSBanner = 54;

      const rect = pn.getBoundingClientRect();
      const wh = window.innerHeight - threadHeader;

      const block = rect.height < wh && parentNotes().length > 0 ?
        'end' : 'start';

      pn.scrollIntoView({ block });

      if (block === 'start') {
        const moreScroll = threadHeader + (isIOS() ? iOSBanner : 0);
        window.scrollBy({ top: -moreScroll });
      }
    }, 100);
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
      <PageTitle title={
        intl.formatMessage(
          t.pageTitle,
          { name: userName(primaryNote()?.user) },
        )}
      />

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

      <NavHeader title="Thread" />

      <Show when={account?.isKeyLookupDone}>
        <Show
          when={!isFetching()}
          fallback={<Loader />}
        >
          <div class={styles.parentsHolder}>
            <For each={parentNotes()}>
              {note =>
                <div>
                  <Note note={note} parent={true} shorten={true} />
                </div>
              }
            </For>
          </div>
        </Show>

        <Show when={primaryNote()}>
          <div id="primary_note">
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

        <div class={styles.repliesHolder} ref={repliesHolder}>
          <For each={replyNotes()}>
            {note =>
              <div>
                <Note note={note} shorten={true} />
              </div>
            }
          </For>
        </div>
      </Show>
    </div>
  )
}

export default Thread;
