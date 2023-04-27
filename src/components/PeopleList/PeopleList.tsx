import { useIntl } from '@cookbook/solid-intl';
import { A } from '@solidjs/router';
import { Component, For, Show } from 'solid-js';
import { useAccountContext } from '../../contexts/AccountContext';
import { truncateNpub } from '../../stores/profile';
import { PrimalUser } from '../../types/primal';
import Avatar from '../Avatar/Avatar';
import FollowButton from '../FollowButton/FollowButton';

import styles from './PeopleList.module.scss';


const PeopleList: Component<{ people: PrimalUser[], label: string}> = (props) => {
  const account = useAccountContext();

  const people = () => props.people;

  const trimVerification = (address: string) => {
    return address.split('@');
  }

  const isFollowed = (pubkey: string) => {
    return account?.publicKey && account?.following.includes(pubkey);
  }

  const onFollow = (e: MouseEvent, pubkey: string) => {
    e.preventDefault();
    if (!account) {
      return;
    }

    const action = isFollowed(pubkey) ?
      account.actions.removeFollow :
      account.actions.addFollow;

    action(pubkey);
  }

  const authorName = (person: PrimalUser) => {
    return person.displayName ||
      person.name ||
      truncateNpub(person.npub);
  }

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
                <FollowButton person={person} />
              </A>
          }
        </For>
      </div>
    </div>
  );
}

export default PeopleList;
