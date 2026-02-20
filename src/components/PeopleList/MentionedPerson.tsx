import { A } from '@solidjs/router';
import { Component, Show } from 'solid-js';
import { useAppContext } from '../../contexts/AppContext';
import { hookForDev } from '../../lib/devTools';
import { authorName, nip05Verification } from '../../stores/profile';
import { PrimalUser } from '../../types/primal';
import Avatar from '../Avatar/Avatar';
import FollowButton from '../FollowButton/FollowButton';

import styles from './PeopleList.module.scss';
import { accountStore } from '../../stores/accountStore';


const MentionedPerson: Component<{
  person: PrimalUser,
  id?: string,
  noAbout?: boolean,
}> = (props) => {
  const app = useAppContext();

  return (
    <A href={app?.actions.profileLink(props.person?.npub) || ''} class={styles.mentionedPerson}>
      <div class={styles.header}>
        <Avatar
          size="sm"
          user={props.person}
        />
        <div class={styles.content}>
          <div class={styles.name}>
            {authorName(props.person)}
          </div>
          <div class={styles.verification} title={props.person?.nip05}>
            <Show when={props.person?.nip05}>
              <span
                class={styles.verifiedBy}
                title={props.person?.nip05}
              >
                {nip05Verification(props.person)}
              </span>
            </Show>
          </div>
        </div>

        <Show when={accountStore.publicKey !== props.person?.pubkey || !accountStore.following.includes(props.person?.pubkey || '')}>
          <FollowButton person={props.person} />
        </Show>
      </div>

      <Show when={!props.noAbout}>
        <div class={styles.about}>
          {props.person.about || ''}
        </div>
      </Show>
    </A>
  );
}

export default hookForDev(MentionedPerson);
