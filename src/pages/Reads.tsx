import {
  Component,
  createEffect,
  createSignal,
  For,
  Match,
  onCleanup,
  onMount,
  Show,
  Switch
} from 'solid-js';
import Note from '../components/Note/Note';
import styles from './Home.module.scss';
import HomeHeader from '../components/HomeHeader/HomeHeader';
import Loader from '../components/Loader/Loader';
import Paginator from '../components/Paginator/Paginator';
import HomeSidebar from '../components/HomeSidebar/HomeSidebar';
import Branding from '../components/Branding/Branding';
import HomeHeaderPhone from '../components/HomeHeaderPhone/HomeHeaderPhone';
import Wormhole from '../components/Wormhole/Wormhole';
import { scrollWindowTo } from '../lib/scroll';
import StickySidebar from '../components/StickySidebar/StickySidebar';
import { useHomeContext } from '../contexts/HomeContext';
import { useIntl } from '@cookbook/solid-intl';
import { createStore } from 'solid-js/store';
import { PrimalUser } from '../types/primal';
import Avatar from '../components/Avatar/Avatar';
import { userName } from '../stores/profile';
import { useAccountContext } from '../contexts/AccountContext';
import { reads as tReads, branding } from '../translations';
import Search from '../components/Search/Search';
import { setIsHome } from '../components/Layout/Layout';
import PageTitle from '../components/PageTitle/PageTitle';
import { useAppContext } from '../contexts/AppContext';
import PageCaption from '../components/PageCaption/PageCaption';
import { useReadsContext } from '../contexts/ReadsContext';
import { Kind } from '../constants';


const Reads: Component = () => {

  const intl = useIntl();
  const reads = useReadsContext();

  onMount(() => {
    reads?.actions.fetchPage(0, Kind.LongForm);
  });

  return (
    <div class={styles.homeContent}>
      <PageTitle title={intl.formatMessage(branding)} />

      <PageCaption title={intl.formatMessage(tReads.pageTitle)} />

      <Wormhole
        to="search_section"
      >
        <Search />
      </Wormhole>

    </div>
  )
}

export default Reads;
