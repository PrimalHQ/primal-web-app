import { useIntl } from '@cookbook/solid-intl';
import { useNavigate } from '@solidjs/router';
import { Component, createEffect, createMemo, createSignal, For, Match, onMount, Show, Switch } from 'solid-js';
import { APP_ID } from '../App';
import Avatar from '../components/Avatar/Avatar';
import Loader from '../components/Loader/Loader';
import PageCaption from '../components/PageCaption/PageCaption';
import PageTitle from '../components/PageTitle/PageTitle';
import { useToastContext } from '../components/Toaster/Toaster';
import { usernameRegex, Kind, suggestedUsersToFollow } from '../constants';
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
import { NostrMediaUploaded, NostrRelays, NostrUserContent, PrimalUser, UserCategory } from '../types/primal';

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
import { convertToUser, nip05Verification, userName } from '../stores/profile';
import { subscribeTo } from '../sockets';
import { arrayMerge } from '../utils';
import { stringStyleToObject } from '@solid-primitives/props';

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

  const [accountName, setAccountName] = createSignal('');
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

    setAccountName(() => value);
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

    const form = e.target as HTMLFormElement;

    const data = new FormData(form);

    const name = data.get('name')?.toString() || '';

    if (!usernameRegex.test(name)) {
      toast?.sendWarning(intl.formatMessage(tSettings.profile.name.formError));
      return false;
    }

    let relaySettings = account.defaultRelays.reduce((acc, r) => ({ ...acc, [r]: { write: true, read: true }}), {});

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
      await (new Promise((res) => setTimeout(() => res(true), 100)));

      toast?.sendSuccess(intl.formatMessage(tToast.updateProfileSuccess));
      pubkey && getUserProfiles([pubkey], `user_profile_${APP_ID}`);

      const tags = followed.map(pk => ['p', pk]);
      const relayInfo = JSON.stringify(relaySettings);
      const date = Math.floor((new Date()).getTime() / 1000);

      const { success: succ } = await sendContacts(tags, date, relayInfo, account.relays, relaySettings);

      if (succ) {
        getProfileContactList(account?.publicKey, `user_contacts_${APP_ID}`);
      }

      form.reset();

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

  type SuggestedUserData = {
    users: Record<string, PrimalUser>,
    groupNames: string[],
    groups: Record<string, string[]>,
  }

  const [suggestedData, setSuggestedData] = createStore<SuggestedUserData>({
    users: {},
    groupNames: [],
    groups: {},
  });

  const getSugestedUsers = () => {
    const subId = `get_suggested_users_${APP_ID}`;

    const unsub = subscribeTo(subId, (type, _, content) => {
      if (type === 'EVENT') {
        if (content?.kind === Kind.SuggestedUsersByCategory) {
          const list = JSON.parse(content.content);
          let groups: Record<string, string[]> = {};

          for(let i=0; i<list.length; i++) {
            const item = list[i];

            groups[item.group] = [ ...item.members.map((u: { pubkey: string }) => u.pubkey) ];
          }

          setSuggestedData('groups', () => ({...groups}));
          setSuggestedData('groupNames', () => Object.keys(groups));
        }

        if (content?.kind === Kind.Metadata) {
          const userData = content as NostrUserContent;
          const user = convertToUser(userData);

          !followed.includes(user.pubkey) && setFollowed(followed.length, user.pubkey);
          setSuggestedData('users', () => ({ [user.pubkey]: { ...user }}))
        }
      }

      if (type === 'EOSE') {
        unsub();
      }
    });

    getSuggestions(subId);
  };

  onMount(() => {
    const { sec, pubkey } = generateKeys(true);

    const nsec = hexToNsec(sec);

    account?.actions.setSec(nsec);
    setTempNsec(nsec);

    setCreatedAccount(() => ({ sec: nsec, pubkey }));
    getSugestedUsers();
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

  const isFollowingAllInGroup = (group: string) => {
    const pubkeys = suggestedData.groups[group] || [];
    return !pubkeys.some((p) => !followed.includes(p));
  };

  const onFollowGroup = (group: string) => {
    const pubkeys = suggestedData.groups[group] || [];
    let newFollows = pubkeys.filter(p => !followed.includes(p));
    setFollowed((fs) => [ ...fs, ...newFollows ]);
  };

  const onUnfollowGroup = (group: string) => {
    const pubkeys = suggestedData.groups[group] || [];

    const newFollows = followed.filter(p => !pubkeys.includes(p));

    setFollowed(() => [ ...newFollows ]);
  };

  const onFollow = (pubkey: string) => {
    setFollowed(followed.length, () => pubkey);
  }

  const onUnfollow = (pubkey: string) => {
    const follows = followed.filter(f => f !== pubkey);
    setFollowed(() => [...follows]);
  }

  const suggestedUser = (pubkey: string) => suggestedData.users[pubkey];

  return (

    <div class={styles.container}>
      <PageTitle title={intl.formatMessage(tAccount.create.title)} />

      <PageCaption title={intl.formatMessage(tAccount.create.title)} />

      <div class={['name', 'info'].includes(currentStep()) ? '' : 'invisible'}>
        <div id="central_header" class={styles.fullHeader}>
          <Switch>
            <Match when={currentStep() === 'name'}>
              <div class={styles.stepIntro}>
                {intl.formatMessage(tAccount.create.descriptions.step_one)}
              </div>
            </Match>
            <Match when={currentStep() === 'info'}>
              <div class={styles.stepIntro}>
                {intl.formatMessage(tAccount.create.descriptions.step_two)}
              </div>
            </Match>
          </Switch>
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
              onInput={onNameInput}
            />
          </div>
          <Show when={accountName().length > 0 && !isNameValid()}>
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
          />

          <div class={styles.inputLabel}>
            <label for='about'>{intl.formatMessage(tSettings.profile.about.label)}</label>
          </div>
          <textarea
            name='about'
            placeholder={intl.formatMessage(tSettings.profile.about.placeholder)}
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
          />

          <div class={styles.inputLabel}>
            <label for='nip05'>{intl.formatMessage(tSettings.profile.nip05.label)}</label>
          </div>
          <input
            name='nip05'
            type='text'
            placeholder={intl.formatMessage(tSettings.profile.nip05.placeholder)}
          />
        </div>


        <div class={currentStep() === 'follow' ? '' : 'invisible'}>
          <div class={styles.stepIntro}>
            {intl.formatMessage(tAccount.create.descriptions.step_three)}
          </div>
          <div class={styles.suggestions}>
            <For each={suggestedData.groupNames}>
              {(groupName) => (
                <>
                  <div class={styles.recomendedFollowsCaption}>
                    <div class={styles.caption}>
                      {groupName}
                    </div>
                    <div class={styles.action}>

                      <Show
                        when={isFollowingAllInGroup(groupName)}
                        fallback={
                          <ButtonSecondary onClick={() => onFollowGroup(groupName)}>
                            <span>{intl.formatMessage(tAccount.followAll)}</span>
                          </ButtonSecondary>
                        }
                      >
                        <ButtonTertiary onClick={() => onUnfollowGroup(groupName)}>
                          {intl.formatMessage(tAccount.unfollowAll)}
                        </ButtonTertiary>
                      </Show>
                    </div>
                  </div>

                  <div class={styles.suggestedUsers}>
                    <For each={suggestedData.groups[groupName]}>
                      {pubkey => (
                        <div class={styles.userToFollow}>
                          <div class={styles.info}>
                            <Avatar user={suggestedUser(pubkey)} />
                            <div class={styles.nameAndNip05}>
                              <div class={styles.name}>
                                {userName(suggestedUser(pubkey))}
                              </div>
                              <div class={styles.nip05}>
                                {nip05Verification(suggestedUser(pubkey))}
                              </div>
                            </div>
                          </div>
                          <div class={styles.action}>
                            <Show
                              when={followed.includes(pubkey)}
                              fallback={
                                <ButtonSecondary onClick={() => onFollow(pubkey)}>
                                  {intl.formatMessage(tAccount.follow)}
                                </ButtonSecondary>
                              }
                            >
                              <ButtonTertiary onClick={() => onUnfollow(pubkey)}>
                                {intl.formatMessage(tAccount.unfollow)}
                              </ButtonTertiary>
                            </Show>
                          </div>
                        </div>
                      )}
                    </For>
                  </div>
                </>
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
