import { useIntl } from "@cookbook/solid-intl";
import { Component } from "solid-js";
import { PrimalNetStats } from "../../types/primal";
import styles from  "./NostrStats.module.scss";
import { explore as t } from '../../translations';

const NostrStats: Component<{ stats: PrimalNetStats }> = (props) => {

  const intl = useIntl();

  const statDisplay = (
    stat: number | string | undefined,
    key: string,
  ) => {
    // @ts-ignore Record find entry by key
    const label = t.statDisplay[key] || '';

    return (
      <div class={styles.netstat}>
        <div class={styles.number}>
          {stat?.toLocaleString()}
        </div>
        <div class={styles.label}>
          {intl.formatMessage(label)}
        </div>
      </div>
    );
  };


  return (
    <div class={styles.netstats}>
      {statDisplay(props.stats.users, 'users')}
      {statDisplay(props.stats.pubkeys, 'pubkeys')}
      {statDisplay(props.stats.zaps, 'users')}
      {statDisplay((props.stats.satszapped /100000000).toFixed(8), 'btcZapped')}
      {statDisplay(props.stats.pubnotes, 'pubnotes')}
      {statDisplay(props.stats.reposts, 'reposts')}
      {statDisplay(props.stats.reactions, 'reactions')}
      {statDisplay(props.stats.any, 'any')}
    </div>
  )
}

export default NostrStats;
