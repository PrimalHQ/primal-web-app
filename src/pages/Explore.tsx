import { Component, createEffect, createSignal, For, Match, onCleanup, onMount, Show, Switch } from 'solid-js';
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
import { A, useParams } from '@solidjs/router';
import NostrStats from '../components/NostrStats/NostrStats';
import { PrimalNetStats } from '../types/primal';
import ExploreMenu from './ExploreMenu';
import Feed from './Feed';


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

const scopes = ['follows', 'tribe', 'network', 'global'];
const timeframes = ['latest', 'trending', 'popular'];

const Explore: Component = () => {

    const [stats, setStats] = createStore(initialStats);

    const [legend, setLegend] = createStore(initialLegend);

    const [isListening, setIsListening] = createSignal(false);

    const [mounted, setMounted] = createSignal(false);

    const context = useFeedContext();

    const params = useParams();

    const hasParams = () => {
      if (!params.scope || !params.timeframe) {
        return false;
      }

      return scopes.includes(params.scope) &&
        timeframes.includes(params.timeframe);

    };

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
            <NostrStats stats={stats}/>
          </Portal>
        </Show>


        <Show
          when={hasParams()}
          fallback={<ExploreMenu legend={legend} stats={stats}/>}
        >
          <Feed scope={params.scope} timeframe={params.timeframe} />
        </Show>
      </>
    )
}

export default Explore;
