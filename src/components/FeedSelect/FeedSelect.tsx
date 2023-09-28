import { Component } from 'solid-js';
import { useHomeContext } from '../../contexts/HomeContext';
import { useSettingsContext } from '../../contexts/SettingsContext';
import { hookForDev } from '../../lib/devTools';
import { FeedOption, PrimalFeed } from '../../types/primal';
import SelectBox from '../SelectBox/SelectBox';

const FeedSelect: Component<{ isPhone?: boolean, id?: string}> = (props) => {

  const home = useHomeContext();
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
    const selector = document.getElementById('defocus');

    selector?.focus();
    selector?.blur();

    if (hex && !isSelected(option)) {
      const feed = findFeed(hex, includeReplies);

      if (hex !== initialValue()?.value) {
        home?.actions.clearNotes();
        home?.actions.selectFeed(feed);
      }
      return;
    }

  };

  const isSelected = (option: FeedOption) => {
    const selected = home?.selectedFeed;


    if (selected?.hex && option.value) {
      const t = option.value.split('_');

      const isHex = selected.hex == t[0];
      const isOpt = t[1] === 'undefined' ?
        selected.includeReplies === undefined :
        selected.includeReplies?.toString() === t[1];

      return isHex && isOpt;
    }

    return false;
  }

  const options:() => FeedOption[] = () => {
    if (settings?.availableFeeds === undefined) {
     return [];
    }

    return settings.availableFeeds.map(feed => {
      return ({
        label: feed.name,
        value: `${feed.hex}_${feed.includeReplies}`,
      });
    });
  };

  const initialValue = () => {
    const selected = home?.selectedFeed;

    if (!selected) {
      return {
        label: '',
        value: undefined,
      };
    }

    const feed = settings?.availableFeeds.find(f =>
      f.hex === selected.hex && f.includeReplies === selected.includeReplies
    );

    if (feed) {
      const [scope, timeframe] = feed.hex?.split(';') || [];

      const value = scope && timeframe ? `${scope};${timeframe}_${feed.includeReplies}` : `${feed.hex}_${feed.includeReplies}`;

      return {
        label: feed.name,
        value,
      };
    }
  }

  return (
    <SelectBox
      options={options}
      onChange={selectFeed}
      initialValue={initialValue()}
      isSelected={isSelected}
      isPhone={props.isPhone}
    />
  );
}

export default hookForDev(FeedSelect);
