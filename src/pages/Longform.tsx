import { useIntl } from "@cookbook/solid-intl";
import { useParams } from "@solidjs/router";
import { Component, createEffect, createSignal, For, Show } from "solid-js";
import { createStore } from "solid-js/store";
import { APP_ID } from "../App";
import { Kind } from "../constants";
import { useAccountContext } from "../contexts/AccountContext";
import { decodeIdentifier, hexToNpub } from "../lib/keys";
import { getParametrizedEvent } from "../lib/notes";
import { subscribeTo } from "../sockets";
import { SolidMarkdown } from "solid-markdown";

import styles from './Longform.module.scss';
import Loader from "../components/Loader/Loader";
import { NostrUserContent, PrimalUser } from "../types/primal";
import { getUserProfileInfo } from "../lib/profile";
import { convertToUser, userName } from "../stores/profile";
import Avatar from "../components/Avatar/Avatar";
import { date, longDate, shortDate, veryLongDate } from "../lib/dates";

export type LongFormData = {
  title: string,
  summary: string,
  image: string,
  tags: string[],
  published: number,
  content: string,
  author: string,
};

const emptyLongNote = {
  title: '',
  summary: '',
  image: '',
  tags: [],
  published: 0,
  content: '',
  author: '',
}

const Longform: Component = () => {
  const account = useAccountContext();
  const params = useParams();
  const intl = useIntl();

  const [note, setNote] = createStore<LongFormData>({...emptyLongNote});

  const [pubkey, setPubkey] = createSignal<string>('');

  // @ts-ignore
  const [author, setAuthor] = createStore<PrimalUser>()

  createEffect(() => {
    if (!pubkey()) {
      return;
    }

    const naddr = params.naddr;
    const subId = `author_${naddr}_${APP_ID}`;

    const unsub = subscribeTo(subId, (type, subId, content) =>{
      if (type === 'EOSE') {
        unsub();
        return;
      }

      if (type === 'EVENT') {
        if (!content) {
          return;
        }

        if(content.kind === Kind.Metadata) {
          const userContent = content as NostrUserContent;

          const user = convertToUser(userContent);

          setAuthor(() => ({ ...user }));
        }
      }
    })

    getUserProfileInfo(pubkey(), account?.publicKey, subId);
  });

  createEffect(() => {
    const naddr = params.naddr;

    if (typeof naddr === 'string' && naddr.startsWith('naddr')) {
      const decoded = decodeIdentifier(naddr);

      const { pubkey, identifier, kind } = decoded.data;

      const subId = `naddr_${naddr}_${APP_ID}`;

      const unsub = subscribeTo(subId, (type, subId, content) =>{
        if (type === 'EOSE') {
          unsub();
          return;
        }

        if (type === 'EVENT') {
          if (!content) {
            return;
          }

          if(content.kind === Kind.LongForm) {

            setPubkey(() => content.pubkey);

            let n: LongFormData = {
              title: '',
              summary: '',
              image: '',
              tags: [],
              published: content.created_at || 0,
              content: content.content,
              author: content.pubkey,
            }

            content.tags.forEach(tag => {
              switch (tag[0]) {
                case 't':
                  n.tags.push(tag[1]);
                  break;
                case 'title':
                  n.title = tag[1];
                  break;
                case 'summary':
                  n.summary = tag[1];
                  break;
                case 'image':
                  n.image = tag[1];
                  break;
                case 'published':
                  n.published = parseInt(tag[1]);
                  break;
                case 'content':
                  n.content = tag[1];
                  break;
                case 'author':
                  n.author = tag[1];
                  break;
                default:
                  break;
              }
            });

            setNote(() => ({...n}));
          }
        }
      });

      getParametrizedEvent(pubkey, identifier, kind, subId);
    }
  })

  return (
    <>
      <div class={styles.header}>
        <div class={styles.author}>
          <Show when={author}>
            <Avatar user={author} size="xs" />
            <div class={styles.userName}>
              {userName(author)}
            </div>
          </Show>
        </div>
        <div class={styles.time}>
          {shortDate(note.published)}
        </div>
      </div>
      <div class={styles.longform}>
        <Show
          when={note.content.length > 0}
          fallback={<Loader />}
        >
          <div class={styles.title}>
            {note.title}
          </div>

          <div class={styles.summary}>
            {note.summary}
          </div>

          <div class={styles.tags}>
            <For each={note.tags}>
              {tag => (
                <div class={styles.tag}>
                  {tag}
                </div>
              )}
            </For>
          </div>

          <img class={styles.image} src={note.image} />

          <div class={styles.content}>
            <SolidMarkdown
              children={note.content || ''}
            />
          </div>
        </Show>
      </div>
    </>);
}

export default Longform;
