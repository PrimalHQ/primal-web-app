import { Component } from 'solid-js';
import Avatar from '../Avatar/Avatar';

import styles from './Welcome.module.scss';
import jack from '../../assets/icons/jack.png';
import PostButton from '../PostButton/PostButton';

const Welcome: Component = () => {
  return (
    <div class={styles.welcome}>
      <Avatar src={jack} />
      <div class={styles.border}>
        <input type="text" placeholder="post something to nostr..." />
      </div>
      <div>
        <PostButton />
      </div>
    </div>
  );
}

export default Welcome;
