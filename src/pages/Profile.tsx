import { A, createAsync, useBeforeLeave, useNavigate, useParams } from '@solidjs/router';
import { nip19 } from '../lib/nTools';
import {
  Component,
  createEffect,
  createMemo,
  createSignal,
  For,
  Match,
  on,
  onCleanup,
  onMount,
  Resource,
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
import { MenuItem, PrimalUser, VanityProfiles, ZapOption } from '../types/primal';
import PageTitle from '../components/PageTitle/PageTitle';
import FollowButton from '../components/FollowButton/FollowButton';
import Search from '../components/Search/Search';
import { useMediaContext } from '../contexts/MediaContext';
import { profile as t, actions as tActions, toast as tToast, feedProfile, toastZapProfile } from '../translations';
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
import ButtonPrimary from '../components/Buttons/ButtonPrimary';
import { Tier, TierCost } from '../components/SubscribeToAuthorModal/SubscribeToAuthorModal';
import { Kind } from '../constants';
import { getAuthorSubscriptionTiers } from '../lib/feed';
import { zapSubscription } from '../lib/zap';
import { updateStore, store } from '../services/StoreService';
import { subsTo } from '../sockets';
import { humanizeNumber } from '../lib/stats';
import ProfileBannerSkeleton from '../components/Skeleton/ProfileBannerSkeleton';
import { Transition, TransitionGroup } from 'solid-transition-group';
import ProfileAvatarSkeleton from '../components/Skeleton/ProfileAvatarSkeleton';
import ProfileVerificationSkeleton from '../components/Skeleton/ProfileVerificationSkeleton';
import ProfileAboutSkeleton from '../components/Skeleton/ProfileAboutSkeleton';
import ProfileLinksSkeleton from '../components/Skeleton/ProfileLinksSkeleton';
import ProfileTabsSkeleton from '../components/Skeleton/ProfileTabsSkeleton';
import ArticlePreviewSidebarSkeleton from '../components/Skeleton/ArticlePreviewSidebarSkeleton';
import ProfileFollowModal from '../components/ProfileFollowModal/ProfileFollowModal';
import ProfileCardSkeleton from '../components/Skeleton/ProfileCardSkeleton';
import { getKnownProfiles } from '../Router';
import { scrollWindowTo } from '../lib/scroll';
import PremiumCohortInfo from './Premium/PremiumCohortInfo';
import { isIOS } from '../components/BannerIOS/BannerIOS';
import { isAndroid } from '@kobalte/utils';
import ProfileMobile from './ProfileMobile';
import ProfileDesktop from './ProfileDesktop';

const Profile: Component = () => {

  return (
    <>
      <Show
        when={isIOS() || isAndroid()}
        fallback={<ProfileDesktop />}
      >
        <ProfileMobile />
      </Show>
    </>
  )
}

export default Profile;
