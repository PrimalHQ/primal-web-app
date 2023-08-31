import { useIntl } from "@cookbook/solid-intl";
import { Component, createEffect, createSignal, Show } from "solid-js";
import { useAccountContext } from "../../contexts/AccountContext";
import { userName } from "../../stores/profile";
import { actions as t } from "../../translations";
import { PrimalNote, SendNoteResult } from "../../types/primal";
import Avatar from "../Avatar/Avatar";
import EditBox from "../NewNote/EditBox/EditBox";
import styles from  "./ReplyToNote.module.scss";

type AutoSizedTextArea = HTMLTextAreaElement & { _baseScrollHeight: number };

const getScrollHeight = (elm: AutoSizedTextArea) => {
  var savedValue = elm.value
  elm.value = ''
  elm._baseScrollHeight = elm.scrollHeight
  elm.value = savedValue
}

const onExpandableTextareaInput: (event: InputEvent) => void = (event) => {

  const maxHeight = document.documentElement.clientHeight || window.innerHeight || 0;

  const elm = event.target as AutoSizedTextArea ;

  if(elm.nodeName !== 'TEXTAREA' || elm.id !== 'reply_to_note_text_area') {
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

const ReplyToNote: Component<{ note: PrimalNote, onNotePosted?: (note: SendNoteResult) => void }> = (props) => {

  const intl = useIntl();

  const [open, setOpen] = createSignal(false);

  const account = useAccountContext();

  const activeUser = () => account?.activeUser;

  const openReplyBox = () => {
    setOpen(true);
  };

  const closeReplyToNote = () => {
    setOpen(false);
  };

  createEffect(() => {
    if (open()) {
      setTimeout(() => {
        const newNoteTextArea = document.getElementById('reply_new_note_text_area') as HTMLTextAreaElement | undefined;

        if (!newNoteTextArea) {
          return;
        }
        newNoteTextArea?.focus();
      }, 100);
    }
    else {
      const newNoteTextArea = document.getElementById('reply_new_note_text_area') as HTMLTextAreaElement | undefined;

      if (!newNoteTextArea) {
        return;
      }

      newNoteTextArea.value = '';
    }
  });

  return (
    <Show
      when={open()}
      fallback={
        <button class={styles.replyBox} onClick={openReplyBox}>
          <div class={styles.leftSideClosed}>
            <Avatar
              src={activeUser()?.picture}
              size="md"
              user={activeUser()}
            />
          </div>
          <div class={styles.rightSideClosed}>
            <div class={styles.border}>
              <div
                class={styles.input}
              >
                <span>
                  {intl.formatMessage(
                    t.noteReply,
                    {
                      name: userName(props.note.user),
                    },
                  )}
                </span>
              </div>
            </div>
          </div>
        </button>
      }
    >
      <div class={styles.newNoteBorder}>
        <div class={styles.newNote}>
          <div class={styles.leftSide}>
            <Avatar
              src={activeUser()?.picture}
              size="md"
              user={activeUser()}
            />
          </div>
          <div class={styles.rightSide}>
            <EditBox
              idPrefix="reply_"
              replyToNote={props.note}
              onClose={closeReplyToNote}
              onSuccess={props.onNotePosted}
            />
          </div>
        </div>
      </div>
    </Show>
  )
}

export default ReplyToNote;
