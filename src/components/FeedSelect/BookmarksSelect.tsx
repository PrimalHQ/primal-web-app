import { Component } from 'solid-js';
import { useAccountContext } from '../../contexts/AccountContext';
import { useHomeContext } from '../../contexts/HomeContext';
import { useReadsContext } from '../../contexts/ReadsContext';
import { useSettingsContext } from '../../contexts/SettingsContext';
import { hookForDev } from '../../lib/devTools';
import { fetchStoredFeed } from '../../lib/localStore';
import { FeedOption, PrimalFeed, SelectionOption } from '../../types/primal';
import SelectBox from '../SelectBox/SelectBox';
import SelectionBox from '../SelectionBox/SelectionBox';

const BookmarksSelect: Component<{
  isPhone?: boolean,
  id?: string,
  big?: boolean,
  inital: string,
  selected?: string,
  onSelect: (kind: string) => void,
}> = (props) => {

  const reeds = useReadsContext();

  const selectOption = (option: FeedOption) => {
    props.onSelect(option.value || '');
  };

  const isSelected = (option: FeedOption) => {
    const selected = reeds?.selectedFeed;


    if (selected?.hex && option.value) {
      const t = option.value.split('_');

      const isHex = encodeURI(selected.hex) == t[0];
      const isOpt = t[1] === 'undefined' ?
        selected.includeReplies === undefined :
        selected.includeReplies?.toString() === t[1];

      return isHex && isOpt;
    }

    return false;
  }

  const options:() => SelectionOption[] = () => {
    let opts = [];

    opts.push(
      {
        label: 'Bookmarked Notes',
        value: 'notes',
      }
    );

    opts.push(
      {
        label: 'Bookmarked Reads',
        value: 'reads',
      }
    );

    return [ ...opts ];
  };

  const initialValue = () => {
    return options().find(o => o.value === props.inital)
  }

  const selectedValue = () => {
    if (!props.selected)
      return initialValue();

    return options().find(o => o.value === props.selected);
  };

  return (
    <SelectionBox
      options={options()}
      onChange={selectOption}
      initialValue={initialValue()}
      value={selectedValue()}
      isSelected={isSelected}
      isPhone={props.isPhone}
      big={props.big}
    />
  );
}

export default hookForDev(BookmarksSelect);
