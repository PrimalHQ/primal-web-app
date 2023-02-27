import { Component, createEffect, createSignal, onCleanup, onMount, Show } from "solid-js";
import { useFeedContext } from "../../contexts/FeedContext";
import { PrimalNetStats, PrimalNote } from "../../types/primal";
import Avatar from "../Avatar/Avatar";
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

const ReplyToNote: Component<{ note: PrimalNote }> = (params) => {

  const [open, setOpen] = createSignal(false);

  const context = useFeedContext();

  const activeUser = () => context?.data.activeUser;

  onMount(() => {
    // @ts-expect-error TODO: fix types here
    document.addEventListener('input', onExpandableTextareaInput);
  });

  onCleanup(() => {
    // @ts-expect-error TODO: fix types here
    document.removeEventListener('input', onExpandableTextareaInput);
  });


  const closeReplyToNote = () => {
    setOpen(false);
  };

  return (
    <Show
      when={open()}
      fallback={
        <button class={styles.replyBox} onClick={() => setOpen(true)}>
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
                reply to {params.note.user.name}
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
            <textarea id="reply_to_note_text_area" rows={3} data-min-rows={3} >
            </textarea>
            <div class={styles.controls}>
              <button class={styles.primaryButton}>
                <span>post</span>
              </button>
              <button class={styles.secondaryButton} onClick={closeReplyToNote}>
                <div><span>cancel</span></div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Show>
  )
}

export default ReplyToNote;
