
import { mergeAttributes, Node, nodePasteRule, PasteRuleMatch, Range } from '@tiptap/core'
import type { Node as ProsemirrorNode } from '@tiptap/pm/model'
import type { MarkdownSerializerState } from 'prosemirror-markdown'
import { nip19 } from '../lib/nTools'
import { PrimalUser } from '../types/primal'
import { userName } from '../stores/profile'
import { fetchUserProfile } from '../handleFeeds'
import { APP_ID } from '../App'
// import { createPasteRuleMatch, parseRelayAttribute } from '../helpers/utils'

export const findMissingUser = async (nprofile: string) => {
  const decode = nip19.decode(nprofile);

  let pubkey = '';

  if (decode.type === 'npub') {
    pubkey = decode.data;
  }

  if (decode.type === 'nprofile') {
    pubkey = decode.data.pubkey;
  }

  if (pubkey.length === 0) return;

  const user = await fetchUserProfile(undefined, pubkey, `user_missing_${APP_ID}`);

  const mention = document.querySelector(`span[type=${decode.type}][bech32=${nprofile}]`);
  mention && (mention.innerHTML = `@${userName(user)}`);
}


export type NProfileAttributes = {
  type: 'nprofile' | 'npub'
  bech32: string
  pubkey: string
  relays: string[],
  name: string,
}
export const createPasteRuleMatch = <T extends Record<string, unknown>>(
  match: RegExpMatchArray,
  data: T,
): PasteRuleMatch => ({ index: match.index!, replaceWith: match[2], text: match[0], match, data })

export const makeNProfileAttrs = (
  input: string,
  user: PrimalUser | undefined,
  userRelays: string[],
  options?: any,
): NProfileAttributes => {


  const bech32 = input.replace(/^nostr:/, '')
  const { type, data } = nip19.decode(bech32);
  let relays: string[] = [];

  let name = bech32;
  if (user) {
    name = userName(user);
  }
  else {
    findMissingUser(name);
  }

  switch (type) {
    case 'npub':
      return { type, bech32, relays, pubkey: data, name }
    case 'nprofile':
      relays = data.relays || [];
      return { type, bech32, relays, pubkey: data.pubkey, name }
    default:
      throw new Error(`Invalid nostr entity type for this context: ${type}`)
  }
}

export const makeNProfileNode = (
  bech32: string,
  user: PrimalUser | undefined,
  relays: string[],
  options?: any,
) => ({
  type: 'nprofile',
  attrs: makeNProfileAttrs(bech32, user, relays, options),
})

export const PROFILE_REGEX = /(?<![\w./:?=])(nostr:)?(np(ub|rofile)1[0-9a-z]+)/g

// export type NProfileOptions = Nip19Options

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    nprofile: {
      insertNProfile: (
        options: {
          user: PrimalUser | undefined,
          relays: string[],
          nprofile: string,
        },
      ) => ReturnType,
      insertNProfileAt: (
        range: Range,
        options: {
          user: PrimalUser | undefined,
          relays: string[],
          nprofile: string,
        },
      ) => ReturnType
    }
  }
}

export const NProfileExtension = Node.create({
  name: 'nprofile',
  atom: true,
  inline: true,
  group: 'inline',
  priority: 1000,

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

  addAttributes() {
    return {
      type: { default: null },
      bech32: { default: null },
      pubkey: { default: null },
      relays: { default: [] },
      name: { default: ''},
    }
  },

  parseHTML() {
    return [{ tag: `span[data-type="${this.name}"]` }]
  },

  renderHTML(props) {
    return ['span',
      mergeAttributes(
        props.HTMLAttributes,
        {
          'data-type': this.name,
          class: 'linkish_editor',
        },
      ),
      `@${props.node.attrs.name}`,
    ]
  },

  renderText(props) {
    return 'nostr:' + props.node.attrs.bech32
  },

  addCommands() {
    return {
      insertNProfileAt:
        (range, { nprofile, user, relays }) =>
        ({ commands }) =>
          commands.insertContentAt(range, makeNProfileNode(nprofile, user, relays, this.options), { updateSelection: false }),
      insertNProfile:
        ({ nprofile, user, relays }) =>
        ({ commands }) =>
          commands.insertContent(makeNProfileNode(nprofile, user, relays, this.options), { updateSelection: false }),
    }
  },

  addPasteRules() {
    return [
      nodePasteRule({
        type: this.type,
        getAttributes: (match) => match.data,
        find: (text) => {
          const matches = []

          for (const match of text.matchAll(PROFILE_REGEX)) {
            try {
              matches.push(createPasteRuleMatch(match, makeNProfileAttrs(match[2], undefined, [], this.options)))
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
