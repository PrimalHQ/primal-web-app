import { useIntl } from '@cookbook/solid-intl';
import { Relay } from 'nostr-tools';
import { Component, createEffect, For, onMount, Show } from 'solid-js';
import { APP_ID } from '../App';
import Avatar from '../components/Avatar/Avatar';
import EditBox from '../components/NewNote/EditBox/EditBox';
import { useAccountContext } from '../contexts/AccountContext';
import { useMessagesContext } from '../contexts/MessagesContext';
import { getMessageCounts } from '../lib/messages';
import { userName } from '../stores/profile';
import { PrimalUser } from '../types/primal';
import { date } from '../lib/dates';

import styles from './Messages.module.scss';


const Messages: Component = () => {

  const intl = useIntl();
  const messages = useMessagesContext();
  const account = useAccountContext();

  let conversationHolder: HTMLDivElement | undefined;

  onMount(() => {
    const count = messages?.messageCount || 0;

    if (count === 0) {
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

  const senders = () => {
    if (!messages?.senders) {
      return [];
    }


    return Object.keys(messages?.senders).map(id => messages?.senders[id]);
  };

  const user = (pubkey: string) => {
    return messages?.senders[pubkey];
  }

  const mgsFromSender = (sender: PrimalUser) => {
    return messages?.messageCountPerSender[sender.pubkey] || 0;
  }

  const isSelectedSender = (senderId: string) => {
    return messages?.selectedSender?.pubkey === senderId;
  };

  const sendMessage = (text: string, relays: Relay[], tags: string[][]) => {
    console.log('SEND: ', text, relays, tags);
  };

  return (
    <div>
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
        <div class={styles.sendersList}>
          <For each={senders()}>
            {
              (sender) => (
                <button
                  class={`${styles.senderItem} ${isSelectedSender(sender.pubkey) ? styles.selected : ''}`}
                  onClick={() => messages?.actions.selectSender(sender)}
                >
                  <Avatar src={sender.picture} size="vs" />
                  <div class={styles.senderInfo}>
                    <div class={styles.senderName}>
                      {userName(sender)}
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
          <div class={styles.messages} ref={conversationHolder}>
            <Show when={messages?.selectedSender}>
              <For each={messages?.conversation}>
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
                              <div class={styles.message}>{msg.content}</div>
                            )}
                          </For>
                        </div>
                        <Show when={thread.messages[thread.messages.length - 1]}>
                          <div class={styles.threadTime}>
                            {date(thread.messages[thread.messages.length - 1].created_at, 'long').label}
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
                            <div class={styles.message}>{msg.content}</div>
                          )}
                        </For>
                      </div>
                      <Show when={thread.messages[thread.messages.length - 1]}>
                        <div class={styles.threadTime}>
                          {date(thread.messages[thread.messages.length - 1].created_at, 'long').label}
                        </div>
                      </Show>
                    </div>
                  </Show>
                )}
              </For>
            </Show>
          </div>

          <div class={styles.newMessage}>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Messages;
