import { useIntl } from '@cookbook/solid-intl';
import { nip19 } from 'nostr-tools';
import { Component, createEffect, createSignal, For, onCleanup, onMount, Show } from 'solid-js';
import Avatar from '../components/Avatar/Avatar';
import { useAccountContext } from '../contexts/AccountContext';
import { useMessagesContext } from '../contexts/MessagesContext';
import { nip05Verification, truncateNpub, userName } from '../stores/profile';
import { PrimalNote, PrimalUser } from '../types/primal';
import { date } from '../lib/dates';

import styles from './Messages.module.scss';
import EmbeddedNote from '../components/EmbeddedNote/EmbeddedNote';
import { A, useNavigate, useParams } from '@solidjs/router';
import { parseNote3 } from '../lib/notes';
import { hexToNpub, npubToHex } from '../lib/keys';
import Branding from '../components/Branding/Branding';
import Wormhole from '../components/Wormhole/Wormhole';
import Loader from '../components/Loader/Loader';
import SearchOption from '../components/Search/SearchOption';
import { debounce, isVisibleInContainer, uuidv4 } from '../utils';
import { useSearchContext } from '../contexts/SearchContext';
import { createStore } from 'solid-js/store';
import { editMentionRegex, emojiSearchLimit } from '../constants';
import Search from '../components/Search/Search';
import { useProfileContext } from '../contexts/ProfileContext';
import Paginator from '../components/Paginator/Paginator';
import { getCaretCoordinates } from '../lib/textArea';
import emojiSearch from '@jukben/emoji-search';
import {
  placeholders,
  messages as tMessages,
  actions as tActions,
  search as tSearch,
} from '../translations';
import PageCaption from '../components/PageCaption/PageCaption';
import { useMediaContext } from '../contexts/MediaContext';
import PageTitle from '../components/PageTitle/PageTitle';

type AutoSizedTextArea = HTMLTextAreaElement & { _baseScrollHeight: number };

let currentUrl = '';

type EmojiOption = {
  keywords: string[],
  // char: string,
  // fitzpatrick_scale: boolean,
  // category: string,
  name: string,
};

export const parseNoteLinks = (text: string, mentionedNotes: Record<string, PrimalNote>, mentionedUsers: Record<string, PrimalUser>, highlightOnly?: boolean) => {

  const regex = /\bnostr:((note|nevent)1\w+)\b|#\[(\d+)\]/g;

  return text.replace(regex, (url) => {
    const [_, id] = url.split(':');

    if (!id) {
      return url;
    }

    try {
      const note = mentionedNotes[id];

      const path = `/e/${id}`;

      const link = highlightOnly ?
        <span class='linkish' >{url}</span> :
        note ?
          <A href={path} class={styles.postLink}>
            <EmbeddedNote
              note={note}
              mentionedUsers={mentionedUsers || {}}
              includeEmbeds={true}
            />
          </A> :
          <A href={path}>{url}</A>;

      // @ts-ignore
      return link.outerHTML || url;
    } catch (e) {
      return `<span class="${styles.error}">${url}</span>`;
    }

  });

};

export const parseNpubLinks = (text: string, mentionedUsers: Record<string, PrimalUser>, highlightOnly = false) => {

  const regex = /\bnostr:((npub|nprofile)1\w+)\b|#\[(\d+)\]/g;

  return text.replace(regex, (url) => {
    const [_, id] = url.split(':');

    if (!id) {
      return url;
    }

    try {
      const profileId = nip19.decode(id).data as string | nip19.ProfilePointer;

      const hex = typeof profileId === 'string' ? profileId : profileId.pubkey;
      const npub = hexToNpub(hex);
      const path = `/p/${npub}`;

      const user = mentionedUsers[hex];

      let link = highlightOnly ?
        <span class='linkish'>@{truncateNpub(npub)}</span> :
        <A href={path}>@{truncateNpub(npub)}</A>;

      if (user) {
        link = highlightOnly ?
          <span class='linkish'>@{userName(user)}</span> :
          <A href={path}>@{userName(user)}</A>;
      }


      // @ts-ignore
      return link.outerHTML || url;
    } catch (e) {
      return `<span class="${styles.error}">${url}</span>`;
    }
  });

};

