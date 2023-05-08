import { useIntl } from "@cookbook/solid-intl";
import { Component, createEffect, createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { useAccountContext } from "../../contexts/AccountContext";
import { useSearchContext } from "../../contexts/SearchContext";
import { hexToNpub } from "../../lib/keys";
import { sendNote } from "../../lib/notes";
import { referencesToTags } from "../../stores/note";
import { truncateNpub } from "../../stores/profile";
import { PrimalNote, PrimalUser } from "../../types/primal";
import { debounce } from "../../utils";
import Avatar from "../Avatar/Avatar";
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

  const search = useSearchContext();

  let textArea: HTMLTextAreaElement | undefined;
  let mentionOptions: HTMLDivElement | undefined;

  const [isMentioning, setMentioning] = createSignal(false);
  const [query, setQuery] = createSignal('');

  const [open, setOpen] = createSignal(false);

  const account = useAccountContext();
  const toast = useToastContext();

  const activeUser = () => account?.activeUser;

  onMount(() => {
    // @ts-expect-error TODO: fix types here
    document.addEventListener('input', onExpandableTextareaInput);
  });

  onCleanup(() => {
    // @ts-expect-error TODO: fix types here
    document.removeEventListener('input', onExpandableTextareaInput);
  });

  createEffect(() => {
    if (open()) {
      const textArea = document.getElementById('reply_to_note_text_area') as HTMLTextAreaElement;
      textArea?.focus();
    }
  });

  const openReplyBox = () => {
    setOpen(true);
  };


  const closeReplyToNote = () => {
    setOpen(false);
  };

  const postNote = async () => {
    if (!textArea) {
      return;
    }

    const value = textArea.value;

    if (value.trim() === '') {
      return;
    }

    if (account) {
      let tags = referencesToTags(value);
      tags.push(['e', props.note.post.id, '', 'reply']);
      tags.push(['p', props.note.post.pubkey]);

      const success = await sendNote(value, account.relays, tags);

      if (success) {
        toast?.sendSuccess('Message posted successfully');
      }
      else {
        toast?.sendWarning('Failed to send message');
      }
    }

    closeReplyToNote();
  };

  const positionOptions = () => {
    if (!textArea || !mentionOptions) {
      return;
    }

    const taRect = textArea.getBoundingClientRect();

    mentionOptions.style.left = '110px';

    if (30 + taRect.height > document.documentElement.clientHeight - taRect.top -200) {
      mentionOptions.style.removeProperty('top');
      mentionOptions.style.bottom = `${130}px`;
      return;
    }
    mentionOptions.style.removeProperty('bottom');
    mentionOptions.style.top = `${30 + taRect.height}px`;
  };

  const updateText = (value: string) => {
    const lastChar = value.charAt(value.length - 1);

    if (lastChar === '@') {
      setMentioning(true);
      setQuery('');
      return;
    }

    if (lastChar === ' ') {
      setMentioning(false);
      setQuery('');
      return;
    }

    const words = value.split(' ');
    const lastWord = words[words.length -1];

    if (isMentioning()) {
      const newQuery = lastWord.slice(lastWord.lastIndexOf('@')+1);

      debounce(() => {
        // @ts-ignore
        setQuery(newQuery);
      }, 500);
    }

    setMentioning(lastWord.includes('@'));
  };

  const onInput = () => {
    if (!textArea) {
      return;
    }

    const value = textArea.value;

    updateText(value);

  };

  const userName = (user: PrimalUser) => {
    return truncateNpub(
      // @ts-ignore
      user.display_name ||
      user.displayName ||
      user.name ||
      user.npub ||
      hexToNpub(user.pubkey) || '');
  };

  const selectUser = (user: PrimalUser) => {
    if (!textArea) {
      return;
    }

    let value = textArea.value;

    value = value.slice(0, value.lastIndexOf('@'));

    textArea.value = `${value}nostr:${user.npub} `;
    textArea.focus();

    setQuery('');
    updateText(textArea.value);

    // Dispatch input event to recalculate UI position
    const e = new Event('input', { bubbles: true, cancelable: true});
    textArea.dispatchEvent(e);
  };

  createEffect(() => {
    if (query().length === 0) {
      search?.actions.getRecomendedUsers();
      return;
    }

    search?.actions.findUsers(query());
  });

  createEffect(() => {
    if (isMentioning()) {
      positionOptions();
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
            <textarea
              id="reply_to_note_text_area"
              rows={3}
              data-min-rows={3}
              onInput={onInput}
              ref={textArea}
            >
            </textarea>

            <Show when={isMentioning()}>
                <div
                  id="mention-auto"
                  class={styles.searchSuggestions}
                  ref={mentionOptions}
                >
                  <For each={search?.users}>
                    {(user) => (
                      <SearchOption
                        title={userName(user)}
                        description={user.nip05}
                        icon={<Avatar src={user.picture} size="xs" />}
                        statNumber={search?.scores[user.pubkey]}
                        statLabel={intl.formatMessage({
                          id: 'search.users.followers',
                          defaultMessage: 'followers',
                          description: 'Followers label for user search results',
                        })}
                        onClick={() => selectUser(user)}
                      />
                    )}
                  </For>
                </div>
              </Show>

            <div class={styles.controls}>
              <button class={styles.primaryButton} onClick={postNote}>
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
              <button class={styles.secondaryButton} onClick={closeReplyToNote}>
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
    </Show>
  )
}

export default ReplyToNote;
