import { Component, createEffect, createSignal, For, onCleanup, onMount } from 'solid-js';

import styles from './EmojiPicker.module.scss';
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

const EmojiPicker: Component<{ id?: string, filter: string, onSelect: (emoji: EmojiOption) => void }> = (props) => {
  const [emojiResults, setEmojiResults] = createStore<EmojiOption[]>([]);
  const [highlightedEmoji, setHighlightedEmoji] = createSignal<number>(0);
  let emojiOptions: HTMLDivElement | undefined;
  const instanceId = uuidv4();

  const emojiChangeKeyboard = (e: KeyboardEvent) => {
    if (e.code === 'ArrowDown') {
      e.preventDefault();
      setHighlightedEmoji(i => {
        if (emojiResults.length === 0) {
          return 0;
        }

        return i < emojiResults.length - 7 ? i + 6 : 0;
      });

      const emojiHolder = document.getElementById(`${instanceId}-${highlightedEmoji()}`);

      if (emojiHolder && emojiOptions && !isVisibleInContainer(emojiHolder, emojiOptions)) {
        emojiHolder.scrollIntoView({ block: 'end', behavior: 'smooth' });
      }

      return;
    }

    if (e.code === 'ArrowUp') {
      e.preventDefault();
      setHighlightedEmoji(i => {
        if (emojiResults.length === 0) {
          return 0;
        }

        return i >= 6 ? i - 6 : emojiResults.length - 1;
      });

      const emojiHolder = document.getElementById(`${instanceId}-${highlightedEmoji()}`);

      if (emojiHolder && emojiOptions && !isVisibleInContainer(emojiHolder, emojiOptions)) {
        emojiHolder.scrollIntoView({ block: 'start', behavior: 'smooth' });
      }

      return;
    }

    if (e.code === 'ArrowRight') {
      e.preventDefault();
      setHighlightedEmoji(i => {
        if (emojiResults.length === 0) {
          return 0;
        }

        return i < emojiResults.length - 1 ? i + 1 : 0;
      });

      const emojiHolder = document.getElementById(`${instanceId}-${highlightedEmoji()}`);

      if (emojiHolder && emojiOptions && !isVisibleInContainer(emojiHolder, emojiOptions)) {
        emojiHolder.scrollIntoView({ block: 'end', behavior: 'smooth' });
      }

      return;
    }

    if (e.code === 'ArrowLeft') {
      e.preventDefault();
      setHighlightedEmoji(i => {
        if (emojiResults.length === 0) {
          return 0;
        }

        return i > 0 ? i - 1 : emojiResults.length - 1;
      });

      const emojiHolder = document.getElementById(`${instanceId}-${highlightedEmoji()}`);

      if (emojiHolder && emojiOptions && !isVisibleInContainer(emojiHolder, emojiOptions)) {
        emojiHolder.scrollIntoView({ block: 'start', behavior: 'smooth' });
      }

      return;
    }

    if (['Enter', 'Space'].includes(e.code)) {
      props.onSelect(emojiResults[highlightedEmoji()]);
      return;
    }
  };

  onMount(() => {
    window.addEventListener('keydown', emojiChangeKeyboard);
  });

  onCleanup(() => {
    window.removeEventListener('keydown', emojiChangeKeyboard);
  });

  createEffect(() => {
    const val = props.filter.trim();

    setEmojiResults(emojiSearch(val));
  });

  return (
    <div
      class={styles.emojiSuggestions}
      ref={emojiOptions}
    >
      <For each={emojiResults}>
        {(emoji, index) => (
          <button
            id={`${instanceId}-${index()}`}
            class={`${styles.emojiOption} ${highlightedEmoji() === index() ? styles.highlight : ''}`}
            onClick={() => {
              props.onSelect(emoji);
            }}
          >
            {emoji.name}
          </button>
        )}
      </For>
    </div>
  );
}

export default hookForDev(EmojiPicker);
