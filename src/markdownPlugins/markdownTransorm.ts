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
import remarkGfm from 'remark-gfm'  // For GitHub Flavored Markdown (includes tables)
import rehypeRaw from 'rehype-raw'  // To preserve HTML in markdown

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

// Helper function to handle nostr IDs in HTML -> Markdown conversion
const processHTMLForNostr = (html: string): string => {
  // Replace nostr spans with their markdown representation
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  // Find all nostr spans and replace them
  const nostrSpans = tempDiv.querySelectorAll('span[type="nprofile"], span[type="npub"]');
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
const processMarkdownForNostr = (html: string): string => {
  return html;
  // This regex matches nostr: followed by an npub or nprofile identifier
  const nostrRegex = /nostr:(np(ub|rofile)1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]+)/g;

  return html.replace(nostrRegex, (match, bech32) => {
    const type = bech32.startsWith('npub') ? 'npub' : 'nprofile';
    // Note: In a real implementation, you'd likely want to extract pubkey and relays
    // from the bech32 string using nip19 library. For this example, we're using placeholders.
    const pubkey = 'placeholder-pubkey';
    const relays = [];
    const name = bech32;

    // Create the span element with the appropriate attributes
    return `<span type="${type}" bech32="${bech32}" pubkey="${pubkey}" relays="${relays.join(',')}" name="${name}" data-type="nprofile" class="linkish_editor">@${name}</span>`;
  });
}

export const mdToHtml = (markdown: string) => {
  try {
    // Fix for table processing - ensure GFM is properly initialized
    const processor = unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkRehype, {
        allowDangerousHtml: true,
        // Adding handlers to ensure proper table processing
        handlers: {
          // Explicitly handle tables if needed
          table: (h, node) => {
            return h(node, 'table', {}, h.all(node));
          }
        }
      })
      .use(rehypeRaw)
      .use(rehypeStringify);

    const result = processor.processSync(markdown);
    let html = result.toString();

    // Process the HTML for nostr identifiers
    html = processMarkdownForNostr(html);

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
        // Ensure table settings are correctly configured
        // bullet: '-',
        // emphasis: '_',
        // strong: '**',
        // fence: '```',
        table: true,
        tableCellPadding: true,
        tablePipeAlign: true
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
      setMarkdown: (markdown: string) => {
        if (!editor) return
        const html = this.markdownToHtml(markdown)
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
    setMarkdown: (markdown: string) => {
      if (!editor) return
      const html = mdToHtml(markdown)
      editor.commands.setContent(html, false)
    }
  }
}
