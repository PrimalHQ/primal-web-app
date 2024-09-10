import { Component, Show } from 'solid-js';
import { useAccountContext } from '../../contexts/AccountContext';
import { useHomeContext } from '../../contexts/HomeContext';
import { useSettingsContext } from '../../contexts/SettingsContext';
import { hookForDev } from '../../lib/devTools';
import { fetchStoredFeed } from '../../lib/localStore';
import { FeedOption, PrimalFeed, SelectionOption } from '../../types/primal';
import SelectBox from '../SelectBox/SelectBox';
import SelectionBox from '../SelectionBox/SelectionBox';
import SelectionBox2 from '../SelectionBox/SelectionBox2';

const FeedSelect: Component<{ isPhone?: boolean, id?: string, big?: boolean}> = (props) => {

  const account = useAccountContext();
  const home = useHomeContext();
  const settings = useSettingsContext();

  const genId = (v: string) => Object.values(JSON.parse(v)).join('_')

  const selectFeed = (option: FeedOption) => {
    if (!option) return;

    const feed = {
      spec: option.value || '',
      name: option.label,
      description: option.description || '',
      default: option.deafault || false,
    };

    const selected = home?.selectedFeed;

    if (selected && selected.spec === feed.spec) return;

    home?.actions.clearNotes();
    home?.actions.selectFeed(feed);
  };

  const isSelected = (option: FeedOption) => {
    const selected = home?.selectedFeed;

    return selected && selected.spec === option.value;


    // if (selected?.hex && option.value) {
    //   const t = option.value.split('_');

    //   const isHex = encodeURI(selected.hex) == t[0];
    //   const isOpt = t[1] === 'undefined' ?
    //     selected.includeReplies === undefined :
    //     selected.includeReplies?.toString() === t[1];

    //   return isHex && isOpt;
    // }

    // return false;
  }

  const options:() => SelectionOption[] = () => {
    return settings?.homeFeeds.map(f => ({
      label: f.name,
      value: f.spec,
      description: f.description,
      default: f.default,
      id: genId(f.spec),
    })) || [];
    // let opts = [];

    // if (account?.publicKey) {
    //   opts.push(
    //     {
    //       label: 'My Reads',
    //       value: account?.publicKey || '',
    //     }
    //   );
    // }

    // opts.push(
    //   {
    //     label: 'All Reads',
    //     value: 'none',
    //   }
    // );

    // return [ ...opts ];
  };

  const initialValue = () => {
    const selected = home?.selectedFeed;

    if (!selected) {
      const feed = options()[0];
      selectFeed(feed);
      return feed;
    }

    return {
      label: selected.name,
      value: selected.spec || '',
      description: selected.description,
      default: selected.default,
      id: genId(selected.spec),
    }
  }

  const selectedValue = () => {
    if (!home?.selectedFeed)
      return initialValue();

    return {
      label: home.selectedFeed.name,
      value: home.selectedFeed.spec,
      description: home.selectedFeed.description,
      default: home.selectedFeed.default,
      id: genId(home.selectedFeed.spec),
    };
  };

  return (
    <Show when={options().length > 0}>
      <SelectionBox2
        options={options()}
        onChange={selectFeed}
        initialValue={initialValue()}
        value={selectedValue()}
        isSelected={isSelected}
        isPhone={props.isPhone}
        big={props.big}
      />
    </Show>
  );
}

export default hookForDev(FeedSelect);
