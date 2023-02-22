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

const ExploreMenu: Component<{ legend: PrimalLegend, stats: PrimalNetStats}> = (props) => {

    const timeframeLabels: Record<string, string> = {
      latest: 'latest',
      trending: 'trending',
      popular: 'popular',
    };

    const scopeLabels: Record<string, string> = {
      follows: 'my follows',
      tribe: 'my tribe',
      network: 'my network',
      global: 'global'
    };

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
        <div class={styles.exploreMenu}>
          <For each={boxes}>
            {(box) =>
              <A
                href={`/explore/${box.scope}/${box.timeframe}`}
                class={styles.exploreBox}
              >
                <div>
                  <div
                    class={`${styles.exploreBoxIcon} ${styles[`${box.scope}_${box.timeframe}_icon`]}`}
                  >
                  </div>
                  <div class={styles.firstLine}>{timeframeLabels[box.timeframe]}</div>
                  <div class={styles.secondLine}>{scopeLabels[box.scope]}</div>
                </div>
              </A>
            }
          </For>
        </div>

        <div class={styles.statsLegend}>
          <div class={styles.legendDetails}>
            <div class={styles.legendIcon}>
              <div class={styles.followsIcon}></div>
            </div>
            <div class={styles.legendName}>Follows</div>
            <div class={styles.legendNumber}>{props.legend.your_follows}</div>
            <div class={styles.legendDescription}>accounts you follow</div>
          </div>
          <div class={styles.legendDetails}>
            <div class={styles.legendIcon}>
              <div class={styles.tribeIcon}></div>
            </div>
            <div class={styles.legendName}>Tribe</div>
            <div class={styles.legendNumber}>{props.legend.your_inner_network}</div>
            <div class={styles.legendDescription}>your follows + your followers</div>
          </div>
          <div class={styles.legendDetails}>
            <div class={styles.legendIcon}>
              <div class={styles.networkIcon}></div>
            </div>
            <div class={styles.legendName}>Network</div>
            <div class={styles.legendNumber}>{props.legend.your_outer_network}</div>
            <div class={styles.legendDescription}>your follows + everyone they follow</div>
          </div>
          <div class={styles.legendDetails}>
            <div class={styles.legendIcon}>
              <div class={styles.globalIcon}></div>
            </div>
            <div class={styles.legendName}>Global</div>
            <div class={styles.legendNumber}>{props.stats.users.toLocaleString()}</div>
            <div class={styles.legendDescription}>all account on nostr</div>
          </div>
        </div>
      </>
    )
}

export default ExploreMenu;
