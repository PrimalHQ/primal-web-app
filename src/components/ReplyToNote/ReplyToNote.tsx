import { useIntl } from "@cookbook/solid-intl";
import { Component, createEffect, createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { useAccountContext } from "../../contexts/AccountContext";
import { useSearchContext } from "../../contexts/SearchContext";
import { hexToNpub } from "../../lib/keys";
import { sendNote } from "../../lib/notes";
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

  let mentions = new Set<string>();

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

  const encodeMentions = (value: string) => {
    const regex = /@\[[^\s!@#$%^&*(),.?":{}|<>]+\]/ig;

    let parsed = value;
    let refs = [];
    let match;

    while((match = regex.exec(parsed)) !== null) {
      refs.push(match[0]);
    }

    refs.forEach((ref, i) => {
      parsed = parsed.replaceAll(ref, `#[${i}]`);
    });

    return parsed;

  };

  const postNote = async () => {
    if (!textArea) {
      return;
    }

    const value = textArea.value;

    const encoded = encodeMentions(value);

    if (encoded.trim() === '') {
      return;
    }

    console.log('ENC: ', encoded)

    // if (account) {
    //   let tags = Array.from(mentions).map(pk => ['p', pk]);
    //   tags.push(['e', props.note.post.id]);
    //   tags.push(['p', props.note.post.pubkey]);

    //   const success = await sendNote(encoded, account.relays, tags);

    //   if (success) {
    //     toast?.sendSuccess('Message posted successfully');
    //   }
    //   else {
    //     toast?.sendWarning('Failed to send message');
    //   }
    // }

    // closeReplyToNote();

  };

  const positionOptions = (value: string) => {
    const lineHight = 20;
    const charWidth = 6;

    const lineNum = (value.match(/(\r\n|\n|\r)/g) || []).length + 1;

    const lastLineBreakIndex = value.lastIndexOf('\n') + 1;

    const charNum = value.length - lastLineBreakIndex

    if (!mentionOptions) {
      return;
    }

    mentionOptions.style.top = `${(lineNum * lineHight) + 20}px`;
    mentionOptions.style.left = `${(charWidth * charNum) + 110}px`;
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

    textArea.value = `${value}@[${userName(user)}] `;
    textArea.focus();

    setQuery('');
    updateText(textArea.value);

    mentions.add(user.pubkey);
  };

  createEffect(() => {
    if (query().length > 0) {
      search?.actions.findUsers(query());
    }
  });

  createEffect(() => {
    if (isMentioning() && textArea) {
      positionOptions(textArea?.value);
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
