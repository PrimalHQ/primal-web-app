import { useParams } from "@solidjs/router";
import { Select, createOptions } from "@thisbeyond/solid-select";

// Import default styles. (All examples use this via a global import)
import "@thisbeyond/solid-select/style.css";
import { Component } from "solid-js";
import { FeedOption } from "../../types/primal";

// Apply custom styling. See stylesheet below.
import "./SelectBox.scss";

const SelectBox: Component<{ options: () => FeedOption[], onChange: (value: any) => void, initialValue: any, isSelected: (value: any) => boolean }> = (params) => {

  const opts = createOptions(params.options, { key: 'label', disable: params.isSelected })

  const onFocus = () => {
    const control = document.querySelector('.solid-select-control');
    control?.classList.add('highlighted');
  }

  const onBlur = () => {
    const control = document.querySelector('.solid-select-control');
    control?.classList.remove('highlighted');
  }

  return (
    <Select
      class="feed_select"
      initialValue={params.initialValue}
      onChange={params.onChange}
      placeholder='Select feed'
      readonly={true}
      onFocus={onFocus}
      onBlur={onBlur}
      {...opts}
    />
  );
}

export default SelectBox;
