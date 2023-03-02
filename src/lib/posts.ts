import { useFeedContext } from "../contexts/FeedContext";
import { PrimalNote } from "../types/primal";
import { getThread } from "./feed";
import { getUserProfile } from "./profile";

export const urlify = (text: string) => {
  const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;

  return text.replace(urlRegex, function(url) {
    const isImage = url.includes('.jpg')|| url.includes('.jpeg')|| url.includes('.webp') || url.includes('.png') || url.includes('.gif') || url.includes('format=png');


    if (isImage) {
      return '<img src="' + url + '" class="postImage"/>'
    }

    const isMp4Video = url.includes('.mp4');
    const isOggVideo = url.includes('.ogg');
    const isWebmVideo = url.includes('.webm');
    const isYouTubeVideo = url.includes('https://www.youtube.com');

    if (isMp4Video) {
      return `<video class="w-max" controls><source src="${url}" type="video/mp4"></video>`;
    }

    if (isOggVideo) {
      return `<video class="w-max" controls><source src="${url}" type="video/mp4"></video>`;
    }

    if (isWebmVideo) {
      return `<video class="w-max" controls><source src="${url}" type="video/mp4"></video>`;
    }

    if (isYouTubeVideo) {
      return `<iframe class="w-max" src="${url}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen=""></iframe>`;
    }



    return url;
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

const nostrify = (text: string, note: PrimalNote, skipNotes: boolean) => {

  console.log('NOSTIFY: ', text);

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

export const parseNote = (note: PrimalNote, skipNotes = false) => highlightHashtags(urlify(addlineBreaks(nostrify(note.post.content, note, skipNotes))));
