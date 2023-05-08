import { useIntl } from "@cookbook/solid-intl";
import { Component, createEffect, createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { createStore } from "solid-js/store";
import { useAccountContext } from "../../contexts/AccountContext";
import { useSearchContext } from "../../contexts/SearchContext";
import { hexToNpub } from "../../lib/keys";
import { sendNote } from "../../lib/notes";
import { truncateNpub } from "../../stores/profile";
import { PrimalUser } from "../../types/primal";
import { debounce } from "../../utils";
import Avatar from "../Avatar/Avatar";
import SearchOption from "../Search/SearchOption";
import { useToastContext } from "../Toaster/Toaster";
import styles from  "./NewNote.module.scss";

const NewNote: Component = () => {

  const intl = useIntl();

  const search = useSearchContext();

  let textArea: HTMLTextAreaElement | undefined;
  let mentionOptions: HTMLDivElement | undefined;

  const [isMentioning, setMentioning] = createSignal(false);
  const [query, setQuery] = createSignal('');

  let mentions = new Set<string>();

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

  // const onClickOutside = (e: MouseEvent) => {
  //   if (
  //     !document?.getElementById('new_note_holder')?.contains(e.target as Node) &&
  //     !document?.getElementById('mention-auto')?.contains(e.target as Node)
  //   ) {
  //     account?.actions?.hideNewNoteForm();
  //   }
  // }

  // createEffect(() => {
  //   if (account?.showNewNoteForm) {
  //     document.addEventListener('click', onClickOutside);
  //   }
  //   else {
  //     document.removeEventListener('click', onClickOutside);
  //   }
  // });

  onMount(() => {
    // @ts-expect-error TODO: fix types here
    document.addEventListener('input', onExpandableTextareaInput);
  });

  onCleanup(() => {
    // @ts-expect-error TODO: fix types here
    document.removeEventListener('input', onExpandableTextareaInput);

    mentions = new Set<string>();
  });

  const closeNewNote = () => {
    mentions = new Set<string>();
    account?.actions?.hideNewNoteForm()
  };

  const encodeMentions = (value: string) => {
    const regex = /@[^\s!@#$%^&*(),.?":{}|<>]+/ig;

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

    if (account) {
      const tags = Array.from(mentions).map(pk => ['p', pk]);
      const success = await sendNote(encoded, account.relays, tags);

      if (success) {
        toast?.sendSuccess('Message posted successfully');
      }
      else {
        toast?.sendWarning('Failed to send message');
      }
    }

    closeNewNote();
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

    textArea.value = `${value}@${user.npub} `;
    textArea.focus();

    setQuery('');
    updateText(textArea.value);

    mentions.add(user.pubkey);
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
              <textarea
                id="new_note_text_area"
                rows={1}
                data-min-rows={1}
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
