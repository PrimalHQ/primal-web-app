import { useIntl } from '@cookbook/solid-intl';
import { Component, createEffect, Match, on, onCleanup, onMount, Show, Switch } from 'solid-js';
import PageCaption from '../../components/PageCaption/PageCaption';
import PageTitle from '../../components/PageTitle/PageTitle';
import Wormhole from '../../components/Wormhole/Wormhole';

import { premium as t, toast as tToast } from '../../translations';

import styles from './Premium.module.scss';
import Search from '../../components/Search/Search';
import { A, useNavigate, useParams } from '@solidjs/router';
import TextInput from '../../components/TextInput/TextInput';
import { createStore } from 'solid-js/store';
import { NostrEOSE, NostrEvent, NostrEventContent, NostrEventType, PrimalUser } from '../../types/primal';
import { APP_ID } from '../../App';
import { changePremiumName, sendPremiumNameCheck, getPremiumQRCode, getPremiumStatus, startListeningForPremiumPurchase, stopListeningForPremiumPurchase, isPremiumNameAvailable, fetchExchangeRate, stopListeningForLegendPurchase, startListeningForLegendPurchase, getLegendQRCode, getPremiumMediaStats, getOrderListHistory, LegendCustomizationConfig, setLegendCutumization } from '../../lib/premium';
import ButtonPremium from '../../components/Buttons/ButtonPremium';
import PremiumSummary from './PremiumSummary';
import { useAccountContext } from '../../contexts/AccountContext';
import PremiumSubscriptionOptions, { PremiumOption } from './PremiumSubscriptionOptions';
import PremiumProfile from './PremiumProfile';
import PremiumSubscribeModal from './PremiumSubscribeModal';
import PremiumHighlights from './PremiumHighlights';
import { sendProfile } from '../../lib/profile';
import PremiumSuccessModal from './PremiumSuccessModal';
import Loader from '../../components/Loader/Loader';
import PremiumStatusOverview from './PremiumStatusOverview';
import StickySidebar from '../../components/StickySidebar/StickySidebar';
import ButtonSecondary from '../../components/Buttons/ButtonSecondary';
import Avatar from '../../components/Avatar/Avatar';
import { hexToNpub } from '../../lib/keys';
import { truncateNpub } from '../../stores/profile';
import { getExchangeRate } from '../../lib/membership';
import { logError, logInfo } from '../../lib/logger';
import PremiumFeaturesDialog from './PremiumFeaturedDialog';
import ButtonLink from '../../components/Buttons/ButtonLink';
import { socket, subsTo } from '../../sockets';
import { fetchUserProfile } from '../../handleNotes';
import PremiumChangeRecipientDialog from './PremiumChangeRecipientDialog';
import PremiumPromoCodeDialog from './PremiumPromoCodeDialog';
import PremiumSidebarInactve from './PremiumSidebarInactive';
import PremiumSidebarActive from './PremiumSidebarActive';
import PremiumRenameDialog from './PremiumRenameDialog';
import PremiumRenewModal from './PremiumRenewModal';
import PremiumSupport from './PremiumSupport';
import PremiumLegend from './PremiumLegend';
import PremiumBecomeLegend from './PremiumBecomeLegend';
import { Kind } from '../../constants';
import PremiumLegendModal from './PremiumLegendModal';
import PremiumRelay from './PremiumRelay';
import PremiumMediaManagment from './PremiumMediaManagment';
import PremiumContactBackup from './PremiumContactBackup';
import PremiumContentBackup from './PremiumContentBackup';
import PremiumCustomLegend from './PremiumCustomLegend';
import PremiumOrderHistoryModal from './PremiumOrderHistoryModal';
import { updateStore } from '../../services/StoreService';
import { emptyPaging, PaginationInfo } from '../../megaFeeds';
import { useToastContext } from '../../components/Toaster/Toaster';
import { triggerImportEvents } from '../../lib/notes';
import { useAppContext } from '../../contexts/AppContext';

export const satsInBTC = 100_000_000;

export type OrderHistoryItem = {
  purchased_at: number,
  product_id: string,
  product_label: string,
  amount_btc: string,
  amount_usd: string,
  currency: string,
}

export type PrimalPremiumSubscription = {
  lnUrl: string,
  membershipId: string,
  amounts: {
    usd: number,
    sats: number,
  },
};

