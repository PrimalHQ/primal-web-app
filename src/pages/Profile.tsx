import { useNavigate, useParams } from '@solidjs/router';
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
import defaultAvatar from '../assets/icons/default_nostrich.svg';
import Paginator from '../components/Paginator/Paginator';
import { useToastContext } from '../components/Toaster/Toaster';
import { useSettingsContext } from '../contexts/SettingsContext';
import { useProfileContext } from '../contexts/ProfileContext';
import { useAccountContext } from '../contexts/AccountContext';
import Wormhole from '../components/Wormhole/Wormhole';
import { isConnected } from '../sockets';
import { useIntl } from '@cookbook/solid-intl';
import { urlify, sanitize } from '../lib/notes';
import { shortDate } from '../lib/dates';

import styles from './Profile.module.scss';


const Profile: Component = () => {

  const settings = useSettingsContext();
  const toaster = useToastContext();
  const profile = useProfileContext();
  const account = useAccountContext();
  const intl = useIntl();
  const navigate = useNavigate();

  const params = useParams();


  const getHex = () => {
    if (params.vanityName) {
      const hex = profile?.knownProfiles.names[params.vanityName];

      if (hex) {
        return hex;
      }

      navigate('/404');
    }

    let hex = params.npub || account?.publicKey;

    if (params.npub?.startsWith('npub')) {
      hex = decode(params.npub).data as string;
    }

    return hex;
  }

  const setProfile = (hex: string | undefined) => {
    if (hex === profile?.profileKey) {
      return;
    }

    profile?.actions.setProfileKey(hex);

    profile?.actions.clearNotes();
    profile?.actions.fetchNotes(hex);
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
    return hexToNpub(profile?.profileKey);
  });

  const profileName = () => {
    return profile?.userProfile?.name || truncateNpub(profileNpub());
  }

  const addToHome = () => {
    const feed = {
      name: `${profileName()}'s feed`,
      hex: profile?.profileKey,
      npub: profileNpub(),
    };

    settings?.actions.addAvailableFeed(feed);
    toaster?.sendSuccess(`${profileName()}'s feed added to home page`);
  };

  const removeFromHome = () => {
    const feed = {
      name: `${profileName()}'s feed`,
      hex: profile?.profileKey,
      npub: profileNpub(),
    };

    settings?.actions.removeAvailableFeed(feed);
    toaster?.sendSuccess(`${profileName()}'s feed removed from home page`);
  };

  const hasFeedAtHome = () => {
    return !!settings?.availableFeeds.find(f => f.hex === profile?.profileKey);
  };

  const copyNpub = () => {
    navigator.clipboard.writeText(profile?.userProfile?.npub || profileNpub());
  }

  const imgError = (event: any) => {
    // Temprary solution until we decide what to to when banner is missing.

    // const image = event.target;
    // image.onerror = "";
    // image.src = defaultAvatar;
    console.log('ERROR')

    const banner = document.getElementById('profile_banner');

    if (banner) {
      banner.innerHTML = `<div class="${styles.bannerPlaceholder}"></div>`;
    }

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

  const isFollowingYou = () => {
    return account?.publicKey && profile?.following.includes(account.publicKey);
  }

  return (
    <>
      <Wormhole to='branding_holder'>
        <Branding small={false} />
      </Wormhole>

      <div id="central_header" class={styles.fullHeader}>
        <div id="profile_banner" class={styles.banner}>
          <Show
            when={profile?.userProfile?.banner}
            fallback={<div class={styles.bannerPlaceholder}></div>}
          >
            <img src={profile?.userProfile?.banner} onerror={imgError}/>
          </Show>
        </div>

        <div class={styles.userImage}>
          <div class={styles.avatar}>
            <Avatar src={profile?.userProfile?.picture} size="xxl" />
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
                title={intl.formatMessage(
                  {
                    id: 'actions.homeFeedRemove.named',
                    defaultMessage: 'remove {name} feed from your home page',
                    description: 'Remove named feed from home, button label',
                  },
                  { name: profileName() },
                )}
                disabled={profile?.profileKey === account?.publicKey}
              >
                <div class={styles.removeFeedIcon}></div>
              </button>
            }
          >
            <button
              class={styles.smallPrimaryButton}
              onClick={addToHome}
              title={intl.formatMessage(
                {
                  id: 'actions.homeFeedAdd.named',
                  defaultMessage: 'add {name} feed to home page',
                  description: 'Add named feed to home, button label',
                },
                { name: profileName() },
              )}
            >
              <div class={styles.addFeedIcon}></div>
            </button>
          </Show>

          <button
            class={styles.primaryButton}
            onClick={onNotImplemented}
          >
            {intl.formatMessage(
              {
                id: 'actions.follow',
                defaultMessage: 'follow',
                description: 'Follow button label',
              }
            )}
          </button>
        </div>

        <div class={styles.profileVerification}>
          <div class={styles.avatarName}>
            {profileName()}
            <Show when={profile?.userProfile?.nip05}>
              <div class={styles.verifiedIconL}></div>
            </Show>
            <Show when={isFollowingYou()}>
              <div class={styles.followsBadge}>
                {intl.formatMessage({
                  id: 'profile.followsYou',
                  defaultMessage: 'Follows you',
                  description: 'Label indicating that a profile is following your profile',
                })}
              </div>
            </Show>
          </div>
          <div class={styles.verificationInfo}>
            <Show when={profile?.userProfile?.nip05}>
              <div class={styles.verifiedIconS}></div>
              <div class={styles.nip05}>{profile?.userProfile?.nip05}</div>
            </Show>
            <div class={styles.publicKey}>
              <div class={styles.keyIcon}></div>
              <button
                class={styles.npub}
                title={profile?.userProfile?.npub || profileNpub()}
                onClick={copyNpub}
              >
                {truncateNpub(profile?.userProfile?.npub || profileNpub())}
                <div class={styles.copyIcon}></div>
              </button>
            </div>
          </div>
        </div>

        <div class={styles.profileAbout} innerHTML={sanitize(urlify(profile?.userProfile?.about || ''))}>
        </div>

        <div class={styles.profileLinks}>
          <div class={styles.website}>
            <Show when={profile?.userProfile?.website}>
              <div class={styles.linkIcon}></div>
              <a href={rectifyUrl(profile?.userProfile?.website || '')} target="_blank">
                {profile?.userProfile?.website}
              </a>
            </Show>
          </div>
          <div class={styles.joined}>
            <Show when={profile?.oldestNoteDate}>
              Joined Nostr on {shortDate(profile?.oldestNoteDate)}
            </Show>
          </div>
        </div>

        <div class={styles.userStats}>
          <div class={styles.userStat}>
            <div class={styles.statNumber}>
              {humanizeNumber(profile?.userStats?.follows_count || 0)}
            </div>
            <div class={styles.statName}>following</div>
          </div>
          <div class={styles.userStat}>
            <div class={styles.statNumber}>
              {humanizeNumber(profile?.userStats?.followers_count || 0)}
            </div>
            <div class={styles.statName}>followers</div>
          </div>
          <div class={styles.userStat}>
            <div class={styles.statNumber}>
              {humanizeNumber(profile?.userStats?.note_count || 0)}
            </div>
            <div class={styles.statName}>notes</div>
          </div>

        </div>

      </div>

      <div class={styles.userFeed}>
        <For each={profile?.notes}>
          {note => (
            <Note note={note} />
          )}
        </For>
        <Paginator loadNextPage={profile?.actions.fetchNextPage}/>
      </div>
    </>
  )
}

export default Profile;
