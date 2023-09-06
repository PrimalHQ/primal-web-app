import { useIntl } from "@cookbook/solid-intl";
import { Router, useLocation } from "@solidjs/router";
import { nip19 } from "nostr-tools";
import { Component, createEffect, createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { createStore } from "solid-js/store";
import { noteRegex, profileRegex, Kind, editMentionRegex, emojiSearchLimit } from "../../../constants";
import { useAccountContext } from "../../../contexts/AccountContext";
import { useSearchContext } from "../../../contexts/SearchContext";
import { TranslatorProvider } from "../../../contexts/TranslatorContext";
import { getEvents } from "../../../lib/feed";
import { parseNote1, sanitize, sendNote, replaceLinkPreviews, importEvents } from "../../../lib/notes";
import { getUserProfiles } from "../../../lib/profile";
import { subscribeTo } from "../../../sockets";
import { subscribeTo as uploadSub } from "../../../uploadSocket";
import { convertToNotes, referencesToTags } from "../../../stores/note";
import { convertToUser, nip05Verification, truncateNpub, userName } from "../../../stores/profile";
import { EmojiOption, FeedPage, NostrMediaUploaded, NostrMentionContent, NostrNoteContent, NostrStatsContent, NostrUserContent, PrimalNote, PrimalUser, SendNoteResult } from "../../../types/primal";
import { debounce, isVisibleInContainer, uuidv4 } from "../../../utils";
import Avatar from "../../Avatar/Avatar";
import EmbeddedNote from "../../EmbeddedNote/EmbeddedNote";
import MentionedUserLink from "../../Note/MentionedUserLink/MentionedUserLink";
import SearchOption from "../../Search/SearchOption";
import { useToastContext } from "../../Toaster/Toaster";
import styles from './EditBox.module.scss';
import emojiSearch from '@jukben/emoji-search';
import { getCaretCoordinates } from "../../../lib/textArea";
import { uploadMedia } from "../../../lib/media";
import { APP_ID } from "../../../App";
import Loader from "../../Loader/Loader";
import {
  toast as tToast,
  feedback as tFeedback,
  note as tNote,
  search as tSearch,
  actions as tActions,
} from "../../../translations";
import { useMediaContext } from "../../../contexts/MediaContext";

type AutoSizedTextArea = HTMLTextAreaElement & { _baseScrollHeight: number };


const EditBox: Component<{
  replyToNote?: PrimalNote,
  onClose?: () => void,
  onSuccess?: (note: SendNoteResult) => void,
  idPrefix?: string,
} > = (props) => {

  const intl = useIntl();
  const media = useMediaContext();

  const instanceId = uuidv4();

  const search = useSearchContext();
  const account = useAccountContext();
  const toast = useToastContext();

  let textArea: HTMLTextAreaElement | undefined;
  let textPreview: HTMLDivElement | undefined;
  let mentionOptions: HTMLDivElement | undefined;
  let emojiOptions: HTMLDivElement | undefined;
  let editWrap: HTMLDivElement | undefined;
  let fileUpload: HTMLInputElement | undefined;

  let mentionCursorPosition = { top: 0, left: 0, height: 0 };
  let emojiCursorPosition = { top: 0, left: 0, height: 0 };

  const [isMentioning, setMentioning] = createSignal(false);
  const [preQuery, setPreQuery] = createSignal('');
  const [query, setQuery] = createSignal('');

  const [message, setMessage] = createSignal('');
  const [parsedMessage, setParsedMessage] = createSignal('');

  const [isEmojiInput, setEmojiInput] = createSignal(false);
  const [emojiQuery, setEmojiQuery] = createSignal('');
  const [emojiResults, setEmojiResults] = createStore<EmojiOption[]>([]);
  const [firstEmojiChar, setfirstEmojiChar] = createSignal('');
  const [userRefs, setUserRefs] = createStore<Record<string, PrimalUser>>({});
  const [noteRefs, setNoteRefs] = createStore<Record<string, PrimalNote>>({});

  const [highlightedUser, setHighlightedUser] = createSignal<number>(0);
  const [highlightedEmoji, setHighlightedEmoji] = createSignal<number>(0);
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

    const elm = textArea as AutoSizedTextArea;
    const preview = textPreview;

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

  createEffect(() => {
    if (emojiQuery().length > emojiSearchLimit) {
      setEmojiResults(() => emojiSearch(emojiQuery()));
    }
  });


  createEffect(() => {
    if (isEmojiInput() && emojiQuery().length > emojiSearchLimit) {
      emojiPositionOptions();
    }
  });

  const onKeyDown = (e: KeyboardEvent) => {
    if (!textArea) {
      return false;
    }

    if (isUploading()) {
      return;
    }

    const mentionSeparators = ['Enter', 'Space', 'Comma'];

    if (e.code === 'Enter' && e.metaKey) {
      e.preventDefault();
      postNote();
      return false;
    }

    // Emojis are only generated when starting with ':' 
    if (!isMentioning() && !isEmojiInput() && e.key === ':') {
      emojiCursorPosition = getCaretCoordinates(textArea, textArea.selectionStart);
      // Enables searching emojis with ;, 8 etc. in the future (?)
      setfirstEmojiChar(e.key);
      setEmojiInput(true);
      return false;
    }

    if (isEmojiInput()) {

      if (e.code === 'ArrowDown') {
        e.preventDefault();
        setHighlightedEmoji(i => {
          if (emojiResults.length === 0) {
            return 0;
          }

          return i < emojiResults.length - 7 ? i + 6 : 0;
        });

        const emojiHolder = document.getElementById(`${instanceId}-${highlightedEmoji()}`);

        if (emojiHolder && emojiOptions && !isVisibleInContainer(emojiHolder, emojiOptions)) {
          emojiHolder.scrollIntoView({ block: 'end', behavior: 'smooth' });
        }

        return false;
      }

      if (e.code === 'ArrowUp') {
        e.preventDefault();
        setHighlightedEmoji(i => {
          if (emojiResults.length === 0) {
            return 0;
          }

          return i >= 6 ? i - 6 : emojiResults.length - 1;
        });

        const emojiHolder = document.getElementById(`${instanceId}-${highlightedEmoji()}`);

        if (emojiHolder && emojiOptions && !isVisibleInContainer(emojiHolder, emojiOptions)) {
          emojiHolder.scrollIntoView({ block: 'start', behavior: 'smooth' });
        }

        return false;
      }

      if (e.code === 'ArrowRight') {
        e.preventDefault();
        setHighlightedEmoji(i => {
          if (emojiResults.length === 0) {
            return 0;
          }

          return i < emojiResults.length - 1 ? i + 1 : 0;
        });

        const emojiHolder = document.getElementById(`${instanceId}-${highlightedEmoji()}`);

        if (emojiHolder && emojiOptions && !isVisibleInContainer(emojiHolder, emojiOptions)) {
          emojiHolder.scrollIntoView({ block: 'end', behavior: 'smooth' });
        }

        return false;
      }

      if (e.code === 'ArrowLeft') {
        e.preventDefault();
        setHighlightedEmoji(i => {
          if (emojiResults.length === 0) {
            return 0;
          }

          return i > 0 ? i - 1 : emojiResults.length - 1;
        });

        const emojiHolder = document.getElementById(`${instanceId}-${highlightedEmoji()}`);

        if (emojiHolder && emojiOptions && !isVisibleInContainer(emojiHolder, emojiOptions)) {
          emojiHolder.scrollIntoView({ block: 'start', behavior: 'smooth' });
        }

        return false;
      }

      if (mentionSeparators.includes(e.code)) {
        if (emojiQuery().trim().length === 0) {
          setEmojiInput(false);
          return false;
        }
        e.preventDefault();
        setEmojiResults(emojiSearch(firstEmojiChar() + emojiQuery()));
        // highlightedEmoji is always 0 here
        selectEmoji(emojiResults[highlightedEmoji()]);
        setHighlightedEmoji(0);
        return false;
      }

      const cursor = textArea.selectionStart;
      const lastEmojiTrigger = textArea.value.slice(0, cursor).lastIndexOf(':');

      if (e.code === 'Backspace') {
        setEmojiQuery(emojiQuery().slice(0, -1));

        if (lastEmojiTrigger < 0 || cursor - lastEmojiTrigger <= 1) {
          setEmojiInput(false);
          return false;
        }
      } else {
        setEmojiQuery(q => q + e.key);
        return false;
      }

      return false;
    }

    if (!isMentioning() && e.key === '@') {
      mentionCursorPosition = getCaretCoordinates(textArea, textArea.selectionStart);
      setPreQuery('');
      setQuery('');
      setMentioning(true);
      return false;
    }

    if (!isMentioning() && e.code === 'Backspace' && textArea) {
      let cursor = textArea.selectionStart;
      const textSoFar = textArea.value.slice(0, cursor);
      const lastWord = textSoFar.split(/[\s,;\n\r]/).pop();

      if (lastWord?.startsWith('@`')) {
        const index = textSoFar.lastIndexOf(lastWord);

        const newText = textSoFar.slice(0, index) + textArea.value.slice(cursor);

        setMessage(newText);
        textArea.value = newText;

        textArea.selectionEnd = index;
      }
    }

    if (isMentioning()) {

      if (e.code === 'ArrowDown') {
        e.preventDefault();
        setHighlightedUser(i => {
          if (!search?.users || search.users.length === 0) {
            return 0;
          }

          return i < search.users.length - 1 ? i + 1 : 0;
        });
        return false;
      }

      if (e.code === 'ArrowUp') {
        e.preventDefault();
        setHighlightedUser(i => {
          if (!search?.users || search.users.length === 0) {
            return 0;
          }

          return i > 0 ? i - 1 : search.users.length - 1;
        });
        return false;
      }

      if (mentionSeparators.includes(e.code)) {
        if (preQuery() === ' ') {
          setMentioning(false);
          return false;
        }
        e.preventDefault();
        search?.users && selectUser(search.users[highlightedUser()])
        setMentioning(false);
        return false;
      }

      const cursor = textArea.selectionStart;
      const lastMentionTrigger = textArea.value.slice(0, cursor).lastIndexOf('@');

      if (e.code === 'Backspace') {
        setPreQuery(preQuery().slice(0, -1));

        if (lastMentionTrigger < 0 || cursor - lastMentionTrigger <= 1) {
          setMentioning(false);
          return false;
        }
      } else {
        setPreQuery(q => q + e.key);
        return false
      }

      return false;
    }

    return true;
  };

  const [isDroppable, setIsDroppable] = createSignal(false);

  const onDrop  = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsDroppable(false);

    let draggedData = e.dataTransfer;
    let file = draggedData?.files[0];


    file && isSupportedFileType(file) && uploadFile(file);

  };

  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsDroppable(true);
  }

  const onDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!editWrap) {
      return;
    }

    const rect = editWrap.getBoundingClientRect();

    const isWider = e.clientX < rect.x || e.clientX > rect.x + rect.width;
    const isTaller = e.clientY < rect.y || e.clientY > rect.y + rect.height;

    (isWider || isTaller) && setIsDroppable(false);
  }

  const onPaste = (e:ClipboardEvent) => {
    if (e.clipboardData?.files && e.clipboardData.files.length > 0) {
      e.preventDefault();
      const file = e.clipboardData.files[0];
      file && isSupportedFileType(file) && uploadFile(file);
      return false;
    }
  }

  onMount(() => {
    // @ts-expect-error TODO: fix types here
    editWrap?.addEventListener('input', onExpandableTextareaInput);
    editWrap?.addEventListener('keydown', onKeyDown);
    // editWrap?.addEventListener('drop', onDrop, false);
  });

  onCleanup(() => {
    // @ts-expect-error TODO: fix types here
    editWrap?.removeEventListener('input', onExpandableTextareaInput);
    editWrap?.removeEventListener('keydown', onKeyDown);
    // editWrap?.removeEventListener('drop', onDrop, false);
  });

  createEffect(() => {
    editWrap?.removeEventListener('keyup', onEscape);
    editWrap?.addEventListener('keyup', onEscape);
  });

  createEffect(() => {
    if (location.pathname !== currentPath) {
      closeEditor();
    }
  })

  createEffect(() => {
    const preQ = preQuery();

    debounce(() => {
      setQuery(() => preQ)
    }, 500);
  })

  createEffect(() => {
    if (account?.quotedNote && textArea) {
      setMessage((msg) => `${msg}${account.quotedNote} `);
      textArea.value = message();
      onExpandableTextareaInput(new InputEvent('input'))
      account.actions.quoteNote(undefined);
    }
  })

  const onEscape = (e: KeyboardEvent) => {
    if (e.code === 'Escape') {
      !isMentioning() && !isEmojiInput() ?
        closeEditor() :
        closeEmojiAndMentions();
    }
  };

  const closeEditor = () => {
    setUserRefs({});
    setMessage('');
    setParsedMessage('');
    setQuery('');
    setMentioning(false);
    setEmojiInput(false);
    setEmojiQuery('')
    setEmojiResults(() => []);
    props.onClose && props.onClose();
  };

  const closeEmojiAndMentions = () => {
    setMentioning(false);
    setEmojiInput(false);
    setEmojiQuery('')
    setEmojiResults(() => []);
  };

  const postNote = async () => {
    if (!account || !account.hasPublicKey() || isUploading() || isInputting()) {
      return;
    }

    // if (Object.keys(account.relaySettings).length === 0) {
    //   toast?.sendWarning(
    //     intl.formatMessage(tToast.noRelays),
    //   );
    //   return;
    // }

    if (account.relays.length === 0) {
      toast?.sendWarning(
        intl.formatMessage(tToast.noRelaysConnected),
      );
      return;
    }

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

      const { success, reasons, note } = await sendNote(messageToSend, account.relays, tags, account.relaySettings);

      if (success) {

        const importId = `import_note_${APP_ID}`;

        const unsub = subscribeTo(importId, (type, _, response) => {
          console.log('IMPORTED: ', type, response)

          if (type === 'EOSE') {
            if (note) {
              toast?.sendSuccess(intl.formatMessage(tToast.publishNoteSuccess));
              props.onSuccess && props.onSuccess({ success, reasons, note });
              closeEditor();
            }
            unsub();
          }
        });

        note && importEvents([note], importId);

        return;
      }

      if (reasons?.includes('no_extension')) {
        toast?.sendWarning(intl.formatMessage(tToast.noExtension));
        return;
      }

      if (reasons?.includes('timeout')) {
        toast?.sendWarning(intl.formatMessage(tToast.publishNoteTimeout));
        return;
      }

      toast?.sendWarning(intl.formatMessage(tToast.publishNoteFail));
      return;
    }

    closeEditor();
  };

  const mentionPositionOptions = () => {
    if (!textArea || !mentionOptions || !editWrap) {
      return;
    }

    const taRect = textArea.getBoundingClientRect();
    const wRect = editWrap.getBoundingClientRect();

    let newTop = taRect.top - wRect.top + mentionCursorPosition.top + 22;
    let newLeft = mentionCursorPosition.left + 16;

    if (newTop > document.documentElement.clientHeight - 200) {
      newTop = taRect.top - 400;
    }

    mentionOptions.style.top = `${newTop}px`;
    mentionOptions.style.left = `${newLeft}px`;
  };

  const emojiPositionOptions = () => {
    if (!textArea || !emojiOptions || !editWrap) {
      return;
    }

    const taRect = textArea.getBoundingClientRect();
    const wRect = editWrap.getBoundingClientRect();

    let newTop = taRect.top - wRect.top + emojiCursorPosition.top + 22;
    let newLeft = emojiCursorPosition.left;

    if (newTop > document.documentElement.clientHeight - 200) {
      newTop = taRect.top - 400;
    }

    emojiOptions.style.top = `${newTop}px`;
    emojiOptions.style.left = `${newLeft}px`;
  };

  const highlightHashtags = (text: string) => {
    const regex = /(?:\s|^)#[^\s!@#$%^&*(),.?":{}|<>]+/ig;

    return text.replace(regex, (token) => {
      const [space, term] = token.split('#');
      const embeded = (
        <span>
          {space}
          <span class={styles.userReference}>
            #{term}
          </span>
        </span>
      );

      // @ts-ignore
      return embeded.outerHTML;
    });
  }

  const parseUserMentions = (text: string) => {
    return text.replace(editMentionRegex, (url) => {
      const [_, name] = url.split('\`');
      const user = Object.values(userRefs).find(ref => userName(ref) === name);

      const link = user ?
        MentionedUserLink({ user, openInNewTab: true}) :
        <span class='linkish'> @{name}</span>;

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
          <a href={`${window.location.origin}/p/${user.npub}`} target="_blank" class='linkish'>@{userName(user)}</a> :
          <a href={`${window.location.origin}/p/${id}`} target="_blank" class='linkish'>@{truncateNpub(id)}</a>;

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


  const parseForReferece = async (value: string) => {
    const content = await replaceLinkPreviews(
      parseUserMentions(
        highlightHashtags(
          parseNote1(value, media?.actions.getMediaUrl)
        )
      )
    );

    parseNpubLinks(content);
    parseNoteLinks(content);

    return content;
  };

  const [isInputting, setIsInputting] = createSignal(false);

  const onInput = (e: InputEvent) => {
    if (isUploading()) {
      e.preventDefault();
      return false;
    }
    setIsInputting(true);

    // debounce(() => {
      setIsInputting(false);
      textArea && setMessage(textArea.value)
    // }, 500)
  };

  let delayForMedia = 0;

  createEffect(() => {
    if (delayForMedia) {
      window.clearTimeout(delayForMedia);
    }
    const msg = sanitize(message());

    delayForMedia = setTimeout(async () => {
      const p = await parseForReferece(msg);
      setParsedMessage(p);
    }, 500);


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

      mentionPositionOptions();

      if (search?.users && search.users.length > 0) {
        setHighlightedUser(0);
      }
    }
  });

  createEffect(() => {
    if (isEmojiInput()) {
      emojiPositionOptions();

      if (emojiResults.length > 0) {
        setHighlightedEmoji(0);
      }
    }
  });

  const selectEmoji = (emoji: EmojiOption) => {
    if (!textArea) {
      return;
    }

    const msg = message();

    // Get cursor position to determine insertion point
    let cursor = textArea.selectionStart;

    // Get index of the token and insert emoji character
    const index = msg.slice(0, cursor).lastIndexOf(':');
    const value = msg.slice(0, index) + emoji.char + msg.slice(cursor);

    // Reset query, update message and text area value
    setMessage(value);
    textArea.value = message();

    // Calculate new cursor position
    textArea.selectionEnd = index + 1;
    textArea.focus();

    setEmojiInput(false);
    setEmojiQuery('');
    setEmojiResults(() => []);

    // Dispatch input event to recalculate UI position
    // const e = new Event('input', { bubbles: true, cancelable: true});
    // textArea.dispatchEvent(e);
  };

  const selectUser = (user: PrimalUser | undefined) => {
    if (!textArea || !user) {
      return;
    }

    setMentioning(false);

    const name = userName(user);

    setUserRefs((refs) => ({
      ...refs,
      [name]: user,
    }));

    const msg = message();

    // Get cursor position to determine insertion point
    let cursor = textArea.selectionStart;

    // Get index of the token and inster user's handle
    const index = msg.slice(0, cursor).lastIndexOf('@');
    const value = msg.slice(0, index) + `@\`${name}\`` + msg.slice(cursor);

    // Reset query, update message and text area value
    setQuery('');
    setMessage(value);
    textArea.value = message();

    textArea.focus();

    // Calculate new cursor position
    cursor = value.slice(0, cursor).lastIndexOf('@') + name.length + 3;
    textArea.selectionEnd = cursor;


    // Dispatch input event to recalculate UI position
    const e = new Event('input', { bubbles: true, cancelable: true});
    textArea.dispatchEvent(e);
  };

  const focusInput = () => {
    textArea && textArea.focus();
  };

  const prefix = () => props.idPrefix ?? '';

  const insertAtCursor = (text: string) => {
    if (!textArea) {
      return;
    }

    const msg = message();

    const cursor = textArea.selectionStart;

    const value = msg.slice(0, cursor) + `${text}` + msg.slice(cursor);

    setMessage(() => value);
    textArea.value = value;

    textArea.focus();
  };

  const [isUploading, setIsUploading] = createSignal(false);

  const isSupportedFileType = (file: File) => {
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      toast?.sendWarning(intl.formatMessage(tToast.fileTypeUpsupported));
      return false;
    }

    return true;

  }

  const onUpload = () => {
    if (!fileUpload) {
      return;
    }

    const file = fileUpload.files ? fileUpload.files[0] : null;

    // @ts-ignore fileUpload.value assignment
    file && isSupportedFileType(file) && uploadFile(file, () => fileUpload.value = null);

  }

  const uploadFile = (file: File, callback?: () => void) => {
    setIsUploading(true);

    const reader = new FileReader();

    reader.onload = (e) => {
      if (!e.target?.result) {
        return;
      }

      const subid = `upload_${APP_ID}`;

      const data = e.target?.result as string;

      const unsub = uploadSub(subid, (type, subId, content) => {

        if (type === 'EVENT') {
          if (!content) {
            return;
          }

          if (content.kind === Kind.Uploaded) {
            const uploaded = content as NostrMediaUploaded;

            insertAtCursor(uploaded.content);
            return;
          }
        }

        if (type === 'NOTICE') {
          setIsUploading(false);
          unsub();
          return;
        }

        if (type === 'EOSE') {
          setIsUploading(false);
          unsub();
          return;
        }
      });

      uploadMedia(account?.publicKey, subid, data);
    }

    reader.readAsDataURL(file);

    callback && callback();
  }

  return (
    <div
      class={styles.noteEditBox}
      ref={editWrap}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
    >
      <Show when={isDroppable()}>
        <div
          class={styles.dropOverlay}
        >
          {intl.formatMessage(tFeedback.dropzone)}
        </div>
      </Show>

      <Show when={isUploading()}>
        <div class={styles.uploadLoader}>
          <div>
            <Loader />
          </div>
          <div>{intl.formatMessage(tFeedback.uploading)}</div>
        </div>
      </Show>

      <div class={styles.editorWrap} onClick={focusInput}>
        <div>
          <textarea
            id={`${prefix()}new_note_text_area`}
            rows={1}
            data-min-rows={1}
            onInput={onInput}
            ref={textArea}
            onPaste={onPaste}
            readOnly={isUploading()}
          >
          </textarea>
          <div
            class={styles.previewCaption}>
            {intl.formatMessage(tNote.newPreview)}
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
          class={styles.searchSuggestions}
          ref={mentionOptions}
        >
          <For each={search?.users}>
            {(user, index) => (
              <SearchOption
                title={userName(user)}
                description={nip05Verification(user)}
                icon={<Avatar src={user.picture} size="xs" />}
                statNumber={search?.scores[user.pubkey]}
                statLabel={intl.formatMessage(tSearch.followers)}
                onClick={() => selectUser(user)}
                highlighted={highlightedUser() === index()}
              />
            )}
          </For>
        </div>
      </Show>

      <Show when={isEmojiInput() && emojiQuery().length > emojiSearchLimit && emojiResults.length > 0}>
        <div
          class={styles.emojiSuggestions}
          ref={emojiOptions}
        >
          <For each={emojiResults}>
            {(emoji, index) => (
              <button
              id={`${instanceId}-${index()}`}
              class={`${styles.emojiOption} ${highlightedEmoji() === index() ? styles.highlight : ''}`}
              onClick={() => selectEmoji(emoji)}
              >
                {emoji.char}
              </button>
            )}
          </For>
        </div>
      </Show>

      <div class={styles.controls}>
        <div class={styles.editorOptions}>
          <input
            id={`upload-${instanceId}`}
            type="file"
            onChange={onUpload}
            ref={fileUpload}
            hidden={true}
            accept="image/*,video/*,audio/*"
          />
          <label for={`upload-${instanceId}`} class={`attach_icon ${styles.attachIcon}`}>
          </label>
        </div>
        <button
          class={styles.primaryButton}
          onClick={postNote}
        >
          <span>
            {intl.formatMessage(tActions.notePostNew)}
          </span>
        </button>
        <button class={styles.secondaryButton} onClick={closeEditor}>
          <div>
            <span>
              {intl.formatMessage(tActions.cancel)}
            </span>
          </div>
        </button>
      </div>
    </div>
  )
}

export default EditBox;
