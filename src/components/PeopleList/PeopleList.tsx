import { A } from '@solidjs/router';
import { Component, createEffect, For, Match, onCleanup, onMount, Show, Switch } from 'solid-js';
import { style } from 'solid-js/web';
import { useFeedContext } from '../../contexts/FeedContext';
import { date } from '../../lib/dates';
import { truncateNpub } from '../../stores/profile';
import Avatar from '../Avatar/Avatar';
import { calculateStickyPosition } from '../TrendingPost/helpers';

import styles from './PeopleList.module.scss';


const PeopleList: Component = (props) => {
  const context = useFeedContext();

  const people = () => props.people;

  const trimVerification = (address: string) => {
    return address.split('@');
  }

  let lastScroll = 0;
  let lastWrapperScroll = 0;

  const onScroll = () => {
    const wrapper = document.getElementById('trending_wrapper');
    const scrollTop = document.documentElement.scrollTop;
    const diff = lastScroll - scrollTop;

    wrapper?.scrollTo({ top: lastWrapperScroll - diff , behavior: 'instant'});

    lastScroll = scrollTop;
    lastWrapperScroll = wrapper.scrollTop;
  };


  onMount(() => {
    const wrapper = document.getElementById('trending_wrapper');
    document.addEventListener('scroll', onScroll);
  });

  onCleanup(() => {
    const wrapper = document.getElementById('trending_wrapper');
    document.removeEventListener('scroll', onScroll);
  });

  return (
      <div id="trending_wrapper" class={styles.stickyWrapper}>
        <div id="trending_section" class={styles.trendingSection}>
          <div class={styles.heading}>People in this thread</div>
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
                    <button>follow</button>
                  </div>
                </A>
            }
          </For>
        </div>
      </div>
  );
}

export default PeopleList;
