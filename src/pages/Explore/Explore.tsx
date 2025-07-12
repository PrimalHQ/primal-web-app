import { Component, createEffect, onCleanup, onMount, Show } from 'solid-js';
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
import { A, useLocation } from '@solidjs/router';
import FeedMarketPlace from '../../components/FeedMarketplace/FeedMarketPlace';
import ExplorePeople from './ExplorePeople';
import ExploreZaps from './ExploreZaps';
import ExploreMedia from './ExploreMedia';
import ExploreTopics from './ExploreTopics';
import NostrStats from '../../components/NostrStats/NostrStats';
import { isConnected } from '../../sockets';
import { useAccountContext } from '../../contexts/AccountContext';
import ExploreSidebar from '../../components/ExploreSidebar/ExploreSidebar';
import ExploreHotTopics from '../../components/ExploreSidebar/ExploreHotTopics';

const Explore: Component = () => {

  const settings = useSettingsContext();
  const toaster = useToastContext();
  const intl = useIntl();
  const explore = useExploreContext();
  const location = useLocation();
  const account = useAccountContext();


  const hash = () => {
    return (location.hash.length > 1) ? location.hash.substring(1) : 'feeds';
  }

  onMount(() => {
    const value = hash();
    updateTabContent(value);
  });

  createEffect(() => {
    if (isConnected()) {
      explore?.actions.fetchLegendStats(account?.publicKey);
      explore?.actions.openNetStatsStream();
    }
  });

  onCleanup(() => {
    explore?.actions.closeNetStatsStream();
  });


  const updateTabContent = (value: string) => {

    switch(value) {
      case 'reads':
        // profile.articles.length === 0 && profile.actions.fetchArticles(profile.profileKey);
        // profile.articles.length === 0 && profile.actions.getProfileMegaFeed(profile.profileKey, 'reads');
        break;
      case 'notes':
        // profile.notes.length === 0 && profile.actions.fetchNotes(profile.profileKey);

        // profile.notes.length === 0 && profile.actions.getProfileMegaFeed(profile.profileKey, 'notes');
        break;
      case 'replies':
        // profile.replies.length === 0 && profile.actions.fetchReplies(profile.profileKey);
        // profile.replies.length === 0 && profile.actions.getProfileMegaFeed(profile.profileKey, 'replies');
        break;
      case 'media':
        // profile.gallery.length === 0 && profile.actions.fetchGallery(profile.profileKey);
        // profile.gallery.length === 0 && profile.actions.getProfileMegaFeed(profile.profileKey, 'media');
        break;
      case 'zaps':
        // profile.zaps.length === 0 && profile.actions.fetchZapList(profile.profileKey);
        break;
      case 'relays':
        // Object.keys(profile.relays || {}).length === 0 && profile.actions.fetchRelayList(profile.profileKey);
        break;
    }
  }

  const onChangeTab = (tab: string) => {
    // explore?.actions.selectTab(tab);

    window.location.hash = tab;
    updateTabContent(tab);
  }

    return (
      <>
        <PageTitle title={intl.formatMessage(tExplore.pageTitle)} />

        <PageCaption>
          <div class={styles.exploreHeader}>
            <Search fullWidth={true} />
          </div>
        </PageCaption>

        <StickySidebar>
          <div class={styles.exploreSide}>
            <NostrStats stats={explore?.stats}/>

            <ExploreHotTopics />

            <ExploreSidebar />
          </div>
        </StickySidebar>


        <div class={styles.explorePageTabs}>
          <Tabs
            value={hash()}
            onChange={onChangeTab}
            defaultValue={hash()}
          >
            <Tabs.List class={styles.exploreTabs}>
              <div class={styles.left}>
                <Tabs.Trigger class={styles.exploreTab} value="feeds">
                  <div class={styles.tabLabel}>
                    Folyamok
                  </div>
                </Tabs.Trigger>
                <Tabs.Trigger class={styles.exploreTab} value="people">
                  <div class={styles.tabLabel}>
                    Emberek
                  </div>
                </Tabs.Trigger>
                <Tabs.Trigger class={styles.exploreTab} value="zaps">
                  <div class={styles.tabLabel}>
                    Zappok
                  </div>
                </Tabs.Trigger>
                <Tabs.Trigger class={styles.exploreTab} value="media">
                  <div class={styles.tabLabel}>
                    Média
                  </div>
                </Tabs.Trigger>
                <Tabs.Trigger class={styles.exploreTab} value="topics">
                  <div class={styles.tabLabel}>
                    Témák
                  </div>
                </Tabs.Trigger>
                <Tabs.Indicator class={styles.exploreTabIndicator} />
              </div>
              <div class={styles.right}>
                <A href={'/asearch'}>Összetett keresés</A>
              </div>
            </Tabs.List>


            <Tabs.Content class={styles.tabContent} value="feeds">
              <FeedMarketPlace open={hash() === 'feeds'}/>
            </Tabs.Content>
            <Tabs.Content class={styles.tabContent} value="people">
              <ExplorePeople />
            </Tabs.Content>
            <Tabs.Content class={styles.tabContent} value="zaps">
              <ExploreZaps />
            </Tabs.Content>
            <Tabs.Content class={styles.tabContent} value="media">
              <ExploreMedia />
            </Tabs.Content>
            <Tabs.Content class={styles.tabContent} value="topics">
              <ExploreTopics />
            </Tabs.Content>
          </Tabs>
        </div>
      </>
    )
}

export default Explore;
