import { Component, createEffect, For, onCleanup, onMount, Show } from 'solid-js';
import styles from './Explore.module.scss';
import { useToastContext } from '../../components/Toaster/Toaster';
import { useSettingsContext } from '../../contexts/SettingsContext';
import { useIntl } from '@cookbook/solid-intl';
import { useExploreContext } from '../../contexts/ExploreContext';
import { useLocation } from '@solidjs/router';
import { fetchExplorePeople, fetchExploreZaps } from '../../megaFeeds';
import { APP_ID } from '../../App';
import { userName } from '../../stores/profile';
import Avatar from '../../components/Avatar/Avatar';
import Paginator from '../../components/Paginator/Paginator';
import ProfileNoteZap from '../../components/ProfileNoteZap/ProfileNoteZap';
import { PrimalZap } from '../../types/primal';
import { Kind } from '../../constants';
import { useAccountContext } from '../../contexts/AccountContext';
import { calculatePagingOffset, calculateZapsOffset } from '../../utils';

const ExploreZaps: Component<{ open?: boolean }> = (props) => {

  const settings = useSettingsContext();
  const toaster = useToastContext();
  const intl = useIntl();
  const explore = useExploreContext();
  const location = useLocation();
  const account = useAccountContext();

  onMount(() => {
    if (explore?.exploreZaps.length === 0) {
      getZaps();
    }
  });

  const getZaps = async () => {
    const { notes, reads, users, zaps, paging } = await fetchExploreZaps(account?.publicKey, `explore_zaps_${APP_ID}`, { limit: 20 });

    explore?.actions.setExploreZaps(zaps, paging, { notes, users, reads });
  }

  const getNextZapPage = async () => {
    if (!explore || explore.zapPaging.since === 0) return;

    const offset = calculateZapsOffset(explore.exploreZaps, explore.zapPaging);

    const page = {
      limit: 20,
      until: explore.zapPaging.since,
      offset,
    }

    const { notes, reads, users, zaps, paging } = await fetchExploreZaps(account?.publicKey, `explore_zaps_${APP_ID}` , page);

    explore?.actions.setExploreZaps(zaps, paging, { notes, users, reads });
  }

  const getZapSubject = (zap: PrimalZap) => {
    if (zap.zappedKind === Kind.Text) {
      return explore?.zapSubjects.notes.find(n => n.id === zap.zappedId);
    }

    if (zap.zappedKind === Kind.LongForm) {
      return explore?.zapSubjects.reads.find(a => [a.noteId, a.id].includes(zap.zappedId || ''));
    }

    if (zap.zappedKind === Kind.Metadata) {
      return zap.reciver
    }


    return undefined;
  }

  return (
    <div class={styles.exploreZaps}>
      <For each={explore?.exploreZaps}>
        {zap => <ProfileNoteZap zap={zap} subject={getZapSubject(zap)} />  }
      </For>
      <Paginator
        isSmall={true}
        loadNextPage={getNextZapPage}
      />
    </div>
  )
}

export default ExploreZaps;
