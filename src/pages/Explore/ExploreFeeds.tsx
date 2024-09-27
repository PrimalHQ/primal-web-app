import { Component, createEffect, createSignal, onCleanup, onMount, Show } from 'solid-js';
import styles from '../ExploreNew.module.scss';
import { useToastContext } from '../../components/Toaster/Toaster';
import { useSettingsContext } from '../../contexts/SettingsContext';
import StickySidebar from '../../components/StickySidebar/StickySidebar';
import Wormhole from '../../components/Wormhole/Wormhole';
import { toast as t, explore as tExplore, actions as tAction } from '../../translations';
import { useIntl } from '@cookbook/solid-intl';
import Search from '../../components/Search/Search';
import PageCaption from '../../components/PageCaption/PageCaption';
import PageTitle from '../../components/PageTitle/PageTitle';
import { Tabs } from '@kobalte/core/tabs';
import { useExploreContext } from '../../contexts/ExploreContext';
import { A, useLocation, useParams } from '@solidjs/router';
import FeedMarketPlace from '../../components/FeedMarketplace/FeedMarketPlace';
import FeedMarketPlacePreview from '../../components/FeedMarketplace/FeedMarketPlacePreview';
import { APP_ID } from '../../App';
import { subsTo } from '../../sockets';
import { Kind } from '../../constants';
import { DVMMetadata, DVMStats, PrimalDVM } from '../../types/primal';
import { createStore } from 'solid-js/store';
import { convertToUser } from '../../stores/profile';
import { fetchDVM } from '../../lib/feed';

const ExploreFeeds: Component = () => {

  const settings = useSettingsContext();
  const toaster = useToastContext();
  const intl = useIntl();
  const explore = useExploreContext();
  const location = useLocation();
  const params = useParams();

  const [store, setStore] = createStore<{ dvm?: PrimalDVM, stats?: DVMStats, metadata?: DVMMetadata }>({});

  createEffect(() => {
    console.log('DOES: ', explore?.previewDVM, params)
    if (explore?.previewDVM) {
      setStore(() => ({
        dvm: explore.previewDVM,
        stats: explore.previewDVMStats,
        metadat: explore.previewDVMMetadata,
      }));
      console.log('HAS: ', explore.previewDVM)
      return;
    }

    if (params.id) {
      console.log('HAS NOT: ', params.id)
      const [identifier, pubkey] = params.id.split('_by_');

      getDVM(identifier, pubkey);
      return;
    }
  });

  const getDVM = (identifier: string, pubkey: string) => {
    const subId = `explore_dvm_${APP_ID}`;

    const unsub = subsTo(subId, {
      onEvent: (_, content) => {

        if (content.kind === Kind.DVM) {
          const dvmData = JSON.parse(content.content);

          const dvm: PrimalDVM = {
            id: content.id,
            name: dvmData.name || '',
            about: dvmData.about || '',
            amount: dvmData.amount || 'free',
            primalVerifiedRequired: dvmData.primalVerifiedRequired || false,
            author: content.pubkey,
            supportedKinds: content.tags?.reduce<string[]>((acc, t: string[]) => t[0] === 'k' ? [...acc, t[1]] : acc, []) || [],
            identifier: (content.tags?.find(t => t[0] === 'd') || ['d', ''])[1],
            picture: dvmData.picture,
            image: dvmData.image,
          };

          setStore('dvm', () => ({ ...dvm }));
          return;
        }

        if (content.kind === Kind.NoteStats) {
          const stats = JSON.parse(content.content);

          if (!stats.event_id) return;

          setStore('stats', stats.event_id, () => ({
            likes: stats.likes || 0,
            satszapped: stats.satszapped || 0,
          }));
        }

        if (content.kind === Kind.DVMMetadata) {
          const metadata = JSON.parse(content.content);

          if (!metadata.event_id) return;

          setStore('metadata', metadata.event_id, () => ({ kind: metadata.kind, isPrimal: metadata.is_primal}))
        }
      },
      onEose: () => {
        unsub();
      }
    });

    fetchDVM(subId, identifier, pubkey);
  }

  const dvm = () => store.dvm;
  const stats = () => store.stats;
  const metadata = () => store.metadata;

    return (
      <>
        <PageTitle title={intl.formatMessage(tExplore.pageTitle)} />

        <PageCaption>
          <div class={styles.exploreHeader}>
            <Search fullWidth={true} />
          </div>
        </PageCaption>

        <StickySidebar>
        </StickySidebar>


        <div class={styles.explorePageTabs}>
          <div class={styles.feedMarketplaceContent}>
            <FeedMarketPlacePreview
              dvm={dvm()}
              stats={stats()}
              type={metadata()?.kind || 'notes'}
            />
          </div>
        </div>
      </>
    )
}

export default ExploreFeeds;
