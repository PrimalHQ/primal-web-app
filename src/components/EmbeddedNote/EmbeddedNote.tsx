import { useIntl } from '@cookbook/solid-intl';
// import { A } from '@solidjs/router';
import { nip19 } from '../../lib/nTools';
import { batch, Component, createMemo, JSXElement, Show } from 'solid-js';
import { createStore } from 'solid-js/store';
import { useAccountContext } from '../../contexts/AccountContext';
import { CustomZapInfo, useAppContext } from '../../contexts/AppContext';
import { useMediaContext } from '../../contexts/MediaContext';
import { useThreadContext } from '../../contexts/ThreadContext';
import { date } from '../../lib/dates';
import { trimVerification } from '../../lib/profile';
import { nip05Verification, userName } from '../../stores/profile';
import { note as t } from '../../translations';
import { PrimalNote, PrimalUser, ZapOption } from '../../types/primal';
import Avatar from '../Avatar/Avatar';
import { NoteReactionsState } from '../Note/Note';
import NoteFooter from '../Note/NoteFooter/NoteFooter';
import ParsedNote from '../ParsedNote/ParsedNote';
import VerificationCheck from '../VerificationCheck/VerificationCheck';

import styles from './EmbeddedNote.module.scss';
import { neventEncode } from 'nostr-tools/lib/types/nip19';
import { TranslatorProvider } from '../../contexts/TranslatorContext';

export type EmbeddedNoteProps = {
  note: PrimalNote | undefined,
  mentionedUsers?: Record<string, PrimalUser>,
  includeEmbeds?: boolean,
  isLast?: boolean,
  alternativeBackground?: boolean,
  class?: string,
  footerSize?: 'xwide' | 'wide' | 'normal' | 'compact' | 'short' | 'mini',
  hideFooter?: boolean,
  embedLevel?: number,
  rootNote?: PrimalNote,
  noLinks?: 'text' | 'links',
  noPlaceholders?: boolean,
  noLightbox?: boolean,
};

export const renderEmbeddedNote = (props: EmbeddedNoteProps) => (
  <div>
    <TranslatorProvider>
      <EmbeddedNote {...props} />
    </TranslatorProvider>
  </div> as HTMLDivElement
  ).innerHTML;

