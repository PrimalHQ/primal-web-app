import { A } from '@solidjs/router';
import { Component, For, Show } from 'solid-js';
import { useAccountContext } from '../../contexts/AccountContext';
import { hookForDev } from '../../lib/devTools';
import { authorName, nip05Verification, truncateNpub } from '../../stores/profile';
import { PrimalNote, PrimalUser } from '../../types/primal';
import Avatar from '../Avatar/Avatar';
import FollowButton from '../FollowButton/FollowButton';
import MentionedPeople from './MentionedPeople';

import styles from './PeopleList.module.scss';
import Repliers from './Repliers';


const PeopleList: Component<{
  people: PrimalUser[],
  label: string,
  id?: string,
  note?: PrimalNote,
}> = (props) => {
  const account = useAccountContext();

  const author = () => props.note?.user;

  const mentioned = () => {
    if (!props.note) return [];

    return props.people.filter(p => p.pubkey !== author()?.pubkey && (props.note?.mentionedUsers || {})[p.pubkey] !== undefined);
  };

  const repliers = () => {
    if (!props.note) return props.people;

    return props.people.filter(p => p.pubkey !== author()?.pubkey && (props.note?.mentionedUsers || {})[p.pubkey] === undefined);
  }


  return (
      <div id={props.id} class={styles.stickyWrapper}>
        <Show when={author()}>
          <MentionedPeople
            mentioned={mentioned()}
            author={author()}
            label="People in this Note"
          />
        </Show>

        <Show when={repliers().length > 0}>
          <Repliers
            people={repliers()}
            label={props.label}
          />
        </Show>
      </div>
  );
}

export default hookForDev(PeopleList);
