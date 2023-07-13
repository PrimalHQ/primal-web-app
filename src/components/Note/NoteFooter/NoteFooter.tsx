import { Component, createEffect, createSignal, onMount, Show } from 'solid-js';
import { PrimalNote } from '../../../types/primal';
import { sendRepost } from '../../../lib/notes';

import styles from './NoteFooter.module.scss';
import { useAccountContext } from '../../../contexts/AccountContext';
import { useToastContext } from '../../Toaster/Toaster';
import { useIntl } from '@cookbook/solid-intl';

import { truncateNumber } from '../../../lib/notifications';
import { canUserReceiveZaps, zapNote } from '../../../lib/zap';
import CustomZap from '../../CustomZap/CustomZap';
import { useSettingsContext } from '../../../contexts/SettingsContext';

import zapSM from '../../../assets/lottie/zap_sm.json';
import zapMD from '../../../assets/lottie/zap_md.json';
import { medZapLimit } from '../../../constants';
import { toast as t } from '../../../translations';

const NoteFooter: Component<{ note: PrimalNote}> = (props) => {

  const account = useAccountContext();
  const toast = useToastContext();
  const intl = useIntl();
  const settings = useSettingsContext();

  let smallZapAnimation: HTMLElement | undefined;
  let medZapAnimation: HTMLElement | undefined;

  const [liked, setLiked] = createSignal(props.note.post.noteActions.liked);
  const [zapped, setZapped] = createSignal(props.note.post.noteActions.zapped);
  const [replied, setReplied] = createSignal(props.note.post.noteActions.replied);
  const [reposted, setReposted] = createSignal(props.note.post.noteActions.reposted);

  const [likes, setLikes] = createSignal(props.note.post.likes);
  const [reposts, setReposts] = createSignal(props.note.post.reposts);
  const [replies, setReplies] = createSignal(props.note.post.replies);
  const [zaps, setZaps] = createSignal(props.note.post.satszapped);

  let footerDiv: HTMLDivElement | undefined;

  const doRepost = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!account) {
      return;
    }

    if (Object.keys(account.relaySettings).length === 0) {
      toast?.sendWarning(
        intl.formatMessage(t.noRelays),
      );
      return;
    }

    if (account.relays.length === 0) {
      toast?.sendWarning(
        intl.formatMessage(t.noRelaysConnected),
      );
      return;
    }

    const { success } = await sendRepost(props.note, account.relays);

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

    if (Object.keys(account.relaySettings).length === 0) {
      toast?.sendWarning(
        intl.formatMessage(t.noRelays),
      );
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
  const [isCustomZap, setIsCustomZap] = createSignal(false);
  const [isZapping, setIsZapping] = createSignal(false);

  const startZap = (e: MouseEvent | TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!account?.hasPublicKey()) {
      toast?.sendWarning(
        intl.formatMessage(t.zapAsGuest),
      );
      setIsZapping(false);
      return;
    }

    if (Object.keys(account.relaySettings).length === 0) {
      toast?.sendWarning(
        intl.formatMessage(t.noRelays),
      );
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
      setIsCustomZap(true);
      setIsZapping(true);
    }, 500);
  };

  const commitZap = (e: MouseEvent | TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();

    clearTimeout(quickZapDelay);

    if (!account?.hasPublicKey() || account.relays.length === 0 || !canUserReceiveZaps(props.note.user)) {
      return;
    }

    if (!isCustomZap()) {
      doQuickZap();
    }
  };

  const [zappedNow, setZappedNow] = createSignal(false);
  const [zappedAmount, setZappedAmount] = createSignal(0);

  const animateSmallZap = () => {
    setTimeout(() => {
      setHideZapIcon(true);

      if (!smallZapAnimation) {
        return;
      }

      const newLeft = 116;
      const newTop =  -8;

      smallZapAnimation.style.left = `${newLeft}px`;
      smallZapAnimation.style.top = `${newTop}px`;

      const onAnimDone = () => {
        // setIsZapping(true);
        setShowSmallZapAnim(false);
        setHideZapIcon(false);
        smallZapAnimation?.removeEventListener('complete', onAnimDone);
      }

      smallZapAnimation.addEventListener('complete', onAnimDone);

      try {
        // @ts-ignore
        smallZapAnimation.seek(0);
        // @ts-ignore
        smallZapAnimation.play();
      } catch (e) {
        console.warn('Failed to animte zap:', e);
        onAnimDone();
      }
    }, 10);
  };

  const animateMedZap = () => {
    setTimeout(() => {
      setHideZapIcon(true);

      if (!medZapAnimation) {
        return;
      }

      const newLeft = 20;
      const newTop = -35;

      medZapAnimation.style.left = `${newLeft}px`;
      medZapAnimation.style.top = `${newTop}px`;

      const onAnimDone = () => {
        // setIsZapping(true);
        setShowMedZapAnim(false);
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


  const animateZap = () => {
    if (zappedAmount() > medZapLimit) {
      setShowMedZapAnim(true);
      animateMedZap();
    }
    else {
      setShowSmallZapAnim(true);
      animateSmallZap();
    }

  }

  const doQuickZap = async () => {

    if (account?.hasPublicKey()) {
      setZappedAmount(() => settings?.defaultZapAmount || 0);
      setZappedNow(true);
      animateZap();
      const success = await zapNote(props.note, account.publicKey, settings?.defaultZapAmount || 10, '', account.relays);
      setIsZapping(false);

      if (success) {
        return;
      }

        setZappedAmount(() => -(settings?.defaultZapAmount || 0));
        setZappedNow(true);
        setZapped(props.note.post.noteActions.zapped);
    }
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
        title={opts.title || ''}
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
      setZaps((z) => z + zappedAmount());
      setZapped(true);
      setZappedNow(false);
    }

  })

  const [showSmallZapAnim, setShowSmallZapAnim] = createSignal(false);
  const [showMedZapAnim, setShowMedZapAnim] = createSignal(false);
  const [hideZapIcon, setHideZapIcon] = createSignal(false);

  return (
    <div class={styles.footer} ref={footerDiv}>
      <Show when={showSmallZapAnim()}>
        <lottie-player
          id={`note-small-zap-${props.note.post.id}`}
          src={zapSM}
          speed="1"
          class={styles.smallZapLottie}
          ref={smallZapAnimation}
        ></lottie-player>
      </Show>

      <Show when={showMedZapAnim()}>
        <lottie-player
          id={`note-med-zap-${props.note.post.id}`}
          src={zapMD}
          speed="1"
          class={styles.mediumZapLottie}
          ref={medZapAnimation}
        ></lottie-player>
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

      {actionButton({
        onClick: doRepost,
        type: 'repost',
        highlighted: reposted(),
        label: reposts() === 0 ? '' : truncateNumber(reposts(), 2),
        title: reposts().toLocaleString(),
      })}

      <CustomZap
        open={isCustomZap()}
        note={props.note}
        onConfirm={(amount) => {
          setIsCustomZap(false);
          setZappedAmount(() => amount || 0);
          setZappedNow(true);
          setZapped(true);
          animateZap();
        }}
        onSuccess={(amount) => {
          setIsCustomZap(false);
          setIsZapping(false);
          // setZappedAmount(() => amount || 0);
          setZappedNow(false);
          // animateZap();
          setShowMedZapAnim(false);
          setShowSmallZapAnim(false);
          setHideZapIcon(false);
          setZapped(true);
        }}
        onFail={(amount) => {
          setZappedAmount(() => -(amount || 0));
          setZappedNow(true);
          setIsCustomZap(false);
          setIsZapping(false);
          setShowMedZapAnim(false);
          setShowSmallZapAnim(false);
          setHideZapIcon(false);
          setZapped(props.note.post.noteActions.zapped);
        }}
      />

    </div>
  )
}

export default NoteFooter;
