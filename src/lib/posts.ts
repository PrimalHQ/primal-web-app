import { PrimalNote } from "../types/primal";
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

export const nostrify = (text, post: PrimalNote) => {
  const regex = /\#\[([0-9]*)\]/g;
  let refs = [];
  let match;

  while((match = regex.exec(text)) !== null) {
    refs.push(match[1]);
  }

  if (refs.length > 0) {
    refs.forEach(ref => {
      const tag = post.post.tags[ref];
      if (tag[0] === 'p') {
        getUserProfile(tag[1], `mentioned_user_|_${post.post.id}_|_${ref}`)
      }
    });
  }
  return text;
}

export const parseNote = (note: PrimalNote) => highlightHashtags(urlify(addlineBreaks(nostrify(note.post.content, note))));
