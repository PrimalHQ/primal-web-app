import { A } from '@solidjs/router';
import { Component, For, Show } from 'solid-js';
import { useAccountContext } from '../../contexts/AccountContext';
import { hookForDev } from '../../lib/devTools';
import { authorName, nip05Verification, truncateNpub } from '../../stores/profile';
import { PrimalNote, PrimalUser } from '../../types/primal';
import Avatar from '../Avatar/Avatar';
import FollowButton from '../FollowButton/FollowButton';
import MentionedPerson from './MentionedPerson';

import styles from './PeopleList.module.scss';


const MentionedPeople: Component<{
  mentioned: PrimalUser[],
  label: string,
  id?: string,
  author: PrimalUser,
}> = (props) => {
  const account = useAccountContext();

  const author = () => props.author;
  const mentioned = () => props.mentioned;

  return (
      <>
        <div class={styles.heading}>{props.label}</div>
        <div id="trending_section" class={styles.authorSection}>
          <MentionedPerson
            person={author()}
          />

          <For each={mentioned()}>
            {(person) =>
              <MentionedPerson
                person={person}
              />
            }
          </For>
        </div>
      </>
  );
}

export default hookForDev(MentionedPeople);
