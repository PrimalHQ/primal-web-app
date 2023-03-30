import { useIntl } from "@cookbook/solid-intl";
import { Component, onCleanup, onMount } from "solid-js";
import { PrimalNetStats } from "../../types/primal";
import styles from  "./NostrStats.module.scss";

const NostrStats: Component<{ stats: PrimalNetStats }> = (props) => {

  const intl = useIntl();

  const statDisplay = (
    stat: number | string | undefined,
    key: string,
    defaultMessage: string,
    description: string,
  ) => {
    return (
      <div class={styles.netstat}>
        <div class={styles.number}>
          {stat?.toLocaleString()}
        </div>
        <div class={styles.label}>
          {intl.formatMessage(
            {
              id: `explore.stats.${key}`,
              defaultMessage,
              description,
            }
          )}
        </div>
      </div>
    );
  };


  return (
    <div class={styles.netstats}>
      {statDisplay(props.stats.users, 'users', 'Users', 'Label for number of users stats')}
      {statDisplay(props.stats.pubkeys, 'pubkeys', 'Public Keys', 'Label for number of pubkeys stats')}
      {statDisplay(props.stats.zaps, 'users', 'Zaps', 'Label for number of zaps stats')}
      {statDisplay((props.stats.satszapped /100000000).toFixed(8), 'btcZapped', 'BTC Zapped', 'Label for number of zapped bitcoins stats')}
      {statDisplay(props.stats.pubnotes, 'pubnotes', 'Public Notes', 'Label for number of public notes stats')}
      {statDisplay(props.stats.reposts, 'reposts', 'Reposts', 'Label for number of repost stats')}
      {statDisplay(props.stats.reactions, 'reactions', 'Reactions', 'Label for number of reactions stats')}
      {statDisplay(props.stats.any, 'any', 'All Events', 'Label for number of all events stats')}
    </div>
  )
}

export default NostrStats;
