import { batch, Component, createEffect, createSignal, onMount, Show } from 'solid-js';
import { MenuItem, PrimalNote, ZapOption } from '../../../types/primal';
import { getMyRepostOfEvent, sendDeleteEvent, sendRepost, triggerImportEvents } from '../../../lib/notes';

import styles from './NoteFooter.module.scss';
import { useAccountContext } from '../../../contexts/AccountContext';
import { useToastContext } from '../../Toaster/Toaster';
import { useIntl } from '@cookbook/solid-intl';

import { truncateNumber } from '../../../lib/notifications';
import { canUserReceiveZaps, lastZapError, zapNote } from '../../../lib/zap';
import { useSettingsContext } from '../../../contexts/SettingsContext';

import zapMD from '../../../assets/lottie/zap_md_2.json';
import { toast as t } from '../../../translations';
import PrimalMenu from '../../PrimalMenu/PrimalMenu';
import { hookForDev } from '../../../lib/devTools';
import { determineOrient, getScreenCordinates, isPhone } from '../../../utils';
import ZapAnimation from '../../ZapAnimation/ZapAnimation';
import { CustomZapInfo, useAppContext } from '../../../contexts/AppContext';
import NoteFooterActionButton from './NoteFooterActionButton';
import { NoteReactionsState } from '../Note';
import { SetStoreFunction } from 'solid-js/store';
import BookmarkNote from '../../BookmarkNote/BookmarkNote';
import { readSecFromStorage } from '../../../lib/localStore';
import { useNavigate } from '@solidjs/router';
import { Kind } from '../../../constants';
import { APP_ID } from '../../../App';

export const lottieDuration = () => zapMD.op * 1_000 / zapMD.fr;

