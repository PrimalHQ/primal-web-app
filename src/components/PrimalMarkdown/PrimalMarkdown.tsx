import { Component, createEffect, createSignal, For, lazy, Match, onCleanup, onMount, Show, Suspense, Switch } from 'solid-js';
import { editorViewOptionsCtx, Editor, rootCtx } from '@milkdown/core';

import {
  commonmark,
  toggleStrongCommand,
  toggleEmphasisCommand,
} from '@milkdown/preset-commonmark';

import {
  gfm,
  insertTableCommand,
} from '@milkdown/preset-gfm';

import { callCommand, getMarkdown, replaceAll, insert, getHTML, outline } from '@milkdown/utils';
import { history, undoCommand, redoCommand } from '@milkdown/plugin-history';

import { listener, listenerCtx } from '@milkdown/plugin-listener';

import  styles from './PrimalMarkdown.module.scss';
import ButtonPrimary from '../Buttons/ButtonPrimary';
import ButtonGhost from '../Buttons/ButtonGhost';
import { Ctx } from '@milkdown/ctx';
import { decodeIdentifier, npubToHex } from '../../lib/keys';
import { subscribeTo } from '../../sockets';
import { APP_ID } from '../../App';
import { getUserProfileInfo } from '../../lib/profile';
import { useAccountContext } from '../../contexts/AccountContext';
import { Kind } from '../../constants';
import { PrimalArticle, PrimalNote, PrimalUser } from '../../types/primal';
import { authorName, convertToUser, userName } from '../../stores/profile';
import { A } from '@solidjs/router';
import { createStore } from 'solid-js/store';
import { nip19 } from '../../lib/nTools';
import { fetchNotes } from '../../handleNotes';
import { logError } from '../../lib/logger';
import EmbeddedNote from '../EmbeddedNote/EmbeddedNote';
import NoteImage from '../NoteImage/NoteImage';
import PhotoSwipeLightbox from 'photoswipe/lightbox';
import { template } from 'solid-js/web';
import ArticlePreview from '../ArticlePreview/ArticlePreview';
import LinkPreview from '../LinkPreview/LinkPreview';
import ArticleLinkPreview from '../LinkPreview/ArticleLinkPreview';
import ArticleHighlight from '../ArticleHighlight/ArticleHighlight';
import ArticleHighlightActionMenu from '../ArticleHighlight/ArticleHighlightActionMenu';

