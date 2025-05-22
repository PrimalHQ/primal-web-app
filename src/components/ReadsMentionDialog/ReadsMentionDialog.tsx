import { useIntl } from '@cookbook/solid-intl';
import { Tabs } from '@kobalte/core/tabs';
import { Search } from '@kobalte/core/search';
import { A } from '@solidjs/router';
import { Component, createEffect, createSignal, For, Match, on, onMount, Show, Switch } from 'solid-js';
import { createStore } from 'solid-js/store';
import { APP_ID } from '../../App';
import { Kind, urlRegexG } from '../../constants';
import { useAccountContext } from '../../contexts/AccountContext';
import { ReactionStats, useAppContext } from '../../contexts/AppContext';
import { hookForDev } from '../../lib/devTools';
import { hexToNpub } from '../../lib/keys';
import { getEventQuotes, getEventQuoteStats, getEventReactions, getEventZaps, parseLinkPreviews, setLinkPreviews } from '../../lib/notes';
import { truncateNumber2 } from '../../lib/notifications';
import { subsTo } from '../../sockets';
import { convertToNotes } from '../../stores/note';
import { nip05Verification, userName } from '../../stores/profile';
import {
  actions as tActions,
  placeholders as tPlaceholders,
  reactionsModal,
  search as tSearch,
} from '../../translations';
import { FeedPage, NostrMentionContent, NostrNoteActionsContent, NostrNoteContent, NostrStatsContent, NostrUserContent, NoteActions, PrimalArticle, PrimalArticleFeed, PrimalNote, PrimalUser } from '../../types/primal';
import { debounce, parseBolt11, previousWord } from '../../utils';
import AdvancedSearchDialog from '../AdvancedSearch/AdvancedSearchDialog';
import Avatar from '../Avatar/Avatar';
import Loader from '../Loader/Loader';
import Note from '../Note/Note';
import Paginator from '../Paginator/Paginator';
import VerificationCheck from '../VerificationCheck/VerificationCheck';

import styles from './ReadsMentionDialog.module.scss';
import DOMPurify from 'dompurify';
import ButtonPrimary from '../Buttons/ButtonPrimary';
import { useSearchContext } from '../../contexts/SearchContext';
import SearchOption from '../Search/SearchOption';
import { useProfileContext } from '../../contexts/ProfileContext';
import { getUsersRelayInfo } from '../../lib/profile';
import { useAdvancedSearchContext } from '../../contexts/AdvancedSearchContext';
import tippy, { Instance } from 'tippy.js';
import { nip19 } from '../../lib/nTools';
import ArticleCompactPreview from '../ArticlePreview/ArticleCompactPreview';
import ArticlePreview from '../ArticlePreview/ArticlePreview';
import ArticlePreviewSuggestion from '../ArticlePreview/ArticlePreviewSuggestion';
import ArticlePreviewSuggestionSkeleton from '../Skeleton/ArticlePreviewSuggestionSkeleton';
import NoteSuggestionSkeleton from '../Skeleton/NoteSuggestionSkeleton';

const contentKinds: Record<string, number> = {
  notes: 1,
  reads: 30023,
}

const placeholders = {
  users: 'Search users by name or npub...',
  notes: 'Search notes by text or id...',
  reads: 'Search reads by text or address...',
}

