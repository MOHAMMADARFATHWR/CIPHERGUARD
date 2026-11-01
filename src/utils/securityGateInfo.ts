/**
 * CipherGuard 3D - Security Gate Diagnostic & Explanatory Metadata
 * Provides detailed cryptographic definitions, gate failure explanations,
 * defensive actions, and audit log contextual mappings.
 */

import { TransactionRecord, AuditLogItem } from '../types/security';

export interface SecurityGateInfo {
  gateIndex: number;
  gateName: string;
  category: 'TLS' | 'CRYPTO' | 'AUTH' | 'REPLAY' | 'LEDGER';
  rfcStandard: string;
  verificationScope: string;
  failureExplanation: string;
  defenseAction: string;
  threatPrevented: string;
}

export const SECURITY_GATES: Record<number, SecurityGateInfo> = {
  1: {
    gateIndex: 1,
    gateName: 'TLS 1.3 Channel Verification',
    category: 'TLS',
    rfcStandard: 'RFC 8446 (TLS 1.3)',
    verificationScope: 'Validates forward secrecy, mutual cipher suite negotiation (TLS_AES_256_GCM_SHA384), and session freshness.',
    failureExplanation: 'Insecure or unnegotiated TLS 1.3 session. Cipher suite downgrade attempt or untrusted transport channel detected.',
    defenseAction: 'Ingress transport termination immediately terminates socket before application packet parsing.',
    threatPrevented: 'Transport eavesdropping, active packet injection, and TLS downgrade attacks.',
  },
  2: {
    gateIndex: 2,
    gateName: 'AES-256-GCM Tag Verification',
    category: 'CRYPTO',
    rfcStandard: 'NIST SP 800-38D (AES-GCM)',
    verificationScope: 'Computes Galois authentication tag over ciphertext and Additional Authenticated Data (AAD) to ensure zero payload bit tampering.',
    failureExplanation: 'Authentication tag mismatch. One or more ciphertext bits or AAD parameters were modified in transit by an adversary.',
    defenseAction: 'Bank API Gateway discards the payload at ingress with zero-trust assertion; blocks tampered data from reaching internal cores.',
    threatPrevented: 'Man-in-the-Middle (MITM) data tampering, unauthorized amount manipulation, and beneficiary spoofing.',
  },
  3: {
    gateIndex: 3,
    gateName: 'ECDSA Digital Signature',
    category: 'AUTH',
    rfcStandard: 'FIPS 186-4 (ECDSA P-256 / SHA-256)',
    verificationScope: 'Verifies the sender’s private key signature bound to the canonical transaction SHA-256 digest for strict non-repudiation.',
    failureExplanation: 'Digital signature invalid. Message forgery detected or signature does not match sender’s enrolled public key.',
    defenseAction: 'Security Core rejects unauthenticated instruction, preventing fraudulent execution of sender commands.',
    threatPrevented: 'Sender impersonation, unauthorized fund transfer orders, and private key signature forgery.',
  },
  4: {
    gateIndex: 4,
    gateName: 'Nonce & Replay Protection',
    category: 'REPLAY',
    rfcStandard: 'RFC 5246 / Sliding Cache Protocol',
    verificationScope: 'Asserts cryptographically unique 128-bit nonce against memory cache and verifies request timestamp within 300-second window.',
    failureExplanation: 'Duplicate nonce detected or timestamp exceeded 300s window. Indicates captured packet replay attempt.',
    defenseAction: 'Atomic sliding window cache catches duplicate nonce and nullifies repeated processing.',
    threatPrevented: 'Network replay attacks, duplicate account debits, and delayed packet replay attempts.',
  },
  5: {
    gateIndex: 5,
    gateName: 'Ledger Authorization & Balance',
    category: 'LEDGER',
    rfcStandard: 'ISO 20022 Financial Settlement',
    verificationScope: 'Asserts account balance sufficiency, daily transaction limits, account freeze checks, and ACID ledger consistency.',
    failureExplanation: 'Insufficient funds or transaction amount exceeds authorized daily limit.',
    defenseAction: 'Core banking engine halts settlement and logs balance constraint exception without altering ledger balance.',
    threatPrevented: 'Account overdraft, double-spend collisions, and ledger consistency violations.',
  },
};

export interface GateMiniStatus {
  gate: number;
  name: string;
  status: 'pass' | 'fail' | 'skipped';
}

export interface TransactionGateExplanation {
  title: string;
  statusLabel: string;
  statusBadgeClass: string;
  failingGateIndex?: number;
  failingGateName?: string;
  failureReason: string;
  defenseSummary: string;
  threatPrevented: string;
  rfcStandard?: string;
  gateStatuses: GateMiniStatus[];
  totalLatencyMs: number;
  isVerified: boolean;
  attackType?: string;
}

