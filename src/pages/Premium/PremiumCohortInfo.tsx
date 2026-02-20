import { Component, createSignal } from 'solid-js';

import styles from './Premium.module.scss';
import { PrimalUser } from '../../types/primal';
import { LegendCustomizationConfig } from '../../lib/premium';
import { CohortInfo } from '../../contexts/AppContext';
import LegendCard from '../../components/LegendCard/LegendCard';
import { accountStore } from '../../stores/accountStore';


const PremiumCohortInfo: Component<{
  user?: PrimalUser,
  userTier?: string,
  cohortInfo: CohortInfo,
  legendConfig?: LegendCustomizationConfig | undefined,
}> = (props) => {
  const [showLegendCard, setShowLegendCard] = createSignal(false);

  const tier = () => props.userTier || accountStore.membershipStatus.tier || '';

  const destination = () => {
    if (
      props.cohortInfo.tier === 'premium' &&
      !['premium', 'premium-legend'].includes(tier())
    ) {
      return '/premium?og=1';
    }

    if (
      props.cohortInfo.tier === 'premium-legend' &&
      !['premium-legend'].includes(tier())
    ) {
      return '/premium/legend?og=legend';
    }

    return '';
  }

  return (
    <div>
      <LegendCard
        user={props.user}
        open={showLegendCard()}
        setOpen={setShowLegendCard}
        cohortInfo={props.cohortInfo}
        legendConfig={props.legendConfig}
        triggerClass={styles.premiumActive}
        triggerContent={
          <div class={styles.premiumActive}>
            <div class={`${styles.legendPremium} ${styles[`legend_${props.legendConfig?.style}`]}`}>
              <div class={styles.caption}>{props.cohortInfo.cohort_1 || ''}</div>
              <div class={styles.date}>
                <div>{props.cohortInfo.cohort_2}</div>
              </div>
            </div>
          </div>
        }
      />
    </div>
  );
}

export default PremiumCohortInfo;
