import { Component, createEffect, onCleanup } from 'solid-js';
import { isConnected } from '../sockets';
import styles from './ExploreMenu.module.scss';

import NostrStats from '../components/NostrStats/NostrStats';
import ExploreMenuItem from '../components/ExploreMenuItem/ExploreMenuItem';
import { initialExploreData, useExploreContext } from '../contexts/ExploreContext';
import { useAccountContext } from '../contexts/AccountContext';


const ExploreMenu: Component = () => {

  const explore = useExploreContext();
  const account = useAccountContext();

  const legend = () => explore?.legend || { ...initialExploreData.legend };
  const stats = () => explore?.stats || { ...initialExploreData.stats };

  createEffect(() => {
    if (isConnected()) {
      explore?.actions.fetchLegendStats(account?.publicKey);
      explore?.actions.openNetStatsStream();
    }
  });

  onCleanup(() => {
    explore?.actions.closeNetStatsStream();
  });

  return (
    <>
      <div class={styles.statsHolder}>
        <NostrStats stats={stats()}/>
      </div>

      <ExploreMenuItem scope='follows' stat={legend().your_follows} />
      <ExploreMenuItem scope='tribe' stat={legend().your_inner_network} />
      <ExploreMenuItem scope='network' stat={legend().your_outer_network} />
      <ExploreMenuItem scope='global' stat={stats().users} />

    </>
  )
}

export default ExploreMenu;
