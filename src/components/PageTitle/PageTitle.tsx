import { Component, createEffect, onCleanup } from 'solid-js';

const titleTag = document.querySelector('title');
let origTitle = titleTag?.innerText || '';

const PageTitle: Component<{ title: string }> = (props) => {

  createEffect(() => {

    if (titleTag) {
      titleTag.innerText = props.title;
    }
  });

  onCleanup(() => {
    if (titleTag) {
      titleTag.innerText = origTitle;
    }

  });

  return (
    <>
    </>
  )
}

export default PageTitle;
