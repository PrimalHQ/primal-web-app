import { Component, Show } from 'solid-js';
import { useSettingsContext } from '../../contexts/SettingsContext';

import styles from './ExternalLink.module.scss';

const ExternalLink: Component<{
  lightIcon: string,
  darkIcon: string,
  label: string,
  href: string,
}> = (props) => {

  const settings = useSettingsContext();

  return (
    <div class={styles.externalLink}>
      <Show
        when={['sunset', 'midnight'].includes(settings?.theme || 'sunset')}
        fallback={
          <img src={props.darkIcon} />
        }
      >
        <img src={props.lightIcon} />
      </Show>
      <a
        href={props.href}
        target='_blank'
      >
        {props.label}
      </a>
    </div>
  );
}

export default ExternalLink;
