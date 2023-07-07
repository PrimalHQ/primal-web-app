import { Component, For } from 'solid-js';

import styles from './ThemeChooser.module.scss';
import ThemeOption from './ThemeOption/ThemeOption';
import { useSettingsContext } from '../../contexts/SettingsContext';
import { PrimalTheme } from '../../types/primal';

const ThemeChooser: Component = () => {

  const settings = useSettingsContext();

  const onSelect = (theme: PrimalTheme) => {
    settings?.actions?.setTheme(theme);
  };

  return (
    <div class={styles.themeChooser}>
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

export default ThemeChooser;
