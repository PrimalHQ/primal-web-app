import { Component, createEffect, onCleanup, onMount } from 'solid-js';

import styles from './Layout.module.scss';

import { Outlet } from '@solidjs/router';
import Search from '../Search/Search';
import NavMenu from '../NavMenu/NavMenu';
import ProfileWidget from '../ProfileWidget/ProfileWidget';
import NewNote from '../NewNote/NewNote';
import { useAccountContext } from '../../contexts/AccountContext';

const Layout: Component = () => {

  const account = useAccountContext();

  let container: HTMLDivElement | undefined;

  createEffect(() => {
    const newNote = document.getElementById('new_note_input');
    const newNoteTextArea = document.getElementById('new_note_text_area') as HTMLTextAreaElement;

    if (account?.showNewNoteForm) {
      newNote?.classList.add(styles.animatedShow);
      newNoteTextArea?.focus();
    }
    else {
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

  return (
    <div id="container" ref={container} class={styles.container}>

      <div class={styles.leftColumn}>
        <div>
          <div id="branding_holder" class={styles.leftHeader}>
          </div>

          <div class={styles.leftContent}>
            <NavMenu />
          </div>

          <div class={styles.leftFooter}>
            <ProfileWidget />
          </div>
        </div>
      </div>


      <div class={styles.centerColumn}>
        <div class={styles.centerContent}>
          <div id="new_note_input" class={styles.headerFloater}>
            <NewNote />
          </div>

          <div>
            <Outlet />
          </div>
        </div>
      </div>


      <div class={styles.rightColumn}>
        <div class={styles.rightHeader}>
          <Search />
        </div>
        <div class={styles.rightContent}>
          <div id="right_sidebar">
          </div>
        </div>
      </div>
    </div>
  )
}

export default Layout;
