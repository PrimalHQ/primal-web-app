import { Component, createEffect, createSignal, For, on, onCleanup, onMount, Show } from 'solid-js';
import styles from './Settings.module.scss';

import { useIntl } from '@cookbook/solid-intl';
import { settings as t, actions as tActions } from '../../translations';
import PageCaption from '../../components/PageCaption/PageCaption';
import { A, useLocation, useNavigate } from '@solidjs/router';
import { useAccountContext } from '../../contexts/AccountContext';
import { getProfileMuteList, getUserProfiles } from '../../lib/profile';
import { APP_ID } from '../../App';
import { subsTo } from '../../sockets';
import { convertToUser, nip05Verification, userName } from '../../stores/profile';
import { Kind } from '../../constants';
import { createStore, unwrap } from 'solid-js/store';
import { MegaFeedPage, PrimalNote, PrimalUser } from '../../types/primal';
import Avatar from '../../components/Avatar/Avatar';
import { hexToNpub } from '../../lib/keys';
import PageTitle from '../../components/PageTitle/PageTitle';
import ButtonSecondary from '../../components/Buttons/ButtonSecondary';
import { useAppContext } from '../../contexts/AppContext';
import { Tabs } from '@kobalte/core/tabs';
import { emptyMegaFeedPage, emptyPaging, fetchMegaFeed, filterAndSortNotes, PaginationInfo, updateFeedPage } from '../../megaFeeds';
import { convertToNotesMega, convertToUsersMega } from '../../stores/megaFeed';
import Note from '../../components/Note/Note';
import { calculateNotesOffset } from '../../utils';
import Paginator from '../../components/Paginator/Paginator';
import TextInput from '../../components/TextInput/TextInput';
import ButtonPrimary from '../../components/Buttons/ButtonPrimary';

const MUTED_THREADS_SPEC = JSON.stringify({
  id: 'muted-threads',
  kind: 'notes',
});


