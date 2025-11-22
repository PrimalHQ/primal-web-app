import { Component, For, Show, createSignal } from 'solid-js';
import { BreezPaymentInfo } from '../../lib/breezWalletService';
import { useToastContext } from '../Toaster/Toaster';

import styles from './SparkPaymentsList.module.scss';

type SparkPaymentsListProps = {
  payments: BreezPaymentInfo[];
  loading: boolean;
  hasMore?: boolean;
  onLoadMore?: () => Promise<void>;
  onRefreshPayment?: (paymentId: string) => Promise<void>;
  isBalanceHidden?: boolean;
};

const SparkPaymentsList: Component<SparkPaymentsListProps> = (props) => {
  const toast = useToastContext();
  const [expandedPayments, setExpandedPayments] = createSignal<Set<string>>(new Set());
  const [refreshingPayments, setRefreshingPayments] = createSignal<Set<string>>(new Set());
  const [isLoadingMore, setIsLoadingMore] = createSignal(false);

  const toggleExpanded = (paymentId: string) => {
    setExpandedPayments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(paymentId)) {
        newSet.delete(paymentId);
      } else {
        newSet.add(paymentId);
      }
      return newSet;
    });
  };

  const handleRefreshPayment = async (paymentId: string) => {
    if (!props.onRefreshPayment) return;

    setRefreshingPayments(prev => {
      const newSet = new Set(prev);
      newSet.add(paymentId);
      return newSet;
    });

    try {
      await props.onRefreshPayment(paymentId);
      toast?.sendSuccess('Payment status refreshed');
    } catch (error) {
      toast?.sendWarning('Failed to refresh payment');
    } finally {
      setRefreshingPayments(prev => {
        const newSet = new Set(prev);
        newSet.delete(paymentId);
        return newSet;
      });
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast?.sendSuccess(`${label} copied to clipboard`);
  };

  const formatDate = (timestamp: number) => {
    // Check if timestamp is in seconds (Unix timestamp) or milliseconds
    const milliseconds = timestamp < 10000000000 ? timestamp * 1000 : timestamp;
    const date = new Date(milliseconds);
    return date.toLocaleString();
  };

  const formatPendingDuration = (timestamp: number) => {
    const milliseconds = timestamp < 10000000000 ? timestamp * 1000 : timestamp;
    const now = Date.now();
    const diffMs = now - milliseconds;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffDays > 0) {
      return `${diffDays}d ${diffHours}h`;
    }
    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m`;
    }
    return `${diffMinutes}m`;
  };

  const isPendingTooLong = (timestamp: number) => {
    const milliseconds = timestamp < 10000000000 ? timestamp * 1000 : timestamp;
    const now = Date.now();
    const diffMinutes = Math.floor((now - milliseconds) / (1000 * 60));
    return diffMinutes > 10; // More than 10 minutes is unusual
  };

  const isReceived = (payment: BreezPaymentInfo) => {
    return payment.paymentType === 'receive';
  };

  const handleLoadMore = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    if (!props.onLoadMore || isLoadingMore() || !props.hasMore) {
      return;
    }

    // Save scroll position before loading
    const savedScrollY = window.scrollY;
    const savedScrollX = window.scrollX;

    setIsLoadingMore(true);

    try {
      await props.onLoadMore();

      // Restore scroll position after loading
      window.scrollTo({
        top: savedScrollY,
        left: savedScrollX,
        behavior: 'instant'
      });
    } catch (error) {
      toast?.sendWarning('Failed to load more payments');

      // Restore scroll position even on error
      window.scrollTo({
        top: savedScrollY,
        left: savedScrollX,
        behavior: 'instant'
      });
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <Show
      when={!props.loading}
      fallback={
        <div class={styles.loadingState}>
          <div class={styles.spinner}></div>
        </div>
      }
    >
      <Show
        when={props.payments.length > 0}
        fallback={
          <div class={styles.emptyState}>
            <div class={styles.emptyIcon}></div>
            <div class={styles.emptyTitle}>No payments yet</div>
            <div class={styles.emptyDescription}>
              Payments will appear here after you send or receive
            </div>
          </div>
        }
      >
        <div class={styles.paymentsList}>
          <For each={props.payments}>
            {(payment, index) => {
              const isExpanded = () => expandedPayments().has(payment.id);
              const isRefreshing = () => refreshingPayments().has(payment.id);
              const received = isReceived(payment);

              return (
                <div class={styles.paymentItem}>
                  <div
                    class={styles.paymentHeader}
                    onClick={() => toggleExpanded(payment.id)}
                  >
                    {/* Icon and Amount - Left side */}
                    <div class={styles.paymentLeft}>
                      <div class={styles.chevron}>
                        <Show when={isExpanded()} fallback={
                          <div class={styles.chevronRight}></div>
                        }>
                          <div class={styles.chevronDown}></div>
                        </Show>
                      </div>

                      <div class={styles.paymentIcon}>
                        <Show when={received} fallback={
                          <div class={styles.sentIcon}></div>
                        }>
                          <div class={styles.receivedIcon}></div>
                        </Show>
                      </div>

                      <div class={styles.paymentAmount}>
                        <Show when={props.isBalanceHidden} fallback={
                          <span class={received ? styles.amountPositive : styles.amountNegative}>
                            {received ? '+' : '-'}
                            {payment.amount.toLocaleString()} sat{payment.amount !== 1 ? 's' : ''}
                            <Show when={payment.fees > 0}>
                              <span class={styles.feeText}>
                                {' + '}{payment.fees.toLocaleString()} sat{payment.fees !== 1 ? 's' : ''} fee
                              </span>
                            </Show>
                          </span>
                        }>
                          <span class={styles.amountHidden}>••••</span>
                        </Show>
                      </div>
                    </div>

                    {/* Date and Status - Right side */}
                    <div class={styles.paymentRight}>
                      <span class={styles.paymentDate}>
                        {formatDate(payment.timestamp)}
                      </span>
                      <span
                        class={`${styles.paymentStatus} ${
                          payment.status === 'completed'
                            ? styles.statusCompleted
                            : payment.status === 'pending'
                            ? styles.statusPending
                            : styles.statusFailed
                        }`}
                      >
                        {payment.status}
                      </span>
                    </div>
                  </div>

                  {/* Description - Full width on second line if exists */}
                  <Show when={payment.description}>
                    <p class={styles.paymentDescription}>
                      {payment.description}
                    </p>
                  </Show>

                  {/* Expanded Details */}
                  <Show when={isExpanded()}>
                    <div class={styles.paymentDetails}>
                      {/* Warning for payments pending too long */}
                      <Show when={payment.status === 'pending' && isPendingTooLong(payment.timestamp)}>
                        <div class={styles.pendingWarning}>
                          <p class={styles.pendingWarningTitle}>
                            Payment pending for {formatPendingDuration(payment.timestamp)}
                          </p>
                          <p class={styles.pendingWarningText}>
                            This is taking longer than expected. The payment may be stuck due to routing issues.
                            It will eventually fail and funds will be returned, or it may complete if a route is found.
                          </p>
                        </div>
                      </Show>

                      <div class={styles.detailsGrid}>
                        {/* Payment ID */}
                        <div class={styles.detailRow}>
                          <span class={styles.detailLabel}>Payment ID:</span>
                          <div class={styles.detailValue}>
                            <code class={styles.detailCode}>
                              {payment.id}
                            </code>
                            <button
                              class={styles.copyButton}
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(payment.id, 'Payment ID');
                              }}
                            >
                              <div class={styles.copyIcon}></div>
                            </button>
                          </div>
                        </div>

                        {/* Payment Hash */}
                        <Show when={payment.paymentHash}>
                          <div class={styles.detailRow}>
                            <span class={styles.detailLabel}>Payment Hash:</span>
                            <div class={styles.detailValue}>
                              <code class={styles.detailCode}>
                                {payment.paymentHash}
                              </code>
                              <button
                                class={styles.copyButton}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(payment.paymentHash!, 'Payment hash');
                                }}
                              >
                                <div class={styles.copyIcon}></div>
                              </button>
                            </div>
                          </div>
                        </Show>

                        {/* Invoice */}
                        <Show when={payment.invoice}>
                          <div class={styles.detailRow}>
                            <span class={styles.detailLabel}>Invoice:</span>
                            <div class={styles.detailValue}>
                              <code class={styles.detailCode}>
                                {payment.invoice!.substring(0, 20)}...
                              </code>
                              <button
                                class={styles.copyButton}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(payment.invoice!, 'Invoice');
                                }}
                              >
                                <div class={styles.copyIcon}></div>
                              </button>
                            </div>
                          </div>
                        </Show>

                        {/* Preimage (proof of payment) */}
                        <Show when={payment.preimage && payment.status === 'completed'}>
                          <div class={styles.detailRow}>
                            <span class={styles.detailLabel}>Preimage:</span>
                            <div class={styles.detailValue}>
                              <code class={styles.detailCode}>
                                {payment.preimage!.substring(0, 20)}...
                              </code>
                              <button
                                class={styles.copyButton}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(payment.preimage!, 'Preimage');
                                }}
                              >
                                <div class={styles.copyIcon}></div>
                              </button>
                            </div>
                          </div>
                        </Show>

                        {/* Refresh button for pending payments */}
                        <Show when={payment.status === 'pending' && props.onRefreshPayment}>
                          <div class={styles.detailRow}>
                            <button
                              class={styles.refreshButton}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRefreshPayment(payment.id);
                              }}
                              disabled={isRefreshing()}
                            >
                              <div class={isRefreshing() ? styles.refreshIconSpinning : styles.refreshIcon}></div>
                              <span>Refresh Status</span>
                            </button>
                          </div>
                        </Show>
                      </div>
                    </div>
                  </Show>
                </div>
              );
            }}
          </For>

          {/* Load More indicator/button */}
          <Show when={props.hasMore}>
            <div class={styles.loadMoreContainer}>
              <Show when={isLoadingMore()} fallback={
                <button type="button" class={styles.loadMoreButton} onClick={handleLoadMore}>
                  Load more
                </button>
              }>
                <div class={styles.loadingMore}>
                  <div class={styles.spinner}></div>
                  <span>Loading more payments...</span>
                </div>
              </Show>
            </div>
          </Show>
        </div>
      </Show>
    </Show>
  );
};

export default SparkPaymentsList;
