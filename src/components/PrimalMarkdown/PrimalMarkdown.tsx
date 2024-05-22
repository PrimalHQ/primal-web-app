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
import { npubToHex } from '../../lib/keys';
import { subscribeTo } from '../../sockets';
import { APP_ID } from '../../App';
import { getUserProfileInfo } from '../../lib/profile';
import { useAccountContext } from '../../contexts/AccountContext';
import { Kind } from '../../constants';
import { PrimalNote, PrimalUser } from '../../types/primal';
import { convertToUser, userName } from '../../stores/profile';
import { A } from '@solidjs/router';
import { createStore } from 'solid-js/store';
import { nip19 } from 'nostr-tools';
import { fetchNotes } from '../../handleNotes';
import { logError } from '../../lib/logger';
import EmbeddedNote from '../EmbeddedNote/EmbeddedNote';

const PrimalMarkdown: Component<{
  id?: string,
  content?: string,
  readonly?:  boolean,
}> = (props) => {
const account = useAccountContext();

  let ref: HTMLDivElement | undefined;
  let editor: Editor;

  const [userMentions, setUserMentions] = createStore<Record<string, PrimalUser>>({});
  const [noteMentions, setNoteMentions] = createStore<Record<string, PrimalNote>>({});

  const fetchUserInfo = (npub: string) => {
    const pubkey = npubToHex(npub);

    const subId = `lf_fui_${APP_ID}`;

    let user: PrimalUser;

    const unsub = subscribeTo(subId, (type, _, content) => {
      if (type === 'EOSE') {
        unsub();
        setUserMentions(() => ({ [user.npub]: { ...user }}))
        return;
      }

      if (type === 'EVENT') {
        if (content?.kind === Kind.Metadata) {
          user = convertToUser(content);
        }
      }
    });

    getUserProfileInfo(pubkey, account?.publicKey, subId);
  }

  const fetchNoteInfo = async (npub: string) => {
    const noteId = nip19.decode(npub).data;

    const subId = `lf_fni_${APP_ID}`;

    try {
      const notes = await fetchNotes(account?.publicKey, [noteId], subId);

      if (notes.length > 0) {
        const note = notes[0];
        setNoteMentions(() => ({ [note.post.noteId]: { ...note } }))
      }
    } catch (e) {
      logError('Failed to fetch notes: ', e);
    }
  }

  const isMention = (el: Element) => {
    const regex = /nostr:([A-z0-9]+)/;
    const content = el.innerHTML;

    return regex.test(content)
  }

  const renderMention = (el: Element) => {
    const regex = /nostr:([A-z0-9]+)/;

    const content = el.innerHTML;

    const match = content.match(regex);

    if (match === null || match.length < 2) return el;

    const [nostr, id] = match;

    if (id.startsWith('npub1')) {

      fetchUserInfo(id);
      return (
        <Show
          when={userMentions[id] !== undefined}
          fallback={<A href={`/p/${id}`}>{nostr}</A>}
        >
          <A href={`/p/${id}`}>@{userName(userMentions[id])}</A>
        </Show>
      );
    }

    if (id.startsWith('note1')) {
      fetchNoteInfo(id);
      return (
        <Show
          when={noteMentions[id] !== undefined}
          fallback={<A href={`/e/${id}`}>{nostr}</A>}
        >
          <EmbeddedNote
            note={noteMentions[id]}
            mentionedUsers={noteMentions[id].mentionedUsers || {}}
          />
        </Show>
      );
    }

    return el;
  };


  const [html, setHTML] = createSignal<string>();

  onMount(async () => {
    editor = await Editor.make()
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

      insert(props.content || '')(editor.ctx);

      setHTML(getHTML()(editor.ctx));
  });

  onCleanup(() => {
    editor.destroy();
  });

  const htmlArray = () => {
    const el = document.createElement('div');
    el.innerHTML = html() || '';

    return [ ...el.children ];
  }

  const undo = () => editor?.action(callCommand(redoCommand.key));
  const redo = () => editor?.action(callCommand(redoCommand.key));
  const bold = () => editor?.action(callCommand(toggleStrongCommand.key));
  const italic = () => editor?.action(callCommand(toggleEmphasisCommand.key));
  const table = () => editor?.action(callCommand(insertTableCommand.key));

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

      <div class={styles.editor}>
        <For each={htmlArray()}>
          {el => (
            <Switch fallback={<>{el}</>}>
              <Match when={isMention(el)}>
                {renderMention(el)}
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
