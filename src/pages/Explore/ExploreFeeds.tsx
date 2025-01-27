import { Component, createEffect, createSignal, onCleanup, onMount, Show } from 'solid-js';
import styles from './Explore.module.scss';
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
import { DVMMetadata, DVMStats, NostrNoteActionsContent, NostrUserContent, NoteActions, PrimalArticleFeed, PrimalDVM, PrimalUser } from '../../types/primal';
import { createStore } from 'solid-js/store';
import { convertToUser } from '../../stores/profile';
import { fetchDVM } from '../../lib/feed';
import { useAccountContext } from '../../contexts/AccountContext';
import ButtonFlip from '../../components/Buttons/ButtonFlip';
import ExploreHotTopics from '../../components/ExploreSidebar/ExploreHotTopics';
import ExploreSidebar from '../../components/ExploreSidebar/ExploreSidebar';
import NostrStats from '../../components/NostrStats/NostrStats';

const ExploreFeeds: Component = () => {

  const account = useAccountContext();
  const settings = useSettingsContext();
  const toaster = useToastContext();
  const intl = useIntl();
  const explore = useExploreContext();
  const location = useLocation();
  const params = useParams();

  const [store, setStore] = createStore<{
    dvm?: PrimalDVM,
    stats?: DVMStats,
    metadata?: DVMMetadata,
    author?: PrimalUser,
    actions?: NoteActions,
    users?: Record<string, PrimalUser>,
    commonFollowsPubkeys?: string[],
  }>({});

  createEffect(() => {
    if (explore?.previewDVM) {
      setStore(() => ({
        dvm: explore.previewDVM,
        stats: explore.previewDVMStats,
        metadata: explore.previewDVMMetadata,
        author: explore.previewDVMAuthor,
        actions: explore.previewDVMActions,
        users: explore.previewDVMUsers || {},
        commonFollowsPubkeys: explore.previewDVMFollows || [],
      }));
      return;
    }

    if (params.id) {
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
            pubkey: content.pubkey,
            supportedKinds: content.tags?.reduce<string[]>((acc, t: string[]) => t[0] === 'k' ? [...acc, t[1]] : acc, []) || [],
            identifier: (content.tags?.find(t => t[0] === 'd') || ['d', ''])[1],
            picture: dvmData.picture,
            image: dvmData.image,
            primal_spec: dvmData.primal_spec,
          };

          setStore('dvm', () => ({ ...dvm }));
          return;
        }
        if (content.kind === Kind.Metadata) {
          const user = content as NostrUserContent;

          const autor = convertToUser(user, user.pubkey);

          if (autor) {
            setStore('users', () => ({ [user.pubkey]: {...autor}}));
          }
          return;
        }

        if (content.kind === Kind.NoteStats) {
          const st = JSON.parse(content.content);

          if (!st.event_id) return;

          setStore('stats', () => ({
            likes: st.likes || 0,
            satszapped: st.satszapped || 0,
          }));
        }

        if (content.kind === Kind.DVMMetadata) {
          const metadata = JSON.parse(content.content);

          if (!metadata.event_id) return;

          setStore('metadata', () => ({ kind: metadata.kind, isPrimal: metadata.is_primal}))
        }

        if (content.kind === Kind.NoteActions) {
          const noteActionContent = content as NostrNoteActionsContent;
          const noteActions = JSON.parse(noteActionContent.content) as NoteActions;

          setStore('actions', () => ({ ...noteActions }));
          return;
        }

        if (content.kind === Kind.DVMFollowsActions) {
          const followsActions = JSON.parse(content.content);

          setStore('commonFollowsPubkeys', () => [...followsActions.users])
        }
      },
      onEose: () => {
        unsub();
        if (!store.users) return;

        const autor = store.users[store.dvm?.pubkey || ''];
        if (autor) {
          setStore('author', () => ({ ...autor }));
        }
      }
    });

    fetchDVM(account?.publicKey, subId, identifier, pubkey);
  }

  const dvm = () => store.dvm;
  const stats = () => store.stats;
  const metadata = () => store.metadata;
  const author = () => store.author;
  const actions = () => store.actions;

  const commonUsers = () => {
    const users = store.users;
    if (!users) return [];

    const pks = store.commonFollowsPubkeys || [];

    const c = pks.reduce<PrimalUser[]>((acc, pk) => {
      const user = users[pk];

      return user ?
        [ ...acc, { ...user }] :
        acc;
    }, []);


    return c;
  }

  const generateFeedDefinition = () => {
    const dvm = store.dvm;

    if (!dvm) return;

    const spec = store.dvm?.primal_spec ?? JSON.stringify({
        dvm_id: dvm.identifier,
        dvm_pubkey: dvm.pubkey,
        kind: store.metadata?.kind || 'notes',
      });

    const feed: PrimalArticleFeed = {
      name: dvm.name,
      description: dvm.about,
      spec,
      enabled: true,
      feedkind: 'dvm',
    };

    return feed;
  }

  const isFeedAdded = () => {
    const feed = generateFeedDefinition();

    if (!feed) return false;

    return settings?.actions.isFeedAdded(feed, addFeedDestination());
  }

  const addFeedDestination = () => {
    if (metadata()?.kind === 'reads') return 'reads';

    return 'home';
  }

  const toggleFeed = () => {
    const feed = generateFeedDefinition();

    if (!feed) return;

    if (isFeedAdded()) {
      settings?.actions.removeFeed(feed, addFeedDestination());
      return;
    }

    settings?.actions.addFeed(feed, addFeedDestination());
  }

  return (
    <>
      <PageTitle title={intl.formatMessage(tExplore.pageTitle)} />

      <StickySidebar>
        <div class={styles.exploreSide}>
          <NostrStats stats={explore?.stats}/>

          <ExploreHotTopics />

          <ExploreSidebar />
        </div>
      </StickySidebar>

      <PageCaption>
        <div class={styles.exploreHeader}>
          <div class={styles.exploreDVMFeedHeader}>
            <A
              class={styles.backButton}
              href={'/explore#feeds'}
            >
                <div class={styles.backIcon}></div>
                <div>Feed Marketplace</div>
            </A>
            <ButtonFlip
              when={isFeedAdded()}
              class={styles.addToFeed}
              onClick={toggleFeed}
              fallback={
                <>
                  Add this feed to your {addFeedDestination()} feed
                </>
              }
              >
              <>Remove this feed from your {addFeedDestination()} feed</>
            </ButtonFlip>
          </div>

        </div>
      </PageCaption>


      <div class={styles.explorePageTabs}>
        <div class={styles.feedMarketplaceContent}>
          <FeedMarketPlacePreview
            dvm={dvm()}
            author={author()}
            stats={stats()}
            actions={actions()}
            metadata={metadata()}
            type={metadata()?.kind}
            commonFollows={commonUsers()}
          />
        </div>
      </div>
    </>
  )
}

export default ExploreFeeds;
