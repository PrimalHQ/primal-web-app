import { A } from '@solidjs/router';
import { nip19 } from 'nostr-tools';
import { batch, Component, createEffect, For, JSXElement, onMount, Show } from 'solid-js';
import { createStore } from 'solid-js/store';
import { Portal } from 'solid-js/web';
import { Kind } from '../../constants';
import { useAccountContext } from '../../contexts/AccountContext';
import { CustomZapInfo, useAppContext } from '../../contexts/AppContext';
import { useThreadContext } from '../../contexts/ThreadContext';
import { shortDate } from '../../lib/dates';
import { hookForDev } from '../../lib/devTools';
import { removeHighlight, sendHighlight } from '../../lib/highlights';
import { userName } from '../../stores/profile';
import { NostrRelaySignedEvent, PrimalArticle, ZapOption } from '../../types/primal';
import { uuidv4 } from '../../utils';
import Avatar from '../Avatar/Avatar';
import { NoteReactionsState } from '../Note/Note';
import NoteContextTrigger from '../Note/NoteContextTrigger';
import ArticleFooter from '../Note/NoteFooter/ArticleFooter';
import NoteFooter from '../Note/NoteFooter/NoteFooter';
import NoteTopZaps from '../Note/NoteTopZaps';
import NoteTopZapsCompact from '../Note/NoteTopZapsCompact';
import VerificationCheck from '../VerificationCheck/VerificationCheck';

import styles from './ArticleHighlight.module.scss';

const topOffset = 64 + 8;

type Coord = {
  x: number;
  y: number;
};

const ArticleHighlightActionMenu: Component<{
  id?: string,
  highlight: any,
  position: Coord | null,
  text: string,
  context: string,
  article: PrimalArticle,
  onCreate?: (event: NostrRelaySignedEvent) => void,
  onRemove?: (id: string) => void,
  onComment?: (id: string) => void,
}> = (props) => {
  const account = useAccountContext();

  const topP = () => {
    return (props.position?.y || 0) - topOffset;
  };

  const leftP = () => {
    // @ts-ignore
    const offset = props.position?.x || 0;
    // @ts-ignore
    const width = 286;

    if (offset < width/2) {
      return offset;
    }

    if (offset + width > 640) {
      return 640 - width;
    }

    return offset;
  };

  const onNewHighlight = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!account) return;

    const { success, note } = await sendHighlight(
      props.text,
      props.context,
      props.article.pubkey,
      `${Kind.LongForm}:${props.article.pubkey}:${(props.article.msg.tags.find(t => t[0] === 'd') || [])[1]}`,
      account.proxyThroughPrimal,
      account.activeRelays,
      account.relaySettings,
    );

    if (success && note && props.onCreate) {
      props.onCreate(note)
    }
  }

  const onRemoveHighlight = async () => {
    if (!props.highlight || !account) return;

    if (props.highlight.pubkey !== account.publicKey) return;

    const { success } = await removeHighlight(
      props.highlight.id,
      account.proxyThroughPrimal,
      account.activeRelays, account?.relaySettings
    );

    if (success && props.onRemove) {
      props.onRemove(props.highlight.id)
    }
  }

  const onComment = () => {
    props.onComment && props.onComment(props.highlight.id);
  }

  const onQuote = () => {
    if (!account || !account?.hasPublicKey()) {
      return;
    }

    const highlightEvent = nip19.neventEncode({
      id: props.highlight.id,
      relays: account.activeRelays.map(r => r.url),
      author: props.highlight.pubkey,
      kind: Kind.Highlight,
    });

    account?.actions?.quoteNote(`nostr:${highlightEvent} nostr:${props.article.naddr}`);
    account?.actions?.showNewNoteForm();

  }

  const onCopy = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    navigator.clipboard.writeText(props.text);
  }

  return (
    <div
      class={styles.articleActionMenu}
      style={`top: ${topP()}px; left: ${leftP()}px;`}
    >
      <Show
        when={props.highlight === 'NEW_HIGHLIGHT'}
        fallback={
          <button
            data-highlight-menu-option="remove"
            onClick={onRemoveHighlight}
          >
            <div class={styles.iconHighlightRemove}></div>
            <div class={styles.iconCaption}>Remove</div>
          </button>
        }
      >
        <button
          data-highlight-menu-option="highlight"
          onClick={onNewHighlight}
        >
          <div class={styles.iconHighlight}></div>
          <div class={styles.iconCaption}>Highlight</div>
        </button>
      </Show>
      <button
        data-highlight-menu-option="quote"
        onClick={onQuote}
      >
        <div class={styles.iconHighlightQuote}></div>
        <div class={styles.iconCaption}>Quote</div>
      </button>
      <button
        data-highlight-menu-option="comment"
        onClick={onComment}
      >
        <div class={styles.iconHighlightComment}></div>
        <div class={styles.iconCaption}>Comment</div>
      </button>
      <button
        onClick={onCopy}
        data-highlight-menu-option="copy"
      >
        <div class={styles.iconHighlightCopy}></div>
        <div class={styles.iconCaption}>Copy</div>
      </button>
    </div>
  );
}

export default hookForDev(ArticleHighlightActionMenu);
