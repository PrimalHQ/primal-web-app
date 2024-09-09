import { TextField } from '@kobalte/core/text-field';
import { Slider } from "@kobalte/core/slider";
import { Dialog } from '@kobalte/core/dialog';

import { A } from '@solidjs/router';
import { batch, Component, createEffect, For, onMount, Show } from 'solid-js';
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
import AdvancedSearchSelectBox from '../components/AdvancedSearch/AdvancedSearchSelect';
import styles from './FeedsTest.module.scss';
import dayjs from 'dayjs';
import objectSupport from 'dayjs/plugin/objectSupport';
import DatePicker, { PickerValue } from "@rnwonder/solid-date-picker";
import utils from "@rnwonder/solid-date-picker/utilities";
import AdvancedSearchUserSelect from '../components/AdvancedSearch/AdvancedSearchUserSelect';
import AdvancedSearchSlider from '../components/AdvancedSearch/AdvancedSearchSlider';
import AdvancedSearchDialog from '../components/AdvancedSearch/AdvancedSearchDialog';
import ButtonSecondary from '../components/Buttons/ButtonSecondary';
import ButtonLink from '../components/Buttons/ButtonLink';
import { wordsPerMinute } from '../constants';

export type SearchState = {
  includes: string,
  excludes: string,
  hashtags: string,
  postedBy: PrimalUser[],
  replingTo: PrimalUser[],
  zappedBy: PrimalUser[],
  userMentions: PrimalUser[],
  following: PrimalUser[],
  timeframe: string,
  customTimeframe: { since: string, until: string },
  sentiment: string,
  scope: string,
  sortBy: string,
  kind: string,
  orientation: string,
  minDuration: number,
  maxDuration: number,
  minWords: number,
  maxWords: number,
  minScore: number,
  minInteractions: number,
  minLikes: number,
  minZaps: number,
  minReplies: number,
  minReposts: number,
  filters: {
    minScore: number,
    minInteractions: number,
    minLikes: number,
    minZaps: number,
    minReplies: number,
    minReposts: number,
  }
  filtersOpened: boolean,
  command: string,
}

const orientationKinds = ['Video', 'Images'];
const durationKinds = ['Video', 'Sound'];
const readTimeKinds = ['Reads'];


