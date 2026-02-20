
import { Editor, InputRuleMatch, mergeAttributes, Node, nodePasteRule, NodeViewRenderer, Range } from '@tiptap/core';
import type { Node as ProsemirrorNode } from '@tiptap/pm/model';
import type { MarkdownSerializerState } from 'prosemirror-markdown';
import { nip19 } from '../lib/nTools';
import { PrimalNote, PrimalZap } from '../types/primal';
import { APP_ID } from '../App';
import { fetchNotes } from '../handleNotes';
import { renderEmbeddedNote } from '../components/EmbeddedNote/EmbeddedNote';
import { setReadMentions } from '../pages/ReadsEditor';

export const createInputRuleMatch = <T extends Record<string, unknown>>(
  match: RegExpMatchArray,
  data: T,
): InputRuleMatch => ({ index: match.index!, replaceWith: match[2], text: match[0], match, data })


export const findMissingEvent = async (nevent: string, editor: Editor) => {
  if (!nevent) return;
  const decode = nip19.decode(nevent);

  let id = '';

  if (decode.type === 'note') {
    id = decode.data;
  }

  if (decode.type === 'nevent') {
    id = decode.data.id;
  }

  if (id.length === 0) return;

  const events = await fetchNotes(undefined, [id], `event_missing_${nevent}${APP_ID}`);

  const mentions = document.querySelectorAll(`div[data-type=${decode.type}][data-bech32=${nevent}]`);

  if (mentions.length > 0 && events[0]) {
    setReadMentions('notes', () => ({ [id]: { ...events[0] } }));

    const el = renderEmbeddedNote({
      note: events[0],
      mentionedUsers: events[0].mentionedUsers,
      includeEmbeds: true,
      hideFooter: true,
      noLinks: "links",
      noPlaceholders: true,
      noLightbox: true,
    })

    mentions.forEach(mention => {
      mention.classList.remove('nevent-node');
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

export type NEventAttributes = {
  type: 'nevent' | 'note'
  bech32: string
  relays: string[]
  id: string
  kind?: number
  author?: string
}

export const makeNEventAttrs = (
  input: string,
  event: PrimalNote | PrimalZap | undefined,
  options?: any,
): NEventAttributes => {
  let bech32 = input;

  if (bech32.startsWith('nostr:')) {
    bech32 = bech32.split(':')[1];
  }

  const { type, data } = nip19.decode(bech32)
  const relays: string[] = [];

  switch (type) {
    case 'note':
      return { type, bech32, relays, id: data }
    case 'nevent':
      return { type, bech32, relays, id: data.id, kind: data.kind, author: data.author }
    default:
      throw new Error(`Invalid nostr entity type for this context: ${type}`)
  }
}

export const makeNEventNode = (bech32: string, options?: any) => ({
  type: 'nevent',
  attrs: makeNEventAttrs(bech32, options),
})

export const EVENT_REGEX = /nostr:(n(ote|event)1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]+)/g;

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    nevent: {
      applyNostrPasteRules: (text: string) => ReturnType,
      // setNostrContent: (content: string) => ReturnType,
      insertNEvent: (options: { nevent: string }) => ReturnType,
      insertNEventAt: (range: Range, options: { nevent: string }) => ReturnType
    }
  }
}

export const NEventExtension = Node.create({
  name: 'nevent',
  group: 'block',
  selectable: false,
  draggable: false,
  priority: 1000,

  addNodeView(): NodeViewRenderer {
    return ({ node, editor, getPos, HTMLAttributes, decorations, extension }) => {
      const dom = document.createElement('div');
      dom.classList.add('nevent-node');

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

  renderText({ node }) {
    return `nostr:${node.attrs.bech32}`
  },

  // Modify parseHTML to work with both div and the specific data attribute
  parseHTML() {
    return [
      { tag: `div[data-type="${this.name}"]` },
      { tag: `div.nevent-node` }
    ]
  },

  addCommands() {
    return {
      applyNostrPasteRules:
        (text) =>
        ({ tr, state, dispatch }) => {
          // const text = state.doc.textContent;
          const matches = Array.from(text.matchAll(EVENT_REGEX));

          if (matches.length === 0) return false;

          if (dispatch) {
            matches
              .sort((a, b) => (b.index || 0) - (a.index || 0))
              .forEach(match => {
                try {
                  const attrs = makeNEventAttrs(match[1], this.options);
                  const node = state.schema.nodes[this.name].create(attrs);

                  const start = match.index ? match.index-2 : 0;
                  const end = start + match[0].length;

                  tr.replaceWith(start, end, node);
                } catch (e) {
                  console.error('Error applying Nostr regex conversion:', e);
                }
              });
          }

          return true;
        },
      insertNEvent:
        ({ nevent }) =>
        ({ commands }) =>
          commands.insertContent([makeNEventNode(nevent, this.options)], { updateSelection: false }),
      insertNEventAt:
        (range, { nevent }) =>
        ({ commands }) =>
          commands.insertContentAt(range, [makeNEventNode(nevent, this.options)], { updateSelection: false }),
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
            return makeNEventAttrs(bech32, this.options);
          } catch (e) {
            console.error('Error in paste rule attributes:', e);
            return {};
          }
        },
        find: (text) => {
          const matches = [];
          const regex = new RegExp(EVENT_REGEX); // Create new instance for safety
          let match;

          while ((match = regex.exec(text)) !== null) {
            try {
              matches.push({
                index: match.index,
                text: match[0],
                replaceWith: match[0], // Keep full match for conversion
                match,
                data: makeNEventAttrs(match[2], this.options)
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
})
