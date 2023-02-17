import { Component, For } from 'solid-js';
import NavLink from '../NavLink/NavLink';
import ThemeToggle from '../ThemeToggle/ThemeToggle';

import styles from './NavMenu.module.scss';

const NavMenu: Component = (props) => {

    const links = [
      { to: '/home', label: 'Home', icon: 'homeIcon' },
      { to: '/explore', label: 'Explore', icon: 'exploreIcon' },
      { to: '/messages', label: 'Messages', icon: 'messagesIcon' },
      { to: '/notifications', label: 'Notifications', icon: 'notificationsIcon' },
      { to: '/downloads', label: 'Downloads', icon: 'downloadIcon' },
      { to: '/settings', label: 'Settings', icon: 'settingsIcon' },
      { to: '/help', label: 'Help', icon: 'helpIcon' },
    ];

    return (
      <div class={styles.navMenu}>
        <nav class={styles.sideNav}>
          <aside>
            <For each={links}>
              {({ to, label, icon }) =>
                <NavLink to={to} label={label} icon={icon} />
              }
            </For>
          </aside>
        </nav>
        <div class={styles.callToAction}>
          <ThemeToggle />
        </div>
      </div>
    )
}

export default NavMenu;
