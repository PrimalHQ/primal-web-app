import { useIntl } from '@cookbook/solid-intl';
import { Component, createEffect, createSignal, Match, Show, Switch } from 'solid-js';
import { APP_ID } from '../../App';
import { Kind } from '../../constants';
import { useAccountContext } from '../../contexts/AccountContext';
import { useAppContext } from '../../contexts/AppContext';
import { getUserFeed } from '../../lib/feed';
import { logWarning } from '../../lib/logger';
import { getBookmarks, sendBookmarks } from '../../lib/profile';
import { subscribeTo } from '../../sockets';
import { PrimalArticle, PrimalNote } from '../../types/primal';
import ButtonGhost from '../Buttons/ButtonGhost';
import { account, bookmarks as tBookmarks } from '../../translations';

import styles from './BookmarkNote.module.scss';
import { saveBookmarks } from '../../lib/localStore';
import { importEvents, triggerImportEvents } from '../../lib/notes';

const BookmarkArticle: Component<{ note: PrimalArticle, large?: boolean }> = (props) => {
  const account = useAccountContext();
  const app = useAppContext();
  const intl = useIntl();

  const [isBookmarked, setIsBookmarked] = createSignal(false);
  const [bookmarkInProgress, setBookmarkInProgress] = createSignal(false);

  createEffect(() => {
    setIsBookmarked(() => account?.bookmarks.includes(props.note.id) || false);
  })

  const updateBookmarks = async (bookmarkTags: string[][]) => {
    if (!account) return;

    const bookmarks = bookmarkTags.reduce((acc, t) =>
      t[0] === 'e' ? [...acc, t[1]] : [...acc]
    , []);

    const date = Math.floor((new Date()).getTime() / 1000);

    account.actions.updateBookmarks(bookmarks)
    saveBookmarks(account.publicKey, bookmarks);
    const { success, note} = await sendBookmarks([...bookmarkTags], date, '', account?.relays, account?.relaySettings);

    if (success && note) {
      triggerImportEvents([note], `bookmark_import_${APP_ID}`)
    }
  };

  const addBookmark = async (bookmarkTags: string[][]) => {
    if (account && !bookmarkTags.find(b => b[0] === 'e' && b[1] === props.note.id)) {
      const bookmarksToAdd = [...bookmarkTags, ['e', props.note.id]];

      if (bookmarksToAdd.length < 2) {
        logWarning('BOOKMARK ISSUE: ', `before_bookmark_${APP_ID}`);

        app?.actions.openConfirmModal({
          title: intl.formatMessage(tBookmarks.confirm.title),
          description: intl.formatMessage(tBookmarks.confirm.description),
          confirmLabel: intl.formatMessage(tBookmarks.confirm.confirm),
          abortLabel: intl.formatMessage(tBookmarks.confirm.abort),
          onConfirm: async () => {
            await updateBookmarks(bookmarksToAdd);
            app.actions.closeConfirmModal();
          },
          onAbort: app.actions.closeConfirmModal,
        })

        return;
      }

      await updateBookmarks(bookmarksToAdd);
    }
  }

  const removeBookmark = async (bookmarks: string[][]) => {
    if (account && bookmarks.find(b => b[0] === 'e' && b[1] === props.note.id)) {
      const bookmarksToAdd = bookmarks.filter(b => b[0] !== 'e' || b[1] !== props.note.id);

      if (bookmarksToAdd.length < 1) {
        logWarning('BOOKMARK ISSUE: ', `before_bookmark_${APP_ID}`);

        app?.actions.openConfirmModal({
          title: intl.formatMessage(tBookmarks.confirm.titleZero),
          description: intl.formatMessage(tBookmarks.confirm.descriptionZero),
          confirmLabel: intl.formatMessage(tBookmarks.confirm.confirmZero),
          abortLabel: intl.formatMessage(tBookmarks.confirm.abortZero),
          onConfirm: async () => {
            await updateBookmarks(bookmarksToAdd);
            app.actions.closeConfirmModal();
          },
          onAbort: app.actions.closeConfirmModal,
        })

        return;
      }

      await updateBookmarks(bookmarksToAdd);
    }
  }

  const doBookmark = (remove: boolean, then?: () => void) => {

    if (!account?.publicKey) {
      return;
    }

    let bookmarks: string[][] = []

    const unsub = subscribeTo(`before_bookmark_${APP_ID}`, async (type, subId, content) => {
      if (type === 'EOSE') {

        if (remove) {
          await removeBookmark(bookmarks);
        }
        else {
          await addBookmark(bookmarks);
        }

        then && then();
        setBookmarkInProgress(() => false);
        unsub();
        return;
      }

      if (type === 'EVENT') {
        if (!content || content.kind !== Kind.Bookmarks) return;

        bookmarks = content.tags;
      }
    });

    setBookmarkInProgress(() => true);
    getBookmarks(account.publicKey, `before_bookmark_${APP_ID}`);
  }

  return (
    <div class={styles.bookmark}>
      <ButtonGhost
        onClick={(e: MouseEvent) => {
          e.preventDefault();

          doBookmark(isBookmarked());

        }}
        disabled={bookmarkInProgress()}
      >
        <Show
          when={isBookmarked()}
          fallback={
            <div class={`${styles.emptyBookmark} ${props.large ? styles.large : ''}`}></div>
          }
          >
            <div class={`${styles.fullBookmark} ${props.large ? styles.large : ''}`}></div>
        </Show>
      </ButtonGhost>
    </div>
  )
}

export default BookmarkArticle;
