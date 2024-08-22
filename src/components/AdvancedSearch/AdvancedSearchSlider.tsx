import { useIntl } from '@cookbook/solid-intl';
import { useNavigate } from '@solidjs/router';
import { Component, createEffect, createSignal, For, Show } from 'solid-js';
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
  onChange: (value: number[]) => void,
  id?: string,
}> = (props) => {

  const min = () => props.min || 0;
  const max = () => props.max || 100;

  return (

    <div class={styles.advancedSearchSlider}>

      <Slider
        class={styles.slider}
        name={props.name}
        minValue={min()}
        maxValue={max()}
        defaultValue={props.defaultValue}
        value={props.value}
        onChange={props.onChange}
      >
        <Slider.Track class={styles.track}>
          <Slider.Fill class={styles.fill}/>

          <Slider.Thumb class={styles.thumb}>
            <Slider.Input />
          </Slider.Thumb>
          <Show when={props.value.length > 1}>
            <Slider.Thumb class={styles.thumb}>
              <Slider.Input />
            </Slider.Thumb>
          </Show>
        </Slider.Track>
      </Slider>

      <TextField
        class={`${styles.shortInput} ${props.dark ? styles.dark : ''} ${props.value.length > 1 ? styles.long : ''}`}
        value={props.value.length > 1 ? `${props.value[0]} - ${props.value[1]}` : `${props.value[0]}`}
        readOnly={true}
      >
        <TextField.Input class={styles.input} />
      </TextField>
    </div>

  )
}

export default hookForDev(AdvancedSearchSlider);
