import { A } from '@solidjs/router';
import { createStore } from 'solid-js/store';
import { convertToNotes } from '../../stores/note';
import { hexToNpub } from '../../lib/keys';
import { parseNote, parseNote1 } from '../../lib/notes';
import { socket } from '../../sockets';
import { truncateNpub } from '../../stores/profile';
import EmbeddedNote from '../EmbeddedNote/EmbeddedNote';
import { Kind } from '../../constants';
import {
  Component,
  createEffect,
  For,
  JSXElement,
  onCleanup,
  onMount,
  Show,
} from 'solid-js';
import {
  FeedPage,
  NostrEOSE,
  NostrEvent,
  NostrUserContent,
  PrimalNote,
  PrimalUser,
  UserReference,
} from '../../types/primal';

import styles from './ParsedNote.module.scss';

export const parseNoteLinks = (text: string, highlightOnly = false) => {
  const regex = /\bnostr:((note)1\w+)\b|#\[(\d+)\]/g;

  return text.replace(regex, (url) => {
    const [_, id] = url.split(':');

    if (!id) {
      return url;
    }

    const path = `/thread/${id}`;

    const link = highlightOnly ?
      <span class='linkish' >{url}</span> :
      <A href={path}>{url}</A>;

    // @ts-ignore
    return link.outerHTML || url;
  });

};
export const parseNpubLinks = (text: string, highlightOnly = false) => {
  const regex = /\bnostr:((npub)1\w+)\b|#\[(\d+)\]/g;

  return text.replace(regex, (url) => {
    const [_, id] = url.split(':');

    if (!id) {
      return url;
    }

    const path = `/profile/${id}`;

    const link = highlightOnly ?
      <span class='linkish'>{url}</span> :
      <A href={path}>{url}</A>;

    // @ts-ignore
    return link.outerHTML || url;
  });

};

const tokenRegex = /(\#\[[\d]+\])/;


const ParsedNote: Component<{ note: PrimalNote, ignoreMentionedNotes?: boolean}> = (props) => {

  const userName = (user: PrimalUser) => {
    return truncateNpub(
      user.display_name ||
      user.displayName ||
      user.name ||
      user.npub ||
      hexToNpub(user.pubkey) || '');
  };

  const parsedContent = (text: string) => {
    const regex = /\#\[([0-9]*)\]/g;
    let parsed = text;

    let refs = [];
    let match;

    while((match = regex.exec(text)) !== null) {
      refs.push(match[1]);
    }

    if (refs.length > 0) {
      for(let i =0; i < refs.length; i++) {
        let r = parseInt(refs[i]);

        const tag = props.note.post.tags[r];

        if (
          tag[0] === 'e' &&
          props.note.mentionedNotes &&
          props.note.mentionedNotes[tag[1]]
        ) {
          const embeded = (
            <div>
              <EmbeddedNote
                note={props.note.mentionedNotes[tag[1]]}
                mentionedUsers={props.note.mentionedUsers}
              />
            </div>
          );

          parsed = parsed.replace(`#[${r}]`, embeded.outerHTML);
        }

        if (tag[0] === 'p' && props.note.mentionedUsers && props.note.mentionedUsers[tag[1]]) {
          const user = props.note.mentionedUsers[tag[1]];

          const npub = user.npub || hexToNpub(user.pubkey);

          const link =  (
            <A href={`/profile/${npub}`} class={styles.mentionedUser}>
              @{userName(user)}
            </A>
          );

          parsed = parsed.replace(`#[${r}]`, link.outerHTML);
        }
      }
    }

    return parsed;

  };

  const highlightHashtags = (text: string) => {
    const regex = /(#[a-züöäßÄÖÜ0\d-]+)/ig;

    let parsed = text;

    let refs = [];
    let match;

    while((match = regex.exec(text)) !== null) {
      refs.push(match[1]);
    }

    if (refs.length > 0) {
      for(let i =0; i < refs.length; i++) {
        let r = refs[i];

        const embeded = (
          <span>
            <A
              href={`/search/${r.replaceAll('#', '%23')}`}
            >{r}</A>
          </span>
        );

        parsed = parsed.replaceAll(`${r}`, embeded.outerHTML);
      }
    }

    return parsed;
  }

  return (
    <div innerHTML={parsedContent(parseNpubLinks(parseNoteLinks(highlightHashtags(parseNote1(props.note.post.content)))))}>
    </div>
  );
};

export default ParsedNote;
