import { useParams } from '@solidjs/router';
import { decode, noteEncode } from 'nostr-tools/nip19';
import { Component, createEffect, createSignal, For, onCleanup, onMount, Show } from 'solid-js';
import { createStore } from 'solid-js/store';
import { Portal } from 'solid-js/web';
import Avatar from '../components/Avatar/Avatar';
import Branding from '../components/Branding/Branding';
import Post from '../components/Post/Post';
import { APP_ID, useFeedContext } from '../contexts/FeedContext';
import { shortDate } from '../lib/dates';
import { convertToPosts, getUserFeed, sortByRecency } from '../lib/feed';
import { hexToNpub } from '../lib/keys';
import { getUserProfileInfo } from '../lib/profile';
import { humanizeNumber } from '../lib/stats';
import { isConnected, socket } from '../sockets';
import { removeFromAvailableFeeds, updateAvailableFeeds } from '../stores/home';
import { ProfileStoreData, truncateNpub } from '../stores/profile';
import { NostrEvent, NostrEOSE, NostrEventContent, PrimalNote } from '../types/primal';
import styles from './Profile.module.scss';
import defaultAvatar from '../assets/icons/default_nostrich.svg';
import Paginator from '../components/Paginator/Paginator';
import { useToastContext } from '../components/Toaster/Toaster';

const pageId = `user_profile_page_${APP_ID}`;

const initialStore: ProfileStoreData = {
  publicKey: undefined,
  activeUser: undefined,
  userStats: {
    follows_count: 0,
    followers_count: 0,
    note_count: 0,
  },
};

const emptyPage: FeedPage = {
  users: {},
  messages: [],
  postStats: {},
}

