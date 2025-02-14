import { Component, createEffect, createSignal, onCleanup, onMount, Show } from 'solid-js';

import styles from './Layout.module.scss';

import { useLocation, useParams, useSearchParams } from '@solidjs/router';
import NavMenu from '../NavMenu/NavMenu';
import ProfileWidget from '../ProfileWidget/ProfileWidget';
import NewNote from '../NewNote/NewNote';
import { useAccountContext } from '../../contexts/AccountContext';
import zapMD from '../../assets/lottie/zap_md.json';
import { useHomeContext } from '../../contexts/HomeContext';
import { SendNoteResult } from '../../types/primal';
import { useProfileContext } from '../../contexts/ProfileContext';
import Branding from '../Branding/Branding';
import BannerIOS, { isIOS } from '../BannerIOS/BannerIOS';
import ZapAnimation from '../ZapAnimation/ZapAnimation';
import ReactionsModal from '../ReactionsModal/ReactionsModal';
import { useAppContext } from '../../contexts/AppContext';
import CustomZap from '../CustomZap/CustomZap';
import NoteContextMenu from '../Note/NoteContextMenu';
import LnQrCodeModal from '../LnQrCodeModal/LnQrCodeModal';
import ConfirmModal from '../ConfirmModal/ConfirmModal';
import CashuQrCodeModal from '../CashuQrCodeModal/CashuQrCodeModal';
import SubscribeToAuthorModal from '../SubscribeToAuthorModal/SubscribeToAuthorModal';
import { useSettingsContext } from '../../contexts/SettingsContext';
import EnterPinModal from '../EnterPinModal/EnterPinModal';
import CreateAccountModal from '../CreateAccountModal/CreateAccountModal';
import LoginModal from '../LoginModal/LoginModal';
import { unwrap } from 'solid-js/store';
import { followWarning, forgotPin } from '../../translations';
import { useIntl } from '@cookbook/solid-intl';

export const [isHome, setIsHome] = createSignal(false);

