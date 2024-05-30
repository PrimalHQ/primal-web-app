import { A } from '@solidjs/router';
import { batch, Component, createEffect, For, JSXElement, Show } from 'solid-js';
import { createStore } from 'solid-js/store';
import { Portal } from 'solid-js/web';
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

const ArticlePreview: Component<{
  id?: string,
  article: PrimalArticle,
}> = (props) => {

  const app = useAppContext();
  const account = useAccountContext();
  const thread = useThreadContext();

  const [reactionsState, updateReactionsState] = createStore<NoteReactionsState>({
    likes: props.article.likes,
    liked: props.article.noteActions.liked,
    reposts: props.article.reposts,
    reposted: props.article.noteActions.reposted,
    replies: props.article.replies,
    replied: props.article.noteActions.replied,
    zapCount: props.article.zaps,
    satsZapped: props.article.satszapped,
    zapped: props.article.noteActions.zapped,
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
    app?.actions.openReactionModal(props.article.id, {
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
    );
  }

  return (
    <A class={styles.article} href={`/e/${props.article.naddr}`}>
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
          <div class={styles.nip05}>{props.article.user.nip05 || ''}</div>
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
            <For each={props.article.tags}>
              {tag => (
                <div class={styles.tag}>
                  {tag}
                </div>
              )}
            </For>
            <div class={styles.estimate}>
              {Math.ceil(props.article.wordCount / 238)} minute read
            </div>
          </div>
        </div>
        <div class={styles.image}>
          <img src={props.article.image} />
        </div>
      </div>

      <Show when={props.article.topZaps.length > 0}>
        <div class={styles.zaps}>
          <NoteTopZapsCompact
            note={props.article}
            action={() => {}}
            topZaps={props.article.topZaps}
            topZapLimit={4}
          />
        </div>
      </Show>

      <div class={styles.footer}>
        <ArticleFooter
          note={props.article}
          state={reactionsState}
          updateState={updateReactionsState}
          customZapInfo={customZapInfo()}
          onZapAnim={addTopZapFeed}
        />
      </div>

    </A>
  );
}

export default hookForDev(ArticlePreview);
