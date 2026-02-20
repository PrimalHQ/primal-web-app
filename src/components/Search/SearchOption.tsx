import { A } from '@solidjs/router';
import { Component, JSXElement, Show } from 'solid-js';
import { hookForDev } from '../../lib/devTools';
import { truncateNumber } from '../../lib/notifications';
import { truncateName, } from '../../stores/profile';


import styles from './SearchOption.module.scss';


const SearchOption: Component<{
  href?: string,
  title: string,
  description?: string,
  icon: JSXElement,
  statNumber?: number,
  statLabel?: string,
  underline?: boolean,
  darkTitle?: boolean,
  narrow?: boolean,
  onClick?: (e?: MouseEvent) => void,
  highlighted?: boolean,
  hasBackground?: boolean,
  id?: string,
}> = (props) => {

  const Content: Component<{ children: JSXElement }> = (prp) => {
    const klass = () => `${styles.userResult}
      ${props.underline ? styles.underline : ''}
      ${props.highlighted ? styles.highlight : ''}
      ${props.narrow ? styles.narrow : ''}
      ${props.hasBackground ? styles.hasBackground : ''}`;

    return (
      <Show
        when={props.href}
        fallback={
          <div
            id={props.id}
            class={klass()}
            onClick={props.onClick}
          >
            {prp.children}
          </div>
        }
      >
        <A
          id={props.id}
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
        <div class={`${styles.userName} ${props.darkTitle ? styles.darkTitle : ''}`}>
          {props.title}
        </div>
        <Show when={props.description && props.description.length > 0}>
          <div class={styles.verification} title={props.description}>
            {props.description || ''}
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

export default hookForDev(SearchOption);
