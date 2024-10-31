import { Component, createSignal, For, Show } from 'solid-js';
import { hookForDev } from '../../lib/devTools';

import styles from './DirectMessages.module.scss';
import Avatar from '../Avatar/Avatar';
import { nip05Verification, userName } from '../../stores/profile';
import { DMContact } from '../../megaFeeds';
import { date } from '../../lib/dates';
import { DirectMessage } from '../../types/primal';
import { useDMContext } from '../../contexts/DMContext';
import { useAccountContext } from '../../contexts/AccountContext';
import DirectMessageContent from './DirectMessageContent';
import Paginator from '../Paginator/Paginator';
import { TextField } from '@kobalte/core/text-field';
import DirectMessagesComposer from './DirectMessagesComposer';

const DirectMessageConversation: Component<{
  id?: string,
  contact: DMContact,
  messages: DirectMessage[],
}> = (props) => {
  const account = useAccountContext();
  const dms = useDMContext();

  let conversationHolder: HTMLDivElement | undefined;

  return (
    <div class={styles.conversation}>
      <Show when={!dms?.isFetchingMessages}>
        <div class={styles.messages} ref={conversationHolder}>
          <For each={props.messages}>
            {(message, index) => (
              <DirectMessageContent
                previousMessage={props.messages[index()-1]}
                nextMessage={props.messages[index()+1]}
                contact={props.contact}
                message={message}
              />
            )}
          </For>
          <Paginator
            loadNextPage={dms?.actions.getConversationNextPage}
            isSmall={true}
          />
        </div>
      </Show>
    </div>
  )
}

export default hookForDev(DirectMessageConversation);
