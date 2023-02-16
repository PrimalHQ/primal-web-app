import { Component, createEffect, createSignal, onCleanup, onMount } from 'solid-js';

import styles from './Layout.module.scss';

import jack from '../../assets/icons/jack.png';
import Branding from '../Branding/Branding';
import Welcome from '../Welcome/Welcome';
import { Outlet } from '@solidjs/router';
import NavLink from '../NavLink/NavLink';
import Search from '../Search/Search';
import ThemeToggle from '../ThemeToggle/ThemeToggle';
import NavMenu from '../NavMenu/NavMenu';

const Layout: Component = () => {

    return (
      <div id="container" class={styles.container}>

        <div class={styles.leftColumn}>
          <div>
            <div class={styles.leftHeader}>
              <Branding small={false} />
            </div>

            <div class={styles.leftContent}>
              <NavMenu />
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
