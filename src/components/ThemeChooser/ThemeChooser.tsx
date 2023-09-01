import { Component, For } from 'solid-js';

import styles from './ThemeChooser.module.scss';
import ThemeOption from './ThemeOption/ThemeOption';
import { useSettingsContext } from '../../contexts/SettingsContext';
import { PrimalTheme } from '../../types/primal';
import { hookForDev } from '../../lib/devTools';

const ThemeChooser: Component<{ id?: string }> = (props) => {

  const settings = useSettingsContext();

  const onSelect = (theme: PrimalTheme) => {
    settings?.actions?.setTheme(theme);
  };

  return (
    <div id={props.id} class={styles.themeChooser}>
      <For each={settings?.themes}>
        {(theme) => (
          <ThemeOption
            theme={theme}
            isSelected={settings?.theme === theme.name}
            onSelect={() => onSelect(theme)}
          />
        )}
      </For>
    </div>
  );
}

export default hookForDev(ThemeChooser);
