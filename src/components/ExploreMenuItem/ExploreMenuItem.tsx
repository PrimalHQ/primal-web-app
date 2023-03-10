import { A, Navigate } from '@solidjs/router';
import { useNavigate, useRouter } from '@solidjs/router/dist/routing';
import type { Component } from 'solid-js';
import { PrimalNote } from '../../types/primal';
import Avatar from '../Avatar/Avatar';
import { timeframeLabels } from '../../constants';

import styles from './ExploreMenuItem.module.scss';

import follows from '../../assets/icons/explore/follows.svg';
import tribe from '../../assets/icons/explore/tribe.svg';
import network from '../../assets/icons/explore/network.svg';
import global from '../../assets/icons/explore/global.svg';


import flame from '../../assets/icons/explore/flame.svg';
import zaps from '../../assets/icons/explore/zaps.svg';
import likes from '../../assets/icons/explore/likes.svg';
import clock from '../../assets/icons/explore/clock.svg';

type ItemInfo = {
  caption: string,
  icon: string,
  description: string,
}

const itemInfo: Record<string, ItemInfo> = {
  follows: {
    caption:'Follows',
    icon: styles.followsIcon,
    description: 'account you follow',
  },
  tribe: {
    caption:'Tribe',
    icon: styles.tribeIcon,
    description: 'account you follow + your followers',
  },
  network: {
    caption:'Network',
    icon: styles.networkIcon,
    description: 'account you follow + everyone they follow',
  },
  global: {
    caption:'Global',
    icon: styles.globalIcon,
    description: 'all accounts on nostr',
  },
};

const ExploreMenuItem: Component<{ scope: string, stat: number }> = (props) => {


  const item = () => itemInfo[props.scope];

  return (
    <div class={styles.exploreMenuItem}>
      <div class={styles.itemInfo}>
        <div class={item().icon} ></div>

        <div class={styles.itemData}>
          <div class={styles.header}>
            <div class={styles.itemCaption}>
              {item().caption}
            </div>
            <div class={styles.itemStat}>
              {props.stat.toLocaleString()}
            </div>
          </div>
          <div class={styles.footer}>
            <div class={styles.itemDescription}>
              {item().description}
            </div>
          </div>
        </div>
      </div>
      <div class={styles.itemOptions}>
        <A
          href={`/explore/${props.scope}/trending`}
          class={styles.option}
        >
          <div class={styles.flameIcon} ></div>
          <span>trending</span>
        </A>
        <A
          href={`/explore/${props.scope}/mostzapped`}
          class={styles.option}
        >
          <div class={styles.zapsIcon} ></div>
          <span>zapped</span>
        </A>
        <A
          href={`/explore/${props.scope}/popular`}
          class={styles.option}
        >
          <div class={styles.likesIcon} ></div>
          <span>popular</span>
        </A>
        <A
          href={`/explore/${props.scope}/latest`}
          class={styles.option}
        >
          <div class={styles.clockIcon} ></div>
          <span>latest</span>
        </A>
      </div>
    </div>
  )
}

export default ExploreMenuItem;
