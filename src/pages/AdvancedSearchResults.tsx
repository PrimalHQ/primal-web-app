import { paragraphSchema } from '@milkdown/preset-commonmark';
import { A, useParams } from '@solidjs/router';
import { Component, For } from 'solid-js';
import { createStore } from 'solid-js/store';
import styles from './FeedsTest.module.scss';


const AdvancedSearchResults: Component = () => {
  const params = useParams();

  return (
    <>
      Feed for {params.query}
    </>
  );
}

export default AdvancedSearchResults;
