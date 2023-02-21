import { A } from '@solidjs/router';
import { Component, createSignal, Match, Switch } from 'solid-js';
import { date } from '../../lib/dates';
import { PrimalNote } from '../../types/primal';
import Avatar from '../Avatar/Avatar';

import styles from './Post.module.scss';

const urlify = (text: string) => {
  const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;

  return text.replace(urlRegex, function(url) {
    const isImage = url.includes('.jpg')|| url.includes('.jpeg')|| url.includes('.webp') || url.includes('.png') || url.includes('.gif') || url.includes('format=png');

    let link = '';

    if (isImage) {
      link = '<img src="' + url + '" />'
    }

    return link + '<a href="' + url + '" target="_blank">' + url + '</a>';
  })
}

// const nostrify = (text, post) => {
//   const regex = /\#\[([0-9]*)\]/g;
//   let refs = [];
//   let match;

//   while((match = regex.exec(text)) !== null) {
//     refs.push(match[1]);
//   }


// }

const trimVerification = (address: string) => {
  const [_, domain] = address.split('@');

  return domain;
}

const Post: Component<{ post: PrimalNote }> = (props) => {

  // const [time] = createSignal(date(props.post?.post.created_at));

    return (
      <A class={styles.postLink} href={`/thread/${props.post?.post.id}`}>
        <div class={styles.post}>
          <div class={styles.avatar} title={props.post?.user?.name}>
            <Avatar
              src={props.post?.user?.picture}
              size="md"
              verified={props.post?.user?.nip05}
            />
            <div class={styles.avatarName}>{props.post?.user?.name}</div>
          </div>
          <div class={styles.content}>
            <div class={styles.header}>
              <span class={styles.postInfo}>
                <span class={styles.userInfo}>
                  <span class={styles.userName}>
                    {props.post?.user?.name}
                  </span>
                  <Switch>
                    <Match when={props.post?.user?.nip05}>
                      <span class={styles.verifiedIcon} />
                      <span
                        class={styles.verifiedBy}
                        title={props.post?.user?.nip05}
                      >
                        {trimVerification(props.post?.user?.nip05)}
                      </span>
                    </Match>
                  </Switch>
                </span>
                <span
                  class={styles.time}
                  title={date(props.post?.post?.created_at).date.toLocaleString()}
                >
                  {date(props.post?.post?.created_at).label}
                </span>
              </span>
              <div class={styles.contextMenu}>...</div>
            </div>

            <div class={styles.message} innerHTML={urlify(props.post?.post?.content)}>
            </div>

            <div class={styles.footer}>
              <div class={styles.stat}>
                <div class={styles.replyIcon}></div>
                <div class={styles.statNumber}>{props.post?.post?.replies}</div>
              </div>
              <div class={styles.stat}>
                <div class={styles.likeIcon}></div>
                <div class={styles.statNumber}>{props.post?.post?.likes}</div>
              </div>
              <div class={styles.stat}>
                <div class={styles.repostIcon}></div>
                <div class={styles.statNumber}>{props.post?.post?.mentions}</div>
              </div>
              <div class={styles.stat}>
                <div class={styles.zapIcon}></div>
                <div class={styles.statNumber}>{props.post?.post?.satszapped}</div>
              </div>
            </div>
          </div>
        </div>
      </A>
    )
}

export default Post;
