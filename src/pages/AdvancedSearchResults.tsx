import { paragraphSchema } from '@milkdown/preset-commonmark';
import { A, useLocation, useParams, useRouteData } from '@solidjs/router';
import { Component, For, Match, onMount, Show, Switch } from 'solid-js';
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
import { useSearchContext } from '../contexts/SearchContext';
import { useAdvancedSearchContext } from '../contexts/AdvancedSearchContext';
import { Kind } from '../constants';
import ArticlePreview from '../components/ArticlePreview/ArticlePreview';


const AdvancedSearchResults: Component = () => {
  const params = useParams()
  const search = useAdvancedSearchContext();


  const queryString = () => decodeURIComponent(params.query);

  const kind = () => {
    const isRead = queryString().search(/kind:(\s)?30023\s/) >= 0;

    if (isRead) return Kind.LongForm;

    return 1;
  }

  onMount(() => {
    search?.actions.findContent(queryString(), kind());
  })


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
          {queryString()}
        </div>
      </div>


      <div class={styles.list}>
        <Switch fallback={
          <For each={search?.notes} >
            {note => <Note note={note} shorten={true} />}
          </For>
        }>
          <Match when={kind() === Kind.LongForm}>
            <For each={search?.notes} >
              {article => <ArticlePreview article={article} />}
            </For>
          </Match>
        </Switch>
      </div>
    </>
  )
}

export default AdvancedSearchResults;
