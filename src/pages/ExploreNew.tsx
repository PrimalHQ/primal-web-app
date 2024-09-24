import { Component, createEffect, onCleanup, onMount, Show } from 'solid-js';
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
import PageTitle from '../components/PageTitle/PageTitle';


const scopes = ['follows', 'tribe', 'network', 'global'];
const timeframes = ['latest', 'trending', 'popular', 'mostzapped'];

const ExploreNew: Component = () => {

  const settings = useSettingsContext();
  const toaster = useToastContext();
  const intl = useIntl();

    return (
      <>
        <PageTitle title={intl.formatMessage(tExplore.pageTitle)} />

        <Wormhole
          to="search_section"
        >
          <Search />
        </Wormhole>

        <PageCaption title={intl.formatMessage(tExplore.genericCaption)}
        />

        <StickySidebar>
        </StickySidebar>
      </>
    )
}

export default ExploreNew;
