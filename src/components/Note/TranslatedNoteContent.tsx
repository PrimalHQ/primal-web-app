// Renders a note's content: the translated version when one is stored for
// this note, otherwise the original. The translation is fed to ParsedNote via
// `overrideText`, so media, links and embeds (re-attached by the translator)
// still parse and render as usual — only the raw text is translated.
//
// The translation state lives in the global noteTranslations store so it
// survives re-renders, scrolling and component unmounts.

import { Component, Show } from 'solid-js';
import { useIntl } from '@cookbook/solid-intl';
import ParsedNote from '../ParsedNote/ParsedNote';
import { note as tNote } from '../../translations';
import {
  getNoteTranslation,
  isOriginalShown,
  isNoteTranslated,
  toggleOriginal,
} from '../../stores/noteTranslations';
import type { PrimalNote } from '../../types/primal';
import styles from './Note.module.scss';

type NoteContentProps = {
  note: PrimalNote,
  shorten?: boolean,
  width?: number,
  margins?: number,
  footerSize?: string,
  noLightbox?: boolean,
  altEmbeds?: boolean,
};

const TranslatedNoteContent: Component<NoteContentProps> = (props) => {
  const intl = useIntl();

  const noteId = () => props.note?.post?.id;

  // The text ParsedNote should use: the translation while it is active,
  // otherwise nothing (ParsedNote falls back to the original content).
  const overrideText = () =>
    isNoteTranslated(noteId()) && !isOriginalShown(noteId())
      ? getNoteTranslation(noteId())
      : undefined;

  return (
    <div class={styles.translatedContent}>
      <ParsedNote {...props} overrideText={overrideText()} />

      <Show when={isNoteTranslated(noteId())}>
        <button
          class={styles.translatedToggle}
          onClick={(e) => {
            e.stopPropagation();
            toggleOriginal(noteId());
          }}
        >
          {isOriginalShown(noteId())
            ? intl.formatMessage(tNote.showTranslation)
            : intl.formatMessage(tNote.showOriginal)}
        </button>
      </Show>
    </div>
  );
};

export default TranslatedNoteContent;
