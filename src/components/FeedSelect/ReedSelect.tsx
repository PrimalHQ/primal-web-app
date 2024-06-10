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

const ReedSelect: Component<{ isPhone?: boolean, id?: string, big?: boolean}> = (props) => {

  const account = useAccountContext();
  const reeds = useReadsContext();
  const settings = useSettingsContext();

  const findFeed = (hex: string, includeReplies: string) => {
    const ir = includeReplies === 'undefined' ? undefined :
      includeReplies === 'true';

    return settings?.availableFeeds.find(f => {
      const isHex = f.hex === hex;
      const isOpt = typeof ir === typeof f.includeReplies ?
        f.includeReplies === ir :
        false;

      return isHex && isOpt;
    });
  };

  const selectFeed = (option: FeedOption) => {

    const [hex, includeReplies] = option.value?.split('_') || [];
    // const selector = document.getElementById('defocus');

    // selector?.focus();
    // selector?.blur();

    const feed = {
      hex: option.value,
      name: option.label,
    };

    reeds?.actions.clearNotes();
    reeds?.actions.selectFeed(feed);
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

    if (account?.publicKey) {
      opts.push(
        {
          label: 'My Reads',
          value: account?.publicKey || '',
        }
      );
    }

    opts.push(
      {
        label: 'All Reads',
        value: 'none',
      }
    );

    return [ ...opts ];
  };

  const initialValue = () => {
    const selected = reeds?.selectedFeed;

    if (!selected) {
      const feed = options()[0];
      selectFeed(feed);
      return feed;
    }

    return {
      label: selected.name,
      value: selected.hex || '',
    }
  }

  const selectedValue = () => {
    if (!reeds?.selectedFeed)
      return initialValue();

    const value = `${encodeURI(reeds.selectedFeed.hex || '')}`;

    return {
      label: reeds.selectedFeed.name,
      value,
    };
  };

  return (
    <SelectionBox
      options={options()}
      onChange={selectFeed}
      initialValue={initialValue()}
      value={selectedValue()}
      isSelected={isSelected}
      isPhone={props.isPhone}
      big={props.big}
    />
  );
}

export default hookForDev(ReedSelect);
