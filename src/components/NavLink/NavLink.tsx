import { A, useLocation, useNavigate } from '@solidjs/router';
import { Component, Show } from 'solid-js';
import { hookForDev } from '../../lib/devTools';

import styles from './NavLink.module.scss';

const NavLink: Component<{
  id?: string,
  to: string,
  label: string,
  icon: string,
  bubble?: () => number,
  hiddenOnSmallScreens?: boolean,
}> = (props) => {

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

  const bubbleClass = () => {
    if (!props.bubble || props.bubble() < 10) {
      return '';
    }

    if (props.bubble() < 100) {
      return styles.doubleSize;
    }

    return styles.tripleSize;
  }

    return (
      <button id={props.id} class={`${styles.navLink} ${props.hiddenOnSmallScreens ? styles.hiddenOnSmallScreens : ''}`} onClick={onClick}>
        <Show when={props.bubble && props.bubble() > 0}>
          <div class={`${styles.bubble} ${bubbleClass()}`}>
            <div>{props.bubble && props.bubble() < 100 ? props.bubble() : '99+'}</div>
          </div>
        </Show>
        <A href={props.to} activeClass={styles.active} inactiveClass={styles.inactive}>
          <div class={styles[props.icon]}></div>
          <p>{props.label}</p>
        </A>
      </button>
    )
}

export default hookForDev(NavLink);
