import { Component, createEffect, createMemo, For, Match, onCleanup, Show, Switch } from 'solid-js';
import Note from '../components/Note/Note';
import styles from './NoteThread.module.scss';
import { useNavigate } from '@solidjs/router';
import { PrimalArticle, PrimalNote, PrimalUser, PrimalUserPoll, SendNoteResult } from '../types/primal';
import PeopleList from '../components/PeopleList/PeopleList';
import ReplyToNote from '../components/ReplyToNote/ReplyToNote';

import { useThreadContext } from '../contexts/ThreadContext';
import Wormhole from '../components/Wormhole/Wormhole';
import { sortByRecency, sortEventsByRecency } from '../stores/note';
import { buildPostedNote } from '../stores/megaFeed';
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
import { fetchEvents, fetchNotes } from '../handleNotes';
import { isPhone } from '../utils';
import { noteIdToHex } from '../lib/keys';
import { useToastContext } from '../components/Toaster/Toaster';
import { accountStore, hasPublicKey } from '../stores/accountStore';
import { Kind } from '../constants';
import UserPoll from '../components/UserPoll/UserPoll';
import ZapPoll from '../components/UserPoll/ZapPoll';


const NoteThread: Component<{ noteId: string }> = (props) => {
  const intl = useIntl();
  const navigate = useNavigate();
  const toast = useToastContext();

  let repliesHolder: HTMLDivElement | undefined;

  let initialPostId = '';

  const postId = () => noteIdToHex(props.noteId);

  const threadContext = useThreadContext();


  const noteLinkId = (note: PrimalNote | PrimalUserPoll) => {
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

  // Walk up the reply chain from the primary note, using each note's `replyTo`
  // (derived from its NIP-10 `e` tags) rather than creation date, to collect
  // the ids of the primary note's ancestors — i.e. the notes it is replying to.
  const parentIds = () => {
    const note = primaryNote();

    if (!note) {
      return [];
    }

    const notesById = new Map<string, PrimalNote | PrimalUserPoll>(
      (threadContext?.notes || []).map((n): [string, PrimalNote | PrimalUserPoll] => [n.id, n]),
    );

    const ids: string[] = [];
    let current = note.replyTo ? notesById.get(note.replyTo) : undefined;

    while (current && !ids.includes(current.id)) {
      ids.push(current.id);
      current = current.replyTo ? notesById.get(current.replyTo) : undefined;
    }

    return ids;
  };

  const parentNotes = () => {
    const ids = parentIds();

    return sortEventsByRecency(
      threadContext?.notes.filter(n => ids.includes(n.id)) || [],
      true,
    );
  };

  // Only direct replies to the primary note — i.e. notes whose NIP-10 parent
  // (`replyTo`) is the primary note. Replies to a reply are shown when that
  // reply itself becomes the primary note.
  const replyNotes = () => {
    const note = primaryNote();

    if (!note) {
      return [];
    }

    return threadContext?.notes?.filter(n =>
      n.id !== note.id && n.replyTo === note.id,
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
    if (!meta || !result.note || !accountStore.activeUser || !pNote ) return;

    // Polls carry server-side data (options, vote tallies) that we can't
    // synthesize locally, so they still need a cache round-trip.
    if (result.note.kind === Kind.UserPoll || result.note.kind === Kind.ZapPoll) {
      const subId = `posted_note_${APP_ID}`;
      const { userPolls, zapPolls } = await fetchEvents(accountStore.publicKey, [result.note.id], subId);
      const poll = result.note.kind === Kind.UserPoll ? userPolls[0] : zapPolls[0];
      poll && threadContext?.actions.insertNote(poll);
      return;
    }

    // For a plain text reply we already have everything needed to render it:
    // the signed event, the current user as author, and the mention refs the
    // editor collected. Build it locally so the reply shows up immediately,
    // without depending on the cache import/fetch round-trip (which can hang).
    const note = buildPostedNote(result.note, accountStore.activeUser, {
      noteRefs: { ...meta.noteRefs, [pNote.id]: { ...pNote } },
      userRefs: meta.userRefs,
      articleRefs: meta.articleRefs,
      highlightRefs: meta.highlightRefs,
      relayHints: meta.relayHints,
    });

    threadContext?.actions.insertNote(note);
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

      <Show when={accountStore.isKeyLookupDone}>
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
                    <Switch>
                      <Match when={note?.msg.kind === Kind.Text}>
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
                      </Match>
                      <Match  when={note?.msg.kind === Kind.UserPoll}>
                        <UserPoll
                          poll={note}
                        />
                      </Match>
                      <Match  when={note?.msg.kind === Kind.ZapPoll}>
                        <ZapPoll
                          poll={note}
                        />
                      </Match>
                    </Switch>
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

                  <Switch>
                    <Match when={primaryNote()?.msg.kind === Kind.Text}>
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
                    </Match>
                    <Match  when={primaryNote()?.msg.kind === Kind.UserPoll}>
                      <UserPoll
                        poll={primaryNote()}
                        pollType="primary"
                      />
                    </Match>
                    <Match  when={primaryNote()?.msg.kind === Kind.ZapPoll}>
                      <ZapPoll
                        poll={primaryNote()}
                        pollType="primary"
                      />
                    </Match>
                  </Switch>

                  <Show when={hasPublicKey()}>
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
                      <Switch>
                        <Match when={note.msg.kind === Kind.Text}>
                          <Note
                            note={note}
                            shorten={true}
                            noteType="thread"
                            onRemove={(id: string, isRepost?: boolean) => {
                              if (isRepost) return;

                              threadContext?.actions.removeEvent(id, 'notes');
                            }}
                          />
                        </Match>
                        <Match  when={note.msg.kind === Kind.UserPoll}>
                          <UserPoll
                            poll={note}
                          />
                        </Match>
                        <Match  when={note.msg.kind === Kind.ZapPoll}>
                          <ZapPoll
                            poll={note}
                          />
                        </Match>
                      </Switch>
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
