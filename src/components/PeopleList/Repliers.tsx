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


const Repliers: Component<{
  people: PrimalUser[],
  label: string,
  id?: string,
}> = (props) => {
  const account = useAccountContext();

  const people = () => props.people;

  return (
    <>
      <div class={styles.heading}>{props.label}</div>
      <div id="trending_section" class={styles.trendingSection}>
        <For each={people()}>
          {
            (person) => <MentionedPerson person={person} noAbout={true} />
          }
        </For>
      </div>
    </>
  );
}

export default hookForDev(Repliers);
