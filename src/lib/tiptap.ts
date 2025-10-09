/**
 * Lazy loading helpers for TipTap editor to reduce initial bundle size
 * The editor bundle is ~650KB and should only load when needed
 */

import type { Editor } from '@tiptap/core';
import type StarterKitType from '@tiptap/starter-kit';
import type LinkType from '@tiptap/extension-link';
import type MentionType from '@tiptap/extension-mention';
import type ImageType from '@tiptap/extension-image';
import type BubbleMenuType from '@tiptap/extension-bubble-menu';
import type UnderlineType from '@tiptap/extension-underline';
import type TableType from '@tiptap/extension-table';
import type TableCellType from '@tiptap/extension-table-cell';
import type TableHeaderType from '@tiptap/extension-table-header';
import type TableRowType from '@tiptap/extension-table-row';
import type GapcursorType from '@tiptap/extension-gapcursor';
import type CodeBlockType from '@tiptap/extension-code-block';

let tiptapExtensionsPromise: Promise<any> | undefined;
let tiptapCorePromise: Promise<any> | undefined;

/**
 * Lazy load all TipTap extensions in parallel
 * This reduces the initial bundle by ~650KB
 */
export const loadTipTapExtensions = async () => {
  if (!tiptapExtensionsPromise) {
    tiptapExtensionsPromise = Promise.all([
      import('@tiptap/starter-kit'),
      import('@tiptap/extension-link'),
      import('@tiptap/extension-mention'),
      import('@tiptap/extension-image'),
      import('@tiptap/extension-bubble-menu'),
      import('@tiptap/extension-underline'),
      import('@tiptap/extension-table'),
      import('@tiptap/extension-table-cell'),
      import('@tiptap/extension-table-header'),
      import('@tiptap/extension-table-row'),
      import('@tiptap/extension-gapcursor'),
      import('@tiptap/extension-code-block'),
    ]);
  }

  const [
    StarterKit,
    Link,
    Mention,
    Image,
    BubbleMenu,
    Underline,
    Table,
    TableCell,
    TableHeader,
    TableRow,
    Gapcursor,
    CodeBlock,
  ] = await tiptapExtensionsPromise;

  return {
    StarterKit: StarterKit.default,
    Link: Link.default,
    Mention: Mention.default,
    Image: Image.default,
    BubbleMenu: BubbleMenu.default,
    Underline: Underline.default,
    Table: Table.default,
    TableCell: TableCell.default,
    TableHeader: TableHeader.default,
    TableRow: TableRow.default,
    Gapcursor: Gapcursor.default,
    CodeBlock: CodeBlock.default,
  };
};

/**
 * Lazy load TipTap core
 */
export const loadTipTapCore = async () => {
  if (!tiptapCorePromise) {
    tiptapCorePromise = import('@tiptap/core');
  }

  return tiptapCorePromise;
};

/**
 * Lazy load solid-tiptap integration
 */
export const loadSolidTipTap = async () => {
  const module = await import('solid-tiptap');
  return module.createTiptapEditor;
};

/**
 * Lazy load tiptap-markdown plugin
 */
export const loadTipTapMarkdown = async () => {
  const module = await import('tiptap-markdown');
  return module.Markdown;
};
