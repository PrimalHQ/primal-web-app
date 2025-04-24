import { A } from '@solidjs/router';
import { batch, Component, createEffect, For, JSXElement, onMount, Show } from 'solid-js';
import { createStore } from 'solid-js/store';
import { Portal } from 'solid-js/web';
import { wordsPerMinute } from '../../constants';
import { useAccountContext } from '../../contexts/AccountContext';
import { CustomZapInfo, useAppContext } from '../../contexts/AppContext';
import { useThreadContext } from '../../contexts/ThreadContext';
import { shortDate } from '../../lib/dates';
import { hookForDev } from '../../lib/devTools';
import { userName } from '../../stores/profile';
import { PrimalArticle, ZapOption } from '../../types/primal';
import { uuidv4 } from '../../utils';
import Avatar from '../Avatar/Avatar';
import { NoteReactionsState } from '../Note/Note';
import NoteContextTrigger from '../Note/NoteContextTrigger';
import ArticleFooter from '../Note/NoteFooter/ArticleFooter';
import NoteFooter from '../Note/NoteFooter/NoteFooter';
import NoteTopZaps from '../Note/NoteTopZaps';
import NoteTopZapsCompact from '../Note/NoteTopZapsCompact';
import VerificationCheck from '../VerificationCheck/VerificationCheck';

import styles from './ArticlePreview.module.scss';

