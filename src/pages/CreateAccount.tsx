import { useIntl } from '@cookbook/solid-intl';
import { useNavigate } from '@solidjs/router';
import { Component, createEffect, createSignal, For, Match, onCleanup, onMount, Show, Switch } from 'solid-js';
import { APP_ID } from '../App';
import Avatar from '../components/Avatar/Avatar';
import PageCaption from '../components/PageCaption/PageCaption';
import PageTitle from '../components/PageTitle/PageTitle';
import { useToastContext } from '../components/Toaster/Toaster';
import { usernameRegex, Kind } from '../constants';
import { useAccountContext } from '../contexts/AccountContext';
import { useMediaContext } from '../contexts/MediaContext';
import { useProfileContext } from '../contexts/ProfileContext';
import { getProfileContactList, getRelays, getSuggestions, getUserProfiles, sendProfile, sendRelays } from '../lib/profile';
import {
  actions as tActions,
  account as tAccount,
  settings as tSettings,
  toast as tToast,
  upload as tUpload,
} from '../translations';
import { NostrRelays, NostrUserContent, PrimalUser } from '../types/primal';

import styles from './CreateAccount.module.scss';
import { createStore, reconcile } from 'solid-js/store';
import { generateKeys, setTempNsec } from '../lib/PrimalNostr';
import { hexToNsec } from '../lib/keys';
import { storeSec } from '../lib/localStore';
import CreatePinModal from '../components/CreatePinModal/CreatePinModal';
import { useSearchContext } from '../contexts/SearchContext';
import { sendContacts, triggerImportEvents } from '../lib/notes';
import ButtonSecondary from '../components/Buttons/ButtonSecondary';
import { convertToUser, nip05Verification, userName } from '../stores/profile';
import { subsTo } from '../sockets';
import ButtonPrimary from '../components/Buttons/ButtonPrimary';
import ButtonFlip from '../components/Buttons/ButtonFlip';
import Uploader from '../components/Uploader/Uploader';
import { useSettingsContext } from '../contexts/SettingsContext';
import UploaderBlossom from '../components/Uploader/UploaderBlossom';

type AutoSizedTextArea = HTMLTextAreaElement & { _baseScrollHeight: number };

