import { useIntl } from '@cookbook/solid-intl';
import { Tabs } from '@kobalte/core/tabs';
import { A } from '@solidjs/router';
import { Component, createEffect, createSignal, For, Match, on, Show, Switch } from 'solid-js';
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
import { FeedPage, NostrMentionContent, NostrNoteActionsContent, NostrNoteContent, NostrStatsContent, NostrUserContent, NoteActions, PrimalNote, PrimalUser } from '../../types/primal';
import { debounce, parseBolt11 } from '../../utils';
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


const ReadsMentionDialog: Component<{
  id?: string,
  open: boolean,
  setOpen?: (v: boolean) => void,
  onSubmit: (user: PrimalUser, relays: string[]) => void,
}> = (props) => {

  const intl = useIntl();
  const account = useAccountContext();
  const app = useAppContext();
  const search = useSearchContext();
  const profile = useProfileContext();

  const [query, setQuery] = createSignal('');

  let searchInput: HTMLInputElement | undefined;

  let userRelays: Record<string, string[]> = {};

  createEffect(() => {
    if (query().length === 0) {
      search?.actions.getRecomendedUsers(profile?.profileHistory.profiles || []);
      return;
    }

    search?.actions.findUsers(query());
  });

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

  const onInput = (e: InputEvent) => {
    debounce(() => {
      if (!search) return;

      // @ts-ignore
      const value = e.target?.value;

      if (value.startsWith('npub') || value.startsWith('nprofile')) {
        search.actions.findUserByNupub(value);
        return;
      }

      setQuery(DOMPurify.sanitize(value) || '');
    }, 500);
  };

  const resetQuery = () => {
    setQuery('');

    if (searchInput) {
      searchInput.value = '';
    }
  };

  const selectUser = (user: PrimalUser) => {
    props.onSubmit(user, userRelays[user.pubkey]);
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
      <input
        id="search_users"
        placeholder="link url"
        class={styles.textInput}
        onInput={onInput}
        ref={searchInput}
      />

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

      <ButtonPrimary
        onClick={() => {
        }}
      >
        Add Mention
      </ButtonPrimary>
    </div>
    </AdvancedSearchDialog>
  );
}

export default hookForDev(ReadsMentionDialog);
