import { Component, createEffect, For, onCleanup, onMount, Show } from 'solid-js';
import styles from './Explore.module.scss';
import { useToastContext } from '../../components/Toaster/Toaster';
import { useSettingsContext } from '../../contexts/SettingsContext';
import { useIntl } from '@cookbook/solid-intl';
import { useExploreContext } from '../../contexts/ExploreContext';
import { A, useLocation } from '@solidjs/router';
import { fetchExplorePeople, PaginationInfo } from '../../megaFeeds';
import { APP_ID } from '../../App';
import { nip05Verification, userName } from '../../stores/profile';
import Avatar from '../../components/Avatar/Avatar';
import Paginator from '../../components/Paginator/Paginator';
import FollowButton from '../../components/FollowButton/FollowButton';
import VerificationCheck from '../../components/VerificationCheck/VerificationCheck';
import { humanizeNumber } from '../../lib/stats';
import { useAccountContext } from '../../contexts/AccountContext';
import { calculatePagingOffset } from '../../utils';
import { PrimalUser } from '../../types/primal';
import { useAppContext } from '../../contexts/AppContext';

const ExplorePeople: Component<{ open?: boolean }> = (props) => {

  const settings = useSettingsContext();
  const toaster = useToastContext();
  const intl = useIntl();
  const explore = useExploreContext();
  const location = useLocation();
  const account = useAccountContext();
  const app = useAppContext();


  onMount(() => {
    if (explore?.exploreMedia.length === 0) {
      getPeople();
    }
  });

  const getPeople = async () => {
    const { users, paging, page } = await fetchExplorePeople(account?.publicKey, `explore_people_${APP_ID}`, { limit: 20 });

    explore?.actions.setExplorePeople(users, paging, page);
  }

  const getNextPeoplePage = async () => {
    if (!explore || explore.peoplePaging.since === 0) return;

    const since = explore.peoplePaging.since || 0;
    const offset = explore.explorePeople.reduce<number>((acc, m) => {
      // @ts-ignore
      return since === m.userStats?.followers_increase?.increase ? acc + 1 : acc
    }, 0)

    const pagination = {
      limit: 20,
      until: explore.peoplePaging.since,
      offset,
    }

    const { users, paging, page } = await fetchExplorePeople(account?.publicKey, `explore_people_${APP_ID}` , pagination);


    explore?.actions.setExplorePeople(users, paging, page);
  }


  return (
    <div class={styles.explorePeople}>
      <div class={styles.peopleGrid}>
        <For each={explore?.explorePeople}>
          {user => (
            <A href={app?.actions.profileLink(user.npub) || ''} class={styles.explorePerson}>
              <div class={styles.userImage}>
                <Avatar user={user} size="mll"/>
                <div class={styles.follow}>
                  <FollowButton
                    person={user}
                  />
                </div>
              </div>

              <div class={styles.userInfo}>
                <div class={styles.userData}>
                  <div class={styles.userBasicData}>
                    <div class={styles.userName}>
                      {userName(user)}
                      <VerificationCheck user={user} />
                    </div>
                    <Show when={user.nip05}>
                      <div class={styles.nip05}>
                        {nip05Verification(user)}
                      </div>
                    </Show>
                  </div>
                  <div class={styles.userAdditionalData}>
                    <div class={`${styles.userAbout} ${!user.nip05 ? styles.extended : ''}`}>
                      {user.about}
                    </div>
                  </div>
                </div>

                <div class={styles.userStats}>
                  <Show when={user.userStats?.followers_count}>
                    <div class={styles.number}>
                      {humanizeNumber(user.userStats?.followers_count || 0)}
                    </div>
                    <div class={styles.unit}>
                      followers
                    </div>
                  </Show>
                  <Show when={user.userStats?.followers_increase?.increase}>
                    <div class={styles.increaseCount}>
                      <span>
                        + {user.userStats?.followers_increase?.increase.toLocaleString()}
                      </span>
                    </div>
                  </Show>
                </div>
              </div>
            </A>
          )}
        </For>
      </div>
      <Paginator
        isSmall={true}
        loadNextPage={getNextPeoplePage}
      />
    </div>
  )
}

export default ExplorePeople;
