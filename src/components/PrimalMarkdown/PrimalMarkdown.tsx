import { Component, createSignal, For, onCleanup, onMount, Show } from 'solid-js';
import { Editor } from '@milkdown/core';

import {
  toggleStrongCommand,
  toggleEmphasisCommand,
} from '@milkdown/preset-commonmark';

import {
  insertTableCommand,
} from '@milkdown/preset-gfm';

import { callCommand } from '@milkdown/utils';
import { history, undoCommand, redoCommand } from '@milkdown/plugin-history';
import  styles from './PrimalMarkdown.module.scss';
import ButtonGhost from '../Buttons/ButtonGhost';
import { hexToNpub, noteIdToHex, npubToHex } from '../../lib/keys';
import { useAccountContext } from '../../contexts/AccountContext';
import { eventRegexG, eventRegexLocal, eventRegexNostrless, Kind, mdImageRegex, profileRegex, profileRegexG, specialCharsRegex } from '../../constants';
import { NostrRelaySignedEvent, PrimalArticle } from '../../types/primal';
import { userName } from '../../stores/profile';
import { A, useNavigate } from '@solidjs/router';
import { createStore } from 'solid-js/store';
import { nip19 } from '../../lib/nTools';
import EmbeddedNote from '../EmbeddedNote/EmbeddedNote';
import NoteImage from '../NoteImage/NoteImage';
import PhotoSwipeLightbox from 'photoswipe/lightbox';
import ArticlePreview from '../ArticlePreview/ArticlePreview';
import ArticleHighlightActionMenu from '../ArticleHighlight/ArticleHighlightActionMenu';
import { useToastContext } from '../Toaster/Toaster';
import MarkdownSlice from './MarkdownSlice';
import { convertHtmlEntityToAngleBrackets, isIOS } from '../../utils';
import { useMediaContext } from '../../contexts/MediaContext';
import { useAppContext } from '../../contexts/AppContext';
import { isAndroid } from '@kobalte/utils';
import { logError } from '../../lib/logger';
import LiveEventPreview from '../LiveVideo/LiveEventPreview';

export type Coord = {
  x: number;
  y: number;
};

export type ArticleTokenType = 'md' | 'event' | 'image' | 'user';

export type ArticleToken = {
  type: ArticleTokenType,
  index: number,
  length: number,
  value: string,
}


// atStart: if true, returns coord of the beginning of the selection,
//          if false, returns coord of the end of the selection
function getSelectionCoords(atStart: boolean): Coord | null {
  const sel = window.getSelection();

  // check if selection exists
  if (!sel?.rangeCount) return null;

  // get range
  let range = sel.getRangeAt(0).cloneRange();
  if (!range.getClientRects) return null;

  // get client rect
  range.collapse(atStart);
  let rects = range.getClientRects();
  if (rects.length <= 0) return null;

  // return coord
  let rect = rects[0];
  return { x: rect.x, y: rect.y };
}

