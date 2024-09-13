import { Component, Show } from 'solid-js';
import { PrimalDVM } from '../../types/primal';
import Avatar from '../Avatar/Avatar';
import styles from './FeedMarketPlace.module.scss';


const FeedMarketItem: Component<{
  dvm: PrimalDVM | undefined,
  stats?: { likes: number, satszapped: number },
  onClick?: (dvm: PrimalDVM | undefined) => void,
}> = (props) => {

  const isPaid = () => {
    if (!props.dvm) return false;

    const { amount, primalVerifiedRequired } = props.dvm;
    const amountValue = parseInt(amount);
    return (amount !== 'free' && !isNaN(amountValue) && amountValue > 0) || primalVerifiedRequired
  }

  return (
    <div
      class={styles.feedMarketPlaceItem}
      onClick={() => props.onClick && props.onClick(props.dvm)}
    >
      <div class={styles.left}>
        <div class={styles.avatar}>
          <Avatar size="vs2"/>
        </div>
        <div class={styles.paid}>
          <Show
            when={isPaid()}
            fallback={<div class={styles.freeToken}>FREE</div>}
          >
            <div class={styles.paidToken}>PAID</div>
          </Show>
        </div>
      </div>

      <div class={styles.right}>
        <div class={styles.title}>{props.dvm?.name || ''}</div>
        <div class={styles.about}>{props.dvm?.about || ''}</div>

        <div class={styles.stats}>
          <div class={styles.stat}>
            <div class={styles.likeIcon}></div>
            <div class={styles.statValue}>
              {(props.stats && props.stats.likes) || 0}
            </div>
          </div>
          <div class={styles.stat}>
            <div class={styles.zapIcon}></div>
            <div class={styles.statValue}>
              {(props.stats && props.stats.satszapped) || 0}
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}

export default FeedMarketItem;
