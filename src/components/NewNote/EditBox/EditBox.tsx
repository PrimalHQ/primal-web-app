import { useIntl } from "@cookbook/solid-intl";
import { Router, useLocation } from "@solidjs/router";
import { nip19 } from "nostr-tools";
import { Component, createEffect, createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { createStore, reconcile, unwrap } from "solid-js/store";
import { noteRegex, profileRegex, Kind, editMentionRegex, emojiSearchLimit, profileRegexG } from "../../../constants";
import { useAccountContext } from "../../../contexts/AccountContext";
import { useSearchContext } from "../../../contexts/SearchContext";
import { TranslatorProvider } from "../../../contexts/TranslatorContext";
import { getEvents } from "../../../lib/feed";
import { parseNote1, sanitize, sendNote, replaceLinkPreviews, importEvents } from "../../../lib/notes";
import { getUserProfiles } from "../../../lib/profile";
import { subscribeTo } from "../../../sockets";
import { convertToNotes, referencesToTags } from "../../../stores/note";
import { convertToUser, nip05Verification, truncateNpub, userName } from "../../../stores/profile";
import { EmojiOption, FeedPage, NostrMentionContent, NostrNoteContent, NostrStatsContent, NostrUserContent, PrimalNote, PrimalUser, SendNoteResult } from "../../../types/primal";
import { debounce, getScreenCordinates, isVisibleInContainer, uuidv4 } from "../../../utils";
import Avatar from "../../Avatar/Avatar";
import EmbeddedNote from "../../EmbeddedNote/EmbeddedNote";
import MentionedUserLink from "../../Note/MentionedUserLink/MentionedUserLink";
import SearchOption from "../../Search/SearchOption";
import { useToastContext } from "../../Toaster/Toaster";
import styles from './EditBox.module.scss';
import emojiSearch from '@jukben/emoji-search';
import { getCaretCoordinates } from "../../../lib/textArea";
import { APP_ID } from "../../../App";
import {
  toast as tToast,
  feedback as tFeedback,
  note as tNote,
  search as tSearch,
  actions as tActions,
  upload as tUpload,
} from "../../../translations";
import { useMediaContext } from "../../../contexts/MediaContext";
import { hookForDev } from "../../../lib/devTools";
import ButtonPrimary from "../../Buttons/ButtonPrimary";
import ButtonSecondary from "../../Buttons/ButtonSecondary";
import { useProfileContext } from "../../../contexts/ProfileContext";
import ButtonGhost from "../../Buttons/ButtonGhost";
import EmojiPickPopover from "../../EmojiPickModal/EmojiPickPopover";
import ConfirmAlternativeModal from "../../ConfirmModal/ConfirmAlternativeModal";
import { readNoteDraft, readNoteDraftUserRefs, saveNoteDraft, saveNoteDraftUserRefs } from "../../../lib/localStore";
import Uploader from "../../Uploader/Uploader";
import { logError } from "../../../lib/logger";

type AutoSizedTextArea = HTMLTextAreaElement & { _baseScrollHeight: number };


const EditBox: Component<{
  id?: string,
  replyToNote?: PrimalNote,
  onClose?: () => void,
  onSuccess?: (note: SendNoteResult) => void,
  open?: boolean,
  idPrefix?: string,
} > = (props) => {

  const intl = useIntl();
  const media = useMediaContext();

  const instanceId = uuidv4();

  const search = useSearchContext();
  const account = useAccountContext();
  const toast = useToastContext();
  const profile = useProfileContext();

  let textArea: HTMLTextAreaElement | undefined;
  let textPreview: HTMLDivElement | undefined;
  let mentionOptions: HTMLDivElement | undefined;
  let emojiOptions: HTMLDivElement | undefined;
  let emojiPicker: HTMLDivElement | undefined;
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

  const [userRefs, setUserRefs] = createStore<Record<string, PrimalUser>>({});
  const [noteRefs, setNoteRefs] = createStore<Record<string, PrimalNote>>({});

  const [highlightedUser, setHighlightedUser] = createSignal<number>(0);
  const [highlightedEmoji, setHighlightedEmoji] = createSignal<number>(0);
  const [referencedNotes, setReferencedNotes] = createStore<Record<string, FeedPage>>();

  const [isConfirmEditorClose, setConfirmEditorClose] = createSignal(false);

  const [fileToUpload, setFileToUpload] = createSignal<File | undefined>();

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
      elm.style.height = '46vh';
      return;
    }

    elm.style.height = 'auto';

    elm.rows = minRows;
    const rows = Math.ceil((elm.scrollHeight - elm._baseScrollHeight) / 20);
    elm.rows = minRows + rows;

    // const rect = elm.getBoundingClientRect();


    // preview.style.maxHeight = `${maxHeight - rect.height - 120}px`;
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

    if (fileToUpload()) {
      return;
    }

    const previousChar = textArea.value[textArea.selectionStart - 1];

    const mentionSeparators = ['Enter', 'Space', 'Comma', 'Tab'];

    if (e.code === 'Enter' && e.metaKey) {
      e.preventDefault();
      postNote();
      return false;
    }

    if (!isMentioning() && !isEmojiInput() && e.key === ':') {
      // Ignore if `@` is a part of a word
      if (textArea.selectionStart > 0 && ![' ', '\r\n', '\r', '\n'].includes(textArea.value[textArea.selectionStart-1])) {
        return false;
      }

      emojiCursorPosition = getCaretCoordinates(textArea, textArea.selectionStart);
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

          return i < emojiResults.length - 9 ? i + 8 : 0;
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

          return i >= 8 ? i - 8 : emojiResults.length - 1;
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

      if (mentionSeparators.includes(e.code) || e.code === 'Semicolon') {
        if (emojiQuery().trim().length === 0) {
          setEmojiInput(false);
          return false;
        }
        e.preventDefault();
        emojiResults.length === 0 && setEmojiResults(emojiSearch(emojiQuery()));
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
          setEmojiQuery('');
          return false;
        }

        return false;
      }

      if (!['Shift', 'Control', 'Meta'].includes(e.key)) {
        setEmojiQuery(q => q + e.key);
        return false;
      }

      return false;
    }


    if (!isMentioning() && e.key === '@') {
      mentionCursorPosition = getCaretCoordinates(textArea, textArea.selectionStart);

      // Ignore if `@` is a part of a word
      if (textArea.selectionStart > 0 && ![' ', '\r\n', '\r', '\n'].includes(textArea.value[textArea.selectionStart-1])) {
        return false;
      }

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
      } else if (!['Shift', 'Control', 'Meta'].includes(e.key)) {
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

    file && isSupportedFileType(file) && setFileToUpload(file);

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

      file && isSupportedFileType(file) && setFileToUpload(file);
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

    if (!isPickingEmoji()) {
      editWrap?.addEventListener('keyup', onEscape);
    }
  });

  createEffect(() => {
    if (location.pathname !== currentPath) {
      clearEditor();
    }
  })

  createEffect(() => {
    const preQ = preQuery();

    debounce(() => {
      setQuery(() => preQ)
    }, 500);
  })

  const addQuote = (quote: string | undefined) => {
    setMessage((msg) => {
      if (!textArea || !quote) return msg;
      let position = textArea.selectionStart;

      const isEmptyMessage = msg.length === 0;

      const newMsg = isEmptyMessage ?
        `\r\n\r\n${quote} ` :
        msg.slice(0, position) + quote + ' ' + msg.slice(position, msg.length);


      position = isEmptyMessage ? 0 : position + quote.length + 1;

      textArea.value = newMsg;
      account?.actions.quoteNote(undefined);

      onExpandableTextareaInput(new InputEvent('input'));

      textArea?.focus();
      textArea.selectionEnd = position;
      return newMsg;
    });
  };

  createEffect(() => {
    if (props.open) {
      const draft = readNoteDraft(account?.publicKey, props.replyToNote?.post.noteId);
      const draftUserRefs = readNoteDraftUserRefs(account?.publicKey, props.replyToNote?.post.noteId);

      setUserRefs(reconcile(draftUserRefs));

      setMessage((msg) => {
        if (msg.length > 0) return msg;
        const newMsg = `${msg}${draft}`;

        if (textArea) {
          textArea.value = newMsg;
          textArea.dispatchEvent(new Event('input', { bubbles: true }));
          textArea.focus();
        }

        return newMsg;
      });

      if (account?.quotedNote) {
        addQuote(account.quotedNote);
      }

    } else {
      account?.actions.quoteNote(undefined);
    }
  })

  createEffect(() => {
    if (message().length === 0) return;

    // save draft just in case there is an unintended interuption
    saveNoteDraft(account?.publicKey, message(), props.replyToNote?.post.noteId);
    saveNoteDraftUserRefs(account?.publicKey, userRefs, props.replyToNote?.post.noteId);
  });

  const onEscape = (e: KeyboardEvent) => {
    if (isConfirmEditorClose()) return;

    e.stopPropagation();
    if (e.code === 'Escape') {
      if (isPickingEmoji()) return;

      if (isMentioning() || isEmojiInput()) {
        closeEmojiAndMentions();
        return;
      }

      closeEditor();
    }
  };

  const resetUpload = () => {
    if (fileUpload) {
      fileUpload.value = '';
    }

    setFileToUpload(undefined);
  };

  const clearEditor = () => {
    setUserRefs({});
    setMessage('');
    setParsedMessage('');
    setQuery('');
    setMentioning(false);
    setEmojiInput(false);
    setEmojiQuery('')
    setEmojiResults(() => []);

    resetUpload();

    props.onClose && props.onClose();
  };

  const closeEditor = () => {
    if (message().trim().length > 0) {
      setConfirmEditorClose(true);
      return;
    }

    saveNoteDraft(account?.publicKey, '', props.replyToNote?.post.noteId);
    saveNoteDraftUserRefs(account?.publicKey, {}, props.replyToNote?.post.noteId);
    clearEditor();
  };

  const closeEmojiAndMentions = () => {
    setMentioning(false);
    setEmojiInput(false);
    setEmojiQuery('')
    setEmojiResults(() => []);
  };

  const persistNote = (note: string) => {
    saveNoteDraft(account?.publicKey, note, props.replyToNote?.post.noteId);
    saveNoteDraftUserRefs(account?.publicKey, userRefs, props.replyToNote?.post.noteId);
    clearEditor();
  };

  const [isPostingInProgress, setIsPostingInProgress] = createSignal(false);

  const postNote = async () => {
    if (!account || !account.hasPublicKey() || fileToUpload()) {
      return;
    }

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

      const [anythingBefore, mention] = url.split('@');

      const [_, name] = mention.split('\`');
      const user = userRefs[name];

      // @ts-ignore
      return `${anythingBefore} nostr:${user.npub}`;
    });

    if (account) {
      let tags = referencesToTags(messageToSend);
      const rep = props.replyToNote;

      if (rep) {
        const rootTag = rep.post.tags.find(t => t[0] === 'e' && t[3] === 'root');

        // If the note has a root tag, that meens it is not a root note itself
        // So we need to copy the `root` tag and add a `reply` tag
        if (rootTag) {
          tags.push([...rootTag]);
          tags.push(['e', rep.post.id, '', 'reply']);
        }
        // Otherwise, add the note as the root tag for this reply
        else {
          tags.push(['e', rep.post.id, '', 'root']);
        }

        // Copy all `p` tags from the note we are repling to
        const repPeople = rep.post.tags.filter(t => t[0] === 'p');

        tags = [...tags, ...(unwrap(repPeople))];

        // If the author of the note is missing, add them
        if (!tags.find(t => t[0] === 'p' && t[1] === rep.post.pubkey)) {
          tags.push(['p', rep.post.pubkey]);
        }
      }

      setIsPostingInProgress(true);

      const { success, reasons, note } = await sendNote(messageToSend, account.relays, tags, account.relaySettings);

      if (success) {

        const importId = `import_note_${APP_ID}`;

        const unsub = subscribeTo(importId, (type, _, response) => {
          if (type === 'EOSE') {
            if (note) {
              toast?.sendSuccess(intl.formatMessage(tToast.publishNoteSuccess));
              props.onSuccess && props.onSuccess({ success, reasons, note });
              setIsPostingInProgress(false);
              saveNoteDraft(account.publicKey, '', rep?.post.noteId)
              clearEditor();
            }
            unsub();
          }
        });

        note && importEvents([note], importId);

        return;
      }

      if (reasons?.includes('no_extension')) {
        toast?.sendWarning(intl.formatMessage(tToast.noExtension));
        setIsPostingInProgress(false);
        return;
      }

      if (reasons?.includes('timeout')) {
        toast?.sendWarning(intl.formatMessage(tToast.publishNoteTimeout));
        setIsPostingInProgress(false);
        return;
      }

      toast?.sendWarning(intl.formatMessage(tToast.publishNoteFail));
      setIsPostingInProgress(false);
      return;
    }

    setIsPostingInProgress(false);
    clearEditor();
  };

  const mentionPositionOptions = () => {
    if (!textArea || !mentionOptions || !editWrap) {
      return;
    }

    const taRect = textArea.getBoundingClientRect();
    const wRect = editWrap.getBoundingClientRect();

    let mTop = mentionCursorPosition.top;

    if (textArea.scrollTop > 0) {
      mTop -= textArea.scrollTop;
    }

    let newTop = taRect.top - wRect.top + mTop + 22;
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

    let mTop = emojiCursorPosition.top;

    if (textArea.scrollTop > 0) {
      mTop -= textArea.scrollTop;
    }

    let newTop = taRect.top - wRect.top + mTop + 22;
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
      return ` ${link.outerHTML}` || ` @${name}`;
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

    while((match = profileRegexG.exec(text)) !== null) {
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
        logError('Bad Note reference: ', e);
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

  const onInput = (e: InputEvent) => {
    if (fileToUpload()) {
      e.preventDefault();
      return false;
    }

    if (textArea) {
      setMessage(textArea.value);
    }


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
    if (!textArea || !emoji) {
      setEmojiInput(false);
      setEmojiQuery('');
      setEmojiResults(() => []);
      return;
    }

    account?.actions.saveEmoji(emoji);
    const msg = message();

    // Get cursor position to determine insertion point
    let cursor = textArea.selectionStart;

    // Get index of the token and insert emoji character
    const index = msg.slice(0, cursor).lastIndexOf(':');
    const value = msg.slice(0, index) + `${emoji.name} ` + msg.slice(cursor);

    // Reset query, update message and text area value
    setMessage(value);
    textArea.value = message();

    // Calculate new cursor position
    textArea.selectionEnd = index + 3;
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
    file && isSupportedFileType(file) && setFileToUpload(file);

  }

  const [isPickingEmoji, setIsPickingEmoji] = createSignal(false);

  const addSelectedEmoji = (emoji: EmojiOption) => {
    if (!textArea || !emoji) {
      return;
    }

    account?.actions.saveEmoji(emoji);

    const msg = message();

    // Get cursor position to determine insertion point
    let cursor = textArea.selectionStart;

    // Get index of the token and insert emoji character
    const value = msg.slice(0, cursor) + `${emoji.name} ` + msg.slice(cursor);

    // Reset query, update message and text area value
    setMessage(value);
    textArea.value = message();

    // Calculate new cursor position
    textArea.selectionEnd = cursor + 3;
    textArea.focus();
  };

  const determineOrient = () => {
    const coor = getScreenCordinates(emojiPicker);
    const height = 326;
    return (coor.y || 0) + height < window.innerHeight + window.scrollY ? 'down' : 'up';
  }

  let progressFill: HTMLDivElement | undefined;

  return (
    <div
      id={props.id}
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

      <div class={styles.editorWrap} onClick={focusInput}>
        <div>
          <textarea
            id={`${prefix()}new_note_text_area`}
            rows={1}
            data-min-rows={1}
            onInput={onInput}
            ref={textArea}
            onPaste={onPaste}
            readOnly={fileToUpload() !== undefined}
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
          <div class={styles.uploader}>
            <Uploader
              publicKey={account?.publicKey}
              nip05={account?.activeUser?.nip05}
              openSockets={props.open}
              file={fileToUpload()}
              onFail={() => {
                toast?.sendWarning(intl.formatMessage(tUpload.fail, {
                  file: fileToUpload()?.name,
                }));
                resetUpload();
              }}
              onRefuse={(reason: string) => {
                if (reason === 'file_too_big_100') {
                  toast?.sendWarning(intl.formatMessage(tUpload.fileTooBigRegular));
                }
                if (reason === 'file_too_big_1024') {
                  toast?.sendWarning(intl.formatMessage(tUpload.fileTooBigPremium));
                }
                resetUpload();
              }}
              onCancel={() => {
                resetUpload();
              }}
              onSuccsess={(url:string) => {
                insertAtCursor(`${url} `);
                resetUpload();
              }}
            />
          </div>
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
                icon={<Avatar user={user} size="xs" />}
                statNumber={profile?.profileHistory.stats[user.pubkey]?.followers_count || search?.scores[user.pubkey]}
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
                {emoji.name}
              </button>
            )}
          </For>
        </div>
      </Show>

      <ConfirmAlternativeModal
        open={isConfirmEditorClose()}
        title={intl.formatMessage(tNote.saveNoteDraft.title)}
        description={intl.formatMessage(tNote.saveNoteDraft.description)}
        confirmLabel={intl.formatMessage(tNote.saveNoteDraft.optionYes)}
        abortLabel={intl.formatMessage(tNote.saveNoteDraft.optionNo)}
        cancelLabel={intl.formatMessage(tNote.saveNoteDraft.optionCancel)}
        onConfirm={() => {
          persistNote(message());
          setConfirmEditorClose(false);
        }}
        onAbort={() => {
          persistNote('');
          setConfirmEditorClose(false);
          clearEditor();
        }}
        onCancel={() => {
          setConfirmEditorClose(false);
          textArea?.focus();
        }}
      />

      <div class={styles.controls}>
        <div class={styles.editorOptions}>
          <div class={styles.editorOption}>
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
          <div class={styles.editorOption}>
            <ButtonGhost
              highlight={isPickingEmoji()}
              onClick={() => {
                setIsPickingEmoji((v) => !v);
                !isPickingEmoji() && textArea?.focus();
              }}>
              <div
                ref={emojiPicker}
                class={`emoji_icon ${styles.emojiIcon} ${isPickingEmoji() ? styles.highlight : ''}`}
              ></div>
            </ButtonGhost>

            <Show when={isPickingEmoji()}>
              <EmojiPickPopover
                onClose={() => {
                  setIsPickingEmoji(false);
                  textArea?.focus();
                }}
                onSelect={addSelectedEmoji}
                orientation={determineOrient()}
              />
            </Show>
          </div>
        </div>
        <div class={styles.editorDescision}>
          <ButtonPrimary
            onClick={postNote}
            disabled={isPostingInProgress() || fileToUpload() || message().trim().length === 0}
          >
            {intl.formatMessage(tActions.notePostNew)}
          </ButtonPrimary>
          <ButtonSecondary onClick={closeEditor}>
            {intl.formatMessage(tActions.cancel)}
          </ButtonSecondary>
        </div>
      </div>
    </div>
  )
}

export default hookForDev(EditBox);
