import { Component, For, Show, createEffect } from 'solid-js';

import styles from './ReadsEditor.module.scss';
import { createStore } from 'solid-js/store';
import { Editor } from '@tiptap/core';
import ReadsEditorBlockSelector, { SelectorOption, blockSelectorOptions } from './ReadsEditorBlockSelector';
import ReadsLinkDialog from '../ReadsMentionDialog/ReadsLinkDialog';
import ReadsMentionDialog from '../ReadsMentionDialog/ReadsMentionDialog';
import { PrimalArticle, PrimalNote, PrimalUser } from '../../types/primal';
import { nip19 } from '../../lib/nTools';
import ReadsEditorTableSelector from './ReadsEditorTableSelector';
import ReadsEditorBubbleMenu from './ReadsEditorBubbleMenu';
import ReadsImageDialog from '../ReadsMentionDialog/ReadsImageDialog';
import { insertContent } from '@tiptap/core/dist/commands';
import { useProfileContext } from '../../contexts/ProfileContext';

export type FormatControls = {
  isBoldActive: boolean,
  isItalicActive: boolean,
  isStrikeActive: boolean,
  isUlineActive: boolean,
  isLinkActive: boolean,
  isCodeActive: boolean,
  enterLink: boolean,
  enterMention: boolean,
  enterImage: boolean,
  headingLevel: number,
};

