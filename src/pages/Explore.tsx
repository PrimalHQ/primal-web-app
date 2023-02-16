import { Component, createEffect, onCleanup, onMount } from 'solid-js';
import { createStore } from 'solid-js/store';
import { Portal } from 'solid-js/web';
import { reset, socket } from '../sockets';
import styles from './Explore.module.scss';

type PrimalNetStats = {
  pubkeys: number,
  pubnotes: number,
  reactions: number,
  reposts: number,
  allevents: number,
};

type PrimalResponse = {
  op: string,
  netstats?: PrimalNetStats;
}

const initialStats: PrimalNetStats = {
  pubkeys: 0,
  pubnotes: 0,
  reactions: 0,
  reposts: 0,
  allevents: 0,
};


const Explore: Component = () => {

    const [stats, setStats] = createStore(initialStats);

    const onMessage = (event: MessageEvent) => {

      const [type, subkey, content] = JSON.parse(event.data);

      const stats = JSON.parse(content.netstats.content)

      setStats(stats);

      // const netstats = response.netstats || initialStats;

      // setStats(netstats);

    };
    onMount(() => {
      socket()?.addEventListener('message', onMessage);

      console.log('SEND');

      socket()?.send(JSON.stringify(["REQ", "5345734845", {cache: ["net_stats"]}]));
    });

    onCleanup(() => {
      socket()?.send(JSON.stringify(["CLOSE", "5345734845"]));
      // reset();
    });

    return (
      <>
        <Portal mount={document.getElementById("right_sidebar") as Node}>
          <div class={styles.statsCaption}>
            NOSTR NETWORK STATS
          </div>
          <div class={styles.netstats}>
            <div class={styles.netstat}>
              <div class={styles.number}>
                TBD
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
                {stats.reposts.toLocaleString()}
              </div>
              <div class={styles.label}>
                reposts
              </div>
            </div>

            <div class={styles.netstat}>
              <div class={styles.number}>
                {stats.allevents.toLocaleString()}
              </div>
              <div class={styles.label}>
                all events
              </div>
            </div>
          </div>
        </Portal>
      </>
    )
}

export default Explore;
