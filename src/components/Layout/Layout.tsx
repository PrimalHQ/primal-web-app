import { Component, createEffect, createSignal, onCleanup, onMount } from 'solid-js';

import styles from './Layout.module.scss';

import jack from '../../assets/icons/jack.png';
import Branding from '../Branding/Branding';
import Welcome from '../Welcome/Welcome';
import { Outlet } from '@solidjs/router';
import NavLink from '../NavLink/NavLink';
import Search from '../Search/Search';
import ThemeToggle from '../ThemeToggle/ThemeToggle';

const Layout: Component = () => {
    let position = document.body.scrollTop || document.documentElement.scrollTop;

    const onScroll = () => {
      const scrollTop = document.body.scrollTop || document.documentElement.scrollTop;
      const container = document.getElementById('container');

      if (scrollTop < 108) {
        container && container.classList.remove(styles.midscroll);
        container && container.classList.remove(styles.fullscroll);
      }
      else if (position > scrollTop) {
        container && container.classList.add(styles.midscroll);
        container && container.classList.remove(styles.fullscroll);
      }
      else if (scrollTop >= position) {
        container && container.classList.remove(styles.midscroll);
        container && container.classList.add(styles.fullscroll);
      }

      position = scrollTop;
    }

    onMount(() => {
      setTimeout(() => {
        onScroll();
        window.addEventListener('scroll', onScroll);

      }, 1000);
    });

    onCleanup(() => {
      window.removeEventListener('scroll', onScroll);
    });


    return (

      <div id="container" class={styles.container}>

        <header>
          <section class={styles.left}>
            <Branding small={false} />
          </section>

          <section>
            <Welcome />
          </section>

          <section class={styles.right}>
            <Search />
          </section>
        </header>

        <div class={styles.subheader}>
          <div class={styles.shleft}>
            <Branding small={true} />
          </div>
          <div id="subheader_center" class={styles.shcenter}>
          </div>
          <div class={styles.shright}>
            <div>
              <Search />
            </div>
          </div>
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
            <ThemeToggle />
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
