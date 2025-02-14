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
import { useAppContext } from '../../contexts/AppContext';


const Repliers: Component<{
  people: PrimalUser[],
  label: string,
  id?: string,
  singleFile?: boolean,
}> = (props) => {
  const app = useAppContext();

  const people = () => props.people;

  return (
    <div>
      <div class={styles.heading}>{props.label}</div>
      <Show
        when={props.singleFile}
        fallback={
          <div id="trending_section" class={styles.trendingUsers}>
            <For each={people()}>
              {
                user => (
                  <A
                    href={app?.actions.profileLink(user.npub) || ''}
                    class={styles.user}
                    title={authorName(user)}
                  >
                    <Avatar user={user} size="vs" />
                    <div class={styles.name}>{authorName(user)}</div>
                  </A>
                )
              }
            </For>
          </div>
        }
      >
        <div id="trending_section" class={styles.trendingSection}>
          <For each={people()}>
            {
              user => (
                <div class="animated"><MentionedPerson person={user} noAbout={true} /></div>
              )
            }
          </For>
        </div>
      </Show>
    </div>
  );
}

export default hookForDev(Repliers);
