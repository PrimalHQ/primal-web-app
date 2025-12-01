import { Component, createSignal, Show, For } from 'solid-js';
import { currencySymbols, popularCurrencies } from '../../lib/currency';
import styles from './CurrencyDropdown.module.scss';

type CurrencyDropdownProps = {
  value: string;
  onChange: (currency: string) => void;
};

const CurrencyDropdown: Component<CurrencyDropdownProps> = (props) => {
  const [isOpen, setIsOpen] = createSignal(false);

  const allCurrencies = Object.keys(currencySymbols).sort();
  const otherCurrencies = allCurrencies.filter(c => !popularCurrencies.includes(c));

  const handleSelect = (currency: string) => {
    props.onChange(currency);
    setIsOpen(false);
  };

  return (
    <div class={styles.dropdown}>
      <button
        class={styles.trigger}
        onClick={() => setIsOpen(!isOpen())}
        type="button"
      >
        {props.value}
        <svg class={styles.chevron} width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
          <path d="M2 4l4 4 4-4"/>
        </svg>
      </button>

      <Show when={isOpen()}>
        <div class={styles.overlay} onClick={() => setIsOpen(false)} />
        <div class={styles.menu}>
          <div class={styles.menuSection}>
            <div class={styles.menuLabel}>Popular</div>
            <For each={popularCurrencies}>
              {(currency) => (
                <button
                  class={`${styles.menuItem} ${props.value === currency ? styles.menuItemActive : ''}`}
                  onClick={() => handleSelect(currency)}
                  type="button"
                >
                  <span class={styles.currencySymbol}>
                    {currencySymbols[currency].symbol}
                  </span>
                  {currency}
                </button>
              )}
            </For>
          </div>

          <div class={styles.menuDivider} />

          <div class={styles.menuSection}>
            <div class={styles.menuLabel}>Other Currencies</div>
            <div class={styles.currencyGrid}>
              <For each={otherCurrencies}>
                {(currency) => (
                  <button
                    class={`${styles.menuItem} ${props.value === currency ? styles.menuItemActive : ''}`}
                    onClick={() => handleSelect(currency)}
                    type="button"
                  >
                    <span class={styles.currencySymbol}>
                      {currencySymbols[currency].symbol}
                    </span>
                    {currency}
                  </button>
                )}
              </For>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default CurrencyDropdown;
