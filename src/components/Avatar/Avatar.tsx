import type { Component } from 'solid-js';

import styles from './Avatar.module.scss';

const Avatar: Component<{ src: string, size?: "xs" | "sm" | "lg" }> = (props) => {

    const selectedSize = props.size || 'sm';

    const avatarClass = {
      xs: styles.xsAvatar,
      sm: styles.smallAvatar,
      lg: styles.largeAvatar,
    };

    return (
      <div class={avatarClass[selectedSize]}>
        <img src={props.src} alt="avatar" />
      </div>
    )
}

export default Avatar;
