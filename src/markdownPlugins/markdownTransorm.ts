import { Editor, Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';
import {
  DOMSerializer,
  DOMParser,
  Node as ProsemirrorNode,
} from 'prosemirror-model';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import remarkStringify from 'remark-stringify';
import rehypeParse from 'rehype-parse';
import rehypeRemark from 'rehype-remark';
import remarkGfm from 'remark-gfm';

import { readMentions, setReadMentions } from '../pages/ReadsEditor';
import { nip19 } from 'nostr-tools';
import { userName } from '../stores/profile';
import { fetchUserProfile } from '../handleFeeds';
import { APP_ID } from '../App';
import { unwrap } from 'solid-js/store';
import { PrimalArticle, PrimalNote, PrimalUser } from '../types/primal';
import { fetchArticles, fetchNotes } from '../handleNotes';
import { renderEmbeddedNote } from '../components/EmbeddedNote/EmbeddedNote';
import { Kind } from '../constants';
import { renderArticlePreview } from '../components/ArticlePreview/ArticlePreview';

export interface MarkdownPluginOptions {
  exportOnUpdate?: boolean
  importOnPaste?: boolean
  onMarkdownUpdate?: (markdown: string) => void
}

export const defaultMarkdownPluginOptions: MarkdownPluginOptions = {
  exportOnUpdate: false,
  importOnPaste: true,
  onMarkdownUpdate: () => {}
}


const findMissingUser = async (nprofile: string) => {
  const decode = nip19.decode(nprofile);

  let pubkey = '';

  if (decode.type === 'npub') {
    pubkey = decode.data;
  }

  if (decode.type === 'nprofile') {
    pubkey = decode.data.pubkey;
  }

  if (pubkey.length === 0) return;

  let user = unwrap(readMentions.users[pubkey]);

  if (!user) {
    user = await fetchUserProfile(undefined, pubkey, `user_missing_${nprofile}_${APP_ID}`);
    setReadMentions('users', () => ({ [pubkey]: { ...user } }));
  }

  return user;
  // setTimeout(() => {
  //   const mention = document.querySelector(`span[type=${decode.type}][bech32=${nprofile}]`);
  //   mention && (mention.innerHTML = `@${userName(user)}`);
  // }, 0);
}


const findMissingEvent = async (nevent: string) => {
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

  return events[0];
}


const findMissingAddr = async (naddr: string) => {
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

  return events[0];

}

// Helper function to handle nostr IDs in HTML -> Markdown conversion
const processHTMLForNostr = (html: string): string => {
  // Replace nostr spans with their markdown representation
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  // Find all nostr spans and replace them
  const nostrSpans = tempDiv.querySelectorAll('span[type="nprofile"], span[type="npub"], div[type="note"], div[type="nevent"], div[type="naddr"]');
  nostrSpans.forEach(span => {
    const bech32 = span.getAttribute('bech32');
    if (bech32) {
      // Create a text node with the nostr format
      const nostrText = document.createTextNode(` nostr:${bech32} `);
      span.parentNode?.replaceChild(nostrText, span);
    }
  });

  return tempDiv.innerHTML;
}

// Helper function to handle nostr IDs in Markdown -> HTML conversion
const processMarkdownForNostr = async (html: string): Promise<string> => {
  // This regex matches nostr: followed by an npub or nprofile identifier
  const nostrRegex = /nostr:(n(pub|profile|ote|event|addr)1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]+)/g;

  const nostrIds = html.match(nostrRegex) || [];
  let foundUsers: Record<string, PrimalUser> = {};
  let foundNotes: Record<string, PrimalNote> = {};
  let foundArticles: Record<string, PrimalArticle> = {};

  for (let i = 0; i < nostrIds.length;i++) {
    const nId = nostrIds[i];
    const bech32 = nId.startsWith('nostr:') ? nId.slice(6) : nId;

    const { type } = nip19.decode(bech32);

    if (['npub', 'nprofile'].includes(type)) {
      const user = await findMissingUser(bech32);

      if (user) {
        foundUsers[bech32] = { ...user };
      }
    }

    if (['note', 'nevent'].includes(type)) {
      const note = await findMissingEvent(bech32);

      if (note) {
        foundNotes[bech32] = { ...note };
      }
    }

    if (['naddr'].includes(type)) {
      const article = await findMissingAddr(bech32);

      if (article) {
        foundArticles[bech32] = { ...article };
      }
    }

  }

  return html.replace(nostrRegex, (match, bech32) => {
    const { type } = nip19.decode(bech32);


    if (['npub', 'nprofile'].includes(type)) {
      const pubkey = 'placeholder-pubkey';
      const relays: string[] = [];
      const user = foundUsers[bech32]
      const name = userName(user);

      // Create the span element with the appropriate attributes
      return `<span type="${type}" bech32="${bech32}" pubkey="${pubkey}" relays="${relays.join(',')}" name="${name}" data-type="${type}" class="linkish_editor">@${name}</span>`;
    }

    if (['note', 'nevent'].includes(type)) {
      // return `nostr:${bech32}`;
      const pubkey = 'placeholder-pubkey';
      const relays: string[] = [];
      const note = foundNotes[bech32];

      const el = renderEmbeddedNote({
        note: note,
        mentionedUsers: note.mentionedUsers,
        includeEmbeds: true,
        hideFooter: true,
        noLinks: "links",
      })

      const mention = document.createElement('div');
      mention.setAttribute('data-type', type);
      mention.setAttribute('data-bech32', bech32);
      mention.setAttribute('data-relays', '');
      mention.setAttribute('data-id', note.id);
      mention.setAttribute('data-kind', `${Kind.Text}`);
      mention.setAttribute('data-author', note.user.npub);
      mention.setAttribute('type', type);
      mention.setAttribute('bech32', bech32);
      mention.setAttribute('relays', '');
      mention.setAttribute('id', note.id);
      mention.setAttribute('kind', `${Kind.Text}`);
      mention.setAttribute('author', note.user.npub);
      mention.innerHTML = el;

      return mention.outerHTML;
    }

    if (['naddr'].includes(type)) {
      // return `nostr:${bech32}`;
      const pubkey = 'placeholder-pubkey';
      const relays: string[] = [];
      const article = foundArticles[bech32];

      const el = renderArticlePreview({
        article,
        bordered: true,
        hideFooter: true,
        noLinks: true,
      })

      const mention = document.createElement('div');
      mention.setAttribute('data-type', type);
      mention.setAttribute('data-bech32', bech32);
      mention.setAttribute('data-relays', '');
      mention.setAttribute('data-id', article.id);
      mention.setAttribute('data-kind', `${Kind.Text}`);
      mention.setAttribute('data-author', article.user.npub);
      mention.setAttribute('type', type);
      mention.setAttribute('bech32', bech32);
      mention.setAttribute('relays', '');
      mention.setAttribute('id', article.id);
      mention.setAttribute('kind', `${Kind.LongForm}`);
      mention.setAttribute('author', article.user.npub);
      mention.innerHTML = el;

      return mention.outerHTML;
    }

    return bech32;
  });
}

