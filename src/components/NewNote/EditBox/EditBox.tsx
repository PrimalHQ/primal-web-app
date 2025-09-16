import { useIntl } from "@cookbook/solid-intl";
import { Router, useLocation } from "@solidjs/router";
import { nip19 } from "../../../lib/nTools";
import { Component, createEffect, createSignal, For, Match, onCleanup, onMount, Show, Switch } from "solid-js";
import { createStore, reconcile, unwrap } from "solid-js/store";
import { noteRegex, profileRegex, Kind, editMentionRegex, emojiSearchLimit, profileRegexG, linebreakRegex, addrRegex, addrRegexG, eventRegexG, profileRegexEdit, profileRegexEditG } from "../../../constants";
import { useAccountContext } from "../../../contexts/AccountContext";
import { useSearchContext } from "../../../contexts/SearchContext";
import { TranslatorProvider } from "../../../contexts/TranslatorContext";
import { getEvents } from "../../../lib/feed";
import { parseNote1, sanitize, sendNote, replaceLinkPreviews, importEvents, getParametrizedEvent } from "../../../lib/notes";
import { getUserProfiles, getUsersRelayInfo } from "../../../lib/profile";
import { subsTo } from "../../../sockets";
import { convertToArticles, convertToLiveEvents, convertToNotes, referencesToTags } from "../../../stores/note";
import { convertToUser, emptyUser, nip05Verification, truncateNpub, userName } from "../../../stores/profile";
import { EmojiOption, FeedPage, NostrMentionContent, NostrNoteContent, NostrStatsContent, NostrUserContent, PrimalArticle, PrimalNote, PrimalUser, SendNoteResult } from "../../../types/primal";
import { debounce, getScreenCordinates, isVisibleInContainer, replaceAsync, uuidv4 } from "../../../utils";
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
import { readNoteDraft, readNoteDraftUserRefs, readSecFromStorage, saveNoteDraft, saveNoteDraftUserRefs } from "../../../lib/localStore";
import Uploader from "../../Uploader/Uploader";
import { logError } from "../../../lib/logger";
import Lnbc from "../../Lnbc/Lnbc";
import { decodeIdentifier } from "../../../lib/keys";
import { useSettingsContext } from "../../../contexts/SettingsContext";
import SimpleArticlePreview from "../../ArticlePreview/SimpleArticlePreview";
import ArticleHighlight from "../../ArticleHighlight/ArticleHighlight";
import DOMPurify from "dompurify";
import { useAppContext } from "../../../contexts/AppContext";
import UploaderBlossom from "../../Uploader/UploaderBlossom";
import ParsedNote from "../../ParsedNote/ParsedNote";
import LiveEventPreview from "../../LiveVideo/LiveEventPreview";
import { StreamingData, getStreamingEvent } from "../../../lib/streaming";
import { fetchUserProfile } from "../../../handleFeeds";

type AutoSizedTextArea = HTMLTextAreaElement & { _baseScrollHeight: number };


