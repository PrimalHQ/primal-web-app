import { nip19 } from 'nostr-tools';
import { Component, Match, Show, Switch } from 'solid-js';
import { Kind } from '../../constants';
import { hookForDev } from '../../lib/devTools';
import { removeHighlight, sendHighlight } from '../../lib/highlights';
import { generatePrivateKey } from '../../lib/nTools';
import { NostrRelaySignedEvent, PrimalArticle, } from '../../types/primal';

import styles from './ArticleHighlight.module.scss';
import { accountStore, quoteNote, showNewNoteForm } from '../../stores/accountStore';

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
  selection?: Selection,
  article: PrimalArticle,
  onCreate?: (event: NostrRelaySignedEvent, replaceId?: string) => void,
  onRemove?: (id: string) => void,
  onComment?: (event: NostrRelaySignedEvent) => void,
  onCopy?: (id: string) => void,
  onQuote?: (event: NostrRelaySignedEvent) => void,
}> = (props) => {

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

  const generateContentAndContext: (selection?: Selection) => { content: string, context: string} = (selection) => {
    let content = props.text;
    let context = props.context;

    if (selection) {
      const el = selection.getRangeAt(0).cloneContents();

      for (let i = 0; i<el.childNodes.length;i++) {
        const node = el.childNodes[i];

        if (node && node.nodeName === 'A') {
          const href = (node as HTMLAnchorElement).getAttribute('href');

          if (href?.startsWith('nostr:')) {
            let textNode = document.createTextNode(href)
            node.replaceWith(textNode)
          }
        }
      }

      content = el.textContent || content;

      const elPar = selection.anchorNode?.parentNode?.cloneNode(true);

      if (elPar) {
        for (let i = 0; i<elPar.childNodes.length;i++) {
          const node = elPar.childNodes[i];

          if (node && node.nodeName === 'A') {
            const href = (node as HTMLAnchorElement).getAttribute('href');

            if (href?.startsWith('nostr:')) {
              let textNode = document.createTextNode(href)
              node.replaceWith(textNode)
            }
          }
        }

        context = elPar.textContent || context;
      }
    }

    return { content, context };
  }

  const createHighlight = async (content?: string, context?: string, selection?: Selection) => {
    const generated = generateContentAndContext(selection);

    return await sendHighlight(
      content || generated.content,
      context || generated.context,
      props.article.pubkey,
      `${Kind.LongForm}:${props.article.pubkey}:${(props.article.msg.tags.find(t => t[0] === 'd') || [])[1]}`,
      accountStore.proxyThroughPrimal,
      accountStore.activeRelays,
      accountStore.relaySettings,
    );
  };

  const onNewHighlight = async (e: MouseEvent | undefined, then = props.onCreate) => {
    e && e.preventDefault();
    e && e.stopPropagation();

    if (!accountStore.publicKey) return;

    const naddr = `${Kind.LongForm}:${props.article.pubkey}:${(props.article.msg.tags.find(t => t[0] === 'd') || [])[1]}`;

    if (props.highlight === 'NEW_HIGHLIGHT') {
      const { content, context } = generateContentAndContext(props.selection);

      const highlight = {
        id: `${generatePrivateKey()}`,
        kind: Kind.Highlight,
        context,
        content,
        tags: [
          ['p', props.article.pubkey],
          ['p', accountStore.publicKey],
          ['a', naddr],
          ['context', context],
        ],
        created_at: (new Date()).getTime() / 1_000,
        sig: 'UNSIGNED',
        pubkey: accountStore.publicKey,
      };

      then && then(highlight);

      const { success, note } = await createHighlight(content, context, props.selection);

      if (success && note) {
        then && then(note, highlight.id)
      }

      if (!success) {
        props.onRemove && props.onRemove(highlight.id);
      }
    } else {
      const content = props.highlight.content;
      const context = (props.highlight.tags.find((t: string[]) => t[0] === 'context') || [])[1];

      const highlight = {
        id: `${generatePrivateKey()}`,
        kind: Kind.Highlight,
        context,
        content,
        tags: [ ...props.highlight.tags ],
        created_at: (new Date()).getTime() / 1_000,
        sig: 'UNSIGNED',
        pubkey: accountStore.publicKey,
      };

      then && then(highlight);

      const { success, note } = await createHighlight(content, context);

      if (success && note) {
        then && then(note, highlight.id)
      }

      if (!success) {
        props.onRemove && props.onRemove(highlight.id);
      }
    }
  }

  const onRemoveHighlight = async () => {
    if (!props.highlight || !accountStore.publicKey) return;

    if (props.highlight.pubkey !== accountStore.publicKey) return;

    const highlight = { ...props.highlight };

    props.onRemove && props.onRemove(props.highlight.id);

    const { success } = await removeHighlight(
      highlight.id,
      accountStore.proxyThroughPrimal,
      accountStore.activeRelays,
      accountStore.relaySettings
    );
  }

  const onComment = async () => {
    if (props.highlight === 'NEW_HIGHLIGHT') {
      const { success, note } = await createHighlight();
      success && note && props.onComment &&-props.onComment(note);
      return;
    }
    props.onComment && props.onComment(props.highlight);
  }

  const onQuote = async () => {
    if (!accountStore.publicKey) {
      return;
    }

    if (props.highlight === 'NEW_HIGHLIGHT') {

      const { success, note } = await createHighlight();

      if (!success || !note) return;

      const highlightId = nip19.neventEncode({
        id: note.id,
        relays: accountStore.activeRelays.map(r => r.url).slice(0,3),
        author: note.pubkey,
        kind: Kind.Highlight,
      });

      quoteNote(`nostr:${highlightId} nostr:${props.article.naddr}`);
      showNewNoteForm();
      props.onQuote && props.onQuote(note);

      return;
    }

    const highlightId = nip19.neventEncode({
      id: props.highlight.id,
      relays: accountStore.activeRelays.map(r => r.url).slice(0,3),
      author: props.highlight.pubkey,
      kind: Kind.Highlight,
    });

    quoteNote(`nostr:${highlightId} nostr:${props.article.naddr}`);
    showNewNoteForm();
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
        <Match when={accountStore.publicKey && props.highlight.pubkey === accountStore.publicKey}>
          <button
            data-highlight-menu-option="remove"
            onMouseDown={onRemoveHighlight}
          >
            <div class={styles.iconHighlightRemove}></div>
            <div class={styles.iconCaption}>Remove</div>
          </button>
        </Match>

        <Match when={accountStore.publicKey}>
          <button
            data-highlight-menu-option="highlight"
            onMouseDown={onNewHighlight}
          >
            <div class={styles.iconHighlight}></div>
            <div class={styles.iconCaption}>Highlight</div>
          </button>
        </Match>
      </Switch>
      <Show when={accountStore.publicKey}>
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
      </Show>
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
