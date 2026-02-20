import { useIntl } from '@cookbook/solid-intl';
import { Component, For, Show } from 'solid-js';
import Modal from '../Modal/Modal';

import { confirmDefaults as t } from '../../translations';

import styles from './TopZapModal.module.scss';
import { hookForDev } from '../../lib/devTools';
import ButtonPrimary from '../Buttons/ButtonPrimary';
import ButtonSecondary from '../Buttons/ButtonSecondary';
import AdvancedSearchDialog from '../AdvancedSearch/AdvancedSearchDialog';
import { PrimalUser, PrimalZap } from '../../types/primal';
import { humanizeNumber } from '../../lib/stats';
import Avatar from '../Avatar/Avatar';
import { userName } from '../../stores/profile';

const TopZapModal: Component<{
  id?: string,
  open?: boolean,
  setOpen?: (v: boolean) => void,
  totalZaps: number,
  totalSats: number,
  zaps: PrimalZap[],
  people: PrimalUser[],
}> = (props) => {

  const intl = useIntl();

  const author = (pubkey: string) => {
    return props.people.find(p => p.pubkey === pubkey);
  }

  return (
    <AdvancedSearchDialog
      open={props.open}
      setOpen={props.setOpen}
      title={
        <div class={styles.topZapsTitle}>
          Top zaps
        </div>
      }
      triggerClass={styles.hidden}
    >
      <div id={props.id} class={styles.liveTopZaps}>
        <div class={styles.zapStats}>
          <div class={styles.totalZaps}>Total <span>{props.totalZaps}</span> zaps:</div>
          <div class={styles.totalSats}>
            <div class={styles.zapIcon}></div>
            <div class={styles.satsNumber}>{humanizeNumber(props.totalSats, false)}</div>
            <div>sats</div>
          </div>
        </div>
        <div class={styles.zapList}>
          <For each={props.zaps}>
            {zap => (
              <div class={`${styles.liveMessage} ${styles.zapMessage}`}>
                <div class={styles.leftSide}>
                  <Avatar user={author(zap.sender as string)} size="xss" />
                </div>
                <div class={styles.rightSide}>
                  <span class={styles.zapInfo}>
                    <span class={styles.authorName}>
                      <span>
                        {userName(author(zap.sender as string), zap.sender as string)}
                      </span>
                      <span class={styles.zapped}>
                        zapped
                      </span>
                    </span>
                    <div class={styles.zapStats}>
                      <div class={styles.zapIcon}></div>
                      {humanizeNumber(zap?.amount || 0, false)}
                    </div>
                  </span>
                  <span class={styles.messageContent}>
                    {zap?.message}
                  </span>
                </div>
              </div>
            )}
          </For>
        </div>
        <div class={styles.topZapFooter}>
          <ButtonSecondary
            onClick={() => props.setOpen && props.setOpen(false)}
            light={true}
          >
            Close
          </ButtonSecondary>
        </div>
      </div>
    </AdvancedSearchDialog>
  );
}

export default hookForDev(TopZapModal);
