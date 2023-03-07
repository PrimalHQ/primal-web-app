import { Component, createEffect, createSignal, For, onCleanup, onMount, Show } from 'solid-js';
import { createStore } from 'solid-js/store';
import { Portal, style } from 'solid-js/web';
import { APP_ID, useFeedContext } from '../contexts/FeedContext';
import { getLegendStats, startListeningForNostrStats, stopListeningForNostrStats } from '../lib/stats';
import { isConnected, reset, socket } from '../sockets';
import styles from './ExploreMenu.module.scss';

import globalTrending from '../assets/icons/global_trending.svg';
import globalLatest from '../assets/icons/global_latest.svg';
import globalPopular from '../assets/icons/global_popular.svg';

import networkTrending from '../assets/icons/network_trending.svg';
import networkLatest from '../assets/icons/network_latest.svg';
import networkPopular from '../assets/icons/network_popular.svg';

import tribeTrending from '../assets/icons/tribe_trending.svg';
import tribeLatest from '../assets/icons/tribe_latest.svg';
import tribePopular from '../assets/icons/tribe_popular.svg';

import followsTrending from '../assets/icons/follows_trending.svg';
import followsLatest from '../assets/icons/follows_latest.svg';
import followsPopular from '../assets/icons/follows_popular.svg';

import follows from '../assets/icons/follows.svg';
import tribe from '../assets/icons/tribe.svg';
import network from '../assets/icons/network.svg';
import global from '../assets/icons/global.svg';
import { A } from '@solidjs/router';
import NostrStats from '../components/NostrStats/NostrStats';
import { PrimalLegend, PrimalNetStats } from '../types/primal';
import { timeframeLabels, scopeLabels } from '../constants';
import ExploreMenuItem from '../components/ExploreMenuItem/ExploreMenuItem';


const initialStats: PrimalNetStats = {
  users: 0,
  pubkeys: 0,
  pubnotes: 0,
  reactions: 0,
  reposts: 0,
  any: 0,
  zaps: 0,
  satszapped: 0,
};

const initialLegend = {
  your_follows: 0,
  your_inner_network: 0,
  your_outer_network: 0,
};

const ExploreMenu: Component = () => {


  const [stats, setStats] = createStore({...initialStats});

  const [legend, setLegend] = createStore({...initialLegend});

  const [isListening, setIsListening] = createSignal(false);

  const context = useFeedContext();



  const onMessage = (event: MessageEvent) => {

    const [type, subkey, content] = JSON.parse(event.data);


    if (subkey !== `netstats_${APP_ID}` && subkey !== `stats_legend_${APP_ID}`) {
      return;
    }

    if (content?.content) {
      const stats = JSON.parse(content.content);


      if (content.kind === 10000101) {
        setStats(() => ({ ...stats }));
      }

      if (content.kind === 10000102) {
        setLegend(() => ({ ...stats }));
      }
    }
  };

  createEffect(() => {
    if (isConnected()) {
      socket()?.addEventListener('message', onMessage);

      if (!isListening()) {
        startListeningForNostrStats();
        setIsListening(true);
      }
      getLegendStats(context?.data.publicKey);
    }
  });

  onMount(() => {
    if (isConnected()) {
      if (!isListening()) {
        startListeningForNostrStats();
        setIsListening(true);
      }
      getLegendStats(context?.data.publicKey);
    }
  });

  onCleanup(() => {
    socket()?.removeEventListener('message', onMessage);
    stopListeningForNostrStats();
  });

    const boxes = [
      { scope: 'follows', timeframe: 'latest', icon: followsLatest},
      { scope: 'tribe', timeframe: 'latest', icon: tribeLatest},
      { scope: 'network', timeframe: 'latest', icon: networkLatest},
      { scope: 'global', timeframe: 'latest', icon: globalLatest},

      { scope: 'follows', timeframe: 'trending', icon: followsTrending},
      { scope: 'tribe', timeframe: 'trending', icon: tribeTrending},
      { scope: 'network', timeframe: 'trending', icon: networkTrending},
      { scope: 'global', timeframe: 'trending', icon: globalTrending},

      { scope: 'follows', timeframe: 'popular', icon: followsPopular},
      { scope: 'tribe', timeframe: 'popular', icon: tribePopular},
      { scope: 'network', timeframe: 'popular', icon: networkPopular},
      { scope: 'global', timeframe: 'popular', icon: globalPopular},
    ];

  return (
    <>
      <div class={styles.statsHolder}>
        <NostrStats stats={stats}/>
      </div>

      <ExploreMenuItem scope='follows' stat={legend.your_follows} />
      <ExploreMenuItem scope='tribe' stat={legend.your_inner_network} />
      <ExploreMenuItem scope='network' stat={legend.your_outer_network} />
      <ExploreMenuItem scope='global' stat={stats.users} />

    </>
  )
}

export default ExploreMenu;
