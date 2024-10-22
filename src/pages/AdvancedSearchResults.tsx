import { useNavigate, useParams } from '@solidjs/router';
import { Component, createEffect, createSignal, For, Match, on, onMount, Show, Switch } from 'solid-js';
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
import { setAdvSearchState } from './AdvancedSearch';


const AdvancedSearchResults: Component = () => {
  const params = useParams()
  const search = useAdvancedSearchContext();
  const navigate = useNavigate();

  const [openAddFeedDialog, setAddFeedDialog] = createSignal<boolean>(false);
  const [allowCommandChange, setAllowCommandChange] = createSignal(false);
  const [queryString, setQueryString] = createSignal('');

  createEffect(on(() => params.query, (v, p) => {
    if (!v || v === p) return;

    const q = decodeURIComponent(params.query);

    setQueryString(() => q);
    search?.actions.clearSearch();
    search?.actions.findContent(q);
  }));

  // const queryString = () => decodeURIComponent(params.query);

  const kind = () => {
    const isRead = queryString().search(/kind:(\s)?30023\s/) >= 0;

    if (isRead) return Kind.LongForm;

    return 1;
  }

  // onMount(() => {
  //   const q = decodeURIComponent(params.query);
  //   search?.actions.clearSearch();
  //   search?.actions.findContent(q);
  // });


  createEffect(on(() => params.query, (v, p) => {
    if (!v || v === p) return;

    setAdvSearchState('command', () => v);
  }))

  const feedType = () => [Kind.LongForm].includes(kind()) ?
  'reads' : 'home';

  const onKeyUp = (e: KeyboardEvent) => {
    console.log('KEY: ', e.code)
    if (e.code === 'Enter') {
      e.stopPropagation();
      e.preventDefault();
      submitCommandChange();
      return false;
    }
  }

  const submitCommandChange = () => {
    navigate(`/asearch/${encodeURIComponent(queryString())}`);
  }

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
              onClick={() => navigate('/asearch', { state: { query: queryString() } })}
            >
              Back to Advanced search
            </ButtonLink>
          </div>
        </div>

      <StickySidebar>
        <TextField
          class={styles.searchCommand}
          value={queryString()}
          onKeyDown={onKeyUp}
          onChange={setQueryString}
        >
          <TextField.Label>Search Command</TextField.Label>
          <TextField.TextArea
            autoResize={true}
            onFocus={() => setAllowCommandChange(() => true)}
            onBlur={() => setAllowCommandChange(() => false)}
          />
        </TextField>
        <Show when={allowCommandChange()}>
          <button
            class={styles.faintButton}
            type="submit"
          >
            Press Enter to apply changes
          </button>
        </Show>
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
