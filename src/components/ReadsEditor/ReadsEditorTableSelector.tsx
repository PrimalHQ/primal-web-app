import { Popover } from '@kobalte/core/popover';
import { Component, For, Show, createSignal } from 'solid-js';

import styles from './ReadsEditor.module.scss';
import { createStore } from 'solid-js/store';

const matrix = {
  rows: Array.from({ length: 8 }, (_, i) => i),
  cols: Array.from({ length: 6 }, (_, i) => i),
};

const ReadsEditorTableSelector: Component<{
  onSelect: (rows: number, cols: number) => void,
}> = (props) => {

  const [activeCell, setActiveCell] = createStore<number[]>([]);

  const onMouseOver = (row: number, col: number) => {
    const cells = document.querySelectorAll(`.${styles.tableMatrixItem}`);

    setActiveCell(() => [row, col]);

    cells.forEach(cell => {
      const r = parseInt(cell.getAttribute('data-row') || '0');
      const c = parseInt(cell.getAttribute('data-col') || '0');

      if (r <= row && c <= col) {
        cell.classList.add(styles.highlight);
      }
      else {
        cell.classList.remove(styles.highlight);
      }
    })
  }

  const insertTableCaption = () => {
    const [row, col] = activeCell;

    if (!row && !col) return 'Insert table';

    return `Insert ${col+1}x${row+1} table`;
  }

  const onClick = (row: number, col: number) => {
    props.onSelect(row+1, col+1);
    setActiveCell(() => []);
  }

  return (
    <Popover placement="bottom-start">
      <Popover.Trigger class={styles.tableSelectTrigger}>
        <div class={styles.tableIcon}></div>
        <div class={styles.chevronIcon}></div>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content class={styles.tableSelect}>
          <div class={styles.tableSelectHeader}>
            <Popover.Title class={styles.tableSelectorTitle}>
              {insertTableCaption()}
            </Popover.Title>
          </div>
          <Popover.Description class={styles.tableSelectContent}>
            <For each={matrix.cols}>
              { row =>
                <For each={matrix.rows}>
                  { col =>
                    <div
                      class={styles.tableMatrixItem}
                      data-row={`${row}`}
                      data-col={`${col}`}
                      onMouseOver={() => onMouseOver(row, col)}
                      onClick={() => onClick(row, col)}
                    ></div>
                  }
                </For>
              }
            </For>
          </Popover.Description>
        </Popover.Content>
      </Popover.Portal>
    </Popover>
  );
}

export default ReadsEditorTableSelector;
