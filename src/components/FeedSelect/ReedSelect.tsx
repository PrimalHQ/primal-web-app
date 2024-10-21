import { A } from '@solidjs/router';
import { Component, Show } from 'solid-js';
import { useAccountContext } from '../../contexts/AccountContext';
import { useHomeContext } from '../../contexts/HomeContext';
import { useReadsContext } from '../../contexts/ReadsContext';
import { useSettingsContext } from '../../contexts/SettingsContext';
import { hookForDev } from '../../lib/devTools';
import { fetchStoredFeed } from '../../lib/localStore';
import { FeedOption, PrimalFeed, SelectionOption } from '../../types/primal';
import { sha256 } from '../../utils';
import SelectBox from '../SelectBox/SelectBox';
import SelectionBox from '../SelectionBox/SelectionBox';
import SelectionBox2 from '../SelectionBox/SelectionBox2';

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

  const genId = (v: string) => Object.values(JSON.parse(v)).join('_')

  const selectFeed = (option: FeedOption) => {
    if (!option) return;

    const feed = {
      spec: option.value || '',
      name: option.label,
      description: option.description || '',
      enabled: true,
    };

    const selected = reeds?.selectedFeed;

    if (selected && selected.spec === feed.spec) return;

    reeds?.actions.clearNotes();
    reeds?.actions.selectFeed(feed);
  };

  const isSelected = (option: FeedOption) => {
    const selected = reeds?.selectedFeed;

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
    if (!settings) return [];

    return settings?.readsFeeds.reduce<SelectionOption[]>((acc, f) => {
      return f.enabled ? [ ...acc, {
        label: f.name,
        value: f.spec,
        description: f.description,
        id: genId(f.spec),
      }] : acc;
    }, []);

    // return settings?.readsFeeds.map(f => ({
    //   label: f.name,
    //   value: f.spec,
    //   description: f.description,
    //   id: genId(f.spec),
    // })) || [];
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
    const selected = reeds?.selectedFeed;

    if (!selected) {
      let feed = fetchStoredFeed(account?.publicKey, 'reads');

      if (feed) {
        return {
          label: feed.name,
          value: feed.spec || '',
          description: feed.description,
          id: genId(feed.spec),
        }
      }

      
      const opt = options()[0];
      
      selectFeed(opt);
      return opt;
    }

    return {
      label: selected.name,
      value: selected.spec || '',
      description: selected.description,
      id: genId(selected.spec),
    }
  }

  const selectedValue = () => {
    if (!reeds?.selectedFeed)
      return initialValue();

    return {
      label: reeds.selectedFeed.name,
      value: reeds.selectedFeed.spec,
      description: reeds.selectedFeed.description,
      id: genId(reeds.selectedFeed.spec),
    };
  };

  return (
      <SelectionBox2
        options={options()}
        onChange={selectFeed}
        initialValue={initialValue()}
        value={selectedValue()}
        isSelected={isSelected}
        isPhone={props.isPhone}
        big={props.big}
        caption="Reads Feeds"
        captionAction={<A href="/settings/reads_feeds">Edit Feeds</A>}
      />
  );
}

export default hookForDev(ReedSelect);
