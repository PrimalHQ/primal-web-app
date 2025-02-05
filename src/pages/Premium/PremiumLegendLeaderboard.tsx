import { Component, createEffect, createSignal, For, Match, Show, Switch } from 'solid-js';

import styles from './Premium.module.scss';
import PageCaption from '../../components/PageCaption/PageCaption';
import PageTitle from '../../components/PageTitle/PageTitle';
import StickySidebar from '../../components/StickySidebar/StickySidebar';
import Wormhole from '../../components/Wormhole/Wormhole';
import Search from '../Search';
import PremiumSidebarActive from './PremiumSidebarActive';
import PremiumSidebarInactve from './PremiumSidebarInactive';
import { useIntl } from '@cookbook/solid-intl';
import { premium as t } from '../../translations';

import foreverPremium from '../../assets/images/premium_forever_small.png';
import privateBetaBuilds from '../../assets/images/private_beta_builds.png';
import customProfile from '../../assets/images/preston_small.png';
import heart from '../../assets/images/heart.png';

import { appStoreLink, playstoreLink } from '../../constants';
import { A, useNavigate } from '@solidjs/router';
import ButtonLink from '../../components/Buttons/ButtonLink';
import ButtonPremium from '../../components/Buttons/ButtonPremium';
import { PremiumStore } from './Premium';
import PremiumUserInfo from './PremiumUserInfo';
import { useAccountContext } from '../../contexts/AccountContext';
import ButtonPrimary from '../../components/Buttons/ButtonPrimary';
import { createStore } from 'solid-js/store';
import { fetchLeaderboard, LegendCustomizationConfig, LegendCustomizationStyle } from '../../lib/premium';
import CheckBox2 from '../../components/Checkbox/CheckBox2';
import { CohortInfo, useAppContext } from '../../contexts/AppContext';
import ButtonSecondary from '../../components/Buttons/ButtonSecondary';
import { TextField } from '@kobalte/core/text-field';
import { useToastContext } from '../../components/Toaster/Toaster';
import { APP_ID } from '../../App';
import { subsTo } from '../../sockets';
import { emptyPaging, fetchLeaderboardThread, LeaderboardInfo, PaginationInfo } from '../../megaFeeds';
import { PrimalUser } from '../../types/primal';
import { userName } from '../../stores/profile';
import PremiumCohortInfo from './PremiumCohortInfo';
import Avatar from '../../components/Avatar/Avatar';
import { shortDate } from '../../lib/dates';
import VerificationCheck from '../../components/VerificationCheck/VerificationCheck';
import { calculateLeaderboardOffset } from '../../utils';
import Paginator from '../../components/Paginator/Paginator';
import { Tabs } from '@kobalte/core/tabs';

export type LeaderboardStore = {
  users: PrimalUser[],
  legendCustomization: Record<string, LegendCustomizationConfig>,
  memberCohortInfo: Record<string, CohortInfo>,
  leaderboard: LeaderboardInfo[],
  paging: PaginationInfo,
}

export type LeaderboardSort = 'last_donation' | 'donated_btc';

const emptyLeaderboard = () => ({
  users: [],
  legendCustomization: {},
  memberCohortInfo: {},
  leaderboard: [],
  paging: { ...emptyPaging() },
});

const PremiumLegendLeaderBoard: Component<{
  data: PremiumStore,
}> = (props) => {

  const app = useAppContext();

  const [tab, setTab] = createSignal<LeaderboardSort>('last_donation')
  const [leaderboardStore, setLeaderboardStore] = createStore<LeaderboardStore>({ ...emptyLeaderboard() });

  createEffect(() => {
    setLeaderboardStore(() => ({ ...emptyLeaderboard() }));
    getLeaderboard(tab());
  });

  const getLeaderboard = async (order: LeaderboardSort) => {
    const subId = `leaderboard_${APP_ID}`;

    const {
      users,
      legendCustomization,
      memberCohortInfo,
      leaderboard,
      paging,
    } = await fetchLeaderboardThread(subId, order, { limit: 20 });

    setLeaderboardStore(() => ({
      users: [ ...users ],
      legendCustomization: { ...legendCustomization },
      memberCohortInfo: { ...memberCohortInfo },
      leaderboard: [ ...leaderboard ],
      paging: { ...paging },
    }));
  };


  const getLeaderboardNextPage = async (order: LeaderboardSort) => {
    if (leaderboardStore.paging.since === 0) return;

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
      leaderboard: [ ...lb.leaderboard, ...leaderboard ],
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
    return lb.donated_btc * 100_000_000;
  };

  return (
    <div class={styles.leaderboardPage}>
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

      <div class={styles.leaderboardTable}>
        <For
          each={leaderboardStore.leaderboard}
        >
          {lb => (
            <div class={styles.lbItem}>
              <div class={styles.listLeft}>
                <div class={styles.index}>{lb.index}</div>
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
                    <div class={styles.userSince}>
                      Since: {shortDate(cohortInfo(lb.pubkey).legend_since)}
                    </div>
                  </div>
                </div>
              </div>
              <div class={styles.listRight}>
                <div class={styles.cohort}>
                  <PremiumCohortInfo
                    user={user(lb.pubkey)}
                    cohortInfo={cohortInfo(lb.pubkey)}
                    legendConfig={legendConfig(lb.pubkey)}
                  />
                </div>
                <div class={styles.donation}>
                  <div class={styles.value}>{donation(lb).toLocaleString()}</div>
                  <div class={styles.unit}>stats</div>
                </div>
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