const Muted: Component = () => {

  const intl = useIntl();
  const account = useAccountContext();
  const app = useAppContext();
  const location = useLocation();
  const navigate = useNavigate();

  let hashtagInput: HTMLInputElement | undefined;
  let wordInput: HTMLInputElement | undefined;

  const [mutedUsers, setMutedUsers] = createStore<PrimalUser[]>([]);
  const [mutedWords, setMutedWords] = createStore<string[]>([]);
  const [mutedHashtags, setMutedHashtags] = createStore<string[]>([]);
  const [mutedThreads, setMutedThreads] = createStore<PrimalNote[]>([]);

  const [threadPaging, setThreadPaging] = createSignal<PaginationInfo>({...emptyPaging()})

  const mutedMetadataSubId = `mutelist_${APP_ID}`;

  const [isFetching, setIsFetching] = createSignal(true);

  onCleanup(() => {
    setMutedUsers(() => []);
    setMutedThreads(() => []);
    setMutedWords(() => []);
    setMutedHashtags(() => []);
  });

  onMount(() => {
    let pubkeys: string[] = [];
    let words: string[] = [];
    let hashtags: string[] = [];
    let eventIds: string[] = [];

    let page: MegaFeedPage = {...emptyMegaFeedPage()};

    const unsub = subsTo(mutedMetadataSubId, {
      onEvent: (_, content) => {
        if (content.kind === Kind.MuteList) {
          pubkeys = content.tags.reduce<string[]>((acc, t) => t[0] === 'p' ? [...acc, t[1]] : acc, []);
          words = content.tags.reduce<string[]>((acc, t) => t[0] === 'word' ? [...acc, t[1]] : acc, []);
          hashtags = content.tags.reduce<string[]>((acc, t) => t[0] === 't' ? [...acc, t[1]] : acc, []);
          eventIds = content.tags.reduce<string[]>((acc, t) => t[0] === 'e' ? [...acc, t[1]] : acc, []);
          return;
        }

        updateFeedPage(page, content);

        // if (content?.kind === Kind.Metadata) {
        //   users[content.pubkey] = convertToUser(content, content.pubkey);
        // }
      },
      onEose: () => {
        unsub();
        const users = convertToUsersMega(page);
        // const notes = convertToNotesMega(page);

        setMutedUsers(() =>  [...users]);
        // setMutedThreads(() => [...notes]);
        setMutedWords(() => [...words]);
        setMutedHashtags(() => [...hashtags]);

        fetchMutedThreads();
      },
    });

    getProfileMuteList(account?.publicKey, mutedMetadataSubId);
  });

  const fetchMutedThreads = async (until = 0) => {
    const offset = calculateNotesOffset(mutedThreads, threadPaging());

    const { notes, paging } = await fetchMegaFeed(
      account?.publicKey,
      MUTED_THREADS_SPEC,
      `muted_threads_${APP_ID}`,
      {
        until,
        limit: 20,
        offset,
      },
    );

    const sortedNotes = filterAndSortNotes(notes, paging);

    setThreadPaging(() => ({ ...paging }));
    setMutedThreads((ns) => [...ns, ...sortedNotes]);

    setIsFetching(false);
  };

  const fetchMutedThreadsNextPage = () => {
    if (isFetching()) {
      return;
    }

    const until = threadPaging().since || 0;

    if (until > 0) {
      fetchMutedThreads(until);
    }
  };

  const unMuteUser = (user: PrimalUser) => {
    account?.actions.removeFromMuteList(user.pubkey, 'user', (success) => {
      if (!success) return;

      setMutedUsers((users) => users.filter(u => u.pubkey !== user.pubkey));
    });
  };

  const unMuteWord = (word: string) => {
    account?.actions.removeFromMuteList(word, 'word', (success) => {
      if (!success) return;

      setMutedWords((words) => words.filter(w => w !== word));
    });
  };

  const unMuteHashtags = (hashtag: string) => {
    account?.actions.removeFromMuteList(hashtag, 'hashtag', (success) => {
      if (!success) return;

      setMutedHashtags((hashtags) => hashtags.filter(h => h !== hashtag));
    });
  };

  const unMuteThread = (id: string) => {
    account?.actions.removeFromMuteList(id, 'thread', (success) => {
      if (!success) return;
      setMutedThreads((threads) => threads.filter(n => n.id !== id));
    });
  };

  const hash = () => {
    return (location.hash.length > 1) ? location.hash.substring(1) : 'users';
  }

  const [currentTab, setCurrentTab] = createSignal<string>(hash());

  const onChangeTab = (value: string) => {
    setCurrentTab(() => value);

    window.location.hash = value;

    window.scrollTo({ top: 0 });
  };

  return (
    <div>
      <PageTitle title={`${intl.formatMessage(t.muted.title)} ${intl.formatMessage(t.title)}`} />

      <PageCaption>
        <A href='/settings' >{intl.formatMessage(t.index.title)}</A>:&nbsp;
        <div>{intl.formatMessage(t.muted.title)}</div>
      </PageCaption>


      <Tabs value={hash()} onChange={onChangeTab} defaultValue={hash()}>
        <Tabs.List class={styles.settingsTabs}>
          <Tabs.Trigger class={styles.settingsTab} value="users">
            <div class={styles.label}>
              Users
            </div>
          </Tabs.Trigger>

          <Tabs.Trigger class={styles.settingsTab} value="words">
            <div class={styles.label}>
              Words
            </div>
          </Tabs.Trigger>

          <Tabs.Trigger class={styles.settingsTab} value="hashtags">
            <div class={styles.label}>
              Hashtags
            </div>
          </Tabs.Trigger>

          <Tabs.Trigger class={styles.settingsTab} value="threads">
            <div class={styles.label}>
              Threads
            </div>
          </Tabs.Trigger>


          <Tabs.Indicator class={styles.settingsTabIndicator} />
        </Tabs.List>

        <Tabs.Content class={styles.tabContent} value="users">
          <div>
            <For
              each={mutedUsers}
              fallback={
                <Show when={!isFetching()}>
                  <div class={styles.emptyListBanner}>
                    {intl.formatMessage(t.muted.emptyUsers)}
                  </div>
                </Show>
              }
            >
              {user => (
                <div class={styles.mutedUser}>
                  <Show
                    when={user}
                    fallback={
                      <>
                        <A class={styles.userInfo} href={app?.actions.profileLink(user.pubkey) || ''}>
                          <div class={styles.userName}>
                            <div class={styles.verification}>{hexToNpub(user.pubkey)}</div>
                          </div>
                        </A>
                        <button onClick={() => unMuteUser(user)}>
                          {intl.formatMessage(tActions.unmute)}
                        </button>
                      </>
                    }
                  >
                    <A class={styles.userInfo} href={app?.actions.profileLink(user.pubkey) || ''}>
                      <Avatar user={user} size='vvs' />
                      <div class={styles.userName}>
                        <div class={styles.title}>{userName(user)}</div>
                        <div class={styles.verification}>{nip05Verification(user)}</div>
                      </div>
                    </A>
                    <ButtonSecondary onClick={() => unMuteUser(user)}>
                      {intl.formatMessage(tActions.unmute)}
                    </ButtonSecondary>
                  </Show>
                </div>
              )}
            </For>
          </div>
        </Tabs.Content>

        <Tabs.Content class={styles.tabContent} value="words">
          <div>
            <For
              each={mutedWords}
              fallback={
                <Show when={!isFetching()}>
                  <div class={styles.emptyListBanner}>
                    {intl.formatMessage(t.muted.emptyWords)}
                  </div>
                </Show>
              }
            >
              {word => (
                <div class={styles.mutedUser}>
                  <div class={styles.userInfo}>
                    <div class={styles.userName}>
                      <div class={styles.title}>{word}</div>
                    </div>
                  </div>
                  <ButtonSecondary onClick={() => unMuteWord(word)}>
                    {intl.formatMessage(tActions.unmute)}
                  </ButtonSecondary>
                </div>
              )}
            </For>

            <form
              class={styles.wordInput}
              onSubmit={(e) => {
                e.preventDefault();
                const word = wordInput?.value.trim();
                if (!word || word.length === 0) return;

                account?.actions.addToMuteList(word, 'word', (success) => {
                  if (!success) return;
                  setMutedWords((hashtags) => [word, ...hashtags]);
                  if (wordInput) wordInput.value = '';
                });
              }}
            >
              <TextInput
                placeholder="# Mute new word..."
                ref={wordInput}
                noExtraSpace={true}
                type="text"
              />
              <ButtonPrimary type="submit">
                mute
              </ButtonPrimary>
            </form>
          </div>
        </Tabs.Content>

        <Tabs.Content class={styles.tabContent} value="hashtags">
          <div>
            <For
              each={mutedHashtags}
              fallback={
                <Show when={!isFetching()}>
                  <div class={styles.emptyListBanner}>
                    {intl.formatMessage(t.muted.emptyHashtags)}
                  </div>
                </Show>
              }
            >
              {hashtag => (
                <div class={styles.mutedUser}>
                  <div class={styles.userInfo}>
                    <div class={styles.userName}>
                      <div class={styles.title}>{hashtag}</div>
                    </div>
                  </div>
                  <ButtonSecondary onClick={() => unMuteHashtags(hashtag)}>
                    {intl.formatMessage(tActions.unmute)}
                  </ButtonSecondary>
                </div>
              )}
            </For>

            <form
              class={styles.wordInput}
              onSubmit={(e) => {
                e.preventDefault();
                const hashtag = hashtagInput?.value.trim();
                if (!hashtag || hashtag.length === 0) return;

                account?.actions.addToMuteList(hashtag, 'hashtag', (success) => {
                  if (!success) return;
                  setMutedHashtags((hashtags) => [hashtag, ...hashtags]);
                  if (hashtagInput) hashtagInput.value = '';
                });
              }}
            >
              <TextInput
                placeholder="# Mute new hashtag..."
                ref={hashtagInput}
                noExtraSpace={true}
                type="text"
              />
              <ButtonPrimary type="submit" >
                mute
              </ButtonPrimary>
            </form>
          </div>
        </Tabs.Content>

        <Tabs.Content class={styles.tabContent} value="threads">
          <div>
            <For
              each={mutedThreads}
              fallback={
                <Show when={!isFetching()}>
                  <div class={styles.emptyListBanner}>
                    {intl.formatMessage(t.muted.emptyThreads)}
                  </div>
                </Show>
              }
            >
              {note => (
                <Note note={note} noteType="feed" shorten={true} />
              )}
            </For>
            <Paginator
            loadNextPage={fetchMutedThreadsNextPage}
            />
          </div>
        </Tabs.Content>

      </Tabs>

    </div>
  )
}

export default Muted;
