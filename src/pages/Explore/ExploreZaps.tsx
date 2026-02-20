import { Component, For, onMount } from 'solid-js';
import styles from './Explore.module.scss';
import { useExploreContext } from '../../contexts/ExploreContext';
import { fetchExploreZaps } from '../../megaFeeds';
import { APP_ID } from '../../App';
import Paginator from '../../components/Paginator/Paginator';
import ProfileNoteZap from '../../components/ProfileNoteZap/ProfileNoteZap';
import { PrimalZap } from '../../types/primal';
import { Kind } from '../../constants';
import { calculateZapsOffset } from '../../utils';
import { accountStore } from '../../stores/accountStore';

const ExploreZaps: Component<{ open?: boolean }> = (props) => {
  const explore = useExploreContext();

  onMount(() => {
    if (explore?.exploreZaps.length === 0) {
      getZaps();
    }
  });

  const getZaps = async () => {
    const { notes, reads, users, zaps, paging } = await fetchExploreZaps(accountStore.publicKey, `explore_zaps_${APP_ID}`, { limit: 20 });

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

    const { notes, reads, users, zaps, paging } = await fetchExploreZaps(accountStore.publicKey, `explore_zaps_${APP_ID}` , page);

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
