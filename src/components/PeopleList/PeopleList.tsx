import { A } from '@solidjs/router';
import { Component, createEffect, For, Match, Show, Switch } from 'solid-js';
import { truncateNpub } from '../../stores/profile';
import { PrimalUser } from '../../types/primal';
import Avatar from '../Avatar/Avatar';
import { useToastContext } from '../Toaster/Toaster';

import styles from './PeopleList.module.scss';


const PeopleList: Component<{ people: PrimalUser[]}> = (props) => {
  const toaster = useToastContext();

  const people = () => props.people;

  const trimVerification = (address: string) => {
    return address.split('@');
  }

  const onFollow = (e: MouseEvent) => {
    e.preventDefault();
    toaster?.notImplemented();
  }

  return (
      <div id="trending_wrapper" class={styles.stickyWrapper}>
        <div class={styles.heading}>People in this thread</div>
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
                      {person?.name}
                    </div>
                    <div class={styles.verification} title={person?.nip05}>
                      <Show when={person?.nip05}>
                        <span class={styles.verifiedName}>
                          {trimVerification(person?.nip05)[0]}
                        </span>
                        <span class={styles.verifiedIcon} />
                        <span
                          class={styles.verifiedBy}
                          title={person?.nip05}
                        >
                          {trimVerification(person?.nip05)[1]}
                        </span>
                      </Show>
                    </div>
                    <div class={styles.npub} title={person?.npub}>
                      {truncateNpub(person?.npub)}
                    </div>
                  </div>
                  <div class={styles.action}>
                    <button onClick={onFollow} >follow</button>
                  </div>
                </A>
            }
          </For>
        </div>
      </div>
  );
}

export default PeopleList;
