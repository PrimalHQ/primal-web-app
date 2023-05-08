import { useIntl } from "@cookbook/solid-intl";
import { nip19 } from "nostr-tools";
import { Component, createEffect, createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { createStore } from "solid-js/store";
import { useAccountContext } from "../../contexts/AccountContext";
import { useSearchContext } from "../../contexts/SearchContext";
import { hexToNpub } from "../../lib/keys";
import { sendNote } from "../../lib/notes";
import { referencesToTags } from "../../stores/note";
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
    if (!textArea) {
      return;
    }

    const value = textArea.value;

    if (value.trim() === '') {
      return;
    }

    if (account) {
      const tags = referencesToTags(value);
      const success = await sendNote(value, account.relays, tags);

      if (success) {
        toast?.sendSuccess('Message posted successfully');
      }
      else {
        toast?.sendWarning('Failed to send message');
      }
    }

    closeNewNote();
  };

  const positionOptions = () => {
    if (!textArea || !mentionOptions) {
      return;
    }

    const taRect = textArea.getBoundingClientRect();

    let newTop = taRect.top + taRect.height;

    if (newTop > document.documentElement.clientHeight - 200) {
      newTop = taRect.top - 400;
    }

    mentionOptions.style.top = `${newTop}px`;
    mentionOptions.style.left = '110px';
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
