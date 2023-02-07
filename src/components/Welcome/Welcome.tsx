import { Component } from 'solid-js';
import Avatar from '../Avatar/Avatar';
import ThemeToggle from '../ThemeToggle/ThemeToggle';

import styles from './Welcome.module.scss';
import jack from '/assets/icons/jack.png';

const Welcome: Component = () => {
  return (
    <div class={styles.welcome}>
      <Avatar src={jack} />
      <div>
        <ThemeToggle />
      </div>
    </div>
  );
}

export default Welcome;
