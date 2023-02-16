import { Component, createEffect, For, Match, Show, Switch } from 'solid-js';
import { style } from 'solid-js/web';
import { useFeedContext } from '../../contexts/FeedContext';
import { date } from '../../lib/dates';
import Avatar from '../Avatar/Avatar';
import { calculateStickyPosition } from '../TrendingPost/helpers';

import styles from './PeopleList.module.scss';


const PeopleList: Component = (props) => {
  const context = useFeedContext();

  const people = () => props.people;

  createEffect(() => {
    // If the content changes, recalculate sticky boundary.
    if (people()) {
      calculateStickyPosition();
    }
  });

  const trimVerification = (address: string) => {
    return address.split('@');
  }

  return (
      <div id="trending_wrapper" class={styles.stickyWrapper}>
        <div class={styles.heading}>People in this thread</div>
        <div id="trending_section" class={styles.trendingSection}>
          <For each={people()}>
            {
              (person) =>
                <div class={styles.peopleList}>
                  <div class={styles.avatar}>
                    <Avatar
                      src={person.picture}
                      size="md"
                      verified={person.nip05}
                    />
                  </div>
                  <div class={styles.content}>
                    <div class={styles.name}>
                      {person.name}
                    </div>
                    <div class={styles.verification} title={person.nip05}>
                      <Show when={person.nip05}>
                        <span class={styles.verifiedName}>
                          {trimVerification(person.nip05)[0]}
                        </span>
                        <span class={styles.verifiedIcon} />
                        <span
                          class={styles.verifiedBy}
                          title={person.nip05}
                        >
                          {trimVerification(person.nip05)[1]}
                        </span>
                      </Show>
                    </div>
                    <div class={styles.npub} title={person.npub}>
                      {person.npub}
                    </div>
                  </div>
                  <div class={styles.action}>
                    <button>follow</button>
                  </div>
                </div>
            }
          </For>
        </div>
      </div>
  );
}

export default PeopleList;
