import { Component, Show } from 'solid-js';
import logo from '../../assets/icons/logo.svg';

import styles from './Avatar.module.scss';

const Avatar: Component<{
  src: string, size?: "xs" | "sm" | "md" | "lg" | "xl",
  verified?: string
}> = (props) => {

    const selectedSize = props.size || 'sm';

    const avatarClass = {
      xs: styles.xsAvatar,
      sm: styles.smallAvatar,
      md: styles.midAvatar,
      lg: styles.largeAvatar,
      xl: styles.extraLargeAvatar
    };

    return (
      <div class={avatarClass[selectedSize]}>
        <Show when={props.src} fallback={<div>MIA</div>}>
          <img src={props.src} alt="avatar" />
        </Show>
        <Show when={props.verified}>
          <div class={styles.iconBackground}>
            <div class={styles.verifiedIcon}></div>
          </div>
        </Show>
      </div>
    )
}

export default Avatar;
