import { useNavigate, useParams } from '@solidjs/router';
import { Component, createSignal, For, Match, onMount, Show, Switch } from 'solid-js';
import Loader from '../components/Loader/Loader';
import Note from '../components/Note/Note';
import PageTitle from '../components/PageTitle/PageTitle';
import StickySidebar from '../components/StickySidebar/StickySidebar';
import styles from './FeedsTest.module.scss';
import { useAdvancedSearchContext } from '../contexts/AdvancedSearchContext';
import { Kind } from '../constants';
import ArticlePreview from '../components/ArticlePreview/ArticlePreview';
import Paginator from '../components/Paginator/Paginator';
import { TextField } from '@kobalte/core/text-field';
import ButtonLink from '../components/Buttons/ButtonLink';
import SaveFeedDialog from '../components/SaveFeedDialog/SaveFeedDialog';


const AdvancedSearchResults: Component = () => {
  const params = useParams()
  const search = useAdvancedSearchContext();
  const navigate = useNavigate();

  const [openAddFeedDialog, setAddFeedDialog] = createSignal<boolean>(false);

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

  const feedType = () => [Kind.LongForm].includes(kind()) ?
  'reads' : 'home';

  return (
    <>
      <PageTitle title="Advanced search results"/>

        <div class={styles.advancedSerchResultsHeader}>
          <div class={styles.caption}>
            <div>search results</div>
          </div>
          <div class={styles.actions}>

            <SaveFeedDialog
              open={openAddFeedDialog()}
              setOpen={setAddFeedDialog}
              query={queryString()}
              feedType={feedType()}
            />

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
