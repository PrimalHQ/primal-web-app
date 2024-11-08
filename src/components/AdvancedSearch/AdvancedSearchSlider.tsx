import { useIntl } from '@cookbook/solid-intl';
import { useNavigate } from '@solidjs/router';
import { Component, createEffect, createSignal, For, onMount, Show } from 'solid-js';
import { useSearchContext } from '../../contexts/SearchContext';
import { nip05Verification, userName } from '../../stores/profile';
import { PrimalUser } from '../../types/primal';
import { debounce } from '../../utils';
import Avatar from '../Avatar/Avatar';
import Loader from '../Loader/Loader';
import { useToastContext } from '../Toaster/Toaster';
import { placeholders, search as t } from '../../translations';

import styles from './AdvancedSearch.module.scss';
import { hookForDev } from '../../lib/devTools';
import { useProfileContext } from '../../contexts/ProfileContext';
import { DropdownMenu } from '@kobalte/core/dropdown-menu';
import SearchOption from '../Search/SearchOption';
import { Slider } from '@kobalte/core/slider';
import { TextField } from '@kobalte/core/text-field';


const AdvancedSearchSlider: Component<{
  value: number[],
  min?: number,
  max?: number,
  name?: string,
  defaultValue?: number[],
  dark?: boolean,
  onSlide: (value: number[]) => void,
  onInput?: (value: string) => void,
  hideInput?: boolean,
  id?: string,
  step?: number,
}> = (props) => {

  const min = () => props.min || 0;
  const max = () => {
    const m = props.max || 100;
    const hi = props.value[1] || props.value[0];

    return hi > m ? hi : m;
  };

  const isRange = () => props.value.length > 1;

  return (

    <div class={styles.advancedSearchSlider}>

      <Slider
        class={styles.slider}
        name={props.name}
        minValue={min()}
        maxValue={max()}
        defaultValue={props.defaultValue}
        value={props.value}
        onChange={props.onSlide}
        step={props.step}
      >
        <Slider.Track class={styles.track}>
          <Slider.Fill class={styles.fill}/>

          <Slider.Thumb class={styles.thumb}>
            <Slider.Input />
          </Slider.Thumb>
          <Show when={isRange()}>
            <Slider.Thumb class={styles.thumb}>
              <Slider.Input />
            </Slider.Thumb>
          </Show>
        </Slider.Track>
      </Slider>

      <Show when={!props.hideInput}>
        <TextField
          class={`${styles.shortInput} ${props.dark ? styles.dark : ''} ${isRange() ? styles.long : ''}`}
          value={isRange() ? `${props.value[0]} - ${props.value[1]}` : `${props.value[0]}`}
          onChange={props.onInput}
          readOnly={!props.onInput}
        >
          <TextField.Input class={styles.input} />
        </TextField>
      </Show>
    </div>

  )
}

export default hookForDev(AdvancedSearchSlider);