export function getTransactionGateExplanation(tx: TransactionRecord): TransactionGateExplanation {
  const isVerified = tx.result.status === 'verified';
  const failingIndex = tx.result.failingGateIndex;
  const failingInfo = failingIndex ? SECURITY_GATES[failingIndex] : undefined;

  let statusLabel = 'VERIFIED';
  let statusBadgeClass = 'bg-emerald-500/10 text-[#36D399] border-emerald-500/30';
  let title = 'All 5 Security Gates Cleared';
  let failureReason = 'All cryptographic checks passed. Transaction is genuine, untampered, signed, fresh, and funded.';
  let defenseSummary = 'Continuous Zero-Trust Pipeline: TLS 1.3 -> AES-256-GCM -> ECDSA P-256 -> Fresh Nonce -> Ledger Commit.';
  let threatPrevented = 'Defended against MITM tampering, signature forgery, replay injection, and balance overdraft.';

  if (!isVerified) {
    if (tx.result.status === 'tampered' || failingIndex === 2) {
      statusLabel = 'TAMPERED (GATE 2 FAIL)';
      statusBadgeClass = 'bg-rose-500/10 text-[#FF4D5A] border-rose-500/30';
      title = 'Gate 02: AES-256-GCM Tag Mismatch';
      failureReason = tx.result.failureReason || 'Authentication tag failed verification. Ciphertext bits modified in flight.';
      defenseSummary = 'Bank API Gateway detected payload alteration and discarded packet before internal processing.';
      threatPrevented = 'Man-in-the-Middle (MITM) transaction modification.';
    } else if (tx.result.status === 'replay_blocked' || failingIndex === 4) {
      statusLabel = 'REPLAY BLOCKED (GATE 4 FAIL)';
      statusBadgeClass = 'bg-amber-500/10 text-[#F5B942] border-amber-500/30';
      title = 'Gate 04: Nonce Cache Collision / Expired';
      failureReason = tx.result.failureReason || 'Nonce was already consumed in 300s window or timestamp expired.';
      defenseSummary = 'Sliding window nonce cache prevented duplicate transaction replay.';
      threatPrevented = 'Network capture and replay attack causing duplicate settlement.';
    } else if (failingIndex === 3 || tx.attackType === 'signature_forgery') {
      statusLabel = 'FORGERY (GATE 3 FAIL)';
      statusBadgeClass = 'bg-rose-500/10 text-[#FF4D5A] border-rose-500/30';
      title = 'Gate 03: ECDSA Signature Mismatch';
      failureReason = tx.result.failureReason || 'Digital signature verification failed against sender public key.';
      defenseSummary = 'Security core verified canonical SHA-256 hash and detected signature mismatch.';
      threatPrevented = 'Sender impersonation and forged transaction authorization.';
    } else if (failingIndex === 1) {
      statusLabel = 'TLS ERROR (GATE 1 FAIL)';
      statusBadgeClass = 'bg-rose-500/10 text-[#FF4D5A] border-rose-500/30';
      title = 'Gate 01: TLS 1.3 Handshake Violation';
      failureReason = tx.result.failureReason || 'Insecure cipher suite or invalid TLS 1.3 session parameters.';
      defenseSummary = 'Transport layer terminated insecure connection.';
      threatPrevented = 'Transport downgrade and unauthenticated session hijacking.';
    } else if (failingIndex === 5) {
      statusLabel = 'LIMIT EXCEEDED (GATE 5 FAIL)';
      statusBadgeClass = 'bg-amber-500/10 text-[#F5B942] border-amber-500/30';
      title = 'Gate 05: Ledger Balance / Limit Failure';
      failureReason = tx.result.failureReason || 'Requested transfer exceeds authorized ledger balance.';
      defenseSummary = 'Core banking ledger balance check halted settlement.';
      threatPrevented = 'Overdraft and double-spend collision.';
    } else {
      statusLabel = 'REJECTED';
      statusBadgeClass = 'bg-rose-500/10 text-[#FF4D5A] border-rose-500/30';
      title = 'Security Gate Verification Failed';
      failureReason = tx.result.failureReason || 'One or more cryptographic validation checks failed.';
      defenseSummary = 'Fail-safe zero trust pipeline rejected transaction.';
      threatPrevented = 'Unauthorized execution.';
    }
  }

  // Build gateStatuses array
  const gateStatuses: GateMiniStatus[] = [
    { gate: 1, name: 'TLS 1.3', status: 'pass' },
    { gate: 2, name: 'AES-GCM', status: 'pass' },
    { gate: 3, name: 'ECDSA', status: 'pass' },
    { gate: 4, name: 'Nonce', status: 'pass' },
    { gate: 5, name: 'Ledger', status: 'pass' },
  ];

  if (!isVerified && failingIndex) {
    for (let i = 0; i < gateStatuses.length; i++) {
      const gNum = i + 1;
      if (gNum < failingIndex) {
        gateStatuses[i].status = 'pass';
      } else if (gNum === failingIndex) {
        gateStatuses[i].status = 'fail';
      } else {
        gateStatuses[i].status = 'skipped';
      }
    }
  }

  return {
    title,
    statusLabel,
    statusBadgeClass,
    failingGateIndex: failingIndex,
    failingGateName: failingInfo?.gateName,
    failureReason,
    defenseSummary,
    threatPrevented: failingInfo?.threatPrevented || threatPrevented,
    rfcStandard: failingInfo?.rfcStandard,
    gateStatuses,
    totalLatencyMs: tx.result.totalLatencyMs || 24,
    isVerified,
    attackType: tx.attackType,
  };
}

