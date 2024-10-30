import { Component, createEffect, createSignal, For, Match, Show, Switch } from 'solid-js';
import { hookForDev } from '../../lib/devTools';

import styles from './DirectMessages.module.scss';
import Avatar from '../Avatar/Avatar';
import { nip05Verification, userName } from '../../stores/profile';
import { DMContact } from '../../megaFeeds';
import { date } from '../../lib/dates';
import { DirectMessage } from '../../types/primal';
import { useDMContext } from '../../contexts/DMContext';
import { useAccountContext } from '../../contexts/AccountContext';
import { A } from '@solidjs/router';
import { useAppContext } from '../../contexts/AppContext';
import { hexToNpub } from '../../lib/keys';
import { msgHasCashu, msgHasInvoice, now } from '../../utils';
import DirectMessageParsedContent from './DirectMessageParsedContent';
import { linebreakRegex } from '../../constants';
import Lnbc from '../Lnbc/Lnbc';
import Cashu from '../Cashu/Cashu';

const recentTime = 900;

const DirectMessageConversation: Component<{
  id?: string,
  previousMessage: DirectMessage | undefined,
  nextMessage: DirectMessage | undefined,
  contact: DMContact,
  message: DirectMessage,
}> = (props) => {
  const account = useAccountContext();
  const app = useAppContext();
  const dms = useDMContext();

  const isFromPreviusSender = () => props.message.sender === props.previousMessage?.sender;
  const isLastRecent = () => props.message.created_at - (props.nextMessage?.created_at || 0) > recentTime;

  const isRecent = () => (props.previousMessage?.created_at || 0) - props.message.created_at < recentTime;
  const isNextFromDifferentSender = () => props.message.sender !== props.nextMessage?.sender;

  const isMe = () => props.message.sender === account?.publicKey;

  const getThreadStatus = () => {
    if (isFromPreviusSender() && isRecent()) return 'old';

    return 'new';
  }

  const renderMessage = () => {
    const msg = props.message;

    if (!msgHasInvoice(msg.content) && !msgHasCashu(msg.content)) {
      return (
        <div
          class={`${styles.message} ${messageClass( )}`}
          data-event-id={msg.id}
          title={date(msg.created_at || 0).date.toLocaleString()}
        >
          <DirectMessageParsedContent
            content={msg.content}
          />
        </div>
      );
    };

    let sections: string[] = [];

    let content = msg.content.replace(linebreakRegex, ' __LB__ ').replace(/\s+/g, ' __SP__ ');

    let tokens: string[] = content.split(/[\s]+/);

    let sectionIndex = 0;

    tokens.forEach((t) => {
      if (t.startsWith('lnbc') || t.startsWith('cashuA')) {
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
          c = prev.length === 0 ? '' : '\r';
        }

        sections[sectionIndex] = prev + c;
      }
    });

    return (
      <For each={sections.reverse()}>
        {section => (
          <Switch fallback={
            <div
              class={`${styles.message} ${messageClass()}`}
              data-event-id={msg.id}
              title={date(msg.created_at || 0).date.toLocaleString()}
            >
              <DirectMessageParsedContent
                content={section}
              />
            </div>
          }>
            <Match when={section.startsWith('lnbc')}>
              <div
                class={`${styles.messageLn} ${messageClass()}`}
                data-event-id={msg.id}
                title={date(msg.created_at || 0).date.toLocaleString()}
              >
                <Lnbc lnbc={section} noBack={true} alternative={isMe()} />
              </div>
            </Match>
            <Match when={section.startsWith('cashuA')}>
              <div
                class={`${styles.messageLn} ${messageClass()}`}
                data-event-id={msg.id}
                title={date(msg.created_at || 0).date.toLocaleString()}
              >
                <Cashu token={section} noBack={true} alternative={isMe()} />
              </div>
            </Match>
          </Switch>
        )}
      </For>
    );
  };

  const messageClass = () => {

    let klass = `${getThreadStatus() === 'old' ? styles.oldThread : styles.newThread}`;

    if (isLastRecent() || isNextFromDifferentSender()) {
      klass += ` ${styles.lastInThread}`;
    }

    return klass;
  }

  return (
      <Show
        when={!isMe()}
        fallback={
          <div class={styles.myThread}>
            <Show when={isLastRecent() || isNextFromDifferentSender()}>
              <A
                href={app?.actions.profileLink(hexToNpub(props.message.sender)) || ''}
                class={styles.avatar}
              >
                <Avatar user={account?.activeUser} size="xxs" />
              </A>
            </Show>

            <div class={styles.threadMessages}>
              {renderMessage()}
            </div>

            <Show when={getThreadStatus() === 'new'}>
              <div class={styles.threadTime}>
                {date(props.message.created_at, 'long', now()).label}
              </div>
            </Show>
          </div>
        }
      >
        <div class={styles.theirThread}>
          <Show when={isLastRecent() || isNextFromDifferentSender()}>
            <A
              href={app?.actions.profileLink(hexToNpub(props.message.sender)) || ''}
              class={styles.avatar}
            >
              <Avatar user={props.contact.user} size="xxs" />
            </A>
          </Show>

            <div class={styles.threadMessages}>
              {renderMessage()}
            </div>

          <Show when={getThreadStatus() === 'new'}>
            <div class={styles.threadTime}>
            {date(props.message.created_at, 'long', now()).label}
            </div>
          </Show>
          </div>
      </Show>
  )
}

export default hookForDev(DirectMessageConversation);
