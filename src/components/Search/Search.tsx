import type { Component } from 'solid-js';
import { useToastContext } from '../Toaster/Toaster';

import styles from './Search.module.scss';

const Search: Component = () => {

  const toaster = useToastContext();

  const onSearch = (e: Event) => {
    e.preventDefault();
    toaster?.notImplemented();
  }

    return (
      <form class={styles.search} onsubmit={onSearch}>
        <div class={styles.searchIcon}></div>
        <input type='text' placeholder='search'/>
      </form>
    )
}

export default Search;
