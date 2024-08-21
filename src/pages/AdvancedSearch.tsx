import { TextField } from '@kobalte/core/text-field';
import { Slider } from "@kobalte/core/slider";

import { A } from '@solidjs/router';
import { Component, createEffect, For, onMount, Show } from 'solid-js';
import { createStore } from 'solid-js/store';
import Avatar from '../components/Avatar/Avatar';
import ButtonPrimary from '../components/Buttons/ButtonPrimary';
import PageCaption from '../components/PageCaption/PageCaption';
import PageTitle from '../components/PageTitle/PageTitle';
import Search from '../components/Search/Search';
import SearchUsers from '../components/Search/SearchUsers';
import StickySidebar from '../components/StickySidebar/StickySidebar';
import TextInput from '../components/TextInput/TextInput';
import Wormhole from '../components/Wormhole/Wormhole';
import { userName } from '../stores/profile';
import { PrimalUser } from '../types/primal';
import AdvancedSearchSelectBox from './AdvancedSearchSelect';
import styles from './FeedsTest.module.scss';
import dayjs from 'dayjs';
import objectSupport from 'dayjs/plugin/objectSupport';
import DatePicker, { PickerValue } from "@rnwonder/solid-date-picker";
import utils from "@rnwonder/solid-date-picker/utilities";

export type SearchState = {
  includes: string,
  excludes: string,
  hashtags: string,
  postedBy: PrimalUser[],
  replingTo: PrimalUser[],
  userMentions: PrimalUser[],
  following: PrimalUser[],
  timeframe: string,
  customTimeframe: { since: string, until: string },
  sentiment: string,
  kind: string,
  orientation: string,
  minDuration: number,
  maxDuration: number,
  command: string,
}

const orientationKinds = ['Video', 'Images'];
const durationKinds = ['Video', 'Sound', 'Reads'];


const timeframes: Record<string, (s?: any) => string> = {
  'Anytime': () => '',

  'past hour': () => {
    const date = dayjs();
    const result = date.subtract(1, 'hour');

    return `since:${result.format('YYYY-MM-DD_HH:mm')}`;
  },

  'past 24 hours': () => {
    const date = dayjs();
    const result = date.subtract(1, 'day');

    return `since:${result.format('YYYY-MM-DD_HH:mm')}`;
  },

  'past week': () => {
    const date = dayjs();
    const result = date.subtract(1, 'week');

    return `since:${result.format('YYYY-MM-DD_HH:mm')}`;
  },

  'past month': () => {
    const date = dayjs();
    const result = date.subtract(1, 'month');

    return `since:${result.format('YYYY-MM-DD_HH:mm')}`;
  },

  'past year': () => {
    const date = dayjs();
    const result = date.subtract(1, 'year');

    return `since:${result.format('YYYY-MM-DD_HH:mm')}`;
  },

  'custom': (stateTimeframe: { since: string, until: string}) => {
    if (stateTimeframe.since.length === 0 && stateTimeframe.until.length === 0) {
      return '';
    }

    return `since:${stateTimeframe.since} until:${stateTimeframe.until}`;
  },
};

const sentiments: Record<string, () => string> = {
  'Positive': () => ':)',
  'Negative': () => ':(',
  'Question': () => '?',
  'Neutral': () => '',
};

const kinds: Record<string, () => string> = {
  'Notes': () => 'kind:1',
  'Replies': () => 'kind:1 filter:replies',
  'Reads': () => 'kind:30023',
  'Reads comments': () => 'kind:30023 filter:replies',
  'Images': () => 'filter:image',
  'Video': () => 'filter:video',
  'Sound': () => 'filter:audio',
  'Zaps': () => 'kind:9735',
  'People': () => 'kind:0',
};

const orientations = ['Any', 'Vertical', 'Horizontal'];


