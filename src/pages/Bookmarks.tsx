import { useIntl } from '@cookbook/solid-intl';
import { Component, createEffect, For, on, onCleanup, onMount, Show, untrack } from 'solid-js';
import { createStore } from 'solid-js/store';
import { APP_ID } from '../App';
import Loader from '../components/Loader/Loader';
import Note from '../components/Note/Note';
import PageCaption from '../components/PageCaption/PageCaption';
import PageTitle from '../components/PageTitle/PageTitle';
import Paginator from '../components/Paginator/Paginator';
import { Kind } from '../constants';
import { useAccountContext } from '../contexts/AccountContext';
import { getEvents, getUserFeed } from '../lib/feed';
import { setLinkPreviews } from '../lib/notes';
import { subscribeTo } from '../sockets';
import { convertToNotes, parseEmptyReposts } from '../stores/note';
import { bookmarks as tBookmarks } from '../translations';
import { NostrEventContent, NostrUserContent, NostrNoteContent, NostrStatsContent, NostrMentionContent, NostrNoteActionsContent, NoteActions, FeedPage, PrimalNote, NostrFeedRange, PageRange } from '../types/primal';
import styles from './Bookmarks.module.scss';

export type BookmarkStore = {
  fetchingInProgress: boolean,
  page: FeedPage,
  notes: PrimalNote[],
  noteIds: string[],
  offset: number,
  pageRange: PageRange,
  reposts: Record<string, string> | undefined,
  firstLoad: boolean,
}

const emptyStore: BookmarkStore = {
  fetchingInProgress: false,
  page: {
    messages: [],
    users: {},
    postStats: {},
    mentions: {},
    noteActions: {},
  },
  notes: [],
  noteIds: [],
  pageRange: {
    since: 0,
    until: 0,
    order_by: 'created_at',
  },
  reposts: {},
  offset: 0,
  firstLoad: true,
};

let since: number = 0;

