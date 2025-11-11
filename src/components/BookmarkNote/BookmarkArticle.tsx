import { useIntl } from '@cookbook/solid-intl';
import { Component, createEffect, createSignal, Show } from 'solid-js';
import { APP_ID } from '../../App';
import { Kind, supportedBookmarkTypes } from '../../constants';
import { useAppContext } from '../../contexts/AppContext';
import { logWarning } from '../../lib/logger';
import { getBookmarks, sendBookmarks } from '../../lib/profile';
import { subsTo } from '../../sockets';
import { PrimalArticle } from '../../types/primal';
import ButtonGhost from '../Buttons/ButtonGhost';
import { bookmarks as tBookmarks } from '../../translations';

import styles from './BookmarkNote.module.scss';
import { saveBookmarks } from '../../lib/localStore';
import { accountStore, updateBookmarks as updateAccountBookmarks } from '../../stores/accountStore';

const BookmarkArticle: Component<{ note: PrimalArticle | undefined, large?: boolean }> = (props) => {
  const app = useAppContext();
  const intl = useIntl();

  const [isBookmarked, setIsBookmarked] = createSignal(false);
  const [bookmarkInProgress, setBookmarkInProgress] = createSignal(false);

  createEffect(() => {
    const note = props.note;

    if (note) {
      const coor = `${note.msg.kind}:${note.pubkey}:${(note.msg.tags.find(t => t[0] === 'd') || [])[1]}`;

      setIsBookmarked(() => accountStore.bookmarks.includes(coor) || false);
    }
  })

  const updateBookmarks = async (bookmarkTags: string[][], temp?: boolean) => {
    const bookmarks = bookmarkTags.reduce((acc, t) =>
      supportedBookmarkTypes.includes(t[0]) ? [...acc, t[1]] : [...acc]
    , []);

    const date = Math.floor((new Date()).getTime() / 1000);

    updateAccountBookmarks(bookmarks);

    if (temp) return;
    saveBookmarks(accountStore.publicKey, bookmarks);

    sendBookmarks(
      [...bookmarkTags],
      date,
      '',
    );
  };

  const addBookmark = async (bookmarkTags: string[][], temp?: boolean) => {
    if (!props.note) return;

    const aTag = ['a', `${props.note.msg.kind}:${props.note.pubkey}:${(props.note.msg.tags.find(t => t[0] === 'd') || [])[1]}`];

    if (!bookmarkTags.find(b => b[0] === aTag[0] && b[1] === aTag[1])) {
      const bookmarksToAdd = [...bookmarkTags, [ ...aTag ]];

      if (bookmarksToAdd.length < 2) {
        logWarning('BOOKMARK ISSUE: ', `before_bookmark_${APP_ID}`);

        app?.actions.openConfirmModal({
          title: intl.formatMessage(tBookmarks.confirm.title),
          description: intl.formatMessage(tBookmarks.confirm.description),
          confirmLabel: intl.formatMessage(tBookmarks.confirm.confirm),
          abortLabel: intl.formatMessage(tBookmarks.confirm.abort),
          onConfirm: () => {
            updateBookmarks(bookmarksToAdd, temp);
            app.actions.closeConfirmModal();
          },
          onAbort: app.actions.closeConfirmModal,
        })

        return;
      }

      updateBookmarks(bookmarksToAdd, temp);
    }
  }

  const removeBookmark = async (bookmarks: string[][], temp?: boolean) => {
    if (!props.note) return;

    const aTag = ['a', `${props.note.msg.kind}:${props.note.pubkey}:${(props.note.msg.tags.find(t => t[0] === 'd') || [])[1]}`];

    if (bookmarks.find(b => b[0] === aTag[0] && b[1] === aTag[1])) {
      const bookmarksToAdd = bookmarks.filter(b => b[0] !== aTag[0] || b[1] !== aTag[1]);

      if (bookmarksToAdd.length < 1) {
        logWarning('BOOKMARK ISSUE: ', `before_bookmark_${APP_ID}`);

        app?.actions.openConfirmModal({
          title: intl.formatMessage(tBookmarks.confirm.titleZero),
          description: intl.formatMessage(tBookmarks.confirm.descriptionZero),
          confirmLabel: intl.formatMessage(tBookmarks.confirm.confirmZero),
          abortLabel: intl.formatMessage(tBookmarks.confirm.abortZero),
          onConfirm: () => {
            updateBookmarks(bookmarksToAdd, temp);
            app.actions.closeConfirmModal();
          },
          onAbort: app.actions.closeConfirmModal,
        })

        return;
      }

      updateBookmarks(bookmarksToAdd, temp);
    }
  }

  const doBookmark = (remove: boolean, then?: () => void) => {

    if (!accountStore.publicKey) {
      return;
    }

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


    const taggedBookmarks = accountStore.bookmarks.map(b => {
      if (b.split(':').length === 3) {
        return ['a', b];
      }

      return ['e', b];
    })

    if (remove) {
      removeBookmark(taggedBookmarks, true);
    }
    else {
      addBookmark(taggedBookmarks, true);
    }

    setBookmarkInProgress(() => true);
    getBookmarks(accountStore.publicKey, `before_bookmark_${APP_ID}`);
  }

  return (
    <div class={styles.bookmark}>
      <ButtonGhost
        onClick={(e: MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();

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
