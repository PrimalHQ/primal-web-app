import { Component, createEffect, createSignal, For, Match, on, Show, Switch } from 'solid-js';

import styles from './Premium.module.scss';

import { A } from '@solidjs/router';
import { createStore } from 'solid-js/store';
import { LegendCustomizationConfig } from '../../lib/premium';
import { CohortInfo, useAppContext } from '../../contexts/AppContext';
import { APP_ID } from '../../App';
import { emptyPaging, fetchLeaderboardThread, filterAndSortLeaderboard, LeaderboardInfo, PaginationInfo } from '../../megaFeeds';
import { PrimalUser } from '../../types/primal';
import { userName } from '../../stores/profile';
import PremiumCohortInfo from './PremiumCohortInfo';
import Avatar from '../../components/Avatar/Avatar';
import { shortDate } from '../../lib/dates';
import VerificationCheck from '../../components/VerificationCheck/VerificationCheck';
import { calculateLeaderboardOffset, isIOS } from '../../utils';
import Paginator from '../../components/Paginator/Paginator';
import { Tabs } from '@kobalte/core/tabs';
import { isAndroid } from '@kobalte/utils';

export type LeaderboardStore = {
  users: PrimalUser[],
  legendCustomization: Record<string, LegendCustomizationConfig>,
  memberCohortInfo: Record<string, CohortInfo>,
  leaderboard: LeaderboardInfo[],
  paging: PaginationInfo,
}

export type LeaderboardSort = 'last_donation' | 'donated_btc' | 'premium_since';

const emptyLeaderboard = () => ({
  users: [],
  legendCustomization: {},
  memberCohortInfo: {},
  leaderboard: [],
  paging: { ...emptyPaging() },
});

