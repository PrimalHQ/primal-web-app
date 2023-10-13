import { useIntl } from '@cookbook/solid-intl';
import { useNavigate } from '@solidjs/router';
import { Component, createEffect, createSignal, For, onMount, Show } from 'solid-js';
import { APP_ID } from '../App';
import Avatar from '../components/Avatar/Avatar';
import Loader from '../components/Loader/Loader';
import PageCaption from '../components/PageCaption/PageCaption';
import PageTitle from '../components/PageTitle/PageTitle';
import { useToastContext } from '../components/Toaster/Toaster';
import { usernameRegex, Kind } from '../constants';
import { useAccountContext } from '../contexts/AccountContext';
import { useMediaContext } from '../contexts/MediaContext';
import { useProfileContext } from '../contexts/ProfileContext';
import { uploadMedia } from '../lib/media';
import { getProfileContactList, getSuggestions, getUserProfiles, sendProfile } from '../lib/profile';
import { subscribeTo as uploadSub } from "../uploadSocket";
import {
  actions as tActions,
  account as tAccount,
  settings as tSettings,
  toast as tToast,
} from '../translations';
import { NostrMediaUploaded, NostrRelays } from '../types/primal';

import styles from './CreateAccount.module.scss';
import { createStore, reconcile } from 'solid-js/store';
import { generateKeys, setTempNsec } from '../lib/PrimalNostr';
import { hexToNpub, hexToNsec } from '../lib/keys';
import { storeSec } from '../lib/localStore';
import { getPreConfiguredRelays } from '../lib/relays';
import CreatePinModal from '../components/CreatePinModal/CreatePinModal';
import { useSearchContext } from '../contexts/SearchContext';
import ButtonFollow from '../components/Buttons/ButtonFollow';
import ButtonTertiary from '../components/Buttons/ButtonTertiary';
import { sendContacts } from '../lib/notes';
import ButtonSecondary from '../components/Buttons/ButtonSecondary';
import { nip05Verification } from '../stores/profile';

type AutoSizedTextArea = HTMLTextAreaElement & { _baseScrollHeight: number };