const EditBox: Component<{
  id?: string,
  replyToNote?: PrimalNote | PrimalArticle,
  onClose?: () => void,
  onSuccess?: (note: SendNoteResult, meta: any) => void,
  open?: boolean,
  idPrefix?: string,
  context?: string,
} > = (props) => {

  const intl = useIntl();
  const media = useMediaContext();
  const app = useAppContext();

  const instanceId = uuidv4();

  const search = useSearchContext();
  const account = useAccountContext();
  const toast = useToastContext();
  const profile = useProfileContext();
  const settings = useSettingsContext();

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
  const [articleRefs, setArticleRefs] = createStore<Record<string, PrimalArticle>>({});
  const [highlightRefs, setHighlightRefs] = createStore<Record<string, any>>({});
  const [liveEventRefs, setLiveEventRefs] = createStore<Record<string, StreamingData>>({});

  const [highlightedUser, setHighlightedUser] = createSignal<number>(0);
  const [highlightedEmoji, setHighlightedEmoji] = createSignal<number>(0);
  const [referencedNotes, setReferencedNotes] = createStore<Record<string, FeedPage>>();
  const [referencedArticles, setReferencedArticles] = createStore<Record<string, FeedPage>>();

  const [isConfirmEditorClose, setConfirmEditorClose] = createSignal(false);

  const [fileToUpload, setFileToUpload] = createSignal<File | undefined>();

  const [relayHints, setRelayHints] = createStore<Record<string, string>>({});

  const location = useLocation();

  let currentPath = location.pathname;


  const noteHasInvoice = (text: string) => {
    const r =/(\s+|\r\n|\r|\n|^)lnbc[a-zA-Z0-9]+/;
    const test = r.test(text);

    return test
  };

  const noteHasCashu = (text: string) => {
    const r =/(\s+|\r\n|\r|\n|^)cashuA[a-zA-Z0-9]+/;
    const test = r.test(text);

    return test
  };

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


  const renderMessage = () => {
    const text = DOMPurify.sanitize(parsedMessage(), {ADD_TAGS: ['iframe']});

    if (!noteHasInvoice(text)) {
      return (
        <div
          class={styles.editor}
          ref={textPreview}
          innerHTML={text}
        ></div>
      );
    };

    let sections: string[] = [];

    let content = text.replace(linebreakRegex, ' __LB__ ').replaceAll('<br>', ' __LB__ ').replace(/\s+/g, ' __SP__ ');

    let tokens: string[] = content.split(/[\s]+/);

    let sectionIndex = 0;

    tokens.forEach((tok) => {
      const t = DOMPurify.sanitize(tok);
      if (t.startsWith('lnbc')) {
        if (sections[sectionIndex]) sectionIndex++;

        sections[sectionIndex] = t;

        sectionIndex++;
      }
      else {
        let c = t;
        const prev = sections[sectionIndex] || '';

        if (t === '__SP__') {
          c = prev.length === 0 ? '' : ' ';
        }

        if (t === '__LB__') {
          c = prev.length === 0 ? '' : ' <br/>';
        }

        sections[sectionIndex] = prev + c;
      }
    });

    return (
      <div
        class={styles.editor}
        ref={textPreview}
      >
        <For each={sections}>
          {section => (
            <Switch fallback={
              <div
                innerHTML={section}
              ></div>
            }>
              <Match when={section.startsWith('lnbc')}>
                <Lnbc lnbc={section} inactive={true} />
              </Match>
            </Switch>
          )}
        </For>
      </div>
    );
  };

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
      let position = textArea.selectionStart + 2;

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
      const draft = readNoteDraft(account?.publicKey, props.replyToNote?.noteId);
      const draftUserRefs = readNoteDraftUserRefs(account?.publicKey, props.replyToNote?.noteId);

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
    saveNoteDraft(account?.publicKey, message(), props.replyToNote?.noteId);
    saveNoteDraftUserRefs(account?.publicKey, userRefs, props.replyToNote?.noteId);
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

    saveNoteDraft(account?.publicKey, '', props.replyToNote?.noteId);
    saveNoteDraftUserRefs(account?.publicKey, {}, props.replyToNote?.noteId);
    clearEditor();
  };

  const closeEmojiAndMentions = () => {
    setMentioning(false);
    setEmojiInput(false);
    setEmojiQuery('')
    setEmojiResults(() => []);
  };

  const persistNote = (note: string) => {
    saveNoteDraft(account?.publicKey, note, props.replyToNote?.noteId);
    saveNoteDraftUserRefs(account?.publicKey, userRefs, props.replyToNote?.noteId);
    clearEditor();
  };

  const [isPostingInProgress, setIsPostingInProgress] = createSignal(false);

  const postNote = async () => {
    if (!account || !account.hasPublicKey() || fileToUpload()) {
      return;
    }

    if (!account.sec || account.sec.length === 0) {
      const sec = readSecFromStorage();
      if (sec) {
        account.actions.setShowPin(sec);
        return;
      }
    }

    // if (!account.proxyThroughPrimal && account.relays.length === 0) {
    //   toast?.sendWarning(
    //     intl.formatMessage(tToast.noRelaysConnected),
    //   );
    //   return;
    // }

    const value = message();

    if (value.trim() === '') {
      return;
    }

    let userRelays = await (new Promise<Record<string, string[]>>(resolve => {
      const uids = Object.values(userRefs).map(u => u.pubkey);
      const subId = `users_relays_${APP_ID}`;

      let relays: Record<string, string[]> = {};

      const unsub = subsTo(subId, {
        onEose: () => {
          unsub();
          resolve({ ...relays });
        },
        onEvent: (_, content) => {
          if (content.kind !== Kind.UserRelays) return;

          const pk = content.pubkey || 'UNKNOWN';

          let rels: string[] = [];

          for (let i = 0; i < (content.tags || []).length; i++) {
            if (rels.length > 1) break;

            const rel = content.tags[i];
            if (rel[0] !== 'r' || rels.includes(rel[1])) continue;

            rels.push(rel[1]);
          }

          relays[pk] = [...rels];
        },
        onNotice: () => resolve({}),
      })

      getUsersRelayInfo(uids, subId);
    }));

    const messageToSend = value.replace(editMentionRegex, (url) => {

      const atIndex = url.indexOf('@');

      const anythingBefore = url.slice(0, atIndex);
      const mention = url.slice(atIndex);

      const [_, name] = mention.split('\`');
      const user = userRefs[name];

      let pInfo: nip19.ProfilePointer = { pubkey: user.pubkey };
      const relays = userRelays[user.pubkey] || [];

      if (relays.length > 0) {
        pInfo.relays = [...relays];
      }

      const nprofile = nip19.nprofileEncode(pInfo);

      // @ts-ignore
      return `${anythingBefore}nostr:${nprofile}`;
    });

    if (account) {
      let tags = referencesToTags(messageToSend, relayHints);
      const rep = props.replyToNote;

      // @ts-ignore
      if (rep && rep.naddr) {
        let rootTag = rep.msg.tags.find(t => t[0] === 'a' && t[3] === 'root');

        const rHints = (rep.relayHints && rep.relayHints[rep.id]) ?
          rep.relayHints[rep.id] :
          '';

          // @ts-ignore
          const decoded = nip19.decode(rep.naddr);

          const data = decoded.data as nip19.AddressPointer;

          const coord = `${data.kind}:${data.pubkey}:${data.identifier}`;

        // If the note has a root tag, that meens it is not a root note itself
        // So we need to copy the `root` tag and add a `reply` tag
        if (rootTag) {
          const tagWithHint = rootTag.map((v, i) => i === 2 ?
            rHints :
            v,
          );
          tags.push([...tagWithHint]);
          tags.push(['a', coord, rHints, 'reply']);
        }
        // Otherwise, add the note as the root tag for this reply
        else {
          tags.push([
            'a',
            coord,
            rHints,
            'root',
          ]);
        }

        // Copy all `p` tags from the note we are repling to
        const repPeople = rep.msg.tags.filter(t => t[0] === 'p');

        tags = [...tags, ...(unwrap(repPeople))];

        // If the author of the note is missing, add them
        if (!tags.find(t => t[0] === 'p' && t[1] === rep.pubkey)) {
          tags.push(['p', rep.pubkey]);
        }
      }

      // @ts-ignore
      if (rep && !rep.naddr) {
        let rootTag = rep.msg.tags.find(t => t[0] === 'e' && t[3] === 'root');

        const rHints = (rep.relayHints && rep.relayHints[rep.id]) ?
          rep.relayHints[rep.id] :
          '';

        // If the note has a root tag, that meens it is not a root note itself
        // So we need to copy the `root` tag and add a `reply` tag
        if (rootTag) {
          const tagWithHint = rootTag.map((v, i) => i === 2 ?
            rHints :
            v,
          );
          tags.push([...tagWithHint]);
          tags.push(['e', rep.id, rHints, 'reply']);
        }
        // Otherwise, add the note as the root tag for this reply
        else {
          tags.push([
            'e',
            rep.id,
            rHints,
            'root',
          ]);
        }

        // Copy all `p` tags from the note we are repling to
        const repPeople = rep.msg.tags.filter(t => t[0] === 'p');

        tags = [...tags, ...(unwrap(repPeople))];

        // If the author of the note is missing, add them
        if (!tags.find(t => t[0] === 'p' && t[1] === rep.pubkey)) {
          tags.push(['p', rep.pubkey]);
        }
      }

      const relayTags = account.relays.map(r => {
        let t = ['r', r.url];

        const settings = account.relaySettings[r.url];
        if (settings && settings.read && !settings.write) {
          t = [...t, 'read'];
        }
        if (settings && !settings.read && settings.write) {
          t = [...t, 'write'];
        }

        return t;
      });
      tags = [...tags, ...relayTags];

      setIsPostingInProgress(true);

      const { success, reasons, note } = await sendNote(messageToSend, account?.proxyThroughPrimal || false, account.activeRelays, tags, account.relaySettings);

      if (success) {

        const importId = `import_note_${APP_ID}`;

        const unsub = subsTo(importId, {
          onEose: () => {
            if (note) {
              toast?.sendSuccess(intl.formatMessage(tToast.publishNoteSuccess));
              props.onSuccess && props.onSuccess({ success, reasons, note }, { noteRefs, userRefs, articleRefs, highlightRefs, relayHints });
              setIsPostingInProgress(false);
              saveNoteDraft(account.publicKey, '', rep?.noteId)
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

    const parsed = parsedMessage().replace(profileRegexEdit, (url) => {

      let id = url;

      const idStart = url.search(profileRegexEdit);

      if (idStart > 0) {
        id = url.slice(idStart);
      }

      if (!id) {
        return url;
      }

      try {
        // const profileId = nip19.decode(id).data as string | nip19.ProfilePointer;

        // const hex = typeof profileId === 'string' ? profileId : profileId.pubkey;
        // const npub = hexToNpub(hex);

        const user = userRefs[userId];

        const link = user ?
          <a href={`${window.location.origin}${app?.actions.profileLink(user.npub) || ''}`} target="_blank" class='linkish'>@{userName(user)}</a> :
          <a href={`${window.location.origin}${app?.actions.profileLink(id) || ''}`} target="_blank" class='linkish'>@{truncateNpub(id)}</a>;

        // @ts-ignore
        return link.outerHTML || url;
      } catch (e) {
        return `<span class="${styles.error}">${url}</span>`;
      }
    });

    setParsedMessage(parsed);

  };

  const [addrRefs, setAddrRef] = createStore<Record<string, any>>({});

  const parseNaddr = (text: string) => {
    let refs = [];
    let match;

    while((match = addrRegexG.exec(text)) !== null) {
      refs.push(match[1]);
    }

    refs.forEach(id => {
      if (articleRefs[id]) {
        setTimeout(() => {
          subNaddrRef(id);
        }, 0);
        return;
      }

      const addr = decodeIdentifier(id);

      if (addr.type !== 'naddr') {
        return;
      }

      // @ts-ignore
      const { pubkey, kind, identifier } = addr.data;

      const subId = `naddr_${id}_${APP_ID}`;

      setReferencedArticles(id, { messages: [], users: {}, postStats: {}, mentions: {} })

      const unsub = subsTo(subId, {
        onEvent: (_, content) => {

          if (!content) return;

          if (content.kind === Kind.Metadata) {
            const user = content as NostrUserContent;

            setReferencedArticles(id, 'users', (usrs) => ({ ...usrs, [user.pubkey]: { ...user } }));
            return;
          }

          if ([Kind.LongForm, Kind.LongFormShell, Kind.LiveEvent].includes(content.kind)) {
            const message = content as NostrNoteContent;

            setReferencedArticles(id, 'messages',
              (msgs) => [ ...msgs, { ...message }]
            );

            return;
          }

          if (content.kind === Kind.NoteStats) {
            const statistic = content as NostrStatsContent;
            const stat = JSON.parse(statistic.content);

            setReferencedArticles(id, 'postStats',
              (stats) => ({ ...stats, [stat.event_id]: { ...stat } })
            );
            return;
          }

          if (content.kind === Kind.Mentions) {
            const mentionContent = content as NostrMentionContent;
            const mention = JSON.parse(mentionContent.content);

            setReferencedArticles(id, 'mentions',
              (mentions) => ({ ...mentions, [mention.id]: { ...mention } })
            );
            return;
          }

          if (content.kind === Kind.RelayHint) {
            const hints = JSON.parse(content.content) as Record<string, string>;
            setRelayHints(() => ({ ...hints }))
          }
        },
        onEose: () => {
          let ref = referencedArticles[id];

          const m = ref.messages[0];

          if (m.kind === Kind.LiveEvent) {
            const liveEvent = convertToLiveEvents(ref)[0];

            setLiveEventRefs((refs) => ({
              ...refs,
              [id]: liveEvent,
            }))

            subNaddrRef(id);

            unsub();

            return;
          }


          const newNote = convertToArticles(ref)[0];

          setArticleRefs((refs) => ({
            ...refs,
            [newNote.noteId]: newNote
          }));

          subNaddrRef(newNote.noteId);

          unsub();
        },
      });

      getParametrizedEvent(pubkey, identifier, kind, subId);
      // getEvents(account?.publicKey, [hex], `nn_${id}`, true);

    });

  };

  const subNaddrRef = async (noteId: string) => {
    const parsed = await replaceAsync(parsedMessage(), eventRegexG, async (url) => {
      let id = url;

      const idStart = url.search(addrRegex);

      if (idStart > 0) {
        id = url.slice(idStart);
      }

      const decId = decodeIdentifier(id);
      const decNoteId = decodeIdentifier(noteId);

      if (decId.type !== 'naddr' || decNoteId.type !== 'naddr') return url;

      if (
        // @ts-ignore
        decId.data.identifier !== decNoteId.data.identifier ||
        // @ts-ignore
        decId.data.pubkey !== decNoteId.data.pubkey ||
        // @ts-ignore
        decId.data.kind !== decNoteId.data.kind
      ) return url;

      try {
        let article = articleRefs[noteId];

        if (!article) {
          let stream = liveEventRefs[noteId];

          if (!stream) return url;

          const hostPubkey = stream.hosts?.[0] || stream.pubkey;

          const user = await fetchUserProfile(account?.publicKey, hostPubkey, `missing_user_${APP_ID}`);

          const link = stream ?
            <div>
              <LiveEventPreview stream={stream} user={user} />
            </div> : <span class="linkish">{url}</span>;

          // @ts-ignore
          return link.outerHTML || url;
        }

        const link = <div class={styles.highlight}>
          <SimpleArticlePreview article={article} noLink={true} />
        </div>;

        // @ts-ignore
        return link.outerHTML || url;
      } catch (e) {
        logError('Bad Note reference: ', e);
        return `<span class="${styles.error}">${url}</span>`;
      }

    });

    setParsedMessage(parsed);
  };

  const parseNpubLinks = (text: string) => {
    let refs = [];
    let match;

    while((match = profileRegexEditG.exec(text)) !== null) {
      refs.push(match[1]);
    }

    refs.forEach(ref => {
      let id = ref;

      if (ref.startsWith('nostr:')) {
        id = ref.split(':')[1];
      }

      if (userRefs[id]) {
        setTimeout(() => {
          subUserRef(ref);
        }, 0);
        return;
      }

      const subId = `nu_${id}_${APP_ID}`
      const eventId = nip19.decode(id).data as string | nip19.ProfilePointer;
      const hex = typeof eventId === 'string' ? eventId : eventId.pubkey;

      // setReferencedNotes(`nn_${id}`, { messages: [], users: {}, postStats: {}, mentions: {} })

      const unsub = subsTo(subId, {
        onEvent: (_, content) => {
          if (!content) return;

          if (content.kind === Kind.Metadata) {
            const user = content as NostrUserContent;

            const u = convertToUser(user, content.pubkey)

            setUserRefs(() => ({ [u.pubkey]: u }));

            // setReferencedNotes(subId, 'users', (usrs) => ({ ...usrs, [user.pubkey]: { ...user } }));
            return;
          }

        },
        onEose: () => {
          subUserRef(hex);

          unsub();
        }
      });

      getUserProfiles([hex], subId);

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

      const subId = `nn_${id}_${APP_ID}`;
      const event = nip19.decode(id);
      const eventId = nip19.decode(id).data as string | nip19.EventPointer;
      const hex = typeof eventId === 'string' ? eventId : eventId.id;

      setReferencedNotes(subId, { messages: [], users: {}, postStats: {}, mentions: {} })

      const unsub = subsTo(subId, {
        onEvent: (_, content) => {
          if (!content) {
            return;
          }


          if (content.kind === Kind.Metadata) {
            const user = content as NostrUserContent;

            setReferencedNotes(subId, 'users', (usrs) => ({ ...usrs, [user.pubkey]: { ...user } }));
            return;
          }

          if (content.kind === Kind.Highlight) {
            setHighlightRefs(id, () => ({ ...content }));
            return;
          }

          if (content.kind === Kind.LiveEvent) {

            const streamData = {
              id: (content.tags?.find((t: string[]) => t[0] === 'd') || [])[1],
              url: (content.tags?.find((t: string[]) => t[0] === 'streaming') || [])[1],
              image: (content.tags?.find((t: string[]) => t[0] === 'image') || [])[1],
              status: (content.tags?.find((t: string[]) => t[0] === 'status') || [])[1],
              starts: parseInt((content.tags?.find((t: string[]) => t[0] === 'starts') || ['', '0'])[1]),
              summary: (content.tags?.find((t: string[]) => t[0] === 'summary') || [])[1],
              title: (content.tags?.find((t: string[]) => t[0] === 'title') || [])[1],
              client: (content.tags?.find((t: string[]) => t[0] === 'client') || [])[1],
              currentParticipants: parseInt((content.tags?.find((t: string[]) => t[0] === 'current_participants') || ['', '0'])[1] || '0'),
              pubkey: content.pubkey,
              hosts: (content.tags || []).filter(t => t[0] === 'p' && t[3].toLowerCase() === 'host').map(t => t[1]),
              participants: (content.tags || []).filter(t => t[0] === 'p').map(t => t[1]),
            };

            setLiveEventRefs(id, () => ({ ...streamData }));
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

          if (content.kind === Kind.RelayHint) {
            const hints = JSON.parse(content.content) as Record<string, string>;
            setRelayHints(() => ({ ...hints }))
          }
        },
        onEose: () => {
          const newNote = convertToNotes(referencedNotes[subId])[0];

          if (newNote) {
            setNoteRefs((refs) => ({
              ...refs,
              [newNote.id]: newNote
            }));

            subNoteRef(newNote.id);
          } else {
            subNoteRef(id);
          }



          unsub();
        },
      });

      getEvents(account?.publicKey, [hex], subId, true);

    });

  };

  const subNoteRef = (noteId: string) => {

    const parsed = parsedMessage().replace(eventRegexG, (url) => {
      // const [_, id] = url.split(':');

      let id = url;

      const idStart = url.search(noteRegex);

      if (idStart > 0) {
        id = url.slice(idStart);
      }

      if (!id) {
        return url;
      }

      try {
        let hex = '';

        const decode = nip19.decode(id);

        if (decode.type === 'nevent') {
          hex = decode.data.id;
        } else if (decode.type === 'note') {
          hex = decode.data;
        }

        let note = noteRefs[hex];

        if (!note) {
          note = highlightRefs[id];

          const link = note ?
            <div>
              <ArticleHighlight highlight={note} />
            </div> : <span class="linkish">{url}</span>;

          // @ts-ignore
          return link.outerHTML || url;
        }

        const link = note ?
          <div>
            <TranslatorProvider>
                <EmbeddedNote
                  note={note}
                  mentionedUsers={note.mentionedUsers || {}}
                  includeEmbeds={true}
                  hideFooter={true}
                  noLinks="links"
                />
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

  const parseExternalLiveStreams = async (text: string) => {
    // return text;

    const regex = /__EXTERNAL_STREAM__(.*?)__EXTERNAL_STREAM__/g;

    let refs = [];
    let match;

    while((match = regex.exec(text)) !== null) {
      refs.push(match[1]);
    }

    let rec: Record<string, string> = {};

    for (let i = 0; i < refs.length;i++) {
      const url = refs[i];
      const sections = url.split('/');
      const naddr = sections[sections.length - 1];

      const decoded = decodeIdentifier(naddr);

      if (decoded.type === 'naddr' && typeof decoded.data !== 'string') {
        const { identifier, pubkey } = decoded.data;

        const stream = await getStreamingEvent(identifier, pubkey);
        const user = await fetchUserProfile(account?.publicKey, stream.hosts?.[0] || pubkey, `missing_user_${APP_ID}`);

        rec[url] = (<div>
          <LiveEventPreview stream={stream} user={user} />
        </div>)?.outerHTML || url;
      }
    }

    return text.replace(regex, (fullMatch, url) => {
        // Process the captured content and return the replacement
        return rec[url];
    });

  }

  const parseForReferece = async (value: string) => {
    const content = await replaceLinkPreviews(
      parseUserMentions(
        highlightHashtags(
          parseNote1(value, media?.actions.getMediaUrl)
        )
      )
    );


    parseNaddr(content);
    parseNpubLinks(content);
    parseNoteLinks(content);

    const ret = await parseExternalLiveStreams(content);

    return ret;
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
      search?.actions.getRecomendedUsers(profile?.profileHistory.profiles || []);
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

    // Get index of the token and insert user's handle
    const index = msg.slice(0, cursor).lastIndexOf('@');
    const value = msg.slice(0, index) + `@\`${name}\` ` + msg.slice(cursor);

    // Reset query, update message and text area value
    setQuery('');
    setMessage(value);
    textArea.value = message();

    textArea.focus();

    // Calculate new cursor position
    cursor = value.slice(0, cursor).lastIndexOf('@') + name.length + 4;
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

  const notePreview = () => {
    if (!account?.activeUser || !account?.publicKey) return;

    const created_at = Math.floor((new Date()).getTime() / 1_000);

    const post = {
      id: 'new note',
      pubkey: account.publicKey,
      created_at,
      tags: [],
      content: message(),
      sig: 'signature',
      kind: Kind.Text,
      likes: 0,
      mentions: 0,
      reposts: 0,
      replies: 0,
      zaps: 0,
      score: 0,
      score24h: 0,
      satszapped: 0,
      noteId: 'noteId',
      noteIdShort: 'NoteIdShort',
      noteActions: {
        event_id: 'eventId',
        liked: false,
        replied: false,
        reposted: false,
        zapped: false,
      },
    }

    const msg = {
      kind: Kind.Text,
      content: message(),
      id: 'new note',
      created_at,
      pubkey: account.publicKey,
      sig: 'signature',
      tags: [],
    };

    const n: PrimalNote = {
      user: account.activeUser,
      post,
      msg,
      mentionedNotes: noteRefs,
      mentionedUsers: userRefs,
      mentionedArticles: articleRefs,
      mentionedHighlights: highlightRefs,
      replyTo: props.replyToNote?.id,
      id: post.id,
      pubkey: post.pubkey || '',
      noteId: post.noteId,
      noteIdShort: post.noteIdShort,
      tags: post.tags,
      topZaps: [],
      content: post.content,
    }

    return n;
  }

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
          <Show when={props.context}>
            <div class={styles.context}>
              {props.context}
            </div>
          </Show>
          <div
            class={styles.previewCaption}>
            {intl.formatMessage(tNote.newPreview)}
          </div>
        </div>
        <div
          class={styles.editorScroll}
          id={`${prefix()}new_note_text_preview`}
        >
          {renderMessage()}
          <div class={styles.uploader}>
            <UploaderBlossom
              publicKey={account?.publicKey}
              nip05={account?.activeUser?.nip05}
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
                insertAtCursor(` ${url} `);

                onExpandableTextareaInput(new InputEvent('input'));

                if (textArea) {
                  textArea.focus();
                  let position = (textArea.selectionEnd || 0);
                  textArea.selectionEnd = position;
                }
                resetUpload();
              }}
            />
            {/* <Uploader
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
                insertAtCursor(` ${url} `);
                resetUpload();
              }}
            /> */}
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
