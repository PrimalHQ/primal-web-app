import { IntlProvider, useIntl } from "@cookbook/solid-intl";
import { A, Router } from "@solidjs/router";
import { nip19, parseReferences } from "nostr-tools";
import { Component, createEffect, createSignal, For, JSXElement, onCleanup, onMount, Show } from "solid-js";
import { createStore } from "solid-js/store";
import { style } from "solid-js/web";
import { noteRegex, profileRegex, Kind } from "../../../constants";
import { useAccountContext } from "../../../contexts/AccountContext";
import { useSearchContext } from "../../../contexts/SearchContext";
import { TranslatorProvider } from "../../../contexts/TranslatorContext";
import { getEvents, getThread } from "../../../lib/feed";
import { hexToNpub } from "../../../lib/keys";
import { parseNote1, sendNote } from "../../../lib/notes";
import { subscribeTo } from "../../../sockets";
import { convertToNotes, referencesToTags } from "../../../stores/note";
import { truncateNpub } from "../../../stores/profile";
import { FeedPage, NostrMentionContent, NostrNoteContent, NostrStatsContent, NostrUserContent, PrimalNote, PrimalUser } from "../../../types/primal";
import { debounce } from "../../../utils";
import Avatar from "../../Avatar/Avatar";
import EmbeddedNote from "../../EmbeddedNote/EmbeddedNote";
import SearchOption from "../../Search/SearchOption";
import { useToastContext } from "../../Toaster/Toaster";
import styles from './EditBox.module.scss';

type Reference = {
  type: 'user',
  content: PrimalUser,
} | { type: 'note', content: PrimalNote };

type AutoSizedTextArea = HTMLTextAreaElement & { _baseScrollHeight: number };



