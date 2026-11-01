/**
 * CipherGuard 3D - Forensic CSV Exporter
 * Generates RFC 4180 compliant CSV files for Transaction History and Security Audit Logs
 */

import { TransactionRecord, AuditLogItem } from '../types/security';

function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) return '""';
  const str = String(value);
  // If string contains quotes, commas, or newlines, quote and escape internal quotes
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

function triggerDownload(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export Transaction Records as Forensic CSV
 */
export function exportTransactionsCSV(transactions: TransactionRecord[]): void {
  const headers = [
    'TransactionID',
    'TimestampISO',
    'EpochMs',
    'SenderName',
    'SenderAccount',
    'RecipientName',
    'RecipientAccount',
    'AmountINR',
    'Currency',
    'Purpose',
    'VerificationStatus',
    'TotalLatencyMs',
    'CryptographicNonce',
    'CanonicalSha256Digest',
    'AesGcmTagHex',
    'AesGcmIvHex',
    'CipherSuite',
    'TlsSessionId',
    'EcdsaSignatureHex',
    'FailingGateNumber',
    'RejectionReason',
    'SettlementBankRef',
    'AuditBlockHeight',
  ];

  const rows = transactions.map((tx) => [
    escapeCSV(tx.id),
    escapeCSV(new Date(tx.createdAt).toISOString()),
    escapeCSV(tx.createdAt),
    escapeCSV(tx.canonical.senderName),
    escapeCSV(tx.canonical.senderAccount),
    escapeCSV(tx.canonical.recipientName),
    escapeCSV(tx.canonical.recipientAccount),
    escapeCSV(tx.canonical.amount.toFixed(2)),
    escapeCSV(tx.canonical.currency),
    escapeCSV(tx.canonical.purpose),
    escapeCSV(tx.result.status.toUpperCase()),
    escapeCSV(tx.result.totalLatencyMs),
    escapeCSV(tx.canonical.nonce),
    escapeCSV(tx.packet.canonicalDigest),
    escapeCSV(tx.packet.tag),
    escapeCSV(tx.packet.iv),
    escapeCSV(tx.packet.cipherSuite),
    escapeCSV(tx.packet.tlsSessionId),
    escapeCSV(tx.packet.signature),
    escapeCSV(tx.result.failingGateIndex ?? 'N/A'),
    escapeCSV(tx.result.failureReason ?? 'None (Passed All 5 Gates)'),
    escapeCSV(tx.result.receipt?.bankReference ?? 'N/A'),
    escapeCSV(tx.result.receipt?.auditBlockHeight ?? 'N/A'),
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  triggerDownload(csvContent, `cipherguard_transaction_ledger_${timestamp}.csv`);
}

/**
 * Export Security Audit Logs as Forensic CSV
 */
export function exportAuditLogsCSV(auditLogs: AuditLogItem[]): void {
  const headers = [
    'LogID',
    'TimestampISO',
    'EpochMs',
    'SeverityLevel',
    'Category',
    'Message',
    'AssociatedTransactionUUID',
  ];

  const rows = auditLogs.map((log) => [
    escapeCSV(log.id),
    escapeCSV(new Date(log.timestamp).toISOString()),
    escapeCSV(log.timestamp),
    escapeCSV(log.level.toUpperCase()),
    escapeCSV(log.category),
    escapeCSV(log.message),
    escapeCSV(log.transactionId ?? 'SYSTEM'),
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  triggerDownload(csvContent, `cipherguard_security_audit_logs_${timestamp}.csv`);
}
