import { Component, Show } from 'solid-js';
import logo from '../../assets/icons/logo.svg';

import styles from './Avatar.module.scss';

const Avatar: Component<{
  src: string | undefined,
  size?: "xxs" | "xs" | "sm" | "md" | "lg" | "xl",
  verified?: string
}> = (props) => {

    const selectedSize = props.size || 'sm';

    const avatarClass = {
      xxs: styles.xxsAvatar,
      xs: styles.xsAvatar,
      sm: styles.smallAvatar,
      md: styles.midAvatar,
      lg: styles.largeAvatar,
      xl: styles.extraLargeAvatar
    };

    const missingClass = {
      xxs: styles.xxsMissing,
      xs: styles.xsMissing,
      sm: styles.smallMissing,
      md: styles.midMissing,
      lg: styles.largeMissing,
      xl: styles.extraLargeMissing
    };

    return (
      <div class={avatarClass[selectedSize]}>
        <Show
          when={props.src}
          fallback={
            <div class={missingClass[selectedSize]}></div>
          }
        >
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
