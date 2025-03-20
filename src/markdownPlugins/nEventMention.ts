
import { Editor, InputRuleMatch, mergeAttributes, Node, nodePasteRule, PasteRuleMatch, Range, textblockTypeInputRule } from '@tiptap/core'
import type { Node as ProsemirrorNode } from '@tiptap/pm/model'
import type { MarkdownSerializerState } from 'prosemirror-markdown'
import { nip19 } from '../lib/nTools'
import { PrimalArticle, PrimalNote, PrimalUser, PrimalZap } from '../types/primal'
import { userName } from '../stores/profile'
import { fetchUserProfile } from '../handleFeeds'
import { APP_ID } from '../App'
import { createPasteRuleMatch } from './nProfileMention'
import { EventPointer } from 'nostr-tools/lib/types/nip19'
import { getEvents } from '../lib/feed'
import { fetchNotes } from '../handleNotes'
import Note, { renderNote } from '../components/Note/Note'
import { renderEmbeddedNote } from '../components/EmbeddedNote/EmbeddedNote'
// import { createPasteRuleMatch, parseRelayAttribute } from '../helpers/utils'

export const findMissingEvent = async (nevent: string) => {
  const decode = nip19.decode(nevent);

  let id = '';

  if (decode.type === 'note') {
    id = decode.data;
  }

  if (decode.type === 'nevent') {
    id = decode.data.id;
  }

  if (id.length === 0) return;

  const events = await fetchNotes(undefined, [id], `event_missing_${APP_ID}`);

  const mention = document.querySelector(`div[type=${decode.type}][bech32=${nevent}]`);

  if (mention && events[0]) {
    const el = renderEmbeddedNote({
      note: events[0],
      mentionedUsers: events[0].mentionedUsers,
      includeEmbeds: true,
      hideFooter: true,
      noLinks: "links",
    })

    mention.classList.remove('temp_editor');
    mention.innerHTML = el;
  }

  // Move cursor one space to the right to avoid overwriting the note.
  const el = document.querySelector('.tiptap.ProseMirror');
  el?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));

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
  const bech32 = input.replace(/^nostr:/, '')
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

export const EVENT_REGEX = /(?<![\w./:?=])(nostr:)?(n(ote|event)1[0-9a-z]+)/g

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    nevent: {
      insertNEvent: (options: { nevent: string }) => ReturnType,
      insertNEventAt: (range: Range, options: { nevent: string }) => ReturnType
    }
  }
}

export const NEventExtension = Node.create({
  name: 'nevent',
  group: 'block',
  selectable: true,
  draggable: true,
  priority: 1000,

  addNodeView() {
    return ({ editor, node, getPos, HTMLAttributes, decorations, extension }) => {
      const dom = document.createElement('div');

      Object.entries(node.attrs).forEach(([attr, value]) => {
        dom.setAttribute(attr, value)
      });

      dom.classList.add('temp_editor');
      dom.innerHTML = `${node.attrs.bech32}`;

      findMissingEvent(node.attrs.bech32);

      return {
        dom,
      }
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
    return [{ tag: `div[data-type="${this.name}"]` }]
  },

  addStorage() {
    return {
      markdown: {
        serialize(state: MarkdownSerializerState, node: ProsemirrorNode) {
          state.write('nostr:' + node.attrs.bech32)
        },
        parse: {},
      },
    }
  },

  addCommands() {
    return {
      insertNEvent:
        ({ nevent }) =>
        ({ commands }) =>
          commands.insertContent(makeNEventNode(nevent, this.options), { updateSelection: false }),
      insertNEventAt:
        (range, { nevent }) =>
        ({ commands }) =>
          commands.insertContentAt(range, makeNEventNode(nevent, this.options), { updateSelection: false }),
    }
  },

  addPasteRules() {
    return [
      nodePasteRule({
        type: this.type,
        getAttributes: (match) => match.data,
        find: (text) => {
          const matches = []

          for (const match of text.matchAll(EVENT_REGEX)) {
            try {
              matches.push(createPasteRuleMatch(match, makeNEventAttrs(match[2], this.options)))
            } catch (e) {
              continue
            }
          }

          return matches
        },
      }),
    ]
  },
})
