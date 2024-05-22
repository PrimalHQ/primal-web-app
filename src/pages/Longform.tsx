import { useIntl } from "@cookbook/solid-intl";
import { useParams } from "@solidjs/router";
import { Component, createEffect, createSignal, For, Show } from "solid-js";
import { createStore } from "solid-js/store";
import { APP_ID } from "../App";
import { Kind } from "../constants";
import { useAccountContext } from "../contexts/AccountContext";
import { decodeIdentifier } from "../lib/keys";
import { getParametrizedEvent } from "../lib/notes";
import { subscribeTo } from "../sockets";
import { SolidMarkdown } from "solid-markdown";

import styles from './Longform.module.scss';
import Loader from "../components/Loader/Loader";
import { NostrUserContent, PrimalUser } from "../types/primal";
import { getUserProfileInfo } from "../lib/profile";
import { convertToUser, userName } from "../stores/profile";
import Avatar from "../components/Avatar/Avatar";
import { shortDate } from "../lib/dates";

import hljs from 'highlight.js'

import markdownit from 'markdown-it';
import mdSub from 'markdown-it-sub';
import mdSup from 'markdown-it-sup';
import mdMark from 'markdown-it-mark';
import mdIns from 'markdown-it-ins';
import mdFoot from 'markdown-it-footnote';
import { full as mdEmoji } from 'markdown-it-emoji';
import mdDef from 'markdown-it-deflist';
import mdCont from 'markdown-it-container';
import mdAbbr from 'markdown-it-abbr';

import { rehype } from 'rehype';
import PrimalMarkdown from "../components/PrimalMarkdown/PrimalMarkdown";

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

const test = `
# h1 Heading 8-)
## h2 Heading
### h3 Heading
#### h4 Heading
##### h5 Heading
###### h6 Heading

## Mentions

nostr:npub19f2765hdx8u9lz777w7azed2wsn9mqkf2gvn67mkldx8dnxvggcsmhe9da

nostr:note1tv033d7y088x8e90n5ut8htlsyy4yuwsw2fpgywq62w8xf0qcv8q8xvvhg


## Horizontal Rules

___

---

***


## Typographic replacements

Enable typographer option to see result.

(c) (C) (r) (R) (tm) (TM) (p) (P) +-

test.. test... test..... test?..... test!....

!!!!!! ???? ,,  -- ---

"Smartypants, double quotes" and 'single quotes'


## Emphasis

**This is bold text**

__This is bold text__

*This is italic text*

_This is italic text_

~~Strikethrough~~


## Blockquotes


> Blockquotes can also be nested...
>> ...by using additional greater-than signs right next to each other...
> > > ...or with spaces between arrows.


## Lists

Unordered

+ Create a list by starting a line with \`+\`, \`-\`, or \`*\`
+ Sub-lists are made by indenting 2 spaces:
  - Marker character change forces new list start:
    * Ac tristique libero volutpat at
    + Facilisis in pretium nisl aliquet
    - Nulla volutpat aliquam velit
+ Very easy!

Ordered

1. Lorem ipsum dolor sit amet
2. Consectetur adipiscing elit
3. Integer molestie lorem at massa


1. You can use sequential numbers...
1. ...or keep all the numbers as \`1.\`

Start numbering with offset:

57. foo
1. bar


## Code

Inline \`code\`

Indented code

    // Some comments
    line 1 of code
    line 2 of code
    line 3 of code


Block code "fences"

\`\`\`
Sample text here...
\`\`\`

Syntax highlighting

\`\`\` js
var foo = function (bar) {
  return bar++;
};

console.log(foo(5));
\`\`\`

## Tables

| Option | Description |
| ------ | ----------- |
| data   | path to data files to supply the data that will be passed into templates. |
| engine | engine to be used for processing templates. Handlebars is the default. |
| ext    | extension to be used for dest files. |

Right aligned columns

| Option | Description |
| ------:| -----------:|
| data   | path to data files to supply the data that will be passed into templates. |
| engine | engine to be used for processing templates. Handlebars is the default. |
| ext    | extension to be used for dest files. |


## Links

[link text](http://dev.nodeca.com)

[link with title](http://nodeca.github.io/pica/demo/ "title text!")

Autoconverted link https://github.com/nodeca/pica (enable linkify to see)


## Images

![Minion](https://octodex.github.com/images/minion.png)
![Stormtroopocat](https://octodex.github.com/images/stormtroopocat.jpg "The Stormtroopocat")

Like links, Images also have a footnote style syntax

![Alt text][id]

With a reference later in the document defining the URL location:

[id]: https://octodex.github.com/images/dojocat.jpg  "The Dojocat"


## Plugins

The killer feature of \`markdown-it\` is very effective support of
[syntax plugins](https://www.npmjs.org/browse/keyword/markdown-it-plugin).


### [Emojies](https://github.com/markdown-it/markdown-it-emoji)

> Classic markup: :wink: :cry: :laughing: :yum:
>
> Shortcuts (emoticons): :-) :-( 8-) ;)

see [how to change output](https://github.com/markdown-it/markdown-it-emoji#change-output) with twemoji.


### [Subscript](https://github.com/markdown-it/markdown-it-sub) / [Superscript](https://github.com/markdown-it/markdown-it-sup)

- 19^th^
- H~2~O


### [\<ins>](https://github.com/markdown-it/markdown-it-ins)

there is some ++Inserted text++ here


### [\<mark>](https://github.com/markdown-it/markdown-it-mark)

==Marked text==


### [Footnotes](https://github.com/markdown-it/markdown-it-footnote)

Footnote 1 link[^first].

Footnote 2 link[^second].

Inline footnote^[Text of inline footnote] definition.

Duplicated footnote reference[^second].

[^first]: Footnote **can have markup**

    and multiple paragraphs.

[^second]: Footnote text.


### [Definition lists](https://github.com/markdown-it/markdown-it-deflist)

Term 1

:   Definition 1
with lazy continuation.

Term 2 with *inline markup*

:   Definition 2

        { some code, part of Definition 2 }

    Third paragraph of definition 2.

_Compact style:_

Term 1
  ~ Definition 1

Term 2
  ~ Definition 2a
  ~ Definition 2b


### [Abbreviations](https://github.com/markdown-it/markdown-it-abbr)

This is HTML abbreviation example.

It converts "HTML", but keep intact partial entries like "xxxHTMLyyy" and so on.

*[HTML]: Hyper Text Markup Language

`;

