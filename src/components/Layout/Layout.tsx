import { Component, createEffect, createSignal, onCleanup, onMount } from 'solid-js';

import styles from './Layout.module.scss';

import Branding from '../Branding/Branding';
import { Outlet } from '@solidjs/router';
import Search from '../Search/Search';
import NavMenu from '../NavMenu/NavMenu';
import ProfileWidget from '../ProfileWidget/ProfileWidget';

const Layout: Component = () => {

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
