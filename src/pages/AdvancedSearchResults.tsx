import { paragraphSchema } from '@milkdown/preset-commonmark';
import { A, useLocation, useNavigate, useParams, useRouteData } from '@solidjs/router';
import { Component, createEffect, createSignal, For, Match, onMount, Show, Switch } from 'solid-js';
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
import { TextField } from '@kobalte/core/text-field';
import ButtonGhost from '../components/Buttons/ButtonGhost';
import ButtonLink from '../components/Buttons/ButtonLink';
import { useAccountContext } from '../contexts/AccountContext';
import { useSettingsContext } from '../contexts/SettingsContext';
import { PrimalArticleFeed } from '../types/primal';
import AdvancedSearchDialog from '../components/AdvancedSearch/AdvancedSearchDialog';
import ButtonSecondary from '../components/Buttons/ButtonSecondary';
import ButtonPremium from '../components/Buttons/ButtonPremium';


const AdvancedSearchResults: Component = () => {
  const params = useParams()
  const search = useAdvancedSearchContext();
  const settings = useSettingsContext();
  const navigate = useNavigate();

  const [openAddFeedDialog, setAddFeedDialog] = createSignal<'home' | 'reads' | undefined>();

  const [feedName, setFeedName] = createSignal('Seach results');
  const [feedDescription, setFeedDescription] = createSignal('Primal Saved Search');

  const queryString = () => decodeURIComponent(params.query);

  const kind = () => {
    const isRead = queryString().search(/kind:(\s)?30023\s/) >= 0;

    if (isRead) return Kind.LongForm;

    return 1;
  }

  onMount(() => {
    search?.actions.clearSearch();
    search?.actions.findContent(queryString());
  });

  const generateFeedDefinition = () => {

    const spec = JSON.stringify({
        id: 'advsearch',
        query: queryString(),
      });

    const feed: PrimalArticleFeed = {
      name: feedName(),
      description: feedDescription(),
      spec,
      enabled: true,
      feedkind: 'search',
    };

    return feed;
  }

  const toggleFeed = () => {
    const feed = generateFeedDefinition();
    const feedtype = feedType();

    if (!feed) return;

    const isAlreadyAdded = settings?.actions.isFeedAdded(feed, feedtype)

    if (isAlreadyAdded) {
      settings?.actions.removeFeed(feed, feedtype);
      return;
    }

    setAddFeedDialog(() => feedtype);

    // settings?.actions.addFeed(feed, feedtype);
  };

  const feedType = () => [Kind.LongForm].includes(kind()) ?
  'reads' : 'home';

  const isFeedAdded = () => {
    const feed = generateFeedDefinition();
    const feedtype = feedType();

    if (!feed) return false;

    return settings?.actions.isFeedAdded(feed, feedtype);
  }


  const scopeName = () => {
    if ([Kind.LongForm].includes(kind())) {
      return 'reads';
    }

    return 'home';
  };

  return (
    <>
      <PageTitle title="Advanced search results"/>

        <div class={styles.advancedSerchResultsHeader}>
          <div class={styles.caption}>
            <div>search results</div>
          </div>
          <div class={styles.actions}>
            <button
              class={styles.addToFeed}
              onClick={toggleFeed}
            >
              <Show
                when={isFeedAdded()}
                fallback={<>
                  <div class={styles.addIcon}></div>
                  <div>
                    Add this search to my {scopeName()} feeds
                  </div>
                </>}
              >
                Remove this search from my {scopeName()} feeds
              </Show>
            </button>

            <ButtonLink
              onClick={() => navigate('/asearch')}
            >
              Back to Advanced search
            </ButtonLink>
          </div>
        </div>

      <StickySidebar>
        <TextField class={styles.searchCommand} value={queryString()} readOnly={true}>
          <TextField.Label>Search Command</TextField.Label>
          <TextField.TextArea autoResize={true}/>
        </TextField>
      </StickySidebar>

      <AdvancedSearchDialog
        open={openAddFeedDialog()}
        setOpen={(b: boolean) => setAddFeedDialog(() => b ? feedType() : undefined)}
        triggerClass="hidden"
        title={<div class={styles.addToFeedDialogTitle}>
          Save to <span>{scopeName()}</span> Feeds
        </div>}
      >
        <div class={styles.addToFeedDialogContent}>
          <div class={styles.form}>
            <TextField class={styles.searchCommand} value={feedName()} onChange={setFeedName}>
              <TextField.Label>Feed name:</TextField.Label>
              <TextField.Input />
            </TextField>

            <TextField class={styles.searchCommand} value={feedDescription()} onChange={setFeedDescription}>
              <TextField.Label>Feed description</TextField.Label>
              <TextField.Input />
            </TextField>
          </div>
          <div class={styles.footer}>
            <ButtonSecondary
              onClick={() => setAddFeedDialog(() => undefined)}
              light={true}
            >
              Cancel
            </ButtonSecondary>
            <ButtonPremium
              onClick={() => {
                settings?.actions.addFeed(generateFeedDefinition(), feedType());
                setAddFeedDialog(() => undefined);
              }}
            >
              Save
            </ButtonPremium>
          </div>
        </div>
      </AdvancedSearchDialog>


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
