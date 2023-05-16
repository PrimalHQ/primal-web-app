import { useIntl } from "@cookbook/solid-intl";
import { Component, createEffect, createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { useAccountContext } from "../../contexts/AccountContext";
import { useSearchContext } from "../../contexts/SearchContext";
import { hexToNpub } from "../../lib/keys";
import { sendNote } from "../../lib/notes";
import { referencesToTags } from "../../stores/note";
import { truncateNpub, userName } from "../../stores/profile";
import { PrimalNote, PrimalUser } from "../../types/primal";
import { debounce } from "../../utils";
import Avatar from "../Avatar/Avatar";
import EditBox from "../NewNote/EditBox/EditBox";
import SearchOption from "../Search/SearchOption";
import { useToastContext } from "../Toaster/Toaster";
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

const ReplyToNote: Component<{ note: PrimalNote }> = (props) => {

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

  return (
    <Show
      when={open()}
      fallback={
        <button class={styles.replyBox} onClick={openReplyBox}>
          <div class={styles.leftSideClosed}>
            <Avatar
              src={activeUser()?.picture}
              size="md"
              verified={activeUser()?.nip05}
            />
          </div>
          <div class={styles.rightSideClosed}>
            <div class={styles.border}>
              <div
                class={styles.input}
              >
                <span>
                  {intl.formatMessage(
                    {
                      id: 'actions.replyToNote',
                      defaultMessage: 'reply to {name}',
                      description: 'Reply to button label',
                    },
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
              verified={activeUser()?.nip05}
            />
          </div>
          <div class={styles.rightSide}>
            <EditBox
              replyToNote={props.note}
              onClose={closeReplyToNote}
            />
          </div>
        </div>
      </div>
    </Show>
  )
}

export default ReplyToNote;
