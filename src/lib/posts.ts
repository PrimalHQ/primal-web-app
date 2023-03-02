import { useFeedContext } from "../contexts/FeedContext";
import { PrimalNote } from "../types/primal";
import { getThread } from "./feed";
import { getUserProfile } from "./profile";

export const urlify = (text: string) => {
  const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;

  return text.replace(urlRegex, function(url) {
    const isImage = url.includes('.jpg')|| url.includes('.jpeg')|| url.includes('.webp') || url.includes('.png') || url.includes('.gif') || url.includes('format=png');

    let link = '';

    if (isImage) {
      link = '<img src="' + url + '" class="postImage"/>'
    }

    return link;
  })
}

export const addlineBreaks = (text: string) => {
  const regex = /(\r\n|\r|\n)/g;

  return text.replace(regex, '<br>');
};

export const highlightHashtags = (text: string) => {
  const regex = /(^|\s)(#[a-z\d-]+)/ig;

  return text.replace(regex, "$1<span class='hash_tag'>$2</span>");
};

export const nostrify = (text, post: PrimalNote, skipNotes = false) => {
  const regex = /\#\[([0-9]*)\]/g;
  let refs = [];
  let match;
  const context = useFeedContext();

  while((match = regex.exec(text)) !== null) {
    refs.push(match[1]);
  }

  if (refs.length > 0) {
    refs.forEach(ref => {
      const tag = post.post.tags[ref];
      if (tag[0] === 'p') {
        getUserProfile(tag[1], `mentioned_user_|_${post.post.id}_|_${ref}`)
      }

      if (!skipNotes && tag[0] === 'e') {
        getThread(tag[1], `mentioned_post_|_${post.post.id}_|_${ref}_|_${tag[1]}`, 0, 1);
      }
    });
  }
  return text;
}

const nostrify2 = (text: string, note: PrimalNote, skipNotes: boolean) => {
  const regex = /\#\[([0-9]*)\]/g;
  let refs = [];
  let match;
  // let nostrifiedText = `${text}`;

  while((match = regex.exec(text)) !== null) {
    refs.push(match[1]);
  }

  if (refs.length > 0) {
    refs.forEach(ref => {
      const tag = note.post.tags[ref];
      if (tag[0] === 'p') {
        getUserProfile(tag[1], `mentioned_user_|_${note.post.id}_|_${ref}`)
        // nostrifiedText = nostrifiedText.replaceAll(`#[${ref}]`, `[[UR ${tag[1]}]]`)
      }

      if (!skipNotes && tag[0] === 'e') {
        getThread(tag[1], `mentioned_post_|_${note.post.id}_|_${ref}_|_${tag[1]}`, 0, 1);
        // nostrifiedText = nostrifiedText.replaceAll(`#[${ref}]`, `[[ER ${tag[1]}]]`)
      }
    });
  }
  // return nostrifiedText;
  return text;

};

export const parseNote = (note: PrimalNote, skipNotes = false) => highlightHashtags(urlify(addlineBreaks(nostrify2(note.post.content, note, skipNotes))));
