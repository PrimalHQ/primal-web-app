import type { Component } from 'solid-js';

import styles from './Avatar.module.scss';

const Avatar: Component<{ src: string }> = (props) => {

    return (
      <div class={styles.avatar}>
        <img src={props.src} alt="avatar" />
      </div>
    )
}

export default Avatar;
