import { Component, createSignal, JSXElement, Match, onCleanup, onMount, Show, Switch } from 'solid-js';

import styles from './Layout.module.scss';

import { useLocation } from '@solidjs/router';
import NavMenu from '../NavMenu/NavMenu';
import ProfileWidget from '../ProfileWidget/ProfileWidget';
import NewNote from '../NewNote/NewNote';
import { useAccountContext } from '../../contexts/AccountContext';
import { SendNoteResult } from '../../types/primal';
import Branding from '../Branding/Branding';
import { useAppContext } from '../../contexts/AppContext';
import NoteContextMenu from '../Note/NoteContextMenu';
import LiveNavMenu from '../NavMenu/LiveNavMenu';

export const [isHome, setIsHome] = createSignal(false);

const LayoutDesktop: Component<{
  children: JSXElement,
  onNewNotePosted: (result: SendNoteResult) => void,
}> = (props) => {

  const account = useAccountContext();
  const location = useLocation();
  const app = useAppContext();

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
    if (location.pathname.startsWith('/e/naddr') || location.pathname.startsWith('/a/naddr')) return styles.containerLF;
    if (location.pathname.includes('/live')) return styles.liveContainer
    if (location.pathname.includes('/citadel_stream')) return '';

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
          <Switch>
            <Match when={location.pathname.includes('/citadel_stream')}>
              <div>
                {props.children}
              </div>
            </Match>
            <Match when={location.pathname.includes('/live/')}>
              <div class={`${styles.leftColumn} ${styles.liveStreamLeft}`}>
                <div>
                  <div id="branding_holder" class={styles.leftHeader}>
                    <Branding isHome={isHome()} small={true} />
                  </div>

                  <div class={styles.leftContent}>
                    <LiveNavMenu />
                  </div>

                  <div class={styles.leftFooter}>
                    <Show when={location.pathname !== '/new'}>
                      <ProfileWidget hideName={true} />
                    </Show>
                  </div>
                </div>
              </div>
            </Match>

            <Match when={true}>
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
            </Match>
          </Switch>

          <Show when={account?.isKeyLookupDone}>
            <Switch>
              <Match when={location.pathname.includes('/citadel_stream')}>
                <></>
              </Match>

              <Match when={location.pathname.includes('/live')}>
                <div class={styles.liveStreamCenter}>
                  <div id="new_note_input" class={styles.headerFloater}>
                    <NewNote onSuccess={props.onNewNotePosted}/>
                  </div>
                  {props.children}
                </div>
              </Match>

              <Match when={true}>
                <div class={styles.centerColumn}>
                  <div class={styles.centerContent}>
                    <div id="new_note_input" class={styles.headerFloater}>
                      <NewNote onSuccess={props.onNewNotePosted}/>
                    </div>

                    <div>
                      {props.children}
                    </div>
                  </div>
                </div>
              </Match>
            </Switch>
          </Show>

          <Switch>
            <Match when={location.pathname.includes('/live/') || location.pathname.includes('/citadel_stream')}>
              <></>
            </Match>
            <Match when={location.pathname.startsWith('/messages') || location.pathname.startsWith('/dms')}>
              <div class={`${styles.rightColumn} ${styles.messagesColumn}`}>
                <div>
                  <div class={`${styles.rightHeader} ${styles.messagesHeader}`}>
                    <div id="search_section" class={styles.messagesSearch}>
                    </div>
                  </div>
                  <div class={`${styles.rightContent} ${location.pathname.startsWith('/explore') ||location.pathname.startsWith('/search') ? styles.exploreHeader : ''}`}>
                    <div id="right_sidebar">
                    </div>
                  </div>
                </div>
              </div>
            </Match>
            <Match when={location.pathname.startsWith('/search') || location.pathname.startsWith('/reads/edit')}>
              <div class={`${styles.rightColumn}`}>
                <div>
                  <div class={`${styles.rightContent} ${styles.exploreHeader}`}>
                    <div id="right_sidebar">
                    </div>
                  </div>
                </div>
              </div>
            </Match>
            <Match when={true}>
              <div class={`${styles.rightColumn}`}>
                <div>
                  <div class={`${styles.rightHeader}`}>
                    <div id="search_section">
                    </div>
                  </div>
                  <div class={`${styles.rightContent} ${location.pathname.startsWith('/explore') ? styles.exploreHeader : ''}`}>
                    <div id="right_sidebar">
                    </div>
                  </div>
                </div>
              </div>
            </Match>
          </Switch>
        </div>
      </>
    </Show>
  )
}

export default LayoutDesktop;
