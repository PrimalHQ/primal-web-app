import { Component, createEffect, createSignal, For } from 'solid-js';

import styles from './SettingsZap.module.scss';
import { useSettingsContext } from '../../contexts/SettingsContext';
import { debounce, isVisibleInContainer, uuidv4 } from '../../utils';
import { useIntl } from '@cookbook/solid-intl';
import ConfirmModal from '../ConfirmModal/ConfirmModal';
import { settings as t } from '../../translations';
import { hookForDev } from '../../lib/devTools';
import ButtonLink from '../Buttons/ButtonLink';
import Modal from '../Modal/Modal';

import emojiSearch from '@jukben/emoji-search';
import { createStore } from 'solid-js/store';
import { EmojiOption } from '../../types/primal';
import ButtonPrimary from '../Buttons/ButtonPrimary';
import EmojiPicker from '../EmojiPicker/EmojiPicker';

const SettingsZap: Component<{ id?: string }> = (props) => {

  const intl = useIntl();
  const settings = useSettingsContext();


  const [isRestoringZaps, setIsRestoringZaps] = createSignal(false);

  const [isEmojiChange, setIsEmojiChange] = createSignal(-1);

  const [emojiSearchTerm, setEmojiSearchTerm] = createSignal('smile');

  const onRestoreZaps = () => {
    settings?.actions.resetZapOptionsToDefault();
    setIsRestoringZaps(false);
  };

  const changeDefaultZapAmount = (e: InputEvent) => {
    debounce(() => {
      const target = e.target as HTMLInputElement;
      const amount = parseInt(target.value);

      if (isNaN(amount)) {
        return;
      }

      settings?.actions.setDefaultZapAmount({ amount });
    }, 500)
  };

  const changeDefaultZapMessage = (e: InputEvent) => {
    debounce(() => {
      const target = e.target as HTMLInputElement;
      const message = target.value;

      settings?.actions.setDefaultZapAmount({ message });
    }, 500)
  };

  const changeZapOptionAmount = (e: InputEvent, index: number) => {
    debounce(() => {
      const target = e.target as HTMLInputElement;
      const amount = parseInt(target.value);

      if (isNaN(amount)) {
        return;
      }

      settings?.actions.setZapOptions({ amount }, index);
    }, 500);
  };

  const changeZapOptionMessage = (e: InputEvent, index: number) => {
    debounce(() => {
      const target = e.target as HTMLInputElement;
      const message = target.value;

      settings?.actions.setZapOptions({ message }, index);
    }, 500);
  };

  const changeZapOptionEmoji = (emojiOption: EmojiOption) => {
    if (isEmojiChange() < 0) return;

    settings?.actions.setZapOptions({ emoji: emojiOption.name }, isEmojiChange());
    setIsEmojiChange(-1);
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.code === 'Escape') {
      setIsEmojiChange(-1);
      return;
    }
  };

  let emojiInput: HTMLInputElement | undefined;

  createEffect(() => {
    if (isEmojiChange() >= 0) {
      window.addEventListener('keydown', onKey);
      setTimeout(() => {
        setEmojiSearchTerm(() => 'smile')
        emojiInput?.focus();
      }, 10);
    }
    else {
      window.removeEventListener('keydown', onKey);
    }
  })

  return (
    <div id={props.id} class={styles.zapSettings}>
      <div class={styles.defaultZaps}>
        <div class={styles.caption}>
          Set default zap amount:
        </div>
        <div
          class={styles.zapInput}
        >
          <input
            class={styles.defAmount}
            type='text'
            value={settings?.defaultZap.amount}
            onInput={changeDefaultZapAmount}
          />
          <input
            class={styles.defMessage}
            type='text'
            value={settings?.defaultZap.message}
            onInput={changeDefaultZapMessage}
          />
        </div>
      </div>
      <div class={styles.customZaps}>
        <div class={styles.caption}>
          Set custom zap amount presets:
        </div>
        <div class={styles.zapOptions}>
          <For each={settings?.availableZapOptions}>
            {(option, index) =>
              <div class={styles.zapInput}>
                <button
                  class={styles.optEmoji}
                  onClick={(e: MouseEvent) => setIsEmojiChange(index())}
                >
                  {option.emoji}
                </button>
                <input
                  class={styles.optAmount}
                  type='text'
                  value={option.amount}
                  onInput={(e: InputEvent) => changeZapOptionAmount(e, index())}
                />
                <input
                  class={styles.optMessage}
                  type='text'
                  value={option.message}
                  onInput={(e: InputEvent) => changeZapOptionMessage(e, index())}
                />
              </div>
            }
          </For>
        </div>
      </div>

      <div class={styles.restoreZaps}>
        <ButtonLink
          onClick={() => setIsRestoringZaps(true)}
        >
          {intl.formatMessage(t.feedsRestore)}
        </ButtonLink>
      </div>

      <ConfirmModal
        open={isRestoringZaps()}
        description={intl.formatMessage(t.zapsRestoreConfirm)}
        onConfirm={onRestoreZaps}
        onAbort={() => setIsRestoringZaps(false)}
      />

      <Modal
        open={isEmojiChange() >= 0}
        onBackdropClick={() => setIsEmojiChange(-1)}
      >
        <div id={props.id} class={styles.zapEmojiChangeModal}>
          <div class={styles.title}>
            {intl.formatMessage(t.zapEmojiFilterTitle)}
          </div>

          <button class={styles.xClose} onClick={() => setIsEmojiChange(-1)}>
            <div class={styles.iconClose}></div>
          </button>

          <input
            ref={emojiInput}
            onInput={(e: InputEvent) => {
              const target = e.target as HTMLInputElement;
              setEmojiSearchTerm(() => target.value);
            }}
            placeholder={intl.formatMessage(t.zapEmojiFilterPlaceholder)}
          >
          </input>

          <EmojiPicker
            filter={emojiSearchTerm()}
            onSelect={changeZapOptionEmoji}
          />
        </div>
      </Modal>
    </div>
  );
}

export default hookForDev(SettingsZap);
