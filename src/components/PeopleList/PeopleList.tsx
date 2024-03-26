import { A } from '@solidjs/router';
import { Component, For, Show } from 'solid-js';
import { useAccountContext } from '../../contexts/AccountContext';
import { hookForDev } from '../../lib/devTools';
import { authorName, nip05Verification, truncateNpub } from '../../stores/profile';
import { PrimalUser } from '../../types/primal';
import Avatar from '../Avatar/Avatar';
import FollowButton from '../FollowButton/FollowButton';

import styles from './PeopleList.module.scss';


const PeopleList: Component<{ people: PrimalUser[], label: string, id?: string }> = (props) => {
  const account = useAccountContext();

  const people = () => props.people;

  return (
    <div id={props.id} class={styles.stickyWrapper}>
      <div class={styles.heading}>{props.label}</div>
      <div id="trending_section" class={styles.trendingSection}>
        <For each={people()}>
          {
            (person) =>
              <A href={`/p/${person?.npub}`} class={styles.peopleList}>
                <div class={styles.avatar}>
                  <Avatar
                    size="md"
                    user={person}
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
                <Show when={account?.publicKey !== person.pubkey || !account?.following.includes(person.pubkey)}>
                  <FollowButton person={person} />
                </Show>
              </A>
          }
        </For>
      </div>
    </div>
  );
}

export default hookForDev(PeopleList);