const Longform: Component = () => {
  const account = useAccountContext();
  const params = useParams();
  const intl = useIntl();

  const [note, setNote] = createStore<LongFormData>({...emptyLongNote});

  const [pubkey, setPubkey] = createSignal<string>('');

  // @ts-ignore
  const [author, setAuthor] = createStore<PrimalUser>();

  const md = markdownit({
    linkify: true,
    typographer: true,
    highlight: function (str, lang) {
      if (lang && hljs.getLanguage(lang)) {
        try {
          return hljs.highlight(str, { language: lang }).value;
        } catch (__) {}
      }

      return ''; // use external default escaping
    }
  })
    .use(mdAbbr)
    .use(mdCont)
    .use(mdDef)
    .use(mdEmoji)
    .use(mdFoot)
    .use(mdIns)
    .use(mdMark)
    .use(mdSub)
    .use(mdSup);

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

    if (naddr === 'test') {

      setNote(() => ({
        title: 'Test Long-Form Note',
        summary: 'This is a markdown test to show all elements of the markdown',
        image: '',
        tags: ['test', 'markdown', 'demo'],
        published: (new Date()).getTime() / 1_000,
        content: test,
        author: account?.publicKey,
      }));

      setPubkey(() => note.author);

      return;
    }

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

  const inner = () => {
    const marked = md.render(note.content || '');
    // const tree = await rehype().process(marked)

    // console.log('TREE: ', tree)

    return marked;
  }

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

          <PrimalMarkdown content={test} readonly={true} />

          {/* <div class={styles.content} innerHTML={inner()}>
             <SolidMarkdown
              children={note.content || ''}
            />
          </div> */}
        </Show>
      </div>
    </>);
}

export default Longform;
