import { useIntl } from "@cookbook/solid-intl";
import { Component } from "solid-js";
import { PrimalNetStats } from "../../types/primal";
import styles from  "./NostrStats.module.scss";
import { explore as t } from '../../translations';
import { hookForDev } from "../../lib/devTools";

const NostrStats: Component<{ stats: PrimalNetStats, id?: string }> = (props) => {

  const intl = useIntl();

  const statDisplay = (opts:{
    stat: number | string | undefined,
    key: string,
    id?: string,
  }) => {
    // @ts-ignore Record find entry by key
    const label = t.statDisplay[opts.key] || '';

    return (
      <div id={opts.id} class={styles.netstat}>
        <div class={styles.number}>
          {opts.stat?.toLocaleString()}
        </div>
        <div class={styles.label}>
          {intl.formatMessage(label)}
        </div>
      </div>
    );
  };


  return (
    <div id={props.id} class={styles.netstats}>
      {hookForDev(statDisplay)({ stat: props.stats.users, key: 'users' })}
      {/* {hookForDev(statDisplay)({ stat: props.stats.pubkeys, key: 'pubkeys' })} */}
      {hookForDev(statDisplay)({ stat: props.stats.zaps, key: 'zaps' })}
      {hookForDev(statDisplay)({ stat: (props.stats.satszapped /100000000).toFixed(8), key: 'btcZapped' })}
      {hookForDev(statDisplay)({ stat: props.stats.pubnotes, key: 'pubnotes' })}
      {/* {hookForDev(statDisplay)({ stat: props.stats.reposts, key: 'reposts' })} */}
      {hookForDev(statDisplay)({ stat: props.stats.reactions, key: 'reactions' })}
      {hookForDev(statDisplay)({ stat: props.stats.any, key: 'any' })}
    </div>
  )
}

export default hookForDev(NostrStats);
