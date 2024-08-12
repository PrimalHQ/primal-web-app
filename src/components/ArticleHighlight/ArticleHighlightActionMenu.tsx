import { A } from '@solidjs/router';
import { nip19 } from 'nostr-tools';
import { batch, Component, createEffect, For, JSXElement, Match, onMount, Show, Switch } from 'solid-js';
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
  onComment?: (event: NostrRelaySignedEvent) => void,
  onCopy?: (id: string) => void,
  onQuote?: (event: NostrRelaySignedEvent) => void,
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

  const onNewHighlight = async (e: MouseEvent | undefined, then = props.onCreate) => {
    e && e.preventDefault();
    e && e.stopPropagation();

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

    if (success && note && then) {
      then(note)
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
    if (props.highlight === 'NEW_HIGHLIGHT') {
      onNewHighlight(undefined, (note: NostrRelaySignedEvent) => {
        props.onComment && props.onComment(note);
      });
      return;
    }
    props.onComment && props.onComment(props.highlight);
  }

  const onQuote = () => {
    if (!account || !account?.hasPublicKey()) {
      return;
    }

    if (props.highlight === 'NEW_HIGHLIGHT') {
      onNewHighlight(undefined, (note: NostrRelaySignedEvent) => {
        const highlightEvent = nip19.neventEncode({
          id: note.id,
          relays: account.activeRelays.map(r => r.url),
          author: note.pubkey,
          kind: Kind.Highlight,
        });

        account?.actions?.quoteNote(`nostr:${highlightEvent} nostr:${props.article.naddr}`);
        account?.actions?.showNewNoteForm();
        props.onQuote && props.onQuote(note);

      });
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
    props.onQuote && props.onQuote(props.highlight);

  }

  const onCopy = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (document.getSelection()?.empty) {  // Chrome
      document.getSelection()?.empty();
    } else if (document.getSelection()?.removeAllRanges) {  // Firefox
      document.getSelection()?.removeAllRanges();
    }

    navigator.clipboard.writeText(props.text);

    props.onCopy && props.onCopy(props.highlight.id);
  }

  return (
    <div
      class={styles.articleActionMenu}
      style={`top: ${topP()}px; left: ${leftP()}px;`}
    >
      <Switch>
        <Match when={props.highlight === 'NEW_HIGHLIGHT'}>
          <button
            data-highlight-menu-option="highlight"
            onMouseDown={onNewHighlight}
          >
            <div class={styles.iconHighlight}></div>
            <div class={styles.iconCaption}>Highlight</div>
          </button>
        </Match>

        <Match when={props.highlight.pubkey === account?.publicKey}>
          <button
            data-highlight-menu-option="remove"
            onMouseDown={onRemoveHighlight}
          >
            <div class={styles.iconHighlightRemove}></div>
            <div class={styles.iconCaption}>Remove</div>
          </button>
        </Match>
      </Switch>
      <button
        data-highlight-menu-option="quote"
        onMouseDown={onQuote}
      >
        <div class={styles.iconHighlightQuote}></div>
        <div class={styles.iconCaption}>Quote</div>
      </button>
      <button
        data-highlight-menu-option="comment"
        onMouseDown={onComment}
      >
        <div class={styles.iconHighlightComment}></div>
        <div class={styles.iconCaption}>Comment</div>
      </button>
      <button
        onMouseDown={onCopy}
        data-highlight-menu-option="copy"
      >
        <div class={styles.iconHighlightCopy}></div>
        <div class={styles.iconCaption}>Copy</div>
      </button>
    </div>
  );
}

export default hookForDev(ArticleHighlightActionMenu);
