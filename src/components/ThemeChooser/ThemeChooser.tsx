import { Component, For, createEffect, createSignal, on } from 'solid-js';

import styles from './ThemeChooser.module.scss';
import ThemeOption from './ThemeOption/ThemeOption';
import { useSettingsContext } from '../../contexts/SettingsContext';
import { PrimalTheme } from '../../types/primal';
import { hookForDev } from '../../lib/devTools';
import { themes } from '../../constants';
import { readTheme } from '../../lib/localStore';
import { accountStore } from '../../stores/accountStore';

const ThemeChooser: Component<{ id?: string }> = (props) => {

  const settings = useSettingsContext();

  const [checkedTheme, setCheckedTheme] = createSignal<PrimalTheme>(themes.find(t => t.name === settings?.theme) || themes[1]);

  createEffect(on(() => accountStore.publicKey, (pubkey, prev) => {
    if (!pubkey || pubkey === prev) return;
    const selectedTheme = readTheme(pubkey);
    setCheckedTheme(themes.find(t => t.name === selectedTheme) || themes[1])
  }));

  const onSelect = (theme: PrimalTheme) => {
    setCheckedTheme(theme);
    settings?.actions.setUseSystemTheme(false);
    settings?.actions?.setTheme(theme);
  };

  return (
    <div id={props.id} class={styles.themeChooser}>
      <For each={settings?.themes}>
        {(theme) => (
          <ThemeOption
            theme={theme}
            isSelected={checkedTheme().name === theme.name}
            onSelect={() => onSelect(theme)}
          />
        )}
      </For>
    </div>
  );
}

export default hookForDev(ThemeChooser);
