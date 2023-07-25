import { Component, createEffect, createSignal, Show } from 'solid-js';
import styles from './EditProfile.module.scss';
import PageCaption from '../components/PageCaption/PageCaption';

import {
  actions as tActions,
  settings as tSettings,
  toast as tToast,
} from '../translations';
import { useIntl } from '@cookbook/solid-intl';
import Avatar from '../components/Avatar/Avatar';
import { useProfileContext } from '../contexts/ProfileContext';
import { useMediaContext } from '../contexts/MediaContext';
import { useAccountContext } from '../contexts/AccountContext';
import { NostrMediaUploaded } from '../types/primal';
import { sendProfile } from '../lib/profile';
import { useToastContext } from '../components/Toaster/Toaster';
import { APP_ID } from '../App';
import { subscribeTo as uploadSub } from "../uploadSocket";
import { Kind } from '../constants';
import { uploadMedia } from '../lib/media';
import Loader from '../components/Loader/Loader';
import { useNavigate } from '@solidjs/router';

type AutoSizedTextArea = HTMLTextAreaElement & { _baseScrollHeight: number };


const EditProfile: Component = () => {

  const intl = useIntl();
  const profile = useProfileContext();
  const media = useMediaContext();
  const account = useAccountContext();
  const toast = useToastContext();
  const navigate = useNavigate();

  let textArea: HTMLTextAreaElement | undefined;
  let fileUploadAvatar: HTMLInputElement | undefined;
  let fileUploadBanner: HTMLInputElement | undefined;

  const [isBannerCached, setIsBannerCached] = createSignal(false);
  const [isMoreVisible, setIsMoreVisible] = createSignal(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = createSignal(false);
  const [isUploadingBanner, setIsUploadingBanner] = createSignal(false);

  const [avatarPreview, setAvatarPreview] = createSignal<string>();
  const [bannerPreview, setBannerPreview] = createSignal<string>();

  const flagBannerForWarning = () => {
    const dev = JSON.parse(localStorage.getItem('devMode') || 'false');

    // @ts-ignore
    if (isBannerCached() || !dev) {
      return '';
    }

    return styles.cacheFlag;
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

  const banner = () => {
    const src = bannerPreview();
    const url = media?.actions.getMediaUrl(src, 'm', true);

    setIsBannerCached(!!url);

    return url ?? src;
  }

  const setProfile = (hex: string | undefined) => {
    profile?.actions.setProfileKey(hex);
    profile?.actions.clearNotes();
    profile?.actions.fetchNotes(hex);
  }

  const getScrollHeight = (elm: AutoSizedTextArea) => {
    var savedValue = elm.value
    elm.value = ''
    elm._baseScrollHeight = elm.scrollHeight
    elm.value = savedValue
  }

  const onExpandableTextareaInput: () => void = () => {
    const maxHeight = document.documentElement.clientHeight || window.innerHeight || 0;

    const elm = textArea as AutoSizedTextArea;

    const minRows = parseInt(elm.getAttribute('data-min-rows') || '0');

    !elm._baseScrollHeight && getScrollHeight(elm);

    if (elm.scrollHeight >= (maxHeight / 3)) {
      return;
    }

    elm.rows = minRows;
    const rows = Math.ceil((elm.scrollHeight - elm._baseScrollHeight) / 20);
    elm.rows = minRows + rows;
  }

  createEffect(() => {
    if (account?.isKeyLookupDone) {
      account.publicKey && setProfile(account.publicKey);
    }
  });

  createEffect(() => {
    if (profile?.userProfile?.about) {
      onExpandableTextareaInput();
    }
  });

  createEffect(() => {
    if (profile?.userProfile?.banner) {
      setBannerPreview(profile.userProfile.banner);
    }
  });

  createEffect(() => {
    if (profile?.userProfile?.picture) {
      setAvatarPreview(profile.userProfile.picture);
    }
  });

  const onUpload = (target: 'picture' | 'banner', fileUpload: HTMLInputElement | undefined) => {

    if (!fileUpload) {
      return;
    }

    const file = fileUpload.files ? fileUpload.files[0] : null;

    // @ts-ignore fileUpload.value assignment
    file && uploadFile(file, target, () => fileUpload.value = null);

  }

  const uploadFile = (file: File, target: 'picture' | 'banner', callback?: () => void) => {
    target === 'banner' && setIsUploadingBanner(true);
    target === 'picture' && setIsUploadingAvatar(true);

    const reader = new FileReader();

    reader.onload = (e) => {
      if (!e.target?.result) {
        return;
      }

      const subid = `upload_${APP_ID}`;

      const data = e.target?.result as string;

      const unsub = uploadSub(subid, (type, subId, content) => {

        if (type === 'EVENT') {
          if (!content) {
            return;
          }

          if (content.kind === Kind.Uploaded) {
            const uploaded = content as NostrMediaUploaded;

            if (target === 'picture') {
              setAvatarPreview(uploaded.content);
              return
            }

            if (target === 'banner') {
              setBannerPreview(uploaded.content);
              return
            }

            return;
          }
        }

        if (type === 'NOTICE') {
          target === 'banner' && setIsUploadingBanner(false);
          target === 'picture' && setIsUploadingAvatar(false);
          unsub();
          return;
        }

        if (type === 'EOSE') {
          target === 'banner' && setIsUploadingBanner(false);
          target === 'picture' && setIsUploadingAvatar(false);
          unsub();
          return;
        }
      });

      uploadMedia(account?.publicKey, subid, data);
    }

    reader.readAsDataURL(file);

    callback && callback();
  }

  const onSubmit = async (e: SubmitEvent) => {
    e.preventDefault();

    if (!e.target || !account) {
      return false;
    }

    const data = new FormData(e.target as HTMLFormElement);

    const displayName = data.get('displayName');
    const name = data.get('name');

    if (displayName == null || name == null || displayName.toString().length == 0 || name.toString().length === 0) {
      toast?.sendWarning('Required fields are not filled');
      return false;
    }

    let metadata: Record<string, string> = {};

    [ 'displayName',
      'name',
      'website',
      'about',
      'lud16',
      'nip05',
      'picture',
      'banner',
    ].forEach(key => {
      if (data.get(key)) {
        metadata[key] = data.get(key) as string;

        if (key === 'displayName') {
          metadata['display_name'] = data.get(key) as string;
        }
      }
    });

    const oldProfile = profile?.userProfile || {};

    const { success } = await sendProfile({ ...oldProfile, ...metadata}, account.relays, account.relaySettings);

    if (success) {
      toast?.sendSuccess(intl.formatMessage(tToast.updateProfileSuccess))
      return false;
    }

    toast?.sendWarning(intl.formatMessage(tToast.updateProfileFail))

    return false;
  };

  return (
    <div class={styles.container}>
      <PageCaption title={intl.formatMessage(tSettings.profile.title)} />

      <div id="central_header" class={styles.fullHeader}>
        <div id="profile_banner" class={`${styles.banner} ${flagBannerForWarning()}`}>
          <Show when={isUploadingBanner()}>
            <div class={styles.uploadingOverlay}><Loader /></div>
          </Show>
          <Show
            when={banner()}
            fallback={
            <div class={styles.bannerPlaceholder}>
              <label for="upload-banner">
                <div>{intl.formatMessage(tSettings.profile.uploadBanner)}</div>
              </label>
            </div>}
          >
            <label for="upload-banner">
              <img
                src={banner()}
                onerror={imgError}
              />
              <div>{intl.formatMessage(tSettings.profile.uploadBanner)}</div>
            </label>
          </Show>
        </div>

        <Show when={profile?.userProfile && !profile?.isFetching}>
          <div class={styles.userImage}>
            <div class={styles.avatar}>
              <Show when={isUploadingAvatar()}>
                <div class={styles.uploadingOverlay}><Loader /></div>
              </Show>
              <label for="upload-avatar">
                <div class={styles.desktopAvatar}>
                  <Avatar src={avatarPreview()} size="xxl" />
                  <div class={styles.uploadAction}>
                    {intl.formatMessage(tSettings.profile.uploadAvatar)}
                  </div>
                </div>

                <div class={styles.phoneAvatar}>
                  <Avatar src={avatarPreview()} size="lg" />
                  <div class={styles.uploadAction}>
                    {intl.formatMessage(tSettings.profile.uploadAvatar)}
                  </div>
                </div>
              </label>
            </div>
          </div>
        </Show>

        <div class={styles.uploadActions}>
          <div class={styles.uploadButton}>
            <input
              id="upload-avatar"
              type="file"
              onChange={() => onUpload('picture', fileUploadAvatar)}
              ref={fileUploadAvatar}
              hidden={true}
              accept="image/*"
            />
            <label for="upload-avatar">
            {intl.formatMessage(tSettings.profile.uploadAvatar)}
            </label>
          </div>

          <div class={styles.separator}></div>

          <div class={styles.uploadButton}>
            <input
              id="upload-banner"
              type="file"
              onchange={() => onUpload('banner', fileUploadBanner)}
              ref={fileUploadBanner}
              hidden={true}
              accept="image/*"
            />
            <label for="upload-banner">
            {intl.formatMessage(tSettings.profile.uploadBanner)}
            </label>
          </div>
        </div>
      </div>

      <form onSubmit={onSubmit}>
        <div class={styles.inputLabel}>
          <label for='displayName'>{intl.formatMessage(tSettings.profile.displayName.label)}</label>
          <span class={styles.required}>
            <span class={styles.star}>*</span>
            {intl.formatMessage(tSettings.profile.required)}
          </span>
        </div>
        <input
          name='displayName'
          type='text'
          placeholder={intl.formatMessage(tSettings.profile.displayName.placeholder)}
          value={profile?.userProfile?.displayName || profile?.userProfile?.display_name || ''}
        />

        <div class={styles.inputLabel}>
          <label for='name'>{intl.formatMessage(tSettings.profile.name.label)}</label>
          <span class={styles.required}>
            <span class={styles.star}>*</span>
            {intl.formatMessage(tSettings.profile.required)}
          </span>
        </div>
        <div class={styles.inputWithPrefix}>
          <div class={styles.inputPrefix}>
            @
          </div>
          <input
            name='name'
            type='text'
            class={styles.inputWithPrefix}
            placeholder={intl.formatMessage(tSettings.profile.name.placeholder)}
            value={profile?.userProfile?.name || ''}
          />
        </div>

        <div class={styles.inputLabel}>
          <label for='website'>{intl.formatMessage(tSettings.profile.website.label)}</label>
        </div>
        <input
          name='website'
          type='text'
          placeholder={intl.formatMessage(tSettings.profile.website.placeholder)}
          value={profile?.userProfile?.website || ''}
        />

        <div class={styles.inputLabel}>
          <label for='about'>{intl.formatMessage(tSettings.profile.about.label)}</label>
        </div>
        <textarea
          name='about'
          placeholder={intl.formatMessage(tSettings.profile.about.placeholder)}
          value={profile?.userProfile?.about || ''}
          ref={textArea}
          rows={1}
          data-min-rows={1}
          onInput={onExpandableTextareaInput}
        />

        <div class={styles.inputLabel}>
          <label for='lud16'>{intl.formatMessage(tSettings.profile.lud16.label)}</label>
        </div>
        <input
          name='lud16'
          type='text'
          placeholder={intl.formatMessage(tSettings.profile.lud16.placeholder)}
          value={profile?.userProfile?.lud16 || ''}
        />

        <div class={styles.inputLabel}>
          <label for='nip05'>{intl.formatMessage(tSettings.profile.nip05.label)}</label>
        </div>
        <input
          name='nip05'
          type='text'
          placeholder={intl.formatMessage(tSettings.profile.nip05.placeholder)}
          value={profile?.userProfile?.nip05 || ''}
        />

        <div class={styles.moreTrigger}>
          <button
            type='button'
            class={`${isMoreVisible() ? styles.shown : styles.hidden}`}
            onClick={() => setIsMoreVisible(!isMoreVisible()) }
          >More</button>
        </div>

        <div class={`${styles.moreInputs} ${isMoreVisible() ? styles.show : styles.hide}`}>
          <div class={styles.inputLabel}>
            <label for='picture'>{intl.formatMessage(tSettings.profile.picture.label)}</label>
          </div>
          <input
            name='picture'
            type='text'
            placeholder={intl.formatMessage(tSettings.profile.picture.placeholder)}
            value={avatarPreview() || ''}
            onChange={(e: Event) => {
              const target = e.target as HTMLInputElement;
              target.value && setAvatarPreview(target.value);
            }}
          />

          <div class={styles.inputLabel}>
            <label for='banner'>{intl.formatMessage(tSettings.profile.banner.label)}</label>
          </div>
          <input
            name='banner'
            type='text'
            placeholder={intl.formatMessage(tSettings.profile.banner.placeholder)}
            value={bannerPreview() || ''}
            onChange={(e: Event) => {
              const target = e.target as HTMLInputElement;
              target.value && setBannerPreview(target.value);
            }}
          />
        </div>

        <div class={styles.formSubmit}>
          <button
            type='submit'
            class={styles.primaryButton}
          >
            {intl.formatMessage(tActions.save)}
          </button>
          <button
            type='button'
            class={styles.secondaryButton}
            onClick={() => navigate('/profile')}
          >
            <div>
              <span>{intl.formatMessage(tActions.cancel)}</span>
            </div>
          </button>
        </div>
      </form>
    </div>
  );
}

export default EditProfile;