const PremiumLegendLeaderBoard: Component<{
  type: 'legend' | 'premium',
}> = (props) => {

  const app = useAppContext();

  const [tab, setTab] = createSignal<LeaderboardSort>(props.type === 'legend' ? 'last_donation' : 'premium_since')
  const [leaderboardStore, setLeaderboardStore] = createStore<LeaderboardStore>({ ...emptyLeaderboard() });

  createEffect(on(tab, (next, prev) => {
    if (prev !== undefined && next === prev) return;
    setLeaderboardStore(() => ({ ...emptyLeaderboard() }));
    getLeaderboard(tab());
  }));

  const getLeaderboard = async (order: LeaderboardSort) => {
    const subId = `leaderboard_${APP_ID}`;

    const {
      users,
      legendCustomization,
      memberCohortInfo,
      leaderboard,
      paging,
    } = await fetchLeaderboardThread(
      subId,
      order,
      props.type,
      { limit: 20 },
    );

    setLeaderboardStore(() => ({
      users: [ ...users ],
      legendCustomization: { ...legendCustomization },
      memberCohortInfo: { ...memberCohortInfo },
      leaderboard: [ ...filterAndSortLeaderboard(leaderboard, paging) ],
      paging: { ...paging },
    }));
  };


  const getLeaderboardNextPage = async (order: LeaderboardSort) => {
    if (leaderboardStore.paging.since === undefined || leaderboardStore.paging.since === 0) return;

    const subId = `leaderboard_np_${APP_ID}`;

    const offset = calculateLeaderboardOffset(
      leaderboardStore.leaderboard,
      leaderboardStore.paging,
    );

    const since = leaderboardStore.paging.since;

    const {
      users,
      legendCustomization,
      memberCohortInfo,
      leaderboard,
      paging
    } = await fetchLeaderboardThread(
      subId,
      order,
      props.type,
      {
        since,
        offset,
        limit: 20,
      },
    );

    setLeaderboardStore((lb) => ({
      users: [ ...lb.users, ...users ],
      legendCustomization: { ...lb.legendCustomization, ...legendCustomization },
      memberCohortInfo: { ...lb.memberCohortInfo, ...memberCohortInfo },
      leaderboard: [ ...lb.leaderboard, ...filterAndSortLeaderboard(leaderboard, paging) ],
      paging: { ...paging },
    }));
  };

  const user = (pk: string) => {
    return leaderboardStore.users.find(u => u.pubkey === pk);
  };

  const cohortInfo = (pk: string) => {
    return leaderboardStore.memberCohortInfo[pk];
  };

  const legendConfig = (pk: string) => {
    return leaderboardStore.legendCustomization[pk];
  };

  const donation = (lb: LeaderboardInfo) => {
    return lb.donated_btc;
  };

  const sinceDate = (lb: LeaderboardInfo) => {
    if (props.type === 'premium') return shortDate(lb.premium_since);

    return shortDate(cohortInfo(lb.pubkey).legend_since);
  }

  const isDesktop = () => !isAndroid() && !isIOS();

  return (
    <div class={styles.leaderboardPage}>
      <Switch>
        <Match when={props.type === 'legend'}>
          <Tabs onChange={setTab}>
            <Tabs.List class={styles.leaderboardTabs} >
              <Tabs.Trigger class={styles.leaderboardTab} value="last_donation" >
                Latest
              </Tabs.Trigger>
              <Tabs.Trigger class={styles.leaderboardTab} value="donated_btc" >
                Contribution
              </Tabs.Trigger>
              <Tabs.Indicator class={styles.leaderboardTabIndicator} />
            </Tabs.List>
          </Tabs>
        </Match>
        <Match when={props.type === 'premium'}>
          <Tabs onChange={setTab}>
            <Tabs.List class={styles.leaderboardTabs} >
              <Tabs.Trigger class={styles.leaderboardTab} value="premium_since" >
                Latest
              </Tabs.Trigger>
              <Tabs.Indicator class={styles.leaderboardTabIndicator} />
            </Tabs.List>
          </Tabs>
        </Match>
      </Switch>

      <div class={styles.leaderboardTable}>
        <For
          each={leaderboardStore.leaderboard}
        >
          {lb => (
            <div class={styles.lbItem}>
              <div class={styles.listLeft}>
                <Show when={props.type === 'legend'}>
                  <div class={styles.index}>{lb.index}</div>
                </Show>
                <div class={styles.name}>
                  <A href={app?.actions.profileLink(lb.pubkey) || ''} class={styles.avatar}>
                    <Avatar
                      size="vvs"
                      user={user(lb.pubkey)}
                    />
                  </A>
                  <div class={styles.userInfo}>
                    <div class={styles.userName}>
                      <div class={styles.name}>
                        {userName(user(lb.pubkey))}
                      </div>
                      <VerificationCheck
                        user={user(lb.pubkey)}
                      />
                    </div>
                    <Switch>
                      <Match when={props.type === 'legend'}>
                        <div class={styles.userSince}>
                          Since: {sinceDate(lb)}
                        </div>
                      </Match>
                      <Match when={props.type === 'premium'}>
                          <div class={styles.userSince}>
                            {user(lb.pubkey)?.nip05}
                          </div>
                        </Match>
                    </Switch>
                  </div>
                </div>
              </div>
              <div class={styles.listRight}>
                <Show when={isDesktop()}>
                  <div class={styles.cohort}>
                    <PremiumCohortInfo
                      user={user(lb.pubkey)}
                      cohortInfo={cohortInfo(lb.pubkey)}
                      legendConfig={legendConfig(lb.pubkey)}
                    />
                  </div>
                </Show>

                <Switch>
                  <Match when={props.type === 'legend'}>
                    <div class={styles.donation}>
                      <div class={styles.value}>{donation(lb).toLocaleString()}</div>
                      <div class={styles.unit}>stats</div>
                    </div>
                  </Match>
                  <Match when={props.type === 'premium'}>
                    <div class={styles.premiumSince}>
                      Since: {sinceDate(lb)}
                    </div>
                  </Match>
                </Switch>
              </div>
            </div>
          )}
        </For>

        <Paginator
          loadNextPage={() => getLeaderboardNextPage(tab())}
          isSmall={true}
        />
      </div>
    </div>
  );
}

export default PremiumLegendLeaderBoard;
