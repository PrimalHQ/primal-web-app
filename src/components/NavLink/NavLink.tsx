import { A, useLocation, useNavigate } from '@solidjs/router';
import { Component } from 'solid-js';

import styles from './NavLink.module.scss';

const NavLink: Component<{ to: string, label: string, icon: string}> = (props) => {

  const navigate = useNavigate();
  const location = useLocation();

  const shouldScroll = () => props.to === location.pathname;

  const onClick = (e: Event) => {
    if (shouldScroll()) {
      e.preventDefault();

      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      return;
    }

    navigate('/home');
  }

    return (
      <button class={styles.navLink} onClick={onClick}>
        <A href={props.to} activeClass={styles.active} inactiveClass={styles.inactive}>
          <div class={styles[props.icon]}></div>
          <p>{props.label}</p>
        </A>
      </button>
    )
}

export default NavLink;
