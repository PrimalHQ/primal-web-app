import { Component, createEffect, createMemo, For, onCleanup, Show } from 'solid-js';
import Note from '../components/Note/Note';
import styles from './NoteThread.module.scss';
import { useNavigate } from '@solidjs/router';
import { PrimalArticle, PrimalNote, PrimalUser, SendNoteResult } from '../types/primal';
import PeopleList from '../components/PeopleList/PeopleList';
import ReplyToNote from '../components/ReplyToNote/ReplyToNote';

import { nip19 } from '../lib/nTools';
import { useThreadContext } from '../contexts/ThreadContext';
import Wormhole from '../components/Wormhole/Wormhole';
import { useAccountContext } from '../contexts/AccountContext';
import { sortByRecency } from '../stores/note';
import { useIntl } from '@cookbook/solid-intl';
import Search from '../components/Search/Search';
import { placeholders as tPlaceholders, thread as t } from '../translations';
import { userName } from '../stores/profile';
import PageTitle from '../components/PageTitle/PageTitle';
import NavHeader from '../components/NavHeader/NavHeader';
import PrimaryNoteSkeleton from '../components/Skeleton/PrimaryNoteSkeleton';
import ReplyToNoteSkeleton from '../components/Skeleton/ReplyToNoteSkeleton';
import ThreadNoteSkeleton from '../components/Skeleton/ThreadNoteSkeleton';
import { Transition } from 'solid-transition-group';
import { APP_ID } from '../App';
import { fetchNotes } from '../handleNotes';
import { isIOS, isPhone } from '../utils';
import { logWarning } from '../lib/logger';
import { noteIdToHex } from '../lib/keys';
import { useToastContext } from '../components/Toaster/Toaster';


