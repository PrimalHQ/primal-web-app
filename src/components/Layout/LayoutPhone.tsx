import { Component, createEffect, createSignal, JSXElement, onCleanup, onMount, Show } from 'solid-js';

import styles from './Layout.module.scss';

import { useLocation, useParams, useSearchParams } from '@solidjs/router';
import NewNote from '../NewNote/NewNote';
import { useAccountContext } from '../../contexts/AccountContext';
import { useHomeContext } from '../../contexts/HomeContext';
import { SendNoteResult } from '../../types/primal';
import { useProfileContext } from '../../contexts/ProfileContext';
import BannerIOS from '../BannerIOS/BannerIOS';
import { useAppContext } from '../../contexts/AppContext';
import NoteContextMenu from '../Note/NoteContextMenu';
import { useSettingsContext } from '../../contexts/SettingsContext';
import { useIntl } from '@cookbook/solid-intl';
import NavPhone from '../NavMenu/NavPhone';
import { isIOS } from '../../utils';

export const [isHome, setIsHome] = createSignal(false);

const LayoutPhone: Component<{
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

  const [queryParams, setQueryParams] = useSearchParams();

  const showBanner = () => {
    return queryParams.mobilebanner !== 'false';
  };

  const onResize = () => {
    container?.style.setProperty('height', `${window.innerHeight}px`);
  };

  onMount(() => {
    window.addEventListener('resize', onResize);
  });

  onCleanup(() => {
    window.removeEventListener('resize', onResize);
  });

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
    let k = styles.containerPhone;

    if (isIOS() && showBanner()) {
      k += ` ${styles.containerIOS}`;
    }

    return k;
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
          <Show when={account?.isKeyLookupDone}>
            <div class={styles.phoneContent}>
              <div id="new_note_input" class={styles.headerFloater}>
                <NewNote onSuccess={props.onNewNotePosted}/>
              </div>
              {props.children}
            </div>

            <div class={styles.phoneFooter}>
              <NavPhone />
            </div>
          </Show>
        </div>
      </>
    </Show>
  )
}

export default LayoutPhone;
