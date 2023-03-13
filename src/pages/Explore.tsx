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
import { updateAvailableFeeds } from '../stores/home';


const scopes = ['follows', 'tribe', 'network', 'global'];
const timeframes = ['latest', 'trending', 'popular', 'mostzapped'];

const titleCase = (text: string) => {
  return text[0].toUpperCase() + text.slice(1).toLowerCase();
}

const Explore: Component = () => {

  const context = useFeedContext();

    const [mounted, setMounted] = createSignal(false);

    const params = useParams();

    const hasParams = () => {
      if (!params.scope || !params.timeframe) {
        return false;
      }

      return scopes.includes(params.scope) &&
        timeframes.includes(params.timeframe);

    };

    const hasFeedAtHome = () => {
      const hex = `${params.scope};${params.timeframe}`;

      return !!context?.data.availableFeeds.find(f => f.hex === hex);
    };

    const addToHomeFeed = () => {
      const hex = `${params.scope};${params.timeframe}`;
      const name = titleCase(`${timeframeLabels[params.timeframe]}, ${scopeLabels[params.scope]}`);
      const feed = { name, hex };

      context?.actions?.setData('availableFeeds', (feeds) => updateAvailableFeeds(context?.data.publicKey, feed, feeds));
    };

    onMount(() => {

      setTimeout(() => {
        // Temporary fix for Portal rendering on initial load.
        setMounted(true);
      }, 0);

    });

    return (
      <>
        <Show when={mounted()}>
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
        </Show>
        <div id="central_header" class={styles.fullHeader}>
          <Show
            when={hasParams()}
            fallback={<div class={styles.exploreCaption}>explore nostr</div>}
          >
              <div class={styles.exploreCaption}>
                {timeframeLabels[params.timeframe]}: {scopeLabels[params.scope]}
              </div>
              <div class={styles.addToFeed}>
                <Show
                  when={!hasFeedAtHome()}
                  fallback={<div class={styles.noAdd}>
                    Available on your home page
                  </div>}
                >
                  <button
                    class={styles.addButton}
                    onClick={addToHomeFeed}
                  >
                    <span>+</span> add this feed to my home page
                  </button>
                </Show>
              </div>
          </Show>
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
