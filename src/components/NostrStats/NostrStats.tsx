import { Component, onCleanup, onMount } from "solid-js";
import { PrimalNetStats } from "../../types/primal";
import styles from  "./NostrStats.module.scss";

const NostrStats: Component<{ stats: PrimalNetStats }> = (props) => {

  return (
    <>
      <div class={styles.netstats}>
        <div class={styles.netstat}>
          <div class={styles.number}>
            {props.stats.users?.toLocaleString()}
          </div>
          <div class={styles.label}>
            users
          </div>
        </div>

        <div class={styles.netstat}>
          <div class={styles.number}>
            {props.stats.pubkeys.toLocaleString()}
          </div>
          <div class={styles.label}>
            public keys
          </div>
        </div>

        <div class={styles.netstat}>
          <div class={styles.number}>
            {props.stats.zaps.toLocaleString()}
          </div>
          <div class={styles.label}>
            zaps
          </div>
        </div>

        <div class={styles.netstat}>
          <div class={styles.number}>
            {(props.stats.satszapped /100000000).toFixed(8).toLocaleString()}
          </div>
          <div class={styles.label}>
            btc zapped
          </div>
        </div>

        <div class={styles.netstat}>
          <div class={styles.number}>
            {props.stats.pubnotes.toLocaleString()}
          </div>
          <div class={styles.label}>
            public notes
          </div>
        </div>

        <div class={styles.netstat}>
          <div class={styles.number}>
            {props.stats.reposts.toLocaleString()}
          </div>
          <div class={styles.label}>
            reposts
          </div>
        </div>

        <div class={styles.netstat}>
          <div class={styles.number}>
            {props.stats.reactions.toLocaleString()}
          </div>
          <div class={styles.label}>
            reactions
          </div>
        </div>

        <div class={styles.netstat}>
          <div class={styles.number}>
            {props.stats.any.toLocaleString()}
          </div>
          <div class={styles.label}>
            all events
          </div>
        </div>
      </div>
    </>
  )
}

export default NostrStats;
