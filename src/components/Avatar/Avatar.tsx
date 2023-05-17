import { Component, Show } from 'solid-js';
import defaultAvatar from '../../assets/icons/default_nostrich.svg';

import styles from './Avatar.module.scss';

const Avatar: Component<{
  src: string | undefined,
  size?: "xxs" | "xs" | "vs" | "sm" | "md" | "lg" | "xl" | "xxl",
  verified?: string,
  highlightBorder?: boolean,
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

  const highlightClass = () => {
    if (props.highlightBorder) {
      return styles.highlightBorder;
    }

    return '';
  };

  return (
    <div class={`${avatarClass[selectedSize]} ${highlightClass()}`}>
      <Show
        when={props.src}
        fallback={
          <div class={styles.missingBack}>
            <div class={missingClass[selectedSize]}></div>
          </div>
        }
      >
        <div class={styles.missingBack}>
          <img src={props.src} alt="avatar" onerror={imgError}/>
        </div>
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
