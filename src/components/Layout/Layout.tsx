import { Component, createEffect, createSignal, onCleanup, onMount, Show } from 'solid-js';

import styles from './Layout.module.scss';

import { Outlet, useLocation, useParams } from '@solidjs/router';
import NavMenu from '../NavMenu/NavMenu';
import ProfileWidget from '../ProfileWidget/ProfileWidget';
import NewNote from '../NewNote/NewNote';
import { useAccountContext } from '../../contexts/AccountContext';
import zapSM from '../../assets/lottie/zap_sm.json';
import zapMD from '../../assets/lottie/zap_md.json';
import { useHomeContext } from '../../contexts/HomeContext';
import { SendNoteResult } from '../../types/primal';
import { useProfileContext } from '../../contexts/ProfileContext';
import Branding from '../Branding/Branding';
import BannerIOS, { isIOS } from '../BannerIOS/BannerIOS';

export const [isHome, setIsHome] = createSignal(false);

const Layout: Component = () => {

  const account = useAccountContext();
  const home = useHomeContext();
  const profile = useProfileContext();
  const location = useLocation();
  const params = useParams();

  let container: HTMLDivElement | undefined;

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
      home.actions.checkForNewNotes(home.selectedFeed?.hex)
      return;
    }

    if (['p', 'profile'].includes(path[1]) && profile) {
      const pubkey = params.npub;
      // check for new notes on the profile feed
      profile.actions.checkForNewNotes(pubkey || account?.publicKey);
      return;
    }
  }

  return (
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
        <lottie-player
          src={zapSM}
          speed="1"
        ></lottie-player>
        <lottie-player
          src={zapMD}
          speed="1"
        ></lottie-player>
      </div>
      <div id="modal" class={styles.modal}></div>
      <BannerIOS />
      <div id="container" ref={container} class={isIOS() ? styles.containerIOS : styles.container}>
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
                <Outlet />
              </div>
            </div>
          </Show>
        </div>


        <div class={styles.rightColumn}>
          <div>
            <div class={styles.rightHeader}>
              <div id="search_section">
              </div>
            </div>
            <div class={styles.rightContent}>
              <div id="right_sidebar">
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default Layout;
