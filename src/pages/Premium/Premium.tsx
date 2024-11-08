import { useIntl } from '@cookbook/solid-intl';
import { Component, createEffect, Match, on, onCleanup, onMount, Show, Switch } from 'solid-js';
import PageCaption from '../../components/PageCaption/PageCaption';
import PageTitle from '../../components/PageTitle/PageTitle';
import Wormhole from '../../components/Wormhole/Wormhole';

import { premium as t } from '../../translations';

import styles from './Premium.module.scss';
import Search from '../../components/Search/Search';
import { A, useNavigate, useParams } from '@solidjs/router';
import TextInput from '../../components/TextInput/TextInput';
import { createStore } from 'solid-js/store';
import { NostrEOSE, NostrEvent, NostrEventContent, NostrEventType, PrimalUser } from '../../types/primal';
import { APP_ID } from '../../App';
import { changePremiumName, sendPremiumNameCheck, getPremiumQRCode, getPremiumStatus, startListeningForPremiumPurchase, stopListeningForPremiumPurchase, isPremiumNameAvailable, fetchExchangeRate } from '../../lib/premium';
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
import { subsTo } from '../../sockets';
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

export const satsInBTC = 100_000_000;

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
  openAssignPubkey: boolean,
  openPromoCode: boolean,
  openRename: boolean,
  openRenew: boolean,
  openFeatures: 'features' | 'faq' | undefined,
  subscriptions: Record<string, PrimalPremiumSubscription>,
  membershipStatus: PremiumStatus,
  recipientPubkey: string | undefined,
  recipient: PrimalUser | undefined,
  promoCode: string,
  isSocketOpen: boolean,
  exchangeRateUSD: number,
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
    openAssignPubkey: false,
    openPromoCode: false,
    openRename: false,
    openRenew: false,
    openFeatures: undefined,
    subscriptions: {},
    membershipStatus: {},
    recipientPubkey: undefined,
    recipient: undefined,
    promoCode: '',
    isSocketOpen: false,
    exchangeRateUSD: 0,
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

  const updateUserMetadata = () => {
    const user = account?.activeUser;

    if (!user) return;

    const metaUpdate = {
      nip05: `${premiumData.name}@primal.net`,
      lud16: `${`${premiumData.name}@primal.net`}`,
    };

    sendProfile({ ...user, ...metaUpdate }, account.proxyThroughPrimal,  account.activeRelays, account.relaySettings);
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
      isAvailable = await isPremiumNameAvailable(premiumData.name, premiumSocket, subId);
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
        }
      }

      if (type === 'EOSE') {
      }
    });

    const membershipId = premiumData.subscriptions[premiumData.selectedSubOption.id].membershipId;

    startListeningForPremiumPurchase(membershipId, purchuseSubId, premiumSocket);
  }

  const getSubscriptionInfo = () => {
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
          }))
        }

        if (type === 'EOSE') {
          unsub();
        }
      });

      getPremiumQRCode(premiumData.recipientPubkey, premiumData.name, option.id, subId, premiumSocket)

    })

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
          setPremiumData('membershipStatus', () => ({ tier: 'none' }));
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
    if (params.step === 'name') {
      nameInput?.focus();
      setPremiumData('name', () => account?.activeUser?.name || '');
    }
    else if (params.step === 'rename') {
      renameInput?.focus();
      setPremiumData('rename', () => premiumData.name);
    }
    else if (params.step === 'overview') {
      getSubscriptionInfo();
    }
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
      getSubscriptionInfo();

      if (pubkey === account?.publicKey) {
        const recipient = account.activeUser;
        recipient && setPremiumData('recipient', () => ({ ...recipient }));
        return;
      }

      getRecipientUser(pubkey);
    }
  }))

  const handlePremiumAction = (action: string) => {
    switch (action) {
      case 'changeName':
        setPremiumData('openRename', () => true);
        break;
      case 'extendSubscription':
        setPremiumData('openRenew', () => true);
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
          <Match when={params.step === 'support'}>
            <div class={styles.centerPageTitle}>{intl.formatMessage(t.title.support)}</div>
          </Match>

          <Match when={params.step === 'legend'}>
            <div class={styles.centerPageTitle}>{intl.formatMessage(t.title.legend)}</div>
          </Match>

          <Match when={params.step === 'legendary'}>
            <div class={styles.centerPageTitle}>{intl.formatMessage(t.title.legend)}</div>
          </Match>
        </Switch>
      </PageCaption>

      <StickySidebar>
        <Switch>
          <Match when={premiumData.membershipStatus.tier === 'none'}>
            <PremiumSidebarInactve
              onOpenFAQ={() => setPremiumData('openFeatures', () => 'faq')}
            />
          </Match>
          <Match when={premiumData.membershipStatus.tier === 'premium'}>
            <PremiumSidebarActive
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
            <Match when={params.step === 'name'}>
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

                <PremiumSummary data={premiumData} />

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

            <Match when={params.step === 'overview'}>
              <div class={styles.congrats}>
                <div>{intl.formatMessage(t.title.subscription)}</div>
                <div>{intl.formatMessage(t.title.subscriptionSubtitle)}</div>
              </div>

              <PremiumProfile profile={account?.activeUser} />

              <PremiumSummary data={premiumData} />

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

            <Match when={params.step === 'confirm'}>
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

            <Match when={params.step === 'support'}>
              <PremiumSupport
                onExtendPremium={() => handlePremiumAction('extendSubscription')}
              />
            </Match>

            <Match when={params.step === 'legend'}>
              <PremiumLegend
              />
            </Match>

            <Match when={params.step === 'legendary'}>
              <PremiumBecomeLegend
                data={premiumData}
                profile={account?.activeUser}
                getExchangeRate={getExchangeRate}
              />
            </Match>

            <Match when={premiumData.membershipStatus?.tier === 'premium'}>
              <PremiumStatusOverview
                data={premiumData}
                profile={account?.activeUser}
                onExtendPremium={() => handlePremiumAction('extendSubscription')}/>
            </Match>

            <Match when={premiumData.membershipStatus?.tier === 'none'}>
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
            checkNameAvailability={(name: string) => isPremiumNameAvailable(name, premiumSocket, `rename_check_${APP_ID}`)}
          />

          <PremiumRenewModal
            open={premiumData.openRenew}
            setOpen={(v: boolean) => setPremiumData('openRenew', () => v)}
            data={premiumData}
            setData={setPremiumData}
          />
        </div>
      </div>
    </div>
  );
}

export default Premium;
