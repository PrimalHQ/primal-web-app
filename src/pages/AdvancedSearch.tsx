import { A } from '@solidjs/router';
import { Component, createEffect, For, onMount } from 'solid-js';
import { createStore } from 'solid-js/store';
import ButtonPrimary from '../components/Buttons/ButtonPrimary';
import PageCaption from '../components/PageCaption/PageCaption';
import PageTitle from '../components/PageTitle/PageTitle';
import Search from '../components/Search/Search';
import StickySidebar from '../components/StickySidebar/StickySidebar';
import TextInput from '../components/TextInput/TextInput';
import Wormhole from '../components/Wormhole/Wormhole';
import styles from './FeedsTest.module.scss';

export type SearchState = {
  includes: string,
  excludes: string,
  hashtags: string,
  postedBy: string,
  replingTo: string,
  userMentions: string,
  following: string,
  timeframe: string,
  sentiment: string,
  kind: number,
  command: string,
}

const AdvancedSearch: Component = () => {

  const [state, setState] = createStore<SearchState>({
    includes: '',
    excludes: '',
    hashtags: '',
    postedBy: '',
    replingTo: '',
    userMentions: '',
    following: '',
    timeframe: '',
    sentiment: '',
    kind: 0,
    command: '',
  });

  const onSubmit = (e: SubmitEvent) => {
    e.preventDefault();
    // Do search
    console.log('STATE: ', { ...state });
  }

  createEffect(() => {
    const includes = state.includes.length === 0 ? '' : state.includes.split(',').map(x => x.trim()).reduce((acc, x) => `${acc}${x} `, '');
    const excludes = state.excludes.length === 0 ? '' : state.excludes.split(',').map(x => x.trim()).reduce((acc, x) => `${acc}~${x} `, '');;
    const hashtags = state.hashtags.length === 0 ? '' : state.hashtags.split(',').map(x => {
      const y = x.trim();
      return y.startsWith('#') ? y : `#${y}`;
    }).reduce((acc, x) => `${acc}${x} `, '');

    setState('command', () => `${includes}${excludes}${hashtags}`.trim());

  })

  return (
    <>
      <PageTitle title="Advanced Search" />
      <Wormhole
        to="search_section"
      >
        <Search />
      </Wormhole>
      <PageCaption title="Advanced Search" />

      <StickySidebar>
        <textarea value={state.command} />
      </StickySidebar>

      <div class={styles.page}>
        <div class={styles.section}>

        <form onSubmit={onSubmit}>
          <TextInput
            name="include"
            type="text"
            value={state.includes}
            placeholder="include these words..."
            onChange={(v) => setState('includes', () => v)}
          />

          <TextInput
            name="exclude"
            type="text"
            value={state.excludes}
            placeholder="exclude these words..."
            onChange={(v) => setState('excludes', () => v)}
          />

          <TextInput
            name="hashtags"
            type="text"
            value={state.hashtags}
            placeholder="include hashtags..."
            onChange={(v) => setState('hashtags', () => v)}
          />

          <ButtonPrimary type="submit">Search</ButtonPrimary>
        </form>
        </div>
      </div>
    </>
  );
}

export default AdvancedSearch;
