import { TextField } from '@kobalte/core/text-field';

import { useNavigate } from '@solidjs/router';
import { batch, Component, createEffect, For, onMount, Show } from 'solid-js';
import { createStore } from 'solid-js/store';
import ButtonPrimary from '../components/Buttons/ButtonPrimary';
import PageCaption from '../components/PageCaption/PageCaption';
import PageTitle from '../components/PageTitle/PageTitle';
import StickySidebar from '../components/StickySidebar/StickySidebar';
import TextInput from '../components/TextInput/TextInput';
import { PrimalUser } from '../types/primal';
import AdvancedSearchSelectBox from '../components/AdvancedSearch/AdvancedSearchSelect';
import styles from './FeedsTest.module.scss';
import dayjs from 'dayjs';
import objectSupport from 'dayjs/plugin/objectSupport';
import DatePicker from "@rnwonder/solid-date-picker";
import utils from "@rnwonder/solid-date-picker/utilities";
import AdvancedSearchUserSelect from '../components/AdvancedSearch/AdvancedSearchUserSelect';
import AdvancedSearchSlider from '../components/AdvancedSearch/AdvancedSearchSlider';
import AdvancedSearchDialog from '../components/AdvancedSearch/AdvancedSearchDialog';
import ButtonSecondary from '../components/Buttons/ButtonSecondary';
import ButtonLink from '../components/Buttons/ButtonLink';
import { wordsPerMinute } from '../constants';
import { useSearchContext } from '../contexts/SearchContext';
import AdvancedSearchCommadTextField from '../components/AdvancedSearch/AdvancedSearchCommadTextField';
import { useAppContext } from '../contexts/AppContext';
import { useAccountContext } from '../contexts/AccountContext';

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

const maxReadTime = 20; // minutes
const maxDuration = 600; // seconds
const maxContentScore = 100;
const maxFilterValue = 20;

const orientationKinds = ['Video', 'Images'];
const durationKinds = ['Video', 'Audio'];
const readTimeKinds = ['Reads'];


const timeframes: Record<string, (s?: any) => string> = {
  'Bármikor': () => '',

  // 'past hour': () => {
  //   const date = dayjs();
  //   const result = date.subtract(1, 'hour');

  //   return `since:${result.format('YYYY-MM-DD_HH:mm')}`;
  // },

  'Ma': () => {
    return 'since:yesterday';
  },

  'Ezen a héten': () => {
    return 'since:lastweek';
  },

  'Ebben a hónapban': () => {
    return 'since:lastmonth';
  },

  'Idén': () => {
    return 'since:lastyear';
  },

  'Egyéni': (stateTimeframe: { since: string, until: string}) => {
    if (stateTimeframe.since.length === 0 && stateTimeframe.until.length === 0) {
      return '';
    }

    return `since:${stateTimeframe.since} until:${stateTimeframe.until}`;
  },
};

const sentiments: Record<string, () => string> = {
  'Pozitív': () => ':)',
  'Negatív': () => ':(',
  'Kérdéses': () => '?',
  'Semleges': () => '',
};

const scopes: Record<string, () => string> = {
  'Globális': () => '',
  'Saját követések': () => 'scope:myfollows',
  'Hálózatom': () => 'scope:mynetwork',
  'Saját követések interakciói': () => 'scope:myfollowsinteractions',
  'Hálózatom interakciói': () => 'scope:mynetworkinteractions',
  'Értesítéseim': () => 'scope:mynotifications',
  'Akiket nem követek': () => 'scope:notmyfollows',
};

const kinds: Record<string, () => string> = {
  'Bejegyzések': () => 'kind:1',
  'Olvasnivalók': () => 'kind:30023',
  'Bejegyzés válaszok': () => 'kind:1 repliestokind:1',
  'Olvasnivaló hozzászólások': () => 'kind:1 repliestokind:30023',
  'Képek': () => 'filter:image',
  'Videó': () => 'filter:video',
  'Hang': () => 'filter:audio',
  // 'Zaps': () => 'kind:9735',
  // 'People': () => 'kind:0',
};

