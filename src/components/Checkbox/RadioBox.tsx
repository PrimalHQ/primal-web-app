import { Checkbox } from '@kobalte/core/checkbox';
import { Component, For, JSXElement, Match, Show, Switch, createEffect, createSignal, on } from 'solid-js';
import { hookForDev } from '../../lib/devTools';

import styles from './Checkbox.module.scss';
import { RadioGroup } from '@kobalte/core/radio-group';

export type RadioBoxOption = { value: string, label: string, description?: string }

const RadioBox: Component<{
  id?: string,
  onChange: (option: RadioBoxOption) => void,
  label?: string,
  disabled?: boolean,
  options: RadioBoxOption[],
}> = (props) => {

  const [value, setValue] = createSignal<string>();

  createEffect(on(value, (v, pv) => {
    if (!v || v === pv) return;

    const option = props.options.find(o => o.value === v);

    option && props.onChange(option)
  }));

  return (
    <RadioGroup
      class={styles.radioGroup}
      value={value()}
      onChange={setValue}
    >
      <Show when={props.label}>
        <RadioGroup.Label class={styles.radioGroupLabel}>{props.label}</RadioGroup.Label>
      </Show>
      <div class={styles.radioItems} role="presentation">
        <For each={props.options}>
            {(opt) => (
            <RadioGroup.Item
              value={opt.value}
              class={styles.radioItem}
            >
              <RadioGroup.ItemInput class={styles.radioInput} />
              <RadioGroup.ItemControl class={styles.radioControl}>
                <RadioGroup.ItemIndicator class={styles.radioIndicator} />
              </RadioGroup.ItemControl>
              <RadioGroup.ItemLabel class={styles.radioLabel}>{opt.label}</RadioGroup.ItemLabel>
            </RadioGroup.Item>
          )}
        </For>
      </div>
    </RadioGroup>
  )

}

export default hookForDev(RadioBox);
