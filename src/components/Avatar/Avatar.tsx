import { Component, Show } from 'solid-js';
import defaultAvatar from '../../assets/icons/default_nostrich.svg';
import { getMediaUrl } from '../../lib/media';

import styles from './Avatar.module.scss';

const Avatar: Component<{
  src: string | undefined,
  size?: "xxs" | "xss" | "xs" | "vs" | "sm" | "md" | "lg" | "xl" | "xxl",
  verified?: string,
  highlightBorder?: boolean,
}> = (props) => {

  const selectedSize = props.size || 'sm';

  const avatarClass = {
    xxs: styles.xxsAvatar,
    xss: styles.xssAvatar,
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
    xss: styles.xssMissing,
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


  const imageSrc = () => {
    let size = 'm';

    switch (selectedSize) {
      case 'xxs':
      case 'xss':
      case 'xs':
      case 'vs':
      case 'sm':
      case 'md':
      case 'lg':
        size = 's';
        break;
      default:
        size = 'm';
        break;
    };


    return props.src && getMediaUrl(props.src, size);
  };

  return (
    <div class={`${avatarClass[selectedSize]} ${highlightClass()}`}>
      <Show
        when={imageSrc()}
        fallback={
          <div class={styles.missingBack}>
            <div class={missingClass[selectedSize]}></div>
          </div>
        }
      >
        <div class={styles.missingBack}>
          <img src={imageSrc()} alt="avatar" onerror={imgError}/>
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
