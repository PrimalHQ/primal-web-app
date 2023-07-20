import { RouteDataFuncArgs, useNavigate, useParams, useRouteData } from '@solidjs/router';
import { nip19 } from 'nostr-tools';
import {
  Component,
  createEffect,
  createMemo,
  createSignal,
  For,
  Resource,
  Show
} from 'solid-js';
import Avatar from '../components/Avatar/Avatar';
import Branding from '../components/Branding/Branding';
import Note from '../components/Note/Note';
import { hexToNpub } from '../lib/keys';
import { humanizeNumber } from '../lib/stats';
import { nip05Verification, truncateNpub } from '../stores/profile';
import Paginator from '../components/Paginator/Paginator';
import { useToastContext } from '../components/Toaster/Toaster';
import { useSettingsContext } from '../contexts/SettingsContext';
import { useProfileContext } from '../contexts/ProfileContext';
import { useAccountContext } from '../contexts/AccountContext';
import Wormhole from '../components/Wormhole/Wormhole';
import { useIntl } from '@cookbook/solid-intl';
import { urlify, sanitize, replaceLinkPreviews } from '../lib/notes';
import { shortDate } from '../lib/dates';

import styles from './Profile.module.scss';
import StickySidebar from '../components/StickySidebar/StickySidebar';
import ProfileSidebar from '../components/ProfileSidebar/ProfileSidebar';
import { VanityProfiles } from '../types/primal';
import PageTitle from '../components/PageTitle/PageTitle';
import FollowButton from '../components/FollowButton/FollowButton';
import Search from '../components/Search/Search';
import { useMediaContext } from '../contexts/MediaContext';
import { profile as t, actions as tActions } from '../translations';

