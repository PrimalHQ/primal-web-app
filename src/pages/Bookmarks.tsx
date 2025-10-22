import { useIntl } from '@cookbook/solid-intl';
import { Component, createEffect, For, Match, on, onCleanup, Show, Switch } from 'solid-js';
import { createStore } from 'solid-js/store';
import { Transition } from 'solid-transition-group';
import { APP_ID } from '../App';
import ArticlePreview from '../components/ArticlePreview/ArticlePreview';
import BookmarksHeader from '../components/HomeHeader/BookmarksHeader';
import Note from '../components/Note/Note';
import PageCaption from '../components/PageCaption/PageCaption';
import PageTitle from '../components/PageTitle/PageTitle';
import Paginator from '../components/Paginator/Paginator';
import { Kind } from '../constants';
import { bookmarks as tBookmarks } from '../translations';
import { PrimalNote, PrimalArticle } from '../types/primal';
import { calculateNotesOffset, calculateReadsOffset } from '../utils';
import styles from './Bookmarks.module.scss';
import { fetchBookmarksFeed, saveBookmarksFeed } from '../lib/localStore';
import { emptyPaging, fetchMegaFeed, filterAndSortNotes, filterAndSortReads, PaginationInfo } from '../megaFeeds';
import { useNavigate } from '@solidjs/router';
import { accountStore } from '../stores/accountStore';

export type BookmarkStore = {
  fetchingInProgress: boolean,
  notes: PrimalNote[],
  reads: PrimalArticle[],
  paging: PaginationInfo,
  kind: string,
}

const emptyStore: BookmarkStore = {
  fetchingInProgress: false,
  notes: [],
  reads: [],
  paging: { ...emptyPaging() },
  kind: 'notes',
};

const Bookmarks: Component = () => {
  const intl = useIntl();
  const navigate = useNavigate();

  const pageSize = 20;

  const [store, updateStore] = createStore<BookmarkStore>({ ...emptyStore });

  createEffect(on(() => accountStore.isKeyLookupDone, (v) => {
    if (v && accountStore.publicKey) {
      const k = fetchBookmarksFeed(accountStore.publicKey);

      if (k && k !== store.kind) {
        updateStore('kind', () => k);
      }

      if (
        (k==='notes' && store.notes.length === 0) ||
        (k==='reads' && store.reads.length === 0)
      )
        updateStore('fetchingInProgress', () => true);
        fetchBookmarks(accountStore.publicKey);
      }
  }));

  onCleanup(() => {
    updateStore(() => ({ ...emptyStore }));
  });

  const kind = () => store.kind || 'notes';

  const fetchBookmarks = async (pubkey: string | undefined, until = 0) => {
    if (!pubkey) return;

    const subId = `bookmark_feed_${until}_${APP_ID}`;

    const k = kind() === 'reads' ? Kind.LongForm : Kind.Text;

    const spec = JSON.stringify({
      id: 'feed',
      kind: 'notes',
      kinds: [k],
      notes: 'bookmarks',
      pubkey,
    });

    let offset = 0;

    if (kind() === 'reads') {
      offset = calculateReadsOffset(store.reads, store.paging);
    } else if (kind() === 'notes') {
      offset = calculateNotesOffset(store.notes, store.paging);
    }

    updateStore('fetchingInProgress', () => true);

    const { notes, reads, paging } = await fetchMegaFeed(
      accountStore.publicKey,
      spec,
      subId,
      {
        until,
        limit: pageSize,
        offset,
      }
    );

    if (kind() === 'notes') {
      const sortedNotes = filterAndSortNotes(notes, paging);
      updateStore('notes', (nts) => [...nts, ...sortedNotes]);
    }

    if (kind() === 'reads') {
      const sortedReads = filterAndSortReads(reads, paging);
      updateStore('reads', (nts) => [...nts, ...sortedReads]);
    }

    updateStore('paging', () => ({ ...paging }));

    updateStore('fetchingInProgress', () => false);
  }

  const fetchNextPage = () => {
    const until = store.paging.since || 0;

    if (until > 0) {
      fetchBookmarks(accountStore.publicKey, until)
    }
  };

  const onChangeKind = (newKind: string) => {
    updateStore(() => ({ ...emptyStore }));
    updateStore('fetchingInProgress', () => true);
    updateStore('kind', () => newKind);
    saveBookmarksFeed(accountStore.publicKey, newKind);
    fetchBookmarks(accountStore.publicKey);
  }

  return (
    <>
      <PageTitle title={intl.formatMessage(tBookmarks.pageTitle)} />

      <PageCaption title={intl.formatMessage(tBookmarks.pageTitle)}>
        <Show
          when={kind()}
          fallback={
            <div>
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

        <Show when={!store.fetchingInProgress && store.notes.length === 0 && store.reads.length === 0}>
          <div class={styles.noBookmarks}>
            {intl.formatMessage(tBookmarks.noBookmarks)}
          </div>
        </Show>

        <Transition name="slide-fade">
          <Show
            when={!store.fetchingInProgress}
          >
            <div>
              <Switch>
                <Match when={kind() === 'notes'}>
                  <For each={store.notes}>
                    {(note) =>
                      <div class="animated">
                        <Note
                          note={note}
                          onRemove={(id: string) => {
                            updateStore('notes', (rs) => rs.filter(r => r.noteId !== id))
                          }}
                        />
                      </div>
                    }
                  </For>
                </Match>

                <Match when={kind() === 'reads'}>
                  <For each={store.reads}>
                    {(read) =>
                      <div class="animated">
                        <ArticlePreview
                          article={read}
                          onClick={navigate}
                          onRemove={(id: string) => {
                            updateStore('reads', (rs) => rs.filter(r => r.noteId !== id))
                          }}
                        />
                      </div>
                    }
                  </For>
                </Match>
              </Switch>
            </div>
          </Show>
        </Transition>

        <Paginator loadNextPage={fetchNextPage} />
      </div>
    </>
  );
}

export default Bookmarks;
