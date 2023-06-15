import { useIntl } from '@cookbook/solid-intl';
import { nip19, Relay } from 'nostr-tools';
import { Component, createEffect, createSignal, For, onCleanup, onMount, Show } from 'solid-js';
import { APP_ID } from '../App';
import Avatar from '../components/Avatar/Avatar';
import EditBox from '../components/NewNote/EditBox/EditBox';
import { useAccountContext } from '../contexts/AccountContext';
import { useMessagesContext } from '../contexts/MessagesContext';
import { getMessageCounts } from '../lib/messages';
import { truncateNpub, userName } from '../stores/profile';
import { PrimalNote, PrimalUser, UserRelation } from '../types/primal';
import { date } from '../lib/dates';

import styles from './Messages.module.scss';
import EmbeddedNote from '../components/EmbeddedNote/EmbeddedNote';
import { A, useNavigate, useParams } from '@solidjs/router';
import { linkPreviews, parseNote1 } from '../lib/notes';
import LinkPreview from '../components/LinkPreview/LinkPreview';
import { hexToNpub } from '../lib/keys';
import Branding from '../components/Branding/Branding';
import Wormhole from '../components/Wormhole/Wormhole';
import Loader from '../components/Loader/Loader';
import { style } from 'solid-js/web';
import SearchOption from '../components/Search/SearchOption';
import { debounce, isVisibleInContainer } from '../utils';
import { useSearchContext } from '../contexts/SearchContext';
import { createStore } from 'solid-js/store';
import { editMentionRegex } from '../constants';
import FindUsers from '../components/Search/FindUsers';
import Search from '../components/Search/Search';
import { useProfileContext } from '../contexts/ProfileContext';
import Paginator from '../components/Paginator/Paginator';
import { store } from '../services/StoreService';

type AutoSizedTextArea = HTMLTextAreaElement & { _baseScrollHeight: number };

