import { Component, createEffect, createSignal, JSXElement, onCleanup, onMount, Show } from 'solid-js';

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

const LayoutDesktop: Component<{
  children: JSXElement,
  onNewNotePosted: (result: SendNoteResult) => void,
}> = (props) => {

  const account = useAccountContext();
  const home = useHomeContext();
  const profile = useProfileContext();
  const location = useLocation();
  const params = useParams();
  const app = useAppContext();
  const settings = useSettingsContext();
  const intl = useIntl();

  let container: HTMLDivElement | undefined;

  const onResize = () => {
    container?.style.setProperty('height', `${window.innerHeight}px`);
  };

  onMount(() => {
    window.addEventListener('resize', onResize);
  });

  onCleanup(() => {
    window.removeEventListener('resize', onResize);
  });

  const containerClass = () => {
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
                  <NewNote onSuccess={props.onNewNotePosted}/>
                </div>

                <div>
                  {props.children}
                </div>
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

export default LayoutDesktop;