const CreateAccount: Component = () => {  const intl = useIntl();
  const profile = useProfileContext();
  const media = useMediaContext();
  const account = useAccountContext();
  const search = useSearchContext();
  const toast = useToastContext();
  const navigate = useNavigate();

  let textArea: HTMLTextAreaElement | undefined;
  let fileUploadAvatar: HTMLInputElement | undefined;
  let fileUploadBanner: HTMLInputElement | undefined;
  let nameInput: HTMLInputElement | undefined;

  const [isBannerCached, setIsBannerCached] = createSignal(false);
  const [isMoreVisible, setIsMoreVisible] = createSignal(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = createSignal(false);
  const [isUploadingBanner, setIsUploadingBanner] = createSignal(false);

  const [avatarPreview, setAvatarPreview] = createSignal<string>();
  const [bannerPreview, setBannerPreview] = createSignal<string>();

  const [isNameValid, setIsNameValid] = createSignal<boolean>(false);

  const flagBannerForWarning = () => {
    const dev = localStorage.getItem('devMode') === 'true';

    // @ts-ignore
    if (isBannerCached() || !dev) {
      return '';
    }

    return styles.cacheFlag;
  }

  const imgError = (event: any) => {
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

  const onNameInput = () => {
    const value = nameInput?.value || '';

    setIsNameValid(usernameRegex.test(value))
  };

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

      uploadMedia(createdAccount.pubkey, subid, data);
    }

    reader.readAsDataURL(file);

    callback && callback();
  }

  const onSubmit = async (e: SubmitEvent) => {
    e.preventDefault();

    if (!e.target || !account) {
      return false;
    }

    const pubkey = account.publicKey;

    const data = new FormData(e.target as HTMLFormElement);

    const name = data.get('name')?.toString() || '';

    if (!usernameRegex.test(name)) {
      toast?.sendWarning(intl.formatMessage(tSettings.profile.name.formError));
      return false;
    }

    let relaySettings = getPreConfiguredRelays();

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

    const { success } = await sendProfile({ ...metadata }, account.relays, relaySettings);

    if (success) {
      toast?.sendSuccess(intl.formatMessage(tToast.updateProfileSuccess));
      pubkey && getUserProfiles([pubkey], `user_profile_${APP_ID}`);

      const tags = followed.map(pk => ['p', pk]);
      const relayInfo = JSON.stringify(relaySettings);
      const date = Math.floor((new Date()).getTime() / 1000);

      const { success: succ } = await sendContacts(tags, date, relayInfo, account.relays, relaySettings);

      if (succ) {
        getProfileContactList(account?.publicKey, `user_contacts_${APP_ID}`);
      }

      setShowCreatePin(true);

      return false;
    }

    toast?.sendWarning(intl.formatMessage(tToast.updateProfileFail))

    return false;
  };

  const [createdAccount, setCreatedAccount] = createStore<{ sec?: string, pubkey?: string, relays?: NostrRelays }>({});
  const [currentStep, setCurrentStep] = createSignal<'name' | 'info' | 'follow'>('name');
  const [showCreatePin, setShowCreatePin] = createSignal(false);

  const toNext = () => {
    switch(currentStep()) {
      case 'name':
        setCurrentStep('info');
        break;
      case 'info':
        setCurrentStep('follow');
        break;
      default:
        break;
    }
  };

  const toPrevious = () => {
    switch(currentStep()) {
      case 'info':
        setCurrentStep('name');
        break;
      case 'follow':
        setCurrentStep('info');
        break;
      default:
        break;
    }
  };

  onMount(() => {
    const { sec, pubkey } = generateKeys(true);

    const nsec = hexToNsec(sec);

    account?.actions.setSec(nsec);
    setTempNsec(nsec);

    setCreatedAccount(() => ({ sec: nsec, pubkey }));
    getSuggestions();
    search?.actions.getRecomendedUsers();
  });


  const onStoreSec = (sec: string | undefined) => {
    storeSec(sec);
    setTempNsec(undefined);
    setCreatedAccount(reconcile({}));
    onAbort();
    navigate('/');
  }

  const onAbort = () => {
    setShowCreatePin(false);
  }

  const clearNewAccount = () => {
    account?.actions.setSec(undefined);
    setTempNsec(undefined);
    setCreatedAccount(reconcile({}));
    navigate('/');
  }

  const [followed, setFollowed] = createStore<string[]>([])

  const isFollowingAllProminent = () => {
    return !search?.users.some((u) => !followed.includes(u.pubkey));
  };

  const onFollowProminent = () => {
    const pubkeys = search?.users.map(u => u.pubkey) || [];
    setFollowed(() => [ ...pubkeys ]);
  };

  const onUnfollowProminent = () => {
    setFollowed(() => []);
  };

  const onFollow = (pubkey: string) => {
    setFollowed(followed.length, () => pubkey);
  }

  const onUnfollow = (pubkey: string) => {
    const follows = followed.filter(f => f !== pubkey)
    setFollowed(() => [...follows]);
  }

  return (

    <div class={styles.container}>
      <PageTitle title={intl.formatMessage(tAccount.create.title)} />

      <PageCaption title={intl.formatMessage(tAccount.create.title)} />

      <div class={['name', 'info'].includes(currentStep()) ? '' : 'invisible'}>
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
                </div>
              }
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

          <Show
            when={currentStep() === 'name'}
            fallback={
              <div class={styles.blankActions}></div>
            }
          >
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
          </Show>
        </div>
      </div>

      <form onSubmit={onSubmit}>
        <div class={currentStep() === 'name' ? '' : 'invisible'}>
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
              ref={nameInput}
              class={styles.inputWithPrefix}
              placeholder={intl.formatMessage(tSettings.profile.name.placeholder)}
              value={profile?.userProfile?.name || ''}
              onInput={onNameInput}
            />
          </div>
          <Show when={!isNameValid()}>
            <div class={styles.inputError}>
              {intl.formatMessage(tSettings.profile.name.error)}
            </div>
          </Show>

          <div class={styles.inputLabel}>
            <label for='displayName'>{intl.formatMessage(tSettings.profile.displayName.label)}</label>
          </div>
          <input
            name='displayName'
            type='text'
            placeholder={intl.formatMessage(tSettings.profile.displayName.placeholder)}
            value={profile?.userProfile?.displayName || profile?.userProfile?.display_name || ''}
          />

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
        </div>

        <div class={currentStep() === 'info' ? '' : 'invisible'}>
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
        </div>

        <div class={currentStep() === 'follow' ? '' : 'invisible'}>
          <div class={styles.recomendedFollowsCaption}>
            <div class={styles.caption}>
              {intl.formatMessage(tAccount.prominentNostriches)}
            </div>
            <div class={styles.action}>

              <Show
                when={isFollowingAllProminent()}
                fallback={
                  <ButtonSecondary onClick={onFollowProminent}>
                    <span>{intl.formatMessage(tAccount.followAll)}</span>
                  </ButtonSecondary>
                }
              >
                <ButtonTertiary onClick={onUnfollowProminent}>
                  {intl.formatMessage(tAccount.unfollowAll)}
                </ButtonTertiary>
              </Show>
            </div>
          </div>
          <div>
            <For each={search?.users}>
              {user => (
                <div class={styles.userToFollow}>
                  <div class={styles.info}>
                    <Avatar user={user} />
                    <div class={styles.nameAndNip05}>
                      <div class={styles.name}>
                        {user.name}
                      </div>
                      <div class={styles.nip05}>
                        {nip05Verification(user)}
                      </div>
                    </div>
                  </div>
                  <div class={styles.action}>
                    <Show
                      when={followed.includes(user.pubkey)}
                      fallback={
                        <ButtonSecondary onClick={() => onFollow(user.pubkey)}>
                          {intl.formatMessage(tAccount.follow)}
                        </ButtonSecondary>
                      }
                    >
                      <ButtonTertiary onClick={() => onUnfollow(user.pubkey)}>
                        {intl.formatMessage(tAccount.unfollow)}
                      </ButtonTertiary>
                    </Show>
                  </div>
                </div>
              )}
            </For>
          </div>
        </div>

        <div class={styles.formSubmit}>
          <Show when={currentStep() !== 'name'}>
            <button
              type='button'
              class={styles.secondaryButton}
              onClick={toPrevious}
            >
              <div>
                <span>
                  {intl.formatMessage(tActions.previous)}
                </span>
              </div>
            </button>
          </Show>
          <Show
            when={currentStep() === 'follow'}
            fallback={
              <button
                type='button'
                class={styles.primaryButton}
                disabled={currentStep() === 'name' && !isNameValid()}
                onClick={toNext}
              >
                {intl.formatMessage(tActions.next)}
              </button>
            }
          >
            <button
              type='submit'
              class={styles.primaryButton}
              disabled={!isNameValid()}
            >
              {intl.formatMessage(tActions.finish)}
            </button>
          </Show>
          <button
            type='button'
            class={styles.secondaryButton}
            onClick={clearNewAccount}
          >
            <div>
              <span>{intl.formatMessage(tActions.cancel)}</span>
            </div>
          </button>
        </div>
      </form>

      <CreatePinModal
          open={showCreatePin()}
          onAbort={() => {
            onStoreSec(createdAccount.sec);
          }}
          valueToEncrypt={createdAccount.sec}
          onPinApplied={onStoreSec}
        />
    </div>
  );
}

export default CreateAccount;
