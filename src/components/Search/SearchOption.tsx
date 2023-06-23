import { A } from '@solidjs/router';
import { Component, JSXElement, Show } from 'solid-js';
import { truncateNumber } from '../../lib/notifications';
import { truncateName, truncateNpub } from '../../stores/profile';


import styles from './SearchOption.module.scss';


const SearchOption: Component<{
  href?: string,
  title: string,
  description?: string,
  icon: JSXElement,
  statNumber?: number,
  statLabel?: string,
  underline?: boolean,
  onClick?: (e?: MouseEvent) => void,
  highlighted?: boolean,
}> = (props) => {

  const Content: Component<{ children: JSXElement }> = (prp) => {
    const klass = () => `${styles.userResult}
      ${props.underline ? styles.underline : ''}
      ${props.highlighted ? styles.highlight : ''}`;

    return (
      <Show
        when={props.href}
        fallback={
          <div
            class={klass()}
            onClick={props.onClick}
          >
            {prp.children}
          </div>
        }
      >
        <A
          href={props.href || ''}
          class={klass()}
          tabIndex={0}
          onClick={props.onClick}
        >
          {prp.children}
        </A>
      </Show>
    );
  };

  return (
    <Content>
      <div class={styles.userAvatar}>
        {props.icon}
      </div>
      <div class={styles.userInfo}>
        <div class={styles.userName}>
          {props.title}
        </div>
        <Show when={props.description && props.description.length > 0}>
          <div class={styles.verification} title={props.description}>
            {truncateName(props.description || '')}
          </div>
        </Show>
      </div>
      <Show when={props.statNumber}>
        <div class={styles.userStats}>
          <div class={styles.followerNumber}>
            {truncateNumber(props.statNumber || 0)}
          </div>
          <div class={styles.followerLabel}>
            {props.statLabel}
          </div>
        </div>
      </Show>
    </Content>
  );
}

export default SearchOption;
