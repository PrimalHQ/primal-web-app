import { Component, createEffect, createSignal, onCleanup, onMount } from 'solid-js';

import styles from './Layout.module.scss';

import Branding from '../Branding/Branding';
import { Outlet } from '@solidjs/router';
import Search from '../Search/Search';
import NavMenu from '../NavMenu/NavMenu';
import ProfileWidget from '../ProfileWidget/ProfileWidget';
import NewNote from '../NewNote/NewNote';
import { useFeedContext } from '../../contexts/FeedContext';

const Layout: Component = () => {

  const context = useFeedContext();

  createEffect(() => {
    const newNote = document.getElementById('new_note_input');
    const newNoteTextArea = document.getElementById('new_note_text_area') as HTMLTextAreaElement;

    if (context?.data.showNewNoteForm) {
      newNote?.classList.add(styles.animatedShow);
      newNoteTextArea?.focus();
    }
    else {
      newNote?.classList.remove(styles.animatedShow);
      newNoteTextArea.value = '';
    }
  });

  return (
    <div id="container" class={styles.container}>

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
