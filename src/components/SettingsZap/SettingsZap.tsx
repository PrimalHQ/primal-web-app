import { Component, createSignal, For } from 'solid-js';

import styles from './SettingsZap.module.scss';
import { useSettingsContext } from '../../contexts/SettingsContext';
import { debounce } from '../../utils';
import { useIntl } from '@cookbook/solid-intl';
import ConfirmModal from '../ConfirmModal/ConfirmModal';
import { settings as t } from '../../translations';
import { hookForDev } from '../../lib/devTools';

const SettingsZap: Component<{ id?: string }> = (props) => {

  const intl = useIntl();
  const settings = useSettingsContext();


  const [isRestoringZaps, setIsRestoringZaps] = createSignal(false);

  const onRestoreZaps = () => {
    settings?.actions.resetZapOptionsToDefault();
    setIsRestoringZaps(false);
  };

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
    <div id={props.id} class={styles.zapSettings}>
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

      <div class={styles.restoreZaps}>
        <button
            onClick={() => setIsRestoringZaps(true)}
        >
          {intl.formatMessage(t.feedsRestore)}
        </button>
      </div>

      <ConfirmModal
        open={isRestoringZaps()}
        description={intl.formatMessage(t.zapsRestoreConfirm)}
        onConfirm={onRestoreZaps}
        onAbort={() => setIsRestoringZaps(false)}
      />
    </div>
  );
}

export default hookForDev(SettingsZap);