const SimpleArticlePreview: Component<{
  id?: string,
  article: PrimalArticle,
  height?: number,
  onRender?: (article: PrimalArticle, el: HTMLAnchorElement | undefined) => void,
  onRemove?: (id: string) => void,
}> = (props) => {

  const app = useAppContext();
  const account = useAccountContext();
  const thread = useThreadContext();

  const [reactionsState, updateReactionsState] = createStore<NoteReactionsState>({
    likes: props.article.likes || 0,
    liked: props.article.noteActions?.liked || false,
    reposts: props.article.reposts || 0,
    reposted: props.article.noteActions?.reposted || false,
    replies: props.article.replies || 0,
    replied: props.article.noteActions?.replied || false,
    zapCount: props.article.zaps || 0,
    satsZapped: props.article.satszapped || 0,
    zapped: props.article.noteActions?.zapped || false,
    zappedAmount: 0,
    zappedNow: false,
    isZapping: false,
    showZapAnim: false,
    hideZapIcon: false,
    moreZapsAvailable: false,
    isRepostMenuVisible: false,
    topZaps: [],
    topZapsFeed: [],
    quoteCount: 0,
  });

  let latestTopZap: string = '';
  let latestTopZapFeed: string = '';
  let articleContextMenu: HTMLDivElement | undefined;

  const onConfirmZap = (zapOption: ZapOption) => {
    app?.actions.closeCustomZapModal();
    batch(() => {
      updateReactionsState('zappedAmount', () => zapOption.amount || 0);
      updateReactionsState('satsZapped', (z) => z + (zapOption.amount || 0));
      updateReactionsState('zapped', () => true);
      updateReactionsState('showZapAnim', () => true)
    });

    addTopZap(zapOption);
    addTopZapFeed(zapOption)
  };

  const onSuccessZap = (zapOption: ZapOption) => {
    app?.actions.closeCustomZapModal();
    app?.actions.resetCustomZap();

    const pubkey = account?.publicKey;

    if (!pubkey) return;

    batch(() => {
      updateReactionsState('zapCount', (z) => z + 1);
      updateReactionsState('isZapping', () => false);
      updateReactionsState('showZapAnim', () => false);
      updateReactionsState('hideZapIcon', () => false);
      updateReactionsState('zapped', () => true);
    });
  };

  const onFailZap = (zapOption: ZapOption) => {
    app?.actions.closeCustomZapModal();
    app?.actions.resetCustomZap();
    batch(() => {
      updateReactionsState('zappedAmount', () => -(zapOption.amount || 0));
      updateReactionsState('satsZapped', (z) => z - (zapOption.amount || 0));
      updateReactionsState('isZapping', () => false);
      updateReactionsState('showZapAnim', () => false);
      updateReactionsState('hideZapIcon', () => false);
      updateReactionsState('zapped', () => props.article.noteActions.zapped);
    });

    removeTopZap(zapOption);
    removeTopZapFeed(zapOption);
  };

  const onCancelZap = (zapOption: ZapOption) => {
    app?.actions.closeCustomZapModal();
    app?.actions.resetCustomZap();
    batch(() => {
      updateReactionsState('zappedAmount', () => -(zapOption.amount || 0));
      updateReactionsState('satsZapped', (z) => z - (zapOption.amount || 0));
      updateReactionsState('isZapping', () => false);
      updateReactionsState('showZapAnim', () => false);
      updateReactionsState('hideZapIcon', () => false);
      updateReactionsState('zapped', () => props.article.noteActions.zapped);
    });

    removeTopZap(zapOption);
    removeTopZapFeed(zapOption);
  };

  const addTopZap = (zapOption: ZapOption) => {
    const pubkey = account?.publicKey;

    if (!pubkey) return;

    const oldZaps = [ ...reactionsState.topZaps ];

    latestTopZap = uuidv4() as string;

    const newZap = {
      amount: zapOption.amount || 0,
      message: zapOption.message || '',
      pubkey,
      eventId: props.article.id,
      id: latestTopZap,
    };

    if (!thread?.users.find((u) => u.pubkey === pubkey)) {
      thread?.actions.fetchUsers([pubkey])
    }

    const zaps = [ ...oldZaps, { ...newZap }].sort((a, b) => b.amount - a.amount);
    updateReactionsState('topZaps', () => [...zaps]);
  };

  const removeTopZap = (zapOption: ZapOption) => {
    const zaps = reactionsState.topZaps.filter(z => z.id !== latestTopZap);
    updateReactionsState('topZaps', () => [...zaps]);
  };


  const addTopZapFeed = (zapOption: ZapOption) => {
    const pubkey = account?.publicKey;

    if (!pubkey) return;

    const oldZaps = [ ...reactionsState.topZapsFeed ];

    latestTopZapFeed = uuidv4() as string;

    const newZap = {
      amount: zapOption.amount || 0,
      message: zapOption.message || '',
      pubkey,
      eventId: props.article.id,
      id: latestTopZapFeed,
    };

    const zaps = [ ...oldZaps, { ...newZap }].sort((a, b) => b.amount - a.amount).slice(0, 4);
    updateReactionsState('topZapsFeed', () => [...zaps]);
  }

  const removeTopZapFeed = (zapOption: ZapOption) => {
    const zaps = reactionsState.topZapsFeed.filter(z => z.id !== latestTopZapFeed);
    updateReactionsState('topZapsFeed', () => [...zaps]);
  };

  const customZapInfo: () => CustomZapInfo = () => ({
    note: props.article,
    onConfirm: onConfirmZap,
    onSuccess: onSuccessZap,
    onFail: onFailZap,
    onCancel: onCancelZap,
  });

  const openReactionModal = (openOn = 'likes') =>  {
    app?.actions.openReactionModal(props.article.naddr, {
      likes: reactionsState.likes,
      zaps: reactionsState.zapCount,
      reposts: reactionsState.reposts,
      quotes: reactionsState.quoteCount,
      openOn,
    });
  };

  const onContextMenuTrigger = () => {
    app?.actions.openContextMenu(
      props.article,
      articleContextMenu?.getBoundingClientRect(),
      () => {
        app?.actions.openCustomZapModal(customZapInfo());
      },
      openReactionModal,
      () => {
        props.onRemove && props.onRemove(props.article.noteId);
      },
    );
  }

  let articlePreview: HTMLDivElement | undefined;

  const onImageLoaded = () => {
    // props.onRender && props.onRender(props.article, articlePreview);
  };

  return (
    <div
      ref={articlePreview}
      class={styles.article}
      style={props.height ? `height: ${props.height}px` : ''}
    >
      <div class={styles.upRightFloater}>
        <NoteContextTrigger
          ref={articleContextMenu}
          onClick={onContextMenuTrigger}
        />
      </div>

      <div class={styles.header}>
        <div class={styles.userInfo}>
          <Avatar user={props.article.user} size="micro"/>
          <div class={styles.userName}>{userName(props.article.user)}</div>
          <VerificationCheck  user={props.article.user} />
          <div class={styles.nip05}>{props.article.user?.nip05 || ''}</div>
        </div>
        <div class={styles.time}>
          {shortDate(props.article.published)}
        </div>
      </div>

      <div class={styles.body}>
        <div class={styles.text}>
          <div class={styles.content}>
            <div class={styles.title}>
              {props.article.title}
            </div>
            <div class={styles.summary}>
              {props.article.summary}
            </div>
          </div>
          <div class={styles.tags}>
            <For each={props.article.tags?.slice(0, 3)}>
              {tag => (
                <div class={styles.tag}>
                  {tag}
                </div>
              )}
            </For>
            <Show when={props.article.tags?.length && props.article.tags.length > 3}>
              <div class={styles.tag}>
                + {props.article.tags.length - 3}
              </div>
            </Show>
          </div>
        </div>
        <div class={styles.image}>
          <Show
            when={props.article.image}
            fallback={
              <Show
                when={props.article.user.picture}
                fallback={<div class={styles.placeholderImage}></div>}
              >
                <img src={props.article.user.picture} onload={onImageLoaded} />
              </Show>
            }
          >
            <img src={props.article.image} onload={onImageLoaded} />
          </Show>
        </div>
      </div>
    </div>
  );
}

export default hookForDev(SimpleArticlePreview);
