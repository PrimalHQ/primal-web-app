import { Component, createEffect, createSignal, For, onCleanup, onMount, Show } from 'solid-js';
import { hookForDev } from '../../lib/devTools';

import styles from './ChatMessage.module.scss';
import Avatar from '../Avatar/Avatar';
import { nip05Verification, userName } from '../../stores/profile';
import { DMContact } from '../../megaFeeds';
import { date } from '../../lib/dates';
import { TextField } from '@kobalte/core/text-field';
import { useSearchContext } from '../../contexts/SearchContext';
import { editMentionRegex, emojiSearchLimit } from '../../constants';
import { createStore } from 'solid-js/store';
import { getCaretCoordinates } from '../../lib/textArea';
import { debounce, isVisibleInContainer, uuidv4 } from '../../utils';
import emojiSearch from '@jukben/emoji-search';
import { DirectMessage, PrimalUser, UserStats } from '../../types/primal';
import { useAccountContext } from '../../contexts/AccountContext';
import { useProfileContext } from '../../contexts/ProfileContext';
import SearchOption from '../Search/SearchOption';
import DOMPurify from 'dompurify';
import {
  placeholders,
  messages as tMessages,
  actions as tActions,
  search as tSearch,
} from '../../translations';
import { useIntl } from '@cookbook/solid-intl';
import { useDMContext } from '../../contexts/DMContext';

type AutoSizedTextArea = HTMLTextAreaElement & { _baseScrollHeight: number };

type EmojiOption = {
  keywords: string[],
  name: string,
};

const ChatMessageComposer: Component<{
  id?: string,
  sendMessage: (message: string) => Promise<boolean>,
}> = (props) => {

  const account = useAccountContext();
  const profile = useProfileContext();
  const intl = useIntl();
  const dms = useDMContext();

  const [message, setMessage] = createSignal('');
  const [inputFocused, setInputFocused] = createSignal(false);

  const instanceId = uuidv4();

  let newMessageInput: HTMLTextAreaElement | undefined;
  let newMessageWrapper: HTMLDivElement | undefined;
  let emojiOptions: HTMLDivElement | undefined;

  const [highlightedEmoji, setHighlightedEmoji] = createSignal<number>(0);
  const [isEmojiInput, setEmojiInput] = createSignal(false);
  const [emojiQuery, setEmojiQuery] = createSignal('');
  const [emojiResults, setEmojiResults] = createStore<EmojiOption[]>([]);
  let emojiCursorPosition = { top: 0, left: 0, height: 0 };

  const sendMessage = async () => {
    if (
      !newMessageInput ||
      !newMessageWrapper
    ) {
      return;
    }

    const text = message().trim();

    if (text.length === 0) {
      return;
    }
    setMessage('');

    const content = prepareMessageForSending(text);

    const success = await props.sendMessage(content);

    if (success) {
      newMessageInput.value = '';
      newMessageInput.style.height = '40px';
      newMessageWrapper.style.height = '64px';
    }
  }

  const sendButtonClass = () => {
    return inputFocused() && message().trim().length > 0 ? styles.primaryButton : styles.secondaryButton;
  };

  const onInput = () => {
    newMessageInput && setMessage(DOMPurify.sanitize(newMessageInput.value));
  }

  const getScrollHeight = (elm: AutoSizedTextArea) => {
    var savedValue = elm.value
    elm.value = ''
    elm._baseScrollHeight = elm.scrollHeight
    elm.value = savedValue
  }

  const onExpandableTextareaInput = () => {
    // Disable expanding the input
    return;
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

    if (newMessageWrapper !== undefined) {
      newMessageWrapper.style.height = `${64 + (20 * rows)}px`;
    }

    // debounce(() => {
      setMessage(input.value)
    // }, 300);

  }

  const onFocus = () => {
    if (!newMessageInput) return;
    newMessageInput.placeholder = '';
  }

  const onBlur = () => {
    if (!newMessageInput) return;
    newMessageInput.placeholder = intl.formatMessage(tMessages.sendComment);
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
        // if (preQuery().trim().length === 0) {
        //   setMentioning(false);
        //   return false;
        // }
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

  onMount(() => {
    newMessageWrapper?.addEventListener('input', () => onExpandableTextareaInput());
    if (newMessageInput) {
      newMessageInput.addEventListener('keydown', onKeyDown);
      newMessageInput.addEventListener('focus', onFocus);
      newMessageInput.addEventListener('blur', onBlur);
    }
  });

  onCleanup(() => {
    newMessageWrapper?.removeEventListener('input', () => onExpandableTextareaInput());
    if (newMessageInput) {
      newMessageInput.removeEventListener('keydown', onKeyDown);
      newMessageInput.removeEventListener('focus', onFocus);
      newMessageInput.removeEventListener('blur', onBlur);
    }
  });

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

    let stats: UserStats = {
      pubkey: user.pubkey,
      follows_count: user.userStats?.follows_count || 0,
      followers_count: user.userStats?.followers_count || search?.scores[user.pubkey] || 0,
      note_count: user.userStats?.note_count || 0,
      reply_count: user.userStats?.reply_count || 0,
      time_joined: user.userStats?.time_joined || 0,
      total_zap_count: user.userStats?.total_zap_count || 0,
      total_satszapped: user.userStats?.total_satszapped || 0,
      relay_count: user.userStats?.relay_count || 0,
      media_count: user.userStats?.media_count || 0,
    };

    profile?.actions.addProfileToHistory({...user, userStats: stats });

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

  const msgHasInvoice = (msg: DirectMessage) => {
    const r =/(\s+|\r\n|\r|\n|^)lnbc[a-zA-Z0-9]+/;
    const test = r.test(msg.content);

    return test
  };

  const msgHasCashu = (msg: DirectMessage) => {
    const r =/(\s+|\r\n|\r|\n|^)cashuA[a-zA-Z0-9]+/;
    const test = r.test(msg.content);

    return test
  };

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

  return (
    <div class={styles.newMessage} ref={newMessageWrapper} >
      <textarea
        ref={newMessageInput}
        data-min-rows={2}
        onFocus={() => setInputFocused(true)}
        onBlur={() => setInputFocused(false)}
        onInput={onInput}
        placeholder={intl.formatMessage(tMessages.sendComment)}
      ></textarea>

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
  )
}

export default hookForDev(ChatMessageComposer);
