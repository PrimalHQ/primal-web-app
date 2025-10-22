import { Component, createEffect } from 'solid-js';
import { createStore } from 'solid-js/store';
import { hookForDev } from '../../lib/devTools';

import AdvancedSearchDialog from '../AdvancedSearch/AdvancedSearchDialog';

import styles from './ReadsMentionDialog.module.scss';
import ButtonPrimary from '../Buttons/ButtonPrimary';
import { Editor } from '@tiptap/core';
import { TextField } from '@kobalte/core/text-field';
import ButtonSecondary from '../Buttons/ButtonSecondary';


const ReadsLinkDialog: Component<{
  id?: string,
  open: boolean,
  editor: Editor | undefined,
  setOpen?: (v: boolean) => void,
  onSubmit: (url: string, title: string) => void,
}> = (props) => {

  const [state, setState] = createStore({
    url: '',
    title: '',
  })

  createEffect(() => {
    const e = props.editor;
    if (!e) return;

    if (props.open) {
      const sel = e.state.selection;
      const title = e.state.doc.textBetween(sel.from, sel.to);
      const url = e.getAttributes('link').href || '';

      setState(() => ({ title, url }))
    }
    else {
      setState(() => ({ url: '', title: '' }));
    }

  })

  return (
    <AdvancedSearchDialog
      triggerClass="hidden"
      open={props.open}
      setOpen={props.setOpen}
      title="Add link"
    >
      <div class={styles.addLinkDialog}>
        <label for="link_label">Text to display:</label>
        <input
          id="link_label"
          class={styles.textInput}
          autocomplete="off"
          value={state.title}
          onInput={(e) => setState(() => ({ title: e.target.value}))}
        />

        <label for="link_url">Address:</label>
        <TextField
          id="link_url"
          class={styles.textInput}
          value={state.url}
          onChange={(url) => setState(() => ({ url }))}
        >
         	<TextField.TextArea autoResize rows={1} />
        </TextField>

        <div class={styles.actions}>
          <ButtonSecondary
            onClick={() => props.setOpen && props.setOpen(false)}
            light={true}
            shrink={true}
          >
            Cancel
          </ButtonSecondary>
          <ButtonPrimary
            onClick={() => props.onSubmit(state.url, state.title)}
          >
            Insert
          </ButtonPrimary>
        </div>
      </div>
    </AdvancedSearchDialog>
  );
}

export default hookForDev(ReadsLinkDialog);
