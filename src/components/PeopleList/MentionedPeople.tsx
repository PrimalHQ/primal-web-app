import { Component, For, Show } from 'solid-js';
import { Transition } from 'solid-transition-group';
import { hookForDev } from '../../lib/devTools';
import { PrimalUser } from '../../types/primal';
import ThreadPeopleSkeleton from '../Skeleton/ThreadPeopleSkeleton';
import MentionedPerson from './MentionedPerson';

import styles from './PeopleList.module.scss';


const MentionedPeople: Component<{
  mentioned: PrimalUser[],
  label: string,
  id?: string,
  author: PrimalUser,
}> = (props) => {
  const author = () => props.author;
  const mentioned = () => props.mentioned;

  return (
      <>
        <div class={styles.heading}>{props.label}</div>
        <Transition name='slide-fade'>
          <Show
            when={props.author || props.mentioned.length > 0}
            fallback={<ThreadPeopleSkeleton />}
          >
            <div id="trending_section" class={styles.authorSection}>
              <div class="animated">
                <MentionedPerson
                  person={author()}
                />
              </div>

              <For each={mentioned()}>
                {(person) =>
                  <div class='animated'>
                    <MentionedPerson
                      person={person}
                    />
                  </div>
                }
              </For>
            </div>
          </Show>
        </Transition>
      </>
  );
}

export default hookForDev(MentionedPeople);