const EmbeddedNote: Component<EmbeddedNoteProps> = (props) => {

  const threadContext = useThreadContext();
  const app = useAppContext();
  const account = useAccountContext();

  let noteContent: HTMLDivElement | undefined;

  const [reactionsState, updateReactionsState] = createStore<NoteReactionsState>({
    likes: props.note?.post.likes || 0,
    liked: props.note?.post.noteActions?.liked || false,
    reposts: props.note?.post.reposts || 0,
    reposted: props.note?.post.noteActions?.reposted || false,
    replies: props.note?.post.replies || 0,
    replied: props.note?.post.noteActions?.replied || false,
    zapCount: props.note?.post.zaps || 0,
    satsZapped: props.note?.post.satszapped || 0,
    zapped: props.note?.post.noteActions?.zapped || false,
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

  // @ts-ignore
  const noteId = () => {
    const note = props.note;
    if (!note) return '';

    try {
      return note.noteIdShort;
    } catch (e) {
      return '';
    }
  }

  const navToThread = () => {
    threadContext?.actions.setPrimaryNote(props.note);
  };

  const verification = createMemo(() => {
    return trimVerification(props.note?.user?.nip05);
  });

  const klass = () => {
    let k = styles.mentionedNote;
    k += ' embeddedNote';
    if (props.isLast) k += ' noBottomMargin';
    if (props.alternativeBackground) k += ` ${styles.altBack}`;
    if ((props.embedLevel || 0) > 0) k += ` ${styles.embededContentWrapper}`
    if (props.class) k += ` ${props.class}`;

    return k;
  }

  const wrapper = (children: JSXElement) => {
    if (props.includeEmbeds) {
      return (
        <div
          class={klass()}
          data-event={props.note?.post.id}
          data-event-bech32={noteId()}
        >
          {children}
        </div>
      );
    }

    return (
      <a
        href={`/e/${noteId()}`}
        class={klass()}
        onClick={() => navToThread()}
        data-event={props.note?.post.id}
        data-event-bech32={noteId()}
      >
        {children}
      </a>
    );
  };

  const onConfirmZap = (zapOption: ZapOption) => {
    app?.actions.closeCustomZapModal();
    batch(() => {
      updateReactionsState('zappedAmount', () => zapOption.amount || 0);
      updateReactionsState('satsZapped', (z) => z + (zapOption.amount || 0));
      updateReactionsState('zapped', () => true);
      updateReactionsState('showZapAnim', () => true)
    });

    // addTopZap(zapOption);
    // addTopZapFeed(zapOption)
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
    const note = props.note;
    if (!note) return;

    app?.actions.closeCustomZapModal();
    app?.actions.resetCustomZap();
    batch(() => {
      updateReactionsState('zappedAmount', () => -(zapOption.amount || 0));
      updateReactionsState('satsZapped', (z) => z - (zapOption.amount || 0));
      updateReactionsState('isZapping', () => false);
      updateReactionsState('showZapAnim', () => false);
      updateReactionsState('hideZapIcon', () => false);
      updateReactionsState('zapped', () => note.post.noteActions.zapped);
    });

    // removeTopZap(zapOption);
    // removeTopZapFeed(zapOption);
  };

  const onCancelZap = (zapOption: ZapOption) => {
    const note = props.note;
    if (!note) return;

    app?.actions.closeCustomZapModal();
    app?.actions.resetCustomZap();
    batch(() => {
      updateReactionsState('zappedAmount', () => -(zapOption.amount || 0));
      updateReactionsState('satsZapped', (z) => z - (zapOption.amount || 0));
      updateReactionsState('isZapping', () => false);
      updateReactionsState('showZapAnim', () => false);
      updateReactionsState('hideZapIcon', () => false);
      updateReactionsState('zapped', () => note.post.noteActions.zapped);
    });

    // removeTopZap(zapOption);
    // removeTopZapFeed(zapOption);
  };

  const customZapInfo: () => CustomZapInfo = () => ({
    note: props.note,
    onConfirm: onConfirmZap,
    onSuccess: onSuccessZap,
    onFail: onFailZap,
    onCancel: onCancelZap,
  });

  return wrapper(
    <>
      <div class={styles.mentionedNoteHeader}>
        <Avatar
          user={props.note?.user}
          size="xxs"
        />
        <span class={styles.postInfo}>
          <span class={styles.userInfo}>
            <Show
              when={props.note?.user.nip05}
              fallback={
                <span class={styles.userName}>
                  {userName(props.note?.user)}
                </span>
              }
            >
              <span class={styles.userName}>
                {userName(props.note?.user)}
              </span>
              <VerificationCheck user={props.note?.user} />
              <span
                class={styles.verifiedBy}
                title={props.note?.user.nip05}
              >
                {nip05Verification(props.note?.user)}
              </span>
            </Show>
          </span>

          <span
            class={styles.time}
            title={date(props.note?.post.created_at || 0).date.toLocaleString()}
          >
            {date(props.note?.post.created_at || 0).label}
          </span>
        </span>
      </div>
      <div class={styles.noteContent} ref={noteContent}>
        <ParsedNote
          note={props.note}
          shorten={true}
          isEmbeded={true}
          embedLevel={(props.embedLevel || 0)+1}
          rootNote={props.rootNote}
          width={noteContent?.getBoundingClientRect().width}
          margins={2}
          noLinks={props.noLinks}
          noPlaceholders={props.noPlaceholders}
          noLightbox={props.noLightbox}
        />
      </div>
      <div class={styles.footer}>
        <Show when={!props.hideFooter}>
          <NoteFooter
            note={props.note}
            state={reactionsState}
            size={props.footerSize || 'compact'}
            updateState={updateReactionsState}
            customZapInfo={customZapInfo()}
          />
        </Show>
      </div>
    </>
  );
}

export default EmbeddedNote;
