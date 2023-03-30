import { useIntl } from "@cookbook/solid-intl";
import { Component, createEffect, onCleanup, onMount } from "solid-js";
import { useAccountContext } from "../../contexts/AccountContext";
import { sendNote } from "../../lib/notes";
import Avatar from "../Avatar/Avatar";
import { useToastContext } from "../Toaster/Toaster";
import styles from  "./NewNote.module.scss";

const NewNote: Component = () => {

  const intl = useIntl();

  const getScrollHeight = (elm: AutoSizedTextArea) => {
    var savedValue = elm.value
    elm.value = ''
    elm._baseScrollHeight = elm.scrollHeight
    elm.value = savedValue
  }

  const onExpandableTextareaInput: (event: InputEvent) => void = (event) => {
    const maxHeight = document.documentElement.clientHeight || window.innerHeight || 0;

    const elm = event.target as AutoSizedTextArea ;

    if(elm.nodeName !== 'TEXTAREA' || elm.id !== 'new_note_text_area') {
      return;
    }

    const minRows = parseInt(elm.getAttribute('data-min-rows') || '0');

    !elm._baseScrollHeight && getScrollHeight(elm);

    if (elm.scrollHeight >= (maxHeight - 70)) {
      return;
    }

    elm.rows = minRows
    const rows = Math.ceil((elm.scrollHeight - elm._baseScrollHeight) / 20)
    elm.rows = minRows + rows
  }

  type AutoSizedTextArea = HTMLTextAreaElement & { _baseScrollHeight: number };

  const account = useAccountContext();
  const toast = useToastContext();

  const activeUser = () => account?.activeUser;

  const onClickOutide = (e: MouseEvent) => {
    if (!document?.getElementById('new_note_holder')?.contains(e.target as Node)) {
      account?.actions?.hideNewNoteForm();
    }
  }

  createEffect(() => {
    if (account?.showNewNoteForm) {
      document.addEventListener('click', onClickOutide);
    }
    else {
      document.removeEventListener('click', onClickOutide);
    }
  });

  onMount(() => {
    // @ts-expect-error TODO: fix types here
    document.addEventListener('input', onExpandableTextareaInput);
  });

  onCleanup(() => {
    // @ts-expect-error TODO: fix types here
    document.removeEventListener('input', onExpandableTextareaInput);
  });

  const closeNewNote = () => {
    account?.actions?.hideNewNoteForm()
  };

  const postNote = async () => {
    const textArea = document.getElementById('new_note_text_area') as HTMLTextAreaElement;

    if (textArea.value.trim() === '') {
      return;
    }

    if (account) {
      const success = await sendNote(textArea.value, account.relays);

      if (success) {
        toast?.sendSuccess('Message posted successfully');
      }
      else {
        toast?.sendWarning('Failed to send message');
      }
    }

    closeNewNote();
  };

  return (
    <>
      <div id="new_note_holder" class={styles.newNoteHolder}>
        <div class={styles.newNoteBorder}>
          <div class={styles.newNote}>
            <div class={styles.leftSide}>
              <Avatar
                src={activeUser()?.picture}
                size="md"
                verified={activeUser()?.nip05}
              />
            </div>
            <div class={styles.rightSide}>
              <textarea id="new_note_text_area" rows={1} data-min-rows={1} >
              </textarea>
              <div class={styles.controls}>
                <button
                  class={styles.primaryButton}
                  onClick={postNote}
                >
                  <span>
                    {intl.formatMessage(
                      {
                        id: 'actions.postNewNote',
                        defaultMessage: 'post',
                        description: 'Send new note, button label',
                      }
                    )}
                  </span>
                </button>
                <button class={styles.secondaryButton} onClick={closeNewNote}>
                  <div>
                    <span>
                      {intl.formatMessage(
                        {
                          id: 'actions.cancel',
                          defaultMessage: 'cancel',
                          description: 'Cancel action, button label',
                        }
                      )}
                    </span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class={styles.holderBottomBorder}>
        <div class={styles.leftCorner}></div>
        <div class={styles.rightCorner}></div>
      </div>
    </>
  )
}

export default NewNote;
