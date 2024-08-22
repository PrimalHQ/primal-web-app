import { Select } from '@kobalte/core/select';
import { Component, Show } from 'solid-js';

import styles from './AdvancedSearch.module.scss';


const AdvancedSearchSelectBox: Component<{
  value: string
  options: string[],
  onChange: (selection: string) => void,
  short?: boolean,
}> = (props) => {

  return (
    <Select
      class={styles.selectBox}
      value={props.value}
      options={props.options}
      onChange={props.onChange}
      gutter={2}
      itemComponent={props => (
        <Select.Item class={styles.selectItem} item={props.item}>
          <Select.ItemLabel>
            <Select.ItemIndicator>
              <div class={styles.checkIcon}></div>
            </Select.ItemIndicator>
            <div>{props.item.rawValue}</div>
          </Select.ItemLabel>
        </Select.Item>
      )}
    >
      <Select.Label />
      <Select.Trigger class={`${styles.trigger} ${props.short ? styles.shortTrigger : ''}`}>
        <Select.Value<string>>
          {s => s.selectedOption()}
        </Select.Value>
        <Show when={!props.short}>
          <div class={styles.chevronIcon}></div>
        </Show>
      </Select.Trigger>
      <Select.Description />
      <Select.ErrorMessage />
      <Select.Portal>
        <Select.Content>
          <Select.Listbox class={styles.selectContent} />
        </Select.Content>
      </Select.Portal>
    </Select>
  );
}

export default AdvancedSearchSelectBox;
