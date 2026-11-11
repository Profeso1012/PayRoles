import type { BackendBatchStatus, BackendTransactionStatus, BackendProviderType } from '@/lib/api/types';

// Shared between PaymentFiles.tsx (the list) and DisbursementBatchDetail.tsx
// (the per-run drill-down page) so both always agree on labels/colors.

export const batchStatusVariant: Record<BackendBatchStatus, 'draft' | 'info' | 'warning' | 'success' | 'error'> = {
  draft: 'draft',
  pending_approval: 'warning',
  approved: 'info',
  awaiting_schedule: 'info',
  queued: 'info',
  processing: 'warning',
  partially_paid: 'warning',
  paid: 'success',
  reconciling: 'warning',
  reconciled: 'success',
  completed: 'success',
  cancelled: 'error',
  failed: 'error',
  expired: 'error',
  retrying: 'warning',
  reversed: 'error',
  awaiting_confirmation: 'warning',
};

export const batchStatusLabel: Record<BackendBatchStatus, string> = {
  draft: 'Draft',
  pending_approval: 'Awaiting Approval',
  approved: 'Approved',
  awaiting_schedule: 'Scheduled',
  queued: 'Queued',
  processing: 'Processing',
  partially_paid: 'Partially Paid',
  paid: 'Paid',
  reconciling: 'Reconciling',
  reconciled: 'Reconciled',
  completed: 'Completed',
  cancelled: 'Cancelled',
  failed: 'Failed',
  expired: 'Expired',
  retrying: 'Retrying',
  reversed: 'Reversed',
  awaiting_confirmation: 'Awaiting Confirmation',
};

export const txStatusVariant: Record<BackendTransactionStatus, 'draft' | 'info' | 'warning' | 'success' | 'error'> = {
  pending: 'draft',
  scheduled: 'info',
  queued: 'info',
  processing: 'warning',
  successful: 'success',
  failed: 'error',
  retried: 'warning',
  cancelled: 'error',
  reversed: 'error',
  manual: 'success',
  skipped: 'info',
};

export const txStatusLabel: Record<BackendTransactionStatus, string> = {
  pending: 'Pending',
  scheduled: 'Scheduled',
  queued: 'Queued',
  processing: 'Processing',
  successful: 'Successful',
  failed: 'Failed',
  retried: 'Retried',
  cancelled: 'Cancelled',
  reversed: 'Reversed',
  manual: 'Manually Confirmed',
  skipped: 'Skipped',
};

export const PROVIDER_TYPES: BackendProviderType[] = ['manual_bank_file', 'monnify', 'paystack', 'flutterwave', 'remita'];

export const PROVIDER_LABELS: Record<BackendProviderType, string> = {
  manual_bank_file: 'Manual Bank File',
  monnify: 'Monnify',
  paystack: 'Paystack',
  flutterwave: 'Flutterwave',
  remita: 'Remita',
};

// manual_bank_file, monnify, paystack, and flutterwave all have real
// createBatch/executeBatch implementations. remita's executeBatch still calls
// placeholder endpoints (see remita.provider.ts TODOs) and can misreport
// success - that one alone stays flagged.
export const INCOMPLETE_PROVIDERS: Partial<Record<BackendProviderType, string>> = {
  remita: 'Experimental — integration is unverified, use with caution',
};

// Batch statuses where money has already moved or the batch is otherwise
// resolved - no longer count toward "still pending disbursement".
export const RESOLVED_BATCH_STATUSES: BackendBatchStatus[] = [
  'paid', 'completed', 'reconciled', 'cancelled', 'expired', 'reversed',
];

// Newest-batch statuses after which the backend accepts a fresh initiate for
// the run (TERMINAL_BATCH_STATUSES in batch-status.enum.ts). 'completed' and
// 'reversed' are terminal too but mean the run was settled, so they aren't
// offered as restartable here.
export const RESTARTABLE_BATCH_STATUSES: BackendBatchStatus[] = ['cancelled', 'failed', 'expired'];

// Backend requires N approval records before pending_approval -> approved
// (approval-workflow.service.ts#getRequiredApprovals) - none=0, dual=2,
// multi_level=3, every other type needs exactly 1.
export function requiredApprovals(type: string | undefined): number {
  switch (type) {
    case 'none': return 0;
    case 'dual': return 2;
    case 'multi_level': return 3;
    case 'single':
    case 'finance':
    case 'ceo':
      return 1;
    default:
      return 1;
  }
}
