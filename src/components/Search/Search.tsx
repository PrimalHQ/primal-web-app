import type { Component } from 'solid-js';

import styles from './Search.module.scss';

const Search: Component = () => {

    return (
      <div class={styles.search}>
        <div class={styles.searchIcon}></div>
        <input type='text' placeholder='search'/>
      </div>
    )
}

export default Search;
