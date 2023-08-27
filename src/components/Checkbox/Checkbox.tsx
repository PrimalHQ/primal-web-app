import { Component, JSXElement, Match, Show, Switch } from 'solid-js';

import styles from './Checkbox.module.scss';

const Checkbox: Component<{
  id: string,
  onChange: (e: Event) => void,
  checked?: boolean,
  label?: string,
  icon?: string,
  children?: JSXElement,
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
      <Switch>
        <Match when={props.children}>
          {props.children}
        </Match>
        <Match when={props.label}>
          <label for={props.id}>{props.label}</label>
        </Match>
      </Switch>
    </div>
  )
}

export default Checkbox;
