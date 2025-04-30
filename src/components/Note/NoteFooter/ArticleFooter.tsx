import { batch, Component, createEffect, Show } from 'solid-js';
import { MenuItem, PrimalArticle, PrimalNote, ZapOption } from '../../../types/primal';
import { sendArticleRepost } from '../../../lib/notes';

import styles from './NoteFooter.module.scss';
import { useAccountContext } from '../../../contexts/AccountContext';
import { useToastContext } from '../../Toaster/Toaster';
import { useIntl } from '@cookbook/solid-intl';

import { truncateNumber } from '../../../lib/notifications';
import { canUserReceiveZaps, lastZapError, zapArticle } from '../../../lib/zap';
import { useSettingsContext } from '../../../contexts/SettingsContext';

import zapMD from '../../../assets/lottie/zap_md_2.json';
import { toast as t } from '../../../translations';
import PrimalMenu from '../../PrimalMenu/PrimalMenu';
import { hookForDev } from '../../../lib/devTools';
import { getScreenCordinates } from '../../../utils';
import ZapAnimation from '../../ZapAnimation/ZapAnimation';
import { CustomZapInfo, useAppContext } from '../../../contexts/AppContext';
import ArticleFooterActionButton from './ArticleFooterActionButton';
import { NoteReactionsState } from '../Note';
import { SetStoreFunction } from 'solid-js/store';
import BookmarkNote from '../../BookmarkNote/BookmarkNote';
import BookmarkArticle from '../../BookmarkNote/BookmarkArticle';
import { readSecFromStorage } from '../../../lib/localStore';
import { useNavigate } from '@solidjs/router';

export const lottieDuration = () => zapMD.op * 1_000 / zapMD.fr;

const ArticleFooter: Component<{
  note: PrimalArticle,
  size?: 'xwide' | 'wide' | 'normal' | 'short',
  id?: string,
  state: NoteReactionsState,
  updateState: SetStoreFunction<NoteReactionsState>,
  customZapInfo: CustomZapInfo,
  large?: boolean,
  onZapAnim?: (zapOption: ZapOption) => void,
  isPhoneView?: boolean,
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
      !document?.getElementById(`repost_menu_${props.note.id}`)?.contains(e.target as Node)
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
    e.stopPropagation();
    props.updateState('isRepostMenuVisible', () => true);
  };

  const doQuote = () => {
    if (!account?.hasPublicKey()) {
      account?.actions.showGetStarted();
      return;
    }
    props.updateState('isRepostMenuVisible', () => false);
    account?.actions?.quoteNote(`nostr:${props.note.naddr}`);
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

    props.updateState('isRepostMenuVisible', () => false);

    const { success } = await sendArticleRepost(props.note, account.proxyThroughPrimal, account.activeRelays, account.relaySettings);

    if (success) {
      batch(() => {
        props.updateState('reposts', (r) => r + 1);
        props.updateState('reposted', () => true);
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
    navigate(`/a/${props.note.noteId}`)
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

    const success = await account.actions.addLike(props.note);

    if (success) {
      batch(() => {
        props.updateState('likes', (l) => l + 1);
        props.updateState('liked', () => true);
      });
    }
  };

  const startZap = (e: MouseEvent | TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!account?.hasPublicKey()) {
      account?.actions.showGetStarted();
      props.updateState('isZapping', () => false);
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
      props.updateState('isZapping', () => false);
      return;
    }

    quickZapDelay = setTimeout(() => {
      app?.actions.openCustomZapModal(props.customZapInfo);
      props.updateState('isZapping', () => true);
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

    if (app?.customZap === undefined) {
      doQuickZap();
    }
  };

  const animateZap = () => {
    setTimeout(() => {
      props.updateState('hideZapIcon', () => true);

      if (!medZapAnimation) {
        return;
      }

      let newLeft = 33;
      let newTop = -6;

      if (size() === 'xwide') {
        newLeft = 46;
        newTop = -7;
      }

      if (size() === 'wide' && props.large) {
        newLeft = 14;
        newTop = -10;
      }

      if (size() === 'short') {
        newLeft = 14;
        newTop = -6;
      }

      medZapAnimation.style.left = `${newLeft}px`;
      medZapAnimation.style.top = `${newTop}px`;

      const onAnimDone = () => {
        batch(() => {
          props.updateState('showZapAnim', () => false);
          props.updateState('hideZapIcon', () => false);
          props.updateState('zapped', () => true);
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
      props.updateState('isZapping', () => true);
      props.updateState('satsZapped', (z) => z + amount);
      props.updateState('showZapAnim', () => true);
    });

    props.onZapAnim && props.onZapAnim({ amount, message, emoji })

    setTimeout(async () => {
      const success = await zapArticle(
        props.note,
        account.publicKey,
        amount,
        message,
        account.activeRelays,
        account.activeNWC,
      );

      props.updateState('isZapping', () => false);

      if (success) {
        props.customZapInfo.onSuccess({
          emoji,
          amount,
          message,
        });

        return;
      } else {
        app?.actions.openConfirmModal({
          title: "Failed to zap",
          description: lastZapError,
          confirmLabel: "ok",
        })
      }

      props.customZapInfo.onFail({
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

  const determineOrient = () => {
    const coor = getScreenCordinates(repostMenu);
    const height = 100;
    return (coor.y || 0) + height < window.innerHeight + window.scrollY ? 'down' : 'up';
  }

  return (
    <div
      id={props.id}
      class={`${styles.footer} ${styles[size()]} ${props.isPhoneView ? styles.phoneView : ''}`}
      ref={footerDiv}
      onClick={(e) => {e.preventDefault();}}
    >

      <Show when={props.state.showZapAnim}>
        <ZapAnimation
          id={`note-med-zap-${props.note.id}`}
          src={zapMD}
          class={props.large ? styles.largeZapLottie : styles.mediumZapLottie}
          ref={medZapAnimation}
        />
      </Show>

      <ArticleFooterActionButton
        note={props.note}
        onClick={doReply}
        type="reply"
        highlighted={props.state.replied}
        label={props.state.replies === 0 ? '' : truncateNumber(props.state.replies, 2)}
        title={props.state.replies.toLocaleString()}
        large={props.large}
      />

      <ArticleFooterActionButton
        note={props.note}
        onClick={(e: MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
        }}
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
      />

      <ArticleFooterActionButton
        note={props.note}
        onClick={doLike}
        type="like"
        highlighted={props.state.liked}
        label={props.state.likes === 0 ? '' : truncateNumber(props.state.likes, 2)}
        title={props.state.likes.toLocaleString()}
        large={props.large}
      />

      <button
        id={`btn_repost_${props.note.id}`}
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
          <div class={styles.statNumber}>
            {props.state.reposts === 0 ? '' : truncateNumber(props.state.reposts, 2)}
          </div>
          <PrimalMenu
            id={`repost_menu_${props.note.id}`}
            items={repostMenuItems}
            position="note_footer"
            orientation={determineOrient()}
            hidden={!props.state.isRepostMenuVisible}
          />
        </div>
      </button>

      <div class={styles.bookmarkFoot}>
        <BookmarkArticle
          note={props.note}
          large={props.large}
        />
      </div>

    </div>
  )
}

export default hookForDev(ArticleFooter);
