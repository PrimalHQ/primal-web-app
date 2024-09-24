import { A } from '@solidjs/router';
import { batch, Component, createEffect, Match, onMount, Show, Switch } from 'solid-js';
import { PrimalNote, TopZap, ZapOption } from '../../types/primal';
import ParsedNote from '../ParsedNote/ParsedNote';
import NoteFooter from './NoteFooter/NoteFooter';

import styles from './Note.module.scss';
import { useThreadContext } from '../../contexts/ThreadContext';
import { useIntl } from '@cookbook/solid-intl';
import { hookForDev } from '../../lib/devTools';
import Avatar from '../Avatar/Avatar';
import NoteAuthorInfo from './NoteAuthorInfo';
import NoteRepostHeader from './NoteRepostHeader';
import NoteReplyToHeader from './NoteReplyToHeader';
import NoteHeader from './NoteHeader/NoteHeader';
import { createStore } from 'solid-js/store';
import { CustomZapInfo, useAppContext } from '../../contexts/AppContext';
import NoteContextTrigger from './NoteContextTrigger';
import { date, veryLongDate } from '../../lib/dates';
import { useAccountContext } from '../../contexts/AccountContext';
import { uuidv4 } from '../../utils';
import NoteTopZaps from './NoteTopZaps';
import NoteTopZapsCompact from './NoteTopZapsCompact';
import { addrRegex, addrRegexG, imageRegex, imageRegexEnd, imageRegexG, linebreakRegex, noteRegex, noteRegexLocal, profileRegexG, urlRegex, urlRegexG } from '../../constants';

export type NoteReactionsState = {
  likes: number,
  liked: boolean,
  reposts: number,
  reposted: boolean,
  replies: number,
  replied: boolean,
  zapCount: number,
  satsZapped: number,
  zappedAmount: number,
  zapped: boolean,
  zappedNow: boolean,
  isZapping: boolean,
  showZapAnim: boolean,
  hideZapIcon: boolean,
  moreZapsAvailable: boolean,
  isRepostMenuVisible: boolean,
  topZaps: TopZap[],
  topZapsFeed: TopZap[],
  quoteCount: number,
};

