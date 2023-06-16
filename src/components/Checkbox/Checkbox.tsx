import { Component, Show } from 'solid-js';

import styles from './Checkbox.module.scss';
import { useNavigate } from '@solidjs/router';
import { useIntl } from '@cookbook/solid-intl';

const Checkbox: Component<{
  id: string,
  onChange: (e: Event) => void,
  checked?: boolean,
  label: string,
  icon?: string,
}> = (props) => {

  return (
    <div class={styles.checkbox}>
      <input
        id={props.id}
        type='checkbox'
        checked={props.checked}
        onChange={props.onChange}
      />
      <Show when={props.icon}>
        <img src={props.icon} />
      </Show>
      <label for={props.id}>{props.label}</label>
    </div>
  )
}

export default Checkbox;