const AdvancedSearch: Component = () => {

  const [state, setState] = createStore<SearchState>({
    includes: '',
    excludes: '',
    hashtags: '',
    postedBy: [],
    replingTo: [],
    userMentions: [],
    following: [],
    timeframe: 'Anytime',
    customTimeframe: { since: '', until: ''},
    sentiment: 'Neutral',
    kind: 'Notes',
    orientation: 'Any',
    minDuration: 0,
    maxDuration: 0,
    command: '',
  });

  onMount(() => {
    dayjs.extend(objectSupport);
  });

  const onSubmit = (e: SubmitEvent) => {
    e.preventDefault();
  }

  createEffect(() => {
    if (state.timeframe !== 'custom') {
      setState('customTimeframe', () => ({ since: '', until: '' }));
    }
  });

  createEffect(() => {
    const includes = state.includes.length === 0 ? '' : state.includes.split(',').map(x => x.trim()).reduce((acc, x) => `${acc}${x} `, '');
    const excludes = state.excludes.length === 0 ? '' : state.excludes.split(',').map(x => x.trim()).reduce((acc, x) => `${acc}-${x} `, '');;
    const hashtags = state.hashtags.length === 0 ? '' : state.hashtags.split(',').map(x => {
      const y = x.trim();
      return y.startsWith('#') ? y : `#${y}`;
    }).reduce((acc, x) => `${acc}${x} `, '');
    const froms = state.postedBy.reduce((acc, u) => acc + 'from:' + u.npub + ' ', '');
    const tos = state.replingTo.reduce((acc, u) => acc + 'to:' + u.npub + ' ', '');;
    const mentions = state.userMentions.reduce((acc, u) => acc + '@' + u.npub + ' ', '');;
    const followings = state.following.reduce((acc, u) => acc + 'following:' + u.npub + ' ', '');

    let since = '';

    if (state.timeframe === 'custom') {
      since = timeframes['custom'](state.customTimeframe);
    }
    else {
      since = `${timeframes[state.timeframe]()} `;
    }

    const sentiment = `${sentiments[state.sentiment]()} `;

    const kind = `${kinds[state.kind]()} `;

    const orient = orientationKinds.includes(state.kind) && state.orientation !== 'Any' ?
      `orientation:${state.orientation.toLowerCase()} ` :
      '';

    const minDuration = durationKinds.includes(state.kind) && !isNaN(state.minDuration) && state.minDuration > 0 ?
      `minduration:${state.minDuration} ` :
      '';

    const maxDuration = durationKinds.includes(state.kind) && !isNaN(state.maxDuration) && state.maxDuration > state.minDuration ?
    `maxduration:${state.maxDuration} ` :
    '';

    setState('command', () => `${kind}${includes}${excludes}${hashtags}${froms}${tos}${mentions}${followings}${since}${sentiment}${orient}${minDuration}${maxDuration}`.trim());

  })

  const addFrom = (user: PrimalUser | undefined) => {
    if (!user) return;

    setState('postedBy', state.postedBy.length, () => ({ ...user }))
  }

  const removeFrom = (user: PrimalUser | undefined) => {
    if (!user) return;

    const filtered = state.postedBy.filter(u => u.npub !== user.npub);

    setState('postedBy', () => [...filtered]);
  }

  const addReply = (user: PrimalUser | undefined) => {
    if (!user) return;

    setState('replingTo', state.replingTo.length, () => ({ ...user }))
  }

  const removeReply = (user: PrimalUser | undefined) => {
    if (!user) return;

    const filtered = state.replingTo.filter(u => u.npub !== user.npub);

    setState('replingTo', () => [...filtered]);
  }

  const addMention = (user: PrimalUser | undefined) => {
    if (!user) return;

    setState('userMentions', state.userMentions.length, () => ({ ...user }))
  }

  const removeMention = (user: PrimalUser | undefined) => {
    if (!user) return;

    const filtered = state.userMentions.filter(u => u.npub !== user.npub);

    setState('userMentions', () => [...filtered]);
  }

  const addFollow = (user: PrimalUser | undefined) => {
    if (!user) return;

    setState('following', state.following.length, () => ({ ...user }))
  }

  const removeFollow = (user: PrimalUser | undefined) => {
    if (!user) return;

    const filtered = state.following.filter(u => u.npub !== user.npub);

    setState('following', () => [...filtered]);
  }

  const setTimeframe = (timeframe: string) => {
    setState('timeframe', () => timeframe);
  };

  const setSentiment = (sentiment: string) => {
    setState('sentiment', () => sentiment);
  };

  const setKind = (kind: string) => {
    setState('kind', () => kind);
  };

  const setOrientation = (orient: string) => {
    setState('orientation', () => orient);
  };

  const onCommandChange = (v: string) => {
    setState('command', () => v);
    parseCommand();
  }

  const parseCommand = () => {
    // const tokens = state.command.split(/\s+/);
    // const parsed = { ...state };

    // for (let i = 0; i<tokens.length; i++) {
    //   const token = tokens[i];

    //   if (token.startsWith('-')) {
    //     parsed.excludes += `,${token.substring(1)}`
    //   }

    //   if (token.startsWith('#')){
    //     parsed.hashtags += `,${token.substring(1)}`
    //   }

    //   if (token.startsWith('from:')){
    //     // find the user and add him
    //     // parsed.postedBy += `${token.substring(5)}`
    //   }

    //   if (token.startsWith('to:')){
    //     // find the user and add him
    //     // parsed.replingTo += `${token.substring(3)}`
    //   }

    //   if (token.startsWith('@')){
    //     // find the user and add him
    //     // parsed.userMentions += `${token.substring(1)}`
    //   }

    //   if (token.startsWith('following:')){
    //     // find the user and add him
    //     // parsed.following += `${token.substring(10)}`
    //   }
    // }
    // console.log('TOKENS: ', parsed)

    // setState(() => ({ ...parsed }));

  };

  let timeout = 0;

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
      <TextField class={styles.searchCommand} value={state.command} onChange={onCommandChange}>
        <TextField.Label>Search Command</TextField.Label>
        <TextField.TextArea autoResize={true}/>
      </TextField>
      </StickySidebar>

      <div class={styles.advancedSearchPage}>
        <form onSubmit={onSubmit}>
          <section>
            <div class={styles.searchRow}>
              <TextInput
                name="include"
                type="text"
                value={state.includes}
                placeholder="include these words..."
                onChange={(v) => setState('includes', () => v)}
                noExtraSpace={true}
                icon={<div class={styles.searchIcon}></div>}
              />
            </div>

            <div class={styles.searchRow}>
              <TextInput
                name="exclude"
                type="text"
                value={state.excludes}
                placeholder="exclude these words..."
                onChange={(v) => setState('excludes', () => v)}
                noExtraSpace={true}
                icon={<div class={styles.excludeIcon}></div>}
              />
            </div>

            <div class={styles.searchRow}>
              <div class={styles.caption}>
                Search kind
              </div>

              <AdvancedSearchSelectBox
                value={state.kind}
                options={Object.keys(kinds)}
                onChange={setKind}
              />
            </div>

            <Show when={orientationKinds.includes(state.kind)}>
              <div class={styles.searchRow}>
                <div class={styles.caption}>
                  Orientation
                </div>

                <AdvancedSearchSelectBox
                  value={state.orientation}
                  options={orientations}
                  onChange={setOrientation}
                  short={true}
                />
              </div>
            </Show>

            <Show when={durationKinds.includes(state.kind)}>
              <div class={styles.searchRow}>
                <div class={styles.caption}>
                  Duration (seconds)
                </div>

                <Slider
                  class={styles.slider}
                  name="minduration"
                  minValue={0}
                  maxValue={2000}
                  defaultValue={[0,100]}
                  value={[state.minDuration || 0, state.maxDuration || 0]}
                  onChange={(v) => {
                    setState('minDuration', () => v[0]);
                    setState('maxDuration', () => v[1]);
                  }}
                >
                  <Slider.Track class={styles.track}>
                    <Slider.Fill class={styles.fill}/>
                    <Slider.Thumb class={styles.thumb}>
                      <Slider.Input />
                    </Slider.Thumb>
                    <Slider.Thumb class={styles.thumb}>
                      <Slider.Input />
                    </Slider.Thumb>
                  </Slider.Track>
                </Slider>

                <TextField
                  class={styles.shortInput}
                  value={`${state.minDuration} - ${state.maxDuration}`}
                  readOnly={true}
                >
                  <TextField.Input class={styles.input} />
                </TextField>

              </div>

              <div class={styles.searchRow}>
                <div class={styles.caption}>
                  Min duration (seconds)
                </div>

                <Slider
                  class={styles.slider}
                  name="minduration"
                  minValue={0}
                  maxValue={state.minDuration > 2000 ? state.minDuration : 2000}
                  value={[state.minDuration || 0]}
                  onChange={(v) => {
                    setState('minDuration', () => v[0]);
                    setState('maxDuration', (d) => d < v[0] ? v[0] : d);
                  }}
                >
                  <Slider.Track class={styles.track}>
                    <Slider.Fill class={styles.fill}/>
                    <Slider.Thumb class={styles.thumb}>
                      <Slider.Input />
                    </Slider.Thumb>
                  </Slider.Track>
                </Slider>

                <TextField
                  class={styles.shortInput}
                  value={`${state.minDuration}`}
                  readOnly={true}
                >
                  <TextField.Input class={styles.input} />
                </TextField>

              </div>

              <div class={styles.searchRow}>
                <div class={styles.caption}>
                  Max duration (seconds)
                </div>

                <Slider
                  class={styles.slider}
                  name="maxduration"
                  minValue={state.minDuration || 0}
                  maxValue={state.maxDuration > state.minDuration + 2000 ? state.maxDuration : state.minDuration + 2000}
                  value={[state.maxDuration || 0]}
                  onChange={(v) => setState('maxDuration', () => v[0])}
                >
                  <Slider.Track class={styles.track}>
                    <Slider.Fill class={styles.fill}/>
                    <Slider.Thumb class={styles.thumb}>
                      <Slider.Input />
                    </Slider.Thumb>
                  </Slider.Track>
                </Slider>

                <TextField
                  class={styles.shortInput}
                  value={`${state.maxDuration}`}
                  readOnly={true}
                >
                  <TextField.Input class={styles.input} />
                </TextField>

              </div>
            </Show>
          </section>

          <div class={styles.searchRow}>
            <div class={styles.caption}>
              Posted by
            </div>

            <div>
              <SearchUsers
                onUserSelect={addFrom}
                noLinks={true}
                placeholder="Find an author..."
              />
              <div class={styles.userPillList}>
                <For each={state.postedBy}>
                  {user => (
                    <button class={styles.userPill} onClick={() => removeFrom(user)} >
                      <Avatar size={"micro"} user={user} />
                      <div class={styles.name}>{userName(user)}</div>
                    </button>
                  )}
                </For>
              </div>
            </div>
          </div>

          <div class={styles.searchRow}>
            <div class={styles.caption}>
              Replying to
            </div>

            <div>
              <SearchUsers
                onUserSelect={addReply}
                noLinks={true}
                placeholder="Find an author..."
              />
              <div class={styles.userPillList}>
                <For each={state.replingTo}>
                  {user => (
                    <button class={styles.userPill} onClick={() => removeReply(user)} >
                      <Avatar size={"micro"} user={user} />
                      <div class={styles.name}>{userName(user)}</div>
                    </button>
                  )}
                </For>
              </div>
            </div>
          </div>


          <div class={styles.searchRow}>
            <div class={styles.caption}>
              Mentions user
            </div>

            <div>
              <SearchUsers
                onUserSelect={addMention}
                noLinks={true}
                placeholder="Find user..."
              />
              <div class={styles.userPillList}>
                <For each={state.userMentions}>
                  {user => (
                    <button class={styles.userPill} onClick={() => removeMention(user)} >
                      <Avatar size={"micro"} user={user} />
                      <div class={styles.name}>{userName(user)}</div>
                    </button>
                  )}
                </For>
              </div>
            </div>
          </div>


          <div class={styles.searchRow}>
            <div class={styles.caption}>
              Following
            </div>

            <div>
              <SearchUsers
                onUserSelect={addFollow}
                noLinks={true}
                placeholder="Find user..."
              />
              <div class={styles.userPillList}>
                <For each={state.following}>
                  {user => (
                    <button class={styles.userPill} onClick={() => removeFollow(user)} >
                      <Avatar size={"micro"} user={user} />
                      <div class={styles.name}>{userName(user)}</div>
                    </button>
                  )}
                </For>
              </div>
            </div>
          </div>


          <div class={styles.searchRow}>
            <div class={styles.caption}>
              Timeframe
            </div>

            <AdvancedSearchSelectBox
              value={state.timeframe}
              options={Object.keys(timeframes)}
              onChange={setTimeframe}
            />
          </div>

          <Show when={state.timeframe === 'custom'}>
            <div class={styles.rightFloat}>
              <DatePicker
                type="range"
                onChange={(data) => {
                  if (data.type !== 'range') return;

                  if (data.startDate && data.endDate) {
                    // @ts-ignore
                    const sd = dayjs({ year: data.startDate.year || 0, month: data.startDate.month || 0, day: data.startDate.day });
                    // @ts-ignore
                    const ed = dayjs({ year: data.endDate.year || 0, month: data.endDate.month || 0, day: data.endDate.day });

                    setState('customTimeframe', () => ({
                      since: sd.format('YYYY-MM-DD'),
                      until: ed.format('YYYY-MM-DD'),
                    }));
                  }
                }}
                maxDate={utils().getToday()}
                renderInput={({ value, showDate }) => (
                  <input
                    readOnly
                    placeholder="Select a date range"
                    value={value().label}
                    class={styles.datepickerInput}
                    onClick={showDate}
                  />
                )}
                shouldCloseOnSelect
              />
            </div>
          </Show>

          <div class={styles.searchRow}>
            <div class={styles.caption}>
              Sentiment
            </div>

            <AdvancedSearchSelectBox
              value={state.sentiment}
              options={Object.keys(sentiments)}
              onChange={setSentiment}
            />
          </div>

          <div class={styles.searchRow}>
              <TextInput
                name="hashtags"
                type="text"
                value={state.hashtags}
                placeholder="include hashtags..."
                onChange={(v) => setState('hashtags', () => v)}
                noExtraSpace={true}
              />
            </div>

          <div class={styles.submitButton}>
            <A class={styles.primaryButton} href={`/asearch/${encodeURIComponent(state.command)}`}>Search</A>
          </div>
        </form>
      </div>
    </>
  );
}

export default AdvancedSearch;
