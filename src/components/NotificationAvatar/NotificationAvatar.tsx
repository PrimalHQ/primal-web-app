import { Component, Show } from 'solid-js';
import defaultAvatar from '../../assets/icons/default_avatar.svg';
import { hookForDev } from '../../lib/devTools';

import styles from './NotificationAvatar.module.scss';

const NotificationAvatar: Component<{
  number: number | undefined,
  size?: "xxs" | "xs" | "vs" | "sm" | "md" | "lg" | "xl" | "xxl",
  verified?: string,
  id?: string,
}> = (props) => {

  const selectedSize = props.size || 'sm';

  const avatarClass = {
    xxs: styles.xxsAvatar,
    xs: styles.xsAvatar,
    vs: styles.vsAvatar,
    sm: styles.smallAvatar,
    md: styles.midAvatar,
    lg: styles.largeAvatar,
    xl: styles.extraLargeAvatar,
    xxl: styles.xxlAvatar,
  };

  const missingClass = {
    xxs: styles.xxsMissing,
    xs: styles.xsMissing,
    vs: styles.vsMissing,
    sm: styles.smallMissing,
    md: styles.midMissing,
    lg: styles.largeMissing,
    xl: styles.extraLargeMissing,
    xxl: styles.xxlMissing,
  };

  const imgError = (event: any) => {
    const image = event.target;
    image.onerror = "";
    image.src = defaultAvatar;
    return true;
  }

  return (
    <div id={props.id} class={avatarClass[selectedSize]}>
      <Show
        when={props.number}
        fallback={
          <div class={missingClass[selectedSize]}></div>
        }
      >
        +{props.number}
      </Show>
    </div>
  )
}

export default hookForDev(NotificationAvatar);
