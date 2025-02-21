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
import { isPhone } from '../../utils';
import SelectBox from '../../components/SelectBox/SelectBox';
import SelectionBox2 from '../../components/SelectionBox/SelectionBox2';
import { SelectionOption } from '../../types/primal';
import SelectionBox from '../../components/SelectionBox/SelectionBox';

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


  const options:() => SelectionOption[] = () => {

    return [
      {
        label: 'Feeds',
        value: 'feeds',
        description: 'DVM feeds',
        id: 'feeds',
      },
      {
        label: 'People',
        value: 'people',
        description: 'Explore People',
        id: 'people',
      },
      {
        label: 'Zaps',
        value: 'zaps',
        description: 'Explore Zaps',
        id: 'zaps',
      },
      {
        label: 'Media',
        value: 'media',
        description: 'Explore Media',
        id: 'media',
      },
      {
        label: 'Topics',
        value: 'topics',
        description: 'Explore Topics',
        id: 'topics',
      },
    ];
  };

    return (
      <>
        <PageTitle title={intl.formatMessage(tExplore.pageTitle)} />

        <PageCaption>
          <div class={styles.exploreHeader}>
            <Search fullWidth={true} />
          </div>
        </PageCaption>

        <Show when={!isPhone()}>
          <StickySidebar>
            <div class={styles.exploreSide}>
              <NostrStats stats={explore?.stats}/>

              <ExploreHotTopics />

              <ExploreSidebar />
            </div>
          </StickySidebar>
        </Show>

          <div class={styles.explorePageTabs}>
            <Tabs
              value={hash()}
              onChange={onChangeTab}
              defaultValue={hash()}
            >
              <Show
                when={!isPhone()}
                fallback={
                  <div class={styles.phoneTabSelector}>
                    <SelectionBox2
                      options={options()}
                      onChange={(o: SelectionOption) => onChangeTab(o.value)}
                      value={hash() || options()[0].value}
                      initialValue={options()[0].value}
                      isSelected={(o: SelectionOption) => o.value === hash()}
                    />
                    <div class={styles.right}>
                      <A href={'/search'}>Advanced Search</A>
                    </div>
                  </div>
                }
              >
                <Tabs.List class={styles.exploreTabs}>
                  <div class={styles.left}>
                    <Tabs.Trigger class={styles.exploreTab} value="feeds">
                      <div class={styles.tabLabel}>
                        Feeds
                      </div>
                    </Tabs.Trigger>
                    <Tabs.Trigger class={styles.exploreTab} value="people">
                      <div class={styles.tabLabel}>
                        People
                      </div>
                    </Tabs.Trigger>
                    <Tabs.Trigger class={styles.exploreTab} value="zaps">
                      <div class={styles.tabLabel}>
                        Zaps
                      </div>
                    </Tabs.Trigger>
                    <Tabs.Trigger class={styles.exploreTab} value="media">
                      <div class={styles.tabLabel}>
                        Media
                      </div>
                    </Tabs.Trigger>
                    <Tabs.Trigger class={styles.exploreTab} value="topics">
                      <div class={styles.tabLabel}>
                        Topics
                      </div>
                    </Tabs.Trigger>
                    <Tabs.Indicator class={styles.exploreTabIndicator} />
                  </div>
                  <div class={styles.right}>
                    <A href={'/search'}>Advanced Search</A>
                  </div>
                </Tabs.List>
              </Show>


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