const Layout: Component<any> = (props) => {

  const account = useAccountContext();
  const home = useHomeContext();
  const profile = useProfileContext();
  const location = useLocation();
  const params = useParams();
  const app = useAppContext();
  const settings = useSettingsContext();
  const intl = useIntl();

  let container: HTMLDivElement | undefined;

  const [queryParams, setQueryParams] = useSearchParams();

  const showBanner = () => {
    return queryParams.mobilebanner !== 'false';
  };

  createEffect(() => {
    const newNote = document.getElementById('new_note_input');
    const newNoteTextArea = document.getElementById('new_note_text_area') as HTMLTextAreaElement;

    if (account?.showNewNoteForm) {
      if (!newNote || !newNoteTextArea) {
        return;
      }
      newNote?.classList.add(styles.animatedShow);
      newNoteTextArea?.focus();
    }
    else {
      if (!newNote || !newNoteTextArea) {
        return;
      }
      newNote?.classList.remove(styles.animatedShow);
      newNoteTextArea.value = '';
    }
  });

  const onResize = () => {
    container?.style.setProperty('height', `${window.innerHeight}px`);
  };

  onMount(() => {
    window.addEventListener('resize', onResize);
  });

  onCleanup(() => {
    window.removeEventListener('resize', onResize);
  });

  const onNewNotePosted = (result: SendNoteResult) => {
    const path = location.pathname.split('/');

    if (path[1] === 'home' && home) {
      // check for new notes on the home feed
      home.actions.checkForNewNotes(home.selectedFeed?.spec || '')
      return;
    }

    if (['p', 'profile'].includes(path[1]) && profile) {
      const pubkey = params.npub;
      // check for new notes on the profile feed
      profile.actions.checkForNewNotes(pubkey || account?.publicKey);
      return;
    }
  }

  createEffect(() => {
    if (location.pathname) {
      settings?.actions.refreshMobileReleases();
    }
  });

  createEffect(() => {
    if (location.pathname === '/') return;

    if (!account?.publicKey) {
      account?.actions.checkNostrKey();
    }
  });

  const containerClass = () => {
    if (isIOS() && showBanner()) return styles.containerIOS;

    if (location.pathname.startsWith('/e/naddr')) return styles.containerLF;

    return styles.container;
  }

  return (
    <Show
      when={location.pathname !== '/'}
      fallback={<>
        <div id="modal" class={styles.modal}></div>
        {props.children}
      </>}
    >
      <>
        <div class={styles.preload}>
          <div class="reply_icon"></div>
          <div class="reply_icon_fill"></div>
          <div class="repost_icon"></div>
          <div class="repost_icon_fill"></div>
          <div class="zap_icon"></div>
          <div class="zap_icon_fill"></div>
          <div class="like_icon"></div>
          <div class="like_icon_fill"></div>
          <ZapAnimation src={zapMD} />
        </div>
        <div id="modal" class={styles.modal}></div>
        <BannerIOS />
        <div id="container" ref={container} class={containerClass()}>
          <div class={styles.leftColumn}>
            <div>
              <div id="branding_holder" class={styles.leftHeader}>
                <Branding isHome={isHome()} />
              </div>

              <div class={styles.leftContent}>
                <NavMenu />
                <Show when={location.pathname === '/new'}>
                  <div class={styles.overlay}></div>
                </Show>
              </div>

              <div class={styles.leftFooter}>
                <Show when={location.pathname !== '/new'}>
                  <ProfileWidget />
                </Show>
              </div>
            </div>
          </div>


          <div class={styles.centerColumn}>
            <Show when={account?.isKeyLookupDone}>
              <div class={styles.centerContent}>
                <div id="new_note_input" class={styles.headerFloater}>
                  <NewNote onSuccess={onNewNotePosted}/>
                </div>

                <div>
                  {props.children}
                </div>

                <ReactionsModal
                  noteId={app?.showReactionsModal}
                  stats={app?.reactionStats}
                  onClose={() => app?.actions.closeReactionModal()}
                />

                <CustomZap
                  open={app?.showCustomZapModal}
                  note={app?.customZap?.note}
                  profile={app?.customZap?.profile}
                  dvm={app?.customZap?.dvm}
                  onConfirm={app?.customZap?.onConfirm}
                  onSuccess={app?.customZap?.onSuccess}
                  onFail={app?.customZap?.onFail}
                  onCancel={app?.customZap?.onCancel}
                />

                <LnQrCodeModal
                  open={app?.showLnInvoiceModal}
                  lnbc={app?.lnbc?.invoice || ''}
                  onPay={app?.lnbc?.onPay}
                  onClose={app?.lnbc?.onCancel}
                />

                <CashuQrCodeModal
                  open={app?.showCashuInvoiceModal}
                  cashu={app?.cashu?.invoice || ''}
                  onPay={app?.cashu?.onPay}
                  onClose={app?.cashu?.onCancel}
                />

                <ConfirmModal
                  open={app?.showConfirmModal}
                  title={app?.confirmInfo?.title}
                  description={app?.confirmInfo?.description}
                  confirmLabel={app?.confirmInfo?.confirmLabel}
                  abortLabel={app?.confirmInfo?.abortLabel}
                  onConfirm={app?.confirmInfo?.onConfirm}
                  onAbort={app?.confirmInfo?.onAbort}
                />

                <SubscribeToAuthorModal
                  author={app?.subscribeToAuthor}
                  onClose={app?.actions.closeAuthorSubscribeModal}
                  onSubscribe={app?.subscribeToTier}
                />

                <EnterPinModal
                  open={(account?.showPin || '').length > 0}
                  valueToDecrypt={account?.showPin}
                  onSuccess={(sec: string) => {
                    account?.actions.setSec(sec);
                    account?.actions.setString('showPin', '');
                  }}
                  onAbort={() => account?.actions.setString('showPin', '')}
                  onForgot={() => {
                    account?.actions.setString('showPin', '');
                    account?.actions.setFlag('showForgot', true);
                  }}
                />
                <CreateAccountModal
                  open={account?.showGettingStarted}
                  onAbort={() => account?.actions.setFlag('showGettingStarted', false)}
                  onLogin={() => {
                    account?.actions.setFlag('showGettingStarted', false);
                    account?.actions.setFlag('showLogin', true);
                  }}
                />
                <LoginModal
                  open={account?.showLogin}
                  onAbort={() => account?.actions.setFlag('showLogin', false)}
                />
                <ConfirmModal
                  open={account?.followData.openDialog}
                  title={intl.formatMessage(followWarning.title)}
                  description={intl.formatMessage(followWarning.description)}
                  confirmLabel={intl.formatMessage(followWarning.confirm)}
                  abortLabel={intl.formatMessage(followWarning.abort)}
                  onConfirm={async () => {
                    if (account?.publicKey) {
                      const data = unwrap(account?.followData)
                      await account.actions.resolveContacts(account?.publicKey, data.following, data.date, data.tags, data.relayInfo);
                    }
                    account?.actions.setFollowData({
                      tags: [],
                      date: 0,
                      relayInfo: '',
                      openDialog: false,
                      following: [],
                    });
                  }}
                  onAbort={() => {
                    account?.actions.setFollowData({
                      tags: [],
                      date: 0,
                      relayInfo: '',
                      openDialog: false,
                      following: [],
                    });
                  }}
                />
                <ConfirmModal
                  open={account?.showForgot}
                  title={intl.formatMessage(forgotPin.title)}
                  description={intl.formatMessage(forgotPin.description)}
                  confirmLabel={intl.formatMessage(forgotPin.confirm)}
                  abortLabel={intl.formatMessage(forgotPin.abort)}
                  onConfirm={async () => {
                    account?.actions.logout();
                    account?.actions.setFlag('showForgot', false);
                  }}
                  onAbort={() => {
                    account?.actions.setFlag('showForgot', false);
                  }}
                />
              </div>
            </Show>
          </div>


          <div class={`${styles.rightColumn} ${location.pathname.startsWith('/messages') || location.pathname.startsWith('/dms') ? styles.messagesColumn : ''}`}>
            <div>
              <Show
                when={!location.pathname.startsWith('/asearch')}
              >
                <div class={`${styles.rightHeader} ${location.pathname.startsWith('/messages') ? styles.messagesHeader : ''}`}>
                  <div id="search_section" class={location.pathname.startsWith('/messages') ? styles.messagesSearch : ''}>
                  </div>
                </div>
              </Show>
              <div class={`${styles.rightContent} ${location.pathname.startsWith('/explore') ||location.pathname.startsWith('/asearch') ? styles.exploreHeader : ''}`}>
                <div id="right_sidebar">
                </div>
              </div>
            </div>
          </div>
        </div>
        <NoteContextMenu
          open={app?.showNoteContextMenu}
          onClose={app?.actions.closeContextMenu}
          data={app?.noteContextMenuInfo}
        />
      </>
    </Show>
  )
}

export default Layout;
