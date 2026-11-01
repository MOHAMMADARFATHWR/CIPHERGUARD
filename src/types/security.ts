/**
 * CipherGuard 3D - Security & Banking Domain Types
 */

export type UserRole = 'sender' | 'receiver' | 'banker' | 'hacker' | 'customer' | 'manager' | 'adversary';

export interface UserProfile {
  id: string;
  role: 'sender' | 'receiver' | 'banker' | 'hacker';
  name: string;
  email: string;
  accountId: string;
  accountNumber: string;
  avatarInitials: string;
  roleTitle: string;
  badgeColor: string;
  balance?: number;
}

export interface CustomerAccount {
  accountId: string;
  accountHolder: string;
  accountNumber: string;
  balance: number;
  currency: string;
  dailyLimit: number;
  status: 'active' | 'flagged' | 'frozen';
}

export interface Beneficiary {
  id: string;
  name: string;
  accountNumber: string;
  bankName: string;
  avatarInitials: string;
}

export interface CanonicalTransaction {
  transactionId: string;
  senderId: string;
  senderName: string;
  senderAccount: string;
  recipientId: string;
  recipientName: string;
  recipientAccount: string;
  amount: number;
  currency: string;
  timestamp: number;
  nonce: string;
  expirationTime: number;
  purpose: string;
}

export interface EncryptedPacket {
  packetId: string;
  keyId: string;
  iv: string; // 12-byte hex IV
  aad: string; // Additional Authenticated Data in hex or JSON string
  ciphertext: string; // AES-256-GCM encrypted hex
  tag: string; // 16-byte hex authentication tag
  signature: string; // ECDSA P-256 signature (hex)
  senderPublicKey: string; // JWK / SPKI public key string
  canonicalDigest: string; // SHA-256 hex digest of canonical transaction
  tlsSessionId: string;
  clientHelloVersion: string;
  cipherSuite: string;
}

export interface GateEvaluation {
  gate: number;
  name: string;
  description: string;
  passed: boolean;
  latencyMs: number;
  details: string;
  technicalProof: {
    expectedValue?: string;
    receivedValue?: string;
    verifiedSignature?: boolean;
    nonceSeenBefore?: boolean;
    timestampDeltaMs?: number;
    availableBalance?: number;
    computedDigest?: string;
  };
}

export interface TransactionVerificationResult {
  transactionId: string;
  status: 'verified' | 'rejected' | 'tampered' | 'replay_blocked';
  timestamp: number;
  gates: GateEvaluation[];
  totalLatencyMs: number;
  failureReason?: string;
  failingGateIndex?: number;
  receipt?: {
    receiptId: string;
    clearedAt: number;
    settledAmount: number;
    bankReference: string;
    auditBlockHeight: number;
  };
}

export interface ThreatOrigin {
  city: string;
  country: string;
  countryCode: string;
  ip: string;
  lat: number;
  lng: number;
  asn?: string;
  isp?: string;
  threatScore?: number;
}

export interface TransactionRecord {
  id: string;
  canonical: CanonicalTransaction;
  packet: EncryptedPacket;
  result: TransactionVerificationResult;
  isSimulatedAttack?: boolean;
  attackType?: string;
  originGeo?: ThreatOrigin;
  createdAt: number;
}

export type AttackScenarioId = 
  | 'mitm_amount_tamper'
  | 'mitm_recipient_tamper'
  | 'replay_attack'
  | 'signature_forgery'
  | 'expired_timestamp'
  | 'nonce_reuse';

export interface AttackScenario {
  id: AttackScenarioId;
  name: string;
  category: 'Integrity' | 'Authentication' | 'Replay' | 'Confidentiality';
  severity: 'Critical' | 'High' | 'Medium';
  description: string;
  targetStage: number; // 1-8
  simulatedPayloadChanges: {
    label: string;
    original: string;
    tampered: string;
  };
  expectedDefendingGate: number;
  expectedDefenseName: string;
  technicalMechanism: string;
}

export interface AuditLogItem {
  id: string;
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'success';
  category: 'AUTH' | 'CRYPTO' | 'TLS' | 'REPLAY' | 'LEDGER' | 'ADVERSARY';
  message: string;
  transactionId?: string;
  details?: Record<string, unknown>;
}

export interface SocMetrics {
  totalTransactions: number;
  verifiedCount: number;
  attackCount: number;
  replayBlockedCount: number;
  avgVerificationLatencyMs: number;
  systemIntegrityScore: number;
  tlsActiveSessions: number;
  lastAttackTimestamp?: number;
}
