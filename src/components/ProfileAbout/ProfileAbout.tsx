import { A } from '@solidjs/router';
import { nip19 } from '../../lib/nTools';
import { Component, createEffect, For, JSXElement, on, Show } from 'solid-js';
import { createStore, reconcile } from 'solid-js/store';
import { APP_ID } from '../../App';
import { linebreakRegex, urlExtractRegex, specialCharsRegex, hashtagCharsRegex, profileRegexG, Kind } from '../../constants';
import { hexToNpub, npubToHex } from '../../lib/keys';
import { isInterpunction, isUrl, isUserMention, isHashtag } from '../../lib/notes';
import { getUserProfiles } from '../../lib/profile';
import { subsTo } from '../../sockets';
import { userName, truncateNpub } from '../../stores/profile';
import { NostrUserContent } from '../../types/primal';
import MentionedUserLink from '../Note/MentionedUserLink/MentionedUserLink';
import { NoteContent } from '../ParsedNote/ParsedNote';

import styles from '../../pages/Profile.module.scss';
import { useAppContext } from '../../contexts/AppContext';

const ProfileAbout: Component<{about: string | undefined, onParseComplete?: () => void }> = (props) => {

  const app = useAppContext();

  const [usersMentionedInAbout, setUsersMentionedInAbout] = createStore<Record<string, any>>({});

  const [aboutTokens, setAboutTokens] = createStore<string[]>([]);

  const [aboutContent, setAboutContent] = createStore<NoteContent[]>([]);

  let lastSignificantContent = 'text';

  const tokenizeAbout = (about: string) => {
    const content = about.replace(linebreakRegex, ' __LB__ ').replace(/\s+/g, ' __SP__ ');
    const tokens = content.split(/[\s]+/);

    setAboutTokens(() => [...tokens]);
  }

  const updateAboutContent = (type: string, token: string, meta?: Record<string, any>) => {
    setAboutContent((contentArray) => {
      if (contentArray.length > 0 && contentArray[contentArray.length -1].type === type) {
        const c = { ...contentArray[contentArray.length - 1] };

        c.tokens = [...c.tokens, token];

        if (meta) {
          c.meta = { ...meta };
        }

        return [ ...contentArray.slice(0, contentArray.length - 1), { ...c }];
      }

      return [...contentArray, { type, tokens: [token], meta: { ...meta } }]
    });
  }

  const parseAboutToken = (token: string) => {
    if (token === '__LB__') {

      updateAboutContent('linebreak', token);
      lastSignificantContent = 'LB';
      return;
    }

    if (token === '__SP__') {
      if (!['LB'].includes(lastSignificantContent)) {
        updateAboutContent('text', ' ');
      }
      return;
    }

    if (isInterpunction(token)) {
      lastSignificantContent = 'text';
      updateAboutContent('text', token);
      return;
    }

    if (isUrl(token)) {
      const index = token.indexOf('http');

      if (index > 0) {
        const prefix = token.slice(0, index);

        const matched = (token.match(urlExtractRegex) || [])[0];

        if (matched) {
          const suffix = token.substring(matched.length + index, token.length);

          parseAboutToken(prefix);
          parseAboutToken(matched);
          parseAboutToken(suffix);
          return;
        } else {
          parseAboutToken(prefix);
          parseAboutToken(token.slice(index));
          return;
        }
      }

      const lastChar = token[token.length - 1];

      if (isInterpunction(lastChar)) {
        parseAboutToken(token.slice(0, -1));
        parseAboutToken(lastChar);
        return;
      }

      lastSignificantContent = 'link';
      updateAboutContent('link', token);
      return;
    }

    if (isUserMention(token)) {
      lastSignificantContent = 'usermention';
      updateAboutContent('usermention', token);
      return;
    }

    if (isHashtag(token)) {
      lastSignificantContent = 'hashtag';
      updateAboutContent('hashtag', token);
      return;
    }

    lastSignificantContent = 'text';
    updateAboutContent('text', token);
    return;
  };

  const renderLinebreak = (item: NoteContent) => {

    // Allow max consecutive linebreak
    const len = Math.min(2, item.tokens.length);

    const lineBreaks = Array(len).fill(<br/>)

    return <For each={lineBreaks}>{_ => <br/>}</For>
  };

  const renderText = (item: NoteContent) => {
    let tokens = [];

    for (let i=0;i<item.tokens.length;i++) {
      const token = item.tokens[i];

      tokens.push(token)
    }

    const text = tokens.join(' ').replaceAll('&lt;', '<').replaceAll('&gt;', '>');

    return <>{text}</>;
  };

  const renderLinks = (item: NoteContent, index?: number) => {
    return <For each={item.tokens}>
      {(token) => {
        return <span data-url={token}><a link href={token} target="_blank" >{token}</a></span>;
      }}
    </For>
  };

  const renderUserMention = (item: NoteContent) => {
    return <For each={item.tokens}>
      {(token) => {
        let [_, id] = token.split(':');

        if (!id) {
          return <>{token}</>;
        }

        let end = '';

        let match = specialCharsRegex.exec(id);

        if (match) {
          const i = match.index;
          end = id.slice(i);
          id = id.slice(0, i);
        }

        try {
          const profileId = nip19.decode(id).data as string | nip19.ProfilePointer;

          const hex = typeof profileId === 'string' ? profileId : profileId.pubkey;
          const npub = hexToNpub(hex);

          const path = app?.actions.profileLink(npub) || '';

          let user = usersMentionedInAbout && usersMentionedInAbout[hex];

          const label = user ? userName(user) : truncateNpub(npub);

          return !user ?
            <><A href={path}>@{label}</A>{end}</> :
            <>{MentionedUserLink({ user, npub })}{end}</>;
        } catch (e) {
          return <span class={styles.error}> {token}</span>;
        }
      }}
    </For>
  };

  const renderHashtag = (item: NoteContent) => {
    return <For each={item.tokens}>
      {(token) => {
        let [_, term] = token.split('#');
        let end = '';

        let match = hashtagCharsRegex.exec(term);

        if (match) {
          const i = match.index;
          end = term.slice(i);
          term = term.slice(0, i);
        }

        // const embeded = <A href={`/search/%23${term}`}>#{term}</A>;

        return <span class="whole"> <A href={`/search/%23${term}`}>#{term}</A> {end}</span>;
      }}
    </For>
  };

  const renderAboutContent = (item: NoteContent, index: number) => {

    const renderers: Record<string, (item: NoteContent, index?: number) => JSXElement> = {
      linebreak: renderLinebreak,
      text: renderText,
      link: renderLinks,
      usermention: renderUserMention,
      hashtag: renderHashtag,
    }

    return renderers[item.type] ?
      renderers[item.type](item, index) :
      <></>;
  };

  createEffect(() => {
    if (aboutTokens.length === 0) return;

    for (let i=0; i < aboutTokens.length; i++) {
      parseAboutToken(aboutTokens[i]);
    }
  });

  const parseForMentions = (about: string) => {
    let userMentions = [];
    let m;

    do {
      m = profileRegexG.exec(about);
      if (m) {
        userMentions.push(npubToHex(m[1]))
      }
    } while (m);

    const subId = `pa_u_${APP_ID}`;

    const unsub = subsTo(subId, {
      onEvent: (_, content) => {

        if (content?.kind === Kind.Metadata) {
          const user = content as NostrUserContent;
          const profile = JSON.parse(user.content);

          setUsersMentionedInAbout(() => ({[user.pubkey]: ({ ...profile })}));
        }
      },
      onEose: () => {
        unsub();
        tokenizeAbout(about);
      },
    });

    getUserProfiles(userMentions, subId);
  };

  createEffect(on(() => props.about, (v, p) => {
    if (v && v !== p && v.length > 0) {
      setAboutContent([]);
      setAboutTokens([]);
      setUsersMentionedInAbout(reconcile({}));
      parseForMentions(v);
    }
  }));

  return (
    <Show when={aboutContent.length > 0}>
      <div class={styles.profileAbout}>
        <For each={aboutContent}>
          {(item, index) => {
            if (index() === aboutContent.length - 1) {
              props.onParseComplete && props.onParseComplete()
            }
            return renderAboutContent(item, index());
          }}
        </For>
      </div>
    </Show>
  );
}

export default ProfileAbout;
