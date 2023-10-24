import { useIntl } from '@cookbook/solid-intl';
import { A } from '@solidjs/router';
import type { Component } from 'solid-js';
import { hookForDev } from '../../lib/devTools';
import { interpretLineBreak } from '../../translationHelpers';
import { scopeDescriptors, timeframeDescriptors } from '../../translations';
import { ScopeDescriptor } from '../../types/primal';

import styles from './ExploreMenuItem.module.scss';


const itemInfo: Record<string, ScopeDescriptor & { icon: string }> = {
  follows: {
    ...scopeDescriptors.follows,
    icon: styles.followsIcon,
  },
  tribe: {
    ...scopeDescriptors.tribe,
    icon: styles.tribeIcon,
  },
  network: {
    ...scopeDescriptors.network,
    icon: styles.networkIcon,
  },
  global: {
    ...scopeDescriptors.global,
    icon: styles.globalIcon,
  },
};

const timeframeIcons: Record<string, string> = {
  trending: styles.flameIcon,
  mostzapped: styles.zapsIcon,
  popular: styles.likesIcon,
  latest: styles.clockIcon,
}

const ExploreMenuItem: Component<{ scope: string, stat: number, id?: string }> = (props) => {

  const intl = useIntl();

  const item = () => itemInfo[props.scope];

  const timeframeOption = (timeframe: string) => {
    return (
      <A
        href={`/explore/${props.scope}/${timeframe}`}
        class={styles.option}
      >
        <div class={timeframeIcons[timeframe]} ></div>
        <span>{intl.formatMessage(timeframeDescriptors[timeframe])}</span>
      </A>
    );
  }

  return (
    <div id={props.id} class={styles.exploreMenuItem}>
      <div class={styles.itemInfo}>
        <div class={item().icon} ></div>

        <div class={styles.itemData}>
          <div class={styles.header}>
            <div class={styles.itemCaption}>
              {intl.formatMessage(item().caption)}
            </div>
            <div class={styles.itemStat}>
              {props.stat.toLocaleString()}
            </div>
          </div>
          <div class={styles.footer}>
            <div class={styles.itemDescription}>
              {intl.formatMessage(item().description, {
                div: interpretLineBreak,
              })}
            </div>
          </div>
        </div>
      </div>
      <div class={styles.itemOptions}>
        {timeframeOption('trending')}
        {timeframeOption('mostzapped')}
        {timeframeOption('popular')}
        {timeframeOption('latest')}
      </div>
    </div>
  )
}

export default hookForDev(ExploreMenuItem);