const Messages: Component = () => {
  const instanceId = uuidv4();

  const intl = useIntl();
  const messages = useMessagesContext();
  const account = useAccountContext();
  const profile = useProfileContext();
  const media = useMediaContext();

  const navigate = useNavigate();

  const params = useParams();

  let conversationHolder: HTMLDivElement | undefined;
  let newMessageInput: HTMLTextAreaElement | undefined;
  let newMessageInputBorder: HTMLDivElement | undefined;
  let newMessageWrapper: HTMLDivElement | undefined;
  let sendersListElement: HTMLDivElement | undefined;

  let emojiOptions: HTMLDivElement | undefined;

  const [highlightedEmoji, setHighlightedEmoji] = createSignal<number>(0);
  const [isEmojiInput, setEmojiInput] = createSignal(false);
  const [emojiQuery, setEmojiQuery] = createSignal('');
  const [emojiResults, setEmojiResults] = createStore<EmojiOption[]>([]);
  let emojiCursorPosition = { top: 0, left: 0, height: 0 };

  const senderNpub = () => {
    if (!params.sender) {
      return '';
    }

    if (params.sender.startsWith('npub')) {
      return params.sender;
    }

    return nip19.noteEncode(params.sender);
  };

  const senderPubkey = () => {
    if (!params.sender) {
      return '';
    }

    let pubkey = params.sender;

    if (pubkey.startsWith('npub') || pubkey.startsWith('nevent')) {
      const decoded = nip19.decode(pubkey);

      if (decoded.type === 'npub') {
        pubkey = decoded.data;
      }

      if (decoded.type === 'nevent') {
        pubkey = decoded.data.id;
      }
    }

    return pubkey;

  }

  createEffect(() => {
    if (!params.sender) return;

    const sender =  params.sender.startsWith('npub') ?
      npubToHex(params.sender) :
      params.sender;

    if(currentUrl !== sender) {
      currentUrl = sender;
      selectSender(sender);
    }
  });

  createEffect(() => {
    if (messages?.selectedSender && currentUrl !== messages.selectedSender) {
      const npub = hexToNpub(messages.selectedSender);
      navigate(`/messages/${npub}`);
      return;
    }
  });

  createEffect(() => {
    if (params.sender || !messages?.senders) {
      return;
    }

    const senders = messages.orderedSenders();
    senders.length > 0 && navigate(`/messages/${senders[0].npub}`);
  });

  createEffect(() => {
    const count = messages?.messageCount || 0;

    if (account?.isKeyLookupDone && account.hasPublicKey() && count === 0 && messages?.activePubkey !== account.publicKey) {
      messages?.actions.getMessagesPerSender();
    }
  });

  createEffect(() => {
    const count = messages?.messageCount || 0;

    if (count > 0) {
      messages?.actions.getMessagesPerSender();
    }
  });

  createEffect(() => {
    if (messages?.isConversationLoaded) {
      if (conversationHolder) {
        conversationHolder.scrollTop = conversationHolder.scrollHeight;
      }

      // messages.actions.resetConversationLoaded();
    }
  });

  createEffect(() => {
    if (messages?.selectedSender) {
      setTimeout(() => {
        const el = document.querySelector(`[data-user="${messages.selectedSender}"]`);

        // @ts-ignore
        el?.scrollIntoView({ behaviour: 'smooth', block: 'nearest' });
      }, 100);
    }
  });

  const user = (pubkey: string) => {
    return messages?.senders && messages.senders[pubkey];
  }

  const mgsFromSender = (sender: PrimalUser) => {
    return messages?.messageCountPerSender[sender.pubkey]?.cnt || 0;
  }

  const isSelectedSender = (senderId: string) => {
    return senderNpub() === senderId || senderPubkey() === senderId;
  };

  const selectSender = (senderNpub: string) => {
    messages?.actions.selectSender(senderNpub);
  }

  const highlightHashtags = (text: string) => {
    const regex = /(?:\s|^)#[^\s!@#$%^&*(),.?":{}|<>]+/ig;

    return text.replace(regex, (token) => {
      const [space, term] = token.split('#');
      const embeded = (
        <span>
          {space}
          <A
            href={`/search/%23${term}`}
          >#{term}</A>
        </span>
      );

      // @ts-ignore
      return embeded.outerHTML;
    });
  }

  const parseMessage = (message: string) => {
    if (!messages) {
      return message;
    }
    return parseNoteLinks(
      parseNpubLinks(
        highlightHashtags(
          parseNote3(message, media?.actions.getMediaUrl)
        ),
        messages?.referecedUsers,
      ),
      messages?.referecedNotes,
      messages?.referecedUsers
    );
  };


  const getScrollHeight = (elm: AutoSizedTextArea) => {
    var savedValue = elm.value
    elm.value = ''
    elm._baseScrollHeight = elm.scrollHeight
    elm.value = savedValue
  }

  const [message, setMessage] = createSignal('');

  const onExpandableTextareaInput = () => {
    const maxHeight = 800;

    const input = newMessageInput as AutoSizedTextArea;

    if(!input || input.nodeName !== 'TEXTAREA') {
      return;
    }

    const minRows = parseInt(input.getAttribute('data-min-rows') || '0');

    !input._baseScrollHeight && getScrollHeight(input);


    if (input.scrollHeight >= (maxHeight / 3)) {
      return;
    }

    input.rows = minRows;
    const rows = input.value === '' ? 0 : Math.ceil((input.scrollHeight - input._baseScrollHeight) / 20);

    input.rows = minRows + rows;
    input.style.height = `${40 + (20 * rows)}px`;

    if (newMessageWrapper) {
      newMessageWrapper.style.height = `${80 + (20 * rows)}px`;
    }

    if (newMessageInputBorder) {
      newMessageInputBorder.style.height = `${40 + (20 * rows)}px`;
    }

    // debounce(() => {
      setMessage(input.value)
    // }, 300);

  }


  const onKeyDown = (e: KeyboardEvent) => {
    if (!newMessageInput || !newMessageWrapper) {
      return false;
    }

    const mentionSeparators = ['Enter', 'Space', 'Comma', 'Tab'];

    if (!isMentioning() && !isEmojiInput() && e.code === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      debounce(() => {
        sendMessage();
      }, 300);

      return false;
    }

    if (!isMentioning() && !isEmojiInput() && e.key === ':') {

      // Ignore if `:` is a part of a word
      if (newMessageInput.selectionStart > 0 && ![' ', '\r\n', '\r', '\n'].includes(newMessageInput.value[newMessageInput.selectionStart-1])) {
        return false;
      }

      emojiCursorPosition = getCaretCoordinates(newMessageInput, newMessageInput.selectionStart);
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

      if (e.code === 'Semicolon') {
      }

      if (mentionSeparators.includes(e.code) || e.code === 'Semicolon') {
        if (emojiQuery().trim().length === 0) {
          setEmojiInput(false);
          return false;
        }
        e.preventDefault();
        emojiResults.length === 0 && setEmojiResults(() => emojiSearch(emojiQuery()));
        selectEmoji(emojiResults[highlightedEmoji()]);
        setHighlightedEmoji(0);
        return false;
      }

      const cursor = newMessageInput.selectionStart;
      const lastEmojiTrigger = newMessageInput.value.slice(0, cursor).lastIndexOf(':');

      if (e.code === 'Backspace') {
        setEmojiQuery(emojiQuery().slice(0, -1));

        if (lastEmojiTrigger < 0 || cursor - lastEmojiTrigger <= 1) {
          setEmojiInput(false);
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
      mentionCursorPosition = getCaretCoordinates(newMessageInput, newMessageInput.selectionStart);

      // Ignore if `@` is a part of a word
      if (newMessageInput.selectionStart > 0 && ![' ', '\r\n', '\r', '\n'].includes(newMessageInput.value[newMessageInput.selectionStart-1])) {
        return false;
      }

      setPreQuery('');
      setQuery('');
      setMentioning(true);
      return false;
    }

    if (!isMentioning() && e.code === 'Backspace' && newMessageInput) {
      let cursor = newMessageInput.selectionStart;
      const textSoFar = newMessageInput.value.slice(0, cursor);
      const lastWord = textSoFar.split(/[\s,;\n\r]/).pop();

      if (lastWord?.startsWith('@`')) {
        const index = textSoFar.lastIndexOf(lastWord);

        const newText = textSoFar.slice(0, index) + newMessageInput.value.slice(cursor);

        setMessage(newText);
        newMessageInput.value = newText;

        newMessageInput.selectionEnd = index;
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
        if (preQuery().trim().length === 0) {
          setMentioning(false);
          return false;
        }
        e.preventDefault();
        search?.users && selectUser(search.users[highlightedUser()])
        setMentioning(false);
        return false;
      }

      const cursor = newMessageInput.selectionStart;
      const lastMentionTrigger = newMessageInput.value.slice(0, cursor).lastIndexOf('@');

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

  // const onKeyDown = (e: KeyboardEvent) => {
  //   if (!newMessageInput) {
  //     return false;
  //   }

  //   if (e.code === 'Enter' && !e.shiftKey) {
  //     e.preventDefault();
  //     debounce(() => {
  //       sendMessage();
  //     }, 300);

  //     return false;
  //   }

  //   if (!isMentioning() && !isEmojiInput() && e.key === ':') {
  //     emojiCursorPosition = getCaretCoordinates(newMessageInput, newMessageInput.selectionStart);
  //     setEmojiInput(true);
  //     return false;
  //   }
  // };

  onMount(() => {
    newMessageWrapper?.addEventListener('input', () => onExpandableTextareaInput());
    newMessageInput && newMessageInput.addEventListener('keydown', onKeyDown);
  });

  onCleanup(() => {
    newMessageWrapper?.removeEventListener('input', () => onExpandableTextareaInput());
    newMessageInput && newMessageInput.removeEventListener('keydown', onKeyDown);
    messages?.actions.clearAllMessages();
    messages?.actions.selectSender();
    messages?.actions.clearReceiver();
  });

  const sendMessage = async () => {
    if (!messages?.selectedSender ||
      !newMessageInput ||
      !newMessageInputBorder ||
      !newMessageWrapper) {
      return;
    }

    const text = message().trim();

    if (text.length === 0) {
      return;
    }
    setMessage('');

    const content = prepareMessageForSending(text);

    const msg = {
      id: `N_M_${messages.messages.length}`,
      sender: account?.publicKey || '',
      content,
      created_at: Math.floor((new Date()).getTime() / 1000),
    };

    const success = await messages?.actions.sendMessage(messages.selectedSender, msg);

    if (success) {
      newMessageInput.value = '';
      newMessageInput.style.height = '40px';
      newMessageInputBorder.style.height = '34px';
      newMessageWrapper.style.height = '80px';

      setTimeout(() => {
        const element = document.querySelector(`[data-user="${messages?.selectedSender}"]`);

        if (element && sendersListElement && !isVisibleInContainer(element, sendersListElement)) {
          element.scrollIntoView();
        }
      }, 100);
    }
  };

  const [inputFocused, setInputFocused] = createSignal(false);

  const markAllAsRead = () => {
    messages?.actions.resetAllMessages();
  };

  const sendButtonClass = () => {
    return inputFocused() && message().trim().length > 0 ? styles.primaryButton : styles.secondaryButton;
  };

  const addUserToSenders = (user: PrimalUser | string) => {
    if (typeof user === 'string') {
      return;
    }

    messages?.actions.addSender(user);
  }

// MENTIONING

  const search = useSearchContext();

  const [isMentioning, setMentioning] = createSignal(false);
  const [preQuery, setPreQuery] = createSignal('');
  const [query, setQuery] = createSignal('');

  const [highlightedUser, setHighlightedUser] = createSignal<number>(0);
  let mentionCursorPosition = { top: 0, left: 0, height: 0 };

  let mentionOptions: HTMLDivElement | undefined;

  const prepareMessageForSending = (text: string) => {

    return text.replace(editMentionRegex, (url) => {

      const [_, name] = url.split('\`');
      const user = userRefs[name];

      // @ts-ignore
      return ` nostr:${user.npub}`;
    })
  }

  createEffect(() => {
    const preQ = preQuery();

    debounce(() => {
      setQuery(() => preQ)
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


  const mentionPositionOptions = () => {
    if (!newMessageInput || !mentionOptions || !newMessageWrapper) {
      return;
    }

    const taRect = newMessageInput.getBoundingClientRect();

    let newBottom = taRect.height - mentionCursorPosition.top + 32;
    let newLeft = mentionCursorPosition.left;

    if (newLeft + mentionOptions.getBoundingClientRect().width > 628) {
      newLeft = 628 - mentionOptions.getBoundingClientRect().width;
    }

    mentionOptions.style.bottom = `${newBottom}px`;
    mentionOptions.style.left = `${newLeft}px`;
  };

  const selectEmoji = (emoji: EmojiOption) => {
    if (!newMessageInput || !emoji) {
      setEmojiInput(false);
      setEmojiQuery('');
      setEmojiResults(() => []);
      return;
    }

    const msg = message();

    // Get cursor position to determine insertion point
    let cursor = newMessageInput.selectionStart;

    // Get index of the token and insert emoji character
    const index = msg.slice(0, cursor).lastIndexOf(':');
    const value = msg.slice(0, index) + emoji.name + msg.slice(cursor);

    // Reset query, update message and text area value
    setMessage(value);
    newMessageInput.value = message();

    // Calculate new cursor position
    newMessageInput.selectionEnd = index + 1;
    newMessageInput.focus();

    setEmojiInput(false);
    setEmojiQuery('');
    setEmojiResults(() => []);

    // Dispatch input event to recalculate UI position
    // const e = new Event('input', { bubbles: true, cancelable: true});
    // newMessageInput.dispatchEvent(e);
  };


  const [userRefs, setUserRefs] = createStore<Record<string, PrimalUser>>({});


  const selectUser = (user: PrimalUser | undefined) => {
    if (!newMessageInput || !user) {
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
    let cursor = newMessageInput.selectionStart;

    // Get index of the token and inster user's handle
    const index = msg.slice(0, cursor).lastIndexOf('@');
    const value = msg.slice(0, index) + `@\`${name}\`` + msg.slice(cursor);

    // Reset query, update message and text area value
    setQuery('');
    setMessage(value);
    newMessageInput.value = message();

    newMessageInput.focus();

    // Calculate new cursor position
    cursor = value.slice(0, cursor).lastIndexOf('@') + name.length + 3;
    newMessageInput.selectionEnd = cursor;


    // Dispatch input event to recalculate UI position
    const e = new Event('input', { bubbles: true, cancelable: true});
    newMessageInput.dispatchEvent(e);
  };

  createEffect(() => {
    if (account?.hasPublicKey()) {
      profile?.actions.setProfileKey(account.publicKey)
    }
  });

  createEffect(() => {
    if (messages?.selectedSender) {

      const element = document.querySelector(`[data-user="${messages.selectedSender}"]`);

      if (element && sendersListElement && !isVisibleInContainer(element, sendersListElement)) {
        element.scrollIntoView();
      }

    }
  });

  createEffect(() => {
    if (emojiQuery().length > emojiSearchLimit) {
      setEmojiResults(() => emojiSearch(emojiQuery()));
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

  const emojiPositionOptions = () => {
    if (!newMessageInput || !emojiOptions || !newMessageWrapper) {
      return;
    }

    const taRect = newMessageInput.getBoundingClientRect();

    let newBottom = taRect.height - emojiCursorPosition.top + 32;
    let newLeft = emojiCursorPosition.left;

    emojiOptions.style.bottom = `${newBottom}px`;
    emojiOptions.style.left = `${newLeft}px`;
  };


  const onInput = () => {
    newMessageInput && setMessage(newMessageInput.value)
  }

  return (
    <div>
      <PageTitle title={intl.formatMessage(tMessages.title)} />

      <Wormhole
        to="search_section"
      >
        <Search
          placeholder={
            intl.formatMessage(placeholders.findUser)
          }
          onInputConfirm={() => {}}
          noLinks={true}
          hideDefault={true}
          onUserSelect={addUserToSenders}
        />
      </Wormhole>

      <PageCaption title={intl.formatMessage(tMessages.title)} />

      <div class={styles.messagesContent}>

        <div class={styles.senders}>
          <div class={styles.sendersHeader}>
            <div class={styles.senderCategorySelector}>
              <button
                class={`${styles.categorySelector} ${messages?.senderRelation === 'follows' ? styles.highlight : ''}`}
                onClick={() => messages?.actions.changeSenderRelation('follows')}
              >
                <div>
                  {intl.formatMessage(tMessages.follows)}
                </div>
                <div class={styles.indicator}></div>
                <Show when={messages?.senderRelation === 'other' && messages?.hasMessagesInDifferentTab}>
                  <div class={styles.bubble}></div>
                </Show>
              </button>
              <button
                class={`${styles.categorySelector} ${messages?.senderRelation === 'other' ? styles.highlight : ''}`}
                onClick={() => messages?.actions.changeSenderRelation('other')}
              >
                <div>
                  {intl.formatMessage(tMessages.other)}
                </div>
                <div class={styles.indicator}></div>
                <Show when={messages?.senderRelation === 'follows' && messages?.hasMessagesInDifferentTab}>
                  <div class={styles.bubble}></div>
                </Show>
              </button>
            </div>
            <button
              class={styles.markAsRead}
              disabled={!messages?.messageCount}
              onClick={markAllAsRead}
            >
              {intl.formatMessage(tMessages.markAsRead)}
            </button>
          </div>

          <div class={styles.sendersList} ref={sendersListElement}>
            <For each={messages?.orderedSenders() || []}>
              {
                (sender) => (
                  <button
                    class={`${styles.senderItem} ${isSelectedSender(sender.npub) ? styles.selected : ''}`}
                    onClick={() => selectSender(sender.npub)}
                    data-user={sender.pubkey}
                  >
                    <Avatar user={sender} size="md" />
                    <div class={styles.senderInfo}>
                      <div class={styles.firstLine}>
                        <div class={styles.senderName}>
                          {userName(sender)}
                        </div>
                        <Show when={messages?.messageCountPerSender[sender.pubkey] && messages?.messageCountPerSender[sender.pubkey].latest_at > 0}>
                          <div class={styles.dotSeparator}></div>
                          <div class={styles.lastMessageTime}>
                            {date(messages?.messageCountPerSender[sender.pubkey].latest_at || 0,'narrow', messages?.now).label}
                          </div>
                        </Show>
                      </div>
                      <div class={styles.secondLine}>
                        {nip05Verification(sender)}
                      </div>
                    </div>
                    <Show when={mgsFromSender(sender) > 0}>
                      <div class={styles.senderBubble}>
                        {mgsFromSender(sender)}
                      </div>
                    </Show>
                  </button>
                )
              }
            </For>
          </div>
        </div>

        <div class={styles.conversation}>
          <div class={styles.newMessage} ref={newMessageWrapper} >
            <div class={styles.textAreaBorder} ref={newMessageInputBorder}>
              <textarea
                ref={newMessageInput}
                data-min-rows={2}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                onInput={onInput}
              ></textarea>
            </div>
            <button
              class={sendButtonClass()}
              onClick={sendMessage}
            >
              <div class={styles.iconSend}></div>
            </button>

            <Show when={isMentioning()}>
              <div
                id="mention-auto"
                class={styles.searchSuggestions}
                ref={mentionOptions}
              >
                <For each={search?.users}>
                  {(user, index) => (
                    <SearchOption
                      title={userName(user)}
                      description={user.nip05}
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

            <Show when={isEmojiInput() && emojiQuery().length > emojiSearchLimit}>
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
          </div>
          <div class={styles.messages} ref={conversationHolder}>
            <Show when={messages?.selectedSender}>
              <For
                each={messages?.conversation}
                fallback={<>
                  {messages?.isConversationLoaded ?
                    <></> :
                    <Loader />
                  }
                </>}
              >
                {(thread) => (
                  <Show
                    when={isSelectedSender(thread.author)}
                    fallback={
                      <div class={styles.myThread}>
                        <A
                          href={`/p/${hexToNpub(thread.author)}`}
                          class={styles.avatar}
                        >
                          <Avatar user={account?.activeUser} size="xxs" />
                        </A>
                        <div class={styles.threadMessages}>
                          <For each={thread.messages}>
                            {(msg) => (
                              <div
                                class={styles.message}
                                data-event-id={msg.id}
                                title={date(msg.created_at || 0).date.toLocaleString()}
                                innerHTML={parseMessage(msg.content)}
                              ></div>
                            )}
                          </For>
                        </div>
                        <Show when={thread.messages[0]}>
                          <div class={styles.threadTime}>
                            {date(thread.messages[0].created_at, 'long', messages?.now).label}
                          </div>
                        </Show>
                      </div>
                    }
                  >
                    <div class={styles.theirThread}>
                      <A
                        href={`/p/${hexToNpub(thread.author)}`}
                        class={styles.avatar}
                      >
                        <Avatar user={user(thread.author)} size="xxs" />
                      </A>
                      <div class={styles.threadMessages}>
                        <For each={thread.messages}>
                          {(msg) => (
                            <div
                              class={styles.message}
                              data-event-id={msg.id}
                              title={date(msg.created_at || 0).date.toLocaleString()}
                              innerHTML={parseMessage(msg.content)}
                            ></div>
                          )}
                        </For>
                      </div>
                      <Show when={thread.messages[0]}>
                        <div class={styles.threadTime}>
                          {date(thread.messages[0].created_at, 'long', messages?.now).label}
                        </div>
                      </Show>
                    </div>
                  </Show>
                )}
              </For>
            </Show>

            <Paginator
              loadNextPage={messages?.actions.getNextConversationPage}
              isSmall={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Messages;