const Profile: Component = () => {

  const context = useFeedContext();

  const toaster = useToastContext();

  const params = useParams();

  const [mounted, setMounted] = createSignal(false);

  const [profile, setProfile] = createStore<ProfileStoreData>({ ...initialStore });

  const [userNotes, setUserNotes] = createStore<PrimalNote[]>([]);

  const [page, setPage] = createStore({ ...emptyPage });

  const [oldestPost, setOldestPost] = createSignal<PrimalNote | undefined>();

  const proccessUserProfile = (content: NostrEventContent) => {
    if (content.kind === 0) {
      let user = JSON.parse(content.content);

      user.pubkey = content.pubkey;
      user.npub =hexToNpub(content.pubkey);
      user.created_at = content.created_at;

      setProfile('activeUser', () => ({ ...user }));
      return;
    }

    if (content.kind === 10000105) {
      const stats = JSON.parse(content.content);

      setProfile('userStats', () => ({ ...stats }));
      return;
    }

  }

  const loadNextPage = () => {
    const lastPost = userNotes[userNotes.length - 1];

    setOldestPost(() => ({ ...lastPost }));
  };

  createEffect(() => {
    const until = oldestPost()?.post?.created_at || 0;

    if (until > 0) {
      const pubkey = profile.publicKey;

      if (pubkey) {

        setPage({ messages: [], users: {}, postStats: {} });

        getUserFeed(pubkey, `${pageId}_feed`, until);
      }
    }
  });

  const processUserNotes = (type: string, content: NostrEventContent | undefined) => {
    if (type === 'EOSE') {
      const newPosts = sortByRecency(convertToPosts(page));

      setUserNotes((notes) => [...notes, ...newPosts]);

      return;
    }

    if (type === 'EVENT') {
      if (content && content.kind === 0) {
        setPage('users', (users) => ({ ...users, [content.pubkey]: content}));
      }
      if (content && (content.kind === 1 || content.kind === 6)) {

        if (oldestPost()?.post?.noteId === noteEncode(content.id)) {
          return;
        }

        setPage('messages', (msgs) =>[ ...msgs, content]);
      }
      if (content && content.kind === 10000100) {
        const stat = JSON.parse(content.content);
        setPage('postStats', (stats) => ({ ...stats, [stat.event_id]: stat }));
      }
    }
  };

  const onMessage = (event: MessageEvent) => {
    const message: NostrEvent | NostrEOSE = JSON.parse(event.data);

    const [type, subId, content] = message;


    if (subId === `${pageId}_feed`) {
      processUserNotes(type, content);
      return;
    }

    if (subId === pageId) {
      content && proccessUserProfile(content);
      return;
    }


  };

  const getProfileData = (publicKey: string) => {
    getUserProfileInfo(`${publicKey}`, pageId);

    setPage(() => ({ ...emptyPage }));

    setOldestPost(() => undefined);

    setUserNotes(() => []);

    getUserFeed(publicKey, `${pageId}_feed`);
  }

  createEffect(() => {
    if (isConnected()) {
      socket()?.removeEventListener('message', onMessage);
      socket()?.addEventListener('message', onMessage);

      if (!params.npub) {
        setProfile(() => ({
          publicKey: context?.data.publicKey,
          activeUser: {...context?.data.activeUser},
        }));

        getProfileData(context?.data.publicKey);
        return;
      }

      const hex = params.npub.startsWith('npub') ? decode(params.npub) : { data: params.npub};

      setProfile('publicKey', hex.data);

      getProfileData(hex.data);
    }
  });

  onMount(() => {
    setTimeout(() => {
      setMounted(true);
    }, 0);
  });

  onCleanup(() => {
    socket()?.removeEventListener('message', onMessage);
  });

  const addToHome = () => {
    const feed = {
      name: `${profile.activeUser?.name}'s feed`,
      hex: profile.publicKey,
      npub: hexToNpub(profile.publicKey),
    };

    context?.actions?.setData('availableFeeds', (feeds) => updateAvailableFeeds(context?.data.publicKey, feed, feeds));
    toaster?.sendSuccess(`${profile.activeUser?.name}'s feed added to home page`);
  };

  const removeFromHome = () => {
    const feed = {
      name: `${profile.activeUser?.name}'s feed`,
      hex: profile.publicKey,
      npub: hexToNpub(profile.publicKey),
    };

    context?.actions?.setData('availableFeeds', (feeds) => removeFromAvailableFeeds(context?.data.publicKey, feed, feeds))
    toaster?.sendSuccess(`${profile.activeUser?.name}'s feed removed from home page`);
  };

  const hasFeedAtHome = () => {

    return !!context?.data.availableFeeds.find(f => f.hex === profile.publicKey);
  };

  const copyNpub = () => {
    navigator.clipboard.writeText(profile.activeUser?.npub);
  }

  const imgError = (event: any) => {
    const image = event.target;
    image.onerror = "";
    image.src = defaultAvatar;
    return true;
  }

  const rectifyUrl = (url: string) => {
    if (!url.startsWith('http://') || !url.startsWith('https://')) {
      return `http://${url}`;
    }

    return url;
  }

  const onNotImplemented = () => {
    toaster?.notImplemented();
  }

  return (
    <>
      <Show when={mounted()}>
        <Portal
          mount={document.getElementById("branding_holder") as Node}
        >
          <Branding small={false} />
        </Portal>
      </Show>
      <div id="central_header" class={styles.fullHeader}>
        <div class={styles.banner}>
          <img src={profile.activeUser?.banner || ''} onerror={imgError}/>
        </div>

        <div class={styles.userImage}>
          <div class={styles.avatar}>
            <Avatar src={profile.activeUser?.picture} size="xxl" />
          </div>
        </div>

        <div class={styles.profileActions}>
          <button
            class={styles.smallSecondaryButton}
            onClick={onNotImplemented}
          >
            <div class={styles.zapIcon}></div>
          </button>
          <button
            class={styles.smallSecondaryButton}
            onClick={onNotImplemented}
          >
            <div class={styles.messageIcon}></div>
          </button>
          <Show
            when={!hasFeedAtHome()}
            fallback={
              <button
                class={styles.smallSecondaryButton}
                onClick={removeFromHome}
                title={`remove ${profile.activeUser?.name}'s feed from your home page`}
              >
                <div class={styles.removeFeedIcon}></div>
              </button>
            }
          >
            <button
              class={styles.smallPrimaryButton}
              onClick={addToHome}
              title={`add ${profile.activeUser?.name}'s feed to home page`}
            >
              <div class={styles.addFeedIcon}></div>
            </button>
          </Show>
          <button
            class={styles.primaryButton}
            onClick={onNotImplemented}
          >
            follow
          </button>
        </div>

        <div class={styles.profileVerification}>
          <div class={styles.avatarName}>
            {profile.activeUser?.name}
            <div class={styles.verifiedIconL}></div>
          </div>
          <div class={styles.verificationInfo}>
            <div class={styles.verifiedIconS}></div>
            <div>{profile.activeUser?.nip05}</div>
            <div class={styles.publicKey}>
              <div class={styles.keyIcon}></div>
              <button
                class={styles.npub}
                title={profile.activeUser?.npub}
                onClick={copyNpub}
              >
                {truncateNpub(profile.activeUser?.npub)}
                <div class={styles.copyIcon}></div>
              </button>
            </div>
          </div>
        </div>

        <div class={styles.profileAbout}>
          {profile.activeUser?.about}
        </div>

        <div class={styles.profileLinks}>
          <div class={styles.website}>
            <Show when={profile.activeUser?.website}>
              <div class={styles.linkIcon}></div>
              <a href={rectifyUrl(profile.activeUser?.website)} target="_blank">
                {profile.activeUser?.website}
              </a>
            </Show>
          </div>
          {/* <div class={styles.joined}>
            <Show when={profile.activeUser?.created_at}>
              Joined Nostr on {shortDate(profile.activeUser?.created_at)}
            </Show>
          </div> */}
        </div>

        <div class={styles.userStats}>
          <div class={styles.userStat}>
            <div class={styles.statNumber}>
              {humanizeNumber(profile.userStats?.follows_count)}
            </div>
            <div class={styles.statName}>following</div>
          </div>
          <div class={styles.userStat}>
            <div class={styles.statNumber}>
              {humanizeNumber(profile.userStats?.followers_count)}
            </div>
            <div class={styles.statName}>followers</div>
          </div>
          <div class={styles.userStat}>
            <div class={styles.statNumber}>
              {humanizeNumber(profile.userStats?.note_count)}
            </div>
            <div class={styles.statName}>notes</div>
          </div>

        </div>

      </div>

      <div class={styles.userFeed}>
        <For each={userNotes}>
          {note => (
            <Post post={note} />
          )}
        </For>
        <Paginator loadNextPage={loadNextPage}/>
      </div>
    </>
  )
}

export default Profile;
