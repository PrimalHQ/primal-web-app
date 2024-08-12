import { useIntl } from '@cookbook/solid-intl';
import { useNavigate, useParams } from '@solidjs/router';
import { Component, createEffect, For, Match, on, onCleanup, onMount, Show, Switch, untrack } from 'solid-js';
import { createStore } from 'solid-js/store';
import { APP_ID } from '../App';
import ArticlePreview from '../components/ArticlePreview/ArticlePreview';
import BookmarksHeader from '../components/HomeHeader/BookmarksHeader';
import ReadsHeader from '../components/HomeHeader/ReadsHeader';
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
import { convertToArticles, convertToNotes, parseEmptyReposts } from '../stores/note';
import { bookmarks as tBookmarks } from '../translations';
import { NostrEventContent, NostrUserContent, NostrNoteContent, NostrStatsContent, NostrMentionContent, NostrNoteActionsContent, NoteActions, FeedPage, PrimalNote, NostrFeedRange, PageRange, TopZap, PrimalArticle } from '../types/primal';
import { parseBolt11 } from '../utils';
import styles from './Bookmarks.module.scss';

export type BookmarkStore = {
  fetchingInProgress: boolean,
  page: FeedPage,
  notes: (PrimalNote | PrimalArticle)[],
  noteIds: string[],
  offset: number,
  pageRange: PageRange,
  reposts: Record<string, string> | undefined,
  firstLoad: boolean,
  kind: string,
}

const emptyStore: BookmarkStore = {
  fetchingInProgress: false,
  page: {
    messages: [],
    users: {},
    postStats: {},
    mentions: {},
    noteActions: {},
    topZaps: {},
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
  kind: 'notes',
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

  const kind = () => store.kind || 'notes';

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

    const k = kind() === 'reads' ? Kind.LongForm : Kind.Text;

    updateStore('fetchingInProgress', () => true);
    getUserFeed(pubkey, pubkey, subId, 'bookmarks', k, until, pageSize, store.offset);
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

    if ([Kind.LongForm, Kind.LongFormShell, Kind.Text, Kind.Repost].includes(content.kind)) {
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

    if (content?.kind === Kind.Zap) {
      const zapTag = content.tags.find(t => t[0] === 'description');

      if (!zapTag) return;

      const zapInfo = JSON.parse(zapTag[1] || '{}');

      let amount = '0';

      let bolt11Tag = content?.tags?.find(t => t[0] === 'bolt11');

      if (bolt11Tag) {
        try {
          amount = `${parseBolt11(bolt11Tag[1]) || 0}`;
        } catch (e) {
          const amountTag = zapInfo.tags.find((t: string[]) => t[0] === 'amount');

          amount = amountTag ? amountTag[1] : '0';
        }
      }

      const eventId = (zapInfo.tags.find((t: string[]) => t[0] === 'e') || [])[1];

      const zap: TopZap = {
        id: zapInfo.id,
        amount: parseInt(amount || '0'),
        pubkey: zapInfo.pubkey,
        message: zapInfo.content,
        eventId,
      };

      const oldZaps = store.page.topZaps[eventId];

      if (oldZaps === undefined) {
        updateStore('page', 'topZaps', () => ({ [eventId]: [{ ...zap }]}));
        return;
      }

      if (oldZaps.find(i => i.id === zap.id)) {
        return;
      }

      const newZaps = [ ...oldZaps, { ...zap }].sort((a, b) => b.amount - a.amount);

      updateStore('page', 'topZaps', eventId, () => [ ...newZaps ]);

      return;
    }
  };

  const savePage = (page: FeedPage) => {
    if (kind() === 'notes') {
      const newPosts = convertToNotes(page, page.topZaps);

      saveNotes(newPosts);
      return;
    }

    if (kind() === 'reads') {
      const newPosts = convertToArticles(page, page.topZaps);

      saveArticles(newPosts);
      return;
    }
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


  const saveArticles = (newNotes: PrimalArticle[]) => {
    const notesToAdd = newNotes.filter(n => !store.noteIds.includes(n.id));

    const lastTimestamp = store.pageRange.since;
    const offset = notesToAdd.reduce<number>((acc, n) => n.published === lastTimestamp ? acc+1 : acc, 0);

    const ids = notesToAdd.map(m => m.id)

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

  const onChangeKind = (newKind: string) => {
    updateStore(() => ({ ...emptyStore }));
    updateStore('kind', () => newKind);
    fetchBookmarks(account?.publicKey);
  }

  return (
    <>
      <PageTitle title={intl.formatMessage(tBookmarks.pageTitle)} />

      <PageCaption title={intl.formatMessage(tBookmarks.pageTitle)}>
        <Show
          when={kind()}
          fallback={
            <div class={styles.readsTopicHeader}>
              <span>
                Bookmarks
              </span>
            </div>
          }
        >
          <BookmarksHeader
            kind={kind()}
            onSelect={onChangeKind}
          />
        </Show>
      </PageCaption>

      <div class={styles.bookmarkFeed}>

        <Show when={!store.fetchingInProgress && store.notes.length === 0}>
          <div class={styles.noBookmarks}>
            {intl.formatMessage(tBookmarks.noBookmarks)}
          </div>
        </Show>

        <Switch>
          <Match when={kind() === 'notes'}>
            <For each={store.notes}>
              {(note) =>
                <Note note={note} />
              }
            </For>
          </Match>

          <Match when={kind() === 'reads'}>
            <For each={store.notes}>
              {(note) =>
                <ArticlePreview article={note} />
              }
            </For>
          </Match>
        </Switch>

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
