import { $inputRule, $node, $remark } from '@milkdown/utils';
import { Node } from '@milkdown/prose/model';
import { InputRule } from '@milkdown/prose/inputrules';
import directive from 'remark-directive';

const remarkDirective = $remark('remarkDirective', () => directive)
const directiveNode = $node('span', () => ({
  inline: true,
  group: 'inline',
  atom: true,
  defining: true,
  isolating: true,
  marks: '',
  attrs: {
    class: { default: 'linkish_editor' },
  },
  parseDOM: [{
    tag: 'span',
    getAttrs: (dom) => ({
      class: (dom as HTMLElement).getAttribute('class'),
    }),
  }],
  toDOM: (node: Node) => ['span', {...node.attrs}, `@qa`],
  parseMarkdown: {
    match: (node) => node.type === 'leafDirective' && node.name === 'span',
    runner: (state, node, type) => {
      state.addNode(type, { class: (node.attributes as { class: string }).class });
    },
  },
  toMarkdown: {
    match: (node) => node.type.name === 'span',
    runner: (state, node) => {
      state.addNode('leafDirective', undefined, undefined, {
        name: 'span',
        attributes: { class: node.attrs.class },
      });
    },
  }
}))

const inputRule = $inputRule((ctx) => new InputRule(/(?:\s|^)nostr:((npub|nprofile)1(?<src>[^\s]+))\s/, (state, match, start, end) => {
  const [okay ] = match;
  const { tr } = state;

  if (okay) {
    try {
      tr.replaceWith(start - 1, end, directiveNode.type(ctx).create({ class: 'linkish_editor' } ));
    } catch (e) {
      return tr;
    }
  }

  return tr;
}))

export const userMention = [...remarkDirective, directiveNode, inputRule];
