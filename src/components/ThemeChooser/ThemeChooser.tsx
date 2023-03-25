import { Component, For } from 'solid-js';

import styles from './ThemeChooser.module.scss';
import logoFire from '../../assets/icons/logo_fire.svg';
import logoIce from '../../assets/icons/logo_ice.svg';
import ThemeOption from './ThemeOption/ThemeOption';
import { useSettingsContext } from '../../contexts/SettingsContext';

const ThemeChooser: Component = () => {

  const context = useSettingsContext();

  const themes = [
    {
      name: 'sunset',
      label: 'sunset wave',
      logo: logoFire,
      dark: true,
    },
    {
      name: 'sunrise',
      label: 'sunrise wave',
      logo: logoFire,
    },
    {
      name: 'midnight',
      label: 'midnight wave',
      logo: logoIce,
      dark: true,
    },
    {
      name:  'ice',
      label: 'ice wave',
      logo: logoIce,
    },
  ];

  return (
    <div class={styles.themeChooser}>
      <For each={themes}>
        {(theme) => (
          <ThemeOption
            theme={theme}
            isSelected={context?.theme === theme.name}
            onSelect={() => context?.actions?.setTheme(theme.name)}
          />
        )}
      </For>
    </div>
  );
}

export default ThemeChooser;