const NoteFooter: Component<{
  note: PrimalNote,
  size?: 'xwide' | 'wide' | 'normal' | 'compact' | 'short' | 'very_short' | 'notif',
  id?: string,
  state: NoteReactionsState,
  updateState?: SetStoreFunction<NoteReactionsState>,
  customZapInfo?: CustomZapInfo,
  large?: boolean,
  onZapAnim?: (zapOption: ZapOption) => void,
  onDelete?: (noteId: string, isRepost?: boolean) => void,
  noteType?: 'primary',
}> = (props) => {

  const account = useAccountContext();
  const toast = useToastContext();
  const intl = useIntl();
  const settings = useSettingsContext();
  const app = useAppContext();
  const navigate = useNavigate();

  let medZapAnimation: HTMLElement | undefined;

  let quickZapDelay = 0;
  let footerDiv: HTMLDivElement | undefined;
  let repostMenu: HTMLDivElement | undefined;

  const size = () => props.size ?? 'normal';

  const repostItem = (): MenuItem => {
    return props.state.reposted ? {
      action: () => {
        app?.actions.openConfirmModal({
          title: "Delete Repost?",
          description: "You are about to delete this repost. Are you sure?",
          confirmLabel: "Yes",
          abortLabel: "Cancel",
          onConfirm: () => {
            doRepostDelete();
            app.actions.closeConfirmModal();
          },
          onAbort: () => {app.actions.closeConfirmModal()},
        })
      },
      warning: true,
      label: 'Delete Repost',
      icon: 'feed_repost',
    } :
    {
      action: () => doRepost(),
      label: 'Repost Note',
      icon: 'feed_repost',
    };
  }

  const repostMenuItems = (): MenuItem[] => [
    repostItem(),
    {
      action: () => doQuote(),
      label: 'Quote Note',
      icon: 'quote',
    },
  ];

  const doRepostDelete = async () => {
    const pubkey = account?.publicKey;

    let noteToDelete = props.note.repost;

    if (!pubkey) return;

    let id: string | undefined = noteToDelete?.note.id;


    if (!id) {
      id = await getMyRepostOfEvent(props.note.id, pubkey);
    }

    if (!id) {
      return;
    }

    const { success, note: deleteEvent } = await sendDeleteEvent(
      pubkey,
      id,
      Kind.Repost,
      account.activeRelays,
      account.relaySettings,
      account.proxyThroughPrimal,
    );

    if (!success || !deleteEvent) return;

    triggerImportEvents([deleteEvent], `delete_import_${APP_ID}`);

    // id of the note to remove from UI
    let removeId = props.note.pubkey === account.publicKey ?
      id :
      props.note.noteId;

    props.updateState && props.updateState('reposts', (r) => r - 1);
    props.updateState && props.updateState('reposted', () => false);

    props.onDelete && props.onDelete(removeId, true);
  };

  const onClickOutside = (e: MouseEvent) => {
    if (
      !document?.getElementById(`repost_menu_${props.note.post.id}`)?.contains(e.target as Node) &&
      props.updateState
    ) {
      props.updateState('isRepostMenuVisible', () => false);
    }
  }

  createEffect(() => {
    if (props.state.isRepostMenuVisible) {
      document.addEventListener('click', onClickOutside);
    }
    else {
      document.removeEventListener('click', onClickOutside);
    }
  });

  const showRepostMenu = (e: MouseEvent) => {
    e.preventDefault();
    props.updateState && props.updateState('isRepostMenuVisible', () => true);
  };

  const doQuote = () => {
    if (!account?.hasPublicKey()) {
      account?.actions.showGetStarted();
      return;
    }
    props.updateState && props.updateState('isRepostMenuVisible', () => false);
    account?.actions?.quoteNote(`nostr:${props.note.post.noteId}`);
    account?.actions?.showNewNoteForm();
  };

  const doRepost = async () => {
    if (!account) {
      return;
    }

    if (!account.hasPublicKey()) {
      account.actions.showGetStarted();
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
    //   toast?.sendWarning(
    //     intl.formatMessage(t.noRelaysConnected),
    //   );
    //   return;
    // }

    props.updateState && props.updateState('isRepostMenuVisible', () => false);

    const { success } = await sendRepost(props.note, account.proxyThroughPrimal, account.activeRelays, account.relaySettings);

    if (success) {
      batch(() => {
        props.updateState && props.updateState('reposts', (r) => r + 1);
        props.updateState && props.updateState('reposted', () => true);
      });

      toast?.sendSuccess(
        intl.formatMessage(t.repostSuccess),
      );
    }
    else {
      toast?.sendWarning(
        intl.formatMessage(t.repostFailed),
      );
    }
  };

  const doReply = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/e/${props.note.noteId}`);

  };

  const doLike = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!account) {
      return;
    }

    if (!account.hasPublicKey()) {
      account.actions.showGetStarted();
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
    //   toast?.sendWarning(
    //     intl.formatMessage(t.noRelaysConnected),
    //   );
    //   return;
    // }

    const success = await account.actions.addLike(props.note);

    if (success) {
      batch(() => {
        props.updateState && props.updateState('likes', (l) => l + 1);
        props.updateState && props.updateState('liked', () => true);
      });
    }
  };

  const startZap = (e: MouseEvent | TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!account?.hasPublicKey()) {
      account?.actions.showGetStarted();
      props.updateState && props.updateState('isZapping', () => false);
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
    //   toast?.sendWarning(
    //     intl.formatMessage(t.noRelaysConnected),
    //   );
    //   return;
    // }

    if (!canUserReceiveZaps(props.note.user)) {
      toast?.sendWarning(
        intl.formatMessage(t.zapUnavailable),
      );
      props.updateState && props.updateState('isZapping', () => false);
      return;
    }

    quickZapDelay = setTimeout(() => {
      props.customZapInfo && app?.actions.openCustomZapModal(props.customZapInfo);
      props.updateState && props.updateState('isZapping', () => true);
    }, 500);
  };

  const commitZap = (e: MouseEvent | TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();

    clearTimeout(quickZapDelay);

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

    // if ((!account.proxyThroughPrimal && account.relays.length === 0) || !canUserReceiveZaps(props.note.user)) {
    //   return;
    // }
    if (!canUserReceiveZaps(props.note.user)) {
      return;
    }

    if (app?.customZap === undefined) {
      doQuickZap();
    }
  };

  const animateZap = () => {
    setTimeout(() => {
      props.updateState && props.updateState('hideZapIcon', () => true);

      if (!medZapAnimation) {
        return;
      }

      let newLeft = 33;
      let newTop = -13;

      if (size() === 'xwide') {
        newLeft = 46;
        newTop = -7;
      }

      if (size() === 'wide' && props.large) {
        newLeft = 4;
        newTop = -15;
      }

      if (size() === 'short' || size() === 'very_short') {
        newLeft = 21;
        newTop = -13;
      }

      if (size() === 'compact') {
        newLeft = 26;
        newTop = -6;
      }

      medZapAnimation.style.left = `${newLeft}px`;
      medZapAnimation.style.top = `${newTop}px`;

      const onAnimDone = () => {
        batch(() => {
          props.updateState && props.updateState('showZapAnim', () => false);
          props.updateState && props.updateState('hideZapIcon', () => false);
          props.updateState && props.updateState('zapped', () => true);
        });
        medZapAnimation?.removeEventListener('complete', onAnimDone);
      }

      medZapAnimation.addEventListener('complete', onAnimDone);

      try {
        // @ts-ignore
        medZapAnimation.seek(0);
        // @ts-ignore
        medZapAnimation.play();
      } catch (e) {
        console.warn('Failed to animte zap:', e);
        onAnimDone();
      }
    }, 10);
  };

  const doQuickZap = async () => {
    if (!account?.hasPublicKey()) {
      account?.actions.showGetStarted();
      return;
    }

    const amount = settings?.defaultZap.amount || 10;
    const message = settings?.defaultZap.message || '';
    const emoji = settings?.defaultZap.emoji;

    batch(() => {
      props.updateState && props.updateState('isZapping', () => true);
      props.updateState && props.updateState('satsZapped', (z) => z + amount);
      props.updateState && props.updateState('showZapAnim', () => true);
    });

    props.onZapAnim && props.onZapAnim({ amount, message, emoji })

    setTimeout(async () => {
      const success = await zapNote(
        props.note,
        account.publicKey,
        amount,
        message,
        account.activeRelays,
        account.activeNWC,
      );

      props.updateState && props.updateState('isZapping', () => false);

      if (success) {
        props.customZapInfo &&props.customZapInfo.onSuccess({
          emoji,
          amount,
          message,
        });

        return;
      } else {
        app?.actions.openConfirmModal({
          title: "Failed to zap",
          description: lastZapError || "",
          confirmLabel: "ok",
          onConfirm: app.actions.closeConfirmModal,
          // onAbort: app.actions.closeConfirmModal,
        })
      }

      props.customZapInfo && props.customZapInfo.onFail({
        emoji,
        amount,
        message,
      });
    }, lottieDuration());

  }

  const buttonTypeClasses: Record<string, string> = {
    zap: styles.zapType,
    like: styles.likeType,
    reply: styles.replyType,
    repost: styles.repostType,
  };

  createEffect(() => {
    if (props.state.showZapAnim) {
      animateZap();
    }
  });

  return (
    <div
      id={props.id}
      class={`${styles.footer} ${styles[size()]}`}
      ref={footerDiv}
      onClick={(e) => e.preventDefault() }
    >
      <Show when={props.state.showZapAnim}>
        <ZapAnimation
          id={`note-med-zap-${props.note.post.id}`}
          src={zapMD}
          class={props.large ? styles.largeZapLottie : styles.mediumZapLottie}
          ref={medZapAnimation}
        />
      </Show>

      <NoteFooterActionButton
        note={props.note}
        onClick={doReply}
        type="reply"
        highlighted={props.state.replied}
        label={props.state.replies === 0 ? '' : truncateNumber(props.state.replies, 2)}
        title={props.state.replies.toLocaleString()}
        large={props.large}
        noteType={props.noteType}
      />

      <NoteFooterActionButton
        note={props.note}
        onClick={(e: MouseEvent) => e.preventDefault()}
        onMouseDown={startZap}
        onMouseUp={commitZap}
        onTouchStart={startZap}
        onTouchEnd={commitZap}
        type="zap"
        highlighted={props.state.zapped || props.state.isZapping}
        label={props.state.satsZapped === 0 ? '' : truncateNumber(props.state.satsZapped, 2)}
        hidden={props.state.hideZapIcon}
        title={props.state.satsZapped.toLocaleString()}
        large={props.large}
        noteType={props.noteType}
      />

      <NoteFooterActionButton
        note={props.note}
        onClick={doLike}
        type="like"
        highlighted={props.state.liked}
        label={props.state.likes === 0 ? '' : truncateNumber(props.state.likes, 2)}
        title={props.state.likes.toLocaleString()}
        large={props.large}
        noteType={props.noteType}
      />

      <button
        id={`btn_repost_${props.note.post.id}`}
        class={`${styles.stat} ${props.state.reposted ? styles.highlighted : ''}`}
        onClick={showRepostMenu}
        title={props.state.reposts.toLocaleString()}
      >
        <div
          class={`${buttonTypeClasses.repost}`}
          ref={repostMenu}
        >
          <div
            class={`${styles.icon} ${props.large ? styles.large : ''}`}
            style={'visibility: visible'}
          ></div>
          <Show when={!isPhone() || props.noteType !== 'primary'}>
            <div class={styles.statNumber}>
              {props.state.reposts === 0 ? '' : truncateNumber(props.state.reposts, 2)}
            </div>
          </Show>
          <PrimalMenu
            id={`repost_menu_${props.note.post.id}`}
            items={repostMenuItems()}
            position="note_footer"
            orientation={determineOrient(repostMenu as HTMLElement)}
            hidden={!props.state.isRepostMenuVisible}
          />
        </div>
      </button>

      <div class={styles.bookmarkFoot}>
        <BookmarkNote
          note={props.note}
          large={props.large}
          right={true}
        />
      </div>

    </div>
  )
}

export default hookForDev(NoteFooter);
