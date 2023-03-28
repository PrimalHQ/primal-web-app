import { useParams } from '@solidjs/router';
import { decode } from 'nostr-tools/nip19';
import {
  Component,
  createEffect,
  createMemo,
  createReaction,
  For,
  onMount,
  Show
} from 'solid-js';
import Avatar from '../components/Avatar/Avatar';
import Branding from '../components/Branding/Branding';
import Note from '../components/Note/Note';
import { hexToNpub } from '../lib/keys';
import { humanizeNumber } from '../lib/stats';
import { truncateNpub } from '../stores/profile';
import styles from './Profile.module.scss';
import defaultAvatar from '../assets/icons/default_nostrich.svg';
import Paginator from '../components/Paginator/Paginator';
import { useToastContext } from '../components/Toaster/Toaster';
import { useSettingsContext } from '../contexts/SettingsContext';
import { useProfileContext } from '../contexts/ProfileContext';
import { useAccountContext } from '../contexts/AccountContext';
import Wormhole from '../components/Wormhole/Wormhole';
import { isConnected } from '../sockets';


const Profile: Component = () => {

  const settings = useSettingsContext();
  const toaster = useToastContext();
  const profileContext = useProfileContext();
  const account = useAccountContext();

  const params = useParams();

  const getHex = () => {
    let hex = params.npub || account?.publicKey;

    if (params.npub?.startsWith('npub')) {
      hex = decode(params.npub).data as string;
    }

    return hex;
  }

  const setProfile = (hex: string | undefined) => {
    profileContext?.actions.setProfileKey(hex);

    profileContext?.actions.clearNotes();
    profileContext?.actions.fetchNotes(hex);
  }

  const react = createReaction(() => {
    setProfile(getHex());
  });

  onMount(() => {
    // If connection doesn't exist at mount time,
    // create a one-time reaction, when connection is established
    // to fetch profile data.
    if (!isConnected()) {
      react(() => isConnected());
      return;
    }

    // Otherwise, fetch profile data.
    setProfile(getHex());
  });

  createEffect(() => {
    if (account?.publicKey) {
      setProfile(getHex());
    }
  });

  const profileNpub = createMemo(() => {
    return hexToNpub(profileContext?.profileKey);
  });

  const profileName = () => {
    return profileContext?.userProfile?.name || truncateNpub(profileNpub());
  }

  const addToHome = () => {
    const feed = {
      name: `${profileName()}'s feed`,
      hex: profileContext?.profileKey,
      npub: profileNpub(),
    };

    settings?.actions.addAvailableFeed(feed);
    toaster?.sendSuccess(`${profileName()}'s feed added to home page`);
  };

  const removeFromHome = () => {
    const feed = {
      name: `${profileName()}'s feed`,
      hex: profileContext?.profileKey,
      npub: profileNpub(),
    };

    settings?.actions.removeAvailableFeed(feed);
    toaster?.sendSuccess(`${profileName()}'s feed removed from home page`);
  };

  const hasFeedAtHome = () => {
    return !!settings?.availableFeeds.find(f => f.hex === profileContext?.profileKey);
  };

  const copyNpub = () => {
    navigator.clipboard.writeText(profileContext?.userProfile?.npub || profileNpub());
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
      <Wormhole to='branding_holder'>
        <Branding small={false} />
      </Wormhole>

      <div id="central_header" class={styles.fullHeader}>
        <div class={styles.banner}>
          <img src={profileContext?.userProfile?.banner || ''} onerror={imgError}/>
        </div>

        <div class={styles.userImage}>
          <div class={styles.avatar}>
            <Avatar src={profileContext?.userProfile?.picture} size="xxl" />
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
                title={`remove ${profileName()}'s feed from your home page`}
                disabled={profileContext?.profileKey === account?.publicKey}
              >
                <div class={styles.removeFeedIcon}></div>
              </button>
            }
          >
            <button
              class={styles.smallPrimaryButton}
              onClick={addToHome}
              title={`add ${profileName()}'s feed to home page`}
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
            {profileName()}
            <Show when={profileContext?.userProfile?.nip05}>
              <div class={styles.verifiedIconL}></div>
            </Show>
          </div>
          <div class={styles.verificationInfo}>
            <Show when={profileContext?.userProfile?.nip05}>
              <div class={styles.verifiedIconS}></div>
              <div class={styles.nip05}>{profileContext?.userProfile?.nip05}</div>
            </Show>
            <div class={styles.publicKey}>
              <div class={styles.keyIcon}></div>
              <button
                class={styles.npub}
                title={profileContext?.userProfile?.npub || profileNpub()}
                onClick={copyNpub}
              >
                {truncateNpub(profileContext?.userProfile?.npub || profileNpub())}
                <div class={styles.copyIcon}></div>
              </button>
            </div>
          </div>
        </div>

        <div class={styles.profileAbout}>
          {profileContext?.userProfile?.about}
        </div>

        <div class={styles.profileLinks}>
          <div class={styles.website}>
            <Show when={profileContext?.userProfile?.website}>
              <div class={styles.linkIcon}></div>
              <a href={rectifyUrl(profileContext?.userProfile?.website || '')} target="_blank">
                {profileContext?.userProfile?.website}
              </a>
            </Show>
          </div>
          {/* <div class={styles.joined}>
            <Show when={profileContext?.userProfile?.created_at}>
              Joined Nostr on {shortDate(profileContext?.userProfile?.created_at)}
            </Show>
          </div> */}
        </div>

        <div class={styles.userStats}>
          <div class={styles.userStat}>
            <div class={styles.statNumber}>
              {humanizeNumber(profileContext?.userStats?.follows_count || 0)}
            </div>
            <div class={styles.statName}>following</div>
          </div>
          <div class={styles.userStat}>
            <div class={styles.statNumber}>
              {humanizeNumber(profileContext?.userStats?.followers_count || 0)}
            </div>
            <div class={styles.statName}>followers</div>
          </div>
          <div class={styles.userStat}>
            <div class={styles.statNumber}>
              {humanizeNumber(profileContext?.userStats?.note_count || 0)}
            </div>
            <div class={styles.statName}>notes</div>
          </div>

        </div>

      </div>

      <div class={styles.userFeed}>
        <For each={profileContext?.notes}>
          {note => (
            <Note note={note} />
          )}
        </For>
        <Paginator loadNextPage={profileContext?.actions.fetchNextPage}/>
      </div>
    </>
  )
}

export default Profile;
