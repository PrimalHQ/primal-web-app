import { A } from '@solidjs/router';
import { hexToNpub } from '../../lib/keys';
import { parseNote1 } from '../../lib/notes';
import { truncateNpub } from '../../stores/profile';
import EmbeddedNote from '../EmbeddedNote/EmbeddedNote';
import {
  Component,
} from 'solid-js';
import {
  PrimalNote,
  PrimalUser,
} from '../../types/primal';

import styles from './ParsedNote.module.scss';
import { decode } from 'nostr-tools/nip19';

const userName = (user: PrimalUser) => {
  return truncateNpub(
    user.display_name ||
    user.displayName ||
    user.name ||
    user.npub ||
    hexToNpub(user.pubkey) || '');
};

export const parseNoteLinks = (text: string, note: PrimalNote, highlightOnly = false) => {
  const regex = /\bnostr:((note)1\w+)\b|#\[(\d+)\]/g;

  return text.replace(regex, (url) => {
    const [_, id] = url.split(':');

    if (!id) {
      return url;
    }

    const path = `/thread/${id}`;

    const hex = decode(id).data as string;

    const ment = note.mentionedNotes && note.mentionedNotes[hex];

    const link = highlightOnly ?
      <span class='linkish' >{url}</span> :
      ment ?
        <EmbeddedNote
          note={ment}
          mentionedUsers={note.mentionedUsers || {}}
        /> :
        <A href={path}>{url}</A>;

    // @ts-ignore
    return link.outerHTML || url;
  });

};

export const parseNpubLinks = (text: string, note: PrimalNote, highlightOnly = false) => {
  const regex = /\bnostr:((npub)1\w+)\b|#\[(\d+)\]/g;

  return text.replace(regex, (url) => {
    const [_, id] = url.split(':');

    if (!id) {
      return url;
    }

    const path = `/profile/${id}`;

    const pubkey = decode(id);

    const user = note.mentionedUsers && note.mentionedUsers[pubkey.data as string];

    const link = highlightOnly ?
      <span class='linkish'>{url}</span> :
      user ?
        <A href={path}>@{userName(user)}</A> :
        <A href={path}>{url}</A>;

    // @ts-ignore
    return link.outerHTML || url;
  });

};

const ParsedNote: Component<{ note: PrimalNote, ignoreMentionedNotes?: boolean}> = (props) => {


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

        if (tag === undefined || tag.length === 0) continue;

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

          // @ts-ignore
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

          // @ts-ignore
          parsed = parsed.replace(`#[${r}]`, link.outerHTML);
        }
      }
    }

    return parsed;

  };

  const highlightHashtags = (text: string) => {
    const regex = /#[^\s!@#$%^&*(),.?":{}|<>]+/ig;

    return text.replace(regex, (token) => {
      const embeded = (
        <span>
          <A
            href={`/search/${token.replaceAll('#', '%23')}`}
          >{token}</A>
        </span>
      );

      // @ts-ignore
      return embeded.outerHTML;
    });
  }


  return (
    <div innerHTML={parsedContent(parseNpubLinks(parseNoteLinks(highlightHashtags(parseNote1(props.note.post.content)), props.note), props.note))}>
    </div>
  );
};

export default ParsedNote;