export type PremiumStore = {
  name: string,
  rename: string,
  nameAvailable: boolean,
  errorMessage: string,
  subOptions: PremiumOption[],
  selectedSubOption: PremiumOption,
  openSubscribe: boolean,
  openSuccess: boolean,
  successMessage: string,
  openAssignPubkey: boolean,
  openPromoCode: boolean,
  openRename: boolean,
  openRenew: boolean,
  openOrderHistory: boolean,
  openFeatures: 'features' | 'faq' | undefined,
  openLegend: boolean,
  subscriptions: Record<string, PrimalPremiumSubscription>,
  membershipStatus: PremiumStatus,
  recipientPubkey: string | undefined,
  recipient: PrimalUser | undefined,
  promoCode: string,
  isSocketOpen: boolean,
  exchangeRateUSD: number,
  legendAmount: number,
  legendSupscription: PrimalPremiumSubscription,
  orderHistory: OrderHistoryItem[],
  pagingOrderHistory: PaginationInfo,
}

export type PremiumStatus = {
  pubkey?: string,
  tier?: string,
  name?: string,
  rename?: string,
  nostr_address?: string,
  lightning_address?: string,
  primal_vip_profile?: string,
  used_storage?: number,
  expires_on?: number,
  cohort_1?: string,
  cohort_2?: string,
  recurring?: boolean,
  renews_on?: number | null,
};

const availablePremiumOptions: PremiumOption[] = [
  { id: '3-months-premium', price: 'm7', duration: 'm3' },
  { id: '12-months-premium', price: 'm6', duration: 'm12' },
];

