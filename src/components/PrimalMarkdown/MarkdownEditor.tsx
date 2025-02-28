import { Component, createEffect, createResource, createSignal, onCleanup, onMount, Suspense } from 'solid-js'
import { editorViewOptionsCtx, Editor, rootCtx } from '@milkdown/core';
import createFuzzySearch from '@nozbe/microfuzz';

import {
  commonmark,
} from '@milkdown/preset-commonmark';

import {
  gfm,
  insertTableCommand,
} from '@milkdown/preset-gfm';

import { callCommand, getMarkdown, replaceAll, insert, getHTML, outline } from '@milkdown/utils';
import { history, undoCommand, redoCommand } from '@milkdown/plugin-history';
import { userMention } from './plugins/userMention';
import { profileRegex } from '../../constants';
import { PrimalArticle } from '../../types/primal';
import { userName } from '../../stores/profile';
import { npubToHex } from '../../lib/keys';
import DOMPurify from 'dompurify';


const MarkdownSlice: Component<{
  content: string,
}> = (props) => {

  const [editor, setEditor] = createSignal<Editor>();

  const [html, setHtml] = createSignal('');

  onMount(async () => {
    const slice = document.createElement('div');

    try {
      const e = await Editor.make()
        .config((ctx) => {
          ctx.set(rootCtx, slice);

          ctx.update(editorViewOptionsCtx, prev => ({
            ...prev,
            editable: () => false,
          }))
        })
        .use(commonmark)
        .use(gfm)
        // .use(userMention)
        .use(history)
        .create();


      const regex = /(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/g;

      const cont = props.content.replace(regex, (e) => {
        const arr = e.split('@');

        return `${arr[0]}&#8203;@${arr[1]}`;
      });

      insert(cont)(e.ctx);
      setHtml(() => getHTML()(e.ctx));

      setEditor(() => e);

    } catch(err) {
      console.error('Failed init milkdown editor: ', err);

  onCleanup(() => editor()?.destroy());


  return (
    <div innerHTML={DOMPurify.sanitize(html())}>
    </div>
  )
}

export default MarkdownSlice;