const PrimalMarkdown: Component<{
  id?: string,
  content?: string,
  readonly?:  boolean,
  noteId: string,
  article: PrimalArticle | undefined,
  ignoreHighlights?: boolean,
  highlights?: any[],
  onHighlightSelected?: (highlight: any) => void,
  onHighlightCreated?: (highlight: any, replaceId?: string) => void,
  onHighlightQuoted?: (highlight: any) => void,
  onHighlightRemoved?: (id: string) => void,
  onHighlightReply?: (id: string) => void,
  onHighlightDeselected?: () => void,
}> = (props) => {
  const account = useAccountContext();
  const toast = useToastContext();
  const navigate = useNavigate();
  const media = useMediaContext();
  const app = useAppContext();

  let ref: HTMLDivElement | undefined;
  let viewer: HTMLDivElement | undefined;
  // let editor1: Editor;

  const [editor, setEditor] = createSignal<Editor>();

  const [contentTokens, setContentTokens] = createStore<ArticleToken[]>([]);

  const id = () => {
    return `note_${props.noteId}`;
  }

  const lightbox = new PhotoSwipeLightbox({
    gallery: `#${id()}`,
    children: `a.image_${props.noteId}`,
    showHideAnimationType: 'zoom',
    initialZoomLevel: 'fit',
    secondaryZoomLevel: 2,
    maxZoomLevel: 3,
    thumbSelector: `a.image_${props.noteId}`,
    pswpModule: () => import('photoswipe')
  });

  onMount(() => {
    lightbox.init();
  });

  const isHighlight = (el: Element) => {
    let ret = false;
    for (let i=0; i<el.children.length; i++) {
      const child = el.children.item(i);

      if (child?.tagName === 'EM' && child.attributes.getNamedItem('data-highlight')) {
        ret = true;
        break;
      }
    }

    return ret;
  }

  const isImg = (el: Element) => {
    // @ts-ignore
    return el.firstChild?.tagName === 'IMG';
  }

  const isMention = (el: Element) => {
    const regex = /nostr:([A-z0-9]+)/;
    const content = el.innerHTML;

    return regex.test(content)
  }

  const [highlightMenu, setHighlightMenu] = createSignal<any>();
  const [highlightText, setHighlightText] = createSignal<string>('');
  const [highlightContext, setHighlightContext] = createSignal<string>('');
  const [highlightSelection, setHighlightSelection] = createSignal<Selection>();
  const [highlightMenuPosition, setHighlightMenuPosition] = createSignal<Coord>();

  const showHighlightMenu = (id: string) => {
    if (highlightMenu() && id === highlightMenu().id) return;

    const hl = props.highlights?.find(h => h.id === id);

    if (hl) {
      const el = document.querySelector(`a[data-highlight="${hl.id}"]`);

      // @ts-ignore
      const x = el?.offsetLeft || 0;

      // @ts-ignore
      const y = el?.offsetTop || 0;

      setHighlightMenuPosition(() => ({ x, y }));
      setHighlightText(() => hl.content);
      setHighlightContext(() => (hl.tags.find((t: string[]) => t[0] === 'context')) || [])[1];
      setHighlightMenu(() => hl);
      props.onHighlightSelected && props.onHighlightSelected(hl);
    }
  };

  const hideHighlightMenu = (id: string) => {
    // if (highlightMenu() && id === highlightMenu().id) {
      setHighlightMenu(() => undefined);
      props.onHighlightSelected && props.onHighlightSelected(undefined);
    // }
  };

  const getParents = (el: any) => {
    for (var parents = []; el; el = el.parentNode) {
      parents.push(el);
    }

    return parents;
  };

  const onMouseUp = (e: MouseEvent) => {
    if (props.ignoreHighlights) return;
    // @ts-ignore
    const isHighlightMenuOption = e.target?.parentElement.getAttribute('data-highlight-menu-option') !== null;

    if (isHighlightMenuOption) return;

    // @ts-ignore
    const selection = document.getSelection();
    document.querySelector('a[data-highlight-selected')?.removeAttribute('data-highlight-selected');

    const parents = getParents(e.target);

    if (!selection || selection.toString().length === 0 || !parents.find(parent => parent.className === styles.editor)) {
      setHighlightMenu(() => undefined);
      props.onHighlightSelected && props.onHighlightSelected(undefined);
      return;
    }

    setHighlightSelection(() => selection);
    // @ts-ignore
    setHighlightText(() => selection?.toString());
    setHighlightContext(() => selection?.anchorNode?.parentElement?.innerText || '');
    // @ts-ignore
    showNewHighlightMenu('NEW_HIGHLIGHT');
  };

  const showNewHighlightMenu = (text: string) => {
    if (isIOS() || isAndroid()) return;
    const coord = getSelectionCoords(true);

    const r = viewer?.getBoundingClientRect();
    const xOff = r?.left || 0;
    const yOff = r?.top || 0;

    coord && setHighlightMenuPosition(() => ({ x: coord.x - xOff, y: coord.y - yOff}));
    setHighlightMenu(() => text);
  };

  const [html, setHTML] = createSignal<string>();

  const regexIndexOf = (text: string, regex: RegExp, startpos: number) => {
    var indexOf = text.substring(startpos || 0).search(regex);
    return (indexOf >= 0) ? (indexOf + (startpos || 0)) : indexOf;
  }

  const tokenizeByRegex = (content: string, regex: RegExp, type: ArticleTokenType, indexOffset = 0) => {
    let index = 0;
    let tokens: ArticleToken[] = [];

    while (index >= 0) {
      const contentIndex = regexIndexOf(content, regex, index);
      let length = 1;

      if (contentIndex < 0) {
        if (index > 0 ) {
          tokens.push({
            index: index + indexOffset,
            value: content.substring(index),
            length: content.length,
            type: 'md',
          });
          break;
        }

        tokens.push({
          index: indexOffset,
          value: content,
          length: content.length,
          type: 'md',
        });
        break;
      }

      if (contentIndex > 0) {
        const value = content.substring(index, contentIndex);

        tokens.push({
          index: index + indexOffset,
          value,
          length: value.length,
          type: 'md',
        });
      }

      const value = content.slice(contentIndex).match(regex);

      if (value && value.length > 0) {
        length = value[0].length;

        tokens.push({
          index: contentIndex + indexOffset,
          value: value[0],
          length,
          type,
        })
      }

      index = contentIndex + length;
    }

    return tokens;
  }

  const parseTokens = (allTokens: ArticleToken[], regex: RegExp, type: ArticleTokenType, defaultType: ArticleTokenType) => {

    let tokens: ArticleToken[] = [];

    for (let i = 0; i<allTokens.length; i++) {
      const token = allTokens[i];

      // All tkoens that do not have this default value are considered parsed
      if (token.type !== defaultType) {
        tokens.push({ ...token });
        continue;
      }

      if (token.value.startsWith('[![')) {
        tokens.push({ ...token });
        continue;
      }

      const parsedTokens = tokenizeByRegex(token.value, regex, type, token.index);

      tokens.push(...parsedTokens);
    }

    return tokens;
  };

  const tokenizeContent = (content: string) => {
    let tokens: ArticleToken[] = [{
      value: content,
      index: 0,
      length: content.length,
      type: 'md',
    }];

    // Parse event refereces
    tokens = parseTokens(tokens, eventRegexLocal, 'event', 'md');

    // Parse images
    tokens = parseTokens(tokens, mdImageRegex, 'image', 'md');

    return tokens;

  }

  const renderToken = (token: ArticleToken) => {
    if (token.type === 'md') {
      const orig = convertHtmlEntityToAngleBrackets(token.value);

      const prepped = orig.replace(profileRegexG, (r: string) => {

        let npub = r;
        let end = '';

        const idStart = r.search(profileRegex);

        if (idStart > 0) {
          npub = r.slice(idStart);
        }

        if (!npub || npub.length === 0) {
          return r;
        }

        let match = specialCharsRegex.exec(npub);

        if (match) {
          const i = match.index;
          end = npub.slice(i);
          npub = npub.slice(0, i);
        }

        const id = npubToHex(npub);

        const user = props.article?.mentionedUsers && props.article.mentionedUsers[id];

        const name = user ? userName(user) : r;

        return `[@${name}](${npub})`;
      })

      return <MarkdownSlice
        content={prepped}
        original={orig}
        article={props.article}
        highlights={props.highlights || []}
      />
    }

    if (token.type === 'event') {
      let noteId = token.value;
      let end = '';

      const idStart = token.value.search(eventRegexNostrless);

      if (idStart > 0) {
        noteId = token.value.slice(idStart);
      }

      if (!noteId || noteId.length === 0) {
        return <>{token.value}</>;
      }

      let match = specialCharsRegex.exec(noteId);

      if (match) {
        const i = match.index;
        end = noteId.slice(i);
        noteId = noteId.slice(0, i);
      }


      if (noteId.startsWith('nevent')) {
        const hex = noteIdToHex(noteId);
        const note = (props.article?.mentionedNotes || {})[hex];

        const kind = note.post.kind || note.msg.kind;

        if (kind === Kind.Text) {
          noteId = nip19.noteEncode(hex);
        }

        if (kind === Kind.LongForm) {
          noteId = nip19.naddrEncode({
            kind,
            pubkey: note.pubkey,
            identifier: (note.msg.tags.find(t => t[0] === 'd') || [])[1],
          })
        }

        if (kind === undefined) {
          return <>{token.value}</>
        }
      }

      if (noteId.startsWith('note')) {
        const id = noteIdToHex(noteId);
        const note = (props.article?.mentionedNotes || {})[id];

        return (
            <Show
              when={note}
              fallback={<A href={`/e/${noteId}`}>nostr:{noteId}</A>}
            >
              <div class={styles.embeddedNote}>
                <EmbeddedNote
                  class={styles.embeddedNote}
                  note={note}
                  mentionedUsers={note.mentionedUsers}
                />
              </div>
            </Show>
          );
      }

      if (noteId.startsWith('naddr')) {

        let mention = props.article?.mentionedArticles && props.article.mentionedArticles[noteId];

        if (!mention) {

          let mention = props.article?.mentionedLiveEvents && props.article.mentionedLiveEvents[noteId];

          if (!mention) {
            return <>nostr:{noteId}</>;
          }


          return (
            <div class={styles.articlePreview}>
              <LiveEventPreview
                stream={mention}
              />
            </div>
          );
        };

        return (
          <div class={styles.articlePreview}>
            <ArticlePreview
              article={mention}
              bordered={true}
              hideFooter={true}
              hideContext={true}
              onClick={navigate}
            />
          </div>
        );
      }
    }

    if (token.type === 'image') {
      let src = '';
      let alt = '';

      if (token.value.startsWith('![')) {
        let urlMatches = token.value.match(/\((.*?)\)/);
        let altMatches = token.value.match(/\[(.*?)\]/);

        src = urlMatches ? urlMatches[1] : '';
        alt = altMatches ? altMatches[1] : '';
      }

      if (token.value.startsWith('http')) {
        src = token.value;
      }

      const mediaImage = media?.actions.getMedia(src, 'o');
      const mediaThumb = media?.actions.getMedia(src, 'm') || media?.actions.getMedia(src, 'o') || src;

      return (
        <NoteImage
          class={`noteimage image_${props.noteId}`}
          src={src}
          altSrc={token.value}
          media={mediaImage}
          mediaThumb={mediaThumb}
          width={isIOS() || isAndroid() ? window.innerWidth : 640}
        />
      );
    }

    return <>{token.value}</>;
  };

  onMount(async () => {

    const tokens = tokenizeContent(props.content || '');

    setContentTokens(() => [...tokens]);

    viewer?.addEventListener('click', onMouseClick)
    document?.addEventListener('mouseup', onMouseUp);
  });

  onCleanup(() => {
    document?.removeEventListener('mouseup', onMouseUp);
    viewer?.removeEventListener('click', onMouseClick);
  });

  const onMouseClick= (e: MouseEvent) => {
    const el = e.target as HTMLElement;

    const parent = el.parentElement;

    if (el.tagName === 'IMG' && parent && parent.tagName === 'A' && !parent.classList.contains('noteimage')) {
      e.preventDefault();
      window.open(parent.getAttribute('href') || '', '_blank')
      return false;
    }

    if (el.tagName === 'A') {
      const href = el.getAttribute('href') || '';
      const highlight = el.getAttribute('data-highlight') || '';

      if (
        href.includes('npub') ||
        href.includes('note') ||
        href.includes('nevent') ||
        href.includes('naddr') ||
        href.includes('nprofile')
      ) {
        e.preventDefault();
        const index = href.search(/(npub|note|nevent|naddr|nprofile)/);
        const id = href.slice(index);

        if (
          !id.startsWith('npub') &&
          !id.startsWith('note') &&
          !id.startsWith('nevent') &&
          !id.startsWith('naddr') &&
          !id.startsWith('nprofile')
        ) return false;

        try {
          const decode = nip19.decode(id);

          switch (decode.type) {
            case 'npub':
              navigate(app?.actions.profileLink(id) || '');
              break;
            case 'note':
              const eventPointer: nip19.EventPointer = {
                id: decode.data,
              };
              navigate(`/e/${nip19.neventEncode(eventPointer)}`);
              break;
            case 'nprofile':
              const npub = hexToNpub(decode.data.pubkey);
              navigate(app?.actions.profileLink(npub) || '');
              break;
            case 'nevent':
              if ([Kind.Text].includes(decode.data.kind || -1)) {
                navigate(`/e/${id}`);
              }

              if ([Kind.LongForm].includes(decode.data.kind || -1)) {
                navigate(`/e/${id}`);
              }

              if ([Kind.Metadata].includes(decode.data.kind || -1)) {
                const nId = hexToNpub(decode.data.id);
                navigate(app?.actions.profileLink(nId) || '');
              }
              break;
            case 'naddr':
              if ([Kind.Text, Kind.LongForm].includes(decode.data.kind)) {
                navigate(`/a/${id}`);
              }
              break;
            default:
              break;
          }
        }
        catch (e){
          logError('Error resolving event path: ', e);
        }



        return false;
      }

      if (highlight && !(isIOS() || isAndroid())) {
        e.preventDefault();
        showHighlightMenu(highlight);
        el.setAttribute('data-highlight-selected', 'true');

        return false;
      }

      return true;
    }
  };

  const undo = () => editor()?.action(callCommand(redoCommand.key));
  const redo = () => editor()?.action(callCommand(redoCommand.key));
  const bold = () => editor()?.action(callCommand(toggleStrongCommand.key));
  const italic = () => editor()?.action(callCommand(toggleEmphasisCommand.key));
  const table = () => editor()?.action(callCommand(insertTableCommand.key));


  return (
    <div class={styles.primalMarkdown}>
      <Show when={!(Boolean(props.readonly))}>
        <div class={styles.toolbar}>
          <ButtonGhost onClick={undo}>Undo</ButtonGhost>
          <ButtonGhost onClick={redo}>Redo</ButtonGhost>
          <ButtonGhost onClick={bold}>Bold</ButtonGhost>
          <ButtonGhost onClick={italic}>Italic</ButtonGhost>
          <ButtonGhost onClick={table}>Table</ButtonGhost>
        </div>
      </Show>

      <div ref={ref} class={styles.editor} style="display: none;" />

      <div id={id()} ref={viewer} class={styles.editor}>
        <Show when={highlightMenu()}>
          <ArticleHighlightActionMenu
            highlight={highlightMenu()}
            position={highlightMenuPosition()}
            text={highlightText()}
            context={highlightContext()}
            selection={highlightSelection()}
            article={props.article}
            onCreate={(hl: NostrRelaySignedEvent, replaceId?: string) => {
              hideHighlightMenu(hl.id);
              props.onHighlightCreated && props.onHighlightCreated(hl, replaceId);
            }}
            onRemove={(id: string) => {
              toast?.sendSuccess('Highlight removed');
              hideHighlightMenu(id);
              props.onHighlightRemoved && props.onHighlightRemoved(id);
            }}
            onComment={(hl: any) => {
              hideHighlightMenu(hl.id);
              props.onHighlightReply && props.onHighlightReply(hl)
            }}
            onCopy={(id: string) => {
              if (!id) {
                toast?.sendSuccess('Text copied');
              } else {
                toast?.sendSuccess('Highlight copied');
              }

              hideHighlightMenu(id);
              props.onHighlightDeselected && props.onHighlightDeselected();
            }}
            onQuote={(hl: NostrRelaySignedEvent) => {
              hideHighlightMenu(hl.id);
              props.onHighlightQuoted && props.onHighlightQuoted(hl);
            }}
          />
        </Show>

        <Show when={props.article}>
          <For each={contentTokens}>
            {renderToken}
          </For>
        </Show>

        {/* <For each={htmlArray()}>
          {el => (
            <Switch fallback={<>{el}</>}>
              <Match when={isHighlight(el)}>
                {renderHighlight(el)}
              </Match>
              <Match when={isMention(el)}>
                {renderMention(el)}
              </Match>
              <Match when={isImg(el)}>
                {renderImage(el)}
              </Match>
            </Switch>
          )}
        </For> */}
      </div>

      {/* <ButtonPrimary
        onClick={() => {
          const tele = getMarkdown();
          console.log('TELE: ', tele(editor.ctx));
        }}
      >
        Export
      </ButtonPrimary> */}
    </div>
  );
};

export default PrimalMarkdown;