const orientations = ['Bármely', 'Függőleges', 'Vízszintes'];

const sortings: Record<string, () => string> = {
  'Idő': () => '',
  'Tartalom érték': () => 'orderby:score',
  'Válaszok száma': () => 'orderby:replies',
  'Zappolt érték': () => 'orderby:satszapped',
  'Interakciók száma': () => 'orderby:likes',
};

export const [advSearchState, setAdvSearchState] = createStore<SearchState>({
  includes: '',
  excludes: '',
  hashtags: '',
  postedBy: [],
  replingTo: [],
  zappedBy: [],
  userMentions: [],
  following: [],
  timeframe: 'Bármikor',
  customTimeframe: { since: '', until: ''},
  sortBy: 'Idő',
  sentiment: 'Semleges',
  scope: 'Globális',
  kind: 'Bejegyzések',
  orientation: 'Bármely',
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

const AdvancedSearch: Component = () => {
  const navigate = useNavigate();
  const search = useSearchContext();
  const account = useAccountContext();


  onMount(() => {
    dayjs.extend(objectSupport);
  });

  const onSubmit = (e: SubmitEvent) => {
    e.preventDefault();
  }

  // createEffect(() => {
  //   console.log('ADV: ', advSearch?.searchCommand)
  //   if ((advSearch?.searchCommand.length || 0) > 0) {
  //     setState('command', () => advSearch?.searchCommand || '');
  //     return;
  //   }

  //   advSearch?.actions.setSearchCommand(state.command);
  // })

  createEffect(() => {
    if (advSearchState.timeframe !== 'Egyéni') {
      setAdvSearchState('customTimeframe', () => ({ since: '', until: '' }));
    }
  });

  const extractQuery = (content: string) => {
    const contentArray = content.split(' ');

    let retArray: string[] = [];
    let quoted = -1;
    let phrase: string[] = [];

    contentArray.forEach((word, index) => {
      let quoteFound = false;
      if (word.startsWith('"') || word.endsWith('"')) {
        quoteFound = true;
      }

      if (quoteFound && quoted > -1) {
        phrase.push(word);
        retArray.splice(quoted, quoted + phrase.length, phrase.join(' '));
        phrase = [];
        quoted = -1;
        return;
      }

      if (quoteFound) {
        phrase.push(word);
        quoted = retArray.length;
      }
      else if (quoted > -1) {
        phrase.push(word);
      }

      retArray.push(word);
    })

    return retArray;
  }

  const parseUserList = (list: PrimalUser[], command: string) => {
    if (list.length === 0) return '';

    const cmdList = list.reduce<string[]>((acc, u) => [ ...acc, `${command}${u.npub}` ], []);

    if (cmdList.length > 1) {
      return `(${cmdList.join(' OR ')}) `;
    }

    return `${cmdList.join(' ')} `;
  }

  createEffect(() => {
    const includes = `${extractQuery(advSearchState.includes).join(' ').trim()} `;
    const excludes = `${extractQuery(advSearchState.excludes).reduce<string>((acc, w) => w.length > 0 ? `${acc} -${w}` : acc, '')} `;
    const hashtags = advSearchState.hashtags.length === 0 ? '' : advSearchState.hashtags.split(' ').map(x => {
      const y = x.trim();
      return y.startsWith('#') ? y : `#${y}`;
    }).reduce((acc, x) => `${acc}${x} `, '');

    const froms = parseUserList(advSearchState.postedBy, 'from:');
    const tos = parseUserList(advSearchState.replingTo, 'to:');
    const zappers = parseUserList(advSearchState.zappedBy, 'zappedby:');

    const mentions = parseUserList(advSearchState.userMentions, '@');
    const followings = parseUserList(advSearchState.following, 'following:');

    let since = '';

    if (advSearchState.timeframe === 'Egyéni') {
      since = timeframes['Custom'](advSearchState.customTimeframe);
    }
    else {
      since = `${timeframes[advSearchState.timeframe]()} `;
    }

    const sentiment = `${sentiments[advSearchState.sentiment]()} `;

    const scope = `${scopes[advSearchState.scope]()} `;

    const sort = `${sortings[advSearchState.sortBy]()} `;

    const kind = `${kinds[advSearchState.kind]()} `;

    const orient = orientationKinds.includes(advSearchState.kind) && advSearchState.orientation !== 'Bármely' ?
      `orientation:${advSearchState.orientation.toLowerCase()} ` :
      '';

    const minDuration = durationKinds.includes(advSearchState.kind) && !isNaN(advSearchState.minDuration) && advSearchState.minDuration > 0 ?
      `minduration:${advSearchState.minDuration} ` :
      '';

    const maxDuration = durationKinds.includes(advSearchState.kind) && !isNaN(advSearchState.maxDuration) && advSearchState.maxDuration > 0 ?
    `maxduration:${advSearchState.maxDuration} ` :
    '';

    const minWords = readTimeKinds.includes(advSearchState.kind) && !isNaN(advSearchState.minWords) && advSearchState.minWords > 0 ?
      `minwords:${advSearchState.minWords * wordsPerMinute} ` :
      '';

    const maxWords = readTimeKinds.includes(advSearchState.kind) && !isNaN(advSearchState.maxWords) && advSearchState.maxWords > 0 ?
    `maxwords:${advSearchState.maxWords * wordsPerMinute} ` :
    '';

    // FILTERS -------

    const minScore = advSearchState.minScore === 0 ?
      '' :
      `minscore:${advSearchState.minScore} `;

    const minInteractions = advSearchState.minInteractions === 0 ?
      '' :
      `mininteractions:${advSearchState.minInteractions} `;

    const minLikes = advSearchState.minLikes === 0 ?
      '' :
      `minlikes:${advSearchState.minLikes} `;

    const minZaps = advSearchState.minZaps === 0 ?
      '' :
      `minzaps:${advSearchState.minZaps} `;

    const minReplies = advSearchState.minReplies === 0 ?
      '' :
      `minreplies:${advSearchState.minReplies} `;

    const minReposts = advSearchState.minReposts === 0 ?
      '' :
      `minreposts:${advSearchState.minReposts} `;

    setAdvSearchState('command', () => `${kind}${includes}${excludes}${hashtags}${froms}${tos}${zappers}${mentions}${followings}${since}${scope}${sentiment}${orient}${minDuration}${maxDuration}${minWords}${maxWords}${minScore}${minInteractions}${minLikes}${minZaps}${minReplies}${minReposts}${sort}`.trim());

  })

  const addFrom = (user: PrimalUser | undefined) => {
    if (!user) return;

    setAdvSearchState('postedBy', advSearchState.postedBy.length, () => ({ ...user }))
  }

  const removeFrom = (user: PrimalUser | undefined) => {
    if (!user) return;

    const filtered = advSearchState.postedBy.filter(u => u.npub !== user.npub);

    setAdvSearchState('postedBy', () => [...filtered]);
  }

  const addReply = (user: PrimalUser | undefined) => {
    if (!user) return;

    setAdvSearchState('replingTo', advSearchState.replingTo.length, () => ({ ...user }))
  }

  const removeReply = (user: PrimalUser | undefined) => {
    if (!user) return;

    const filtered = advSearchState.replingTo.filter(u => u.npub !== user.npub);

    setAdvSearchState('replingTo', () => [...filtered]);
  }

  const addZapper = (user: PrimalUser | undefined) => {
    if (!user) return;

    setAdvSearchState('zappedBy', advSearchState.zappedBy.length, () => ({ ...user }))
  }

  const removeZapper = (user: PrimalUser | undefined) => {
    if (!user) return;

    const filtered = advSearchState.zappedBy.filter(u => u.npub !== user.npub);

    setAdvSearchState('zappedBy', () => [...filtered]);
  }

  const addMention = (user: PrimalUser | undefined) => {
    if (!user) return;

    setAdvSearchState('userMentions', advSearchState.userMentions.length, () => ({ ...user }))
  }

  const removeMention = (user: PrimalUser | undefined) => {
    if (!user) return;

    const filtered = advSearchState.userMentions.filter(u => u.npub !== user.npub);

    setAdvSearchState('userMentions', () => [...filtered]);
  }

  const addFollow = (user: PrimalUser | undefined) => {
    if (!user) return;

    setAdvSearchState('following', advSearchState.following.length, () => ({ ...user }))
  }

  const removeFollow = (user: PrimalUser | undefined) => {
    if (!user) return;

    const filtered = advSearchState.following.filter(u => u.npub !== user.npub);

    setAdvSearchState('following', () => [...filtered]);
  }

  const setTimeframe = (timeframe: string) => {
    setAdvSearchState('timeframe', () => timeframe);
  };

  const setSentiment = (sentiment: string) => {
    setAdvSearchState('sentiment', () => sentiment);
  };

  const setScope = (scope: string) => {
    setAdvSearchState('scope', () => scope);
  };

  const setSortBy = (sort: string) => {
    setAdvSearchState('sortBy', () => sort);
  };

  const setKind = (kind: string) => {
    setAdvSearchState('kind', () => kind);
  };

  const setOrientation = (orient: string) => {
    setAdvSearchState('orientation', () => orient);
  };

  const onCommandChange = (v: string) => {
    setAdvSearchState('command', () => v);
    parseCommand();
  }

  const submitCommandChange = (v: string) => {
    onCommandChange(v);
    submitSearch();
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
    setAdvSearchState('filters', () => ({
      minScore: 0,
      minInteractions: 0,
      minLikes: 0,
      minZaps: 0,
      minReplies: 0,
      minReposts: 0,
    }));
  }

  const cancelFilterChanges = () => {
    setAdvSearchState('filters', () => ({
      minScore: advSearchState.minScore,
      minInteractions: advSearchState.minInteractions,
      minLikes: advSearchState.minLikes,
      minZaps: advSearchState.minZaps,
      minReplies: advSearchState.minReplies,
      minReposts: advSearchState.minReposts,
    }))

    setAdvSearchState('filtersOpened', () => false);
  }

  const applyFilters = () => {
    batch(() => {
      setAdvSearchState('minScore', () => advSearchState.filters.minScore);
      setAdvSearchState('minInteractions', () => advSearchState.filters.minInteractions);
      setAdvSearchState('minLikes', () => advSearchState.filters.minLikes);
      setAdvSearchState('minZaps', () => advSearchState.filters.minZaps);
      setAdvSearchState('minReplies', () => advSearchState.filters.minReplies);
      setAdvSearchState('minReposts', () => advSearchState.filters.minReposts);

      setAdvSearchState('filtersOpened', () => false);
    });
  }

  const filtersTriggerLabel = () => {
    let label = '';

    if (advSearchState.minScore > 0) label += `Minimum érték=${advSearchState.minScore};`;
    if (advSearchState.minInteractions > 0) label += ` Minimum interakciók=${advSearchState.minInteractions};`;
    if (advSearchState.minLikes > 0) label += ` Minimum lájkok=${advSearchState.minLikes};`;
    if (advSearchState.minZaps > 0) label += ` Minimum zappok=${advSearchState.minZaps};`;
    if (advSearchState.minReplies > 0) label += ` Minimum válaszok=${advSearchState.minReplies};`;
    if (advSearchState.minReposts > 0) label += ` Minimum újramegosztások=${advSearchState.minReposts};`;

    if (label.length == 0) label = 'Szűrők szerkesztése';

    return label;
  }

  const isPremium = () => ['premium', 'premium-legend'].includes(account?.membershipStatus.tier || '');

  const submitSearch = () => {
    let cmd = advSearchState.command;

    if(!cmd.includes(' pas:1')) {
      cmd += ' pas:1';
    }

    search?.actions.setAdvancedSearchCommand(cmd);

    navigate(`/asearch/${encodeURIComponent(cmd)}`);
  }

  return (
    <>
      <PageTitle title="Összetett keresés" />

      <PageCaption title="Összetett keresés" />

      <StickySidebar>
        <AdvancedSearchCommadTextField
          command={advSearchState.command}
          onCommandChange={onCommandChange}
          submitCommandChange={submitCommandChange}
        />
      </StickySidebar>

      <div class={styles.advancedSearchPage}>
        <form onSubmit={submitSearch}>
          <section>
            <div class={styles.searchRow}>
              <TextInput
                name="include"
                type="text"
                value={advSearchState.includes}
                placeholder="Ezeket a szavakat tartalmazza..."
                onChange={(v) => setAdvSearchState('includes', () => v)}
                noExtraSpace={true}
                icon={<div class={styles.searchIcon}></div>}
              />
            </div>

            <div class={styles.searchRow}>
              <TextInput
                name="exclude"
                type="text"
                value={advSearchState.excludes}
                placeholder="Ezeket a szavakat NE tartalmazza..."
                onChange={(v) => setAdvSearchState('excludes', () => v)}
                noExtraSpace={true}
                icon={<div class={styles.excludeIcon}></div>}
              />
            </div>

            <div class={styles.searchRow}>
              <div class={styles.caption}>
                Típus
              </div>

              <AdvancedSearchSelectBox
                value={advSearchState.kind}
                options={Object.keys(kinds)}
                onChange={setKind}
              />
            </div>

            <Show when={orientationKinds.includes(advSearchState.kind)}>
              <div class={styles.searchRow}>
                <div class={styles.caption}>
                  Orientation
                </div>

                <AdvancedSearchSelectBox
                  value={advSearchState.orientation}
                  options={orientations}
                  onChange={setOrientation}
                />
              </div>
            </Show>

            <Show when={durationKinds.includes(advSearchState.kind)}>
              <div class={styles.searchRow}>
                <div class={styles.caption}>
                  Min duration (seconds)
                </div>

                <div class={styles.durationSlider}>
                  <AdvancedSearchSlider
                    name="minduration"
                    min={0}
                    max={advSearchState.minDuration > maxDuration ? advSearchState.minDuration : maxDuration}
                    value={[advSearchState.minDuration || 0]}
                    onSlide={(v: number[]) => {
                      setAdvSearchState('minDuration', () => v[0]);
                    }}
                    onInput={(v: string) => {
                      const val = parseInt(v.trim()) || 0;

                      setAdvSearchState('minDuration', () => val);
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
                    min={0}
                    max={advSearchState.maxDuration > maxDuration ? advSearchState.maxDuration : maxDuration}
                    value={[advSearchState.maxDuration || 0]}
                    onSlide={(v: number[]) => setAdvSearchState('maxDuration', () => v[0])}
                    onInput={(v: string) => {
                      const val = parseInt(v.trim()) || 0;

                      setAdvSearchState('maxDuration', () => val);
                    }}
                  />
                </div>
              </div>
            </Show>


            <Show when={readTimeKinds.includes(advSearchState.kind)}>
              <div class={styles.searchRow}>
                <div class={styles.caption}>
                  Minimum olvasási idő (perc)
                </div>

                <div class={styles.durationSlider}>
                  <AdvancedSearchSlider
                    name="minduration"
                    min={0}
                    max={advSearchState.minWords > maxReadTime ? advSearchState.minWords : maxReadTime}
                    value={[advSearchState.minWords || 0]}
                    onSlide={(v: number[]) => {
                      setAdvSearchState('minWords', () => v[0]);
                    }}
                    onInput={(v: string) => {
                      const val = parseInt(v.trim()) || 0;

                      setAdvSearchState('minWords', () => val);
                    }}
                  />
                </div>
              </div>

              <div class={styles.searchRow}>
                <div class={styles.caption}>
                  Maximum olvasási idő (perc)
                </div>

                <div class={styles.durationSlider}>
                  <AdvancedSearchSlider
                    name="maxduration"
                    min={0}
                    max={advSearchState.maxWords > maxReadTime ? advSearchState.maxWords : maxReadTime}
                    value={[advSearchState.maxWords || 0]}
                    onSlide={(v: number[]) => setAdvSearchState('maxWords', () => v[0])}
                    onInput={(v: string) => {
                      const val = parseInt(v.trim()) || 0;

                      setAdvSearchState('maxWords', () => val);
                    }}
                  />
                </div>
              </div>
            </Show>
          </section>

          <section>
            <div class={styles.searchRow}>
              <div class={styles.caption}>
                Közzétette:
              </div>

              <AdvancedSearchUserSelect
                userList={advSearchState.postedBy}
                onUserSelect={addFrom}
                onRemoveUser={removeFrom}
              />
            </div>

            <div class={styles.searchRow}>
              <div class={styles.caption}>
                Válasz neki:
              </div>

              <AdvancedSearchUserSelect
                userList={advSearchState.replingTo}
                onUserSelect={addReply}
                onRemoveUser={removeReply}
              />
            </div>

            <div class={styles.searchRow}>
              <div class={styles.caption}>
                Zappolta:
              </div>

              <AdvancedSearchUserSelect
                userList={advSearchState.zappedBy}
                onUserSelect={addZapper}
                onRemoveUser={removeZapper}
              />
            </div>
          </section>

          <section>

            <div class={styles.searchRow}>
              <div class={styles.caption}>
                Küldési idő:
              </div>

              <AdvancedSearchSelectBox
                value={advSearchState.timeframe}
                options={Object.keys(timeframes)}
                onChange={setTimeframe}
              />
            </div>

            <Show when={advSearchState.timeframe === 'Egyéni'}>
              <div class={styles.searchRow}>
                <div class={styles.caption}>
                  Időablak:
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

                        setAdvSearchState('customTimeframe', () => ({
                          since: sd.format('YYYY-MM-DD'),
                          until: ed.format('YYYY-MM-DD'),
                        }));
                      }
                    }}
                    maxDate={utils().getToday()}
                    renderInput={({ value, showDate }) => (
                      <button class={styles.linkButton} onClick={showDate}>
                        {value().label || 'Válassz egy időszakot'}
                      </button>
                    )}
                    shouldCloseOnSelect
                  />
                </div>
              </div>
            </Show>

            <div class={styles.searchRow}>
              <div class={styles.caption}>
                Tartomány:
              </div>

              <AdvancedSearchSelectBox
                value={advSearchState.scope}
                options={Object.keys(scopes)}
                onChange={setScope}
              />
            </div>

            <div class={styles.searchRow}>
              <div class={styles.caption}>
                Rendezés:
              </div>

              <AdvancedSearchSelectBox
                value={advSearchState.sortBy}
                options={Object.keys(sortings)}
                onChange={setSortBy}
              />
            </div>

            <div class={styles.searchRow}>
              <div class={styles.caption}>
                Szűrők:
              </div>

              <div class={styles.leftFloat}>
                <AdvancedSearchDialog
                  open={advSearchState.filtersOpened}
                  setOpen={(v: boolean) => setAdvSearchState('filtersOpened', () => v)}
                  triggerClass={styles.linkButton}
                  triggerContent={<div>{filtersTriggerLabel()}</div>}
                  title={<div class={styles.dialogTitle}>Találatok szűrése</div>}
                >
                  <div class={styles.filters}>

                    <div class={styles.filterRow}>
                      <div class={styles.filterCaption}>
                        Minimum tartalom érték
                      </div>
                      <div class={styles.filterValue}>
                        <AdvancedSearchSlider
                          name="minscore"
                          min={0}
                          max={maxContentScore}
                          value={[advSearchState.filters.minScore || 0]}
                          onSlide={(v: number[]) => {
                            setAdvSearchState('filters', 'minScore', () => v[0]);
                          }}
                          onInput={(v: string) => {
                            const val = parseInt(v.trim()) || 0;

                            setAdvSearchState('filters', 'minScore', () => val);
                          }}
                          dark={true}
                        />
                      </div>
                    </div>

                    <div class={styles.filterRow}>
                      <div class={styles.filterCaption}>
                        Minimum interakciók
                      </div>
                      <div class={styles.filterValue}>
                        <AdvancedSearchSlider
                          name="mininteractions"
                          min={0}
                          max={100}
                          value={[advSearchState.filters.minInteractions || 0]}
                          onSlide={(v: number[]) => {
                            setAdvSearchState('filters', 'minInteractions', () => v[0]);
                          }}
                          onInput={(v: string) => {
                            const val = parseInt(v.trim()) || 0;

                            setAdvSearchState('filters', 'minInteractions', () => val);
                          }}
                          dark={true}
                        />
                      </div>
                    </div>

                    <div class={styles.filterRow}>
                      <div class={styles.filterCaption}>
                        Minimum lájkok
                      </div>
                      <div class={styles.filterValue}>
                        <AdvancedSearchSlider
                          name="minlikes"
                          min={0}
                          max={maxFilterValue}
                          value={[advSearchState.filters.minLikes || 0]}
                          onSlide={(v: number[]) => {
                            setAdvSearchState('filters', 'minLikes', () => v[0]);
                          }}
                          onInput={(v: string) => {
                            const val = parseInt(v.trim()) || 0;

                            setAdvSearchState('filters', 'minLikes', () => val);
                          }}
                          dark={true}
                        />
                      </div>
                    </div>

                    <div class={styles.filterRow}>
                      <div class={styles.filterCaption}>
                        Minimum zappok
                      </div>
                      <div class={styles.filterValue}>
                        <AdvancedSearchSlider
                          name="minzaps"
                          min={0}
                          max={maxFilterValue}
                          value={[advSearchState.filters.minZaps || 0]}
                          onSlide={(v: number[]) => {
                            setAdvSearchState('filters', 'minZaps', () => v[0]);
                          }}
                          onInput={(v: string) => {
                            const val = parseInt(v.trim()) || 0;

                            setAdvSearchState('filters', 'minZaps', () => val);
                          }}
                          dark={true}
                        />
                      </div>
                    </div>

                    <div class={styles.filterRow}>
                      <div class={styles.filterCaption}>
                        Minimum válaszok
                      </div>
                      <div class={styles.filterValue}>
                        <AdvancedSearchSlider
                          name="minreplies"
                          min={0}
                          max={maxFilterValue}
                          value={[advSearchState.filters.minReplies || 0]}
                          onSlide={(v: number[]) => {
                            setAdvSearchState('filters', 'minReplies', () => v[0]);
                          }}
                          onInput={(v: string) => {
                            const val = parseInt(v.trim()) || 0;

                            setAdvSearchState('filters', 'minReplies', () => val);
                          }}
                          dark={true}
                        />
                      </div>
                    </div>

                    <div class={styles.filterRow}>
                      <div class={styles.filterCaption}>
                        Minimum újramegosztások
                      </div>
                      <div class={styles.filterValue}>
                        <AdvancedSearchSlider
                          name="minreposts"
                          min={0}
                          max={maxFilterValue}
                          value={[advSearchState.filters.minReposts || 0]}
                          onSlide={(v: number[]) => {
                            setAdvSearchState('filters', 'minReposts', () => v[0]);
                          }}
                          onInput={(v: string) => {
                            const val = parseInt(v.trim()) || 0;

                            setAdvSearchState('filters', 'minReposts', () => val);
                          }}
                          dark={true}
                        />
                      </div>
                    </div>

                    <div class={styles.filterActions}>
                      <ButtonLink onClick={clearFilters}>Alaphelyzet</ButtonLink>
                      <div class={styles.rightFloat}>
                        <div class={styles.filtersCancel}>
                          <ButtonSecondary onClick={cancelFilterChanges} >Mégsem</ButtonSecondary>
                        </div>

                        <div class={styles.filtersApply}>
                          <ButtonPrimary onClick={applyFilters}>Alkalmaz</ButtonPrimary>
                        </div>
                      </div>
                    </div>

                  </div>
                </AdvancedSearchDialog>
              </div>
            </div>
          </section>

          <div class={styles.submitSearch}>
            <ButtonPrimary
              type="submit"
            >
              Keresés
            </ButtonPrimary>
          </div>

        </form>
      </div>
    </>
  );
}

export default AdvancedSearch;