export interface AuditLogGateExplanation {
  title: string;
  levelBadgeClass: string;
  categoryBadgeClass: string;
  levelLabel: string;
  category: string;
  associatedGateIndex?: number;
  associatedGateName?: string;
  securityImpact: string;
  defensiveAction: string;
  matchingTx?: TransactionRecord;
}

export function getAuditLogSecurityContext(
  log: AuditLogItem,
  matchingTx?: TransactionRecord
): AuditLogGateExplanation {
  let associatedGateIndex: number | undefined;
  let associatedGateName: string | undefined;
  let securityImpact = '';
  let defensiveAction = '';

  switch (log.category) {
    case 'TLS':
      associatedGateIndex = 1;
      associatedGateName = 'Gate 01: TLS 1.3 Channel Verification';
      securityImpact = 'Ensures transport encryption, PFS (Perfect Forward Secrecy), and certificate validation.';
      defensiveAction = 'Blocks unencrypted traffic and unauthorized cipher negotiation.';
      break;
    case 'CRYPTO':
      associatedGateIndex = 2;
      associatedGateName = 'Gate 02: AES-256-GCM Tag Verification';
      securityImpact = 'Validates ciphertext payload and Additional Authenticated Data (AAD) integrity.';
      defensiveAction = 'Discards packets with modified bits before deserialization.';
      break;
    case 'AUTH':
      associatedGateIndex = 3;
      associatedGateName = 'Gate 03: ECDSA Digital Signature';
      securityImpact = 'Validates sender non-repudiation and cryptographic signature proof.';
      defensiveAction = 'Rejects forged or mismatched public key transactions.';
      break;
    case 'REPLAY':
      associatedGateIndex = 4;
      associatedGateName = 'Gate 04: Nonce & Replay Protection';
      securityImpact = 'Monitors 128-bit cryptographic nonces and enforces 300-second timestamp freshness.';
      defensiveAction = 'Eliminates duplicate packet re-injections.';
      break;
    case 'LEDGER':
      associatedGateIndex = 5;
      associatedGateName = 'Gate 05: Core Banking Settlement';
      securityImpact = 'Guarantees double-spend protection, authorized balance limits, and atomic receipts.';
      defensiveAction = 'Commits immutable receipt to audit block height upon verification.';
      break;
    case 'ADVERSARY':
      associatedGateIndex = matchingTx?.result.failingGateIndex || 2;
      associatedGateName = `Gate 0${associatedGateIndex}: Security Defense Barrier`;
      securityImpact = 'Threat detection event intercepted by intrusion prevention telemetry.';
      defensiveAction = 'Quarantines hostile packet and records attacker geolocation.';
      break;
  }

  let levelLabel = 'INFO';
  let levelBadgeClass = 'text-slate-400 bg-slate-800/80 border-slate-700';
  if (log.level === 'error') {
    levelLabel = 'CRITICAL FAILURE';
    levelBadgeClass = 'text-[#FF4D5A] bg-red-950/80 border-[#FF4D5A]/40';
  } else if (log.level === 'warn') {
    levelLabel = 'SECURITY WARNING';
    levelBadgeClass = 'text-[#F5B942] bg-amber-950/80 border-[#F5B942]/40';
  } else if (log.level === 'success') {
    levelLabel = 'VERIFIED SUCCESS';
    levelBadgeClass = 'text-[#36D399] bg-emerald-950/80 border-[#36D399]/40';
  }

  let categoryBadgeClass = 'text-indigo-400 bg-indigo-950/50 border-indigo-700/60';
  if (log.category === 'CRYPTO') categoryBadgeClass = 'text-cyan-400 bg-cyan-950/50 border-cyan-700/60';
  if (log.category === 'TLS') categoryBadgeClass = 'text-blue-400 bg-blue-950/50 border-blue-700/60';
  if (log.category === 'AUTH') categoryBadgeClass = 'text-purple-400 bg-purple-950/50 border-purple-700/60';
  if (log.category === 'REPLAY') categoryBadgeClass = 'text-amber-400 bg-amber-950/50 border-amber-700/60';
  if (log.category === 'ADVERSARY') categoryBadgeClass = 'text-rose-400 bg-rose-950/50 border-rose-700/60';
  if (log.category === 'LEDGER') categoryBadgeClass = 'text-emerald-400 bg-emerald-950/50 border-emerald-700/60';

  return {
    title: log.message,
    levelBadgeClass,
    categoryBadgeClass,
    levelLabel,
    category: log.category,
    associatedGateIndex,
    associatedGateName,
    securityImpact,
    defensiveAction,
    matchingTx,
  };
}
