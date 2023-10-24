import { useIntl } from "@cookbook/solid-intl";
import { Select } from "@kobalte/core";

// Import default styles. (All examples use this via a global import)
import "@thisbeyond/solid-select/style.css";
import { Component } from "solid-js";
import { hookForDev } from "../../lib/devTools";
import { placeholders } from "../../translations";
import { SelectionOption } from "../../types/primal";

import SelectionItem from "./SelectionItem";

// Apply custom styling. See stylesheet below.
import styles from  "./SelectionBox.module.scss";


const SelectionBox: Component<{
  options: SelectionOption[],
  onChange: (option: any) => void,
  initialValue?: string | SelectionOption,
  value?: string | SelectionOption,
  id?: string,
}> = (props) => {

  const defaultValue = () => {
    if (typeof props.initialValue === 'string') {
      return props.options.find(o => o.value === props.initialValue);
    }

    return props.initialValue;
  }
  const value = () => {
    if (!props.value) {
      return defaultValue();
    }

    if (typeof props.value === 'string') {
      return { label: props.value, value: props.value };
    }

    return props.value;
  }

  return (
    <Select.Root
      id={props.id}
      class={styles.selectionBox}
      options={props.options}
      optionValue="value"
      optionTextValue="label"
      optionDisabled="disabled"
      itemComponent={(prps) => SelectionItem(prps)}
      defaultValue={defaultValue()}
      value={value()}
      onChange={props.onChange}
      gutter={8}
    >
      <Select.Trigger class={styles.trigger}>
        <Select.Value<SelectionOption>>
          {state => state.selectedOption()?.label || ''}
        </Select.Value>
        <Select.Icon>
          <div class={styles.selectionIcon}></div>
        </Select.Icon>
      </Select.Trigger>
      <Select.Content>
        <Select.Listbox class={styles.listbox}/>
      </Select.Content>
    </Select.Root>
  );
}

export default hookForDev(SelectionBox);