const Note: Component<{
  note: PrimalNote,
  id?: string,
  parent?: boolean,
  shorten?: boolean,
  noteType?: 'feed' | 'primary' | 'notification' | 'reaction' | 'thread'
  onClick?: () => void,
  quoteCount?: number,
  size?: 'xwide' | 'wide' | 'normal' | 'short',
}> = (props) => {

  const threadContext = useThreadContext();
  const app = useAppContext();
  const account = useAccountContext();
  const intl = useIntl();

  createEffect(() => {
    if (props.quoteCount) {
      updateReactionsState('quoteCount', () => props.quoteCount || 0);
    }
  })

  const noteType = () => props.noteType || 'feed';

  const repost = () => props.note.repost;

  const navToThread = (note: PrimalNote) => {
    props.onClick && props.onClick();
    threadContext?.actions.setPrimaryNote(note);
  };

  const [reactionsState, updateReactionsState] = createStore<NoteReactionsState>({
    likes: props.note.post.likes,
    liked: props.note.post.noteActions.liked,
    reposts: props.note.post.reposts,
    reposted: props.note.post.noteActions.reposted,
    replies: props.note.post.replies,
    replied: props.note.post.noteActions.replied,
    zapCount: props.note.post.zaps,
    satsZapped: props.note.post.satszapped,
    zapped: props.note.post.noteActions.zapped,
    zappedAmount: 0,
    zappedNow: false,
    isZapping: false,
    showZapAnim: false,
    hideZapIcon: false,
    moreZapsAvailable: false,
    isRepostMenuVisible: false,
    topZaps: [],
    topZapsFeed: [],
    quoteCount: props.quoteCount || 0,
  });

  let noteContextMenu: HTMLDivElement | undefined;

  let latestTopZap: string = '';
  let latestTopZapFeed: string = '';

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

  onMount(() => {
    updateReactionsState('topZapsFeed', () => [ ...(props.note.topZaps || [])]);
  })

  const addTopZapFeed = (zapOption: ZapOption) => {
    const pubkey = account?.publicKey;

    if (!pubkey) return;

    const oldZaps = [ ...reactionsState.topZapsFeed ];

    latestTopZapFeed = uuidv4() as string;

    const newZap = {
      amount: zapOption.amount || 0,
      message: zapOption.message || '',
      pubkey,
      eventId: props.note.post.id,
      id: latestTopZapFeed,
    };

    const zaps = [ ...oldZaps, { ...newZap }].sort((a, b) => b.amount - a.amount).slice(0, 4);
    updateReactionsState('topZapsFeed', () => [...zaps]);
  }

  const removeTopZapFeed = (zapOption: ZapOption) => {
    const zaps = reactionsState.topZapsFeed.filter(z => z.id !== latestTopZapFeed);
    updateReactionsState('topZapsFeed', () => [...zaps]);
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
      eventId: props.note.post.id,
      id: latestTopZap,
    };

    if (!threadContext?.users.find((u) => u.pubkey === pubkey)) {
      threadContext?.actions.fetchUsers([pubkey])
    }

    const zaps = [ ...oldZaps, { ...newZap }].sort((a, b) => b.amount - a.amount);
    updateReactionsState('topZaps', () => [...zaps]);
  };

  const removeTopZap = (zapOption: ZapOption) => {
    const zaps = reactionsState.topZaps.filter(z => z.id !== latestTopZap);
    updateReactionsState('topZaps', () => [...zaps]);
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
      updateReactionsState('zapped', () => props.note.post.noteActions.zapped);
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
      updateReactionsState('zapped', () => props.note.post.noteActions.zapped);
    });

    removeTopZap(zapOption);
    removeTopZapFeed(zapOption);
  };

  const customZapInfo: () => CustomZapInfo = () => ({
    note: props.note,
    onConfirm: onConfirmZap,
    onSuccess: onSuccessZap,
    onFail: onFailZap,
    onCancel: onCancelZap,
  });

  const openReactionModal = (openOn = 'default') =>  {
    app?.actions.openReactionModal(props.note.post.id, {
      likes: reactionsState.likes,
      zaps: reactionsState.zapCount,
      reposts: reactionsState.reposts,
      quotes: reactionsState.quoteCount,
      openOn,
    });
  };

  const onContextMenuTrigger = () => {
    app?.actions.openContextMenu(
      props.note,
      noteContextMenu?.getBoundingClientRect(),
      () => {
        app?.actions.openCustomZapModal(customZapInfo());
      },
      openReactionModal,
    );
  }

  const reactionSum = () => {
    const { likes, zapCount, reposts, quoteCount } = reactionsState;

    return (likes || 0) + (zapCount || 0) + (reposts || 0) + (quoteCount || 0);
  };

  createEffect(() => {
    updateReactionsState('topZaps', () =>  [ ...(threadContext?.topZaps[props.note.post.id] || []) ]);
  });

  const size = () => props.size ?? 'normal';

  const bigMessageFont = () => {
    // const hasImage = imageRegexG.test(props.note.content);
    // const hasNoteMention = noteRegex.test(props.note.content);
    // const hasAddrMention = addrRegexG.test(props.note.content);
    // const hasLinks = urlRegexG.test(props.note.content);

    const lnCount = props.note.content.match(linebreakRegex)?.length || 0;

    if (lnCount > 0) return false;

    let strippedContent = props.note.content
      .replace(imageRegexG, '__PRIMAL_REPLACEMENT__')
      .replace(noteRegex, '__PRIMAL_REPLACEMENT__')
      .replace(addrRegexG, '__PRIMAL_REPLACEMENT__')
      // .replace(profileRegexG, '__PRIMAL_REPLACEMENT__')
      .replace(urlRegexG, '__PRIMAL_REPLACEMENT__')
      .trim();

    const splitContent = strippedContent.replace(/\s+/g, '').split('__PRIMAL_REPLACEMENT__');

    if (splitContent.length > 1 && splitContent[1].length > 0) return false;

    strippedContent.replaceAll('__PRIMAL_REPLACEMENT__', '');

    const isShort = strippedContent.length < 42;
    const isReply = props.note.replyTo;

    // return !hasImage && !hasLinks && !hasNoteMention && !hasAddrMention && isShort;
    return isShort && !isReply;
  }

  return (
    <Switch>
      <Match when={noteType() === 'notification'}>
        <A
          id={props.id}
          class={styles.noteNotificationLink}
          href={`/e/${props.note?.post.noteId}`}
          onClick={() => navToThread(props.note)}
          data-event={props.note.post.id}
          data-event-bech32={props.note.post.noteId}
        >
          <div class={styles.noteNotifications}>
            <div class={styles.content}>
              <div class={styles.message}>
                <ParsedNote
                  note={props.note}
                  shorten={true}
                />
              </div>

              <div class={styles.footer}>
                <NoteFooter
                  note={props.note}
                  state={reactionsState}
                  updateState={updateReactionsState}
                  customZapInfo={customZapInfo()}
                  size="short"
                />
              </div>
            </div>
          </div>
        </A>
      </Match>

      <Match when={noteType() === 'primary'}>
        <div
          id={props.id}
          class={styles.notePrimary}
          data-event={props.note.post.id}
          data-event-bech32={props.note.post.noteId}
        >
          <div class={styles.border}></div>

          <div class={styles.header}>
            <NoteHeader note={props.note} primary={true} />
          </div>

          <div class={styles.upRightFloater}>
            <NoteContextTrigger
              ref={noteContextMenu}
              onClick={onContextMenuTrigger}
            />
          </div>

          <div class={styles.content}>

          <div class={`${styles.message} ${bigMessageFont() ? styles.bigFont : ''}`}>
              <ParsedNote
                note={props.note}
                width={Math.min(640, window.innerWidth)}
                margins={12}
              />
            </div>

            <div class={styles.topZaps}>
              <NoteTopZaps
                topZaps={reactionsState.topZaps}
                zapCount={reactionsState.zapCount}
                action={() => openReactionModal('zaps')}
                doZap={() => app?.actions.openCustomZapModal(customZapInfo())}
              />
            </div>

            <div
              class={styles.time}
              title={date(props.note.post?.created_at).date.toLocaleString()}
            >
              <span>
                {veryLongDate(props.note.post?.created_at).replace('at', '·')}
              </span>
              <button
                class={styles.reactSummary}
                onClick={() => openReactionModal()}
              >
                <span class={styles.number}>{reactionSum()}</span> Reactions
              </button>
            </div>

            <div class={styles.footer}>
              <NoteFooter
                note={props.note}
                state={reactionsState}
                updateState={updateReactionsState}
                customZapInfo={customZapInfo()}
                size="wide"
                large={true}
                onZapAnim={addTopZap}
              />
            </div>
          </div>
        </div>
      </Match>

      <Match when={noteType() === 'feed'}>
        <A
          id={props.id}
          class={`${styles.note} ${props.parent ? styles.parent : ''}`}
          href={`/e/${props.note?.post.noteId}`}
          onClick={() => navToThread(props.note)}
          data-event={props.note.post.id}
          data-event-bech32={props.note.post.noteId}
          draggable={false}
        >
          <div class={styles.header}>
            <Show when={repost()}>
              <NoteRepostHeader note={props.note} />
            </Show>
          </div>
          <div class={styles.userHeader}>
            <A href={`/p/${props.note.user.npub}`}>
              <Avatar user={props.note.user} size="xs" />
            </A>

            <NoteAuthorInfo
              author={props.note.user}
              time={props.note.post.created_at}
            />

            <div class={styles.upRightFloater}>
              <NoteContextTrigger
                ref={noteContextMenu}
                onClick={onContextMenuTrigger}
              />
            </div>
          </div>

          <NoteReplyToHeader note={props.note} />

          <div class={`${styles.message} ${bigMessageFont() ? styles.bigFont : ''}`}>
            <ParsedNote
              note={props.note}
              shorten={props.shorten}
              width={Math.min(640, window.innerWidth - 72)}
              margins={20}
            />
          </div>

          <NoteTopZapsCompact
            note={props.note}
            action={() => openReactionModal('zaps')}
            topZaps={reactionsState.topZapsFeed}
            topZapLimit={4}
          />

          <NoteFooter
            note={props.note}
            state={reactionsState}
            updateState={updateReactionsState}
            customZapInfo={customZapInfo()}
            onZapAnim={addTopZapFeed}
            size={size()}
          />
        </A>
      </Match>

      <Match when={noteType() === 'thread'}>
        <A
          id={props.id}
          class={`${styles.noteThread} ${props.parent ? styles.parent : ''}`}
          href={`/e/${props.note?.post.noteId}`}
          onClick={() => navToThread(props.note)}
          data-event={props.note.post.id}
          data-event-bech32={props.note.post.noteId}
          draggable={false}
        >
          <div class={styles.header}>
            <Show when={repost()}>
              <NoteRepostHeader note={props.note} />
            </Show>
          </div>
          <div class={styles.content}>
            <div class={styles.leftSide}>
              <A href={`/p/${props.note.user.npub}`}>
                <Avatar user={props.note.user} size="vs" />
              </A>
              <Show
                when={props.parent}
              >
                <div class={styles.ancestorLine}></div>
              </Show>
            </div>

            <div class={styles.rightSide}>
              <NoteAuthorInfo
                author={props.note.user}
                time={props.note.post.created_at}
              />

              <div class={styles.upRightFloater}>
                <NoteContextTrigger
                  ref={noteContextMenu}
                  onClick={onContextMenuTrigger}
                />
              </div>

              <NoteReplyToHeader note={props.note} />

              <div class={styles.message}>
                <ParsedNote
                  note={props.note}
                  shorten={props.shorten}
                  width={Math.min(566, window.innerWidth - 72)}
                  margins={1}
                  footerSize="short"
                />
              </div>

              <NoteTopZapsCompact
                note={props.note}
                action={() => openReactionModal('zaps')}
                topZaps={reactionsState.topZapsFeed}
                topZapLimit={4}
              />

              <div class={styles.footer}>
                <NoteFooter
                  note={props.note}
                  state={reactionsState}
                  updateState={updateReactionsState}
                  customZapInfo={customZapInfo()}
                  onZapAnim={addTopZapFeed}
                  size="short"
                />
              </div>
            </div>
          </div>
        </A>
      </Match>

      <Match when={noteType() === 'reaction'}>
        <A
          id={props.id}
          class={`${styles.note} ${styles.reactionNote}`}
          href={`/e/${props.note?.post.noteId}`}
          onClick={() => navToThread(props.note)}
          data-event={props.note.post.id}
          data-event-bech32={props.note.post.noteId}
          draggable={false}
        >
          <div class={styles.content}>
            <div class={styles.leftSide}>
              <A href={`/p/${props.note.user.npub}`}>
                <Avatar user={props.note.user} size="vs" />
              </A>
              <Show
                when={props.parent}
              >
                <div class={styles.ancestorLine}></div>
              </Show>
            </div>

            <div class={styles.rightSide}>
              <NoteAuthorInfo
                author={props.note.user}
                time={props.note.post.created_at}
              />

              <NoteReplyToHeader note={props.note} />

              <div class={styles.message}>
                <ParsedNote
                  note={props.note}
                  shorten={props.shorten}
                  width={Math.min(528, window.innerWidth - 72)}
                  margins={12}
                  noLightbox={true}
                  altEmbeds={true}
                />
              </div>
            </div>
          </div>
        </A>
      </Match>
    </Switch>
  );
}

export default hookForDev(Note);
