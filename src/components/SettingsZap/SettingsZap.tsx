import { Component, For } from 'solid-js';

import styles from './SettingsZap.module.scss';
import { useSettingsContext } from '../../contexts/SettingsContext';
import { debounce } from '../../utils';

const SettingsZap: Component = () => {

  const settings = useSettingsContext();

  const changeDefaultZap = (e: InputEvent) => {
    debounce(() => {
      const target = e.target as HTMLInputElement;
      const val = parseInt(target.value);

      if (isNaN(val)) {
        return;
      }


      settings?.actions.setDefaultZapAmount(val);
    }, 500)
  };

  const changeZapOptions = (e: InputEvent, index: number) => {
    debounce(() => {
      const target = e.target as HTMLInputElement;
      const val = parseInt(target.value);

      if (isNaN(val)) {
        return;
      }

      settings?.actions.setZapOptions(val, index);
    }, 500);
  };

  return (
    <div class={styles.zapSettings}>
      <div class={styles.defaultZaps}>
        <div class={styles.caption}>
          Set default zap amount:
        </div>
        <input
          type='text'
          class={styles.zapInput}
          value={settings?.defaultZapAmount}
          onInput={changeDefaultZap}
        />
      </div>
      <div class={styles.customZaps}>
        <div class={styles.caption}>
          Set custom zap amount presets:
        </div>
        <div class={styles.zapOptions}>
          <For each={settings?.availableZapOptions}>
            {(value, index) =>
              <input
                type='text'
                class={styles.zapInput}
                value={value}
                onInput={(e: InputEvent) => changeZapOptions(e, index())}
              />
            }
          </For>
        </div>
      </div>
    </div>
  );
}

export default SettingsZap;
