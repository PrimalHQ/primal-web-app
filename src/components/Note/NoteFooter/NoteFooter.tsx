import { Component, createEffect, createSignal, Show } from 'solid-js';
import { MenuItem, PrimalNote, ZapOption } from '../../../types/primal';
import { sendRepost } from '../../../lib/notes';

import styles from './NoteFooter.module.scss';
import { useAccountContext } from '../../../contexts/AccountContext';
import { useToastContext } from '../../Toaster/Toaster';
import { useIntl } from '@cookbook/solid-intl';

import { truncateNumber } from '../../../lib/notifications';
import { canUserReceiveZaps, zapNote } from '../../../lib/zap';
import CustomZap from '../../CustomZap/CustomZap';
import { useSettingsContext } from '../../../contexts/SettingsContext';

import zapMD from '../../../assets/lottie/zap_md.json';
import { toast as t } from '../../../translations';
import PrimalMenu from '../../PrimalMenu/PrimalMenu';
import { hookForDev } from '../../../lib/devTools';
import NoteContextMenu from '../NoteContextMenu';
import { getScreenCordinates } from '../../../utils';
import ZapAnimation from '../../ZapAnimation/ZapAnimation';
import ReactionsModal from '../../ReactionsModal/ReactionsModal';
import { CustomZapInfo, useAppContext } from '../../../contexts/AppContext';

