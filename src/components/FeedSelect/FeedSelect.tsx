import { A } from '@solidjs/router';
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
import { isDev } from '../../utils';

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
      enabled: true,
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
    if (!settings) return [];


    return settings?.homeFeeds.reduce<SelectionOption[]>((acc, f) => {
      return f.enabled ? [ ...acc, {
        label: f.name,
        value: f.spec,
        description: f.description,
        id: genId(f.spec),
      }] : [ ...acc ];
    }, []);
  };

  const initialValue = () => {
    const selected = home?.selectedFeed;

    if (!selected) {
      let feed = fetchStoredFeed(account?.publicKey, 'home');

      if (feed) {
        return {
          label: feed.name,
          value: feed.spec || '',
          description: feed.description,
          id: genId(feed.spec),
        }
      }

      const opts = options();
      const opt = opts.find(o =>  o.id === "global-trending_notes_24") || opts[0];

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
    if (!home?.selectedFeed)
      return initialValue();

    return {
      label: home.selectedFeed.name,
      value: home.selectedFeed.spec,
      description: home.selectedFeed.description,
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
        caption="Notes Feed"
        captionAction={<A href="/settings/home_feeds">Edit Feeds</A>}
      />
      <Show when={isDev() && home?.selectedFeed?.spec.includes('advsearch')}>
        <A href={`/search/${encodeURIComponent(JSON.parse(home?.selectedFeed?.spec || '{}').query)}`}>go to advanced search</A>
      </Show>
    </Show>
  );
}

export default hookForDev(FeedSelect);
