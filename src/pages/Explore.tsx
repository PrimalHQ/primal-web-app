import { Component, createEffect, onCleanup, onMount } from 'solid-js';
import { createStore } from 'solid-js/store';
import { Portal } from 'solid-js/web';
import { reset, socket } from '../sockets';
import styles from './Explore.module.scss';

type PrimalNetStats = {
  pubkeys: number,
  pubnotes: number,
  reactions: number,
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
  allevents: 0,
};


const Explore: Component = () => {

    const [stats, setStats] = createStore<PrimalNetStats>(initialStats);
  
    const onMessage = (message: MessageEvent) => {
      const response: PrimalResponse = JSON.parse(message.data);
    
      const netstats = response.netstats || initialStats;
      
      setStats(netstats);
    
    };
    onMount(() => {
      socket()?.addEventListener('message', onMessage);
      
      socket()?.send(JSON.stringify(["REQ", "5345734845", {cache: ["net_stats"]}]));
    });

    onCleanup(() => {
      reset();
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
                {stats.pubkeys}
              </div>
              <div class={styles.label}>
                public keys
              </div>
            </div>
            
            <div class={styles.netstat}>
              <div class={styles.number}>
                {stats.pubnotes}
              </div>
              <div class={styles.label}>
                public notes
              </div>
            </div>
            
            <div class={styles.netstat}>
              <div class={styles.number}>
                {stats.reactions}
              </div>
              <div class={styles.label}>
                reactions
              </div>
            </div>
            
            <div class={styles.netstat}>
              <div class={styles.number}>
                TBD
              </div>
              <div class={styles.label}>
                reposts
              </div>
            </div>
            
            <div class={styles.netstat}>
              <div class={styles.number}>
                {stats.allevents}
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
