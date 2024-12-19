import { useIntl } from "@cookbook/solid-intl";
import { Component, createEffect, createSignal, Show } from "solid-js";
import { useAccountContext } from "../../contexts/AccountContext";
import { hookForDev } from "../../lib/devTools";
import { userName } from "../../stores/profile";
import { actions as t } from "../../translations";
import { PrimalArticle, PrimalNote, SendNoteResult } from "../../types/primal";
import Avatar from "../Avatar/Avatar";
import EditBox from "../NewNote/EditBox/EditBox";
import styles from  "./ReplyToNote.module.scss";


const ReplyToNote: Component<{
  note: PrimalNote | PrimalArticle,
  onNotePosted?: (note: SendNoteResult) => void,
  id?: string,
}> = (props) => {

  const intl = useIntl();

  const [open, setOpen] = createSignal(false);

  const account = useAccountContext();

  const activeUser = () => account?.activeUser;

  const openReplyBox = () => {
    setOpen(true);

    const editor = document.getElementById('reply_to_editor');

    editor?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
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
    <div id={props.id}>
      <Show
        when={open()}
        fallback={
          <button class={styles.replyBox} onClick={openReplyBox}>
            <div class={styles.leftSideClosed}>
              <Avatar
                size="sm"
                user={activeUser()}
              />
            </div>
            <div
              class={styles.input}
            >
              <div>
                {intl.formatMessage(
                  t.noteReply,
                  {
                    name: userName(props.note.user),
                  },
                )}
              </div>
            </div>
          </button>
        }
      >
        <div class={styles.newNoteBorder}>
          <div class={styles.newNote}>
            <div class={styles.leftSide}>
              <Avatar
                size="md"
                user={activeUser()}
              />
            </div>
            <div class={styles.rightSide}>
              <EditBox
                id="reply_to_editor"
                idPrefix="reply_"
                open={open()}
                replyToNote={props.note}
                onClose={closeReplyToNote}
                onSuccess={props.onNotePosted}
              />
            </div>
          </div>
        </div>
      </Show>
    </div>
  )
}

export default hookForDev(ReplyToNote);