const CreateAccount: Component = () => {  const intl = useIntl();
  const profile = useProfileContext();
  const media = useMediaContext();
  const account = useAccountContext();
  const search = useSearchContext();
  const toast = useToastContext();
  const settings = useSettingsContext();
  const navigate = useNavigate();

  let textArea: HTMLTextAreaElement | undefined;
  let fileUploadAvatar: HTMLInputElement | undefined;
  let fileUploadBanner: HTMLInputElement | undefined;
  let nameInput: HTMLInputElement | undefined;

  const [isBannerCached, setIsBannerCached] = createSignal(false);
  const [isMoreVisible, setIsMoreVisible] = createSignal(false);

  const [avatarPreview, setAvatarPreview] = createSignal<string>();
  const [bannerPreview, setBannerPreview] = createSignal<string>();

  const [accountName, setAccountName] = createSignal('');
  const [isNameValid, setIsNameValid] = createSignal<boolean>(false);

  const [fileToUpload, setFileToUpload] = createSignal<File | undefined>();
  const [uploadTarget, setUploadTarget] = createSignal<'picture' | 'banner' | 'none'>('none');
  const [openSockets, setOpenSockets] = createSignal(false);

  createEffect(() => {
    setOpenSockets(() => currentStep() === 'name');
  });

  onCleanup(() => {
    setOpenSockets(false);
  });

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

  const resetUpload = () => {
    if (fileUploadAvatar) {
      fileUploadAvatar.value = '';
    }

    if (fileUploadBanner) {
      fileUploadBanner.value = '';
    }

    setFileToUpload(undefined);
    setUploadTarget('none');
  };

  const onUpload = (target: 'picture' | 'banner', fileUpload: HTMLInputElement | undefined) => {

    if (!fileUpload) {
      return;
    }

    const file = fileUpload.files ? fileUpload.files[0] : null;

    if (file) {
      setUploadTarget(target);
      setFileToUpload(file);
    }
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

    let relaySettings = account.defaultRelays.reduce<NostrRelays>((acc, r) => ({ ...acc, [r]: { write: true, read: true }}), {});

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

    const { success } = await sendProfile({ ...metadata }, account?.proxyThroughPrimal || false, account.relays, relaySettings);

    if (success) {
      await (new Promise((res) => setTimeout(() => res(true), 100)));

      toast?.sendSuccess(intl.formatMessage(tToast.updateProfileSuccess));
      pubkey && account.actions.updateAccountProfile(pubkey);
      // pubkey && getUserProfiles([pubkey], `user_profile_${APP_ID}`);

      let tags = followed.map(pk => ['p', pk]);
      const date = Math.floor((new Date()).getTime() / 1000);

      if (pubkey) {
        // Follow himself
        tags.push(['p', pubkey]);
      }

      const sendResult = await sendContacts(tags, date, '', account.proxyThroughPrimal, account.relays, relaySettings);

      if (sendResult.success && sendResult.note) {
        triggerImportEvents([sendResult.note], `import_contacts_${APP_ID}`, () => {
          account.actions.updateContactsList()
          // getProfileContactList(pubkey, `user_contacts_${APP_ID}`);
        });
      }

      const relayResult = await sendRelays(account.relays, relaySettings, account.proxyThroughPrimal);

      if (relayResult.success && relayResult.note) {
        triggerImportEvents([relayResult.note], `import_relays_${APP_ID}`, () => {
          // getRelays(pubkey, `user_relays_${APP_ID}`);
          account.actions.updateRelays()
        });
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

    let foll: string[] = [];

    const unsub = subsTo(subId, {
      onEvent: (_, content) => {
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
          const user = convertToUser(userData, content.pubkey);

          if (!followed.includes(user.pubkey)) {
            foll.push(user.pubkey);
            // setFollowed(followed.length, user.pubkey);
          }
          setSuggestedData('users', () => ({ [user.pubkey]: { ...user }}))
        }
      },
      onEose: () => {
        unsub();
        setFollowed(() => [...foll]);
      },
    });

    getSuggestions(subId);
  };

  onMount(() => {
    const { sec, pubkey } = generateKeys(true);

    // @ts-ignore
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
    navigate('/home');
  }

  const onAbort = () => {
    setShowCreatePin(false);
  }

  const clearNewAccount = () => {
    account?.actions.setSec(undefined);
    setTempNsec(undefined);
    setCreatedAccount(reconcile({}));
    navigate('/home');
  }

  const [followed, setFollowed] = createStore<string[]>([])

  const isFollowingAllInGroup = (group: string) => {
    const pubkeys = suggestedData.groups[group] || [];
    return !pubkeys.some((p) => !followed.includes(p));
  };

  const toggleFollowGroup = (group: string) => {
    if (isFollowingAllInGroup(group)) {
      onUnfollowGroup(group);
    }
    else {
      onFollowGroup(group)
    }
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

  const toggleFollowAccount = (pubkey: string) => {
    if (followed.includes(pubkey)) {
      onUnfollow(pubkey);
    }
    else {
      onFollow(pubkey);
    }
  }

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

      <div class={styles.creationContent}>
        <div class={styles.stepIndicator}>
          <div class={`${styles.indicate} ${styles.light}`}></div>
          <div class={`${styles.indicate} ${currentStep() !== 'name' ? styles.light : styles.dark}`}></div>
          <div class={`${styles.indicate} ${currentStep() === 'follow' ? styles.light : styles.dark}`}></div>
        </div>
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
              <Show when={fileToUpload() !== undefined}>
                <div class={styles.uploadingOverlay}></div>
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
                <Show when={fileToUpload() !== undefined}>
                  <div class={styles.uploadingOverlay}></div>
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
                <div class={styles.uploader}>
                  <UploaderBlossom
                    hideLabel={true}
                    publicKey={account?.publicKey}
                    file={fileToUpload()}
                    onFail={() => {
                      toast?.sendWarning(intl.formatMessage(tUpload.fail, {
                        file: fileToUpload()?.name,
                      }));
                      resetUpload();
                    }}
                    onRefuse={(reason: string) => {
                      if (reason === 'file_too_big_100') {
                        toast?.sendWarning(intl.formatMessage(tUpload.fileTooBigRegular));
                      }
                      if (reason === 'file_too_big_1024') {
                        toast?.sendWarning(intl.formatMessage(tUpload.fileTooBigPremium));
                      }
                      resetUpload();
                    }}
                    onCancel={() => {
                      resetUpload();
                    }}
                    onSuccsess={(url:string) => {
                      if (uploadTarget() === 'picture') {
                        setAvatarPreview(url);
                      }

                      if (uploadTarget() === 'banner') {
                        setBannerPreview(url);
                      }

                      resetUpload();
                    }}
                  />
                </div>
                <div>
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
            </Show>
          </div>
        </div>

        <form onSubmit={onSubmit}>
          <div class={currentStep() === 'name' ? '' : 'invisible'}>
            <div class={styles.inputLabel}>
              <label for='name'>
                {intl.formatMessage(tSettings.profile.name.label)}
                <span class={styles.help}>
                  {intl.formatMessage(tSettings.profile.name.help)}
                </span>
              </label>
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
              <label for='displayName'>
                {intl.formatMessage(tSettings.profile.displayName.label)}
                <span class={styles.help}>
                  {intl.formatMessage(tSettings.profile.displayName.help)}
                </span>
              </label>
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
            />

            <div class={styles.inputLabel}>
              <label for='nip05'>{intl.formatMessage(tSettings.profile.nip05.label)}</label>
            </div>
            <input
              name='nip05'
              type='text'
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
                        <ButtonFlip
                          when={isFollowingAllInGroup(groupName)}
                          fallback={intl.formatMessage(tAccount.followAll)}
                          onClick={() => toggleFollowGroup(groupName)}
                        >
                          {intl.formatMessage(tAccount.unfollowAll)}
                        </ButtonFlip>
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
                              <ButtonFlip
                                when={followed.includes(pubkey)}
                                fallback={intl.formatMessage(tAccount.follow)}
                                onClick={() => toggleFollowAccount(pubkey)}
                              >
                                {intl.formatMessage(tAccount.unfollow)}
                              </ButtonFlip>
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
            <Show when={currentStep() === 'info'}>
              <ButtonSecondary
                onClick={toPrevious}
              >
                {intl.formatMessage(tActions.previous)}
              </ButtonSecondary>
            </Show>
            <Show
              when={currentStep() === 'follow'}
              fallback={
                <ButtonPrimary
                  disabled={currentStep() === 'name' && !isNameValid()}
                  onClick={toNext}
                >
                  {intl.formatMessage(tActions.next)}
                </ButtonPrimary>
              }
            >
              <ButtonPrimary
                type="submit"
                disabled={!isNameValid()}
              >
                {intl.formatMessage(tActions.finish)}
              </ButtonPrimary>
            </Show>
            <Show when={currentStep() !== 'follow'}>
              <ButtonSecondary
                onClick={clearNewAccount}
              >
                {intl.formatMessage(tActions.cancel)}
              </ButtonSecondary>
            </Show>
          </div>
        </form>

      </div>


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
