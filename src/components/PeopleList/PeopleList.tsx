import { Component, Show } from 'solid-js';
import { Transition } from 'solid-transition-group';
import { useAccountContext } from '../../contexts/AccountContext';
import { hookForDev } from '../../lib/devTools';
import { PrimalNote, PrimalUser } from '../../types/primal';
import MentionedPeople from './MentionedPeople';

import styles from './PeopleList.module.scss';
import Repliers from './Repliers';
import { useAppContext } from '../../contexts/AppContext';


const PeopleList: Component<{
  people: PrimalUser[],
  label?: string,
  mentionLabel?: string,
  id?: string,
  note?: PrimalNote,
  singleFile?: boolean,
  sortBy?: string,
}> = (props) => {
  const app = useAppContext();

  const author = () => props.note?.user;

  const mentioned = () => {
    if (!props.note) return [];

    const mpks = props.note?.msg.tags.filter(t => t[0] === 'p').map(t => t[1]);
    const tzpk = (props.note?.topZaps[0] || {}).pubkey;

    const curatedMentions = props.people.filter(m => {
      return [ ...mpks, tzpk].includes(m.pubkey);
    });

    return curatedMentions.filter(p => p.pubkey !== author()?.pubkey);
  };

  const repliers = () => {
    if (!props.note) return props.people;

    return props.people.filter(p => p.pubkey !== author()?.pubkey && (props.note?.mentionedUsers || {})[p.pubkey] === undefined);
  }

  const sortedPeople = () => {
    if (repliers().length === 0) return [];
    if (!props.sortBy) return repliers();

    let sorted: PrimalUser[] = [ ...repliers() ];

    if (props.sortBy === 'legend') {
      sorted = sorted.toSorted((a, b) => {
        const aIsLegend = (app?.memberCohortInfo[a.pubkey])?.tier === 'premium-legend';
        const bIsLegend = (app?.memberCohortInfo[b.pubkey])?.tier === 'premium-legend';

        if (aIsLegend) return -1;
        if (bIsLegend) return 1;

        return 0;
      });
    }


    return sorted;
  }

  return (
      <div id={props.id} class={styles.stickyWrapper}>
        <Show when={author()}>
          <MentionedPeople
            mentioned={mentioned()}
            author={author()}
            label={props.mentionLabel || ''}
          />
        </Show>

        <Transition name='slide-fade'>
          <Show when={sortedPeople().length > 0}>
            <Repliers
              people={sortedPeople()}
              label={props.label || ''}
              singleFile={props.singleFile}
            />
          </Show>
        </Transition>
      </div>
  );
}

export default hookForDev(PeopleList);