const Premium: Component = () => {
  const intl = useIntl();
  const account = useAccountContext();
  const params = useParams();
  const navigate = useNavigate();
  const toast = useToastContext();
  const app = useAppContext();

  let nameInput: HTMLInputElement | undefined;
  let renameInput: HTMLInputElement | undefined;

  let premiumSocket: WebSocket | undefined;

  const [premiumData, setPremiumData] = createStore<PremiumStore>({
    name: '',
    rename: '',
    nameAvailable: true,
    errorMessage: '',
    subOptions: [ ...availablePremiumOptions ],
    selectedSubOption: { ...availablePremiumOptions[0] },
    openSubscribe: false,
    openSuccess: false,
    successMessage: '',
    openAssignPubkey: false,
    openPromoCode: false,
    openRename: false,
    openRenew: false,
    openLegend: false,
    openOrderHistory: false,
    openFeatures: undefined,
    subscriptions: {},
    membershipStatus: {},
    recipientPubkey: undefined,
    recipient: undefined,
    promoCode: '',
    isSocketOpen: false,
    exchangeRateUSD: 0,
    legendAmount: 0,
    legendSupscription: {
      lnUrl: '',
      membershipId: '',
      amounts: {
        usd: 0,
        sats: 0,
      },
    },
    orderHistory: [],
    pagingOrderHistory: { ...emptyPaging() },
  });

  // const setPremiumStatus = async () => {
  //   const isVerified = await isVerifiedByPrimal(account?.activeUser);

  //   setIsPremium(() => isVerified);
  // }

  const getRecipientUser = async (pubkey: string) => {
    const subId = `recipient_${APP_ID}`;

    const user = await fetchUserProfile(account?.publicKey, premiumData.recipientPubkey, subId);

    if (user) {
      setPremiumData('recipient', () => ({ ...user }));
    }
  }

  const subOptionCaption = () => {
    return premiumData.selectedSubOption.id.split('-')[0] || '0';
  }

  const onStartAction = () => {
    navigate('/premium/name');
  };

  const setName = (name: string) => {
    setPremiumData('errorMessage', () => '');
    setPremiumData('name', () => name);
  };

  const updateUserMetadata = async (option?: 'nip05' | 'lud16') => {
    const user = account?.activeUser;

    if (!user) return;

    const shouldUpdateNip05 = user.nip05.endsWith('@primal.net');
    const shouldUpdateLud16 = user.lud16.endsWith('@primal.net');

    if (!shouldUpdateLud16 && !shouldUpdateNip05) return;

    let metaUpdate: {nip05?: string, lud16?: string} = {
      nip05: user.nip05,
      lud16: user.lud16,
    };

    const nip05 = `${premiumData.name}@primal.net`;
    const lud16 = `${`${premiumData.name}@primal.net`}`;

    if (shouldUpdateNip05 && (!option || option === 'nip05')) {
      metaUpdate.nip05 = nip05;
    }

    if (shouldUpdateLud16 && (!option || option === 'lud16')) {
      metaUpdate.lud16 = lud16;
    }

    if (metaUpdate.lud16 === user.lud16 && metaUpdate.nip05 === user.nip05) return;

    const { success, note } = await sendProfile({ ...user, ...metaUpdate }, account.proxyThroughPrimal,  account.activeRelays, account.relaySettings);

    if (success) {
      note && triggerImportEvents([note], `import_profile_${APP_ID}`, () => {
        account.publicKey && account.actions.updateAccountProfile(account.publicKey);
        toast?.sendSuccess(intl.formatMessage(tToast.updateProfileSuccess));
      });
      return;
    }
  }

  const checkName = async () => {
    if (!premiumSocket) return;

    if (premiumData.name.length < 3) {
      setPremiumData('errorMessage', () => intl.formatMessage(t.errors.nameTooShort));
      return;
    }

    const subId = `name_check_${APP_ID}`;

    let isAvailable = false;

    try {
      isAvailable = await isPremiumNameAvailable(premiumData.name, account?.publicKey, premiumSocket, subId);
    } catch (e: any) {
      isAvailable = false;
      logError('ERROR while checking premium name availability: ', e);
    }

    setPremiumData('nameAvailable', () => isAvailable);

    if (isAvailable) {
      navigate('/premium/overview');
    } else {
      setPremiumData('errorMessage', () => intl.formatMessage(t.errors.nameUnavailable));
    }
  };

  const changePrimalName = (newName: string) => {
    if (!premiumSocket) return;

    const subid = `rename_${APP_ID}`;

    if (newName.length < 3) {
      setPremiumData('errorMessage', () => intl.formatMessage(t.errors.nameTooShort));
      return;
    }

    const unsub = subTo(premiumSocket, subid, (type, _, content) => {
      if (type === 'EVENT') {
        const response: { available: boolean } = JSON.parse(content?.content || '{ "available": false}');

        if (!response.available) {
          unsub();
          setPremiumData('errorMessage', () => intl.formatMessage(t.errors.nameUnavailable));
        } else {
          setPremiumData('name', () => newName);
        }
      }

      if (type === 'NOTICE') {
        unsub();
        setPremiumData('errorMessage', () => intl.formatMessage(t.errors.nameNotChanged));
      }

      if (type === 'EOSE') {
        unsub();
      }
    });

    changePremiumName(newName, subid, premiumSocket);
  };

  let purchuseMonitorUnsub: () => void = () => {};
  const purchuseSubId = `pay_${APP_ID}`;
  const purchuseLegendSubId = (mId: string) => `pay_legend_${mId}_${APP_ID}`;

  const listenForPayement = () => {
    if (!premiumSocket) return;

    purchuseMonitorUnsub = subTo(premiumSocket, purchuseSubId, (type, _, content) => {
      if (type === 'EVENT') {
        const cont: {
          completed_at: number | null,
        } = JSON.parse(content?.content || '{ "completed_at": null }');

        if (!premiumSocket) return;

        if (cont.completed_at !== null) {
          stopListeningForPremiumPurchase(purchuseSubId, premiumSocket);
          purchuseMonitorUnsub();
          updateUserMetadata();
          setPremiumData('openSubscribe', () => false);
          setPremiumData('openSuccess', () => true);
          setPremiumData('successMessage', () => intl.formatMessage(t.subOptions.success[premiumData.selectedSubOption.duration]));
        }
      }

      if (type === 'EOSE') {
      }
    });

    const membershipId = premiumData.subscriptions[premiumData.selectedSubOption.id].membershipId;

    startListeningForPremiumPurchase(membershipId, purchuseSubId, premiumSocket);
  }

  const listenForLegendPayement = () => {
    const membershipId = premiumData.legendSupscription.membershipId;
    if (!premiumSocket || membershipId.length === 0) return;

    purchuseMonitorUnsub = subTo(premiumSocket, purchuseLegendSubId(membershipId), (type, _, content) => {

      if (type === 'EVENT') {
        const cont: {
          completed_at: number | null,
        } = JSON.parse(content?.content || '{ "completed_at": null }');

        if (!premiumSocket) return;

        if (cont.completed_at !== null) {
          stopListeningForLegendPurchase(purchuseLegendSubId(membershipId), premiumSocket);
          purchuseMonitorUnsub();
          updateUserMetadata();
          setPremiumData('openLegend', () => false);
          setPremiumData('openSuccess', () => true);
          setPremiumData('successMessage', () => intl.formatMessage(t.subOptions.success.legend));
        }
      }

      if (type === 'EOSE') {
      }
    });


    startListeningForLegendPurchase(membershipId, purchuseLegendSubId(membershipId), premiumSocket);
  }

  const getSubscriptionInfo = () => {
    return new Promise((resolve) => {
      premiumData.subOptions.forEach(option => {
        if (!premiumSocket) return;

        const subId = `qr__${option.id}_${APP_ID}`;
        const unsub = subTo(premiumSocket, subId, (type, _, content) => {
          if (type === 'EVENT') {
            const cont: {
              qr_code?: string,
              membership_quote_id?: string,
              amount_usd?: string,
              amount_btc?: string,
            } = JSON.parse(content?.content || '{}');

            const usd = parseFloat(cont.amount_usd || '0');
            const btc = parseFloat(cont.amount_btc || '0');

            setPremiumData('subscriptions', option.id, () => ({
              lnUrl:  cont.qr_code || '',
              membershipId: cont.membership_quote_id || '',
              amounts: {
                usd: isNaN(usd) ? 0 : usd,
                sats: isNaN(btc) ? 0 : btc * 100_000_000,
              },
            }));
          }

          if (type === 'EOSE') {
            unsub();
            resolve(true);
          }
        });

        getPremiumQRCode(premiumData.recipientPubkey, premiumData.name, option.id, subId, premiumSocket)

      });
    });
  };


  const getLegendInfo = () => {
    if (!premiumSocket) return;

    const subId = `qr__legend_${APP_ID}`;
    const unsub = subTo(premiumSocket, subId, (type, _, content) => {
      if (type === 'EVENT') {
        const cont: {
          qr_code?: string,
          membership_quote_id?: string,
          amount_usd?: string,
          amount_btc?: string,
        } = JSON.parse(content?.content || '{}');

        const usd = parseFloat(cont.amount_usd || '0');
        const btc = parseFloat(cont.amount_btc || '0');

        setPremiumData('legendSupscription', () => ({
          lnUrl:  cont.qr_code || '',
          membershipId: cont.membership_quote_id || '',
          amounts: {
            usd: isNaN(usd) ? 0 : usd,
            sats: isNaN(btc) ? 0 : btc * 100_000_000,
          },
        }))
      }

      if (type === 'EOSE') {
        unsub();
      }
    });

    getLegendQRCode(premiumData.recipientPubkey, premiumData.name, premiumData.legendAmount, subId, premiumSocket)
  };

  const checkPremiumStatus = () => {
    if (!premiumSocket || premiumSocket.readyState !== WebSocket.OPEN) return;

    const subId = `ps_${APP_ID}`;

    let gotEvent = false;

    const unsub = subTo(premiumSocket, subId, (type, _, content) => {
      if (type === 'EVENT') {
        const status: PremiumStatus = JSON.parse(content?.content || '{}');

        gotEvent = true;
        setPremiumData('membershipStatus', () => ({ ...status }));
        status.name && setPremiumData('name', status.name)
      }

      if (type === 'EOSE') {
        unsub();

        if (!gotEvent) {
          setPremiumData('membershipStatus', () => ({ tier: 'free' }));
        }
      }
    });
    getPremiumStatus(premiumData.recipientPubkey, subId, premiumSocket)
  };

  const subTo = (socket: WebSocket, subId: string, cb: (type: NostrEventType, subId: string, content?: NostrEventContent) => void ) => {
    const listener = (event: MessageEvent) => {
      const message: NostrEvent | NostrEOSE = JSON.parse(event.data);
      const [type, subscriptionId, content] = message;

      if (subId === subscriptionId) {
        cb(type, subscriptionId, content);
      }

    };

    socket.addEventListener('message', listener);

    return () => {
      socket.removeEventListener('message', listener);
    };
  };

  let keepSoceketOpen = false;

  const openSocket = () => {
    premiumSocket = new WebSocket('wss://wallet.primal.net/v1');

    premiumSocket.addEventListener('close', () => {
      logInfo('PREMIUM SOCKET CLOSED');
      setPremiumData('isSocketOpen', () => false);
      if (keepSoceketOpen) {
        openSocket();
      }
    });

    premiumSocket.addEventListener('open', () => {
      logInfo('PREMIUM SOCKET OPENED');
      setPremiumData('isSocketOpen', () => true);
      checkPremiumStatus();
    });
  }

  const getExchangeRate = async () => {
    if (!premiumSocket) return;

    const subId = `premium_exchange_rate_${APP_ID}`;

    const unsub = subTo(premiumSocket, subId, (type, _, content) => {

      if (type === 'EVENT' && content?.kind === Kind.ExchangeRate) {
        const ex = JSON.parse(content.content)
        setPremiumData('exchangeRateUSD', ex.rate);
      }

      if (type === 'EOSE') {
        unsub();
      }
    });

    fetchExchangeRate(subId, premiumSocket);
  }


  const getOrderHistory = (until = 0, offset = 0) => {
    if (!premiumSocket) return;

    const subId = `premium_order_history_${APP_ID}`;

    const unsub = subTo(premiumSocket, subId, (type, _, content) => {
      if (type === 'EVENT') {
        if (content?.kind === Kind.OrderHistory) {
          const history = JSON.parse(content.content) as OrderHistoryItem[];
          setPremiumData('orderHistory', (hs) => [...hs, ...history])
        }

        if (content?.kind === Kind.FeedRange) {
          const feedRange: PaginationInfo = JSON.parse(content.content || '{}');
          setPremiumData('pagingOrderHistory', () => ({ ...feedRange}))
        }
      }

      if (type === 'EOSE') {
        unsub();
      }
    });

    getOrderListHistory(account?.publicKey, until, offset, subId, premiumSocket)
  }

  const getOrderHistoryNextPage = () => {
    if (premiumData.orderHistory.length === 0 && premiumData.pagingOrderHistory.since === 0) return;

    getOrderHistory(
      premiumData.pagingOrderHistory.since,
      1,
    );
  };

  const updateLegendConfig = async (config: LegendCustomizationConfig) => {
    if (!premiumSocket || !account?.publicKey) return;

    const subId = `premium_legend_config_${APP_ID}`;

    let error = false;

    const unsub = subTo(premiumSocket, subId, (type, _, content) => {
      if (type === 'NOTICE') {
        error = true;
      }

      if (type === 'EOSE') {
        if (error) {
          toast?.sendWarning('Failed to save changes');
        } else {
          toast?.sendSuccess('Changes have been saved');
        }

        unsub();
      }
    })

    await setLegendCutumization(account.publicKey, config, subId, premiumSocket);

    app?.actions.setLegendCustomization(account.publicKey, config);
  }

  onMount(() => {
    keepSoceketOpen = true;
    openSocket();
  });

  onCleanup(() => {
    keepSoceketOpen = false;
    premiumSocket?.close();
  });

  createEffect(() => {
    if (account?.isKeyLookupDone && account.hasPublicKey()) {
      checkPremiumStatus();
    }
  })

  createEffect(() => {
    if (premiumData.openLegend) {
      getLegendInfo();
    }
  })

  createEffect(() => {
    if (premiumStep() === 'name') {
      nameInput?.focus();
      setPremiumData('name', () => account?.activeUser?.name || '');
    }
    else if (premiumStep() === 'rename') {
      renameInput?.focus();
      setPremiumData('rename', () => premiumData.name);
    }
    else if (premiumStep() === 'overview') {
      if (premiumData.name.length === 0) {
        navigate('/premium');
        return;
      }
      getSubscriptionInfo();
    }
    else if (premiumStep() === 'confirm') {
      if (premiumData.name.length === 0) {
        navigate('/premium');
        return;
      }
      getSubscriptionInfo();
    }
    // else if (premiumStep() === 'legendary') {
    //   getLegendInfo();
    // }
  });

  createEffect(() => {
    if (!params.step) {
      checkPremiumStatus();
    }
  });

  createEffect(() => {
    const pubkey = account?.publicKey;

    if (pubkey) {
      setPremiumData('recipientPubkey', () => pubkey);
    }
  });

  createEffect(on(() => premiumData.recipientPubkey, (pubkey, old) => {

    if (!pubkey || pubkey === old) return;

    if (pubkey) {
      // getSubscriptionInfo();

      if (pubkey === account?.publicKey) {
        const recipient = account.activeUser;
        recipient && setPremiumData('recipient', () => ({ ...recipient }));
        return;
      }

      getRecipientUser(pubkey);
    }
  }));

  const premiumStep = () => {
    if (
      params.step === 'customize' &&
      premiumData.membershipStatus.cohort_1 &&
      premiumData.membershipStatus.cohort_1 !== 'Primal Legend'
    ) {
      return '';
    }

    return params.step;
  }

  const handlePremiumAction = async (action: string) => {
    switch (action) {
      case 'changeName':
        setPremiumData('openRename', () => true);
        break;
      case 'extendSubscription':
        await getSubscriptionInfo();
        setPremiumData('openRenew', () => true);
        break;
      case 'orderHistory':
        setPremiumData('openOrderHistory', () => true);
        break;
      case 'premiumRelay':
        navigate('/premium/relay');
        break;
      case 'mediaManagment':
        navigate('/premium/media');
        break;
      case 'contactBackup':
        navigate('/premium/contacts');
        break;
      case 'contentBackup':
        navigate('/premium/content');
        break;
      case 'customLegend':
        navigate('/premium/customize');
        break;
      case 'becomeLegend':
        navigate('/premium/legend');
        break;
    }
  }

  return (
    <div>
      <PageTitle title={
        intl.formatMessage(t.title.general)}
      />

      <Wormhole
        to="search_section"
      >
        <Search />
      </Wormhole>

      <PageCaption>
        <Switch
          fallback={
            <div class={styles.centerPageTitle}>{intl.formatMessage(t.title.general)}</div>
          }
        >
          <Match when={premiumStep() === 'support'}>
            <div class={styles.centerPageTitle}>{intl.formatMessage(t.title.support)}</div>
          </Match>

          <Match when={premiumStep() === 'legend'}>
            <div class={styles.centerPageTitle}>{intl.formatMessage(t.title.legend)}</div>
          </Match>

          <Match when={premiumStep() === 'legendary'}>
            <div class={styles.centerPageTitle}>{intl.formatMessage(t.title.legend)}</div>
          </Match>

          <Match when={premiumStep() === 'relay'}>
            <div class={styles.centerPageTitle}>{intl.formatMessage(t.title.relay)}</div>
          </Match>

          <Match when={premiumStep() === 'media'}>
            <div class={styles.centerPageTitle}>{intl.formatMessage(t.title.media)}</div>
          </Match>

          <Match when={premiumStep() === 'contacts'}>
            <div class={styles.centerPageTitle}>{intl.formatMessage(t.title.contacts)}</div>
          </Match>

          <Match when={premiumStep() === 'content'}>
            <div class={styles.centerPageTitle}>{intl.formatMessage(t.title.content)}</div>
          </Match>
        </Switch>
      </PageCaption>

      <StickySidebar>
        <Switch>
          <Match when={premiumData.membershipStatus.tier === 'free'}>
            <PremiumSidebarInactve
              onOpenFAQ={() => setPremiumData('openFeatures', () => 'faq')}
            />
          </Match>
          <Match when={premiumData.membershipStatus.tier === 'premium'}>
            <PremiumSidebarActive
              data={premiumData}
              onSidebarAction={handlePremiumAction}
              onOpenFAQ={() => setPremiumData('openFeatures', () => 'faq')}
            />
          </Match>
        </Switch>
      </StickySidebar>


      <div class={styles.premiumContent}>
        <div class={styles.premiumStepContent}>
          <Switch
            fallback={<Loader />}
          >
            <Match when={premiumStep() === 'name'}>
              <div class={styles.nameStep}>
                <div class={styles.title}>
                  {intl.formatMessage(t.title.name)}
                </div>

                <div class={styles.input}>
                  <TextInput
                    ref={nameInput}
                    value={premiumData.name}
                    onChange={setName}
                    validationState={premiumData.errorMessage.length > 0 ? 'invalid' : 'valid'}
                    errorMessage={premiumData.errorMessage}
                    type="text"
                    inputClass={styles.centralize}
                    descriptionClass={styles.centralize}
                    errorClass={styles.centralError}
                  />
                </div>

                <PremiumSummary data={premiumData} updateUserMetadata={updateUserMetadata}/>

                <div class={styles.nameFooter}>
                  <ButtonSecondary
                    onClick={() => navigate('/premium')}
                  >
                    {intl.formatMessage(t.actions.back)}
                  </ButtonSecondary>
                  <ButtonPremium
                    onClick={() => checkName()}
                  >
                    {intl.formatMessage(t.actions.next)}
                  </ButtonPremium>
                </div>
              </div>
            </Match>

            <Match when={premiumStep() === 'overview'}>
              <div class={styles.congrats}>
                <div>{intl.formatMessage(t.title.subscription)}</div>
                <div>{intl.formatMessage(t.title.subscriptionSubtitle)}</div>
              </div>

              <PremiumProfile data={premiumData} profile={account?.activeUser} />

              <PremiumSummary data={premiumData} updateUserMetadata={updateUserMetadata}/>

              <div class={styles.overviewFooter}>
                <ButtonSecondary
                  onClick={() => navigate('/premium/name')}
                >
                  {intl.formatMessage(t.actions.back)}
                </ButtonSecondary>
                <ButtonPremium
                  onClick={() => navigate('/premium/confirm')}
                >
                  {intl.formatMessage(t.actions.next)}
                </ButtonPremium>
              </div>

            </Match>

            <Match when={premiumStep() === 'confirm'}>
              <div class={styles.confirmStep}>
                <div class={styles.title}>
                  <div>You are Buying:</div>
                  <div>{subOptionCaption()} Months of Primal Premium</div>
                </div>

                <div class={styles.premiumProfile}>
                  <Avatar
                    user={premiumData.recipient}
                    size="xl"
                  />

                  <div class={styles.userInfo}>
                    <div class={styles.explainer}>primal name:</div>
                    <div>{premiumData.name}</div>
                    <div class={styles.purpleCheck}></div>
                  </div>

                  <div class={styles.npub}>
                    {truncateNpub(hexToNpub(premiumData.recipientPubkey))}
                  </div>

                  <div class={styles.changeAccount}>
                    <ButtonLink
                      onClick={() => setPremiumData('openAssignPubkey', () => true)}
                    >
                      assign to a different nostr account
                    </ButtonLink>
                  </div>
                </div>

                <PremiumSubscriptionOptions
                  options={premiumData.subOptions}
                  selectedOption={premiumData.selectedSubOption}
                  data={premiumData}
                  onSelect={(option) => {
                    setPremiumData('selectedSubOption', () => ({ ...option }));
                  }}
                  openPromoCode={() => setPremiumData('openPromoCode', () => true)}
                  promoCode={premiumData.promoCode}
                />

                <ButtonPremium
                  onClick={() => setPremiumData('openSubscribe', () => true)}
                >
                  {intl.formatMessage(t.actions.subscribe)}
                </ButtonPremium>
              </div>
            </Match>

            <Match when={premiumStep() === 'support'}>
              <PremiumSupport
                onExtendPremium={() => handlePremiumAction('extendSubscription')}
              />
            </Match>

            <Match when={premiumStep() === 'legend'}>
              <PremiumLegend
              />
            </Match>

            <Match when={premiumStep() === 'legendary'}>
              <PremiumBecomeLegend
                data={premiumData}
                profile={account?.activeUser}
                getExchangeRate={getExchangeRate}
                onBuyLegend={(amount: number) => {
                  setPremiumData('legendAmount', () => amount);
                  setPremiumData('openLegend', () => true);
                }}
              />
            </Match>

            <Match when={premiumStep() === 'relay'}>
              <PremiumRelay
                data={premiumData}
              />
            </Match>

            <Match when={premiumStep() === 'media'}>
              <PremiumMediaManagment
                data={premiumData}
              />
            </Match>

            <Match when={premiumStep() === 'contacts'}>
              <PremiumContactBackup
                data={premiumData}
              />
            </Match>

            <Match when={premiumStep() === 'content'}>
              <PremiumContentBackup
                data={premiumData}
              />
            </Match>

            <Match when={premiumStep() === 'customize'}>
              <PremiumCustomLegend
                data={premiumData}
                onConfigSave={updateLegendConfig}
              />
            </Match>

            <Match when={premiumData.membershipStatus?.tier === 'premium'}>
              <PremiumStatusOverview
                data={premiumData}
                profile={account?.activeUser}
                updateUserMetadata={updateUserMetadata}
                onExtendPremium={() => handlePremiumAction('extendSubscription')}/>
            </Match>

            <Match when={premiumData.membershipStatus?.tier === 'free'}>
              <PremiumHighlights
                onStart={onStartAction}
                onMore={() => setPremiumData('openFeatures', () => 'features')}
              />
            </Match>
          </Switch>

          <PremiumSubscribeModal
            open={premiumData.openSubscribe}
            setOpen={(v: boolean) => setPremiumData('openSubscribe', () => v)}
            onClose={() => {
              if (!premiumData.openSubscribe) return;
              setPremiumData('openSubscribe', () => false);

              premiumSocket && stopListeningForPremiumPurchase(purchuseSubId, premiumSocket);
              purchuseMonitorUnsub();
            }}
            onOpen={() => {
              listenForPayement();
            }}
            subscription={premiumData.subscriptions[premiumData.selectedSubOption.id]}
          />

          <PremiumLegendModal
            open={premiumData.openLegend}
            setOpen={(v: boolean) => setPremiumData('openLegend', () => v)}
            onClose={() => {
              if (!premiumData.openLegend) return;
              setPremiumData('openLegend', () => false);
              setPremiumData('legendSupscription', () => ({
                lnUrl: '',
                membershipId: '',
                amounts: {
                  usd: 0,
                  sats: 0,
                },
              }))

              premiumSocket && stopListeningForLegendPurchase(purchuseSubId, premiumSocket);
              purchuseMonitorUnsub();
            }}
            onOpen={() => {
              listenForLegendPayement();
            }}
            subscription={premiumData.legendSupscription}
          />

          <PremiumSuccessModal
            open={premiumData.openSuccess}
            profile={account?.activeUser}
            setOpen={(v: boolean) => setPremiumData('openSuccess', () => v)}
            onClose={() => {
              setPremiumData('openSuccess', () => false);
              checkPremiumStatus();
              navigate('/premium');
            }}
            data={premiumData}
          />

          <PremiumFeaturesDialog
            open={premiumData.openFeatures}
            setOpen={(v: boolean) => setPremiumData('openFeatures', () => v ? 'features' : undefined)}
          />

          <PremiumChangeRecipientDialog
            open={premiumData.openAssignPubkey}
            setOpen={(v: boolean) => setPremiumData('openAssignPubkey', () => v)}
            onApply={(pubkey: string) => {
              if (pubkey.length === 0) return;

              setPremiumData('recipientPubkey', () => pubkey);
              setPremiumData('openAssignPubkey', () => false)
            }}
          />

          <PremiumPromoCodeDialog
            open={premiumData.openPromoCode}
            setOpen={(v: boolean) => setPremiumData('openPromoCode', () => v)}
            onApply={(code: string) => {
              setPremiumData('promoCode', () => code);
              setPremiumData('openPromoCode', () => false)
            }}
          />

          <PremiumRenameDialog
            open={premiumData.openRename}
            setOpen={(v: boolean) => setPremiumData('openRename', () => v)}
            onApply={(newName: string) => {
              changePrimalName(newName)
              setPremiumData('openRename', () => false)
            }}
            name={premiumData.name}
            checkNameAvailability={(name: string) => isPremiumNameAvailable(name, account?.publicKey, premiumSocket, `rename_check_${APP_ID}`)}
          />

          <PremiumRenewModal
            open={premiumData.openRenew}
            setOpen={(v: boolean) => setPremiumData('openRenew', () => v)}
            data={premiumData}
            setData={setPremiumData}
          />

          <PremiumOrderHistoryModal
            open={premiumData.openOrderHistory}
            setOpen={(v: boolean) => setPremiumData('openOrderHistory', () => v)}
            data={premiumData}
            onOpen={() => {
              premiumData.orderHistory.length === 0 && getOrderHistory();
            }}
            onNextPage={getOrderHistoryNextPage}
          />
        </div>
      </div>
    </div>
  );
}

export default Premium;
