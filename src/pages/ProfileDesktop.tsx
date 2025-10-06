import { A, useBeforeLeave, useNavigate, useParams } from '@solidjs/router';
import { nip19 } from '../lib/nTools';
import {
  Component,
  createEffect,
  createMemo,
  createSignal,
  For,
  Match,
  on,
  Show,
  Switch,
} from 'solid-js';
import Avatar from '../components/Avatar/Avatar';
import { hexToNpub } from '../lib/keys';
import { authorName, nip05Verification, truncateNpub, userName } from '../stores/profile';
import { useToastContext } from '../components/Toaster/Toaster';
import { useSettingsContext } from '../contexts/SettingsContext';
import { useProfileContext } from '../contexts/ProfileContext';
import { useAccountContext } from '../contexts/AccountContext';
import Wormhole from '../components/Wormhole/Wormhole';
import { useIntl } from '@cookbook/solid-intl';
import { sanitize, sendEvent } from '../lib/notes';
import { shortDate } from '../lib/dates';

import styles from './Profile.module.scss';
import StickySidebar from '../components/StickySidebar/StickySidebar';
import ProfileSidebar from '../components/ProfileSidebar/ProfileSidebar';
import { MenuItem, PrimalUser, ZapOption } from '../types/primal';
import PageTitle from '../components/PageTitle/PageTitle';
import FollowButton from '../components/FollowButton/FollowButton';
import Search from '../components/Search/Search';
import { useMediaContext } from '../contexts/MediaContext';
import { profile as t, actions as tActions, toast as tToast, toastZapProfile } from '../translations';
import PrimalMenu from '../components/PrimalMenu/PrimalMenu';
import ConfirmModal from '../components/ConfirmModal/ConfirmModal';
import { fetchKnownProfiles, isAccountVerified, reportUser } from '../lib/profile';
import { APP_ID } from '../App';
import ProfileTabs from '../components/ProfileTabs/ProfileTabs';
import ButtonSecondary from '../components/Buttons/ButtonSecondary';
import VerificationCheck from '../components/VerificationCheck/VerificationCheck';

import PhotoSwipeLightbox from 'photoswipe/lightbox';
import NoteImage from '../components/NoteImage/NoteImage';
import ProfileQrCodeModal from '../components/ProfileQrCodeModal/ProfileQrCodeModal';
import { CustomZapInfo, useAppContext } from '../contexts/AppContext';
import ProfileAbout from '../components/ProfileAbout/ProfileAbout';
import { Tier, TierCost } from '../components/SubscribeToAuthorModal/SubscribeToAuthorModal';
import { Kind } from '../constants';
import { getAuthorSubscriptionTiers } from '../lib/feed';
import { zapSubscription } from '../lib/zap';
import { subsTo } from '../sockets';
import { TransitionGroup } from 'solid-transition-group';
import ProfileFollowModal from '../components/ProfileFollowModal/ProfileFollowModal';
import ProfileCardSkeleton from '../components/Skeleton/ProfileCardSkeleton';
import PremiumCohortInfo from './Premium/PremiumCohortInfo';
import { ProfilePointer } from 'nostr-tools/lib/types/nip19';