export const mdToHtml = async (markdown: string) => {
  try {
    const processor = unified()
      .use(remarkParse)
      .use(remarkGfm, {
        tableCellPadding: false,
        tablePipeAlign: false,
      })
      // .use(remarkImages)
      .use(remarkRehype, {
        allowDangerousHtml: true,
      })
      // .use(rehypeExtendedTable)
      // .use(rehypeRaw)
      .use(rehypeStringify);
      // .process(markdown);


    const result = await processor.process(markdown);
    let html = result.toString();

    // Process the HTML for nostr identifiers
    html = await processMarkdownForNostr(html);

    return html;
  } catch (error) {
    console.error('Error converting markdown to HTML:', error);
    // Fallback to simple conversion or return original markdown
    return `<pre>${markdown}</pre>`;
  }
}

export const htmlToMd = (html: string): string => {
  try {
    // Process HTML to handle nostr spans before converting to markdown
    const processedHtml = processHTMLForNostr(html);

    const result = unified()
      .use(rehypeParse, { fragment: true })
      .use(rehypeRemark)
      .use(remarkGfm)
      .use(remarkStringify, {
        fences: true,
        incrementListMarker: true,
        // table: true,
        // tableCellPadding: true,
        // tablePipeAlign: true
      })
      .processSync(processedHtml);

    return result.toString();
  } catch (error) {
    console.error('Error converting HTML to markdown:', error);
    // Return a sanitized version of the HTML as fallback
    return html.replace(/<[^>]*>/g, '');
  }
}

