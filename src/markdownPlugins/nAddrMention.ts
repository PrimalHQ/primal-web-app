
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
import { fetchArticles, fetchNotes } from '../handleNotes'
import Note, { renderNote } from '../components/Note/Note'
import { renderEmbeddedNote } from '../components/EmbeddedNote/EmbeddedNote'
import { Kind } from '../constants'
import { renderArticlePreview } from '../components/ArticlePreview/ArticlePreview'
// import { createPasteRuleMatch, parseRelayAttribute } from '../helpers/utils'

export const findMissingEvent = async (naddr: string) => {
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

  const events = await fetchArticles([naddr], `reads_missing_${APP_ID}`);

  const mention = document.querySelector(`div[type=${decode.type}][bech32=${naddr}]`);

  if (mention && events[0]) {
    const el = renderArticlePreview({
      article: events[0],
      bordered: true,
      hideFooter: true,
      noLinks: true,
    })

    mention.classList.remove('temp_editor');
    mention.innerHTML = el;
  }

  // Move cursor one space to the right to avoid overwriting the note.
  const el = document.querySelector('.tiptap.ProseMirror');
  el?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));

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

export const NADDR_REGEX = /(?<![\w./:?=])(nostr:)?(naddr1[0-9a-z]+)/g

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    naddr: {
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
        getAttributes: (match) => match.data,
        find: (text) => {
          const matches = []

          for (const match of text.matchAll(NADDR_REGEX)) {
            try {
              matches.push(createPasteRuleMatch(match, makeNAddrAttrs(match[2], this.options)))
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
