import type { Component } from 'solid-js';

import styles from './Search.module.scss';

const Search: Component = () => {

    return (
      <input class={styles.search} type='text' placeholder='search'/>
    )
}

export default Search;