export const parseNoteLinks = (text: string, mentionedNotes: Record<string, PrimalNote>, mentionedUsers: Record<string, PrimalUser>, highlightOnly?: boolean) => {

  const regex = /\bnostr:((note|nevent)1\w+)\b|#\[(\d+)\]/g;

  return text.replace(regex, (url) => {
    const [_, id] = url.split(':');

    if (!id) {
      return url;
    }

    try {
      const note = mentionedNotes[id];

      const path = `/thread/${id}`;

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
      const path = `/profile/${npub}`;

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

  const intl = useIntl();
  const messages = useMessagesContext();
  const account = useAccountContext();
  const profile = useProfileContext();

  const navigate = useNavigate();

  const params = useParams();

  let conversationHolder: HTMLDivElement | undefined;
  let newMessageInput: HTMLTextAreaElement | undefined;
  let newMessageInputBorder: HTMLDivElement | undefined;
  let newMessageWrapper: HTMLDivElement | undefined;
  let sendersListElement: HTMLDivElement | undefined;

  const senderNpub = () => {
    if (!params.sender) {
      return '';
    }

    if (params.sender.startsWith('npub')) {
      return params.sender;
    }

    return nip19.noteEncode(params.sender);
  };

  const orderedSenders = () => {
    if (!messages || !messages.senders) {
      return [];
    }
    const senders = messages.senders;
    const counts = messages.messageCountPerSender;

    const ids = Object.keys(senders);
    const latests = ids.map(id => ({ latest_at: counts[id]?.latest_at || null, id }));

    const ordered = latests.sort((a, b) => {
      if (!a.latest_at) {
        return -1;
      }

      if (!b.latest_at) {
        return 1;
      }

      return b.latest_at - a.latest_at
    });

    return ordered.map(o => senders[o.id]);
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
    if (!params.sender && messages?.senders) {
      const senderIds = Object.keys(messages.senders);
      senderIds.length > 0 && navigate(`/messages/${messages.senders[senderIds[0]].npub}`);
      return;
    }

    if (messages?.selectedSender &&
      params.sender !== messages?.selectedSender?.npub &&
      params.sender !== messages?.selectedSender?.pubkey
    ) {
      navigate(`/messages/${messages?.selectedSender.npub}`);
      return;
    }
  });

  createEffect(() => {
    const count = messages?.messageCount || 0;

    if (account?.isKeyLookupDone && account.hasPublicKey() && count === 0) {
      messages?.actions.getMessagesPerSender();
    }
  });

  createEffect(() => {
    const count = messages?.messageCount || 0;

    if (count > 0) {
      messages?.actions.getMessagesPerSender();
    }
  })

  createEffect(() => {
    if (messages?.isConversationLoaded) {
      if (conversationHolder) {
        conversationHolder.scrollTop = conversationHolder.scrollHeight;
      }

      // messages.actions.resetConversationLoaded();
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
    const regex = /(?:\s|^)?#[^\s!@#$%^&*(),.?":{}|<>]+/ig;

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
          parseNote1(message)
        ),
        messages?.referecedUsers,
      ),
      messages?.referecedNotes,
      messages?.referecedUsers
    );
  };
  const replaceLinkPreviews = (text: string) => {
    let parsed = text;

    const regex = /__LINK__.*?__LINK__/ig;

    parsed = parsed.replace(regex, (link) => {
      const url = link.split('__LINK__')[1];

      const preview = linkPreviews[url];

      // No preview? That can only mean that we are still waiting.
      if (!preview) {
        return link;
      }

      if (preview.noPreview) {
        return `<a link href="${url}" target="_blank" >${url}</a>`;
      }

      const linkElement = (<div class={styles.bordered}><LinkPreview preview={preview} /></div>);

      // @ts-ignore
      return linkElement.outerHTML;
    });

    return parsed;
  }

  const getScrollHeight = (elm: AutoSizedTextArea) => {
    var savedValue = elm.value
    elm.value = ''
    elm._baseScrollHeight = elm.scrollHeight
    elm.value = savedValue
  }

  const [message, setMessage] = createSignal('');

  const onExpandableTextareaInput: (event: InputEvent) => void = (event) => {
    const maxHeight = 800;

    const elm = event.target as AutoSizedTextArea;

    if(elm.nodeName !== 'TEXTAREA') {
      return;
    }

    const minRows = parseInt(elm.getAttribute('data-min-rows') || '0');

    !elm._baseScrollHeight && getScrollHeight(elm);


    if (elm.scrollHeight >= (maxHeight / 3)) {
      return;
    }

    elm.rows = minRows;
    const rows = elm.value === '' ? 0 : Math.ceil((elm.scrollHeight - elm._baseScrollHeight) / 14);

    elm.rows = minRows + rows;
    elm.style.height = `${32 + (14 * rows)}px`;

    if (newMessageWrapper) {
      newMessageWrapper.style.height = `${32 + (14 * rows)}px`;
    }

    if (newMessageInputBorder) {
      newMessageInputBorder.style.height = `${34 + (14 * rows)}px`;
    }

    debounce(() => {
      setMessage(elm.value)
    }, 300);

  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      debounce(() => {
        sendMessage();
      }, 300);

      return false;
    }
  };

  onMount(() => {
    // @ts-expect-error TODO: fix types here
    document.addEventListener('input', onExpandableTextareaInput);
    newMessageInput && newMessageInput.addEventListener('keydown', onKeyDown);
  });

  onCleanup(() => {
    // @ts-expect-error TODO: fix types here
    document.removeEventListener('input', onExpandableTextareaInput);
    newMessageInput && newMessageInput.removeEventListener('keydown', onKeyDown);
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
      newMessageInput.style.height = '32px';
      newMessageInputBorder.style.height = '34px';
      newMessageWrapper.style.height = '32px';

      setTimeout(() => {
        const element = document.querySelector(`[data-user="${messages?.selectedSender?.pubkey}"]`);

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
  const [query, setQuery] = createSignal('');

  let mentionOptions: HTMLDivElement | undefined;

  const prepareMessageForSending = (text: string) => {

    return text.replace(editMentionRegex, (url) => {

      const [_, name] = url.split('\`');
      const user = userRefs[name];

      // @ts-ignore
      return ` nostr:${user.npub}`;
    })
  }

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

  createEffect(() => {
    const msg = message();

    checkForMentioning(msg);
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

  const positionOptions = () => {
    if (!newMessageInput || !mentionOptions || !newMessageWrapper) {
      return;
    }

    let newBottom = 32;

    mentionOptions.style.removeProperty('top');
    mentionOptions.style.bottom = `${newBottom}px`;
    mentionOptions.style.left = '0px';
  };

  const [userRefs, setUserRefs] = createStore<Record<string, PrimalUser>>({});

  const selectUser = (user: PrimalUser) => {

    if (!newMessageInput) {
      return;
    }
    const name = userName(user);

    setUserRefs((refs) => ({
      ...refs,
      [name]: user,
    }));

    messages?.actions.addUserReference(user);

    let value = message();

    value = value.slice(0, value.lastIndexOf('@'));

    setQuery('');

    setMessage(`${value}@\`${name}\` `);
    newMessageInput.value = message();

    newMessageInput.focus();


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

      const element = document.querySelector(`[data-user="${messages.selectedSender.pubkey}"]`);

      if (element && sendersListElement && !isVisibleInContainer(element, sendersListElement)) {
        element.scrollIntoView();
      }

    }
  });

  return (
    <div>
      <Wormhole to="branding_holder">
        <Branding small={false} />
      </Wormhole>


      <Wormhole
        to="search_section"
      >
        <Search
          placeholder={
            intl.formatMessage(
              {
                id: 'placeholders.findUser',
                defaultMessage: 'find user',
                description: 'Find user input placeholder',
              }
            )
          }
          onInputConfirm={() => {}}
          noLinks={true}
          hideDefault={true}
          onUserSelect={addUserToSenders}
        />
      </Wormhole>

      <div id="central_header" class={styles.fullHeader}>
        <div>
          {intl.formatMessage(
            {
              id: 'pages.messages.title',
              defaultMessage: 'Messages',
              description: 'Title of messages page',
            }
          )}
        </div>
      </div>

      <div class={styles.messagesContent}>

        <div class={styles.sendersHeader}>
          <div class={styles.senderCategorySelector}>
            <button
              class={`${styles.categorySelector} ${messages?.senderRelation === 'follows' ? styles.highlight : ''}`}
              onClick={() => messages?.actions.changeSenderRelation('follows')}
            >
              {intl.formatMessage(
                {
                  id: 'directMessages.relations.follows',
                  defaultMessage: 'follows',
                  description: 'DM relation selection label for follows',
                }
              )}
            </button>
            <div class={styles.separator}></div>
            <button
              class={`${styles.categorySelector} ${messages?.senderRelation === 'other' ? styles.highlight : ''}`}
              onClick={() => messages?.actions.changeSenderRelation('other')}
            >
              {intl.formatMessage(
                {
                  id: 'directMessages.relations.other',
                  defaultMessage: 'other',
                  description: 'DM relation selection label for other',
                }
              )}
            </button>
          </div>
          <button
            class={styles.markAsRead}
            disabled={!messages?.messageCount}
            onClick={markAllAsRead}
          >
            {intl.formatMessage(
              {
                id: 'directMessages.markAsRead',
                defaultMessage: 'Mark All Read',
                description: 'DM mark as read label',
              }
            )}
          </button>
        </div>

        <div class={styles.sendersList} ref={sendersListElement}>
          <For each={orderedSenders()}>
            {
              (sender) => (
                <button
                  class={`${styles.senderItem} ${isSelectedSender(sender.npub) ? styles.selected : ''}`}
                  onClick={() => selectSender(sender.npub)}
                  data-user={sender.pubkey}
                >
                  <Avatar src={sender.picture} size="vs" />
                  <div class={styles.senderInfo}>
                    <div class={styles.firstLine}>
                      <div class={styles.senderName}>
                        {userName(sender)}
                      </div>
                      <Show when={messages?.messageCountPerSender[sender.pubkey] && messages?.messageCountPerSender[sender.pubkey].latest_at > 0}>
                        <div class={styles.lastMessageTime}>
                          {date(messages?.messageCountPerSender[sender.pubkey].latest_at || 0,'short', messages?.now).label}
                        </div>
                      </Show>
                    </div>
                    <div class={styles.secondLine}>
                      {sender.nip05}
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

        <div class={styles.conversation}>
          <div class={styles.newMessage} ref={newMessageWrapper} >
            <div class={styles.textAreaBorder} ref={newMessageInputBorder}>
              <textarea
                ref={newMessageInput}
                data-min-rows={2}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                value={message()}
              ></textarea>
            </div>
            <button
              class={sendButtonClass()}
              onClick={sendMessage}
            >
              <div>
                <span>
                  {intl.formatMessage(
                    {
                      id: 'actions.directMessages.send',
                      defaultMessage: 'send',
                      description: 'Send direct message action, button label',
                    }
                  )}
                </span>
              </div>
            </button>

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
                        <div class={styles.avatar}>
                          <Avatar src={account?.activeUser?.picture} size="xxs" />
                        </div>
                        <div class={styles.threadMessages}>
                          <For each={thread.messages}>
                            {(msg) => (
                              <div
                                class={styles.message}
                                data-event-id={msg.id}
                                title={date(msg.created_at || 0).date.toLocaleString()}
                                innerHTML={replaceLinkPreviews(parseMessage(msg.content))}
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
                      <div class={styles.avatar}>
                        <Avatar src={user(thread.author)?.picture} size="xxs" />
                      </div>
                      <div class={styles.threadMessages}>
                        <For each={thread.messages}>
                          {(msg) => (
                            <div
                              class={styles.message}
                              data-event-id={msg.id}
                              title={date(msg.created_at || 0).date.toLocaleString()}
                              innerHTML={replaceLinkPreviews(parseMessage(msg.content))}
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
