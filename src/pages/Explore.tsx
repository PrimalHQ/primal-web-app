import { Component, createEffect, createSignal, For, Match, onCleanup, onMount, Show, Switch } from 'solid-js';
import { createStore } from 'solid-js/store';
import { Portal } from 'solid-js/web';
import { APP_ID, useFeedContext } from '../contexts/FeedContext';
import { getLegendStats, startListeningForNostrStats, stopListeningForNostrStats } from '../lib/stats';
import { isConnected, socket } from '../sockets';
import styles from './Explore.module.scss';
import NostrStats from '../components/NostrStats/NostrStats';
import { PrimalNetStats } from '../types/primal';
import ExploreMenu from './ExploreMenu';
import Feed from './Feed';
import { useParams } from '@solidjs/router';
import Branding from '../components/Branding/Branding';
import PageNav from '../components/PageNav/PageNav';


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
const timeframes = ['latest', 'trending', 'popular', 'mostzapped'];

const Explore: Component = () => {

    const [stats, setStats] = createStore({...initialStats});

    const [legend, setLegend] = createStore({...initialLegend});

    const [isListening, setIsListening] = createSignal(false);

    const [mounted, setMounted] = createSignal(false);

    const context = useFeedContext();

    const params = useParams();

    const timeframeLabels: Record<string, string> = {
      latest: 'latest',
      trending: 'trending',
      popular: 'popular',
      mostzapped: 'mostzapped',
    };

    const scopeLabels: Record<string, string> = {
      follows: 'my follows',
      tribe: 'my tribe',
      network: 'my network',
      global: 'global'
    };

    const hasParams = () => {
      if (!params.scope || !params.timeframe) {
        return false;
      }

      return scopes.includes(params.scope) &&
        timeframes.includes(params.timeframe);

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

      setTimeout(() => {
        // Temporary fix for Portal rendering on initial load.
        setMounted(true);
      }, 0);

    });

    onCleanup(() => {
      socket()?.removeEventListener('message', onMessage);
      stopListeningForNostrStats();
    });

    return (
      <>
        <Portal
          mount={document.getElementById("branding_holder") as Node}
        >
          <Show
            when={hasParams()}
            fallback={
              <Branding small={false} />
            }
          >
            <PageNav />
          </Show>
        </Portal>
        <div id="central_header" class={styles.fullHeader}>
          <div>
            <Show
              when={hasParams()}
              fallback="explore nostr"
            >
              {timeframeLabels[params.timeframe]}: {scopeLabels[params.scope]}
            </Show>
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
