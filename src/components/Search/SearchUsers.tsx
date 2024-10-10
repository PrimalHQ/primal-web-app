import { useIntl } from '@cookbook/solid-intl';
import { useNavigate } from '@solidjs/router';
import { Component, createEffect, createSignal, For, Show } from 'solid-js';
import { useSearchContext } from '../../contexts/SearchContext';
import { nip05Verification, userName } from '../../stores/profile';
import { PrimalUser } from '../../types/primal';
import { debounce } from '../../utils';
import Avatar from '../Avatar/Avatar';
import Loader from '../Loader/Loader';
import { useToastContext } from '../Toaster/Toaster';
import { placeholders, search as t } from '../../translations';

import styles from './Search.module.scss';
import SearchOption from './SearchOption';
import { hookForDev } from '../../lib/devTools';
import { useProfileContext } from '../../contexts/ProfileContext';
import { useAppContext } from '../../contexts/AppContext';


const SearchUsers: Component<{
  onInputConfirm?: (query: string) => void,
  onUserSelect?: (selected: PrimalUser | string) => void,
  noLinks?: boolean,
  hideDefault?: boolean,
  placeholder?: string,
  id?: string,
}> = (props) => {

  const toaster = useToastContext();
  const search = useSearchContext();
  const navigate = useNavigate();
  const intl = useIntl();
  const profile = useProfileContext();
  const app = useAppContext();

  const [query, setQuery] = createSignal('');
  const [isFocused, setIsFocused] = createSignal(false);

  const queryUrl = () => query().replaceAll('#', '%23');

  let input: HTMLInputElement | undefined;

  const onSearch = (e: SubmitEvent) => {
    e.preventDefault();
    return false;

    // const form = e.target as HTMLFormElement;

    // const data = new FormData(form);

    // const q = data.get('searchQuery') as string || '';

    // if (q.length > 0) {
    //   if (props.onInputConfirm) {
    //     props.onInputConfirm(q);
    //   }
    //   else {
    //     navigate(`/search/${q.replaceAll('#', '%23')}`);
    //   }
    //   onBlur();
    //   resetQuery();
    // }
    // else {
    //   toaster?.sendInfo(intl.formatMessage(t.invalid))
    // }
    // return false;
  }

  const onInput = (e: InputEvent) => {
    setIsFocused(true);
    debounce(() => {
      // @ts-ignore
      const value = e.target?.value;

      if (value.startsWith('npub') || value.startsWith('nprofile')) {
        search?.actions.findUserByNupub(value);
        return;
      }

      setQuery(value || '');
    }, 500);
  };

  const onFocus = (e: FocusEvent) => {
    setIsFocused(true);
  }

  const onBlur = (e?: FocusEvent) => {
    setTimeout(() => {
      setIsFocused(false);
    }, 200);
  }

  const resetQuery = () => {
    setQuery('');

    if (input) {
      input.value = '';
    }
  };

  const selectUser = (user: PrimalUser) => {
    if (props.onUserSelect) {
      props.onUserSelect(user);
    }
    resetQuery();
  }

  createEffect(() => {
    if (query().length === 0) {
      search?.actions.getRecomendedUsers(profile?.profileHistory.profiles || []);
      return;
    }

    search?.actions.findUsers(query());
  });

  return (
    <div id={props.id} class={`${styles.searchHolder} ${isFocused() ? styles.focused : ''} ${styles.userSearch}`}>
      <form
        class={styles.search}
        onsubmit={onSearch}
        autocomplete="off"
      >
        <div class={styles.searchIcon}></div>
        <input
          type='text'
          name='searchQuery'
          ref={input}
          placeholder={
            props.placeholder ??
            intl.formatMessage(placeholders.search)
          }
          value={query()}
          onInput={onInput}
          onFocus={onFocus}
          onBlur={onBlur}
          onClick={onFocus}
        />
      </form>

      <div class={`${styles.searchSuggestions} ${!isFocused() ? styles.hidden : ''} ${styles.floating}`}>
        <Show when={search?.isFetchingUsers && query().length > 0}>
          <div class={styles.loadingOverlay}>
            <div>
              <Loader />
            </div>
          </div>
        </Show>

        <For each={search?.users}>
          {(user) => (
            <SearchOption
              href={props.noLinks ? undefined : app?.actions.profileLink(user.npub) || ''}
              title={userName(user)}
              description={nip05Verification(user)}
              icon={<Avatar user={user} size="vvs" />}
              statNumber={profile?.profileHistory.stats[user.pubkey]?.followers_count || search?.scores[user.pubkey]}
              statLabel={intl.formatMessage(t.followers)}
              onClick={() => selectUser(user)}
            />
          )}
        </For>
      </div>
    </div>
  )
}

export default hookForDev(SearchUsers);