const NoteThread: Component<{ noteId: string }> = (props) => {
  const account = useAccountContext();
  const intl = useIntl();
  const navigate = useNavigate();
  const toast = useToastContext();

  let repliesHolder: HTMLDivElement | undefined;

  let initialPostId = '';

  const postId = () => noteIdToHex(props.noteId);

  const threadContext = useThreadContext();


  const noteLinkId = (note: PrimalNote) => {
    try {
      return `/e/${note.noteIdShort}`;
    } catch(e) {
      return '/404';
    }
  };

  const primaryNote = createMemo(() => {

    let note = threadContext?.notes.find(n => n.id === postId());

    // Return the note if found
    if (note) {
      return note;
    }

    // Since there is no note see if this is a repost
    note = threadContext?.notes.find(n => n.repost?.note.id === postId());

    // If reposted note found redirect to it's thread
    note && navigate(noteLinkId(note))

    return note;
  });

  const parentNotes = () => {
    const note = primaryNote();

    if (!note) {
      return [];
    }

    return sortByRecency(
      threadContext?.notes.filter(n =>
        n.post.id !== note.post.id &&
        // n.post.created_at <= note.post.created_at &&
        !n.tags.find(t => t[0] === 'e' && (t[3] === 'reply' || t[3] === 'root' || t[3] === 'fork') && t[1] === note.id),
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
      n.post.id !== note.post.id &&
      // n.post.created_at >= note.post.created_at &&
      n.tags.find(t => t[0] === 'e' && (t[3] === 'reply' || t[3] === 'root') && t[1] === note.id),
    ) || [];
  };

  const people = () => {
    const pNote = primaryNote();

    if (!pNote) return [];

    const authors = (threadContext?.notes || []).
      reduce<PrimalUser[]>((acc, n) => acc.find(u => u.pubkey === n.user.pubkey) ? [...acc] : [ ...acc, { ...n.user }], []);

    const mentions = Object.values(pNote.mentionedUsers || {}).
      filter((u) => !authors.find(a => u.pubkey === a.pubkey));

    return [ ...authors, ...mentions ];
  };

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
      const rect = pn.getBoundingClientRect();
      const wh = window.innerHeight;

      const block = rect.height < wh && parentNotes().length > 0 ?
        'end' : 'start';

      pn.scrollIntoView({ block });

      if (block === 'start') {
        window.scrollBy({ top: -84 });
      }
    }, 100);
  });

  onCleanup(() => {
    const pn = document.getElementById('primary_note');

    pn && observer?.unobserve(pn);
  });

  const onNotePosted = async (result: SendNoteResult, meta?: {
    userRefs: Record<string, PrimalUser>,
    noteRefs: Record<string, PrimalNote>,
    articleRefs: Record<string, PrimalArticle>,
    highlightRefs: Record<string, any>,
    relayHints: Record<string, string>,
  }) => {
    const pNote = primaryNote();
    if (!meta || !result.note || !account?.activeUser || !pNote ) return;

    const modifiedMeta = {
      ...meta,
      noteRefs: { ...meta.noteRefs, [pNote.id]: {...pNote} }
    }

    const subId = `posted_note_${APP_ID}`;

    const notes = await fetchNotes(account.publicKey, [result.note.id], subId);

    // const note = generateNote(result.note, account?.activeUser, modifiedMeta);

    threadContext?.actions.insertNote(notes[0]);

    // setTimeout(() => {
    //   threadContext?.actions.updateNotes(postId());
    // }, 2_000)
  };


  const pageTitle = () => {
    const name = userName(primaryNote()?.user);


    return intl.formatMessage(
      t.pageTitle,
      { name },
    );
  }

  return (
    <div>
      <PageTitle title={pageTitle()} />
      <Show when={!isPhone()}>
        <Wormhole
          to="search_section"
        >
          <Search />
        </Wormhole>

        <Wormhole to='right_sidebar'>
          <PeopleList
            note={primaryNote()}
            people={people()}
            label={intl.formatMessage(t.sidebar)}
            mentionLabel={intl.formatMessage(t.sidebarMentions)}
            sortBy="legend"
          />
        </Wormhole>
      </Show>

      <NavHeader title="Thread" />

      <Show when={account?.isKeyLookupDone}>
        <Transition name='slide-fade'>
          <Show
            when={!isFetching()}
            fallback={<div class={styles.loader}>
              <PrimaryNoteSkeleton />
              <ReplyToNoteSkeleton />
              <For each={new Array(10)}>
                {() => <ThreadNoteSkeleton />}
              </For>
              <ThreadNoteSkeleton />
            </div>}
          >
            <div>
              <div class={styles.parentsHolder}>
                <For each={parentNotes()}>
                  {note =>
                    <div>
                      <Note
                        note={note}
                        parent={true}
                        shorten={true}
                        noteType="thread"
                        onRemove={(id: string, isRepost?: boolean) => {
                          if (isRepost) return;
                          threadContext?.actions.removeEvent(id, 'notes');
                        }}
                      />
                    </div>
                  }
                </For>
              </div>

              <Show
                when={primaryNote()}
                fallback={
                  <div class={styles.missingNote}>
                    <p>
                      {intl.formatMessage(tPlaceholders.missingNote.firstLine)}
                    </p>
                    <p>
                      {intl.formatMessage(tPlaceholders.missingNote.secondLine)}
                    </p>
                  </div>
              }>
                <div id="primary_note" class={`${styles.primaryNote} animated`}>
                  <Note
                    note={primaryNote() as PrimalNote}
                    noteType="primary"
                    quoteCount={threadContext?.quoteCount}
                    onRemove={(id: string, isRepost?: boolean) => {
                      if (isRepost) return;

                      toast?.sendSuccess('Delete request sent');
                      navigate('/home');
                    }}
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
                    <div class="animated">
                      <Note
                        note={note}
                        shorten={true}
                        noteType="thread"
                        onRemove={(id: string, isRepost?: boolean) => {
                          if (isRepost) return;

                          threadContext?.actions.removeEvent(id, 'notes');
                        }}
                      />
                    </div>
                  }
                </For>
              </div>
            </div>
          </Show>
        </Transition>
      </Show>
    </div>
  )
}

export default NoteThread;
