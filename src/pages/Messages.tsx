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

  const navigate = useNavigate();

  const params = useParams();

  let conversationHolder: HTMLDivElement | undefined;
  let newMessageInput: HTMLTextAreaElement | undefined;
  let newMessageInputBorder: HTMLDivElement | undefined;
  let newMessageWrapper: HTMLDivElement | undefined;

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
    const latests = ids.map(id => ({ latest_at: counts[id].latest_at, id }));

    const ordered = latests.sort((a, b) => b.latest_at - a.latest_at);

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

  // createEffect(() => {
  //   if (!messages || Object.keys(messages.senders).length === 0) {
  //     return;
  //   }


  //   if (params.sender && messages?.senders[senderPubkey()]) {
  //     console.log('select sender 1')
  //     messages.actions.selectSender(params.sender);
  //     return;
  //   }

  //   const first = Object.keys(messages.senders)[0];

  //   console.log('select sender 2')
  //   selectSender(messages.senders[first].npub);

  // });

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

      messages.actions.resetConversationLoaded();
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

  }

  const onKeyUp = (e: KeyboardEvent) => {
    if (e.code === 'Enter') {
      !e.shiftKey && sendMessage();
    }
  };

  onMount(() => {
    // @ts-expect-error TODO: fix types here
    document.addEventListener('input', onExpandableTextareaInput);
    newMessageInput && newMessageInput.addEventListener('keyup', onKeyUp);
  });

  onCleanup(() => {
    // @ts-expect-error TODO: fix types here
    document.removeEventListener('input', onExpandableTextareaInput);
    newMessageInput && newMessageInput.removeEventListener('keyup', onKeyUp);
  });

  const sendMessage = async () => {
    if (!messages?.selectedSender ||
      !newMessageInput ||
      !newMessageInputBorder ||
      !newMessageWrapper) {
      return;
    }

    const text = newMessageInput.value.trim();

    if (text.length === 0) {
      return;
    }

    const msg = {
      id: 'NEW_MESSAGE',
      sender: account?.publicKey || '',
      content: text,
      created_at: Math.floor((new Date()).getTime() / 1000),
    };

    const success = await messages?.actions.sendMessage(messages.selectedSender.pubkey, msg.content)

    if (success) {
      messages?.actions.addToConversation([msg])
      newMessageInput.value = '';
      newMessageInput.style.height = '32px';
      newMessageInputBorder.style.height = '34px';
      newMessageWrapper.style.height = '32px';
    }
  };

  const [inputFocused, setInputFocused] = createSignal(false);

  const areAllRead = () => {
    return messages ?
      Object.keys(messages.messageCountPerSender).reduce(
        (acc, id) => acc &&
          !(messages.messageCountPerSender[id] && messages.messageCountPerSender[id].cnt > 0), true) :
      true;
  };

  const markAllAsRead = () => {
    messages?.actions.resetAllMessages();
  };

  const sendButtonClass = () => {
    return inputFocused() ? styles.primaryButton : styles.secondaryButton;
  };

  return (
    <div>
      <Wormhole to="branding_holder">
        <Branding small={false} />
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
              FOLLOWS
            </button>
            <div class={styles.separator}></div>
            <button
              class={`${styles.categorySelector} ${messages?.senderRelation === 'other' ? styles.highlight : ''}`}
              onClick={() => messages?.actions.changeSenderRelation('other')}
            >
              OTHER
            </button>
          </div>
          <button
            class={styles.markAsRead}
            disabled={areAllRead()}
            onClick={markAllAsRead}
          >
            Mark All Read
          </button>
        </div>
        <div class={styles.sendersList}>
          <For each={orderedSenders()}>
            {
              (sender) => (
                <button
                  class={`${styles.senderItem} ${isSelectedSender(sender.npub) ? styles.selected : ''}`}
                  onClick={() => selectSender(sender.npub)}
                >
                  <Avatar src={sender.picture} size="vs" />
                  <div class={styles.senderInfo}>
                    <div class={styles.firstLine}>
                      <div class={styles.senderName}>
                        {userName(sender)}
                      </div>
                      <div class={styles.lastMessageTime}>
                        {date(messages?.messageCountPerSender[sender.pubkey].latest_at || 0,'short', messages?.now).label}
                      </div>
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
          </div>
          <div class={styles.messages} ref={conversationHolder}>
            <Show when={messages?.selectedSender}>
              <For
                each={messages?.conversation}
                fallback={<Loader />}
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
          </div>
        </div>
      </div>
    </div>
  );
}

export default Messages;
