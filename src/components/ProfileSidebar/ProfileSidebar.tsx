import { Component, For, Show } from 'solid-js';
import {
  PrimalNote,
  PrimalUser
} from '../../types/primal';

import styles from './ProfileSidebar.module.scss';
import SmallNote from '../SmallNote/SmallNote';
import { useIntl } from '@cookbook/solid-intl';
import { userName } from '../../stores/profile';
import { profile as t } from '../../translations';
import { hookForDev } from '../../lib/devTools';


const ProfileSidebar: Component<{
  notes: PrimalNote[] | undefined,
  profile: PrimalUser | undefined,
  id?: string,
}> = (props) => {

  const intl = useIntl();

  return (
    <div id={props.id}>
      <Show when={props.profile}>
        <div class={styles.headingTrending}>
          <div>
            {intl.formatMessage(t.sidebarCaption)}
          </div>
        </div>

        <Show
          when={props.notes && props.notes.length > 0}
          fallback={
            <div class={styles.noNotes}>
              {intl.formatMessage(
                t.sidebarNoNotes,
                {
                  name: userName(props.profile),
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
    </div>
  );
}

export default hookForDev(ProfileSidebar);
