import { paragraphSchema } from '@milkdown/preset-commonmark';
import { A, useLocation, useParams, useRouteData } from '@solidjs/router';
import { Component, For, Show } from 'solid-js';
import { createStore } from 'solid-js/store';
import AddToHomeFeedButton from '../components/AddToHomeFeedButton/AddToHomeFeedButton';
import Loader from '../components/Loader/Loader';
import Note from '../components/Note/Note';
import PageCaption from '../components/PageCaption/PageCaption';
import PageTitle from '../components/PageTitle/PageTitle';
import SearchSidebar from '../components/SearchSidebar/SearchSidebar';
import StickySidebar from '../components/StickySidebar/StickySidebar';
import Wormhole from '../components/Wormhole/Wormhole';
import { search } from '../translations';
import SearchComponent from '../components/Search/Search';
import styles from './FeedsTest.module.scss';
import { SearchState } from './AdvancedSearch';


const AdvancedSearchResults: Component = () => {
  const location = useLocation();
  const params = useParams()


  const data = () => decodeURIComponent(params.query);


  return (
    <>
      <PageTitle title="Search results"
      />

      <Wormhole
        to="search_section"
      >
        <SearchComponent />
      </Wormhole>

      <PageCaption>
        Advanced Search results
      </PageCaption>

      <div class={styles.section}>
        <div class={styles.summary}>
          {data()}
        </div>
      </div>


      <div class={styles.list}>
        Results
      </div>
    </>
  )
}

export default AdvancedSearchResults;
