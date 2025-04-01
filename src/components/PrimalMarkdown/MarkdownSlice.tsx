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
import { profileRegex } from '../../constants';
import { PrimalArticle } from '../../types/primal';
import { userName } from '../../stores/profile';
import { npubToHex } from '../../lib/keys';
import DOMPurify from 'dompurify';


const MarkdownSlice: Component<{
  content: string,
  original: string,
  highlights: any[],
  article?: PrimalArticle,
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

      // return highlightedContent(props.content, slice, props.highlights)
    }


    // return highlightedContent(props.content, slice, props.highlights);
  });


  // const highlightedContent = (content: string, slice: HTMLDivElement, highlights: any[]) => {
  //   const e = editor();

  //   if (!e) return slice;

  //   if (highlights.length === 0) {
  //     insert(content)(e.ctx);
  //     setHtml(() => getHTML()(e.ctx));
  //   }

  //   let parsedContent = ''

  //   parsedContent = highlights.reduce((acc, hl) => {
  //     const context = (hl.tags.find((t: string[]) => t[0] == 'context') || ['', ''])[1];

  //     // const newContext = context.replace(hl.content, `<em data-highlight="${hl.id}">${hl.content}</em>`);
  //     const newContext = context.replace(hl.content, `[${hl.content}](hl:${hl.id})`);

  //     return acc.replace(context, newContext);
  //   }, content);


  //   insert(parsedContent)(e.ctx);
  //   setHtml(() => getHTML()(e.ctx));
  // };

  onCleanup(() => editor()?.destroy());

  createEffect(() => {
    const e = editor();
    if (!e) return;

    if (props.highlights.length > 0) {
      let parsedContent = getHTML()(e.ctx);
      const fuzzy = createFuzzySearch([props.original]);

      const found: any[] = [];

      props.highlights.forEach((hl: any) => {
        // const context = (hl.tags.find((t: string[]) => t[0] == 'context') || ['', ''])[1];

        const result = fuzzy(hl.content)[0];

        if (!result) return;

        found.push({
          item: result.item,
          hl,
          // @ts-ignore
          start: result.matches[0][0][0] || 0,
          // @ts-ignore
          end: result.matches[0][0][1] || 0,
        })

      });

      parsedContent = found.reduce((acc, f) => {
        let highlightContent: string = `${f.hl.content || ''}`;
        const match = highlightContent.match(profileRegex);
        let contentWithMention = highlightContent;

        if (match && props.article) {
          const user = props.article.mentionedUsers && props.article.mentionedUsers[npubToHex(match[1])];

          if (user) {
            highlightContent = highlightContent.replaceAll(match[0], `<a href="${match[0]}" title="${match[1]}">@${userName(user)}</a>`);
            contentWithMention = highlightContent.replaceAll(`<a href="${match[0]}" title="${match[1]}">@${userName(user)}</a>`, `@${userName(user)}`);
          }

        const r1 = acc.replace(highlightContent, `${contentWithMention}`);

        return r1.replace(contentWithMention, `<a href="hl:${f.hl.id}" data-highlight="${f.hl.id}">${contentWithMention}</a>`);

        }

        return acc.replace(highlightContent, `<a href="hl:${f.hl.id}" data-highlight="${f.hl.id}">${highlightContent}</a>`)

      }, parsedContent);

      // parsedContent = props.highlights.reduce((acc, hl) => {
      //   const context = (hl.tags.find((t: string[]) => t[0] == 'context') || ['', ''])[1];

      //   if (context.length === 0) return acc;

      //   const results = fuzzy(hl.content);

      //   if (results.length > 0) {
      //     console.log('FUSE1: ', context, hl.content, results)
      //     console.log('FUSE2: ', context.replace(hl.content, '___HL___'))
      //   }

      //   const newContext = context.replace(hl.content, `<a href="hl:${hl.id}" data-highlight="${hl.id}">${hl.content}</a>`);
      //   // const newContext = context.replace(hl.content, `[${hl.content}](hl:${hl.id})`);

      //   return acc.replace(context, newContext);
      // }, getHTML()(e.ctx));

      setHtml(() => parsedContent)
    }
  })

  return (
    <div innerHTML={DOMPurify.sanitize(html())}>
    </div>
  )
}

export default MarkdownSlice;
