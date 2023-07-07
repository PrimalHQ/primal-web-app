import { A } from '@solidjs/router';
import { Component, For, Show } from 'solid-js';
import { authorName, nip05Verification, truncateNpub } from '../../stores/profile';
import { PrimalUser } from '../../types/primal';
import Avatar from '../Avatar/Avatar';
import FollowButton from '../FollowButton/FollowButton';

import styles from './PeopleList.module.scss';


const PeopleList: Component<{ people: PrimalUser[], label: string}> = (props) => {
  const people = () => props.people;

  return (
    <div id="trending_wrapper" class={styles.stickyWrapper}>
      <div class={styles.heading}>{props.label}</div>
      <div id="trending_section" class={styles.trendingSection}>
        <For each={people()}>
          {
            (person) =>
              <A href={`/profile/${person?.npub}`} class={styles.peopleList}>
                <div class={styles.avatar}>
                  <Avatar
                    src={person?.picture}
                    size="md"
                    verified={person?.nip05}
                  />
                </div>
                <div class={styles.content}>
                  <div class={styles.name}>
                    {authorName(person)}
                  </div>
                  <div class={styles.verification} title={person?.nip05}>
                    <Show when={person?.nip05}>
                      <span
                        class={styles.verifiedBy}
                        title={person?.nip05}
                      >
                        {nip05Verification(person)}
                      </span>
                    </Show>
                  </div>
                  <div class={styles.npub} title={person?.npub}>
                    {truncateNpub(person?.npub)}
                  </div>
                </div>
                <FollowButton person={person} />
              </A>
          }
        </For>
      </div>
    </div>
  );
}

export default PeopleList;