const timeframes: Record<string, (s?: any) => string> = {
  'Anytime': () => '',

  // 'past hour': () => {
  //   const date = dayjs();
  //   const result = date.subtract(1, 'hour');

  //   return `since:${result.format('YYYY-MM-DD_HH:mm')}`;
  // },

  'Today': () => {
    const date = dayjs();
    const result = date.subtract(1, 'day');

    return `since:${result.format('YYYY-MM-DD_HH:mm')}`;
  },

  'This Week': () => {
    const date = dayjs();
    const result = date.subtract(1, 'week');

    return `since:${result.format('YYYY-MM-DD_HH:mm')}`;
  },

  'This Month': () => {
    const date = dayjs();
    const result = date.subtract(1, 'month');

    return `since:${result.format('YYYY-MM-DD_HH:mm')}`;
  },

  'This Year': () => {
    const date = dayjs();
    const result = date.subtract(1, 'year');

    return `since:${result.format('YYYY-MM-DD_HH:mm')}`;
  },

  'Custom': (stateTimeframe: { since: string, until: string}) => {
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

const scopes: Record<string, () => string> = {
  'Global': () => '',
  'My Follows': () => 'scope:myfollows',
  'My Network': () => 'scope:mynetwork',
  'My Follows Interactions': () => 'scope:myfollowinteractions',
};

const kinds: Record<string, () => string> = {
  'Notes': () => 'kind:1',
  'Reads': () => 'kind:30023',
  'Note Replies': () => 'kind:1 filter:replies',
  'Reads Comments': () => 'kind:30023 filter:replies',
  'Images': () => 'filter:image',
  'Video': () => 'filter:video',
  'Sound': () => 'filter:audio',
  // 'Zaps': () => 'kind:9735',
  // 'People': () => 'kind:0',
};

const orientations = ['Any', 'Vertical', 'Horizontal'];

const sortings: Record<string, () => string> = {
  'Time': () => '',
  'Content Score': () => 'orderby:score',
};

const AdvancedSearch: Component = () => {

  const [state, setState] = createStore<SearchState>({
    includes: '',
    excludes: '',
    hashtags: '',
    postedBy: [],
    replingTo: [],
    zappedBy: [],
    userMentions: [],
    following: [],
    timeframe: 'Anytime',
    customTimeframe: { since: '', until: ''},
    sortBy: 'Time',
    sentiment: 'Neutral',
    scope: 'Global',
    kind: 'Notes',
    orientation: 'Any',
    minDuration: 0,
    maxDuration: 0,
    minWords: 0,
    maxWords: 0,
    minScore: 0,
    minInteractions: 0,
    minLikes: 0,
    minZaps: 0,
    minReplies: 0,
    minReposts: 0,
    filters: {
      minScore: 0,
      minInteractions: 0,
      minLikes: 0,
      minZaps: 0,
      minReplies: 0,
      minReposts: 0,
    },
    filtersOpened: false,
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
    const tos = state.replingTo.reduce((acc, u) => acc + 'to:' + u.npub + ' ', '');
    const zappers = state.zappedBy.reduce((acc, u) => acc + 'zappedby:' + u.npub + ' ', '');
    const mentions = state.userMentions.reduce((acc, u) => acc + '@' + u.npub + ' ', '');
    const followings = state.following.reduce((acc, u) => acc + 'following:' + u.npub + ' ', '');

    let since = '';

    if (state.timeframe === 'custom') {
      since = timeframes['custom'](state.customTimeframe);
    }
    else {
      since = `${timeframes[state.timeframe]()} `;
    }

    const sentiment = `${sentiments[state.sentiment]()} `;

    const scope = `${scopes[state.scope]()} `;

    const sort = `${sortings[state.sortBy]()} `;

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

    const minWords = readTimeKinds.includes(state.kind) && !isNaN(state.minWords) && state.minWords > 0 ?
      `minwords:${state.minWords * wordsPerMinute} ` :
      '';

    const maxWords = readTimeKinds.includes(state.kind) && !isNaN(state.maxWords) && state.maxWords > state.minDuration ?
    `maxwords:${state.maxDuration * wordsPerMinute} ` :
    '';

    // FILTERS -------

    const minScore = state.minScore === 0 ?
      '' :
      `minscore:${state.minScore} `;

    const minInteractions = state.minInteractions === 0 ?
      '' :
      `mininteractions:${state.minInteractions} `;

    const minLikes = state.minLikes === 0 ?
      '' :
      `minlikes:${state.minLikes} `;

    const minZaps = state.minZaps === 0 ?
      '' :
      `minzaps:${state.minZaps} `;

    const minReplies = state.minReplies === 0 ?
      '' :
      `minreplies:${state.minReplies} `;

    const minReposts = state.minReposts === 0 ?
      '' :
      `minreposts:${state.minReposts} `;

    setState('command', () => `${kind}${includes}${excludes}${hashtags}${froms}${tos}${zappers}${mentions}${followings}${since}${scope}${sentiment}${orient}${minDuration}${maxDuration}${minWords}${maxWords}${minScore}${minInteractions}${minLikes}${minZaps}${minReplies}${minReposts}${sort}`.trim());

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

  const addZapper = (user: PrimalUser | undefined) => {
    if (!user) return;

    setState('zappedBy', state.zappedBy.length, () => ({ ...user }))
  }

  const removeZapper = (user: PrimalUser | undefined) => {
    if (!user) return;

    const filtered = state.zappedBy.filter(u => u.npub !== user.npub);

    setState('zappedBy', () => [...filtered]);
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

  const setScope = (scope: string) => {
    setState('scope', () => scope);
  };

  const setSortBy = (sort: string) => {
    setState('sortBy', () => sort);
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

  const clearFilters = () => {
    setState('filters', () => ({
      minScore: 0,
      minInteractions: 0,
      minLikes: 0,
      minZaps: 0,
      minReplies: 0,
      minReposts: 0,
    }));
  }

  const cancelFilterChanges = () => {
    setState('filters', () => ({
      minScore: state.minScore,
      minInteractions: state.minInteractions,
      minLikes: state.minLikes,
      minZaps: state.minZaps,
      minReplies: state.minReplies,
      minReposts: state.minReposts,
    }))

    setState('filtersOpened', () => false);
  }

  const applyFilters = () => {
    batch(() => {
      setState('minScore', () => state.filters.minScore);
      setState('minInteractions', () => state.filters.minInteractions);
      setState('minLikes', () => state.filters.minLikes);
      setState('minZaps', () => state.filters.minZaps);
      setState('minReplies', () => state.filters.minReplies);
      setState('minReposts', () => state.filters.minReposts);

      setState('filtersOpened', () => false);
    });
  }

  const filtersTriggerLabel = () => {
    let label = '';

    if (state.minScore > 0) label += `Min score=${state.minScore};`;
    if (state.minInteractions > 0) label += ` Min interactions=${state.minInteractions};`;
    if (state.minLikes > 0) label += ` Min likes=${state.minLikes};`;
    if (state.minZaps > 0) label += ` Min zaps=${state.minZaps};`;
    if (state.minReplies > 0) label += ` Min replies=${state.minReplies};`;
    if (state.minReposts > 0) label += ` Min reposts=${state.minReposts};`;

    if (label.length == 0) label = 'Edit Filters';

    return label;
  }

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
                placeholder="Include these words..."
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
                placeholder="Exclude these words..."
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
                />
              </div>
            </Show>

            <Show when={durationKinds.includes(state.kind)}>
              <div class={styles.searchRow}>
                <div class={styles.caption}>
                  Min duration (seconds)
                </div>

                <div class={styles.durationSlider}>
                  <AdvancedSearchSlider
                    name="minduration"
                    min={0}
                    max={state.maxDuration > 2000 ? state.maxDuration : 2000}
                    value={[state.minDuration || 0]}
                    onSlide={(v: number[]) => {
                      setState('minDuration', () => v[0]);
                      setState('maxDuration', (d) => d < v[0] ? v[0] : d);
                    }}
                    onInput={(v: string) => {
                      const val = parseInt(v.trim()) || 0;

                      setState('minDuration', () => val);
                      setState('maxDuration', (d) => d < val ? val : d);
                    }}
                  />
                </div>
              </div>

              <div class={styles.searchRow}>
                <div class={styles.caption}>
                  Max duration (seconds)
                </div>

                <div class={styles.durationSlider}>
                  <AdvancedSearchSlider
                    name="maxduration"
                    min={state.minDuration || 0}
                    max={state.maxDuration > state.minDuration + 2000 ? state.maxDuration : state.minDuration + 2000}
                    value={[state.maxDuration || 0]}
                    onSlide={(v: number[]) => setState('maxDuration', () => v[0])}
                    onInput={(v: string) => {
                      const val = parseInt(v.trim()) || 0;

                      setState('maxDuration', () => val);
                    }}
                  />
                </div>
              </div>
            </Show>


            <Show when={readTimeKinds.includes(state.kind)}>
              <div class={styles.searchRow}>
                <div class={styles.caption}>
                  Min read time (minutes)
                </div>

                <div class={styles.durationSlider}>
                  <AdvancedSearchSlider
                    name="minduration"
                    min={0}
                    max={state.maxWords > 100 ? state.maxWords : 100}
                    value={[state.minWords || 0]}
                    onSlide={(v: number[]) => {
                      setState('minWords', () => v[0]);
                      setState('maxWords', (d) => d < v[0] ? v[0] : d);
                    }}
                    onInput={(v: string) => {
                      const val = parseInt(v.trim()) || 0;

                      setState('minWords', () => val);
                      setState('maxWords', (d) => d < val ? val : d);
                    }}
                  />
                </div>
              </div>

              <div class={styles.searchRow}>
                <div class={styles.caption}>
                  Max read time (minutes)
                </div>

                <div class={styles.durationSlider}>
                  <AdvancedSearchSlider
                    name="maxduration"
                    min={state.minWords || 0}
                    max={state.maxWords > state.minWords + 100 ? state.maxWords : state.minWords + 100}
                    value={[state.maxWords || 0]}
                    onSlide={(v: number[]) => setState('maxWords', () => v[0])}
                    onInput={(v: string) => {
                      const val = parseInt(v.trim()) || 0;

                      setState('maxWords', () => val);
                    }}
                  />
                </div>
              </div>
            </Show>
          </section>

          <section>
            <div class={styles.searchRow}>
              <div class={styles.caption}>
                Posted by:
              </div>

              <AdvancedSearchUserSelect
                userList={state.postedBy}
                onUserSelect={addFrom}
                onRemoveUser={removeFrom}
              />
            </div>

            <div class={styles.searchRow}>
              <div class={styles.caption}>
                Replying to:
              </div>

              <AdvancedSearchUserSelect
                userList={state.replingTo}
                onUserSelect={addReply}
                onRemoveUser={removeReply}
              />
            </div>

            <div class={styles.searchRow}>
              <div class={styles.caption}>
                Zapped by:
              </div>

              <AdvancedSearchUserSelect
                userList={state.zappedBy}
                onUserSelect={addZapper}
                onRemoveUser={removeZapper}
              />
            </div>
          </section>

          <section>

            <div class={styles.searchRow}>
              <div class={styles.caption}>
                Time posted:
              </div>

              <AdvancedSearchSelectBox
                value={state.timeframe}
                options={Object.keys(timeframes)}
                onChange={setTimeframe}
              />
            </div>

            <Show when={state.timeframe === 'custom'}>
              <div class={styles.searchRow}>
                <div class={styles.caption}>
                  Time frame:
                </div>

                <div class={styles.leftFloat}>
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
                      <button class={styles.linkButton} onClick={showDate}>
                        {value().label || 'Select a date range'}
                      </button>
                    )}
                    shouldCloseOnSelect
                  />
                </div>
              </div>
            </Show>

            <div class={styles.searchRow}>
              <div class={styles.caption}>
                Scope:
              </div>

              <AdvancedSearchSelectBox
                value={state.scope}
                options={Object.keys(scopes)}
                onChange={setScope}
              />
            </div>

            <div class={styles.searchRow}>
              <div class={styles.caption}>
                Order by:
              </div>

              <AdvancedSearchSelectBox
                value={state.sortBy}
                options={Object.keys(sortings)}
                onChange={setSortBy}
              />
            </div>

            <div class={styles.searchRow}>
              <div class={styles.caption}>
                Filter(s):
              </div>

              <div class={styles.leftFloat}>
                <AdvancedSearchDialog
                  open={state.filtersOpened}
                  setOpen={(v: boolean) => setState('filtersOpened', () => v)}
                  triggerClass={styles.linkButton}
                  triggerContent={<div>{filtersTriggerLabel()}</div>}
                  title={<div class={styles.dialogTitle}>Search Filter</div>}
                >
                  <div class={styles.filters}>

                    <div class={styles.filterRow}>
                      <div class={styles.filterCaption}>
                        Min content score
                      </div>
                      <div class={styles.filterValue}>
                        <AdvancedSearchSlider
                          name="minscore"
                          min={0}
                          max={100}
                          value={[state.filters.minScore || 0]}
                          onSlide={(v: number[]) => {
                            setState('filters', 'minScore', () => v[0]);
                          }}
                          onInput={(v: string) => {
                            const val = parseInt(v.trim()) || 0;

                            setState('filters', 'minScore', () => val);
                          }}
                          dark={true}
                        />
                      </div>
                    </div>

                    <div class={styles.filterRow}>
                      <div class={styles.filterCaption}>
                        Min interactions
                      </div>
                      <div class={styles.filterValue}>
                        <AdvancedSearchSlider
                          name="mininteractions"
                          min={0}
                          max={100}
                          value={[state.filters.minInteractions || 0]}
                          onSlide={(v: number[]) => {
                            setState('filters', 'minInteractions', () => v[0]);
                          }}
                          onInput={(v: string) => {
                            const val = parseInt(v.trim()) || 0;

                            setState('filters', 'minInteractions', () => val);
                          }}
                          dark={true}
                        />
                      </div>
                    </div>

                    <div class={styles.filterRow}>
                      <div class={styles.filterCaption}>
                        Min likes
                      </div>
                      <div class={styles.filterValue}>
                        <AdvancedSearchSlider
                          name="minlikes"
                          min={0}
                          max={100}
                          value={[state.filters.minLikes || 0]}
                          onSlide={(v: number[]) => {
                            setState('filters', 'minLikes', () => v[0]);
                          }}
                          onInput={(v: string) => {
                            const val = parseInt(v.trim()) || 0;

                            setState('filters', 'minLikes', () => val);
                          }}
                          dark={true}
                        />
                      </div>
                    </div>

                    <div class={styles.filterRow}>
                      <div class={styles.filterCaption}>
                        Min zaps
                      </div>
                      <div class={styles.filterValue}>
                        <AdvancedSearchSlider
                          name="minzaps"
                          min={0}
                          max={100}
                          value={[state.filters.minZaps || 0]}
                          onSlide={(v: number[]) => {
                            setState('filters', 'minZaps', () => v[0]);
                          }}
                          onInput={(v: string) => {
                            const val = parseInt(v.trim()) || 0;

                            setState('filters', 'minZaps', () => val);
                          }}
                          dark={true}
                        />
                      </div>
                    </div>

                    <div class={styles.filterRow}>
                      <div class={styles.filterCaption}>
                        Min replies
                      </div>
                      <div class={styles.filterValue}>
                        <AdvancedSearchSlider
                          name="minreplies"
                          min={0}
                          max={100}
                          value={[state.filters.minReplies || 0]}
                          onSlide={(v: number[]) => {
                            setState('filters', 'minReplies', () => v[0]);
                          }}
                          onInput={(v: string) => {
                            const val = parseInt(v.trim()) || 0;

                            setState('filters', 'minReplies', () => val);
                          }}
                          dark={true}
                        />
                      </div>
                    </div>

                    <div class={styles.filterRow}>
                      <div class={styles.filterCaption}>
                        Min reposts
                      </div>
                      <div class={styles.filterValue}>
                        <AdvancedSearchSlider
                          name="minreposts"
                          min={0}
                          max={100}
                          value={[state.filters.minReposts || 0]}
                          onSlide={(v: number[]) => {
                            setState('filters', 'minReposts', () => v[0]);
                          }}
                          onInput={(v: string) => {
                            const val = parseInt(v.trim()) || 0;

                            setState('filters', 'minReposts', () => val);
                          }}
                          dark={true}
                        />
                      </div>
                    </div>

                    <div class={styles.filterActions}>
                      <ButtonLink onClick={clearFilters}>Clear</ButtonLink>
                      <div class={styles.rightFloat}>
                        <div class={styles.filtersCancel}>
                          <ButtonSecondary onClick={cancelFilterChanges} >Cancel</ButtonSecondary>
                        </div>

                        <div class={styles.filtersApply}>
                          <ButtonPrimary onClick={applyFilters}>Apply</ButtonPrimary>
                        </div>
                      </div>
                    </div>

                  </div>
                </AdvancedSearchDialog>
              </div>
            </div>
          </section>

          <div class={styles.submitButton}>
            <A class={styles.primaryButton} href={`/asearch/${encodeURIComponent(state.command)}`}>Search</A>
          </div>
        </form>
      </div>
    </>
  );
}

export default AdvancedSearch;
