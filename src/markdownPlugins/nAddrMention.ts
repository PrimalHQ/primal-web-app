
import { Editor, mergeAttributes, Node, nodePasteRule, NodeViewRenderer, Range } from '@tiptap/core';
import type { Node as ProsemirrorNode } from '@tiptap/pm/model';
import type { MarkdownSerializerState } from 'prosemirror-markdown';
import { nip19 } from '../lib/nTools';
import { PrimalNote, PrimalZap } from '../types/primal';
import { APP_ID } from '../App';
import { fetchArticles, fetchNotes } from '../handleNotes';
import { Kind } from '../constants';
import { renderArticlePreview } from '../components/ArticlePreview/ArticlePreview';
import { setReadMentions } from '../pages/ReadsEditor';

export const findMissingEvent = async (naddr: string, editor: Editor) => {
  if (!naddr) return;
  const decode = nip19.decode(naddr);

  let identifier = '';
  let kind = Kind.LongForm;
  let pubkey = '';

  if (decode.type === 'naddr') {
    identifier = decode.data.pubkey
    kind = decode.data.kind || Kind.LongForm;
    pubkey = decode.data.pubkey;
  }

  if (identifier.length === 0) return;

  const events = await fetchArticles([naddr], `reads_missing_${naddr}_${APP_ID}`);

  const mentions = document.querySelectorAll(`div[data-type=${decode.type}][data-bech32=${naddr}]`);

  if (mentions.length > 0 && events[0]) {
    setReadMentions('reads', () => ({ [naddr]: { ...events[0] } }));
    const el = renderArticlePreview({
      article: events[0],
      bordered: true,
      hideFooter: true,
      noLinks: true,
    })

    mentions.forEach(mention => {
      mention.classList.remove('naddr-node');
      mention.innerHTML = el;
    })
  }

  // Move cursor one space to the right to avoid overwriting the note.
  const el = document.querySelector('.tiptap.ProseMirror');
  el?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));

  setTimeout(() => {
    editor.chain().focus().enter().run();
  }, 100)
}

export type NAddrAttributes = {
  type: 'naddr'
  bech32: string
  identifier: string
  pubkey: string
  kind: number
  relays: string[]
}

export const makeNAddrAttrs = (
  input: string,
  event: PrimalNote | PrimalZap | undefined,
  options?: any,
): NAddrAttributes => {
  const bech32 = input.replace(/^nostr:/, '')
  const { type, data } = nip19.decode(bech32)
  const relays: string[] = [];

  switch (type) {
    case 'naddr':
      return { type, bech32, relays, identifier: data.identifier, pubkey: data.pubkey, kind: data.kind }
    default:
      throw new Error(`Invalid nostr entity type for this context: ${type}`)
  }
}

export const makeNAddrNode = (bech32: string, options?: any) => ({
  type: 'naddr',
  attrs: makeNAddrAttrs(bech32, options),
})

export const NADDR_REGEX = /(?<![\w./:?=])(nostr:)?(naddr1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]+)/g

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    naddr: {
      applyNAddrPasteRules: (text: string) => ReturnType,
      insertNAddr: (options: { naddr: string }) => ReturnType,
      insertNAddrAt: (range: Range, options: { naddr: string }) => ReturnType
    }
  }
}

export const NAddrExtension = Node.create({
  name: 'naddr',
  group: 'block',
  selectable: true,
  draggable: true,
  priority: 1000,

  addNodeView(): NodeViewRenderer {
    return ({ node, editor, getPos, HTMLAttributes, decorations, extension }) => {
      const dom = document.createElement('div');
      dom.classList.add('naddr-node');

      // Set attributes on the main div
      Object.entries(node.attrs).forEach(([attr, value]) => {
        dom.setAttribute(`data-${attr}`, String(value));
      });

      // Set the text content
      dom.innerText = node.attrs.bech32;

      // Append paragraph to the main div
      // dom.appendChild(contentP);

      findMissingEvent(node.attrs.bech32, editor);

      return {
        dom,
        // Optionally add update method if needed
        update: (newNode) => {
          if (newNode.type.name !== this.name) return false;

          // Update attributes
          Object.entries(newNode.attrs).forEach(([attr, value]) => {
            dom.setAttribute(`data-${attr}`, String(value));
          });

          // Update content
          dom.innerText = newNode.attrs.bech32;

          return true;
        }
      }
    }
  },

  addStorage() {
    return {
      markdown: {
        serialize(state: MarkdownSerializerState, node: ProsemirrorNode) {
          state.write('nostr:' + node.attrs.bech32 + '\n')
        },
        parse: {},
      },
    }
  },

  addAttributes() {
    return {
      type: { default: null },
      id: { default: null },
      kind: { default: null },
      author: { default: null },
      bech32: { default: null },
      relays: { default: [] },
    }
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': this.name })]
  },

  renderText(props) {
    return 'nostr:' + props.node.attrs.bech32
  },

  parseHTML() {
    return [
      { tag: `div[data-type="${this.name}"]` },
      { tag: `div.nevent-node` }
    ]
  },

  addCommands() {
    return {
      applyNAddrPasteRules:
        (text) =>
        ({ tr, state, dispatch }) => {
          const matches = Array.from(text.matchAll(NADDR_REGEX));

          if (matches.length === 0) return false;

          if (dispatch) {
            matches
              .sort((a, b) => (b.index || 0) - (a.index || 0))
              .forEach(match => {
                try {
                  const attrs = makeNAddrAttrs(match[2], this.options);
                  const node = state.schema.nodes[this.name].create(attrs);

                  const start = match.index || 0;
                  const end = start + match[0].length + 1;

                  tr.replaceWith(start, end, node);
                } catch (e) {
                  console.error('Error applying Nostr regex conversion:', e);
                }
              });
          }

          return true;
        },
      insertNAddr:
        ({ naddr }) =>
        ({ commands }) =>
          commands.insertContent(makeNAddrNode(naddr, this.options), { updateSelection: false }),
      insertNAddrAt:
        (range, { naddr }) =>
        ({ commands }) =>
          commands.insertContentAt(range, makeNAddrNode(naddr, this.options), { updateSelection: false }),
    }
  },


  addPasteRules() {
    return [
      nodePasteRule({
        type: this.type,
        getAttributes: (match) => {
          const bech32 = match.data?.bech32;
          if (!bech32) return {};

          try {
            return makeNAddrAttrs(bech32, this.options);
          } catch (e) {
            console.error('Error in paste rule attributes:', e);
            return {};
          }
        },
        find: (text) => {
          const matches = [];
          const regex = new RegExp(NADDR_REGEX); // Create new instance for safety
          let match;

          while ((match = regex.exec(text)) !== null) {
            try {
              matches.push({
                index: match.index,
                text: match[0],
                replaceWith: match[0], // Keep full match for conversion
                match,
                data: makeNAddrAttrs(match[2], this.options)
              });
            } catch (e) {
              console.error('ERROR in paste rule matching:', e);
            }
          }

          return matches;
        },
      }),
    ]
  },

  // addPasteRules() {
  //   return [
  //     nodePasteRule({
  //       type: this.type,
  //       getAttributes: (match) => match.data,
  //       find: (text) => {
  //         const matches = []

  //         for (const match of text.matchAll(NADDR_REGEX)) {
  //           try {
  //             matches.push(createPasteRuleMatch(match, makeNAddrAttrs(match[2], this.options)))
  //           } catch (e) {
  //             continue
  //           }
  //         }

  //         return matches
  //       },
  //     }),
  //   ]
  // },
})
