import { useIntl } from '@cookbook/solid-intl';
import { batch, Component, createEffect, Show } from 'solid-js';
import { createStore } from 'solid-js/store';
import { useAccountContext } from '../../contexts/AccountContext';
import { truncateNumber } from '../../lib/notifications';
import { DVMMetadata, NoteActions, PrimalDVM, PrimalUser, ZapOption } from '../../types/primal';
import Avatar from '../Avatar/Avatar';
import DvmFooterActionButton from '../Note/NoteFooter/DvmFooterActionButton';
import NoteFooterActionButton from '../Note/NoteFooter/NoteFooterActionButton';
import { useToastContext } from '../Toaster/Toaster';
import { toast as t } from '../../translations';
import styles from './FeedMarketPlace.module.scss';
import { canUserReceiveZaps, zapDVM } from '../../lib/zap';
import { CustomZapInfo, useAppContext } from '../../contexts/AppContext';
import { useSettingsContext } from '../../contexts/SettingsContext';
import { lottieDuration } from '../Note/NoteFooter/NoteFooter';


const FeedMarketItem: Component<{
  dvm: PrimalDVM | undefined,
  author: PrimalUser | undefined,
  stats?: { likes: number, satszapped: number },
  metadata?: DVMMetadata,
  actions?: NoteActions,
  onClick?: (dvm: PrimalDVM | undefined) => void,
}> = (props) => {
  const account = useAccountContext();
  const toast = useToastContext();
  const intl = useIntl();
  const app = useAppContext();
  const settings = useSettingsContext();

  const [state, setState] = createStore({
    likes: 0,
    satszapped: 0,
    liked: false,
    zapped: false,
  });

  createEffect(() => {
    if (props.stats) {
      setState(() => ({
        likes: props.stats?.likes || 0,
        satszapped: props.stats?.satszapped || 0,
      }));
    }
    if (props.actions) {
      setState(() => ({
        liked: props.actions?.liked || false,
        zapped: props.actions?.zapped || false,
      }));
    }
  })

  createEffect(() => console.log('DVM: ', {...state}))

  const likes = () => state.likes;
  const satszapped = () => state.satszapped;

  const isPaid = () => {
    if (!props.dvm) return false;

    const { amount, primalVerifiedRequired } = props.dvm;
    const amountValue = parseInt(amount);
    return (amount !== 'free' && !isNaN(amountValue) && amountValue > 0) || primalVerifiedRequired
  }

  const doLike = async (e: MouseEvent) => {
    console.log('0')
    e.preventDefault();
    e.stopPropagation();

    if (!account || !props.dvm) {
      console.log('1')
      return;
    }

    if (!account.hasPublicKey()) {
      account.actions.showGetStarted();
      console.log('2')
      return;
    }

    if (!account.proxyThroughPrimal && account.relays.length === 0) {
      toast?.sendWarning(
        intl.formatMessage(t.noRelaysConnected),
      );
      console.log('3')
      return;
    }

    const success = await account.actions.addLike(props.dvm);

    if (success) {
      setState((state) => ({
        likes: state.likes + 1,
        liked: true,
      }));
    }
  };


  let quickZapDelay = 0;

  const customZapInfo: () => CustomZapInfo = () => ({
    note: props.dvm,
    onConfirm: onConfirmZap,
    onSuccess: onSuccessZap,
    onFail: onFailZap,
    onCancel: onCancelZap,
  });

  const onConfirmZap = (zapOption: ZapOption) => {
    app?.actions.closeCustomZapModal();
    setState('satszapped', (sz) => sz + (zapOption.amount || 0));
    setState('zapped', () => true);

    // batch(() => {
    //   updateReactionsState('zappedAmount', () => zapOption.amount || 0);
    //   updateReactionsState('satsZapped', (z) => z + (zapOption.amount || 0));
    //   updateReactionsState('zapped', () => true);
    //   updateReactionsState('showZapAnim', () => true)
    // });

    // addTopZap(zapOption);
    // addTopZapFeed(zapOption)
  };

  const onSuccessZap = (zapOption: ZapOption) => {
    app?.actions.closeCustomZapModal();
    app?.actions.resetCustomZap();

    setState('zapped', () => true);

    // const pubkey = account?.publicKey;

    // if (!pubkey) return;

    // batch(() => {
    //   updateReactionsState('zapCount', (z) => z + 1);
    //   updateReactionsState('isZapping', () => false);
    //   updateReactionsState('showZapAnim', () => false);
    //   updateReactionsState('hideZapIcon', () => false);
    //   updateReactionsState('zapped', () => true);
    // });
  };

  const onFailZap = (zapOption: ZapOption) => {
    app?.actions.closeCustomZapModal();
    app?.actions.resetCustomZap();

    setState('satszapped', (sz) => sz - (zapOption.amount || 0));
    setState('zapped', () => props.actions?.zapped || false);

    // batch(() => {
    //   updateReactionsState('zappedAmount', () => -(zapOption.amount || 0));
    //   updateReactionsState('satsZapped', (z) => z - (zapOption.amount || 0));
    //   updateReactionsState('isZapping', () => false);
    //   updateReactionsState('showZapAnim', () => false);
    //   updateReactionsState('hideZapIcon', () => false);
    //   updateReactionsState('zapped', () => props.note.post.noteActions.zapped);
    // });

    // removeTopZap(zapOption);
    // removeTopZapFeed(zapOption);
  };

  const onCancelZap = (zapOption: ZapOption) => {
    app?.actions.closeCustomZapModal();
    app?.actions.resetCustomZap();

    setState('satszapped', (sz) => sz - (zapOption.amount || 0));
    setState('zapped', () => props.actions?.zapped || false);

    // batch(() => {
    //   updateReactionsState('zappedAmount', () => -(zapOption.amount || 0));
    //   updateReactionsState('satsZapped', (z) => z - (zapOption.amount || 0));
    //   updateReactionsState('isZapping', () => false);
    //   updateReactionsState('showZapAnim', () => false);
    //   updateReactionsState('hideZapIcon', () => false);
    //   updateReactionsState('zapped', () => props.note.post.noteActions.zapped);
    // });

    // removeTopZap(zapOption);
    // removeTopZapFeed(zapOption);
  };

  const startZap = (e: MouseEvent | TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!account?.hasPublicKey()) {
      account?.actions.showGetStarted();
      // props.updateState && props.updateState('isZapping', () => false);
      return;
    }

    if (!account.proxyThroughPrimal && account.relays.length === 0) {
      toast?.sendWarning(
        intl.formatMessage(t.noRelaysConnected),
      );
      return;
    }

    // if (!canUserReceiveZaps(props.dvm?.pubkey)) {
    //   toast?.sendWarning(
    //     intl.formatMessage(t.zapUnavailable),
    //   );
    //   props.updateState && props.updateState('isZapping', () => false);
    //   return;
    // }

    quickZapDelay = setTimeout(() => {
      app?.actions.openCustomZapModal(customZapInfo());
      // props.updateState && props.updateState('isZapping', () => true);
    }, 500);
  };

  const commitZap = (e: MouseEvent | TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();

    clearTimeout(quickZapDelay);

    if (!account?.hasPublicKey()) {
      account?.actions.showGetStarted();
      return;
    }

    if ((!account.proxyThroughPrimal && account.relays.length === 0)) {
      return;
    }

    if (app?.customZap === undefined) {
      doQuickZap();
    }
  };

  const doQuickZap = async () => {
    if (!account?.hasPublicKey()) {
      account?.actions.showGetStarted();
      return;
    }

    const amount = settings?.defaultZap.amount || 10;
    const message = settings?.defaultZap.message || '';
    const emoji = settings?.defaultZap.emoji;

    setState('satszapped', (sz) => sz - (amount || 0));

    // batch(() => {
    //   props.updateState && props.updateState('isZapping', () => true);
    //   props.updateState && props.updateState('satsZapped', (z) => z + amount);
    //   props.updateState && props.updateState('showZapAnim', () => true);
    // });

    // props.onZapAnim && props.onZapAnim({ amount, message, emoji })

    setTimeout(async () => {
      if (!props.dvm || !props.author) return;
      const success = await zapDVM(props.dvm, props.author, account.publicKey, amount, message, account.activeRelays);

      // props.updateState && props.updateState('isZapping', () => false);

      if (success) {
        customZapInfo().onSuccess({
          emoji,
          amount,
          message,
        });

        return;
      }

      customZapInfo().onFail({
        emoji,
        amount,
        message,
      });
    }, lottieDuration());

  }

  return (
    <div
      data-id={props.dvm?.id}
      class={styles.feedMarketPlaceItem}
      onClick={() => props.onClick && props.onClick(props.dvm)}
    >
      <div class={styles.left}>
        <div class={styles.avatar}>
          <Avatar size="vs2" src={props.dvm?.picture || props.dvm?.image || ''} />
        </div>
        <div class={styles.paid}>
          <Show
            when={isPaid()}
            fallback={<div class={styles.freeToken}>FREE</div>}
          >
            <div class={styles.paidToken}>PAID</div>
          </Show>
        </div>
      </div>

      <div class={styles.right}>
        <div class={styles.info}>
          <div class={styles.title}>{props.dvm?.name || ''}</div>
          <div class={styles.about}>{props.dvm?.about || ''}</div>
        </div>

        <Show when={props.metadata?.isPrimal}>
          <div class={styles.createdBy}>
            <div class={styles.primalLogo}></div>
            <span>Created by</span> <span class={styles.authorName}>Primal</span>
          </div>
        </Show>

        <div class={styles.stats}>
          <DvmFooterActionButton
            dvm={props.dvm}
            onClick={doLike}
            type="like"
            highlighted={state.liked || account?.likes.includes(props.dvm?.id || '')}
            label={likes() === 0 ? '' : truncateNumber(likes(), 2)}
            title={likes().toLocaleString()}
          />
          <DvmFooterActionButton
            dvm={props.dvm}
            onClick={(e: MouseEvent) => e.preventDefault()}
            onMouseDown={startZap}
            onMouseUp={commitZap}
            onTouchStart={startZap}
            onTouchEnd={commitZap}
            type="zap"
            highlighted={state.zapped}
            label={likes() === 0 ? '' : truncateNumber(likes(), 2)}
            title={likes().toLocaleString()}
          />
        </div>
      </div>

    </div>
  )
}

export default FeedMarketItem;