const NoteFooter: Component<{ note: PrimalNote, wide?: boolean, id?: string }> = (props) => {

  const account = useAccountContext();
  const toast = useToastContext();
  const intl = useIntl();
  const settings = useSettingsContext();
  const app = useAppContext();

  let medZapAnimation: HTMLElement | undefined;

  const [liked, setLiked] = createSignal(props.note.post.noteActions.liked);
  const [zapped, setZapped] = createSignal(props.note.post.noteActions.zapped);
  const [replied, setReplied] = createSignal(props.note.post.noteActions.replied);
  const [reposted, setReposted] = createSignal(props.note.post.noteActions.reposted);

  const [likes, setLikes] = createSignal(props.note.post.likes);
  const [reposts, setReposts] = createSignal(props.note.post.reposts);
  const [replies, setReplies] = createSignal(props.note.post.replies);
  const [zapCount, setZapCount] = createSignal(props.note.post.zaps);
  const [zaps, setZaps] = createSignal(props.note.post.satszapped);

  const [isRepostMenuVisible, setIsRepostMenuVisible] = createSignal(false);

  let footerDiv: HTMLDivElement | undefined;
  let noteContextMenu: HTMLDivElement | undefined;

  const repostMenuItems: MenuItem[] = [
    {
      action: () => doRepost(),
      label: 'Repost Note',
      icon: 'feed_repost',
    },
    {
      action: () => doQuote(),
      label: 'Quote Note',
      icon: 'quote',
    },
  ];

  const onClickOutside = (e: MouseEvent) => {
    if (
      !document?.getElementById(`repost_menu_${props.note.post.id}`)?.contains(e.target as Node)
    ) {
      setIsRepostMenuVisible(false);
    }
  }

  createEffect(() => {
    if (isRepostMenuVisible()) {
      document.addEventListener('click', onClickOutside);
    }
    else {
      document.removeEventListener('click', onClickOutside);
    }
  });

  const showRepostMenu = (e: MouseEvent) => {
    e.preventDefault();
    setIsRepostMenuVisible(true);
  };

  const doQuote = () => {
    if (!account?.hasPublicKey()) {
      account?.actions.showGetStarted();
      return;
    }
    setIsRepostMenuVisible(false);
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

    if (account.relays.length === 0) {
      toast?.sendWarning(
        intl.formatMessage(t.noRelaysConnected),
      );
      return;
    }

    setIsRepostMenuVisible(false);

    const { success } = await sendRepost(props.note, account.relays, account.relaySettings);

    if (success) {
      setReposts(reposts() + 1);
      setReposted(true);
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

  const doReply = () => {};

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

    if (account.relays.length === 0) {
      toast?.sendWarning(
        intl.formatMessage(t.noRelaysConnected),
      );
      return;
    }

    const success = await account.actions.addLike(props.note);

    if (success) {
      setLikes(likes() + 1);
      setLiked(true);
    }
  };

  let quickZapDelay = 0;
  const [isZapping, setIsZapping] = createSignal(false);

  const customZapInfo: CustomZapInfo = {
    note: props.note,
    onConfirm: (zapOption: ZapOption) => {
      app?.actions.closeCustomZapModal();
      setZappedAmount(() => zapOption.amount || 0);
      setZappedNow(true);
      setZapped(true);
      animateZap();
    },
    onSuccess: (zapOption: ZapOption) => {
      app?.actions.closeCustomZapModal();
      setIsZapping(false);
      setZappedNow(false);
      setShowZapAnim(false);
      setHideZapIcon(false);
      setZapped(true);
    },
    onFail: (zapOption: ZapOption) => {
      setZappedAmount(() => -(zapOption.amount || 0));
      setZappedNow(true);
      app?.actions.closeCustomZapModal();
      setIsZapping(false);
      setShowZapAnim(false);
      setHideZapIcon(false);
      setZapped(props.note.post.noteActions.zapped);
    },
    onCancel: (zapOption: ZapOption) => {
      setZappedAmount(() => -(zapOption.amount || 0));
      setZappedNow(true);
      app?.actions.closeCustomZapModal();
      setIsZapping(false);
      setShowZapAnim(false);
      setHideZapIcon(false);
      setZapped(props.note.post.noteActions.zapped);
    },
  };

  const startZap = (e: MouseEvent | TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!account?.hasPublicKey()) {
      account?.actions.showGetStarted()
      setIsZapping(false);
      return;
    }

    if (account.relays.length === 0) {
      toast?.sendWarning(
        intl.formatMessage(t.noRelaysConnected),
      );
      return;
    }

    if (!canUserReceiveZaps(props.note.user)) {
      toast?.sendWarning(
        intl.formatMessage(t.zapUnavailable),
      );
      setIsZapping(false);
      return;
    }

    quickZapDelay = setTimeout(() => {
      app?.actions.openCustomZapModal(customZapInfo);
      setIsZapping(true);
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

    if (account.relays.length === 0 || !canUserReceiveZaps(props.note.user)) {
      return;
    }

    if (app?.customZap === undefined) {
      doQuickZap();
    }
  };

  const [zappedNow, setZappedNow] = createSignal(false);
  const [zappedAmount, setZappedAmount] = createSignal(0);

  const animateZap = () => {
    setShowZapAnim(true);
    setTimeout(() => {
      setHideZapIcon(true);

      if (!medZapAnimation) {
        return;
      }

      const newLeft = props.wide ? 36 : 24;
      const newTop = props.wide ? -28 : -28;

      medZapAnimation.style.left = `${newLeft}px`;
      medZapAnimation.style.top = `${newTop}px`;

      const onAnimDone = () => {
        setShowZapAnim(false);
        setHideZapIcon(false);
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

    setZappedAmount(() => settings?.defaultZap.amount || 0);
    setZappedNow(true);
    animateZap();
    const success = await zapNote(props.note, account.publicKey, settings?.defaultZap.amount || 10, settings?.defaultZap.message || '', account.relays);
    setIsZapping(false);

    if (success) {
      return;
    }

    setZappedAmount(() => -(settings?.defaultZap.amount || 0));
    setZappedNow(true);
    setZapped(props.note.post.noteActions.zapped);
  }

  const buttonTypeClasses: Record<string, string> = {
    zap: styles.zapType,
    like: styles.likeType,
    reply: styles.replyType,
    repost: styles.repostType,
  };

  const actionButton = (opts: {
    type: 'zap' | 'like' | 'reply' | 'repost',
    disabled?: boolean,
    highlighted?: boolean,
    onClick?: (e: MouseEvent) => void,
    onMouseDown?: (e: MouseEvent) => void,
    onMouseUp?: (e: MouseEvent) => void,
    onTouchStart?: (e: TouchEvent) => void,
    onTouchEnd?: (e: TouchEvent) => void,
    label: string | number,
    hidden?: boolean,
    title?: string,
  }) => {

    return (
      <button
        id={`btn_${opts.type}_${props.note.post.id}`}
        class={`${styles.stat} ${opts.highlighted ? styles.highlighted : ''}`}
        onClick={opts.onClick ?? (() => {})}
        onMouseDown={opts.onMouseDown ?? (() => {})}
        onMouseUp={opts.onMouseUp ?? (() => {})}
        onTouchStart={opts.onTouchStart ?? (() => {})}
        onTouchEnd={opts.onTouchEnd ?? (() => {})}
        disabled={opts.disabled}
      >
        <div class={`${buttonTypeClasses[opts.type]}`}>
          <div
            class={styles.icon}
            style={opts.hidden ? 'visibility: hidden': 'visibility: visible'}
          ></div>
          <div class={styles.statNumber}>{opts.label || ''}</div>
        </div>
      </button>
    );
  };

  createEffect(() => {

    if (zappedNow()) {
      setZapCount(c => c + 1);
      setZaps((z) => z + zappedAmount());
      setZapped(true);
      setZappedNow(false);
    }

  });

  const [showZapAnim, setShowZapAnim] = createSignal(false);
  const [hideZapIcon, setHideZapIcon] = createSignal(false);


  let repostMenu: HTMLDivElement | undefined;

  const determineOrient = () => {
    const coor = getScreenCordinates(repostMenu);
    const height = 100;
    return (coor.y || 0) + height < window.innerHeight + window.scrollY ? 'down' : 'up';
  }

  return (
    <div id={props.id} class={`${styles.footer} ${props.wide ? styles.wide : ''}`} ref={footerDiv} onClick={(e) => {e.preventDefault();}}>

      <Show when={showZapAnim()}>
        <ZapAnimation
          id={`note-med-zap-${props.note.post.id}`}
          src={zapMD}
          class={styles.mediumZapLottie}
          ref={medZapAnimation}
        />
      </Show>

      {actionButton({
        onClick: doReply,
        type: 'reply',
        highlighted: replied(),
        label: replies() === 0 ? '' : truncateNumber(replies(), 2),
        title: replies().toLocaleString(),
      })}

      {actionButton({
        onClick: (e: MouseEvent) => e.preventDefault(),
        onMouseDown: startZap,
        onMouseUp: commitZap,
        onTouchStart: startZap,
        onTouchEnd: commitZap,
        type: 'zap',
        highlighted: zapped() || isZapping(),
        label: zaps() === 0 ? '' : truncateNumber(zaps(), 2),
        hidden: hideZapIcon(),
        title: zaps().toLocaleString(),
      })}

      {actionButton({
        onClick: doLike,
        type: 'like',
        highlighted: liked(),
        label: likes() === 0 ? '' : truncateNumber(likes(), 2),
        title: likes().toLocaleString(),
      })}


      <button
        id={`btn_repost_${props.note.post.id}`}
        class={`${styles.stat} ${reposted() ? styles.highlighted : ''}`}
        onClick={showRepostMenu}
        title={reposts().toLocaleString()}
      >
        <div
          class={`${buttonTypeClasses.repost}`}
          ref={repostMenu}
        >
          <div
            class={styles.icon}
            style={'visibility: visible'}
          ></div>
          <div class={styles.statNumber}>
            {reposts() === 0 ? '' : truncateNumber(reposts(), 2)}
          </div>
          <PrimalMenu
            id={`repost_menu_${props.note.post.id}`}
            items={repostMenuItems}
            position="note_footer"
            orientation={determineOrient()}
            hidden={!isRepostMenuVisible()}
          />
        </div>
      </button>

      <div ref={noteContextMenu} class={styles.context}>
        <button
          class={styles.contextButton}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();

            app?.actions.openContextMenu(
              props.note,
              noteContextMenu?.getBoundingClientRect(),
              () => {
                app?.actions.openCustomZapModal(customZapInfo);
              },
              () => {
                app?.actions.openReactionModal(props.note.post.id, {
                  likes: likes(),
                  zaps: zapCount(),
                  reposts: reposts(),
                  quotes: 0,
                });
              }
            );
          }}
        >
          <div class={styles.contextIcon} ></div>
        </button>
      </div>
    </div>
  )
}

export default hookForDev(NoteFooter);
