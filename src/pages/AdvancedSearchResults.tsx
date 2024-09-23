import { paragraphSchema } from '@milkdown/preset-commonmark';
import { A, useLocation, useParams, useRouteData } from '@solidjs/router';
import { Component, createEffect, For, Match, onMount, Show, Switch } from 'solid-js';
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
import Paginator from '../components/Paginator/Paginator';


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
    search?.actions.findContent(queryString());
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
        <Switch>
          <Match when={[Kind.LongForm, Kind.LongFormShell].includes(kind())}>
            <For each={search?.reads} >
              {article => <ArticlePreview article={article} />}
            </For>
          </Match>
          <Match when={[Kind.Text].includes(kind())}>
            <For each={search?.notes} >
              {note => <Note note={note} shorten={true} />}
            </For>
          </Match>
          <Match when={!search?.isFetchingContent && (search?.notes.length === 0 || search?.reads.length === 0)}>
            <div class={styles.noResults}>
              No results found

              <For each={search?.errors}>
                {error => <div class={styles.error}>{error}</div>}
              </For>
            </div>
          </Match>
        </Switch>

        <Show when={search?.isFetchingContent}><Loader /></Show>
      </div>

      <Paginator loadNextPage={() => search?.actions.fetchContentNextPage(queryString())} />
    </>
  )
}

export default AdvancedSearchResults;
