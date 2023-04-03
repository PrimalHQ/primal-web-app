import { Component, For, Show } from 'solid-js';
import {
  PrimalNote,
  PrimalUser
} from '../../types/primal';

import styles from './ProfileSidebar.module.scss';
import SmallNote from '../SmallNote/SmallNote';
import { useIntl } from '@cookbook/solid-intl';
import { truncateNpub } from '../../stores/profile';


const ProfileSidebar: Component<{ notes: PrimalNote[] | undefined, profile: PrimalUser | undefined }> = (props) => {

  const intl = useIntl();

  return (
    <Show when={props.profile}>
      <div class={styles.headingTrending}>
        <div>
          <div class={styles.flameIcon}></div>
          {intl.formatMessage({
            id: 'profile.sidebar.caption',
            defaultMessage: 'Top 10 notes',
            description: 'Caption for the profile page sidebar showing a list of trending notes by the profile',
          })}
        </div>
      </div>

      <Show
        when={props.notes && props.notes.length > 0}
        fallback={
          <div class={styles.noNotes}>
            {intl.formatMessage({
              id: 'profile.sidebar.noNotes',
              defaultMessage: 'No trending notes',
              description: 'Placeholde for profile sidebar when the profile is missing trending notes',
            },
            {
              name: props.profile?.name || truncateNpub(props.profile?.npub || ''),
            },
            )}
          </div>
        }
      >
        <For each={props.notes}>
          {(note) => <SmallNote note={note} />}
        </For>
      </Show>
    </Show>
  );
}

export default ProfileSidebar;
