import { A } from '@solidjs/router';
import { Component } from 'solid-js';

import styles from './NavLink.module.scss';

const NavLink: Component<{ to: string, label: string, icon: string}> = (props) => {

    return (
      <div class={styles.navLink}>
        <A href={props.to} activeClass={styles.active} inactiveClass={styles.inactive}>
          <div class={styles[props.icon]}></div>
          <p>{props.label}</p>
        </A>
      </div>
    )
}

export default NavLink;
