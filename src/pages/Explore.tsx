import { Component, createEffect, createSignal, For, onCleanup, onMount, Show } from 'solid-js';
import { createStore } from 'solid-js/store';
import { Portal, style } from 'solid-js/web';
import { APP_ID, useFeedContext } from '../contexts/FeedContext';
import { getLegendStats, startListeningForNostrStats, stopListeningForNostrStats } from '../lib/stats';
import { isConnected, reset, socket } from '../sockets';
import styles from './Explore.module.scss';

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

type PrimalNetStats = {
  users: number,
  pubkeys: number,
  pubnotes: number,
  reactions: number,
  reposts: number,
  any: number,
  zaps: number,
  satszapped: number,
};

type PrimalResponse = {
  op: string,
  netstats?: PrimalNetStats;
};

type PrimalLegend = {
  your_follows: number,
  your_inner_network: number,
  your_outer_network: number,
};

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


const Explore: Component = () => {

    const [stats, setStats] = createStore(initialStats);

    const [legend, setLegend] = createStore(initialLegend);

    const [isListening, setIsListening] = createSignal(false);

    const [mounted, setMounted] = createSignal(false);

    const context = useFeedContext();

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

    const onError = (error: Event) => {
      console.log("error: ", error);
    };

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
        if (!isListening()) {
          startListeningForNostrStats();
          setIsListening(true);
        }
        getLegendStats(context?.data.publicKey);
      }
    });

    onMount(() => {
      socket()?.addEventListener('error', onError);
      socket()?.addEventListener('message', onMessage);

      if (isConnected()) {
        if (!isListening()) {
          startListeningForNostrStats();
          setIsListening(true);
        }
        getLegendStats(context?.data.publicKey);
      }

      setTimeout(() => {
        // Temporary fix for Portal rendering on initial load.
        setMounted(true);
      }, 0);

    });

    onCleanup(() => {
      socket()?.removeEventListener('error', onError);
      socket()?.removeEventListener('message', onMessage);
      stopListeningForNostrStats();
    });

    return (
      <>
        <div id="central_header" class={styles.fullHeader}>
          <div>
            explore nostr
          </div>
        </div>
        <Show when={mounted()}>
          <Portal mount={document.getElementById("right_sidebar") as Node}>
            <div class={styles.statsCaption}>
              NOSTR NETWORK STATS
            </div>
            <div class={styles.netstats}>
              <div class={styles.netstat}>
                <div class={styles.number}>
                  {stats.users?.toLocaleString()}
                </div>
                <div class={styles.label}>
                  users
                </div>
              </div>

              <div class={styles.netstat}>
                <div class={styles.number}>
                  {stats.pubkeys.toLocaleString()}
                </div>
                <div class={styles.label}>
                  public keys
                </div>
              </div>

              <div class={styles.netstat}>
                <div class={styles.number}>
                  {stats.pubnotes.toLocaleString()}
                </div>
                <div class={styles.label}>
                  public notes
                </div>
              </div>

              <div class={styles.netstat}>
                <div class={styles.number}>
                  {stats.reactions.toLocaleString()}
                </div>
                <div class={styles.label}>
                  reactions
                </div>
              </div>

              <div class={styles.netstat}>
                <div class={styles.number}>
                  {stats.zaps.toLocaleString()}
                </div>
                <div class={styles.label}>
                  zaps
                </div>
              </div>

              <div class={styles.netstat}>
                <div class={styles.number}>
                  {(stats.satszapped /100000000).toFixed(8).toLocaleString()}
                </div>
                <div class={styles.label}>
                  btc zapped
                </div>
              </div>

              <div class={styles.netstat}>
                <div class={styles.number}>
                  {stats.reposts.toLocaleString()}
                </div>
                <div class={styles.label}>
                  reposts
                </div>
              </div>

              <div class={styles.netstat}>
                <div class={styles.number}>
                  {stats.any.toLocaleString()}
                </div>
                <div class={styles.label}>
                  all events
                </div>
              </div>
            </div>
          </Portal>
        </Show>


        <div class={styles.exploreMenu}>
          <For each={boxes}>
            {(box) =>
              <A
                href={`/feed/${box.scope}/${box.timeframe}`}
                class={styles.exploreBox}
              >
                <div>
                  <img
                    class={styles.exploreBoxIcon}
                    src={box.icon}
                    alt={`${box.scope}_${box.timeframe}`}
                  />
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
              <img src={follows} />
            </div>
            <div class={styles.legendName}>Follows</div>
            <div class={styles.legendNumber}>{legend.your_follows}</div>
            <div class={styles.legendDescription}>accounts you follow</div>
          </div>
          <div class={styles.legendDetails}>
            <div class={styles.legendIcon}>
              <img src={tribe} />
            </div>
            <div class={styles.legendName}>Tribe</div>
            <div class={styles.legendNumber}>{legend.your_inner_network}</div>
            <div class={styles.legendDescription}>your follows + your followers</div>
          </div>
          <div class={styles.legendDetails}>
            <div class={styles.legendIcon}>
              <img src={network} />
            </div>
            <div class={styles.legendName}>Network</div>
            <div class={styles.legendNumber}>{legend.your_outer_network}</div>
            <div class={styles.legendDescription}>your follows + everyone they follow</div>
          </div>
          <div class={styles.legendDetails}>
            <div class={styles.legendIcon}>
              <img src={global} />
            </div>
            <div class={styles.legendName}>Global</div>
            <div class={styles.legendNumber}>{stats.users.toLocaleString()}</div>
            <div class={styles.legendDescription}>all account on nostr</div>
          </div>
        </div>
      </>
    )
}

export default Explore;
