import { Component, onMount } from 'solid-js';
import { useParams } from '@solidjs/router';

const NewsRedirect: Component = () => {
  const params = useParams();

  onMount(() => {
    window.location.replace(
      `https://tsunami.primal.net/news/${params.id}${window.location.search}${window.location.hash}`,
    );
  });

  return <></>;
}

export default NewsRedirect;
