import { Component, Show } from 'solid-js';
import { useAccountContext } from '../../contexts/AccountContext';
import { hookForDev } from '../../lib/devTools';
import { PrimalNote, PrimalUser } from '../../types/primal';
import MentionedPeople from './MentionedPeople';

import styles from './PeopleList.module.scss';
import Repliers from './Repliers';


const PeopleList: Component<{
  people: PrimalUser[],
  label?: string,
  mentionLabel?: string,
  id?: string,
  note?: PrimalNote,
}> = (props) => {
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
            label={props.mentionLabel || ''}
          />
        </Show>

        <Show when={repliers().length > 0}>
          <Repliers
            people={repliers()}
            label={props.label || ''}
          />
        </Show>
      </div>
  );
}

export default hookForDev(PeopleList);
