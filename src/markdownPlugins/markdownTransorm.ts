import { Extension } from '@tiptap/core';
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

const mdToHtml = (markdown: string) => {
  const result = unified()
    .use(remarkParse)
    .use(remarkGfm)  // Add GFM support for tables
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)  // Preserve HTML in markdown
    .use(rehypeStringify)
    .processSync(markdown);

  return result.toString();
}

const htmlToMd = (html: string): string => {
  const result = unified()
    .use(rehypeParse, { fragment: true })
    .use(rehypeRemark)
    .use(remarkGfm)  // Add GFM support for tables
    .use(remarkStringify, {
      bullet: '-', // Use - for unordered lists
      emphasis: '_', // Use _ for italic
      strong: '**', // Use ** for bold
      fence: '```', // Use ``` for code blocks
      fences: true, // Use fences for code
      incrementListMarker: true,
      // Configure table formatting
      table: true,
      tableCellPadding: true,
      tablePipeAlign: true
    })
    .processSync(html);

  return result.toString();
};

const cToMd = (doc: ProsemirrorNode): string => {
  // Convert ProseMirror document to HTML
  const div = document.createElement('div')
  const fragment = DOMSerializer.fromSchema(doc.type.schema).serializeFragment(doc.content)
  div.appendChild(fragment)

  // Convert HTML to markdown
  return htmlToMd(div.innerHTML)
};

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