const Profile: Component = () => {

  const settings = useSettingsContext();
  const toaster = useToastContext();
  const profile = useProfileContext();
  const account = useAccountContext();
  const media = useMediaContext();
  const intl = useIntl();
  const navigate = useNavigate();

  const params = useParams();

  const routeData = useRouteData<(opts: RouteDataFuncArgs) => Resource<VanityProfiles>>();

  const getHex = () => {
    if (params.vanityName && routeData()) {
      const name = params.vanityName.toLowerCase();
      const hex = routeData()?.names[name];

      if (hex) {
        return hex;
      }

      navigate('/404');
    }

    if (params.vanityName) {
      return '';
    }

    let hex = params.npub || account?.publicKey;

    if (params.npub?.startsWith('npub')) {
      hex = nip19.decode(params.npub).data as string;
    }

    return hex;
  }

  const setProfile = (hex: string | undefined) => {
    profile?.actions.setProfileKey(hex);
    profile?.actions.clearNotes();
    profile?.actions.fetchNotes(hex);
  }

  createEffect(() => {
    if (account?.isKeyLookupDone) {
      setProfile(getHex());
    }
  });

  const profileNpub = createMemo(() => {
    return hexToNpub(profile?.profileKey);
  });

  const profileName = () => {
    return profile?.userProfile?.displayName ||
      profile?.userProfile?.name ||
      truncateNpub(profileNpub());
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

    const banner = document.getElementById('profile_banner');

    if (banner) {
      banner.innerHTML = `<div class="${styles.bannerPlaceholder}"></div>`;
    }

    return true;
  }

  const rectifyUrl = (url: string) => {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
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

  const [isBannerCached, setisBannerCached] = createSignal(false);

  const banner = () => {
    const src= profile?.userProfile?.banner;
    const url = media?.actions.getMediaUrl(src, 'm', true);

    setisBannerCached(!!url);

    return url ?? src;
  }

  const flagBannerForWarning = () => {
    const dev = JSON.parse(localStorage.getItem('devMode') || 'false');

    // @ts-ignore
    if (isBannerCached() || !dev) {
      return '';
    }

    return styles.cacheFlag;
  }

  return (
    <>
      <PageTitle title={
        intl.formatMessage(
          t.title,
          {
            name: profile?.userProfile?.displayName ||
              profile?.userProfile?.name ||
              truncateNpub(profileNpub()),
          },
        )}
      />

      <Wormhole to='branding_holder'>
        <Branding small={false} />
      </Wormhole>

      <StickySidebar>
        <ProfileSidebar notes={profile?.sidebar.notes} profile={profile?.userProfile} />
      </StickySidebar>

      <Wormhole to='search_section'>
        <Search />
      </Wormhole>

      <div id="central_header" class={styles.fullHeader}>
        <div id="profile_banner" class={`${styles.banner} ${flagBannerForWarning()}`}>
          <Show
            when={profile?.userProfile?.banner}
            fallback={<div class={styles.bannerPlaceholder}></div>}
          >
            <img src={banner()} onerror={imgError}/>
          </Show>
        </div>

        <Show when={profile?.userProfile && !profile?.isFetching}>
          <div class={styles.userImage}>
            <div class={styles.avatar}>
              <div class={styles.desktopAvatar}>
                <Avatar src={profile?.userProfile?.picture} size="xxl" />
              </div>

              <div class={styles.phoneAvatar}>
                <Avatar src={profile?.userProfile?.picture} size="lg" />
              </div>
            </div>
          </div>
        </Show>

        <div class={styles.profileActions}>
          <button
            class={styles.smallSecondaryButton}
            onClick={onNotImplemented}
          >
            <div class={styles.zapIcon}></div>
          </button>
          <button
            class={styles.smallSecondaryButton}
            onClick={() => navigate(`/messages/${profile?.userProfile?.npub}`)}
          >
            <div class={styles.messageIcon}></div>
          </button>

          <div class={styles.addToFeedButton}>
            <Show
              when={!hasFeedAtHome()}
              fallback={
                <button
                  class={styles.smallSecondaryButton}
                  onClick={removeFromHome}
                  title={intl.formatMessage(
                    tActions.removeFromHomeFeedNamed,
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
                  tActions.addFeedToHomeNamed,
                  { name: profileName() },
                )}
              >
                <div class={styles.addFeedIcon}></div>
              </button>
            </Show>
          </div>

          <FollowButton person={profile?.userProfile} large={true} />

        </div>

        <Show when={profile?.userProfile && !profile?.isFetching}>
          <div class={styles.profileVerification}>
            <div class={styles.avatarName}>
              {profileName()}
              <Show when={profile?.userProfile?.nip05}>
                <div class={styles.verifiedIconL}></div>
              </Show>
              <Show when={isFollowingYou()}>
                <div class={styles.followsBadge}>
                  {intl.formatMessage(t.followsYou)}
                </div>
              </Show>
            </div>
            <div class={styles.verificationInfo}>
              <Show when={profile?.userProfile?.nip05}>
                <div class={styles.verified}>
                  <div class={styles.verifiedIconS}></div>
                  <div class={styles.nip05}>{nip05Verification(profile?.userProfile)}</div>
                </div>
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
        </Show>

        <div class={styles.profileAbout} innerHTML={replaceLinkPreviews(urlify(sanitize(profile?.userProfile?.about || ''), false, false))}>
        </div>

        <div class={styles.profileLinks}>
          <div class={styles.website}>
            <Show when={profile?.userProfile?.website}>
              <div class={styles.linkIcon}></div>
              <a href={rectifyUrl(profile?.userProfile?.website || '')} target="_blank">
                {sanitize(profile?.userProfile?.website || '')}
              </a>
            </Show>
          </div>
          <div class={styles.joined}>
            <Show when={profile?.userStats.time_joined}>
              {intl.formatMessage(
                t.jointDate,
                {
                  date: shortDate(profile?.userStats.time_joined),
                },
              )}
            </Show>
          </div>
        </div>

        <div class={styles.userStats}>
          <div class={styles.userStat}>
            <div class={styles.statNumber}>
              {humanizeNumber(profile?.userStats?.follows_count || 0)}
            </div>
            <div class={styles.statName}>
              {intl.formatMessage(t.stats.follow)}
            </div>
          </div>
          <div class={styles.userStat}>
            <div class={styles.statNumber}>
              {humanizeNumber(profile?.userStats?.followers_count || 0)}
            </div>
            <div class={styles.statName}>
              {intl.formatMessage(t.stats.followers)}
            </div>
          </div>
          <div class={styles.userStat}>
            <div class={styles.statNumber}>
              {humanizeNumber(profile?.userStats?.note_count || 0)}
            </div>
            <div class={styles.statName}>
              {intl.formatMessage(t.stats.notes)}
            </div>
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
