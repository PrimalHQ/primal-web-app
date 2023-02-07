import { Component } from 'solid-js';

import styles from './Layout.module.scss';

import jack from '/assets/icons/jack.png';
import Branding from '../Branding/Branding';
import Welcome from '../Welcome/Welcome';
import { Outlet } from '@solidjs/router';
import NavLink from '../NavLink/NavLink';
import Search from '../Search/Search';

const Layout: Component = () => {

    return (
      
      <div class={styles.container}>

        <header>
          <section class={styles.left}>
            <Branding />
          </section>

          <section>
            <Welcome />
          </section>

          <section class={styles.right}>
            <Search />
          </section>
        </header>

        <div class={styles.subheader}>
          <div></div>
          <div id="subheader_center">
          </div>
          <div></div>
        </div>


        <nav class={styles.sideNav}>
          <aside>
            <ul>
              <li>
                <NavLink to='/home' label='Home' icon='homeIcon' />
              </li>
              <li>
                <NavLink to='/explore' label='Explore' icon='exploreIcon' />
              </li>
              <li>
                <NavLink to='/rest' label='Messages' icon='messagesIcon' />
              </li>
              <li>
                <NavLink to='/rest' label='Notifications' icon='notificationsIcon' />
              </li>
              <li>
                <NavLink to='/rest' label='Downloads' icon='downloadIcon' />
              </li>
              <li>
                <NavLink to='/rest' label='Settings' icon='settingsIcon' />
              </li>
              <li>
                <NavLink to='/rest' label='Help' icon='helpIcon' />
              </li>
            </ul>
          </aside>
        </nav>

        <main>
          <Outlet />
        </main>

        <div class={styles.sidebar} id="right_sidebar">
        </div>

        <div class={styles.currentProfile}>
          <div>
            <img src={jack} alt="jack" />
          </div>
        </div>
      </div>
    )
}

export default Layout;
