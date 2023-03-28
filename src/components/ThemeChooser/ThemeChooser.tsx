import { Component, For } from 'solid-js';

import styles from './ThemeChooser.module.scss';
import ThemeOption from './ThemeOption/ThemeOption';
import { useSettingsContext } from '../../contexts/SettingsContext';

const ThemeChooser: Component = () => {

  const settings = useSettingsContext();

  return (
    <div class={styles.themeChooser}>
      <For each={settings?.themes}>
        {(theme) => (
          <ThemeOption
            theme={theme}
            isSelected={settings?.theme === theme.name}
            onSelect={() => settings?.actions?.setTheme(theme)}
          />
        )}
      </For>
    </div>
  );
}

export default ThemeChooser;