const EditBox: Component = () => {

  const intl = useIntl();

  const search = useSearchContext();
  const account = useAccountContext();
  const toast = useToastContext();

  let textArea: HTMLTextAreaElement | undefined;
  let textPreview: HTMLDivElement | undefined;
  let mentionOptions: HTMLDivElement | undefined;

  const [isMentioning, setMentioning] = createSignal(false);
  const [query, setQuery] = createSignal('');
  const [message, setMessage] = createSignal('');
  const [parsedMessage, setParsedMessage] = createSignal('');

  const [userRefs, setUserRefs] = createStore<Record<string, PrimalUser>>({});
  const [noteRefs, setNoteRefs] = createStore<Record<string, PrimalNote>>({});

  const [referencedNotes, setReferencedNotes] = createStore<Record<string, FeedPage>>();


  const getScrollHeight = (elm: AutoSizedTextArea) => {
    var savedValue = elm.value
    elm.value = ''
    elm._baseScrollHeight = elm.scrollHeight
    elm.value = savedValue
  }

  const onExpandableTextareaInput: (event: InputEvent) => void = (event) => {
    const maxHeight = document.documentElement.clientHeight || window.innerHeight || 0;

    const elm = event.target as AutoSizedTextArea;

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

  onMount(() => {
    // @ts-expect-error TODO: fix types here
    document.addEventListener('input', onExpandableTextareaInput);
  });

  onCleanup(() => {
    // @ts-expect-error TODO: fix types here
    document.removeEventListener('input', onExpandableTextareaInput);
  });

  const closeNewNote = () => {
    account?.actions?.hideNewNoteForm();
    setUserRefs({});
    setMessage('');
    setParsedMessage('');
    setQuery('');
  };

  const postNote = async () => {
    const value = message();

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

  const checkForMentioning = (value: string) => {
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

  const highlightHashtags = (text: string) => {
    const regex = /(?:\s|^)#[^\s!@#$%^&*(),.?":{}|<>]+/ig;

    return text.replace(regex, (token) => {
      const embeded = (
        <span class={styles.userReference}>
          {token}
        </span>
      );

      // @ts-ignore
      return embeded.outerHTML;
    });
  }


  const parseNpubLinks = (text: string) => {

    return text.replace(profileRegex, (url) => {
      const [_, id] = url.split(':');

      if (!id) {
        return url;
      }

      try {
        const profileId = nip19.decode(id).data as string | nip19.ProfilePointer;

        const hex = typeof profileId === 'string' ? profileId : profileId.pubkey;
        const npub = hexToNpub(hex);

        const user = userRefs[npub];

        const link = user ?
          <span class='linkish'>@{userName(user)}</span> :
          <span class='linkish'>@{truncateNpub(npub)}</span>;

        // @ts-ignore
        return link.outerHTML || url;
      } catch (e) {
        return `<span class="${styles.error}">${url}</span>`;
      }
    });

  };

  const parseNoteLinks = (text: string) => {
    let refs = [];
    let match;

    while((match = noteRegex.exec(text)) !== null) {
      refs.push(match[1]);
    }

    refs.forEach(id => {
      if (noteRefs[id]) {
        setTimeout(() => {
          subNoteRef(id);
        }, 0);
        return;
      }

      const eventId = nip19.decode(id).data as string | nip19.EventPointer;
      const hex = typeof eventId === 'string' ? eventId : eventId.id;

      setReferencedNotes(`nn_${id}`, { messages: [], users: {}, postStats: {}, mentions: {} })

      const unsub = subscribeTo(`nn_${id}`, (type, subId, content) =>{
        if (type === 'EOSE') {
          const newNote = convertToNotes(referencedNotes[subId])[0];

          setNoteRefs((refs) => ({
            ...refs,
            [newNote.post.noteId]: newNote
          }));

          subNoteRef(newNote.post.noteId);

          unsub();
          return;
        }

        if (type === 'EVENT') {
          if (!content) {
            return;
          }

          if (content.kind === Kind.Metadata) {
            const user = content as NostrUserContent;

            setReferencedNotes(subId, 'users', (usrs) => ({ ...usrs, [user.pubkey]: { ...user } }));
            return;
          }

          if ([Kind.Text, Kind.Repost].includes(content.kind)) {
            const message = content as NostrNoteContent;

            setReferencedNotes(subId, 'messages',
              (msgs) => [ ...msgs, { ...message }]
            );

            return;
          }

          if (content.kind === Kind.NoteStats) {
            const statistic = content as NostrStatsContent;
            const stat = JSON.parse(statistic.content);

            setReferencedNotes(subId, 'postStats',
              (stats) => ({ ...stats, [stat.event_id]: { ...stat } })
            );
            return;
          }

          if (content.kind === Kind.Mentions) {
            const mentionContent = content as NostrMentionContent;
            const mention = JSON.parse(mentionContent.content);

            setReferencedNotes(subId, 'mentions',
              (mentions) => ({ ...mentions, [mention.id]: { ...mention } })
            );
            return;
          }
        }
      });


      getEvents(account?.publicKey, [hex], `nn_${id}`, true);

    });

  };

  const subNoteRef = (noteId: string) => {

    const parsed = parsedMessage().replace(noteRegex, (url) => {
      const [_, id] = url.split(':');

      if (!id || id !== noteId) {
        return url;
      }
      try {
        const note = noteRefs[id]

        const link = note ?
          <div>
            <TranslatorProvider>
              <Router>
                <EmbeddedNote
                  note={note}
                  mentionedUsers={note.mentionedUsers || {}}
                  includeEmbeds={true}
                />
              </Router>
            </TranslatorProvider>
          </div> :
          <span class="linkish">{url}</span>;

        // @ts-ignore
        return link.outerHTML || url;
      } catch (e) {
        console.log('ERROR: ', e);
        return `<span class="${styles.error}">${url}</span>`;
      }

    });

    setParsedMessage(parsed);

  };


  const parseForReferece = (value: string) => {
    const content = parseNpubLinks(highlightHashtags(parseNote1(value)));

    parseNoteLinks(content);

    return content;
  }

  const onInput = (e: InputEvent) => {
    if (!textArea) {
      return;
    }

    debounce(() => {
      textArea && setMessage(textArea.value)
    }, 300);
  };

  createEffect(() => {
    const msg = message();

    checkForMentioning(msg);

    const p = parseForReferece(msg);

    setParsedMessage(p);

  })

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

  const setCursor = () => {
    const el = document.getElementById('new_note_text_area');
    const selection = window.getSelection();
    const range = document.createRange();

    if (!selection || !el) {
      return;
    }

    selection.removeAllRanges();
    range.selectNodeContents(el);
    range.collapse(false);
    selection.addRange(range);
    el.focus();
  };

  const selectUser = (user: PrimalUser) => {
    if (!textArea) {
      return;
    }

    setUserRefs((refs) => ({
      ...refs,
      [user.npub]: user,
    }));

    let value = message();

    value = value.slice(0, value.lastIndexOf('@'));

    setQuery('');

    setMessage(`${value}nostr:${user.npub} `);
    textArea.value = message();
    textArea.focus();


    // Dispatch input event to recalculate UI position
    const e = new Event('input', { bubbles: true, cancelable: true});
    textArea.dispatchEvent(e);
  };

  const focusInput = () => {
    textArea && textArea.focus();
  };

  return (
    <div class={styles.noteEditBox}>
      <div class={styles.editorWrap} onClick={focusInput}>
        <textarea
          id="new_note_text_area"
          rows={1}
          data-min-rows={1}
          onInput={onInput}
          ref={textArea}
        >
        </textarea>
        <div class={styles.previewCaption}>
          {intl.formatMessage({
            id: 'note.new.preview',
            defaultMessage: 'Note preview',
            description: 'Caption for preview when creating a new note'
          })}
        </div>
        <div
          id="new_note_text_preview"
          class={styles.editor}
          ref={textPreview}
          innerHTML={parsedMessage()}
        ></div>
      </div>

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
  )
}

export default EditBox;
