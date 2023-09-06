import { A } from '@solidjs/router';
import { hexToNpub } from '../../lib/keys';
import { linkPreviews, parseNote1, parseNote3 } from '../../lib/notes';
import { truncateNpub, userName } from '../../stores/profile';
import EmbeddedNote from '../EmbeddedNote/EmbeddedNote';
import {
  Component, createEffect, createSignal,
} from 'solid-js';
import {
  PrimalNote,
} from '../../types/primal';

import styles from './ParsedNote.module.scss';
import { nip19 } from 'nostr-tools';
import LinkPreview from '../LinkPreview/LinkPreview';
import MentionedUserLink from '../Note/MentionedUserLink/MentionedUserLink';
import { useMediaContext } from '../../contexts/MediaContext';
import { hookForDev } from '../../lib/devTools';


export const parseNoteLinks = (text: string, note: PrimalNote, highlightOnly = false) => {

  const regex = /\bnostr:((note|nevent)1\w+)\b|#\[(\d+)\]/g;

  return text.replace(regex, (url) => {
    const [_, id] = url.split(':');

    if (!id) {
      return url;
    }

    try {
      const eventId = nip19.decode(id).data as string | nip19.EventPointer;
      const hex = typeof eventId === 'string' ? eventId : eventId.id;
      const noteId = nip19.noteEncode(hex);

      const path = `/e/${noteId}`;

      const ment = note.mentionedNotes && note.mentionedNotes[hex];

      const link = highlightOnly ?
        <span class='linkish' >{url}</span> :
        ment ?
          <div>
            <EmbeddedNote
              note={ment}
              mentionedUsers={note.mentionedUsers || {}}
            />
          </div> :
          <A href={path}>{url}</A>;

      // @ts-ignore
      return link.outerHTML || url;
    } catch (e) {
      return `<span class="${styles.error}">${url}</span>`;
    }

  });

};

export const parseNpubLinks = (text: string, note: PrimalNote, highlightOnly?: 'links' | 'text') => {

  const regex = /\bnostr:((npub|nprofile)1\w+)\b|#\[(\d+)\]/g;

  return text.replace(regex, (url) => {
    const [_, id] = url.split(':');

    if (!id) {
      return url;
    }

    try {
      const profileId = nip19.decode(id).data as string | nip19.ProfilePointer;

      const hex = typeof profileId === 'string' ? profileId : profileId.pubkey;
      const npub = hexToNpub(hex);

      const path = `/p/${npub}`;

      const user = note.mentionedUsers && note.mentionedUsers[hex];

      const label = user ? userName(user) : truncateNpub(npub);

      let link = <span>@{label}</span>;

      if (highlightOnly === 'links') {
        link = <span class='linkish'>@{label}</span>;
      }

      if (!highlightOnly) {
        link = user ? <A href={path}>@{label}</A> : MentionedUserLink({ user });
      }

      // @ts-ignore
      return link.outerHTML || url;
    } catch (e) {
      return `<span class="${styles.error}">${url}</span>`;
    }
  });

};

const ParsedNote: Component<{
  note: PrimalNote,
  ignoreMentionedNotes?: boolean,
  id?: string,
  ignoreMedia?: boolean,
  noLinks?: 'links' | 'text',
}> = (props) => {

  const media = useMediaContext();

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

          const link = MentionedUserLink({ user });

          // @ts-ignore
          parsed = parsed.replace(`#[${r}]`, link.outerHTML);
        }
      }
    }

    return parsed;

  };

  const highlightHashtags = (text: string, noLinks?: 'links' | 'text') => {
    const regex = /(?:\s|^)#[^\s!@#$%^&*(),.?":{}|<>]+/ig;

    return text.replace(regex, (token) => {
      const [space, term] = token.split('#');
      const embeded = noLinks === 'text' ? (
        <span>
          {space}
          <span>#{term}</span>
        </span>
      ) : (
        <span>
          {space}
          <A
            href={`/search/%23${term}`}
          >#{term}</A>
        </span>
      );

      // @ts-ignore
      return embeded.outerHTML;
    });
  }

  const replaceLinkPreviews = (text: string, previews: Record<string, any>) => {
    let parsed = text;

    const regex = /__LINK__.*?__LINK__/ig;

    parsed = parsed.replace(regex, (link) => {
      const url = link.split('__LINK__')[1];

      const preview = previews[url];

      if (!preview) {
        return `<a link href="${url}" target="_blank" >${url}</a>`;
      }

      const linkElement = (<div class={styles.bordered}><LinkPreview preview={preview} /></div>);

      // @ts-ignore
      return linkElement.outerHTML;
    });

    return parsed;
  }

  const content = () => {
    return parseNoteLinks(
      parseNpubLinks(
        parsedContent(
          highlightHashtags(
            parseNote1(props.note.post.content, media?.actions.getMediaUrl)
          ),
        ),
        props.note,
        props.noLinks,
      ),
      props.note,
    );
  };

  const smallContent = () => {
    return parseNoteLinks(
      parseNpubLinks(
        parsedContent(
          highlightHashtags(
            props.note.post.content,
            props.noLinks,
          ),
        ),
        props.note,
        props.noLinks,
      ),
      props.note,
    );
  };

  const [displayedContent, setDisplayedContent] = createSignal<string>(props.ignoreMedia ? smallContent() : content());

  createEffect(() => {
    const newContent = replaceLinkPreviews(displayedContent(), { ...linkPreviews });

    setDisplayedContent(() => newContent);
  });


  return (
    <div id={props.id} innerHTML={displayedContent()}>
    </div>
  );
};

export default hookForDev(ParsedNote);
