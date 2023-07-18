import { Component, Show } from 'solid-js';
import styles from './Explore.module.scss';
import ExploreMenu from './ExploreMenu';
import Feed from './Feed';
import { useParams } from '@solidjs/router';
import Branding from '../components/Branding/Branding';
import PageNav from '../components/PageNav/PageNav';
import { scopeLabels, timeframeLabels } from '../constants';
import ExploreSidebar from '../components/ExploreSidebar/ExploreSidebar';
import { useToastContext } from '../components/Toaster/Toaster';
import { useSettingsContext } from '../contexts/SettingsContext';
import StickySidebar from '../components/StickySidebar/StickySidebar';
import Wormhole from '../components/Wormhole/Wormhole';
import { toast as t, explore as tExplore, actions as tAction } from '../translations';
import { useIntl } from '@cookbook/solid-intl';
import Search from '../components/Search/Search';
import PageCaption from '../components/PageCaption/PageCaption';
import { titleCase } from '../utils';
import AddToHomeFeedButton from '../components/AddToHomeFeedButton/AddToHomeFeedButton';


const scopes = ['follows', 'tribe', 'network', 'global'];
const timeframes = ['latest', 'trending', 'popular', 'mostzapped'];

const Explore: Component = () => {

  const settings = useSettingsContext();
  const toaster = useToastContext();
  const intl = useIntl();

    const params = useParams();

    const hasParams = () => {
      if (!params.scope || !params.timeframe) {
        return false;
      }

      return scopes.includes(params.scope) &&
        timeframes.includes(params.timeframe);

    };

    const hasFeedAtHome = () => {
      const hex = `${params.scope};${params.timeframe}`;

      return !!settings?.availableFeeds.find(f => f.hex === hex);
    };

    const addToHomeFeed = () => {
      const hex = `${params.scope};${params.timeframe}`;
      const name = titleCase(`${timeframeLabels[params.timeframe]}, ${scopeLabels[params.scope]}`);
      const feed = { name, hex };

      settings?.actions.addAvailableFeed(feed);

      toaster?.sendSuccess(intl.formatMessage(
        t.addFeedToHomeSuccess,
        { name },
      ));
    };

    return (
      <>
        <Wormhole to="branding_holder">
          <Show
            when={hasParams()}
            fallback={<Branding small={false} />}
          >
            <PageNav />
          </Show>
        </Wormhole>

        <Wormhole
          to="search_section"
        >
          <Search />
        </Wormhole>

        <Show
          when={hasParams()}
          fallback={<PageCaption title={intl.formatMessage(tExplore.genericCaption)} />}
        >
          <PageCaption>
            <div class={styles.exploreCaption}>
              {intl.formatMessage(
                tExplore.title,
                {
                  timeframe: timeframeLabels[params.timeframe],
                  scope: scopeLabels[params.scope],
                },
              )}
            </div>
            <AddToHomeFeedButton
              disabled={hasFeedAtHome()}
              onAdd={addToHomeFeed}
              activeLabel={intl.formatMessage(tAction.addFeedToHome)}
              disabledLabel={intl.formatMessage(tAction.disabledAddFeedToHome)}
            />
          </PageCaption>

        </Show>

        <StickySidebar>
          <ExploreSidebar />
        </StickySidebar>

        <Show
          when={hasParams()}
          fallback={<ExploreMenu />}
        >
          <Feed scope={params.scope} timeframe={params.timeframe} />
        </Show>
      </>
    )
}

export default Explore;