export const cToMd = (doc: ProsemirrorNode): string => {
  try {
    // Convert ProseMirror document to HTML
    const div = document.createElement('div');
    const fragment = DOMSerializer.fromSchema(doc.type.schema).serializeFragment(doc.content);
    div.appendChild(fragment);

    // Convert HTML to markdown
    return htmlToMd(div.innerHTML);
  } catch (error) {
    console.error('Error converting document to markdown:', error);
    return '';
  }
}

export const MarkdownPlugin = Extension.create<MarkdownPluginOptions>({
  name: 'markdown',

  addOptions() {
    return defaultMarkdownPluginOptions
  },

  addProseMirrorPlugins() {
    const { exportOnUpdate, importOnPaste, onMarkdownUpdate } = this.options

    return [
      new Plugin({
        key: new PluginKey('markdown'),
        props: {
          handlePaste: (view, event) => {
            if (!importOnPaste) {
              return false
            }

            const clipboardData = event.clipboardData
            if (!clipboardData) {
              return false
            }

            const text = clipboardData.getData('text/plain')
            if (!text) {
              return false
            }

            try {
              // Check if text is markdown by looking for common markdown patterns
              const hasMarkdownSyntax = /^#|\n#|^-|\n-|^\*|\n\*|^\d+\.|\n\d+\.|^>|\n>|^\[.*\]|^\s*```|\|.*\|/.test(text)

              if (hasMarkdownSyntax) {
                // Convert markdown to HTML
                const html = mdToHtml(text)

                // Parse HTML to DOM
                const parser = new DOMParser()
                const dom = parser.parseFromString(html, 'text/html')

                // Insert content at current selection
                const slice = DOMParser.fromSchema(view.state.schema).parseSlice(dom.body)
                const transaction = view.state.tr.replaceSelection(slice)
                view.dispatch(transaction)

                return true
              }
            } catch (error) {
              console.error('Error parsing markdown:', error)
            }

            return false
          }
        },

        // Track updates and convert to markdown if needed
        appendTransaction: (transactions, oldState, newState) => {
          if (!exportOnUpdate) {
            return null
          }

          const docChanged = transactions.some(tr => tr.docChanged)

          if (docChanged && onMarkdownUpdate) {
            const markdown = cToMd(newState.doc)
            onMarkdownUpdate(markdown)
          }

          return null
        }
      })
    ]
  },

  // Methods to convert between formats
  markdownToHtml(markdown: string): string {
    return mdToHtml(markdown);
  },

  htmlToMarkdown(html: string): string {
    return htmlToMd(html);
  },

  contentToMarkdown(doc: ProsemirrorNode): string {
    return cToMd(doc);
  },

  // Add utility methods for external use
  extendMarkdownEditor(editor: any) {
    return {
      ...editor,
      getMarkdown: () => {
        if (!editor) return ''
        return this.contentToMarkdown(editor.state.doc)
      },
      setMarkdown: async (markdown: string) => {
        if (!editor) return
        const html = await mdToHtml(markdown);
        editor.commands.setContent(html, false)
      }
    }
  }
})

// Add utility methods for external use
export const extendMarkdownEditor = (editor: Editor) => {
  return {
    ...editor,
    getMarkdown: () => {
      if (!editor) return ''
      return cToMd(editor.state.doc)
    },
    setMarkdown: async (markdown: string) => {
      if (!editor) return
      const html = await mdToHtml(markdown)
      editor.commands.setContent('', false)
      editor.commands.setContent(html, false)
      // editor.chain().
      //   setContent(html, false).
      //   applyNostrPasteRules(html).
      //   applyNProfilePasteRules(html).
      //   applyNAddrPasteRules(html).
      //   focus().run();
    }
  }
}

// nostr:nevent1qvzqqqqqqypzpzxvzd935e04fm6g4nqa7dn9qc7nafzlqn4t3t6xgmjkr3dwnyreqqsx6u9ykdnn50df50prxl2rkt0zl03y0x2wudl5esnw9td6phjeekgnj2yfp