const ProfileDesktop: Component = () => {

  const settings = useSettingsContext();
  const toaster = useToastContext();
  const profile = useProfileContext();
  const account = useAccountContext();
  const media = useMediaContext();
  const app = useAppContext();

  const intl = useIntl();
  const navigate = useNavigate();

  const params = useParams();

  const [showContext, setContext] = createSignal(false);
  const [confirmReportUser, setConfirmReportUser] = createSignal(false);
  const [confirmMuteUser, setConfirmMuteUser] = createSignal(false);

  const [followsModal, setFollowsModal] = createSignal<'follows' | 'followers' | false>(false);

  const [hasTiers, setHasTiers] = createSignal(false);

  const lightbox = new PhotoSwipeLightbox({
    gallery: '#central_header',
    children: 'a.profile_image',
    showHideAnimationType: 'zoom',
    initialZoomLevel: 'fit',
    secondaryZoomLevel: 2,
    maxZoomLevel: 3,
    pswpModule: () => import('photoswipe')
  });


  const tabHash = () => {
    return (location.hash.length > 1) ? location.hash.substring(1) : 'notes';
  }

  const [getHex, setHex] = createSignal<string>();

  const resolveHex = async (vanityName: string | undefined) => {
    if (vanityName) {
      let name = vanityName.toLowerCase();

      if (name === 'gigi') {
        name = 'dergigi';
      }

      const vanityProfile = await fetchKnownProfiles(name);

      const hex = vanityProfile.names[name];

      if (!hex) {
        navigate('/404');
        return;
      }

      setHex(() => hex);

      profile?.profileKey !== hex && setProfile(hex);
      return;
    }

    let hex = params.npub || account?.publicKey;

    if (params.npub?.startsWith('npub')) {
      hex = nip19.decode(params.npub).data as string;
    }

    if (params.npub?.startsWith('nprofile')) {
      hex = (nip19.decode(params.npub).data as ProfilePointer).pubkey! as string;
    }

    setHex(() => hex);

    profile?.profileKey !== hex && setProfile(hex);

    return;
  }

  createEffect(() => {
    resolveHex(params.vanityName)
  })

  createEffect(on(() => profile?.profileKey, (v,p) => {
    if (!v || v === p) return;
    setIsProfileLoaded(false);
  }));

  const setProfile = (hex: string | undefined) => {
    profile?.actions.setProfileKey(hex);

    profile?.actions.clearArticles();
    profile?.actions.clearNotes();
    profile?.actions.clearReplies();
    profile?.actions.clearContacts();
    profile?.actions.clearZaps();
    profile?.actions.clearFilterReason();
    profile?.actions.clearGallery();
    setHasTiers(() => false);
  }

  const isSmallScreen = () => window.innerWidth < 721;

  const profileNpub = createMemo(() => {
    return hexToNpub(profile?.profileKey);
  });

  const profileName = () => {
    return profile?.userProfile?.displayName ||
      profile?.userProfile?.name ||
      truncateNpub(profileNpub());
  }

  const addToHome = () => {
    settings?.actions.addProfileHomeFeed(
      profileName(),
      profile?.profileKey,
    );

    toaster?.sendSuccess(intl.formatMessage(tToast.addFeedToHomeSuccess, { name: profileName()}));
  };

  const removeFromHome = () => {
    settings?.actions.removeProfileHomeFeed(
      profile?.profileKey,
    );

    toaster?.sendSuccess(intl.formatMessage(tToast.removeFeedFromHomeSuccess, { name: profileName()}));
  };

  const hasFeedAtHome = () => {
    return settings?.actions.hasProfileFeedAtHome(profile?.profileKey);
    // return !!settings?.availableFeeds.find(f => f.hex === profile?.profileKey);
  };

  const imgError = (event: any) => {
    const image = event.target;

    setIsBannerLoaded(true);

    if (image.src !== profile?.userProfile?.banner) {
      image.onerror = "";
      image.src = profile?.userProfile?.banner;
      return true;
    }

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
    return profile?.isProfileFollowing;
  }

  const [isBannerCached, setisBannerCached] = createSignal(false);

  const banner = () => {
    const src = profile?.userProfile?.banner;
    const url = media?.actions.getMediaUrl(src, 'm', true);

    setisBannerCached(!!url);

    return url ?? src;
  }

  const flagBannerForWarning = () => {
    const dev = localStorage.getItem('devMode') === 'true';

    // @ts-ignore
    if (isBannerCached() || !dev) {
      return '';
    }

    return styles.cacheFlag;
  }

  const isCurrentUser = () => {
    if (!account || !profile || !account.isKeyLookupDone) {
      return false;
    }
    return account?.publicKey === profile?.profileKey;
  };

  createEffect(() => {
    const pk = getHex();

    if (!pk) {
      return;
    }

    if (account?.muted.includes(pk)) {
      profile?.actions.clearNotes();
    }
  });

  const isMuted = (pk: string | undefined, ignoreContentCheck = false) => {
    const isContentMuted = account?.mutelists.find(x => x.pubkey === account.publicKey)?.content;

    return pk &&
      account?.muted.includes(pk) &&
      (ignoreContentCheck ? true : isContentMuted);
  };

  const isFiltered = () => {
    return profile?.filterReason !== null;
  };

  const unMuteProfile = () => {
    if (!account || !profile?.profileKey) {
      return;
    }

    account.actions.removeFromMuteList(profile.profileKey, 'user', () => setProfile(profile.profileKey));
  };

  const isFollowingMute = (pk: string | undefined) => {
    if (!pk) return false;

    return account?.mutelists.find(l => l.pubkey === pk);
  };

  const followMute = () => {
    account?.actions.addFilterList(profile?.profileKey);
  };

  const unfollowMute = () => {
    account?.actions.removeFilterList(profile?.profileKey);
  };

  const openContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    setContext(true);
  };

  const onClickOutside = (e: MouseEvent) => {
    if (
      !document?.getElementById('profile_context')?.contains(e.target as Node)
    ) {
      setContext(false);
    }
  }

  const profileContextForEveryone: () => MenuItem[] = () => {

    const addToFeedAction = hasFeedAtHome() ?
    {
      label: intl.formatMessage(tActions.profileContext.removeFeed),
      action: () => {
        removeFromHome();
        setContext(false);
      },
      icon: 'feed_remove',
    } :
    {
      label: intl.formatMessage(tActions.profileContext.addFeed),
      action: () => {
        addToHome();
        setContext(false);
      },
      icon: 'feed_add',
    };

    return [
      addToFeedAction,
      {
        label: intl.formatMessage(tActions.profileContext.copyLink),
        action: () => {
          copyProfileLink();
          setContext(false);
        },
        icon: 'copy_note_link',
      },
      {
        label: intl.formatMessage(tActions.profileContext.copyPubkey),
        action: () => {
          copyUserNpub();
          setContext(false);
        },
        icon: 'copy_pubkey',
      },
    ];
  };

  const profileContextForOtherPeople: () => MenuItem[] = () => {

    const muteAction = isMuted(getHex(), true) ?
      {
        label: intl.formatMessage(tActions.profileContext.unmuteUser),
        action: () => {
          unMuteProfile();
          setContext(false);
        },
        icon: 'mute_user',
        warning: true,
      } :
      {
        label: intl.formatMessage(tActions.profileContext.muteUser),
        action: () => {
          setConfirmMuteUser(true);
          setContext(false);
        },
        icon: 'mute_user',
        warning: true,
      };

    const followMuteAction = isFollowingMute(getHex()) ?
      {
        label: intl.formatMessage(tActions.profileContext.unfollowMute),
        action: () => {
          unfollowMute();
          setContext(false);
        },
        icon: 'mute_user',
      } :
      {
        label: intl.formatMessage(tActions.profileContext.followMute),
        action: () => {
          followMute();
          setContext(false);
        },
        icon: 'mute_user',
      };

    const separatorItem = {
      action: () => {},
      label: '',
      separator: true,
    }

    return [
      followMuteAction,
      separatorItem,
      muteAction,
      {
        label: intl.formatMessage(tActions.profileContext.reportUser),
        action: () => {
          setConfirmReportUser(true);
          setContext(false);
        },
        icon: 'report',
        warning: true,
      },
    ];
  };

  const profileContext = () => account?.publicKey !== getHex() ?
      [ ...profileContextForEveryone(), ...profileContextForOtherPeople()] :
      profileContextForEveryone();

  const doMuteUser = () => {
    const pk = getHex();
    pk && account?.actions.addToMuteList(pk);
  };

  const doReportUser = () => {
    const pk = getHex();

    if (!pk) {
      return;
    }

    reportUser(pk, `report_user_${APP_ID}`, profile?.userProfile);
    setContext(false);
    toaster?.sendSuccess(intl.formatMessage(tToast.noteAuthorReported, { name: userName(profile?.userProfile)}));
  };

  const addToAllowlist = async () => {
    const pk = getHex();
    if (pk) {
      account?.actions.addToAllowlist(pk, () => { setProfile(pk) });
    }
  };

  const copyProfileLink = () => {
    navigator.clipboard.writeText(`${window.location.host}${app?.actions.profileLink(getHex()) || ''}`);
    setContext(false);
    toaster?.sendSuccess(intl.formatMessage(tToast.notePrimalLinkCoppied));
  };

  const copyUserNpub = () => {
    navigator.clipboard.writeText(`${hexToNpub(getHex())}`);
    setContext(false);
    toaster?.sendSuccess(intl.formatMessage(tToast.noteAuthorNpubCoppied));
  };

  createEffect(() => {
    if (showContext()) {
      document.addEventListener('click', onClickOutside);
    }
    else {
      document.removeEventListener('click', onClickOutside);
    }
  });

  const [verification, setVerification] = createSignal(false);

  const checkVerification = async (pubkey: string | undefined) => {
    if(!pubkey) {
      setVerification(false);
    }

    const v = await isAccountVerified(profile?.userProfile?.nip05);

    if (v && v.pubkey === pubkey) {
      setVerification(true);
      return;
    }

    setVerification(false);
  };

  createEffect(() => {
    if (profile?.profileKey) {
      checkVerification(profile?.profileKey)
    }
  });

  // createEffect(on(() => profile?.profileKey, (v, p) => {
  //   if (!v || v === p) return;

  //   setIsProfileLoaded(false);
  // }))

  useBeforeLeave((e) => {
    if (e.to.toString().startsWith(e.from.pathname)) return;

    // setIsProfileLoaded(() => false);
    // profile?.actions.clearProfile();
    // profile?.actions.resetProfile();
  })

  const [isBannerLoaded, setIsBannerLoaded] = createSignal(false);
  const [isProfileLoaded, setIsProfileLoaded] = createSignal(false);

  createEffect(() => {
    if (
      profile?.isProfileFetched &&
      !profile.isFetchingSidebarArticles &&
      !profile.isFetchingSidebarNotes &&
      // profile.isAboutParsed &&
      profile.profileKey === getHex() &&
      (profile.userProfile ? isBannerLoaded() : true)
    ) {
      setIsProfileLoaded(() => true);
    }
  })

  createEffect(() => {
    if (isProfileLoaded()) {
      lightbox.init();
    }
  })

  const customZapInfo: () => CustomZapInfo = () => ({
    profile: profile?.userProfile,
    onConfirm: (zapOption: ZapOption) => {
      app?.actions.closeCustomZapModal();
    },
    onSuccess: (zapOption: ZapOption) => {
      app?.actions.closeCustomZapModal();
      app?.actions.resetCustomZap();
      toaster?.sendSuccess(intl.formatMessage(toastZapProfile, {
        name: authorName(profile?.userProfile)
      }))
    },
    onFail: (zapOption: ZapOption) => {
      app?.actions.closeCustomZapModal();
      app?.actions.resetCustomZap();
    },
    onCancel: (zapOption: ZapOption) => {
      app?.actions.closeCustomZapModal();
      app?.actions.resetCustomZap();
    },
  });

  createEffect(() => {
    if (profile?.userProfile) {
      getTiers(profile.userProfile);
    }
  });

  const getTiers = (author: PrimalUser) => {
    if (!author) return;

    const subId = `article_tiers_${APP_ID}`;

    const unsub = subsTo(subId, {
      onEvent: (_, content) => {
        if (content.kind === Kind.TierList) {
          return;
        }

        if (content.kind === Kind.Tier) {
          setHasTiers(() => true);

          return;
        }
      },
      onEose: () => {
        unsub();
      },
    })

    getAuthorSubscriptionTiers(author.pubkey, subId);
  }

  const doSubscription = async (tier: Tier, cost: TierCost, exchangeRate?: Record<string, Record<string, number>>) => {
    const a = profile?.userProfile;

    if (!a || !account || !cost) return;

    const subEvent = {
      kind: Kind.Subscribe,
      content: '',
      created_at: Math.floor((new Date()).getTime() / 1_000),
      tags: [
        ['p', a.pubkey],
        ['e', tier.id],
        ['amount', cost.amount, cost.unit, cost.cadence],
        ['event', JSON.stringify(tier.event)],
        // Copy any zap splits
        ...(tier.event.tags?.filter(t => t[0] === 'zap') || []),
      ],
    }

    const { success, note } = await sendEvent(subEvent, account.activeRelays, account.relaySettings, account?.proxyThroughPrimal || false);

    if (success && note) {
      const isZapped = await zapSubscription(
        note,
        a,
        account.publicKey,
        account.activeRelays,
        exchangeRate,
        account.activeNWC,
      );

      if (!isZapped) {
        unsubscribe(note.id);
      }
    }
  }

  const unsubscribe = async (eventId: string) => {
    const a = profile?.userProfile;;

    if (!a || !account) return;

    const unsubEvent = {
      kind: Kind.Unsubscribe,
      content: '',
      created_at: Math.floor((new Date()).getTime() / 1_000),

      tags: [
        ['p', a.pubkey],
        ['e', eventId],
      ],
    };

    await sendEvent(unsubEvent, account.activeRelays, account.relaySettings, account?.proxyThroughPrimal || false);

  }


  const openSubscribe = () => {
    app?.actions.openAuthorSubscribeModal(profile?.userProfile, doSubscription);
  };

  const shortProfileAbout = (text: string | undefined) => {
    if (!text) return true;

    return text.length < 50;
  }

  const isVisibleLegend = () => {
    if (
      !profile?.profileKey ||
      !app?.memberCohortInfo[profile.profileKey]
    ) return false;


    if (
      app?.memberCohortInfo[profile.profileKey].tier === 'premium-legend' &&
      app?.legendCustomization[profile.profileKey] &&
      app?.legendCustomization[profile.profileKey].style !== ''
    ) return true;

    if (
      app?.memberCohortInfo[profile.profileKey].tier === 'premium' &&
      (app?.memberCohortInfo[profile.profileKey].expires_on || 0) > Math.floor((new Date()).getTime() / 1_000)
    ) return true;

    return false;
  }

  const showAvatarBorder = () => {
    return !profile?.profileKey ||
      !app?.legendCustomization[profile.profileKey] ||
      !app?.memberCohortInfo[profile.profileKey] ||
      app?.legendCustomization[profile.profileKey].style === '' ||
      app?.memberCohortInfo[profile.profileKey].tier !== 'premium-legend';
  }

  const commonFollowers = () => {
    if (!profile?.commonFollowers || profile.commonFollowers.length === 0) return [];

    let sorted: PrimalUser[] = profile.commonFollowers;

    let re = sorted.toSorted((a, b) => {
      const aIsLegend = (app?.memberCohortInfo[a.pubkey])?.tier === 'premium-legend';
      const bIsLegend = (app?.memberCohortInfo[b.pubkey])?.tier === 'premium-legend';

      let ret = 1;

      if (aIsLegend && !bIsLegend) ret = -1;

      return ret;
    });

    return re.slice(0, 5).reverse();
  }


  const getStream = () => {
    return media?.actions.getStream(profile?.profileKey || 'n/a', true);
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

      <Show when={profile?.userProfile}>
        <div class="preload">
          <NoteImage
            src={banner()}
            altSrc={profile?.userProfile?.banner}
            onError={imgError}
            plainBorder={true}
            onImageLoaded={() => {
              setIsBannerLoaded(true);
            }}
            width={640}
            media={media?.actions.getMedia(banner() || '', 'o')}
            mediaThumb={media?.actions.getMedia(banner() || '', 'm') || media?.actions.getMedia(banner() || '', 'o') || banner()}
            authorPk={profile?.profileKey}
          />
        </div>
      </Show>

      <Wormhole to='search_section'>
        <Search />
      </Wormhole>

      <StickySidebar>
        <TransitionGroup name="slide-fade">
          <Show
            when={isProfileLoaded()}
          >
            <ProfileSidebar
              notes={profile?.sidebarNotes.notes}
              articles={profile?.sidebarArticles.notes}
              profile={profile?.userProfile}
              stream={getStream()}
            />
          </Show>
        </TransitionGroup>
      </StickySidebar>

        <Show
          when={isProfileLoaded()}
          fallback={<ProfileCardSkeleton tab={tabHash()} />}
        >
          <div id="central_header" class={styles.fullHeader}>
            <div id="profile_banner" class={`${styles.banner} ${flagBannerForWarning()} animated`}>
              <Show
                when={profile?.userProfile?.banner}
                fallback={<div class={styles.bannerPlaceholder}></div>}
              >
                <NoteImage
                  class="profile_image"
                  src={banner()}
                  altSrc={profile?.userProfile?.banner}
                  onError={imgError}
                  plainBorder={true}
                  width={640}
                  media={media?.actions.getMedia(banner() || '', 'o')}
                  mediaThumb={media?.actions.getMedia(banner() || '', 'm') || media?.actions.getMedia(banner() || '', 'o') || banner()}
                  ignoreRatio={true}
                  authorPk={profile?.profileKey}
                />
              </Show>
            </div>

            <div class={`${styles.userImage} animated`}>
              <div class={`styles.avatar`}>
                <div class={isSmallScreen() ? styles.phoneAvatar : styles.desktopAvatar}>
                  <Avatar
                    user={profile?.userProfile}
                    size={isSmallScreen() ? "lg" : "xxl"}
                    zoomable={true}
                    showBorderRing={showAvatarBorder()}
                  />
                </div>
              </div>
            </div>

            <div class={`${styles.profileActions} animated`}>
              <div class={styles.contextArea}>
                <ButtonSecondary
                  onClick={openContextMenu}
                  shrink={true}
                >
                  <div class={styles.contextIcon}></div>
                </ButtonSecondary>
                <PrimalMenu
                  id={'profile_context'}
                  items={profileContext()}
                  position="profile"
                  reverse={true}
                  hidden={!showContext()}
                />
              </div>

              <ButtonSecondary
                onClick={() => profile?.userProfile && app?.actions.openProfileQr(profile?.userProfile)}
                shrink={true}
              >
                <div class={styles.qrIcon}></div>
              </ButtonSecondary>

              <Show when={!isCurrentUser()}>
                <ButtonSecondary
                  onClick={() => app?.actions.openCustomZapModal(customZapInfo())}
                  shrink={true}
                >
                  <div class={styles.zapIcon}></div>
                </ButtonSecondary>
              </Show>

              <Show when={account?.publicKey}>
                <ButtonSecondary
                  onClick={() => navigate(`/dms/${profile?.userProfile?.npub}`)}
                  shrink={true}
                >
                  <div class={styles.messageIcon}></div>
                </ButtonSecondary>
              </Show>

              <Show when={!isCurrentUser() || !account?.following.includes(profile?.profileKey || '')}>
                <FollowButton person={profile?.userProfile} large={true} />
              </Show>

              {/* <Show when={hasTiers()}>
                <ButtonPrimary
                  onClick={openSubscribe}
                >
                  subscribe
                </ButtonPrimary>
              </Show> */}

              <Show when={isCurrentUser()}>
                <div class={styles.editProfileButton}>
                  <ButtonSecondary
                    onClick={() => navigate('/settings/profile')}
                    title={intl.formatMessage(tActions.editProfile)}
                  >
                    <div>{intl.formatMessage(tActions.editProfile)}</div>
                  </ButtonSecondary>
                </div>
              </Show>
            </div>

            <div class="hidden">
              <ProfileAbout about={profile?.userProfile?.about} />
            </div>

            <div class={styles.profileCard}>
              <Switch>
                <Match when={shortProfileAbout(profile?.userProfile?.about)}>
                  <div class={styles.smallAbout}>
                    <div class={styles.columnLeft}>
                      <div class={`${styles.basicInfoName} animated`}>
                        <div class={styles.text}>
                          {profileName()}
                        </div>
                        <Show when={profile?.userProfile?.nip05 && verification()}>
                          <div class={styles.vc}>
                            <VerificationCheck user={profile?.userProfile} large={true} />
                          </div>
                        </Show>

                        <Show when={isVisibleLegend()}>
                          <PremiumCohortInfo
                            user={profile?.userProfile}
                            cohortInfo={app?.memberCohortInfo[profile?.profileKey!]!}
                            legendConfig={app?.legendCustomization[profile?.profileKey!]}
                          />
                        </Show>
                      </div>

                      <div class={styles.nipLine}>
                        <Show when={profile?.userProfile?.nip05}>
                          <div class={`${styles.verificationInfo} animated`}>
                            <div class={styles.verified}>
                                <div class={styles.nip05}>{nip05Verification(profile?.userProfile)}</div>
                            </div>
                          </div>
                        </Show>

                        <Show when={isFollowingYou()}>
                          <div class={styles.followsBadge}>
                            {intl.formatMessage(t.followsYou)}
                          </div>
                        </Show>
                      </div>

                      <Show when={profile?.userProfile?.about}>
                        <div class={`${styles.profileAboutHolder} animated`}>
                          <ProfileAbout about={profile?.userProfile?.about} />
                        </div>
                      </Show>

                      <Show when={profile?.userProfile?.website}>
                        <div class={`${styles.website} animated`}>
                          <a href={rectifyUrl(profile?.userProfile?.website || '')} target="_blank">
                            {sanitize(profile?.userProfile?.website || '')}
                          </a>
                        </div>
                      </Show>
                    </div>
                    <div class={styles.columnRight}>
                      <div class={`${styles.followings} animated`}>
                        <button class={styles.stats} onClick={() => setFollowsModal(() => 'follows')}>
                          <div class={styles.number}>{(profile?.userStats?.follows_count || 0).toLocaleString()}</div>
                          <div class={styles.label}>following</div>
                        </button>
                        <button class={styles.stats} onClick={() => setFollowsModal(() => 'followers')}>
                          <div class={styles.number}>{(profile?.userStats?.followers_count || 0).toLocaleString()}</div>
                          <div class={styles.label}>followers</div>
                        </button>
                      </div>

                      <Show when={profile?.userStats.time_joined}>
                        <div class={`${styles.joined} animated`}>
                          {intl.formatMessage(
                            t.jointDate,
                            {
                              date: shortDate(profile?.userStats.time_joined),
                            },
                          )}
                        </div>
                      </Show>

                      <Show when={commonFollowers().length > 0}>
                        <div class={`${styles.commonFollows} animated`}>
                          <div class={styles.label}>Followed by</div>
                          <div class={styles.avatars}>
                            <For each={commonFollowers()}>
                              {(follower, index) => (
                                <A href={app?.actions.profileLink(follower.npub) || ''} class={styles.avatar} style={`z-index: ${1 + index()}`}>
                                  <Avatar size="nano" user={follower} />
                                </A>
                              )}
                            </For>
                          </div>
                        </div>
                      </Show>

                    </div>
                  </div>
                </Match>
                <Match when={!shortProfileAbout(profile?.userProfile?.about)}>
                  <div class={styles.bigAbout}>
                    <div class={`${styles.basicInfo} animated`}>
                      <div class={styles.basicInfoName}>
                        <div class={styles.text}>
                          {profileName()}
                        </div>
                        <Show when={profile?.userProfile?.nip05 && verification()}>
                          <div class={styles.vc}>
                            <VerificationCheck user={profile?.userProfile} large={true} />
                          </div>
                        </Show>

                        <Show when={isVisibleLegend()}>
                          <PremiumCohortInfo
                            user={profile?.userProfile}
                            cohortInfo={app?.memberCohortInfo[profile?.profileKey!]!}
                            legendConfig={app?.legendCustomization[profile?.profileKey!]}
                          />
                        </Show>
                      </div>

                      <div class={styles.followings}>
                        <button class={styles.stats} onClick={() => setFollowsModal(() => 'follows')}>
                          <div class={styles.number}>{(profile?.userStats?.follows_count || 0).toLocaleString()}</div>
                          <div class={styles.label}>following</div>
                        </button>
                        <button class={styles.stats} onClick={() => setFollowsModal(() => 'followers')}>
                          <div class={styles.number}>{(profile?.userStats?.followers_count || 0).toLocaleString()}</div>
                          <div class={styles.label}>followers</div>
                        </button>
                      </div>
                    </div>
                    <div class={`${styles.verificationInfo} animated`}>
                        <div class={styles.verified}>
                          <Show when={profile?.userProfile?.nip05}>
                            <div class={styles.nip05}>{nip05Verification(profile?.userProfile)}</div>
                          </Show>
                          <Show when={isFollowingYou()}>
                            <div class={styles.followsBadge}>
                              {intl.formatMessage(t.followsYou)}
                            </div>
                          </Show>
                        </div>

                        <Show when={profile?.userStats.time_joined}>
                          <div class={styles.joined}>
                            {intl.formatMessage(
                              t.jointDate,
                              {
                                date: shortDate(profile?.userStats.time_joined),
                              },
                            )}
                          </div>
                        </Show>
                    </div>
                    <div class={`${styles.profileAboutHolder} animated`}>
                      <ProfileAbout about={profile?.userProfile?.about} />
                    </div>
                    <div class="animated">
                      <div class={styles.profileLinks}>
                        <div class={styles.website}>
                          <Show when={profile?.userProfile?.website}>
                            <a href={rectifyUrl(profile?.userProfile?.website || '')} target="_blank">
                              {sanitize(profile?.userProfile?.website || '')}
                            </a>
                          </Show>
                        </div>

                        <Show when={commonFollowers().length > 0}>
                          <div class={styles.commonFollows}>
                            <div class={styles.label}>Followed by</div>
                            <div class={styles.avatars}>
                              <For each={commonFollowers()}>
                                {(follower, index) => (
                                  <A href={app?.actions.profileLink(follower.npub) || ''} class={styles.avatar} style={`z-index: ${1 + index()}`}>
                                    <Avatar size="nano" user={follower} />
                                  </A>
                                )}
                              </For>
                            </div>
                          </div>
                        </Show>
                      </div>
                    </div>
                  </div>
                </Match>
              </Switch>
            </div>
          </div>

        </Show>

      <Show
        when={profile?.profileKey && isProfileLoaded()}
      >
        <ProfileTabs setProfile={setProfile} profileKey={profile?.profileKey} />
      </Show>

      <ConfirmModal
        open={confirmReportUser()}
        description={intl.formatMessage(tActions.reportUserConfirm, { name: userName(profile?.userProfile) })}
        onConfirm={() => {
          doReportUser();
          setConfirmReportUser(false);
        }}
        onAbort={() => setConfirmReportUser(false)}
      />

      <ConfirmModal
        open={confirmMuteUser()}
        description={intl.formatMessage(tActions.muteUserConfirm, { name: userName(profile?.userProfile) })}
        onConfirm={() => {
          doMuteUser();
          setConfirmMuteUser(false);
        }}
        onAbort={() => setConfirmMuteUser(false)}
      />

      <ProfileFollowModal
        open={followsModal()}
        setOpen={setFollowsModal}
        stats={{
          following: profile?.userStats?.follows_count || 0,
          followers: profile?.userStats?.followers_count || 0,
        }}
      />
    </>
  )
}

export default ProfileDesktop;
