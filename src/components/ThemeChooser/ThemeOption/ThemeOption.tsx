import { Component, Show } from 'solid-js';
import styles from './ThemeOption.module.scss';

import check from '../../../assets/icons/check.svg';
import { PrimalTheme } from '../../../types/primal';
import { hookForDev } from '../../../lib/devTools';

const ThemeOption: Component<{
  theme: PrimalTheme,
  isSelected: boolean,
  onSelect: (value: PrimalTheme) => void,
  id?: string,
}> = (props) => {

  const selectedClass = () => {
    return props.isSelected ? styles.selected : '';
  };

  const uncheckedTheme = () => {
    return props.theme.dark ? styles.themeUncheckedDark : styles.themeUncheckedLight;
  }

  return (
      <div id={props.id} class={styles.themeOption}>
        <button
          class={`${styles[props.theme.name]} ${selectedClass()}`}
          onClick={() => props.onSelect(props.theme)}
        >
          <img src={props.theme.logo} />
          <Show
            when={props.isSelected}
            fallback={<div class={uncheckedTheme()}></div>}
          >
            <div class={styles.themeChecked}><img src={check} /></div>
          </Show>
        </button>
        <p>{props.theme.label}</p>
      </div>
  );
}

export default hookForDev(ThemeOption);
