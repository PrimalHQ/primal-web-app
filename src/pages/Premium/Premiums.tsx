import { useIntl } from '@cookbook/solid-intl';
import { Component, Show } from 'solid-js';
import PageCaption from '../../components/PageCaption/PageCaption';
import PageTitle from '../../components/PageTitle/PageTitle';
import Wormhole from '../../components/Wormhole/Wormhole';

import { premium as t } from '../../translations';

import styles from './Premium.module.scss';
import Search from '../../components/Search/Search';
import { createStore } from 'solid-js/store';
import StickySidebar from '../../components/StickySidebar/StickySidebar';
import PremiumFeaturesDialog from './PremiumFeaturedDialog';
import PremiumSidebarInactve from './PremiumSidebarInactive';
import { isPhone } from '../../utils';
import PremiumLegendLeaderBoard from './PremiumLegendLeaderboard';

export type Legends = {
  lnUrl: string,
  membershipId: string,
  amounts: {
    usd: number,
    sats: number,
  },
};

export type PremiumStore = {
  openFeatures: 'features' | 'faq' | undefined,
}

const Premiums: Component = () => {
  const intl = useIntl();

  const [premiumData, setPremiumData] = createStore<PremiumStore>({
    openFeatures: undefined,
  });

  return (
    <div>
      <PageTitle title={
        intl.formatMessage(t.title.premiums)}
      />

      <Show when={!isPhone()}>
        <Wormhole
          to="search_section"
        >
          <Search />
        </Wormhole>
      </Show>

      <PageCaption>
        <div class={styles.pageTitle}>{intl.formatMessage(t.title.premiums)}</div>
      </PageCaption>

      <StickySidebar>
        <PremiumSidebarInactve
          onOpenFAQ={() => setPremiumData('openFeatures', () => 'faq')}
        />
      </StickySidebar>


      <div class={`${styles.premiumContent} ${styles.noPadding}`}>
        <div class={styles.premiumStepContent}>
          <PremiumLegendLeaderBoard
            type="premium"
          />

          <PremiumFeaturesDialog
            open={premiumData.openFeatures}
            setOpen={(v: boolean) => setPremiumData('openFeatures', () => v ? 'features' : undefined)}
          />
        </div>
      </div>
    </div>
  );
}

export default Premiums;
