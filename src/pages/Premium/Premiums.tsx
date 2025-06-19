import { useIntl } from '@cookbook/solid-intl';
import { Component, createEffect, Match, on, onCleanup, onMount, Show, Switch } from 'solid-js';
import PageCaption from '../../components/PageCaption/PageCaption';
import PageTitle from '../../components/PageTitle/PageTitle';
import Wormhole from '../../components/Wormhole/Wormhole';

import { premium as t, toast as tToast } from '../../translations';

import styles from './Premium.module.scss';
import Search from '../../components/Search/Search';
import { useNavigate, useParams, useSearchParams } from '@solidjs/router';
import TextInput from '../../components/TextInput/TextInput';
import { createStore } from 'solid-js/store';
import { NostrEOSE, NostrEvent, NostrEventContent, NostrEventType, PrimalUser } from '../../types/primal';
import { APP_ID } from '../../App';
import { changePremiumName, getPremiumQRCode, getPremiumStatus, startListeningForPremiumPurchase, stopListeningForPremiumPurchase, isPremiumNameAvailable, fetchExchangeRate, stopListeningForLegendPurchase, startListeningForLegendPurchase, getLegendQRCode, getOrderListHistory, LegendCustomizationConfig, setLegendCutumization } from '../../lib/premium';
import ButtonPremium from '../../components/Buttons/ButtonPremium';
import PremiumSummary from './PremiumSummary';
import { useAccountContext } from '../../contexts/AccountContext';
import PremiumProfile from './PremiumProfile';
import PremiumSubscribeModal from './PremiumSubscribeModal';
import PremiumHighlights from './PremiumHighlights';
import { sendProfile } from '../../lib/profile';
import PremiumSuccessModal from './PremiumSuccessModal';
import Loader from '../../components/Loader/Loader';
import PremiumStatusOverview from './PremiumStatusOverview';
import StickySidebar from '../../components/StickySidebar/StickySidebar';
import ButtonSecondary from '../../components/Buttons/ButtonSecondary';
import Avatar from '../../components/Avatar/Avatar';
import { hexToNpub } from '../../lib/keys';
import { truncateNpub } from '../../stores/profile';
import { logError, logInfo } from '../../lib/logger';
import PremiumFeaturesDialog from './PremiumFeaturedDialog';
import ButtonLink from '../../components/Buttons/ButtonLink';
import { fetchUserProfile } from '../../handleNotes';
import PremiumChangeRecipientDialog from './PremiumChangeRecipientDialog';
import PremiumPromoCodeDialog from './PremiumPromoCodeDialog';
import PremiumSidebarInactve from './PremiumSidebarInactive';
import PremiumSidebarActive from './PremiumSidebarActive';
import PremiumRenameDialog from './PremiumRenameDialog';
import PremiumRenewModal from './PremiumRenewModal';
import PremiumSupport from './PremiumSupport';
import PremiumLegend from './PremiumLegend';
import PremiumBecomeLegend from './PremiumBecomeLegend';
import { Kind } from '../../constants';
import PremiumLegendModal from './PremiumLegendModal';
import PremiumRelay from './PremiumRelay';
import PremiumMediaManagment from './PremiumMediaManagment';
import PremiumContactBackup from './PremiumContactBackup';
import PremiumContentBackup from './PremiumContentBackup';
import PremiumCustomLegend from './PremiumCustomLegend';
import PremiumOrderHistoryModal from './PremiumOrderHistoryModal';
import { emptyPaging, PaginationInfo } from '../../megaFeeds';
import { useToastContext } from '../../components/Toaster/Toaster';
import { triggerImportEvents } from '../../lib/notes';
import { useAppContext } from '../../contexts/AppContext';
import { isPhone } from '../../utils';
import PremiumManageModal from './PremiumManageModal';
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
  const account = useAccountContext();
  const params = useParams();
  const navigate = useNavigate();
  const toast = useToastContext();
  const app = useAppContext();

  const [queryParams, setQueryParams] = useSearchParams();

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