const Bookmarks: Component = () => {
  const account = useAccountContext();
  const intl = useIntl();

  const pageSize = 20;

  const [store, updateStore] = createStore<BookmarkStore>({ ...emptyStore });

  createEffect(on(() => account?.isKeyLookupDone, (v) => {
    if (v && account?.publicKey) {
      updateStore(() => ({ ...emptyStore }));
      fetchBookmarks(account.publicKey);
    }
  }));

  onCleanup(() => {
    updateStore(() => ({ ...emptyStore }));
  });

  const fetchBookmarks = (pubkey: string | undefined, until = 0) => {
    if (store.fetchingInProgress || !pubkey) return;

    const subId = `bookmark_feed_${until}_${APP_ID}`;

    const unsub = subscribeTo(subId, (type, _, content) => {
      if (type === 'EOSE') {
        const reposts = parseEmptyReposts(store.page);
        const ids = Object.keys(reposts);

        if (ids.length === 0) {
          savePage(store.page);
          unsub();
          return;
        }

        updateStore('reposts', () => reposts);

        fetchReposts(ids);

        unsub();
        return;
      }

      if (type === 'EVENT') {
        content && updatePage(content);
      }
    });

    updateStore('fetchingInProgress', () => true);
    getUserFeed(pubkey, pubkey, subId, 'bookmarks', until, pageSize, store.offset);
  }

  const fetchNextPage = () => since > 0 && fetchBookmarks(account?.publicKey, since);

  const fetchReposts = (ids: string[]) => {
    const subId = `bookmark_reposts_${APP_ID}`;

    const unsub = subscribeTo(subId, (type, _, content) => {
      if (type === 'EOSE') {
        savePage(store.page);
        unsub();
        return;
      }

      if (type === 'EVENT') {
        const repostId = (content as NostrNoteContent).id;
        const reposts = store.reposts || {};
        const parent = store.page.messages.find(m => m.id === reposts[repostId]);

        if (parent) {
          updateStore('page', 'messages', (msg) => msg.id === parent.id, 'content', () => JSON.stringify(content));
        }

        return;
      }
    });

    getEvents(account?.publicKey, ids, subId);
  };

  const updatePage = (content: NostrEventContent) => {
    if (content.kind === Kind.Metadata) {
      const user = content as NostrUserContent;

      updateStore('page', 'users',
        (usrs) => ({ ...usrs, [user.pubkey]: { ...user } })
      );
      return;
    }

    if ([Kind.Text, Kind.Repost].includes(content.kind)) {
      const message = content as NostrNoteContent;

      updateStore('page', 'messages',
        (msgs) => [ ...msgs, { ...message }]
      );

      return;
    }

    if (content.kind === Kind.NoteStats) {
      const statistic = content as NostrStatsContent;
      const stat = JSON.parse(statistic.content);

      updateStore('page', 'postStats',
        (stats) => ({ ...stats, [stat.event_id]: { ...stat } })
      );
      return;
    }

    if (content.kind === Kind.Mentions) {
      const mentionContent = content as NostrMentionContent;
      const mention = JSON.parse(mentionContent.content);

      updateStore('page', 'mentions',
        (mentions) => ({ ...mentions, [mention.id]: { ...mention } })
      );
      return;
    }

    if (content.kind === Kind.NoteActions) {
      const noteActionContent = content as NostrNoteActionsContent;
      const noteActions = JSON.parse(noteActionContent.content) as NoteActions;

      updateStore('page', 'noteActions',
        (actions) => ({ ...actions, [noteActions.event_id]: { ...noteActions } })
      );
      return;
    }

    if (content.kind === Kind.FeedRange) {
      const noteActionContent = content as NostrFeedRange;
      const range = JSON.parse(noteActionContent.content) as PageRange;

      updateStore('pageRange', () => ({ ...range }));
      since = range.until;
      return;
    }

    if (content.kind === Kind.LinkMetadata) {
      const metadata = JSON.parse(content.content);

      const data = metadata.resources[0];
      if (!data) {
        return;
      }

      const preview = {
        url: data.url,
        title: data.md_title,
        description: data.md_description,
        mediaType: data.mimetype,
        contentType: data.mimetype,
        images: [data.md_image],
        favicons: [data.icon_url],
      };

      setLinkPreviews(() => ({ [data.url]: preview }));
      return;
    }
  };

  const savePage = (page: FeedPage) => {
    const newPosts = convertToNotes(page);

    saveNotes(newPosts);
  };

  const saveNotes = (newNotes: PrimalNote[]) => {
    const notesToAdd = newNotes.filter(n => !store.noteIds.includes(n.post.id));

    const lastTimestamp = store.pageRange.since;
    const offset = notesToAdd.reduce<number>((acc, n) => n.post.created_at === lastTimestamp ? acc+1 : acc, 0);

    const ids = notesToAdd.map(m => m.post.id)

    ids.length > 0 && updateStore('noteIds', () => [...ids]);

    updateStore('offset', () => offset);
    updateStore('notes', (notes) => [ ...notes, ...notesToAdd ]);
    updateStore('page', () => ({
      messages: [],
      users: {},
      postStats: {},
      mentions: {},
      noteActions: {},
    }));
    updateStore('fetchingInProgress', () => false);
  };

  return (
    <>
      <PageTitle title={intl.formatMessage(tBookmarks.pageTitle)} />

      <PageCaption title={intl.formatMessage(tBookmarks.pageTitle)} />

      <div class={styles.bookmarkFeed}>

        <Show when={!store.fetchingInProgress && store.notes.length === 0}>
          <div class={styles.noBookmarks}>
            {intl.formatMessage(tBookmarks.noBookmarks)}
          </div>
        </Show>

          <For each={store.notes}>
            {(note) =>
              <Note note={note} />
            }
          </For>

          <Paginator loadNextPage={fetchNextPage} />

          <Show
            when={store.fetchingInProgress}
          >
            <div class={styles.loader}>
              {<Loader/>}
            </div>
          </Show>
      </div>
    </>
  );
}

export default Bookmarks;
