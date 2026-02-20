import { Checkbox } from '@kobalte/core/checkbox';
import { Component, JSXElement, Match, Show, Switch } from 'solid-js';
import { hookForDev } from '../../lib/devTools';

import styles from './Checkbox.module.scss';

const CheckBox: Component<{
  id?: string,
  onChange: (checked: boolean) => void,
  checked?: boolean,
  label?: string,
  icon?: string,
  children?: JSXElement,
  disabled?: boolean,
}> = (props) => {

  return (
    <Checkbox
      class={styles.checkbox2}
      checked={props.checked}
      onChange={props.onChange}
    >
      <Checkbox.Input class={styles.input} />
      <Checkbox.Control class={styles.control}>
        <Checkbox.Indicator>
          <div class={styles.checkIcon} />
        </Checkbox.Indicator>
      </Checkbox.Control>
      <Checkbox.Label class={styles.label}>
        <Show when={props.icon}>
          <img class={styles.icon} src={props.icon} />
        </Show>
        <Switch>
          <Match when={props.children}>
            {props.children}
          </Match>
          <Match when={props.label}>
            {props.label}
          </Match>
        </Switch>
      </Checkbox.Label>
    </Checkbox>
  )

}

export default hookForDev(CheckBox);