const ReadsEditorToolbar: Component<{
  id?: string,
  editor: Editor | undefined,
  textArea: HTMLTextAreaElement | undefined
  onFileUpload: (file: File) => void,
  wysiwygMode: boolean,
  toggleEditorMode: () => void,
  fixed?: boolean,
}> = (props) => {

  const profile = useProfileContext();

  let contentFileUpload: HTMLInputElement | undefined;

  const [formatControls, updateFormatControls] = createStore<FormatControls>({
    isBoldActive: false,
    isItalicActive: false,
    isStrikeActive: false,
    isUlineActive: false,
    isLinkActive: false,
    isCodeActive: false,
    enterLink: false,
    enterMention: false,
    enterImage: false,
    headingLevel: 0,
  });

  createEffect(() => {
    if (formatControls.enterLink) {
      setTimeout(() => {
        const input = document.getElementById('link_url') as HTMLInputElement | null;
        input?.focus();
      }, 10)
    }
  });

  createEffect(() => {
    const ed = props.editor;
    if (!ed) return;

    ed.off('selectionUpdate');
    ed.on('selectionUpdate', () => {

      let headingLevel = [1, 2, 3, 4, 5, 6].
        find(level => ed.isActive('heading', { level })) || 0;

      if (headingLevel === 0 && ed.isActive('codeBlock')) {
        headingLevel = 7;
      }

      if (headingLevel === 0 && ed.isActive('blockquote')) {
        headingLevel = 8;
      }

      updateFormatControls(() => ({
        isBoldActive: ed.isActive('bold'),
        isItalicActive: ed.isActive('italic'),
        isStrikeActive: ed.isActive('strike'),
        isUlineActive: ed.isActive('underline'),
        isCodeActive: ed.isActive('codeBlock'),
        headingLevel
      }))
    })
  });

  const onUploadContentImage = () => {
    if (!contentFileUpload) {
      return;
    }

    const file = contentFileUpload.files ? contentFileUpload.files[0] : null;

    if (!file) return;

    props.onFileUpload(file);
  }


  const bold = () => {
    if (props.wysiwygMode) {
      props.editor?.chain().focus().toggleBold().run();
      updateFormatControls('isBoldActive', v => !v);
      return;
    }

    const ta = props.textArea;

    if (!ta) return;

    const s = ta.selectionStart || 0;

    const pre = ta.value.slice(0, s) || '';
    const post = ta.value.slice(s+1) || '';

    const content = `${pre}**${post}`;

    ta.value = content;
    ta.selectionStart = s;

  }

  const italic = () => {
    props.editor?.chain().focus().toggleItalic().run();
    updateFormatControls('isItalicActive', v => !v);
  }

  const strike = () => {
    props.editor?.chain().focus().toggleStrike().run();
    updateFormatControls('isStrikeActive', v => !v);
  }

  const uline = () => {
    props.editor?.chain().focus().toggleUnderline().run();
    updateFormatControls('isUlineActive', v => !v);
  }

  const code = () => {
    props.editor?.chain().focus().toggleCodeBlock().run();
    updateFormatControls('isCodeActive', v => !v);
  }

  const quote = () => {
    props.editor?.chain().focus().toggleBlockquote().run();
    // updateFormatControls('isQuoteActive', v => !v);
  }

  const bulletList = () => {
    props.editor?.chain().focus().toggleBulletList().run();
    // updateFormatControls('isBulletActive', v => !v);
  }

  const orderedList = () => {
    props.editor?.chain().focus().toggleOrderedList().run();
    // updateFormatControls('isOrderedActive', v => !v);
  }

  const link = (href: string, title: string) => {
    const editor = props.editor;

    if (!editor) return;

    if (href === '') {
      editor.
        chain().
        focus().
        extendMarkRange('link').
        unsetLink().
        run();
      return
    }

    editor.
      chain().
      focus().
      extendMarkRange('link').
      setLink({ href }).
      command(({ tr }) => {
        title && tr.insertText(title)
        return true
      }).
      run();

    editor.
      chain().
      focus().
      unsetMark('link').
      insertContent({ type: 'text', text: ' '}).
      run();
  }

  const image = (src: string, title: string, alt: string) => {
    const editor = props.editor;

    if (!editor || src.length === 0) return;

    editor.
      chain().
      focus().
      setImage({ src, title, alt }).
      run();

    // Move cursor one space to the right to avoid overwriting the image.
    const el = document.querySelector('.tiptap.ProseMirror');
    el?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
  }


  const heading = (option: SelectorOption) => {
    const level = option?.index || 0;

    if (!props.editor?.isActive('codeBlock')) {
      updateFormatControls('headingLevel', () => level);
    }

    if (level === 0) {
      props.editor?.chain().focus().setParagraph().run();
      return;
    }

    if (level > 0 && level < 7) {
      // @ts-ignore
      props.editor?.chain().focus().setHeading({ level }).run();
      return;
    }

    if (level === 7) {
      code();
    }

    if (level === 8) {
      quote();
    }
  }

  const table = (rows: number, cols: number) => {
    if (!props.editor) return;

    const eod = isCursorAtEnd(props.editor);
    props.editor?.chain().focus().
      insertTable({rows: rows + 1, cols, withHeaderRow: true}).
      run();

    eod && insertContentAtEnd(props.editor, ' ')
  }

  const isCursorAtEnd = (editor: Editor) => {
    if (!editor || !editor.state) {
      return false;
    }

    // Get current cursor position
    const cursorPos = editor.state.selection.anchor;

    // Get the total size of the document (position of the very end)
    const docSize = editor.state.doc.content.size;

    // Check if cursor is at the end (accounting for possible trailing spaces)
    // The -1 is because in ProseMirror/TipTap, the document size includes an extra position
    return cursorPos >= docSize - 1;
  }

  const insertContentAtEnd = (editor: Editor | undefined, content: string) => {
    if (!editor) return;

    // Store the current selection
    const { from, to } = editor.state.selection

    // Create a transaction that inserts content at the end
    const tr = editor.state.tr.insert(
      editor.state.doc.content.size, // This targets the end of the document
      editor.schema.text(content)
    )

    // Preserve the original selection
    tr.setSelection(editor.state.selection.constructor.create(
      tr.doc,
      from,
      to
    ))

    // Apply the transaction
    editor.view.dispatch(tr)
  }

  const addMentionToEditor = (user: PrimalUser, relays: string[]) => {
    const editor = props.editor;
    if (!editor) return;

    let pInfo: nip19.ProfilePointer = { pubkey: user.pubkey };

    if (relays.length > 0) {
      pInfo.relays = [...relays];
    }

    const nprofile = nip19.nprofileEncode(pInfo);

    profile?.actions.addProfileToHistory(user);

    editor
      .chain()
      .focus()
      .insertNProfile({ nprofile, user, relays})
      .insertContent({ type: 'text', text: ' ' })
      .run()
  }

  const addNoteToEditor = (note: PrimalNote) => {
    const editor = props.editor;
    if (!editor) return;

    const nevent = note.noteId;

    editor
      .chain()
      .focus()
      .insertNEvent({ nevent })
      .run()
  }

  const addReadToEditor = (read: PrimalArticle) => {
    const editor = props.editor;
    if (!editor) return;

    const naddr = read.noteId;

    editor
      .chain()
      .focus()
      .insertNAddr({ naddr })
      .run()
  }


  return (
    <>
      <div class={`${styles.toolbar} fixed_editor_toolbar ${props.fixed ? '' : styles.invisibleToolbar}`} id='editor_toolbar_fixed'>
        <div>
          <ReadsEditorBlockSelector
            value={blockSelectorOptions[formatControls.headingLevel]}
            options={blockSelectorOptions}
            onChange={heading}
            short={true}
          />

          <div class={styles.separator}></div>

          <button
            id="boldBtn"
            class={`${styles.mdToolButton} ${formatControls.isBoldActive ? styles.selected : ''}`}
            onClick={bold}
            title="bold"
          >
            <div class={styles.boldIcon}></div>
          </button>

          <button
            id="italicBtn"
            class={`${styles.mdToolButton} ${formatControls.isItalicActive ? styles.selected : ''}`}
            onClick={italic}
            title="italic"
          >
            <div class={styles.italicIcon}></div>
          </button>

          <button
            id="ulineBtn"
            class={`${styles.mdToolButton} ${formatControls.isUlineActive ? styles.selected : ''}`}
            onClick={uline}
            title="underline"
          >
            <div class={styles.ulineIcon}></div>
          </button>

          <button
            id="strikeBtn"
            class={`${styles.mdToolButton} ${formatControls.isStrikeActive ? styles.selected : ''}`}
            onClick={strike}
            title="strike"
          >
            <div class={styles.strikeIcon}></div>
          </button>

          <div class={styles.separator}></div>

          <button
            id="bulletListBtn"
            class={`${styles.mdToolButton}`}
            onClick={bulletList}
            title="bullet list"
          >
            <div class={styles.bulletListIcon}></div>
          </button>

          <button
            id="orderedListBtn"
            class={`${styles.mdToolButton}`}
            onClick={orderedList}
            title="ordered list"
          >
            <div class={styles.orderedListIcon}></div>
          </button>

          <div class={styles.separator}></div>

          <ReadsEditorTableSelector
            onSelect={table}
          />

          <button
            id="attachBtn"
            class={`${styles.mdToolButton}`}
            onClick={() => {
              updateFormatControls('enterImage', () => true);
            }}
            title="image"
          >
            <div class={styles.attachIcon}></div>
          </button>

          <button
            id="mentionBtn"
            class={`${styles.mdToolButton}`}
            onClick={() => {
              updateFormatControls('enterMention', () => true);
            }}
            title="mention"
          >
            <div class={styles.atIcon}></div>
          </button>

          <button
            id="linkBtn"
            class={`${styles.mdToolButton} ${formatControls.isLinkActive ? styles.selected : ''}`}
            onClick={() => {
              const editor = props.editor;
              if (!editor) return;

              let linak = editor.getAttributes('link').href;

              if (linak) {
                editor.chain().unsetLink().run();
                return;
              }

              updateFormatControls('enterLink', () => true);
            }}
            title="link"
          >
            <div class={styles.linkIcon}></div>
          </button>
          <div class={styles.separator}></div>
        </div>

          <button
            id="editorMode"
            class={`${styles.mdToolButton} ${!props.wysiwygMode ? styles.selected : ''}`}
            onClick={props.toggleEditorMode}
            title={!props.wysiwygMode ? 'switch to wysiwyg mode' : 'switch to plain text mode'}
          >
            <Show
              when={props.wysiwygMode}
              fallback={<div class={styles.modeIcon}></div>}
            >
              <div class={`${styles.modeIcon} ${styles.active}`}></div>
            </Show>
          </button>
      </div>
      <div class={`${styles.toolbar}  ${props.fixed ? styles.invisibleToolbar : ''}`} id='editor_toolbar'>
        <div>
          <ReadsEditorBlockSelector
            value={blockSelectorOptions[formatControls.headingLevel]}
            options={blockSelectorOptions}
            onChange={heading}
            short={true}
          />

          <div class={styles.separator}></div>

          <button
            id="boldBtn"
            class={`${styles.mdToolButton} ${formatControls.isBoldActive ? styles.selected : ''}`}
            onClick={bold}
            title="bold"
          >
            <div class={styles.boldIcon}></div>
          </button>

          <button
            id="italicBtn"
            class={`${styles.mdToolButton} ${formatControls.isItalicActive ? styles.selected : ''}`}
            onClick={italic}
            title="italic"
          >
            <div class={styles.italicIcon}></div>
          </button>

          <button
            id="ulineBtn"
            class={`${styles.mdToolButton} ${formatControls.isUlineActive ? styles.selected : ''}`}
            onClick={uline}
            title="underline"
          >
            <div class={styles.ulineIcon}></div>
          </button>

          <button
            id="strikeBtn"
            class={`${styles.mdToolButton} ${formatControls.isStrikeActive ? styles.selected : ''}`}
            onClick={strike}
            title="strike"
          >
            <div class={styles.strikeIcon}></div>
          </button>

          <div class={styles.separator}></div>

          <button
            id="bulletListBtn"
            class={`${styles.mdToolButton}`}
            onClick={bulletList}
            title="bullet list"
          >
            <div class={styles.bulletListIcon}></div>
          </button>

          <button
            id="orderedListBtn"
            class={`${styles.mdToolButton}`}
            onClick={orderedList}
            title="ordered list"
          >
            <div class={styles.orderedListIcon}></div>
          </button>

          <div class={styles.separator}></div>

          <ReadsEditorTableSelector
            onSelect={table}
          />

          <button
            id="attachBtn"
            class={`${styles.mdToolButton}`}
            onClick={() => {
              updateFormatControls('enterImage', () => true);
            }}
            title="image"
          >
            <div class={styles.attachIcon}></div>
          </button>

          <button
            id="mentionBtn"
            class={`${styles.mdToolButton}`}
            onClick={() => {
              updateFormatControls('enterMention', () => true);
            }}
            title="mention"
          >
            <div class={styles.atIcon}></div>
          </button>

          <button
            id="linkBtn"
            class={`${styles.mdToolButton} ${formatControls.isLinkActive ? styles.selected : ''}`}
            onClick={() => {
              const editor = props.editor;
              if (!editor) return;

              let linak = editor.getAttributes('link').href;

              if (linak) {
                editor.chain().unsetLink().run();
                return;
              }

              updateFormatControls('enterLink', () => true);
            }}
            title="link"
          >
            <div class={styles.linkIcon}></div>
          </button>
          <div class={styles.separator}></div>
        </div>

          <button
            id="editorMode"
            class={`${styles.mdToolButton} ${!props.wysiwygMode ? styles.selected : ''}`}
            onClick={props.toggleEditorMode}
            title={!props.wysiwygMode ? 'switch to wysiwyg mode' : 'switch to plain text mode'}
          >
            <Show
              when={props.wysiwygMode}
              fallback={<div class={styles.modeIcon}></div>}
            >
              <div class={`${styles.modeIcon} ${styles.active}`}></div>
            </Show>
          </button>
      </div>

      <ReadsLinkDialog
        open={formatControls.enterLink}
        setOpen={(v: boolean) => updateFormatControls('enterLink', () => v)}
        editor={props.editor}
        onSubmit={(url: string, label:string) => {
          link(url, label);
          updateFormatControls('enterLink', () => false);
        }}
      />

      <ReadsImageDialog
        open={formatControls.enterImage}
        setOpen={(v: boolean) => updateFormatControls('enterImage', () => v)}
        editor={props.editor}
        onSubmit={(url: string, title:string, alt: string) => {
          image(url, title, alt);
          updateFormatControls('enterImage', () => false);
        }}
      />


      <ReadsMentionDialog
        open={formatControls.enterMention}
        setOpen={(v: boolean) => updateFormatControls('enterMention', () => v)}
        onAddUser={(user: PrimalUser, relays: string[]) => {
          addMentionToEditor(user, relays);
          updateFormatControls('enterMention', () => false);
        }}
        onAddNote={(note: PrimalNote) => {
          addNoteToEditor(note);
          updateFormatControls('enterMention', () => false);
        }}
        onAddRead={(read: PrimalArticle) => {
          addReadToEditor(read);
          updateFormatControls('enterMention', () => false);
        }}
      />

      <ReadsEditorBubbleMenu
        editor={props.editor}
        store={formatControls}
        commands={{
          bold: () => props.editor?.commands.deleteTable(),
          italic: () => {},
          uline: () => {},
          strike: () => {},
        }}
      />
    </>
  );
}

export default ReadsEditorToolbar;
