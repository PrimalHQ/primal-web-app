import { useIntl } from '@cookbook/solid-intl';
import { Component, createEffect, createSignal, Show } from 'solid-js';
import { APP_ID } from '../../App';
import { Kind } from '../../constants';
import { useAccountContext } from '../../contexts/AccountContext';
import { useAppContext } from '../../contexts/AppContext';
import { logWarning } from '../../lib/logger';
import { getBookmarks, sendBookmarks } from '../../lib/profile';
import { subsTo } from '../../sockets';
import { PrimalNote } from '../../types/primal';
import ButtonGhost from '../Buttons/ButtonGhost';
import { bookmarks as tBookmarks, toast } from '../../translations';

import styles from './BookmarkNote.module.scss';
import { readSecFromStorage, saveBookmarks } from '../../lib/localStore';
import { triggerImportEvents } from '../../lib/notes';
import { useToastContext } from '../Toaster/Toaster';

const BookmarkNote: Component<{ note: PrimalNote, large?: boolean, right?: boolean }> = (props) => {
  const account = useAccountContext();
  const app = useAppContext();
  const intl = useIntl();
  const toaster = useToastContext();

  const [isBookmarked, setIsBookmarked] = createSignal(false);
  const [bookmarkInProgress, setBookmarkInProgress] = createSignal(false);

  createEffect(() => {
    setIsBookmarked(() => account?.bookmarks.includes(props.note.post.id) || false);
  })

  const updateBookmarks = async (bookmarkTags: string[][]) => {
    if (!account) return;

    const bookmarks = bookmarkTags.reduce((acc, t) =>
      t[0] === 'e' ? [...acc, t[1]] : [...acc]
    , []);

    const date = Math.floor((new Date()).getTime() / 1000);

    account.actions.updateBookmarks(bookmarks)
    saveBookmarks(account.publicKey, bookmarks);
    const { success, note} = await sendBookmarks([...bookmarkTags], date, '', account?.proxyThroughPrimal || false, account.activeRelays, account?.relaySettings);

    if (success && note) {
      triggerImportEvents([note], `bookmark_import_${APP_ID}`)
    }
  };

  const addBookmark = async (bookmarkTags: string[][]) => {
    if (!account?.hasPublicKey()) {
      account?.actions.showGetStarted();
      return;
    }

    if (!account.sec || account.sec.length === 0) {
      const sec = readSecFromStorage();
      if (sec) {
        account.actions.setShowPin(sec);
        return;
      }
    }

    // if (!account.proxyThroughPrimal && account.relays.length === 0) {
    //   toaster?.sendWarning(
    //     intl.formatMessage(toast.noRelaysConnected),
    //   );
    //   return;
    // }


    if (account && !bookmarkTags.find(b => b[0] === 'e' && b[1] === props.note.post.id)) {
      const bookmarksToAdd = [...bookmarkTags, ['e', props.note.post.id]];

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
    if (account && bookmarks.find(b => b[0] === 'e' && b[1] === props.note.post.id)) {
      const bookmarksToAdd = bookmarks.filter(b => b[0] !== 'e' || b[1] !== props.note.post.id);

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

    const unsub = subsTo(`before_bookmark_${APP_ID}`, {
      onEvent: (_, content) => {
        if (!content || content.kind !== Kind.Bookmarks) return;

        bookmarks = content.tags;
      },
      onEose: async () => {
        if (remove) {
          await removeBookmark(bookmarks);
        }
        else {
          await addBookmark(bookmarks);
        }

        then && then();
        setBookmarkInProgress(() => false);
        unsub();
      },
    });

    setBookmarkInProgress(() => true);
    getBookmarks(account.publicKey, `before_bookmark_${APP_ID}`);
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
