import { useIntl } from "@cookbook/solid-intl";
import { Select } from "@kobalte/core";
import { SelectBaseItemComponentProps } from "@kobalte/core/dist/types/select/select-base";

// Import default styles. (All examples use this via a global import)
import "@thisbeyond/solid-select/style.css";
import { Component, Show } from "solid-js";
import { hookForDev } from "../../lib/devTools";
import { placeholders } from "../../translations";
import { FeedOption } from "../../types/primal";

// Apply custom styling. See stylesheet below.
import styles from "./SelectionBox.module.scss";

const SelectionItem: Component<SelectBaseItemComponentProps<any>> = (props) => {

  return (
    <Select.Item item={props.item} class={props.item.rawValue.separator ? styles.separator : styles.item}>
      <Show
        when={!props.item.rawValue.separator}
      >
        <div class={styles.indicatorWrapper}>
          <Select.ItemIndicator>
            <div class={styles.checkIcon} />
          </Select.ItemIndicator>
        </div>
        <Select.ItemLabel>
          <div class={styles.label}>
            {props.item.rawValue.label}
          </div>
          <div class={styles.description}>
            {props.item.rawValue.description || ''}
          </div>
        </Select.ItemLabel>
      </Show>
    </Select.Item>
  );
}

export default hookForDev(SelectionItem);
