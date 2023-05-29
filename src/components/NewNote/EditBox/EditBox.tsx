import { useIntl } from "@cookbook/solid-intl";
import { Router, useLocation } from "@solidjs/router";
import { nip19 } from "nostr-tools";
import { Component, createEffect, createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { createStore } from "solid-js/store";
import { noteRegex, profileRegex, Kind, editMentionRegex } from "../../../constants";
import { useAccountContext } from "../../../contexts/AccountContext";
import { useSearchContext } from "../../../contexts/SearchContext";
import { TranslatorProvider } from "../../../contexts/TranslatorContext";
import { getEvents } from "../../../lib/feed";
import { parseNote1, sendNote } from "../../../lib/notes";
import { getUserProfiles } from "../../../lib/profile";
import { subscribeTo } from "../../../sockets";
import { convertToNotes, referencesToTags } from "../../../stores/note";
import { convertToUser, truncateNpub, userName } from "../../../stores/profile";
import { FeedPage, NostrMentionContent, NostrNoteContent, NostrStatsContent, NostrUserContent, PrimalNote, PrimalUser } from "../../../types/primal";
import { debounce } from "../../../utils";
import Avatar from "../../Avatar/Avatar";
import EmbeddedNote from "../../EmbeddedNote/EmbeddedNote";
import SearchOption from "../../Search/SearchOption";
import { useToastContext } from "../../Toaster/Toaster";
import styles from './EditBox.module.scss';

type AutoSizedTextArea = HTMLTextAreaElement & { _baseScrollHeight: number };

const EditBox: Component<{ replyToNote?: PrimalNote, onClose?: () => void, idPrefix?: string } > = (props) => {

  const intl = useIntl();

  const search = useSearchContext();
  const account = useAccountContext();
  const toast = useToastContext();

  let textArea: HTMLTextAreaElement | undefined;
  let textPreview: HTMLDivElement | undefined;
  let mentionOptions: HTMLDivElement | undefined;
  let editWrap: HTMLDivElement | undefined;

  const [isMentioning, setMentioning] = createSignal(false);
  const [query, setQuery] = createSignal('');
  const [message, setMessage] = createSignal('');
  const [parsedMessage, setParsedMessage] = createSignal('');

  const [userRefs, setUserRefs] = createStore<Record<string, PrimalUser>>({});
  const [noteRefs, setNoteRefs] = createStore<Record<string, PrimalNote>>({});

  const [referencedNotes, setReferencedNotes] = createStore<Record<string, FeedPage>>();

  const location = useLocation();

  let currentPath = location.pathname;

  const getScrollHeight = (elm: AutoSizedTextArea) => {
    var savedValue = elm.value
    elm.value = ''
    elm._baseScrollHeight = elm.scrollHeight
    elm.value = savedValue
  }

  const onExpandableTextareaInput: (event: InputEvent) => void = (event) => {
    const maxHeight = document.documentElement.clientHeight || window.innerHeight || 0;

    const elm = event.target as AutoSizedTextArea;
    const preview = document.getElementById(`${prefix()}new_note_text_preview`);

    if(elm.nodeName !== 'TEXTAREA' || elm.id !== `${prefix()}new_note_text_area` || !preview) {
      return;
    }

    const minRows = parseInt(elm.getAttribute('data-min-rows') || '0');

    !elm._baseScrollHeight && getScrollHeight(elm);


    if (elm.scrollHeight >= (maxHeight / 3)) {
      return;
    }

    elm.rows = minRows;
    const rows = Math.ceil((elm.scrollHeight - elm._baseScrollHeight) / 20);
    elm.rows = minRows + rows;

    const rect = elm.getBoundingClientRect();

    preview.style.maxHeight = `${maxHeight - rect.height - 120}px`;
  }

  onMount(() => {
    // @ts-expect-error TODO: fix types here
    document.addEventListener('input', onExpandableTextareaInput);
  });

  onCleanup(() => {
    // @ts-expect-error TODO: fix types here
    document.removeEventListener('input', onExpandableTextareaInput);
  });

  createEffect(() => {
    document.removeEventListener('keyup', onEscape);
    document.addEventListener('keyup', onEscape);
  });

  createEffect(() => {
    if (location.pathname !== currentPath) {
      closeEditor();
    }
  })

  const onEscape = (e: KeyboardEvent) => {
    if (e.code === 'Escape') {
      closeEditor();
    }
  };

  const closeEditor = () => {
    setUserRefs({});
    setMessage('');
    setParsedMessage('');
    setQuery('');
    props.onClose && props.onClose();
  };

  const postNote = async () => {
    const value = message();

    if (value.trim() === '') {
      return;
    }

    const messageToSend = value.replace(editMentionRegex, (url) => {

      const [_, name] = url.split('\`');
      const user = userRefs[name];

      // @ts-ignore
      return ` nostr:${user.npub}`;
    })

    if (account) {
      const tags = referencesToTags(messageToSend);

      if (props.replyToNote) {
        tags.push(['e', props.replyToNote.post.id, '', 'reply']);
        tags.push(['p', props.replyToNote.post.pubkey]);
      }

      const success = await sendNote(messageToSend, account.relays, tags);

      if (success) {
        toast?.sendSuccess('Message posted successfully');
      }
      else {
        toast?.sendWarning('Failed to send message');
      }
    }

    closeEditor();
  };

  const positionOptions = () => {
    if (!textArea || !mentionOptions || !editWrap) {
      return;
    }

    const taRect = textArea.getBoundingClientRect();
    const wRect = editWrap.getBoundingClientRect();

    let newTop = taRect.top + taRect.height - wRect.top + 8;

    console.log('NP: ', taRect, newTop)

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

  const parseUserMentions = (text: string) => {
    return text.replace(editMentionRegex, (url) => {
      const [_, name] = url.split('\`');
      const link = <span class='linkish'> @{name}</span>;
      // @ts-ignore
      return link.outerHTML || ` @${name}`;
    });
  };


  const subUserRef = (userId: string) => {

    const parsed = parsedMessage().replace(profileRegex, (url) => {
      const [_, id] = url.split(':');

      if (!id) {
        return url;
      }

      try {
        // const profileId = nip19.decode(id).data as string | nip19.ProfilePointer;

        // const hex = typeof profileId === 'string' ? profileId : profileId.pubkey;
        // const npub = hexToNpub(hex);

        const user = userRefs[userId];

        const link = user ?
          <span class='linkish'>@{userName(user)}</span> :
          <span class='linkish'>@{truncateNpub(id)}</span>;

        // @ts-ignore
        return link.outerHTML || url;
      } catch (e) {
        return `<span class="${styles.error}">${url}</span>`;
      }
    });

    setParsedMessage(parsed);

  };

  const parseNpubLinks = (text: string) => {
    let refs = [];
    let match;

    while((match = profileRegex.exec(text)) !== null) {
      refs.push(match[1]);
    }

    refs.forEach(id => {
      if (userRefs[id]) {
        setTimeout(() => {
          subUserRef(id);
        }, 0);
        return;
      }

      const eventId = nip19.decode(id).data as string | nip19.ProfilePointer;
      const hex = typeof eventId === 'string' ? eventId : eventId.pubkey;

      // setReferencedNotes(`nn_${id}`, { messages: [], users: {}, postStats: {}, mentions: {} })

      const unsub = subscribeTo(`nu_${id}`, (type, subId, content) =>{
        if (type === 'EOSE') {
        //   // const newNote = convertToNotes(referencedNotes[subId])[0];

        //   // setNoteRefs((refs) => ({
        //   //   ...refs,
        //   //   [newNote.post.noteId]: newNote
        //   // }));

          subUserRef(hex);

          unsub();
          return;
        }

        if (type === 'EVENT') {
          if (!content) {
            return;
          }

          if (content.kind === Kind.Metadata) {
            const user = content as NostrUserContent;

            const u = convertToUser(user)

            setUserRefs(() => ({ [u.pubkey]: u }));

            // setReferencedNotes(subId, 'users', (usrs) => ({ ...usrs, [user.pubkey]: { ...user } }));
            return;
          }
        }
      });


      getUserProfiles([hex], `nu_${id}`);

    });

  }

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

  const replaceLinkPreviews = (text: string) => {
    let parsed = text;

    const regex = /__LINK__.*?__LINK__/ig;

    parsed = parsed.replace(regex, (link) => {
      const url = link.split('__LINK__')[1];

      return `<a link href="${url}" target="_blank" >${url}</a>`;

    });

    return parsed;
  }


  const parseForReferece = (value: string) => {
    const content = replaceLinkPreviews(parseUserMentions(highlightHashtags(parseNote1(value))));

    parseNpubLinks(content);
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

  const selectUser = (user: PrimalUser) => {
    if (!textArea) {
      return;
    }

    const name = userName(user);

    setUserRefs((refs) => ({
      ...refs,
      [name]: user,
    }));

    let value = message();

    value = value.slice(0, value.lastIndexOf('@'));

    setQuery('');

    setMessage(`${value}@\`${name}\` `);
    textArea.value = message();
    textArea.focus();


    // Dispatch input event to recalculate UI position
    const e = new Event('input', { bubbles: true, cancelable: true});
    textArea.dispatchEvent(e);
  };

  const focusInput = () => {
    textArea && textArea.focus();
  };

  const prefix = () => props.idPrefix ?? '';

  return (
    <div class={styles.noteEditBox} ref={editWrap}>
      <div class={styles.editorWrap} onClick={focusInput}>
        <div>
          <textarea
            id={`${prefix()}new_note_text_area`}
            rows={1}
            data-min-rows={1}
            onInput={onInput}
            ref={textArea}
          >
          </textarea>
          <div
            class={styles.previewCaption}>
            {intl.formatMessage({
              id: 'note.new.preview',
              defaultMessage: 'Note preview',
              description: 'Caption for preview when creating a new note'
            })}
          </div>
        </div>
        <div
          class={styles.editorScroll}
          id={`${prefix()}new_note_text_preview`}
        >
          <div
            class={styles.editor}
            ref={textPreview}
            innerHTML={parsedMessage()}
          ></div>
        </div>
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
        <button class={styles.secondaryButton} onClick={closeEditor}>
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
