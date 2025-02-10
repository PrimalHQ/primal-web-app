import { useIntl } from '@cookbook/solid-intl';
import { useLocation, useNavigate } from '@solidjs/router';
import { Component, JSXElement, Show, createEffect, createSignal } from 'solid-js';
import { useAccountContext } from '../../contexts/AccountContext';
import { useNotificationsContext } from '../../contexts/NotificationsContext';

import styles from './LegendCard.module.scss';
import { hookForDev } from '../../lib/devTools';
import { useMediaContext } from '../../contexts/MediaContext';
import { CohortInfo, useAppContext } from '../../contexts/AppContext';
import { useDMContext } from '../../contexts/DMContext';

import { Dialog } from '@kobalte/core/dialog';
import Avatar from '../Avatar/Avatar';
import { PrimalUser } from '../../types/primal';
import { nip05Verification, userName } from '../../stores/profile';
import VerificationCheck from '../VerificationCheck/VerificationCheck';
import PremiumCohortInfo from '../../pages/Premium/PremiumCohortInfo';
import { LegendCustomizationConfig } from '../../lib/premium';
import { createStore } from 'solid-js/store';
import { date, longDate, veryLongDate } from '../../lib/dates';


const styleOptions: Record<string, string> = {
  GRAY: styles.sheetGray,
  GOLD: styles.sheetGold,
  AQUA: styles.sheetAqua,
  SILVER: styles.sheetSilver,
  PURPLE: styles.sheetPurple,
  PURPLEHAZE: styles.sheetPurplehaze,
  TEAL: styles.sheetTeal,
  BROWN: styles.sheetBrown,
  BLUE: styles.sheetBlue,
  SUNFIRE: styles.sheetSunfire,
};

const LegendCard: Component< {
  triggerClass: string,
  triggerContent: JSXElement,
  title: JSXElement,
  open?: boolean,
  setOpen?: (v: boolean) => void,
  user?: PrimalUser,
  id?: string,
  cohortInfo: CohortInfo,
  legendConfig?: LegendCustomizationConfig | undefined,
} > = (props) => {
  const account = useAccountContext();
  const notifications = useNotificationsContext();
  const dms = useDMContext();
  const intl = useIntl();
  const loc = useLocation();
  const media = useMediaContext();
  const app = useAppContext();

  const navigate = useNavigate();

  const [styleConf, setStyleConf] = createSignal<string>(styleOptions['GRAY']);

  createEffect(() => {
    if (!props.user || !props.legendConfig || !props.open) return;

    if (props.cohortInfo.tier === 'premium') return styleOptions['GRAY']

    const option = props.legendConfig.style.length > 0 ? props.legendConfig.style : 'GRAY';

    setStyleConf(() => styleOptions[option]);
  })

  const isProfileLegend = () => props.cohortInfo.tier === 'premium-legend';
  const isUserLegend = () => account?.publicKey &&
    app?.memberCohortInfo &&
    app?.memberCohortInfo[account?.publicKey] &&
    app?.memberCohortInfo[account?.publicKey].tier === 'premium-legend';

  return (
    <Dialog open={props.open} onOpenChange={props.setOpen} preventScroll={false}>
      <Dialog.Trigger class={props.triggerClass}>
        {props.triggerContent}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay class={styles.dialogOverlay} />
        <div class={styles.dialog}>
          <Dialog.Content class={styles.dialogContent} >
            <div class={styles.legendBackground}>
              <div class={`${styles.rightTopSheet} ${styleConf()}`}></div>
              <div class={`${styles.bigSheet} ${styleConf()}`}></div>
              <div class={`${styles.rightBottomSheet} ${styleConf()}`}></div>
            </div>
            <div class={styles.dialogHeader}>
              <Dialog.Title class={styles.dialogTitle}>
              </Dialog.Title>
              <Dialog.CloseButton class={styles.dialogCloseButton}>
                <div class={styles.excludeIcon}></div>
              </Dialog.CloseButton>
            </div>
            <Dialog.Description class={styles.dialogDescription}>
              <div class={styles.legendCardContent}>

                <div class={styles.legendCardInfo}>
                  <div class={styles.avatar}>
                    <Avatar user={props.user} size="xxxl" />
                  </div>
                  <div class={styles.userNameAndCheck}>
                    <div class={styles.userName}>
                      {userName(props.user)}
                    </div>
                    <VerificationCheck
                      user={props.user}
                      large={true}
                    />
                  </div>
                  <div class={styles.nip05}>
                    {nip05Verification(props.user)}
                  </div>

                  <div class={styles.legendCohort}>
                    <PremiumCohortInfo
                      cohortInfo={app?.memberCohortInfo[props.user?.pubkey!]!}
                      legendConfig={app?.legendCustomization[props.user?.pubkey!]}
                    />
                  </div>

                  <Show
                    when={isProfileLegend()}
                    fallback={
                      <div class={styles.legendSince}>
                        {props.cohortInfo.cohort_1} since {veryLongDate(props.cohortInfo?.premium_since || 0, true)}
                      </div>
                    }
                  >
                    <div class={styles.legendSince}>
                      Legend since {veryLongDate(props.cohortInfo?.legend_since || 0, true)}
                    </div>
                  </Show>

                  <Show when={isProfileLegend()}>
                    <div class={styles.legendShoutout}>
                      {props.legendConfig?.current_shoutout || ''}
                    </div>
                  </Show>
                </div>

                <div class={styles.legendActions}>
                  <Show when={isProfileLegend()}
                    fallback={
                      <button
                        onClick={() => navigate('/premiums')}
                        class={`${styles.legendSeePremium} ${styleConf()}`}
                      >
                        See other {props.cohortInfo.cohort_1}s
                      </button>
                    }
                  >
                    <button
                      onClick={() => navigate('/legends')}
                      class={`${styles.legendSee} ${styleConf()}`}
                    >
                      See other Legends
                    </button>
                    <button
                      class={`${styles.legendBecome} ${styleConf()}`}
                      style={`${isUserLegend() ? 'visibility: hidden;' : ''}`}
                      onClick={() => isUserLegend() ? navigate('/premium') : navigate('/premium/legend')}
                    >
                      Become a Legend
                    </button>
                  </Show>
                </div>

              </div>
            </Dialog.Description>

            <div class={`${styles.shineSheet} ${styleConf()}`}></div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog>
  )
}

export default hookForDev(LegendCard);
