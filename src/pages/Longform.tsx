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
import { NostrUserContent, PrimalUser, TopZap } from "../types/primal";
import { getUserProfileInfo } from "../lib/profile";
import { convertToUser, userName } from "../stores/profile";
import Avatar from "../components/Avatar/Avatar";
import { shortDate } from "../lib/dates";

import hljs from 'highlight.js'

import mdFoot from 'markdown-it-footnote';
import { full as mdEmoji } from 'markdown-it-emoji';

import PrimalMarkdown from "../components/PrimalMarkdown/PrimalMarkdown";
import NoteTopZaps from "../components/Note/NoteTopZaps";
import { parseBolt11 } from "../utils";
import { NoteReactionsState } from "../components/Note/Note";
import NoteFooter from "../components/Note/NoteFooter/NoteFooter";
import { getArticleThread, getThread } from "../lib/feed";

export type LongFormData = {
  title: string,
  summary: string,
  image: string,
  tags: string[],
  published: number,
  content: string,
  author: string,
  topZaps: TopZap[],
};

const emptyLongNote = {
  title: '',
  summary: '',
  image: '',
  tags: [],
  published: 0,
  content: '',
  author: '',
  topZaps: [],
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

const Longform: Component< { naddr: string } > = (props) => {
  const account = useAccountContext();
  const params = useParams();
  const intl = useIntl();

  const [note, setNote] = createStore<LongFormData>({...emptyLongNote});

  const [pubkey, setPubkey] = createSignal<string>('');

  // @ts-ignore
  const [author, setAuthor] = createStore<PrimalUser>();

  const naddr = () => props.naddr;

  const [reactionsState, updateReactionsState] = createStore<NoteReactionsState>({
    likes: 0,
    liked: false,
    reposts: 0,
    reposted: false,
    replies: 0,
    replied: false,
    zapCount: 0,
    satsZapped: 0,
    zapped: false,
    zappedAmount: 0,
    zappedNow: false,
    isZapping: false,
    showZapAnim: false,
    hideZapIcon: false,
    moreZapsAvailable: false,
    isRepostMenuVisible: false,
    topZaps: [],
    topZapsFeed: [],
    quoteCount: 0,
  });

  createEffect(() => {
    if (!pubkey()) {
      return;
    }

    const subId = `author_${naddr()}_${APP_ID}`;

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
    if (naddr() === 'test') {

      setNote(() => ({
        title: 'Test Long-Form Note',
        summary: 'This is a markdown test to show all elements of the markdown',
        image: '',
        tags: ['test', 'markdown', 'demo'],
        published: (new Date()).getTime() / 1_000,
        content: test,
        author: account?.publicKey,
        topZaps: [],
      }));

      setPubkey(() => note.author);

      return;
    }

    if (typeof naddr() === 'string' && naddr().startsWith('naddr')) {
      const decoded = decodeIdentifier(naddr());

      const { pubkey, identifier, kind } = decoded.data;

      const subId = `naddr_${naddr()}_${APP_ID}`;

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
              topZaps: note.topZaps || [],
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


        if (content?.kind === Kind.Zap) {
          const zapTag = content.tags.find(t => t[0] === 'description');

          if (!zapTag) return;

          const zapInfo = JSON.parse(zapTag[1] || '{}');

          let amount = '0';

          let bolt11Tag = content?.tags?.find(t => t[0] === 'bolt11');

          if (bolt11Tag) {
            try {
              amount = `${parseBolt11(bolt11Tag[1]) || 0}`;
            } catch (e) {
              const amountTag = zapInfo.tags.find((t: string[]) => t[0] === 'amount');

              amount = amountTag ? amountTag[1] : '0';
            }
          }

          const eventId = (zapInfo.tags.find((t: string[]) => t[0] === 'e') || [])[1];

          const zap: TopZap = {
            id: zapInfo.id,
            amount: parseInt(amount || '0'),
            pubkey: zapInfo.pubkey,
            message: zapInfo.content,
            eventId,
          };

          const oldZaps = note.topZaps;

          if (!oldZaps || oldZaps.length === 0) {
            setNote((n) => ({ ...n, topZaps: [{ ...zap }]}));
            return;
          }

          if (oldZaps.find(i => i.id === zap.id)) {
            return;
          }

          const newZaps = [ ...oldZaps, { ...zap }].sort((a, b) => b.amount - a.amount);

          setNote((n) => ({ ...n, topZaps: [...newZaps]}));

          return;
        }
        }
      });

      // getThread(account?.publicKey, naddr, subId)
      getArticleThread(account?.publicKey, pubkey, identifier, kind, subId);
    }
  })

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

          <img class={styles.image} src={note.image} />

          <div class={styles.summary}>
            <div class={styles.border}></div>
            <div class={styles.text}>
              {note.summary}
            </div>
          </div>

          <NoteTopZaps
            topZaps={note.topZaps}
            zapCount={reactionsState.zapCount}
            action={() => {}}
          />

          <PrimalMarkdown content={note.content || ''} readonly={true} />

          <div class={styles.tags}>
            <For each={note.tags}>
              {tag => (
                <div class={styles.tag}>
                  {tag}
                </div>
              )}
            </For>
          </div>
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