const ReadsMentionDialog: Component<{
  id?: string,
  open: boolean,
  setOpen?: (v: boolean) => void,
  onAddUser: (user: PrimalUser, relays: string[]) => void,
  onAddNote: (note: PrimalNote) => void,
  onAddRead: (read: PrimalArticle) => void,
}> = (props) => {

  const intl = useIntl();
  const account = useAccountContext();
  const app = useAppContext();
  const search = useSearchContext();
  const advsearch = useAdvancedSearchContext();
  const profile = useProfileContext();

  const [query, setQuery] = createSignal('');

  let searchInput: HTMLInputElement | undefined;

  let userRelays: Record<string, string[]> = {};

  const [activeTab, setActiveTab] = createSignal('users');

  createEffect(() => {
    if (props.open && activeTab()) {
      setQuery(() => '')
      setTimeout(() => {
        if (!searchInput) return;
        setQuery(() => searchInput?.value || '')
        searchInput.focus();
      }, 100)
    }
  });

  createEffect(on(query, (q, prev) => {
    if (q === prev) return;

    const tab = activeTab();
    if (tab === 'users') {
      searchUsers(q);
      return;
    }

    searchContent(q, tab);
  }));

  const searchUsers = (q: string) => {
    if (q.length === 0) {
      search?.actions.getRecomendedUsers(profile?.profileHistory.profiles || []);
      return;
    }

    search?.actions.findUsers(q);
  }

  const searchContent = (q: string, tab: string) => {
    if (q.length === 0 || !searchInput) {
      advsearch?.actions.clearSearch();
      return;
    }

    const lastWord = previousWord(searchInput);

    if (
      lastWord.startsWith('from:') ||
      lastWord.startsWith('to:') ||
      lastWord.startsWith('zappedby:')
    ) {
      pop?.show();
      filterUsers(lastWord, searchInput);
      return;
    } else {
      pop?.state.isShown && pop.hide();
    }

    const kind = contentKinds[tab] || 1;
    const term = `kind:${kind} ${q}`;
    advsearch?.actions.clearSearch();
    advsearch?.actions.findContent(term);
  }

  createEffect(on(() => search?.users, (users, prev) => {
    if (!users) return;

    const prevIds = prev?.map(u => u.pubkey) || [];

    const hasNew = users.some(u => !prevIds.includes(u.pubkey))

    if (hasNew) {
      fetchUserRelays(users);
    }
  }));

  const fetchUserRelays = async (users: PrimalUser[]) => {
    userRelays = await getUserRelays(users);
  };

  const getUserRelays = async (users: PrimalUser[]) => await (new Promise<Record<string, string[]>>(resolve => {
    const uids = Object.values(users).map(u => u.pubkey);
    const subId = `users_search_relays_${APP_ID}`;

    let relays: Record<string, string[]> = {};

    const unsub = subsTo(subId, {
      onEose: () => {
        unsub();
        resolve({ ...relays });
      },
      onEvent: (_, content) => {
        if (content.kind !== Kind.UserRelays) return;

        const pk = content.pubkey || 'UNKNOWN';

        let rels: string[] = [];

        for (let i = 0; i < (content.tags || []).length; i++) {
          if (rels.length > 1) break;

          const rel = content.tags[i];
          if (rel[0] !== 'r' || rels.includes(rel[1])) continue;

          rels.push(rel[1]);
        }

        relays[pk] = [...rels];
      },
      onNotice: () => resolve({}),
    })

    getUsersRelayInfo(uids, subId);
  }));

  const [suggestedTerm, setSuggestedTerm] = createSignal('');
  const [highlightedUser, setHighlightedUser] = createSignal<number>(0);

  const onKeyDown = (event: KeyboardEvent) => {
    if (!pop?.state.isShown) return;

    if (event.key === 'Escape') {
      pop?.hide();
      return true;
    }

    if (event.key === 'ArrowDown') {
      setHighlightedUser(i => {
        if (!search?.users || search.users.length === 0) {
          return 0;
        }

        return i < search.users.length ? i + 1 : 0;
      });

      return true;
    }

    if (event.key === 'ArrowUp') {
      setHighlightedUser(i => {
        if (!search?.users || search.users.length === 0) {
          return 0;
        }

        return i > 0 ? i - 1 : search.users.length;
      });
      return true;
    }


    if (['Enter', 'Space', 'Comma', 'Tab'].includes(event.code)) {
      const sel = document.getElementById(`mention_suggested_user_${highlightedUser()}`);

      sel && sel.click();

      return true;
    }

    return false;

    // @ts-ignore
    // return component?.ref?.onKeyDown(props)
  };

  let pop: Instance | undefined;

  createEffect(() => {
    if (props.open) {
      setTimeout(() => {
        if (!searchInput) return;

        let component = (
          <div class={styles.suggest}>
            <For each={search?.users}>
              {(user, index) => (
                <SearchOption
                  id={`mention_suggested_user_${index()}`}
                  title={userName(user)}
                  description={nip05Verification(user)}
                  icon={<Avatar user={user} size="xs" />}
                  statNumber={profile?.profileHistory.stats[user.pubkey]?.followers_count || search?.scores[user.pubkey]}
                  statLabel={intl.formatMessage(tSearch.followers)}
                  // @ts-ignore
                  onClick={() => {
                    if (!searchInput) return;
                    pop?.hide()
                    let v = searchInput.value;
                    const filter = suggestedTerm().split(':')[0] || '';

                    // const nprofile = nip19.nprofileEncode({ pubkey: user.pubkey });

                    searchInput.value = v.replace(suggestedTerm(), `${filter}:${user.npub} `);
                    searchInput.focus();
                    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                  }}
                  highlighted={highlightedUser() === index()}
                />
              )}
            </For>
          </div>);
        pop = tippy(document.getElementById('search_users'), {
          content: component,
          // showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start',
          appendTo: 'parent',
          sticky: 'reference',
          onShow(instance) {
            document.addEventListener('keydown', onKeyDown);
          },
          onHide(instance) {
            document.removeEventListener('keydown', onKeyDown);
          },
        });
      }, 10)
    }
    else {
      pop?.destroy();
    }
  })


  const filterUsers = (term: string, input: HTMLInputElement) => {
    const q = term.split(':')[1] || '';
    search?.actions.findUsers(q);
    setSuggestedTerm(() => term);
  }

  const onInput = (value: string) => {
    // debounce(() => {
      if (!search) return;

      // @ts-ignore
      // const value = e.target?.value;

      if (value.startsWith('npub') || value.startsWith('nprofile')) {
        search.actions.findUserByNupub(value);
        return;
      }

      setQuery(DOMPurify.sanitize(value) || '');
    // }, 500);
  };

  const resetQuery = () => {
    setQuery('');

    if (searchInput) {
      searchInput.value = '';
    }
  };

  const selectUser = (user: PrimalUser) => {
    props.onAddUser(user, userRelays[user.pubkey]);
    resetQuery();
  }

  const selectNote = (note: PrimalNote) => {
    props.onAddNote && props.onAddNote(note);
    resetQuery();
  }

  const selectRead = (note: PrimalArticle) => {
    props.onAddRead && props.onAddRead(note);
    resetQuery();
  }

  return (
    <AdvancedSearchDialog
      triggerClass="hidden"
      open={props.open}
      setOpen={props.setOpen}
      title="Add mention"
    >
      <div class={styles.readsMentionDialog}>
        <Tabs value={activeTab()} onChange={setActiveTab}>
          <Tabs.List class={styles.tabs}>
            <Tabs.Trigger class={styles.tab} value="users">
              People
            </Tabs.Trigger>
            <Tabs.Trigger class={styles.tab} value="notes">
              Notes
            </Tabs.Trigger>
            <Tabs.Trigger class={styles.tab} value="reads">
              Reads
            </Tabs.Trigger>
            <Tabs.Indicator class={styles.tabIndicator} />
          </Tabs.List>

          <div>
            <Search
              options={[]}
              onInputChange={onInput}
              debounceOptionsMillisecond={300}
              placeholder={placeholders[activeTab()] || ''}
            >
              <Search.Control class={styles.textInput}>
                <Search.Indicator
                  class={styles.searchIndicator}
                  // loadingComponent={
                  //   <Search.Icon>
                  //     <div class={styles.searchLoader}></div>
                  //   </Search.Icon>
                  // }
                >
                  <Search.Icon>
                    <div class={styles.searchIcon}></div>
                  </Search.Icon>
                </Search.Indicator>
                <Search.Input
                  id="search_users"
                  ref={searchInput}
                />
              </Search.Control>
            </Search>

            {/* <input
              id="search_users"
              placeholder={placeholders[activeTab()] || ''}
              class={styles.textInput}
              onInput={onInput}
              ref={searchInput}
              autocomplete="off"
            /> */}
          </div>

          <div class={styles.searchResults}>
            <Tabs.Content value="users">
              <div>
                <For each={search?.users}>
                  {(user) => (
                    <SearchOption
                      title={userName(user)}
                      description={nip05Verification(user)}
                      icon={<Avatar user={user} size="vvs" />}
                      statNumber={profile?.profileHistory.stats[user.pubkey]?.followers_count || search?.scores[user.pubkey]}
                      statLabel={intl.formatMessage(tSearch.followers)}
                      onClick={() => selectUser(user)}
                    />
                  )}
                </For>
              </div>
            </Tabs.Content>

            <Tabs.Content value="notes">
              <div class={styles.noteList}>
                <Show
                  when={!advsearch?.isFetchingContent}
                  fallback={
                    <For each={Array.from({ length: 10 }, (_, i) => i)}>
                      {() => (<NoteSuggestionSkeleton />)}
                    </For>
                  }
                >
                  <For each={advsearch?.notes.slice(0, 10)} >
                    {note => (
                      <Note
                        note={note}
                        shorten={true}
                        onClick={() => selectNote(note)}
                        noteType="suggestion"
                        onRemove={(id: string) => {
                          advsearch?.actions.removeEvent(id, 'notes');
                        }}
                      />
                    )}
                  </For>
                </Show>
              </div>
            </Tabs.Content>

            <Tabs.Content value="reads">
              <div class={styles.noteList}>
                <Show
                  when={!advsearch?.isFetchingContent}
                  fallback={
                    <For each={Array.from({ length: 10 }, (_, i) => i)}>
                      {() => (<ArticlePreviewSuggestionSkeleton />)}
                    </For>
                  }
                >
                  <For each={advsearch?.reads.slice(0, 10)} >
                    {read => (
                      <ArticlePreviewSuggestion
                        article={read}
                        onClick={() => {
                          selectRead(read)
                        }}
                        noLinks="links"
                        hideFooter={true}
                        hideContext={true}
                      />
                    )}
                  </For>
                </Show>
              </div>
            </Tabs.Content>
          </div>
        </Tabs>
      </div>
    </AdvancedSearchDialog>
  );
}

export default hookForDev(ReadsMentionDialog);
