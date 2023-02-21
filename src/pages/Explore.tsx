import { Component, createEffect, createSignal, onCleanup, onMount, Show } from 'solid-js';
import { createStore } from 'solid-js/store';
import { Portal, style } from 'solid-js/web';
import { APP_ID, useFeedContext } from '../contexts/FeedContext';
import { getLegendStats, startListeningForNostrStats, stopListeningForNostrStats } from '../lib/stats';
import { isConnected, reset, socket } from '../sockets';
import styles from './Explore.module.scss';

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
          <div class={styles.exploreBox}>
            <div>
              <div class={styles.firstLine}>trending</div>
              <div class={styles.secondLine}>global</div>
            </div>
          </div>

          <div class={styles.exploreBox}>
            <div>
              <div class={styles.firstLine}>trending</div>
              <div class={styles.secondLine}>my network</div>
            </div>
          </div>

          <div class={styles.exploreBox}>
            <div>
              <div class={styles.firstLine}>trending</div>
              <div class={styles.secondLine}>my follows</div>
            </div>
          </div>

          <div class={styles.exploreBox}>
            <div>
              <div class={styles.firstLine}>popular</div>
              <div class={styles.secondLine}>global</div>
            </div>
          </div>

          <div class={styles.exploreBox}>
            <div>
              <div class={styles.firstLine}>popular</div>
              <div class={styles.secondLine}>my network</div>
            </div>
          </div>

          <div class={styles.exploreBox}>
            <div>
              <div class={styles.firstLine}>popular</div>
              <div class={styles.secondLine}>my follows</div>
            </div>
          </div>

          <div class={styles.exploreBox}>
            <div>
              <div class={styles.firstLine}>trending</div>
              <div class={styles.secondLine}>people</div>
            </div>
          </div>

          <div class={styles.exploreBox}>
            <div>
              <div class={styles.firstLine}>popular</div>
              <div class={styles.secondLine}>people</div>
            </div>
          </div>

          <div class={styles.exploreBox}>
            <div>
              <div class={styles.firstLine}>all content</div>
              <div class={styles.secondLine}>firehose</div>
            </div>
          </div>
        </div>

        <div class={styles.statsLegend}>
          <div class={styles.legendCaption}>
            LEGEND
          </div>
          <ul class={styles.legendDetails}>
            <li>
              Your Follows:
              <span class={styles.highlight}>
                {legend.your_follows}
              </span>
              accounts you follow</li>
            <li>
              Your Inner Network:
              <span class={styles.highlight}>
                {legend.your_inner_network}
              </span>
              accounts (your follows + your followers)
            </li>
            <li>
              Your Outer Network:
              <span class={styles.highlight}>
                {legend.your_outer_network}
              </span>
              accounts (accounts you follow + everyone they follow)
            </li>
            <li>Global: all of nostr, minus the spam we try to filter out</li>
          </ul>
        </div>
      </>
    )
}

export default Explore;
