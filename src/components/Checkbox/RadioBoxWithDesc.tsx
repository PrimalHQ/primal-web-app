import { Checkbox } from '@kobalte/core/checkbox';
import { Component, For, JSXElement, Match, Show, Switch, createEffect, createSignal, on } from 'solid-js';
import { hookForDev } from '../../lib/devTools';

import styles from './Checkbox.module.scss';
import { RadioGroup } from '@kobalte/core/radio-group';
import { RadioBoxOption } from './RadioBox';

const RadioBoxWithDescription: Component<{
  id?: string,
  onChange: (option: RadioBoxOption) => void,
  label?: string,
  disabled?: boolean,
  value?: string,
  options: RadioBoxOption[],
}> = (props) => {

  return (
    <RadioGroup
      class={styles.radioGroup}
      value={props.value}
      onChange={(v) => props.onChange(props.options.find(o => o.value === v))}
    >
      <Show when={props.label}>
        <RadioGroup.Label class={styles.radioGroupLabel}>{props.label}</RadioGroup.Label>
      </Show>
      <div class={styles.radioItemsWithDesc} role="presentation">
        <For each={props.options}>
            {(opt) => (
            <RadioGroup.Item
              value={opt.value}
              class={styles.radioItemWithDesc}
            >
              <RadioGroup.ItemInput class={styles.radioInput} />
              <RadioGroup.ItemControl class={styles.radioControl}>
                <RadioGroup.ItemIndicator class={styles.radioIndicator} />
              </RadioGroup.ItemControl>
              <RadioGroup.ItemLabel class={styles.radioLabel}>
                <div class={styles.radioOption}>
                  <div class={styles.label}>{opt.label}</div>
                  <div class={styles.description}>{opt.description}</div>
                </div>
              </RadioGroup.ItemLabel>
            </RadioGroup.Item>
          )}
        </For>
      </div>
    </RadioGroup>
  )

}

export default hookForDev(RadioBoxWithDescription);
