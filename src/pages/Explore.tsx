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
import { scopeLabels, timeframeLabels } from '../constants';
import ExploreSidebar from '../components/ExploreSidebar/ExploreSidebar';


const scopes = ['follows', 'tribe', 'network', 'global'];
const timeframes = ['latest', 'trending', 'popular', 'mostzapped'];

const Explore: Component = () => {

    const [mounted, setMounted] = createSignal(false);

    const params = useParams();

    const hasParams = () => {
      if (!params.scope || !params.timeframe) {
        return false;
      }

      return scopes.includes(params.scope) &&
        timeframes.includes(params.timeframe);

    };

    onMount(() => {

      setTimeout(() => {
        // Temporary fix for Portal rendering on initial load.
        setMounted(true);
      }, 0);

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
            <ExploreSidebar />
          </Portal>
        </Show>


        <Show
          when={hasParams()}
          fallback={
            <>
              <ExploreMenu />
            </>
          }
        >
          <Feed scope={params.scope} timeframe={params.timeframe} />
        </Show>
      </>
    )
}

export default Explore;
