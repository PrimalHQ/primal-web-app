import { useIntl } from '@cookbook/solid-intl';
import { Component, createEffect, createSignal, Show } from 'solid-js';
import { APP_ID } from '../../App';
import { Kind } from '../../constants';
import { useAppContext } from '../../contexts/AppContext';
import { logWarning } from '../../lib/logger';
import { getBookmarks, sendBookmarks } from '../../lib/profile';
import { subsTo } from '../../sockets';
import { PrimalNote } from '../../types/primal';
import ButtonGhost from '../Buttons/ButtonGhost';
import { bookmarks as tBookmarks } from '../../translations';

import styles from './BookmarkNote.module.scss';
import { readSecFromStorage, saveBookmarks } from '../../lib/localStore';
import { accountStore, hasPublicKey, setShowPin, showGetStarted, updateBookmarks } from '../../stores/accountStore';

const BookmarkNote: Component<{ note: PrimalNote, large?: boolean, right?: boolean }> = (props) => {
  const app = useAppContext();
  const intl = useIntl();

  const [isBookmarked, setIsBookmarked] = createSignal(false);
  const [bookmarkInProgress, setBookmarkInProgress] = createSignal(false);

  createEffect(() => {
    setIsBookmarked(() => accountStore.bookmarks.includes(props.note.post.id) || false);
  })

  const updateTheBookmarks = (bookmarkTags: string[][]) => {

    const bookmarks = bookmarkTags.reduce((acc, t) =>
      t[0] === 'e' ? [...acc, t[1]] : [...acc]
    , []);

    const date = Math.floor((new Date()).getTime() / 1000);

    updateBookmarks(bookmarks)
    saveBookmarks(accountStore.publicKey, bookmarks);
    sendBookmarks([...bookmarkTags], date, '');
  };

  const addBookmark = (bookmarkTags: string[][]) => {
    if (!hasPublicKey()) {
      showGetStarted();
      return;
    }

    if (!accountStore.sec || accountStore.sec.length === 0) {
      const sec = readSecFromStorage();
      if (sec) {
        setShowPin(sec);
        return;
      }
    }

    if (!bookmarkTags.find(b => b[0] === 'e' && b[1] === props.note.post.id)) {
      const bookmarksToAdd = [...bookmarkTags, ['e', props.note.post.id]];

      if (bookmarksToAdd.length < 2) {
        logWarning('BOOKMARK ISSUE: ', `before_bookmark_${APP_ID}`);

        app?.actions.openConfirmModal({
          title: intl.formatMessage(tBookmarks.confirm.title),
          description: intl.formatMessage(tBookmarks.confirm.description),
          confirmLabel: intl.formatMessage(tBookmarks.confirm.confirm),
          abortLabel: intl.formatMessage(tBookmarks.confirm.abort),
          onConfirm: () => {
            updateTheBookmarks(bookmarksToAdd);
            app.actions.closeConfirmModal();
          },
          onAbort: app.actions.closeConfirmModal,
        })

        return;
      }

      updateTheBookmarks(bookmarksToAdd);
    }
  }

  const removeBookmark = async (bookmarks: string[][]) => {
    if (bookmarks.find(b => b[0] === 'e' && b[1] === props.note.post.id)) {
      const bookmarksToAdd = bookmarks.filter(b => b[0] !== 'e' || b[1] !== props.note.post.id);

      if (bookmarksToAdd.length < 1) {
        logWarning('BOOKMARK ISSUE: ', `before_bookmark_${APP_ID}`);

        app?.actions.openConfirmModal({
          title: intl.formatMessage(tBookmarks.confirm.titleZero),
          description: intl.formatMessage(tBookmarks.confirm.descriptionZero),
          confirmLabel: intl.formatMessage(tBookmarks.confirm.confirmZero),
          abortLabel: intl.formatMessage(tBookmarks.confirm.abortZero),
          onConfirm: () => {
            updateTheBookmarks(bookmarksToAdd);
            app.actions.closeConfirmModal();
          },
          onAbort: app.actions.closeConfirmModal,
        })

        return;
      }

      updateTheBookmarks(bookmarksToAdd);
    }
  }

  const doBookmark = (remove: boolean, then?: () => void) => {
    let bookmarks: string[][] = []

    const unsub = subsTo(`before_bookmark_${APP_ID}`, {
      onEvent: (_, content) => {
        if (!content || content.kind !== Kind.Bookmarks) return;

        bookmarks = content.tags;
      },
      onEose: () => {
        if (remove) {
          removeBookmark(bookmarks);
        }
        else {
          addBookmark(bookmarks);
        }

        then && then();
        setBookmarkInProgress(() => false);
        unsub();
      },
    });

    setBookmarkInProgress(() => true);
    getBookmarks(accountStore.publicKey, `before_bookmark_${APP_ID}`);
  }

  return (
    <div class={styles.bookmark}>
      <ButtonGhost
        class={`${props.right ? styles.right : ''} ${props.large ? styles.rightL : ''}`}
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

export default BookmarkNote;
