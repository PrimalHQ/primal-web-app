import { Component, createEffect, createSignal, on, onCleanup, onMount, Show } from 'solid-js';

import styles from './Layout.module.scss';

import { useBeforeLeave, useLocation, useParams} from '@solidjs/router';
import { useAccountContext } from '../../contexts/AccountContext';
import zapMD from '../../assets/lottie/zap_md.json';
import { useHomeContext } from '../../contexts/HomeContext';
import { SendNoteResult } from '../../types/primal';
import { useProfileContext } from '../../contexts/ProfileContext';
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
import LayoutPhone from './LayoutPhone';
import LayoutDesktop from './LayoutDesktop';
import { isPhone } from '../../utils';
import ArticleOverviewContextMenu from '../Note/ArticleOverviewContextMenu';
import ArticleDraftContextMenu from '../Note/ArticleDraftContextMenu';
import LiveStreamContextMenu from '../Note/LiveStreamContextMenu';
import ProfileQrCodeModal from '../ProfileQrCodeModal/ProfileQrCodeModal';
import ReportContentModal from '../ReportContentModal/ReportContentModal';
import NoteVideoContextMenu from '../Note/NoteVideoContextMenu';

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

  createEffect(on(() => location.pathname, (path, prev) => {
    if (path !== prev) {
      app?.actions.closeContextMenu();
      app?.actions.closeArticleOverviewContextMenu();
      app?.actions.closeArticleDraftContextMenu();
    }
  }));

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
    if (!account?.publicKey) {
      account?.actions.checkNostrKey();
    }
  });

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
        <Show
          when={isPhone()}
          fallback={
            <LayoutDesktop onNewNotePosted={onNewNotePosted}>
              {props.children}
            </LayoutDesktop>
          }
        >
          <LayoutPhone onNewNotePosted={onNewNotePosted}>
            {props.children}
          </LayoutPhone>
        </Show>


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
          stream={app?.customZap?.stream}
          streamAuthor={app?.customZap?.streamAuthor}
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
          setOpen={app?.actions.closeConfirmModal}
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
            account?.actions.setSec(sec, true);
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

        <NoteContextMenu
          open={app?.showNoteContextMenu}
          onClose={app?.actions.closeContextMenu}
          data={app?.noteContextMenuInfo}
        />

        <LiveStreamContextMenu
          open={app?.showStreamContextMenu}
          onClose={app?.actions.closeStreamContextMenu}
          data={app?.streamContextMenuInfo}
        />

        <NoteVideoContextMenu
          open={app?.showNoteVideoContextMenu}
          onClose={app?.actions.closeNoteVideoContextMenu}
          data={app?.noteVideoContextMenuInfo}
        />

        <ArticleOverviewContextMenu
          open={app?.showArticleOverviewContextMenu}
          onClose={app?.actions.closeArticleOverviewContextMenu}
          data={app?.articleOverviewContextMenuInfo}
        />

        <ArticleDraftContextMenu
          open={app?.showArticleDraftContextMenu}
          onClose={app?.actions.closeArticleDraftContextMenu}
          data={app?.articleDraftContextMenuInfo}
        />

        <ProfileQrCodeModal
          open={app?.showProfileQr !== undefined}
          onClose={app?.actions.closeProfileQr}
          profile={app?.showProfileQr}
        />

        <ReportContentModal
          note={app?.reportContent}
          onClose={() => app?.actions.closeReportContent()}
        />
      </>
    </Show>
  )
}

export default Layout;