export type Coord = {
  x: number;
  y: number;
};

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
  highlights?: any[],
  onHighlightSelected?: (highlight: any) => void,
  onHighlightCreated?: (highlight: any) => void,
  onHighlightRemoved?: (id: string) => void,
  onHighlightReply?: () => void,
}> = (props) => {
  const account = useAccountContext();

  let ref: HTMLDivElement | undefined;
  let viewer: HTMLDivElement | undefined;
  // let editor1: Editor;

  const [editor, setEditor] = createSignal<Editor>();

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
  const [highlightMenuPosition, setHighlightMenuPosition] = createSignal<Coord>();

  const showHighlightMenu = (id: string) => {
    if (highlightMenu() && id === highlightMenu().id) return;

    const hl = props.highlights?.find(h => h.id === id);

    if (hl) {
      const el = document.querySelector(`em[data-highlight="${hl.id}"]`);

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

  const hideContextMenu = (id: string) => {
    if (highlightMenu() && id === highlightMenu().id) {
      setHighlightMenu(() => undefined);
      props.onHighlightSelected && props.onHighlightSelected(undefined);
    }
  };

  const onMouseUp = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // @ts-ignore
    const isHighlightMenuOption = e.target?.parentElement.getAttribute('data-highlight-menu-option') !== null;

    if (isHighlightMenuOption) return;

    // @ts-ignore
    const selection = document.getSelection();
    document.querySelector('em[data-highlight-selected')?.removeAttribute('data-highlight-selected');

    if (selection?.toString().length === 0) {
      setHighlightMenu(() => undefined);
      props.onHighlightSelected && props.onHighlightSelected(undefined);
      return;
    }


    // @ts-ignore
    setHighlightText(() => selection?.toString());
    setHighlightContext(() => selection?.anchorNode?.parentElement?.innerText || '')
    // @ts-ignore
    showNewHighlightMenu('NEW_HIGHLIGHT');
  };

  const showNewHighlightMenu = (text: string) => {
    const coord = getSelectionCoords(true);

    const r = viewer?.getBoundingClientRect();
    const xOff = r?.left || 0;
    const yOff = r?.top || 0;

    coord && setHighlightMenuPosition(() => ({ x: coord.x - xOff, y: coord.y - yOff}));
    setHighlightMenu(() => text);
  };

  const renderHighlight = (el: Element) => {
    for (let i=0; i<el.children.length; i++) {
      const child = el.children.item(i);

      if (child?.tagName === 'EM' && child.attributes.getNamedItem('data-highlight')) {
        const id = child.attributes.getNamedItem('data-highlight')?.value;

        const highlight = props.highlights?.find(h => h.id === id);

        if (highlight) {
          child.replaceWith(
            // @ts-ignore
            <ArticleHighlight
              highlight={props.highlights?.find(h => h.id === id)}
              onShowMenu={showHighlightMenu}
              onHideMenu={hideContextMenu}
            />
          );
        }
      }
    }

    return <>{el}</>


  }

  const renderImage = (el: Element) => {
    const img = el.firstChild as HTMLImageElement;

    return <NoteImage
      class={`noteimage image_${props.noteId}`}
      src={img.src}
      width={640}
    />
  }

  const renderMention = (el: Element) => {
    const regex = /nostr:([A-z0-9]+)/;

    const content = el.innerHTML;

    const tokens = content.split(regex);

    let items: any[] = [];

    for(let i=0; i<tokens.length; i++) {
      const token = tokens[i];


      if (token.startsWith('npub')) {
        const id = npubToHex(token);
        const user = (props.article?.mentionedUsers || {})[id];

        items.push(
          <Show
            when={user}
            fallback={<A href={`/p/${token}`}>nostr:{token}</A>}
          >
            <A href={`/p/${token}`}>@{userName(user)}</A>
          </Show>
        );

        continue;
      }

      if (token.startsWith('note')) {
        const id = npubToHex(token);
        const note = (props.article?.mentionedNotes || {})[id];

        items.push(
          <Show
            when={note}
            fallback={<A href={`/e/${token}`}>nostr:{token}</A>}
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

        continue;
      }

      if (token.startsWith('naddr')) {
        const mention = props.article?.mentionedNotes && props.article.mentionedNotes[token];

        if (!mention) {
          items.push(<>nostr:{token}</>)
          continue;
        };

        const preview = {
          url: `/e/${token}`,
          description: (mention.post.tags.find(t => t[0] === 'summary') || [])[1] || mention.post.content.slice(0, 100),
          images: [(mention.post.tags.find(t => t[0] === 'image') || [])[1] || mention.user.picture],
          title: (mention.post.tags.find(t => t[0] === 'title') || [])[1] || authorName(mention.user),
        }

        items.push(
          <ArticleLinkPreview
            preview={preview}
            bordered={true}
          />
        );

        continue;
      }

      const elem = document.createElement("span");
      elem.innerHTML = token;

      items.push(<>{elem}</>);
    }

    return <p><For each={items}>{item => <>{item}</>}</For></p>;

  };


  const [html, setHTML] = createSignal<string>();

  onMount(async () => {
    const e = await Editor.make()
      .config((ctx) => {
          ctx.set(rootCtx, ref);

          ctx.update(editorViewOptionsCtx, prev => ({
            ...prev,
            editable: () => !Boolean(props.readonly),
          }))
      })
      .use(commonmark)
      .use(gfm)
      // .use(emoji)
      .use(history)
      // .use(userMention)
      // .use(copilotPlugin)
      // .use(noteMention)
      // .use(slash)
      // .use(mention)
      .create();

    setEditor

    insert(props.content || '')(e.ctx);

    setHTML(getHTML()(e.ctx));

    setEditor(() => e);

    document.addEventListener('mouseup', onMouseUp);
  });

  onCleanup(() => {
    document.removeEventListener('mouseup', onMouseUp);
  })

  createEffect(() => {
    const e = editor();

    if (!props.highlights) return;
    if (!e) return;

    const htmlContent = getHTML()(e.ctx);

    let parsedContent = ''

    if (props.highlights) {
      parsedContent = props.highlights.reduce((acc, hl) => {
        const context = (hl.tags.find((t: string[]) => t[0] == 'context') || ['', ''])[1];

        const newContext = context.replace(hl.content, `<em data-highlight="${hl.id}">${hl.content}</em>`);

        return acc.replace(context, newContext);
      }, htmlContent);
    }

    setHTML(parsedContent);
  });

  onCleanup(() => {
    editor()?.destroy();
  });

  const htmlArray = () => {
    const el = document.createElement('div');
    el.innerHTML = html() || '';

    return [ ...el.children ];
  }

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
            article={props.article}
            onCreate={props.onHighlightCreated}
            onRemove={props.onHighlightRemoved}
            onComment={props.onHighlightReply}
          />
        </Show>

        <For each={htmlArray()}>
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
        </For>
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
